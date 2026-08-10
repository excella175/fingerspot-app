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
        await prisma.userInfo.update({ where: { pin }, data: { name, deviceCloudId: cloudId } });
        updated++;
      }
    } else {
      await prisma.userInfo.create({
        data: { pin, name: name || `User ${pin}`, privilege: 1, finger: 0, face: 0, rfid: 0, vein: 0, deviceCloudId: cloudId },
      });
      created++;
    }
  }
  return { created, updated };
}

async function upsertAttendanceFromGetAttlogRows(cloudId: string, rows: any[]) {
  const normalizedRows = rows.flatMap((row) => extractAttlogRows(row));
  const summary = { totalRows: normalizedRows.length, skippedNoPinOrScan: 0, skippedInvalidScanTime: 0, dedupedExisting: 0, created: 0, errors: 0, sampleSkipped: [] as any[] };
  const statusMap: Record<number, string> = { 0: "IN", 1: "OUT", 2: "BREAK_IN", 3: "BREAK_OUT" };
  for (const row of normalizedRows) {
    try {
      const pin = row?.pin ?? row?.employee_pin ?? row?.employeePin;
      const scanDate = row?.scan_date ?? row?.scanDate ?? row?.scan_date_time ?? row?.scan;
      const verify = row?.verify ?? row?.verify_method ?? row?.verifyMethod ?? row?.verification;
      const statusScan = row?.status_scan ?? row?.statusScan;
      if (pin == null || scanDate == null) { summary.skippedNoPinOrScan++; if (summary.sampleSkipped.length < 5) summary.sampleSkipped.push({ row }); continue; }
      const scanTime = parseScanTime(String(scanDate));
      if (!scanTime) { summary.skippedInvalidScanTime++; if (summary.sampleSkipped.length < 5) summary.sampleSkipped.push({ scanDate, row }); continue; }
      const statusScanNum = statusScan != null ? Number(statusScan) : null;
      const existing = await prisma.attendanceLog.findFirst({ where: { employeePin: String(pin), deviceCloudId: cloudId, scanTime } });
      if (existing) { summary.dedupedExisting++; continue; }
      await prisma.attendanceLog.create({
        data: { employeePin: String(pin), deviceCloudId: cloudId, scanTime, verifyMethod: verify != null ? Number(verify) : null, statusScan: statusScanNum, status: statusMap[Number(statusScanNum)] || "IN", source: "realtime", rawPayload: row as any },
      });
      summary.created++;
    } catch (e) { summary.errors++; if (summary.sampleSkipped.length < 5) summary.sampleSkipped.push({ error: String(e), row }); }
  }
  return summary;
}

async function fetchAndSaveAttlog(cloudId: string, startDate: string, endDate: string) {
  const result = await fingerspot.getAttlog(startDate, endDate, cloudId);
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
        result = await fetchAndSaveAttlog(String(targetCloudId), params.startDate, params.endDate);
        break;

      case "get_userinfo": {
        result = await fingerspot.getUserInfo(params.pin, params.name ?? "", params.transId, String(targetCloudId));
        break;
      }

      case "get_all_pin": {
        result = await fingerspot.getAllPin(params.transId, String(targetCloudId));
        break;
      }

      case "reg_online":
        result = await fingerspot.registerOnline(params.pin, params.verification, String(targetCloudId));
        break;

      case "get_device":
        result = await fingerspot.getDevice(params.transId, String(targetCloudId));
        break;

      case "set_time":
        result = await fingerspot.setTime(params.timezone, String(targetCloudId));
        break;

      case "restart_device":
        result = await fingerspot.restartDevice(params.transId, String(targetCloudId));
        break;

      case "set_userinfo":
        result = await fingerspot.setUserInfo(params, String(targetCloudId));
        break;

      case "delete_userinfo":
        result = await fingerspot.deleteUserInfo(params.pin, String(targetCloudId));
        break;

      default:
        return NextResponse.json({ success: false, error: "Unknown command" }, { status: 400 });
    }

    const duration = Date.now() - startTime;

    // Auto-register / update device status
    try {
      await prisma.device.upsert({
        where: { cloudId: String(targetCloudId) },
        update: {
          status: result?.success ? "ONLINE" : "OFFLINE",
          lastSync: result?.success ? new Date() : undefined,
          name: params?.name || undefined,
        },
        create: {
          cloudId: String(targetCloudId),
          name: params?.name || `Mesin ${targetCloudId}`,
          status: result?.success ? "ONLINE" : "OFFLINE",
          lastSync: result?.success ? new Date() : null,
        },
      });
    } catch { /* device upsert best-effort */ }

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
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
