import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { pin, cloudId } = await request.json();
    if (!pin) {
      return NextResponse.json({ success: false, error: "PIN harus diisi" }, { status: 400 });
    }

    const user = await prisma.userInfo.findUnique({ where: { pin: String(pin) } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    // Build template:
    // 1. If facePhoto exists, create double-base64 face template
    // 2. Else if existing template from webhook, use it
    // 3. Else empty string
    let template = "";
    if (user.facePhoto) {
      // Double base64: encode {"face":"<base64_jpeg>"} in base64
      const facePayload = JSON.stringify({ face: user.facePhoto });
      template = Buffer.from(facePayload, "utf-8").toString("base64");
    } else if (user.template) {
      template = user.template;
    }

    const apiKey = process.env.FINGERSPOT_API_KEY || "";
    const apiUrl = process.env.FINGERSPOT_API_URL || "https://developer.fingerspot.io/api";
    const targetCloudId = String(cloudId || process.env.FINGERSPOT_CLOUD_ID || "");

    const res = await fetch(`${apiUrl}/set_userinfo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        cloud_id: targetCloudId,
        trans_id: `sync-${Date.now()}-${pin}`,
        data: {
          pin: user.pin,
          name: user.name,
          privilege: String(user.privilege ?? 1),
          password: user.password || "",
          rfid: String(user.rfid ?? ""),
          template,
        },
      }),
    });

    const result = await res.json();
    return NextResponse.json({
      success: result?.success === true,
      data: result,
      message: result?.success === true
        ? "Perintah dikirim ke mesin. Tunggu hasil via webhook."
        : "Gagal: " + (result?.message || result?.error || "Unknown error"),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
