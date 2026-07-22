import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  // 1. Baca body
  let rawText = "";
  try {
    rawText = await request.text();
  } catch {
    rawText = "";
  }

  // 2. Parse
  let body: any = {};
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    body = { raw: rawText };
  }

  const type = body?.type ?? body?.event ?? "unknown";
  const cloudId = body?.cloud_id ?? body?.cloudId ?? "unknown";
  const transId = body?.trans_id ?? body?.transId ?? null;

  // 3. Log ke DB
  try {
    await prisma.webhookLog.create({
      data: {
        type: String(type),
        deviceCloudId: String(cloudId),
        transId: transId?.toString() ?? null,
        status: "RECEIVED",
        payload: body as any,
      },
    });
  } catch (e) {
    console.error("[webhook] db log error:", e);
  }

  // 4. Process by type
  switch (String(type)) {
    case "get_userid_list": {
      let pins: string[] = [];
      if (body?.data?.pin_arr && Array.isArray(body.data.pin_arr)) {
        pins = body.data.pin_arr.map(String);
      } else if (Array.isArray(body?.data)) {
        pins = body.data.map(String);
      }
      console.log("[webhook] get_userid_list", pins.length, "pins");

      try {
        await prisma.pinList.deleteMany({ where: { deviceCloudId: cloudId } });
        if (pins.length > 0) {
          await prisma.pinList.createMany({
            data: pins.map((p) => ({ deviceCloudId: cloudId, pin: p })),
          });
        }
      } catch (e) {
        console.error("[webhook] pinlist error:", e);
      }

      // Auto-fetch userinfo
      const apiKey = process.env.FINGERSPOT_API_KEY || "";
      const apiUrl = process.env.FINGERSPOT_API_URL || "https://developer.fingerspot.io/api";
      for (const pin of pins.slice(0, 50)) {
        const tid = `wh-auto-${Date.now()}-${pin}`;
        fetch(`${apiUrl}/get_userinfo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ cloud_id: cloudId, trans_id: tid, pin }),
        }).catch(() => {});
      }
      break;
    }

    case "get_userinfo":
    case "userinfo": {
      const rows = extractRows(body);
      for (const row of rows) {
        const pin = row?.PIN ?? row?.pin ?? row?.UserID ?? row?.user_id ?? row?.userId;
        if (pin == null) continue;
        const name = row?.Name ?? row?.name ?? row?.UserName ?? row?.username;
        try {
          await prisma.userInfo.upsert({
            where: { pin: String(pin) },
            update: { ...(name ? { name: String(name) } : {}), deviceCloudId: cloudId },
            create: {
              pin: String(pin),
              name: name ? String(name) : "Unknown",
              privilege: 1,
              finger: 0,
              face: 0,
              rfid: 0,
              vein: 0,
              deviceCloudId: cloudId,
            },
          });
        } catch (e) {
          console.error("[webhook] upsert userinfo error:", e);
        }
      }
      break;
    }

    case "attlog":
    case "get_attlog": {
      const rows = extractRows(body);
      const statusMap: Record<number, string> = { 0: "IN", 1: "OUT", 2: "BREAK_IN", 3: "BREAK_OUT" };
      for (const row of rows) {
        const pin = row?.PIN ?? row?.pin ?? row?.EmployeePin ?? row?.employee_pin ?? row?.employeePin;
        const scan = row?.Scan ?? row?.scan ?? row?.ScanTime ?? row?.scan_time ?? row?.scanTime ?? row?.ScanDate ?? row?.scan_date ?? row?.scanDate ?? row?.DateTime;
        if (pin == null || scan == null) continue;
        const verify = row?.Verify ?? row?.verify;
        const statusScan = row?.StatusScan ?? row?.status_scan ?? row?.statusScan;
        const scanTime = parseDate(String(scan));
        if (!scanTime) continue;
        try {
          const existing = await prisma.attendanceLog.findFirst({
            where: { employeePin: String(pin), deviceCloudId: cloudId, scanTime },
          });
          if (existing) continue;
          await prisma.attendanceLog.create({
            data: {
              employeePin: String(pin),
              deviceCloudId: cloudId,
              scanTime,
              verifyMethod: verify != null ? Number(verify) : null,
              statusScan: statusScan != null ? Number(statusScan) : null,
              status: statusMap[Number(statusScan)] || "IN",
              source: type === "attlog" ? "realtime" : "api",
            },
          });
        } catch (e) {
          console.error("[webhook] attlog error:", e);
        }
      }
      break;
    }
  }

  const elapsed = Date.now() - start;
  console.log(`[webhook] done type=${type} elapsed=${elapsed}ms`);

  return NextResponse.json({ status: "ok", elapsed_ms: elapsed });
}

function extractRows(body: any): any[] {
  const data = body?.data ?? body?.payload ?? body;
  if (Array.isArray(data)) return data.filter((x: any) => x && typeof x === "object");
  if (data && typeof data === "object") {
    if (["PIN", "pin", "Name", "name", "Scan", "scan"].some((k) => k in data)) return [data];
  }
  for (const key of ["data", "Rows", "rows", "UserInfo", "userInfo", "AttLog", "attLog", "list"]) {
    if (data?.[key] && Array.isArray(data[key])) return data[key];
  }
  return [];
}

function parseDate(val: string): Date | null {
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    const cleaned = val.replace("T", " ").replace("Z", "").trim();
    const d2 = new Date(cleaned.replace(" ", "T") + "Z");
    if (!isNaN(d2.getTime())) return d2;
    return null;
  } catch {
    return null;
  }
}
