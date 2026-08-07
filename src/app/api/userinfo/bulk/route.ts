import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { pins, syncToDevice, cloudId } = await request.json();
    if (!pins || !Array.isArray(pins) || pins.length === 0) {
      return NextResponse.json({ success: false, error: "Pilih minimal 1 karyawan" }, { status: 400 });
    }

    const results: { pin: string; status: string; error?: string }[] = [];
    const apiKey = process.env.FINGERSPOT_API_KEY || "";
    const apiUrl = process.env.FINGERSPOT_API_URL || "https://developer.fingerspot.io/api";
    const targetCloudId = String(cloudId || process.env.FINGERSPOT_CLOUD_ID || "");

    for (const pin of pins) {
      try {
        await prisma.userInfo.delete({ where: { pin: String(pin) } });

        if (syncToDevice !== false) {
          fetch(`${apiUrl}/delete_userinfo`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ cloud_id: targetCloudId, trans_id: `bulk-del-${Date.now()}-${pin}`, pin: String(pin) }),
          }).catch(() => {});
        }

        results.push({ pin: String(pin), status: "deleted" });
      } catch (e: any) {
        results.push({ pin: String(pin), status: "error", error: e.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
