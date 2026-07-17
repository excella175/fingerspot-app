import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as fingerspot from "@/lib/fingerspot";
import { extractAttlogRows, parseScanTime } from "@/lib/fingerspot-payload";

interface WebhookPayload {
  type: string;
  cloud_id: string;
  trans_id?: number | string;
  data: Record<string, any>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let body: any = null;

  try {
    // Verifikasi webhook secret dari header saat secret nyata dipakai.
    // Jika secret masih placeholder/default, pengujian lokal tetap boleh lewat.
    const webhookSecret = process.env.FINGERSPOT_WEBHOOK_SECRET;
    const isPlaceholderSecret =
      !webhookSecret ||
      /\[your-webhook-secret\]|your-webhook-secret|placeholder|changeme/i.test(
        webhookSecret,
      );

    if (webhookSecret && !isPlaceholderSecret) {
      const authHeader =
        request.headers.get("authorization") ||
        request.headers.get("x-webhook-secret") ||
        request.headers.get("x-fingerspot-secret");
      if (
        authHeader !== webhookSecret &&
        authHeader !== `Bearer ${webhookSecret}`
      ) {
        console.error("[Webhook] Invalid secret");
        return NextResponse.json({ status: "unauthorized" }, { status: 401 });
      }
    }

    const rawText = await request.text();
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch (e) {
      // fallback: try NextRequest.json (if stream already used) or treat as raw text
      try {
        body = await request.json();
      } catch {
        body = rawText;
      }
    }

    if (!body) {
      console.warn("[Webhook] Empty body received");
      return NextResponse.json({ status: "error", reason: "empty body" }, { status: 400 });
    }

    // support both snake_case and camelCase from device
    const type = body.type ?? body.event ?? null;
    const cloud_id = body.cloud_id ?? body.cloudId ?? body.device_cloud_id ?? body.deviceCloudId ?? (body.data && (body.data.cloud_id ?? body.data.cloudId)) ?? null;
    const trans_id = body.trans_id ?? body.transId ?? null;
    // prefer nested data, but fallback to payload/body itself
    const data = body.data ?? body.payload ?? body;

    console.log("[Webhook] Received:", type, cloud_id);
    console.log("[Webhook] Raw body:", rawText.substring(0, 2000));

    // Fingerspot callback mengikuti bentuk:
    // { type, cloud_id, trans_id, data: {...} }
    // Di beberapa kasus payload sebenarnya ada di body.data.data, jadi kita normalisasi dengan aman.
    const normalizedData =
      data && typeof data === "object" && "data" in (data as any)
        ? (data as any).data
        : data;

    // build headers object (safe) and persist raw payload + headers
    let headersObj: Record<string, string> = {};
    try {
      headersObj = Object.fromEntries(request.headers as any) as Record<string, string>;
    } catch (e) {
      try {
        for (const [k, v] of request.headers) {
          headersObj[String(k)] = String(v);
        }
      } catch {
        headersObj = {};
      }
    }

    console.log("[Webhook] Headers:", headersObj);

    let savedPayload: any = (body as any) ?? { raw: rawText };
    if (typeof savedPayload === "string") savedPayload = { raw: savedPayload };
    savedPayload._headers = headersObj;

    await prisma.webhookLog.create({
      data: {
        type: String(type ?? "unknown"),
        deviceCloudId: String(cloud_id ?? body.cloudId ?? body.cloud_id ?? "unknown"),
        transId: trans_id?.toString() || null,
        status: "SUCCESS",
        payload: savedPayload,
      },
    });

    console.log(
      "[Webhook] Normalized data:",
      JSON.stringify(normalizedData, null, 2),
    );

    switch (type) {
      // attendance (device push)
      case "attlog": {
        const attData = normalizedData;
        if (Array.isArray(attData)) {
          await handleAttlogArray(cloud_id, attData);
        } else if (attData && typeof attData === "object") {
          await handleAttlog(cloud_id, attData);
        } else {
          await handleAttlog(cloud_id, data);
        }
        break;
      }

      // attendance (developer API response via webhook). Payload usually: { data: [ { pin, scan_date, ... } ] }
      case "get_attlog": {
        const rows = normalizedData;
        if (Array.isArray(rows)) {
          await handleAttlogArray(cloud_id, rows);
        } else if (rows && typeof rows === "object") {
          const maybeRows = (rows as any).data ?? rows;
          if (Array.isArray(maybeRows)) {
            await handleAttlogArray(cloud_id, maybeRows);
          } else {
            await handleAttlog(cloud_id, maybeRows);
          }
        } else {
          await handleAttlog(cloud_id, rows as any);
        }
        break;
      }

      case "get_userinfo":
      case "userinfo": {
        const userData =
          normalizedData && typeof normalizedData === "object"
            ? normalizedData
            : data;
        try {
          await handleUserinfo(cloud_id ?? (body.cloudId ?? body.cloud_id), userData);
        } catch (e) {
          console.error("[Webhook][userinfo] handler failed", e);
        }
        break;
      }
      case "get_userid_list": {
        const pinData =
          normalizedData && typeof normalizedData === "object"
            ? normalizedData
            : data;
        const resolvedCloudId = cloud_id ?? (body.cloudId ?? body.cloud_id) ?? "unknown";
        try {
          const pins = await handlePinList(resolvedCloudId, pinData);
          if (pins.length > 0) {
            console.log(`[Webhook][pinlist] ${pins.length} PINs saved, triggering get_userinfo for each`);
            for (const pin of pins.slice(0, 50)) {
              fingerspot.getUserInfo(String(pin), `webhook-auto-${Date.now()}`).catch((e) =>
                console.error(`[Webhook] auto-getUserInfo(${pin}) failed:`, e)
              );
            }
          }
        } catch (e) {
          console.error("[Webhook][pinlist] handler failed", e);
        }
        break;
      }
      case "set_userinfo":
      case "delete_userinfo":
      case "register_online":
      case "set_time":
      case "reg_online":
      case "restart_device":
      case "set_qrcode":
      case "get_qrcode": {
        const statusData =
          normalizedData && typeof normalizedData === "object"
            ? normalizedData
            : data;
        if (isRecord(statusData) && typeof statusData.status === "string") {
          console.log("[Webhook] Command status callback", {
            type,
            cloudId: cloud_id,
            status: statusData.status,
          });
        }
        break;
      }
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

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeUserInfoPayload(value: unknown): Array<Record<string, any>> {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (!isRecord(value)) {
    return [];
  }

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

  if (directKeys.some((key) => key in value)) {
    return [value];
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
    if (key in value) {
      const nested = normalizeUserInfoPayload(value[key]);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

async function handleAttlog(cloudId: string, data: Record<string, unknown>) {
  const pin = data.pin ?? data.employee_pin ?? data.employeePin;
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

  const scanTime = parseScanTime(scan);
  if (!scanTime) {
    console.log("[Webhook][attlog] Invalid scanTime", {
      scan,
      cloudId,
      pin,
      data,
    });
    return;
  }

  const existing = await prisma.attendanceLog.findFirst({
    where: {
      employeePin: String(pin),
      deviceCloudId: cloudId,
      scanTime,
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

  try {
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
  } catch (error) {
    console.error("[Webhook][attlog] Prisma insert failed", {
      cloudId,
      pin,
      scanTime: scanTime.toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
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

async function handleAttlogArray(cloudId: string, rows: unknown[]) {
  const normalizedRows = rows.flatMap((row) => extractAttlogRows(row));
  const results = await Promise.allSettled(
    normalizedRows.map((row) => handleAttlog(cloudId, row as AttlogRow)),
  );
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error(
      "[Webhook][attlog] Batch errors:",
      failed.length,
      "of",
      rows.length,
    );
    failed.forEach((f, i) => {
      if (f.status === "rejected") console.error(`  Row ${i}:`, f.reason);
    });
  }
  const saved = results.filter((r) => r.status === "fulfilled").length;
  console.log(
    "[Webhook][attlog] Batch saved:",
    saved,
    "of",
    normalizedRows.length,
  );
}

async function handleUserinfo(cloudId: string, data: Record<string, any>) {
  const rows = normalizeUserInfoPayload(data);
  if (!rows.length) return;

  for (const row of rows) {
    const pin =
      row.pin ??
      row.employee_pin ??
      row.employeePin ??
      row.user_id ??
      row.userId;
    if (!pin) continue;

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

    if (
      typeof name === "undefined" &&
      typeof password === "undefined" &&
      typeof privilege === "undefined"
    ) {
      console.log("[Webhook][userinfo] No user fields found", {
        cloudId,
        payload: row,
      });
      continue;
    }

    try {
      await prisma.userInfo.upsert({
        where: { pin: String(pin) },
        update: {
          name: name ? String(name) : undefined,
          password: password ? String(password) : undefined,
          privilege: privilege != null ? Number(privilege) : undefined,
          finger: finger != null ? Number(finger) : undefined,
          face: face != null ? Number(face) : undefined,
          rfid: rfid != null ? Number(rfid) : undefined,
          vein: vein != null ? Number(vein) : undefined,
          template: template ? String(template) : undefined,
          deviceCloudId: cloudId,
          rawPayload: row as any,
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
          template: template ? String(template) : null,
          deviceCloudId: cloudId,
          rawPayload: row as any,
        },
      });
    } catch (error) {
      console.error("[Webhook][userinfo] Prisma upsert failed", {
        cloudId,
        pin,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

async function handlePinList(cloudId: string, data: Record<string, any>): Promise<string[]> {
  const { extractPinArray } = await import("@/lib/fingerspot-payload");
  const pinArr = extractPinArray(data);
  if (!pinArr.length) {
    console.log("[Webhook][pinlist] No pin array found", { cloudId, data });
    return [];
  }

  await prisma.pinList.deleteMany({ where: { deviceCloudId: cloudId } });

  for (const pin of pinArr) {
    await prisma.pinList.create({
      data: {
        deviceCloudId: cloudId,
        pin: String(pin),
        total: data.total != null ? Number(data.total) : null,
        rawPayload: data as any,
      },
    });
  }

  return pinArr.map(String);
}
