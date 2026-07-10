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
      case "attlog":
        await handleAttlog(cloud_id, data);
        break;
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

async function handleAttlog(cloudId: string, data: Record<string, any>) {
  const { pin, scan, verify, status_scan } = data;
  if (!pin || !scan) return;

  const scanTimeStr = String(scan).replace(" ", "T") + "+07:00";
  const scanTime = new Date(scanTimeStr);

  const existing = await prisma.attendanceLog.findFirst({
    where: { employeePin: String(pin), deviceCloudId: cloudId, scanTime },
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

async function handleUserinfo(cloudId: string, data: Record<string, any>) {
  const { pin, name, password, privilege, finger, face, rfid, vein, template } = data;
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
