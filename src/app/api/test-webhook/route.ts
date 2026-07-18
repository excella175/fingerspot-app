import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const rawText = await request.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { raw: rawText };
    }

    await prisma.webhookLog.create({
      data: {
        type: "test-webhook",
        deviceCloudId: body?.cloud_id || "test",
        status: "SUCCESS",
        payload: { received: body, method: "POST", path: "/api/test-webhook" },
      },
    });

    return NextResponse.json({
      status: "ok",
      message: "Webhook test berhasil! Cek riwayat webhook.",
      received: body,
    });
  } catch (error) {
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Test webhook endpoint aktif. Kirim POST untuk menguji.",
    instructions: "Set webhook URL di Fingerspot ke: https://fingerspot-adj8jpb04-excel13.vercel.app/api/webhook/fingerspot",
    test_url: "https://fingerspot-adj8jpb04-excel13.vercel.app/api/test-webhook",
  });
}