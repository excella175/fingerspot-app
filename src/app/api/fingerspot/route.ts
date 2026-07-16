import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as fingerspot from "@/lib/fingerspot";
import { extractAttlogRows, parseScanTime } from "@/lib/fingerspot-payload";

function normalizeUserInfoRows(value: unknown): Array<Record<string, any>> {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, any> =>
        typeof item === "object" && item !== null,
    );
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, any>;
    const directKeys = [
      "pin",
      "employee_pin",
      "employeePin",
      "name",
      "password",
      "privilege",
      "finger",
      "face",
      "rfid",
      "vein",
      "template",
      "user_id",
      "userId",
    ];

    if (directKeys.some((key) => key in record)) {
      return [record];
    }

    for (const key of [
      "data",
      "result",
      "response",
      "userinfo",
      "user",
      "users",
      "rows",
      "list",
    ]) {
      if (key in record) {
        const nested = normalizeUserInfoRows(record[key]);
        if (nested.length > 0) {
          return nested;
        }
      }
    }
  }

  return [];
}

async function upsertUserInfoFromApiPayload(cloudId: string, payload: unknown) {
  const rows = normalizeUserInfoRows(payload);
  if (!rows.length) return { created: 0, updated: 0, skipped: 0 };

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const pin =
      row.pin ??
      row.employee_pin ??
      row.employeePin ??
      row.user_id ??
      row.userId;
    if (!pin) {
      skipped++;
      continue;
    }

    const name =
      row.name ??
      row.user_name ??
      row.username ??
      row.full_name ??
      row.fullName;
    const password = row.password ?? row.pass ?? row.pwd ?? null;
    const privilege = row.privilege ?? row.priv ?? row.role ?? null;
    const finger = row.finger ?? row.fingerPrint ?? row.fingerprint ?? null;
    const face = row.face ?? null;
    const rfid = row.rfid ?? row.card ?? row.card_id ?? row.cardId ?? null;
    const vein = row.vein ?? null;
    const template = row.template ?? row.templateData ?? null;

    const existing = await prisma.userInfo.findUnique({
      where: { pin: String(pin) },
    });

    if (existing) {
      await prisma.userInfo.update({
        where: { pin: String(pin) },
        data: {
          name: name ? String(name) : existing.name,
          password: password ? String(password) : existing.password,
          privilege: privilege != null ? Number(privilege) : existing.privilege,
          finger: finger != null ? Number(finger) : existing.finger,
          face: face != null ? Number(face) : existing.face,
          rfid: rfid != null ? Number(rfid) : existing.rfid,
          vein: vein != null ? Number(vein) : existing.vein,
          template: template ? String(template) : existing.template,
          deviceCloudId: cloudId,
          rawPayload: row as any,
        },
      });
      updated++;
    } else {
      await prisma.userInfo.create({
        data: {
          pin: String(pin),
          name: name ? String(name) : "Unknown",
          password: password ? String(password) : null,
          privilege: privilege != null ? Number(privilege) : 1,
          finger: finger != null ? Number(finger) : 0,
          face: face != null ? Number(face) : 0,
          rfid: rfid != null ? Number(rfid) : 0,
          vein: vein != null ? Number(vein) : 0,
          template: template ? String(template) : null,
          deviceCloudId: cloudId,
          rawPayload: row as any,
        },
      });
      created++;
    }
  }

  return { created, updated, skipped };
}

async function upsertAttendanceFromGetAttlogRows(cloudId: string, rows: any[]) {
  const normalizedRows = rows.flatMap((row) => extractAttlogRows(row));
  // Catatan: "jangan dobel" => dedupe pakai kombinasi seperti webhook.
  // Jika ingin benar-benar tidak dobel, kita cari existing sebelum create.
  // (Tanpa schema unique constraint, ini satu-satunya cara dengan prisma yang ada sekarang.)
  const summary = {
    totalRows: normalizedRows.length,
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

  for (const row of normalizedRows) {
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

      // Dedupe untuk get_attlog dibuat lebih longgar.
      // Untuk kasus kamu: payload get_attlog sudah punya `status_scan` konsisten,
      // tapi masalah "SUCCESS tapi tidak tersimpan" sering karena dedupe terlalu ketat.
      // Jadi cukup dedupe pakai: employeePin + deviceCloudId + scanTime.

      const statusScanNum = statusScan != null ? Number(statusScan) : null;

      const existing = await prisma.attendanceLog.findFirst({
        where: {
          employeePin: String(pin),
          deviceCloudId: cloudId,
          scanTime,
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
        if (result?.success === true) {
          // Fingerspot developer responses may be either:
          // - result.data = [ { ... }, ... ]
          // - result.data = { data: [ { ... }, ... ], trans_id }
          let rows: any[] = [];
          if (Array.isArray(result.data)) {
            rows = result.data;
          } else if (result.data && Array.isArray((result.data as any).data)) {
            rows = (result.data as any).data;
          }

          if (rows.length > 0) {
            const targetCloudId =
              cloudId ?? body?.cloudId ?? process.env.FINGERSPOT_CLOUD_ID ?? "";

            const summary = await upsertAttendanceFromGetAttlogRows(
              String(targetCloudId),
              rows,
            );

            (result as any).__attlogUpsertSummary = summary;

            // Ringkasan level atas (supaya gampang kelihatan di UI).
            (result as any).attlog_created = summary.created;
            (result as any).attlog_dedupedExisting = summary.dedupedExisting;
            (result as any).attlog_skippedNoPinOrScan =
              summary.skippedNoPinOrScan;
            (result as any).attlog_skippedInvalidScanTime =
              summary.skippedInvalidScanTime;
            (result as any).attlog_errors = summary.errors;
          }
        }
        break;
      }

      // User Management
      case "get_userinfo": {
        result = await fingerspot.getUserInfo(params.pin, params.transId);
        if (result?.success === true) {
          const targetCloudId =
            cloudId ?? body?.cloudId ?? process.env.FINGERSPOT_CLOUD_ID ?? "";
          const userSummary = await upsertUserInfoFromApiPayload(
            String(targetCloudId),
            result.data,
          );
          (result as any).__userinfoUpsertSummary = userSummary;
          (result as any).userinfo_created = userSummary.created;
          (result as any).userinfo_updated = userSummary.updated;
          (result as any).userinfo_skipped = userSummary.skipped;
        }
        break;
      }
      case "set_userinfo":
        result = await fingerspot.setUserInfo(params);
        break;
      case "delete_userinfo":
        result = await fingerspot.deleteUserInfo(params.pin);
        break;
      case "get_all_pin":
        result = await fingerspot.getAllPin(params.transId);
        // If API returns pins directly, persist them immediately.
        try {
          const data = result?.data ?? null;
          const { extractPinArray } = await import("@/lib/fingerspot-payload");
          const pins = extractPinArray(data);
          if (pins.length > 0) {
            // use cloudId from request or env
            const targetCloudId =
              cloudId ?? body?.cloudId ?? process.env.FINGERSPOT_CLOUD_ID ?? "";
            // replace existing list for that cloud
            await prisma.pinList.deleteMany({
              where: { deviceCloudId: String(targetCloudId) },
            });
            for (const p of pins) {
              await prisma.pinList.create({
                data: {
                  deviceCloudId: String(targetCloudId),
                  pin: String(p),
                  total: pins.length,
                  rawPayload: data as any,
                },
              });
            }
            // Also try to fetch userinfo for each pin immediately and upsert
            try {
              for (const p of pins) {
                const userRes = await fingerspot.getUserInfo(String(p));
                if (userRes?.success) {
                  await upsertUserInfoFromApiPayload(
                    String(targetCloudId),
                    userRes.data,
                  );
                }
              }
            } catch (e) {
              console.error("[API][get_all_pin] fetching userinfo failed", e);
            }
          }
        } catch (e) {
          console.error("[API][get_all_pin] Persist pin list failed", e);
        }
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
