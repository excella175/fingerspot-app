import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { pin, name, privilege, password, rfid } = await request.json();
    if (!pin || !name) {
      return NextResponse.json({ success: false, error: "PIN dan nama harus diisi" }, { status: 400 });
    }

    const apiKey = process.env.FINGERSPOT_API_KEY || "";
    const apiUrl = process.env.FINGERSPOT_API_URL || "https://developer.fingerspot.io/api";
    const cloudId = process.env.FINGERSPOT_CLOUD_ID || "";

    const res = await fetch(`${apiUrl}/set_userinfo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        cloud_id: cloudId,
        trans_id: `add-${Date.now()}-${pin}`,
        data: {
          pin: String(pin),
          name: String(name),
          privilege: String(privilege ?? 1),
          password: password || "",
          rfid: rfid || "",
          template: "",
        },
      }),
    });

    const result = await res.json();
    const success = result?.success === true;

    return NextResponse.json({
      success,
      data: result,
      message: success
        ? "Perintah tambah user dikirim ke mesin. Tunggu hasil via webhook."
        : "Gagal: " + (result?.message || result?.error || "Unknown error"),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
