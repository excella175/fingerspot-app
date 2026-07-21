import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json({ status: "ok", message: "Webhook endpoint aktif." });
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  // 1. Read body
  let rawText = "";
  try {
    rawText = await request.text();
  } catch {
    rawText = "(unreadable)";
  }

  // 2. Parse
  let body: any = {};
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    body = { _raw: rawText };
  }

  const type = body?.type ?? body?.event ?? "unknown";
  const cloudId = body?.cloud_id ?? body?.cloudId ?? "unknown";
  const transId = body?.trans_id ?? body?.transId ?? null;
  const data = body?.data ?? body?.payload ?? body;

  // 3. Log to DB async (fire & forget after response)
  const logPromise = prisma.webhookLog.create({
    data: {
      type: String(type),
      deviceCloudId: String(cloudId),
      transId: transId?.toString() ?? null,
      status: "RECEIVED",
      payload: body as any,
    },
  }).catch(() => {});

  // 4. Process based on type
  switch (String(type)) {
    case "get_userinfo":
    case "userinfo": {
      logPromise.then(() => processUserInfo(data, cloudId));
      break;
    }
    case "get_userid_list": {
      logPromise.then(() => processPinList(data, cloudId));
      break;
    }
    case "attlog":
    case "get_attlog": {
      logPromise.then(() => processAttlog(data, cloudId, type));
      break;
    }
    default: {
      console.log("[Webhook] Type:", type, "body:", JSON.stringify(body).slice(0, 300));
    }
  }

  const elapsed = Date.now() - start;
  return NextResponse.json({
    status: "ok",
    received: true,
    type,
    elapsed_ms: elapsed,
  });
}

async function processUserInfo(data: any, cloudId: string) {
  const rows = Array.isArray(data) ? data : data?.Rows ?? data?.rows ?? data?.UserInfo ?? data?.userInfo ?? (data?.Data ?? data?.data) ?? [data].filter((x: any) => x && typeof x === "object");
  const list = Array.isArray(rows) ? rows : typeof rows === "object" && rows !== null ? [rows] : [];

  for (const row of list) {
    const pin = row?.PIN ?? row?.pin ?? row?.UserID ?? row?.user_id ?? row?.userId;
    if (pin == null) continue;

    const name = row?.Name ?? row?.name ?? row?.UserName ?? row?.username;
    const password = row?.Password ?? row?.password ?? row?.pass ?? row?.PWD ?? row?.pwd;
    const privilege = row?.Privilege ?? row?.privilege ?? row?.Role ?? row?.role ?? row?.Level ?? row?.level;
    const finger = row?.Finger ?? row?.finger ?? row?.FingerPrint ?? row?.fingerPrint;
    const face = row?.Face ?? row?.face ?? row?.FaceId ?? row?.faceId;
    const rfid = row?.RFID ?? row?.rfid ?? row?.Card ?? row?.card ?? row?.CardId ?? row?.cardId;
    const vein = row?.Vein ?? row?.vein;

    try {
      await prisma.userInfo.upsert({
        where: { pin: String(pin) },
        update: {
          ...(name ? { name: String(name) } : {}),
          ...(password != null ? { password: String(password) } : {}),
          ...(privilege != null ? { privilege: Number(privilege) } : {}),
          ...(finger != null ? { finger: Number(finger) } : {}),
          ...(face != null ? { face: Number(face) } : {}),
          ...(rfid != null ? { rfid: Number(rfid) } : {}),
          ...(vein != null ? { vein: Number(vein) } : {}),
          deviceCloudId: cloudId,
        },
        create: {
          pin: String(pin),
          name: name ? String(name) : "Unknown",
          password: password ? String(password) : null,
          privilege: privilege != null ? Number(privilege) : 1,
          finger: finger != null ? Number(finger) : 0,
          face: face != null ? Number(face) : 0,
          rfid: rfid != null ? Number(rfid) : 0,
          vein: vein != null ? Number(vein) : 0,
          deviceCloudId: cloudId,
        },
      });
    } catch (e) {
      console.error("[Webhook] upsert userinfo:", e);
    }
  }
}

async function processPinList(data: any, cloudId: string) {
  let pins: string[] = [];
  if (data?.pin_arr && Array.isArray(data.pin_arr)) {
    pins = data.pin_arr.map(String);
  } else if (Array.isArray(data)) {
    pins = data.map(String);
  } else if (typeof data === "object" && data !== null) {
    const candidates = Object.values(data).flat();
    pins = candidates.filter((v): v is string => typeof v === "string" || typeof v === "number").map(String);
  }

  try {
    await prisma.pinList.deleteMany({ where: { deviceCloudId: cloudId } });
    for (const pin of pins) {
      await prisma.pinList.create({
        data: { deviceCloudId: cloudId, pin },
      });
    }
  } catch (e) {
    console.error("[Webhook] save pinlist:", e);
  }

  // Auto-fetch userinfo for each pin
  const apiKey = process.env.FINGERSPOT_API_KEY;
  const apiUrl = process.env.FINGERSPOT_API_URL || "https://developer.fingerspot.io/api";
  for (const pin of pins.slice(0, 50)) {
    fetch(`${apiUrl}/get_userinfo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cloud_id: cloudId, trans_id: `webhook-${Date.now()}-${pin}`, pin }),
    }).catch(() => {});
  }
}

async function processAttlog(data: any, cloudId: string, sourceType: string) {
  const rows = Array.isArray(data) ? data : data?.Rows ?? data?.rows ?? data?.AttLog ?? data?.attLog ?? (data?.Data ?? data?.data) ?? [data].filter((x: any) => x && typeof x === "object");
  const list = Array.isArray(rows) ? rows : typeof rows === "object" && rows !== null ? [rows] : [];

  for (const row of list) {
    const pin = row?.PIN ?? row?.pin ?? row?.EmployeePin ?? row?.employee_pin ?? row?.employeePin ?? row?.UserId ?? row?.userId;
    let scanStr = row?.Scan ?? row?.scan ?? row?.ScanTime ?? row?.scan_time ?? row?.scanTime ?? row?.ScanDate ?? row?.scan_date ?? row?.scanDate ?? row?.DateTime ?? row?.dateTime;

    if (pin == null || scanStr == null) continue;
    scanStr = String(scanStr);

    const verify = row?.Verify ?? row?.verify ?? row?.VerifyMethod ?? row?.verify_method ?? row?.verifyMethod;
    const statusScan = row?.StatusScan ?? row?.status_scan ?? row?.statusScan ?? row?.Status ?? row?.status;

    const scanTime = parseScanTime(scanStr);
    if (!scanTime) continue;

    try {
      const existing = await prisma.attendanceLog.findFirst({
        where: { employeePin: String(pin), deviceCloudId: cloudId, scanTime },
      });
      if (existing) continue;

      const statusMap: Record<number, string> = { 0: "IN", 1: "OUT", 2: "BREAK_IN", 3: "BREAK_OUT" };
      await prisma.attendanceLog.create({
        data: {
          employeePin: String(pin),
          deviceCloudId: cloudId,
          scanTime,
          verifyMethod: verify != null ? Number(verify) : null,
          statusScan: statusScan != null ? Number(statusScan) : null,
          status: statusMap[Number(statusScan)] || "IN",
          source: sourceType === "attlog" ? "realtime" : "api",
        },
      });
    } catch (e) {
      console.error("[Webhook] save attlog:", e);
    }
  }
}

function parseScanTime(val: string): Date | null {
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
