import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Respond quick — Fingerspot may timeout if we're too slow
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint aktif. Kirim POST untuk callback.",
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // 1. Baca raw body (text) — selalu bisa tanpa error
  let rawText = "";
  try {
    rawText = await request.text();
  } catch {
    rawText = "(unreadable)";
  }

  // 2. Log ke database SEGERA — before any processing
  let logId: string | null = null;
  try {
    const log = await prisma.webhookLog.create({
      data: {
        type: "raw",
        deviceCloudId: "pending",
        status: "RECEIVED",
        payload: { raw: rawText.substring(0, 5000) } as any,
      },
    });
    logId = log.id;
  } catch {
    // DB might be slow on cold start — continue anyway
  }

  // 3. Parse body
  let body: any = {};
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    body = { _raw: rawText };
  }

  const type = body?.type ?? body?.event ?? "unknown";
  const cloud_id =
    body?.cloud_id ??
    body?.cloudId ??
    body?.device_cloud_id ??
    body?.deviceCloudId ??
    "unknown";
  const trans_id = body?.trans_id ?? body?.transId ?? null;

  console.log("[Webhook] INCOMING", { type, cloud_id, trans_id });

  // 4. Update log with parsed info (fire & forget — don't block response)
  if (logId) {
    updateLog(logId, type, cloud_id, trans_id, body).catch(() => {});
  }

  // 5. Process based on type (fire & forget)
  processCallback(type, cloud_id, trans_id, body).catch((e) => {
    console.error("[Webhook] processCallback error:", e);
  });

  // 6. Respond FAST — always 200 OK
  const elapsed = Date.now() - startTime;
  console.log("[Webhook] Responded in", elapsed, "ms");

  return NextResponse.json({ status: "ok", elapsed });
}

async function updateLog(
  id: string,
  type: string,
  cloudId: string,
  transId: string | number | null,
  body: any,
) {
  try {
    await prisma.webhookLog.update({
      where: { id },
      data: {
        type: String(type),
        deviceCloudId: String(cloudId),
        transId: transId?.toString() ?? null,
        payload: body as any,
      },
    });
  } catch (e) {
    console.error("[Webhook] updateLog error:", e);
  }
}

async function processCallback(
  type: string,
  cloudId: string,
  transId: string | number | null,
  body: any,
) {
  const data = body?.data ?? body?.payload ?? body;

  switch (type) {
    case "get_userinfo":
    case "userinfo": {
      const rows = normalizeRows(data);
      for (const row of rows) {
        const pin = row.pin ?? row.user_id ?? row.userId;
        if (!pin) continue;

        const name = row.name ?? row.user_name ?? row.username ?? row.full_name ?? row.fullName;
        const privilege = row.privilege ?? row.priv ?? row.role ?? null;
        const finger = row.finger ?? row.fingerPrint ?? row.fingerprint ?? null;
        const face = row.face ?? null;
        const rfid = row.rfid ?? row.card ?? row.card_id ?? row.cardId ?? null;
        const vein = row.vein ?? null;
        const password = row.password ?? row.pass ?? row.pwd ?? null;

        try {
          await prisma.userInfo.upsert({
            where: { pin: String(pin) },
            update: {
              ...(name ? { name: String(name) } : {}),
              ...(password ? { password: String(password) } : {}),
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
          console.error("[Webhook] upsert userinfo error:", e);
        }
      }
      break;
    }

    case "get_userid_list": {
      const { extractPinArray } = await import("@/lib/fingerspot-payload");
      const pins = extractPinArray(data);
      if (pins.length > 0) {
        try {
          await prisma.pinList.deleteMany({ where: { deviceCloudId: cloudId } });
          for (const pin of pins) {
            await prisma.pinList.create({
              data: {
                deviceCloudId: cloudId,
                pin: String(pin),
                total: data?.total != null ? Number(data.total) : null,
              },
            });
          }
        } catch (e) {
          console.error("[Webhook] save pinlist error:", e);
        }

        // Auto-trigger get_userinfo for each new PIN
        for (const pin of pins.slice(0, 50)) {
          fetchUserInfoAsync(cloudId, String(pin));
        }
      }
      break;
    }

    case "attlog": {
      const { parseScanTime } = await import("@/lib/fingerspot-payload");
      const rows = Array.isArray(data) ? data : [data];
      for (const row of rows) {
        const pin = row.pin ?? row.employee_pin ?? row.employeePin;
        const scan = row.scan ?? row.scan_time ?? row.scanTime ?? row.scan_date ?? row.scanDate;
        const verify = row.verify ?? row.verify_method ?? row.verifyMethod;
        const status_scan = row.status_scan ?? row.statusScan;

        if (pin == null || scan == null) continue;

        const scanTime = parseScanTime(scan);
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
              statusScan: status_scan != null ? Number(status_scan) : null,
              status: statusMap[Number(status_scan)] || "IN",
              source: "realtime",
            },
          });
        } catch (e) {
          console.error("[Webhook] save attlog error:", e);
        }
      }
      break;
    }

    case "get_attlog": {
      const { extractAttlogRows, parseScanTime } = await import("@/lib/fingerspot-payload");
      const rows = extractAttlogRows(data);
      for (const row of rows) {
        const pin = row.pin ?? row.employee_pin ?? row.employeePin;
        const scan = row.scan ?? row.scan_date ?? row.scanDate ?? row.scan_time ?? row.scanTime;
        const verify = row.verify ?? row.verify_method ?? row.verifyMethod;
        const status_scan = row.status_scan ?? row.statusScan;

        if (pin == null || scan == null) continue;

        const scanTime = parseScanTime(scan);
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
              statusScan: status_scan != null ? Number(status_scan) : null,
              status: statusMap[Number(status_scan)] || "IN",
              source: "api",
            },
          });
        } catch (e) {
          console.error("[Webhook] save get_attlog error:", e);
        }
      }
      break;
    }

    default:
      console.log("[Webhook] Unhandled type:", type);
  }
}

function normalizeRows(value: any): any[] {
  if (Array.isArray(value)) return value.filter((v) => v && typeof v === "object");
  if (!value || typeof value !== "object") return [];
  // Check if value has known user fields
  const hasDirect = ["pin", "name", "user_id", "privilege", "finger"].some((k) => k in value);
  if (hasDirect) return [value];
  // Check nested data/result/response
  for (const key of ["data", "result", "response", "userinfo", "user", "users", "rows", "list"]) {
    if (key in value) {
      const nested = normalizeRows(value[key]);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}

async function fetchUserInfoAsync(cloudId: string, pin: string) {
  const mod = await import("@/lib/fingerspot");
  try {
    await mod.getUserInfo(pin, `webhook-auto-${Date.now()}`);
  } catch {
    // ignore
  }
}
