import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as fingerspot from "@/lib/fingerspot";
import { extractAttlogRows, parseScanTime } from "@/lib/fingerspot-payload";

async function upsertUserInfoBatch(cloudId: string, rows: { pin: string; name: string }[]) {
  let created = 0;
  let updated = 0;

  for (const { pin, name } of rows) {
    const existing = await prisma.userInfo.findUnique({ where: { pin } });
    if (existing) {
      if (name && existing.name === "Unknown") {
        await prisma.userInfo.update({
          where: { pin },
          data: { name, deviceCloudId: cloudId },
        });
        updated++;
      }
    } else {
      await prisma.userInfo.create({
        data: {
          pin,
          name: name || `User ${pin}`,
          privilege: 1,
          finger: 0,
          face: 0,
          rfid: 0,
          vein: 0,
          deviceCloudId: cloudId,
        },
      });
      created++;
    }
  }
  return { created, updated };
}

async function upsertAttendanceFromGetAttlogRows(cloudId: string, rows: any[]) {
  const normalizedRows = rows.flatMap((row) => extractAttlogRows(row));
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
    }
  }

  return summary;
}

async function extractPinsFromAttlog(cloudId: string): Promise<string[]> {
  const now = new Date();
  const pinSet = new Set<string>();

  for (let i = 0; i < 30; i += 2) {
    const start = new Date(now);
    start.setDate(start.getDate() - i - 2);
    const end = new Date(now);
    end.setDate(end.getDate() - i);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const res = await fingerspot.getAttlog(fmt(start), fmt(end));
    if (res?.success && res.data) {
      let rows: any[] = [];
      if (Array.isArray(res.data)) rows = res.data;
      else if (res.data && Array.isArray((res.data as any).data)) rows = (res.data as any).data;

      for (const row of rows) {
        const pin = row?.pin ?? row?.employee_pin ?? row?.employeePin;
        if (pin != null) pinSet.add(String(pin));
      }
    }
  }

  return Array.from(pinSet);
}

async function syncUsersFromAttlog(cloudId: string) {
  const pins = await extractPinsFromAttlog(cloudId);
  if (!pins.length) return { pinsFound: 0, usersCreated: 0, usersUpdated: 0, note: "Tidak ada data absensi ditemukan" };

  await prisma.pinList.deleteMany({ where: { deviceCloudId: cloudId } });
  for (const pin of pins) {
    await prisma.pinList.create({
      data: { deviceCloudId: cloudId, pin, total: pins.length },
    });
  }

  const userRows = pins.map((pin) => ({ pin, name: `User ${pin}` }));
  const userResult = await upsertUserInfoBatch(cloudId, userRows);

  return {
    pinsFound: pins.length,
    usersCreated: userResult.created,
    usersUpdated: userResult.updated,
  };
}

async function fetchAndSaveAttlog(cloudId: string, startDate: string, endDate: string) {
  const result = await fingerspot.getAttlog(startDate, endDate);
  if (result?.success !== true) return result;

  let rows: any[] = [];
  if (Array.isArray(result.data)) rows = result.data;
  else if (result.data && Array.isArray((result.data as any).data)) rows = (result.data as any).data;

  if (rows.length > 0) {
    const summary = await upsertAttendanceFromGetAttlogRows(cloudId, rows);
    (result as any).__attlogUpsertSummary = summary;
    (result as any).attlog_created = summary.created;
    (result as any).attlog_dedupedExisting = summary.dedupedExisting;
    (result as any).attlog_skippedNoPinOrScan = summary.skippedNoPinOrScan;
    (result as any).attlog_skippedInvalidScanTime = summary.skippedInvalidScanTime;
    (result as any).attlog_errors = summary.errors;
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, cloudId, params } = body;
    const targetCloudId = cloudId ?? body?.cloudId ?? process.env.FINGERSPOT_CLOUD_ID ?? "";

    const startTime = Date.now();
    let result: any;

    switch (command) {

      case "get_attlog":
        result = await fetchAndSaveAttlog(
          String(targetCloudId),
          params.startDate,
          params.endDate,
        );
        break;

      case "get_userinfo": {
        result = await fingerspot.getUserInfo(params.pin, params.transId);
        break;
      }
      case "set_userinfo":
        result = await fingerspot.setUserInfo(params);
        break;
      case "delete_userinfo":
        result = await fingerspot.deleteUserInfo(params.pin);
        break;

      case "get_all_pin": {
        result = await fingerspot.getAllPin(params.transId);

        const syncSummary = await syncUsersFromAttlog(String(targetCloudId));
        result = {
          ...result,
          sync_note: "Perintah dikirim ke mesin. Data akan datang via webhook.",
          pin_sync: syncSummary,
        };
        break;
      }

      case "sync_users": {
        const syncSummary = await syncUsersFromAttlog(String(targetCloudId));
        result = {
          success: true,
          message: "Sinkronisasi user selesai",
          sync: syncSummary,
          note: syncSummary.pinsFound === 0
            ? "Tidak ada data absensi ditemukan."
            : `${syncSummary.pinsFound} PIN ditemukan dari data absensi. ${syncSummary.usersCreated} user baru dibuat.`,
        };
        break;
      }

      case "find_pins": {
        const pins = await extractPinsFromAttlog(String(targetCloudId));
        result = {
          success: true,
          pins,
          total: pins.length,
          message: pins.length > 0
            ? `${pins.length} PIN ditemukan dari data absensi 30 hari terakhir`
            : "Tidak ada PIN ditemukan. Pastikan mesin sudah merekam absensi.",
        };
        break;
      }

      case "save_selected_pins": {
        const { pins: selectedPins } = body;
        if (!selectedPins || !Array.isArray(selectedPins) || selectedPins.length === 0) {
          return NextResponse.json({ success: false, error: "Pilih minimal 1 PIN" }, { status: 400 });
        }
        const userRows = selectedPins.map((p: any) => ({
          pin: String(p.pin ?? p),
          name: p.name ? String(p.name) : `User ${p.pin ?? p}`,
        }));
        const userResult = await upsertUserInfoBatch(String(targetCloudId), userRows);
        result = {
          success: true,
          usersCreated: userResult.created,
          usersUpdated: userResult.updated,
          totalPins: selectedPins.length,
        };
        break;
      }

      case "try_fetch_userinfo": {
        const { pins: fetchPins } = body;
        if (!fetchPins || !Array.isArray(fetchPins) || fetchPins.length === 0) {
          return NextResponse.json({ success: false, error: "Tidak ada PIN" }, { status: 400 });
        }
        const results: { pin: string; name?: string; ack: boolean; error?: string }[] = [];
        for (const rawPin of fetchPins) {
          const pin = String(rawPin.pin ?? rawPin);
          try {
            const res = await fingerspot.getUserInfo(pin, `fetch-${Date.now()}`);
            if (res.success && res.data && res.data.data && res.data.data.name) {
              results.push({ pin, name: res.data.data.name, ack: false });
            } else if (res.success && res.data && res.data.name) {
              results.push({ pin, name: res.data.name, ack: false });
            } else {
              results.push({ pin, ack: true, error: res.data?.message || "ACK (webhook expected)" });
            }
          } catch (e) {
            results.push({ pin, ack: true, error: String(e) });
          }
        }
        result = {
          success: true,
          results,
          gotNames: results.filter(r => r.name).length,
          ackOnly: results.filter(r => r.ack).length,
        };
        break;
      }

      case "reg_online":
        result = await fingerspot.registerOnline(params.pin, params.verification);
        break;

      case "get_device":
        result = await fingerspot.getDevice(params.transId);
        break;
      case "set_time":
        result = await fingerspot.setTime(params.timezone);
        break;
      case "restart_device":
        result = await fingerspot.restartDevice(params.transId);
        break;

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
        deviceCloudId: String(targetCloudId),
        transId: params?.transId || null,
        status: result?.success ? "SUCCESS" : "FAILED",
        requestPayload: body as any,
        responsePayload: result as any,
        errorMessage: result?.error || null,
        duration,
      },
    });

    return NextResponse.json(result || { success: false, error: "No result" });
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
