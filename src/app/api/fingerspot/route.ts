import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as fingerspot from "@/lib/fingerspot";

function parseScanTime(scanDate: string): Date | null {
  // Fingerspot developer API: "YYYY-MM-DD HH:mm:ss" (no timezone)
  // Kita simpan konsisten dengan webhook: pakai +07:00
  // Juga support fallback jika sudah ISO
  try {
    const scanStr = String(scanDate);
    const normalized = scanStr.includes("T")
      ? scanStr
      : scanStr.replace(" ", "T");
    const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(scanStr);
    const dt = hasTz ? new Date(normalized) : new Date(`${normalized}+07:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

async function upsertAttendanceFromGetAttlogRows(cloudId: string, rows: any[]) {
  // Catatan: "jangan dobel" => dedupe pakai kombinasi seperti webhook.
  // Jika ingin benar-benar tidak dobel, kita cari existing sebelum create.
  // (Tanpa schema unique constraint, ini satu-satunya cara dengan prisma yang ada sekarang.)
  const summary = {
    totalRows: rows.length,
    skippedNoPinOrScan: 0,
    skippedInvalidScanTime: 0,
    dedupedExisting: 0,
    created: 0,
    errors: 0,
    sampleSkipped: [] as any[],
  };

  const statusMap: Record<number, string> = {
    0: "IN",
    1: "OUT",
    2: "BREAK_IN",
    3: "BREAK_OUT",
  };

  for (const row of rows) {
    try {
      const pin = row?.pin ?? row?.employee_pin ?? row?.employeePin;
      const scanDate =
        row?.scan_date ?? row?.scanDate ?? row?.scan_date_time ?? row?.scan;
      const verify =
        row?.verify ??
        row?.verify_method ??
        row?.verifyMethod ??
        row?.verification;
      const statusScan = row?.status_scan ?? row?.statusScan;

      if (pin == null || scanDate == null) {
        summary.skippedNoPinOrScan++;
        if (summary.sampleSkipped.length < 5)
          summary.sampleSkipped.push({ row });
        continue;
      }

      const scanTime = parseScanTime(String(scanDate));
      if (!scanTime) {
        summary.skippedInvalidScanTime++;
        if (summary.sampleSkipped.length < 5)
          summary.sampleSkipped.push({ scanDate, row });
        continue;
      }

      const statusScanNum = statusScan != null ? Number(statusScan) : null;

      const existing = await prisma.attendanceLog.findFirst({
        where: {
          employeePin: String(pin),
          deviceCloudId: cloudId,
          scanTime,
          statusScan: statusScanNum,
        },
      });
      if (existing) {
        summary.dedupedExisting++;
        continue;
      }

      const status = statusMap[Number(statusScanNum)] || "IN";

      await prisma.attendanceLog.create({
        data: {
          employeePin: String(pin),
          deviceCloudId: cloudId,
          scanTime,
          verifyMethod: verify != null ? Number(verify) : null,
          statusScan: statusScanNum,
          status,
          source: "realtime",
          rawPayload: row as any,
        },
      });
      summary.created++;
    } catch (e) {
      summary.errors++;
      if (summary.sampleSkipped.length < 5)
        summary.sampleSkipped.push({ error: String(e), row });
      // lanjut proses row berikutnya
    }
  }

  return summary;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, cloudId, params } = body;

    const startTime = Date.now();
    let result;

    switch (command) {
      // Attendance
      case "get_attlog": {
        result = await fingerspot.getAttlog(params.startDate, params.endDate);

        // Sinkron sinkron: jika success, langsung insert ke attendance_logs
        // Tidak double: gunakan dedupe seperti webhook.
        if (
          result?.success === true &&
          Array.isArray(result?.data) &&
          (cloudId || body?.cloudId)
        ) {
          const targetCloudId =
            cloudId || process.env.FINGERSPOT_CLOUD_ID || "";
          const summary = await upsertAttendanceFromGetAttlogRows(
            targetCloudId,
            result.data,
          );
          // Masukkan ringkasan ke apiLog biar kita tahu kenapa tidak tersimpan.
          // Jangan update schema DB dulu; taruh di responsePayload yang sudah Json.
          // (Bagian ini untuk membantu debugging.)
          (result as any).__attlogUpsertSummary = summary;
        }
        break;
      }

      // User Management
      case "get_userinfo":
        result = await fingerspot.getUserInfo(params.pin, params.transId);
        break;
      case "set_userinfo":
        result = await fingerspot.setUserInfo(params);
        break;
      case "delete_userinfo":
        result = await fingerspot.deleteUserInfo(params.pin);
        break;
      case "get_all_pin":
        result = await fingerspot.getAllPin(params.transId);
        break;
      case "reg_online":
        result = await fingerspot.registerOnline(
          params.pin,
          params.verification,
        );
        break;

      // Device Management
      case "get_device":
        result = await fingerspot.getDevice(params.transId);
        break;
      case "set_time":
        result = await fingerspot.setTime(params.timezone);
        break;
      case "restart_device":
        result = await fingerspot.restartDevice(params.transId);
        break;

      // QR Code (VIDA Series)
      case "set_qrcode":
        result = await fingerspot.setQrCode(params.pin, params.qrString);
        break;
      case "get_qrcode":
        result = await fingerspot.getQrCode(params.pin);
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Unknown command" },
          { status: 400 },
        );
    }

    const duration = Date.now() - startTime;

    await prisma.apiLog.create({
      data: {
        command,
        deviceCloudId: cloudId || process.env.FINGERSPOT_CLOUD_ID || "",
        transId: params?.transId || null,
        status: result.success ? "SUCCESS" : "FAILED",
        requestPayload: body as any,
        // Simpan juga summary debug jika ada, supaya bisa dilihat di api_logs.
        responsePayload: {
          ...(result.data || {}),
          ...((result as any).__attlogUpsertSummary
            ? { __attlogUpsertSummary: (result as any).__attlogUpsertSummary }
            : {}),
        },
        errorMessage: result.error || null,
        duration,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
