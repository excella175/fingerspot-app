import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface WebhookPayload {
  type: string;
  cloud_id: string;
  trans_id?: number | string;
  data: Record<string, any>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let body: WebhookPayload | null = null;

  try {
    body = await request.json();
    if (!body) {
      return NextResponse.json({ status: "error" }, { status: 400 });
    }
    const { type, cloud_id, trans_id, data } = body;

    console.log("[Webhook] Received:", type, cloud_id);

    // Pastikan handleAttlog(...) menerima payload yang benar.
    // Banyak webhook Fingerspot membungkus hasil di data.data.
    const normalizedData =
      data && typeof data === "object" && "data" in (data as any)
        ? (data as any).data
        : data;

    await prisma.webhookLog.create({
      data: {
        type,
        deviceCloudId: cloud_id,
        transId: trans_id?.toString() || null,
        status: "SUCCESS",
        payload: body as any,
      },
    });

    switch (type) {
      // attendance (device push)
      case "attlog":
        await handleAttlog(cloud_id, data);
        break;

      // attendance (developer API response via webhook). Payload usually: { data: [ { pin, scan_date, ... } ] }
      case "get_attlog": {
        const rows = normalizedData;
        if (Array.isArray(rows)) {
          await handleAttlogArray(cloud_id, rows);
        } else if (rows && typeof rows === "object") {
          // beberapa payload: { data: [ ... ] } sudah di-normalize jadi array/object
          const maybeRows = (rows as any).data ?? rows;
          if (Array.isArray(maybeRows)) {
            await handleAttlogArray(cloud_id, maybeRows);
          } else {
            await handleAttlog(cloud_id, maybeRows);
          }
        } else {
          // fallback: kalau unexpected, coba direct
          await handleAttlog(cloud_id, rows as any);
        }
        break;
      }

      case "get_userinfo":
      case "userinfo":
        await handleUserinfo(cloud_id, data);
        break;
      case "get_userid_list":
        await handlePinList(cloud_id, data);
        break;
      case "set_userinfo":
      case "delete_userinfo":
      case "set_time":
      case "reg_online":
      case "restart_device":
      case "set_qrcode":
      case "get_qrcode":
        break;
      default:
        console.log("[Webhook] Unknown type:", type);
    }

    const duration = Date.now() - startTime;
    console.log("[Webhook] Done in", duration, "ms");

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Webhook] Error:", error);

    if (body) {
      try {
        await prisma.webhookLog.create({
          data: {
            type: body.type || "unknown",
            deviceCloudId: body.cloud_id || "unknown",
            status: "FAILED",
            payload: body as any,
          },
        });
      } catch {
        // ignore logging errors
      }
    }

    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

async function handleAttlog(cloudId: string, data: Record<string, unknown>) {
  // Fingerspot payload shapes vary; support common keys.
  const pin = data.pin ?? data.employee_pin ?? data.employeePin;
  // handleAttlog supports a single row or a list row (from get_attlog)
  // If payload is array, iterate at caller level by checking Array.isArray elsewhere.
  const scan =
    data.scan ??
    data.scan_time ??
    data.scanTime ??
    data.scan_date ??
    data.scanDate;
  const verify = data.verify ?? data.verify_method ?? data.verifyMethod;
  const status_scan = data.status_scan ?? data.statusScan;

  if (pin == null || scan == null) {
    console.log("[Webhook][attlog] Missing pin/scan", {
      pin,
      scan,
      cloudId,
      data,
    });
    return;
  }

  // Parse scan time robustly.
  // Supported examples:
  // - "2020-07-25 11:11:29" (no tz, space-separated)
  // - "2020-07-25T11:11:29" (may or may not include tz)
  // - sometimes payload includes only date ("YYYY-MM-DD") or milliseconds
  let scanTime: Date;

  // Fingerspot response memakai key "scan_date".
  // Normalisasi scan field sudah dilakukan di atas (scan = data.scan ?? ... ?? data.scan_date ...)
  const scanStr = String(scan);
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(scanStr);

  // Normalize space to 'T' only for the first space.
  const normalized = scanStr.includes(" ")
    ? scanStr.replace(" ", "T")
    : scanStr;

  if (/^\d+$/.test(scanStr)) {
    // looks like unix timestamp (seconds or ms)
    const n = Number(scanStr);
    scanTime = new Date(n < 1e12 ? n * 1000 : n);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(scanStr)) {
    // date only
    scanTime = new Date(`${scanStr}T00:00:00+07:00`);
  } else {
    const scanTimeStr = hasTimezone ? normalized : `${normalized}+07:00`;
    scanTime = new Date(scanTimeStr);
  }

  if (Number.isNaN(scanTime.getTime())) {
    console.log("[Webhook][attlog] Invalid scanTime", {
      scanStr,
      // scanTimeStr hanya tersedia di cabang else, jadi pakai representasi aman
      scanTime: scanTime?.toISOString?.() ?? String(scanTime),
      cloudId,
      pin,
      data,
    });
    return;
  }

  // Dedupe: include statusScan to reduce accidental collisions.
  const existing = await prisma.attendanceLog.findFirst({
    where: {
      employeePin: String(pin),
      deviceCloudId: cloudId,
      scanTime,
      statusScan: status_scan != null ? Number(status_scan) : null,
    },
  });
  if (existing) return;

  const statusMap: Record<number, string> = {
    0: "IN",
    1: "OUT",
    2: "BREAK_IN",
    3: "BREAK_OUT",
  };
  const status = statusMap[Number(status_scan)] || "IN";

  await prisma.attendanceLog.create({
    data: {
      employeePin: String(pin),
      deviceCloudId: cloudId,
      scanTime,
      verifyMethod: verify != null ? Number(verify) : null,
      statusScan: status_scan != null ? Number(status_scan) : null,
      status,
      source: "realtime",
      rawPayload: data as any,
    },
  });
}

type AttlogRow = {
  pin?: string | number;
  employee_pin?: string | number;
  employeePin?: string | number;
  scan?: string;
  scan_time?: string;
  scanTime?: string;
  scan_date?: string;
  scanDate?: string;
  verify?: number | string;
  verify_method?: number | string;
  verifyMethod?: number | string;
  status_scan?: number | string;
  statusScan?: number | string;
};

function handleAttlogArray(cloudId: string, rows: unknown[]) {
  return Promise.all(
    rows.map((row) => handleAttlog(cloudId, row as AttlogRow)),
  );
}

async function handleUserinfo(cloudId: string, data: Record<string, any>) {
  const { pin, name, password, privilege, finger, face, rfid, vein, template } =
    data;
  if (!pin) return;

  await prisma.userInfo.upsert({
    where: { pin: String(pin) },
    update: {
      name: name ? String(name) : undefined,
      password: password || undefined,
      privilege: privilege != null ? Number(privilege) : undefined,
      finger: finger != null ? Number(finger) : undefined,
      face: face != null ? Number(face) : undefined,
      rfid: rfid != null ? Number(rfid) : undefined,
      vein: vein != null ? Number(vein) : undefined,
      template: template || undefined,
      deviceCloudId: cloudId,
      rawPayload: data as any,
    },
    create: {
      pin: String(pin),
      name: name ? String(name) : "Unknown",
      password: password || null,
      privilege: privilege != null ? Number(privilege) : 1,
      finger: finger != null ? Number(finger) : 0,
      face: face != null ? Number(face) : 0,
      rfid: rfid != null ? Number(rfid) : 0,
      vein: vein != null ? Number(vein) : 0,
      template: template || null,
      deviceCloudId: cloudId,
      rawPayload: data as any,
    },
  });
}

async function handlePinList(cloudId: string, data: Record<string, any>) {
  const { total, pin_arr } = data;
  if (!pin_arr || !Array.isArray(pin_arr)) return;

  await prisma.pinList.deleteMany({
    where: { deviceCloudId: cloudId },
  });

  for (const pin of pin_arr) {
    await prisma.pinList.create({
      data: {
        deviceCloudId: cloudId,
        pin: String(pin),
        total: total || null,
        rawPayload: data as any,
      },
    });
  }
}
