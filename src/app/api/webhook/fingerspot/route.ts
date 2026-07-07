import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface WebhookPayload {
  type: string;
  cloud_id: string;
  trans_id?: number;
  data: Record<string, any>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: WebhookPayload = await request.json();
    const { type, cloud_id, trans_id, data } = body;

    console.log("[Webhook] Received:", type, cloud_id);

    // Log webhook
    await prisma.webhookLog.create({
      data: {
        type,
        deviceCloudId: cloud_id,
        transId: trans_id?.toString() || null,
        status: "SUCCESS",
        payload: body as any,
      },
    });

    // Process based on type
    switch (type) {
      case "attlog":
        await handleAttlog(cloud_id, data);
        break;
      case "userinfo":
        await handleUserinfo(cloud_id, data);
        break;
      case "set_userinfo":
      case "delete_userinfo":
      case "set_time":
      case "reg_online":
        // Command responses - logged only
        break;
      case "get_userid_list":
        await handlePinList(cloud_id, data);
        break;
      default:
        console.log("[Webhook] Unknown type:", type);
    }

    const duration = Date.now() - startTime;
    console.log("[Webhook] Done in", duration, "ms");

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[Webhook] Error:", error);

    // Try to log failed webhook
    try {
      const body = await request.json().catch(() => null);
      if (body) {
        await prisma.webhookLog.create({
          data: {
            type: body.type || "unknown",
            deviceCloudId: body.cloud_id || "unknown",
            status: "FAILED",
            payload: body as any,
          },
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

async function handleAttlog(cloudId: string, data: Record<string, any>) {
  const { pin, scan, verify, status_scan } = data;
  if (!pin || !scan) return;

  // Parse scan time (WIB = UTC+7)
  const scanTimeStr = String(scan).replace(" ", "T") + "+07:00";
  const scanTime = new Date(scanTimeStr);

  // Check duplicate
  const existing = await prisma.attendanceLog.findFirst({
    where: { employeePin: String(pin), deviceCloudId: cloudId, scanTime },
  });
  if (existing) return;

  // Determine IN/OUT based on count today
  const wibDate = new Date(scanTime.getTime() + 7 * 60 * 60 * 1000);
  const wibDateStr = `${wibDate.getUTCFullYear()}-${String(wibDate.getUTCMonth() + 1).padStart(2, "0")}-${String(wibDate.getUTCDate()).padStart(2, "0")}`;
  const startOfDay = new Date(`${wibDateStr}T00:00:00+07:00`);
  const endOfDay = new Date(`${wibDateStr}T23:59:59.999+07:00`);

  const todayCount = await prisma.attendanceLog.count({
    where: {
      employeePin: String(pin),
      scanTime: { gte: startOfDay, lte: endOfDay },
    },
  });

  const status = todayCount % 2 === 0 ? "IN" : "OUT";

  await prisma.attendanceLog.create({
    data: {
      employeePin: String(pin),
      deviceCloudId: cloudId,
      scanTime,
      verifyMethod: verify || null,
      statusScan: status_scan || null,
      status,
      source: "realtime",
      rawPayload: data as any,
    },
  });
}

async function handleUserinfo(cloudId: string, data: Record<string, any>) {
  const { pin, name, password, privilege, finger, face, rfid, vein, template } = data;
  if (!pin || !name) return;

  await prisma.userInfo.upsert({
    where: { pin: String(pin) },
    update: {
      name: String(name),
      password: password || null,
      privilege: privilege || 1,
      finger: finger || 0,
      face: face || 0,
      rfid: rfid || 0,
      vein: vein || 0,
      template: template || null,
      deviceCloudId: cloudId,
      rawPayload: data as any,
    },
    create: {
      pin: String(pin),
      name: String(name),
      password: password || null,
      privilege: privilege || 1,
      finger: finger || 0,
      face: face || 0,
      rfid: rfid || 0,
      vein: vein || 0,
      template: template || null,
      deviceCloudId: cloudId,
      rawPayload: data as any,
    },
  });
}

async function handlePinList(cloudId: string, data: Record<string, any>) {
  const { total, pin_arr } = data;
  if (!pin_arr || !Array.isArray(pin_arr)) return;

  // Save each pin
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
