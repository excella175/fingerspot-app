import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.masterIzinCuti.findMany({ orderBy: { nama: "asc" } });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil data master izin cuti" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, tipe, kuota, masaKerja, aturPengajuan, batasPengajuan, statusAbsensi, jenisKelamin } = body;

    if (!nama || !tipe) {
      return NextResponse.json({ success: false, error: "Nama dan Tipe harus diisi" }, { status: 400 });
    }

    const data = await prisma.masterIzinCuti.create({
      data: {
        nama,
        tipe,
        kuota: kuota ?? 1,
        masaKerja: masaKerja ?? 1,
        aturPengajuan: aturPengajuan ?? 0,
        batasPengajuan: batasPengajuan ?? 1,
        statusAbsensi: statusAbsensi || "H",
        jenisKelamin: jenisKelamin || "semua",
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal membuat master izin cuti" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nama, tipe, kuota, masaKerja, aturPengajuan, batasPengajuan, statusAbsensi, jenisKelamin } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.masterIzinCuti.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    const data = await prisma.masterIzinCuti.update({
      where: { id },
      data: {
        ...(nama !== undefined && { nama }),
        ...(tipe !== undefined && { tipe }),
        ...(kuota !== undefined && { kuota }),
        ...(masaKerja !== undefined && { masaKerja }),
        ...(aturPengajuan !== undefined && { aturPengajuan }),
        ...(batasPengajuan !== undefined && { batasPengajuan }),
        ...(statusAbsensi !== undefined && { statusAbsensi }),
        ...(jenisKelamin !== undefined && { jenisKelamin }),
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal mengupdate master izin cuti" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.masterIzinCuti.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    await prisma.masterIzinCuti.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal menghapus master izin cuti" }, { status: 500 });
  }
}
