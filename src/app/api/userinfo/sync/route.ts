import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    if (!pin) {
      return NextResponse.json({ success: false, error: "PIN harus diisi" }, { status: 400 });
    }

    const user = await prisma.userInfo.findUnique({ where: { pin: String(pin) } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    const apiKey = process.env.FINGERSPOT_API_KEY || "";
    const apiUrl = process.env.FINGERSPOT_API_URL || "https://developer.fingerspot.io/api";
    const cloudId = process.env.FINGERSPOT_CLOUD_ID || "";

    const res = await fetch(`${apiUrl}/set_userinfo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        cloud_id: cloudId,
        trans_id: `sync-${Date.now()}-${pin}`,
        data: {
          pin: user.pin,
          name: user.name,
          privilege: String(user.privilege ?? 1),
          password: user.password || "",
          rfid: String(user.rfid ?? ""),
          template: "",
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
