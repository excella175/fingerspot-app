import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { kode: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const data = await prisma.aturan.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data aturan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kode, name, toleransiTerlambat, toleransiPulangCepat, batasAbsensiMasuk, batasAbsensiPulang } = body;

    if (!kode || !name) {
      return NextResponse.json(
        { success: false, error: "Kode dan nama harus diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.aturan.findUnique({ where: { kode } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Kode sudah digunakan" },
        { status: 409 }
      );
    }

    const aturan = await prisma.aturan.create({
      data: {
        kode,
        name,
        toleransiTerlambat: toleransiTerlambat ?? 0,
        toleransiPulangCepat: toleransiPulangCepat ?? 0,
        batasAbsensiMasuk: batasAbsensiMasuk ?? 0,
        batasAbsensiPulang: batasAbsensiPulang ?? 0,
      },
    });

    return NextResponse.json({ success: true, data: aturan });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Gagal membuat aturan" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID harus diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.aturan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Aturan tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { kode, name, toleransiTerlambat, toleransiPulangCepat, batasAbsensiMasuk, batasAbsensiPulang } = body;

    if (kode && kode !== existing.kode) {
      const conflict = await prisma.aturan.findUnique({ where: { kode } });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: "Kode sudah digunakan" },
          { status: 409 }
        );
      }
    }

    const aturan = await prisma.aturan.update({
      where: { id },
      data: {
        ...(kode !== undefined && { kode }),
        ...(name !== undefined && { name }),
        ...(toleransiTerlambat !== undefined && { toleransiTerlambat }),
        ...(toleransiPulangCepat !== undefined && { toleransiPulangCepat }),
        ...(batasAbsensiMasuk !== undefined && { batasAbsensiMasuk }),
        ...(batasAbsensiPulang !== undefined && { batasAbsensiPulang }),
      },
    });

    return NextResponse.json({ success: true, data: aturan });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Gagal mengupdate aturan" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID harus diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.aturan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Aturan tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.aturan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Gagal menghapus aturan" },
      { status: 500 }
    );
  }
}
