import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeePin = searchParams.get("employeePin");
    const status = searchParams.get("status");
    const month = parseInt(searchParams.get("month") || "");
    const year = parseInt(searchParams.get("year") || "");

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const where: any = {};

    if (employeePin) where.employeePin = employeePin;
    if (status) where.status = status;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    where.startDate = { gte: startDate };
    where.endDate = { lte: endDate };

    const data = await prisma.riwayatIzinCuti.findMany({
      where,
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil riwayat izin cuti" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeePin, masterIzinId, startDate, endDate, foto, catatan, status } = body;

    if (!employeePin || !masterIzinId || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "employeePin, masterIzinId, startDate, endDate harus diisi" }, { status: 400 });
    }

    const data = await prisma.riwayatIzinCuti.create({
      data: {
        employeePin,
        masterIzinId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        foto: foto || null,
        catatan: catatan || null,
        status: status || "pending",
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal membuat riwayat izin cuti" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, employeePin, masterIzinId, startDate, endDate, foto, catatan, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.riwayatIzinCuti.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    const data = await prisma.riwayatIzinCuti.update({
      where: { id },
      data: {
        ...(employeePin !== undefined && { employeePin }),
        ...(masterIzinId !== undefined && { masterIzinId }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
        ...(foto !== undefined && { foto }),
        ...(catatan !== undefined && { catatan }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal mengupdate riwayat izin cuti" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.riwayatIzinCuti.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    await prisma.riwayatIzinCuti.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal menghapus riwayat izin cuti" }, { status: 500 });
  }
}
