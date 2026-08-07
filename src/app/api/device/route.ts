import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.device.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { cloudId, name } = await request.json();
    const cloudIdClean = String(cloudId || "").trim();
    if (!cloudIdClean) {
      return NextResponse.json({ success: false, error: "Cloud ID wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.device.findUnique({ where: { cloudId: cloudIdClean } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Mesin dengan cloud ID "${cloudIdClean}" sudah terdaftar` }, { status: 400 });
    }

    const device = await prisma.device.create({
      data: {
        cloudId: cloudIdClean,
        name: String(name || "").trim() || `Mesin ${cloudIdClean}`,
      },
    });

    return NextResponse.json({ success: true, data: device });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID wajib" }, { status: 400 });

    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) return NextResponse.json({ success: false, error: "Mesin tidak ditemukan" }, { status: 404 });

    await prisma.device.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
