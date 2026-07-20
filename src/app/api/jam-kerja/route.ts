import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.jamKerja.findMany({ orderBy: { kode: "asc" } });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil jam kerja" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kode, name, type, aturanKode, hariKerja, startTime, endTime, istirahatAktif, istirahatStart, istirahatEnd, lemburAktif, lemburAwalMin, lemburAwalMax, lemburAkhirMin, lemburAkhirMax, maxDuration, cutoffStart, cutoffEnd, lemburMin, lemburMax } = body;

    if (!kode || !name || !type || !aturanKode) {
      return NextResponse.json({ success: false, error: "Kode, nama, type, dan aturan harus diisi" }, { status: 400 });
    }

    const data = await prisma.jamKerja.create({
      data: { kode, name, type, aturanKode, hariKerja: hariKerja ?? 5, startTime: startTime || null, endTime: endTime || null, istirahatAktif: istirahatAktif ?? false, istirahatStart: istirahatStart || null, istirahatEnd: istirahatEnd || null, lemburAktif: lemburAktif ?? false, lemburAwalMin: lemburAwalMin ?? null, lemburAwalMax: lemburAwalMax ?? null, lemburAkhirMin: lemburAkhirMin ?? null, lemburAkhirMax: lemburAkhirMax ?? null, maxDuration: maxDuration ?? null, cutoffStart: cutoffStart || null, cutoffEnd: cutoffEnd || null, lemburMin: lemburMin ?? null, lemburMax: lemburMax ?? null },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal membuat jam kerja" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, kode, name, type, aturanKode, hariKerja, startTime, endTime, istirahatAktif, istirahatStart, istirahatEnd, lemburAktif, lemburAwalMin, lemburAwalMax, lemburAkhirMin, lemburAkhirMax, maxDuration, cutoffStart, cutoffEnd, lemburMin, lemburMax } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.jamKerja.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Jam kerja tidak ditemukan" }, { status: 404 });
    }

    const data = await prisma.jamKerja.update({
      where: { id },
      data: {
        ...(kode !== undefined && { kode }),
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(aturanKode !== undefined && { aturanKode }),
        ...(hariKerja !== undefined && { hariKerja }),
        ...(startTime !== undefined && { startTime: startTime || null }),
        ...(endTime !== undefined && { endTime: endTime || null }),
        ...(istirahatAktif !== undefined && { istirahatAktif }),
        ...(istirahatStart !== undefined && { istirahatStart: istirahatStart || null }),
        ...(istirahatEnd !== undefined && { istirahatEnd: istirahatEnd || null }),
        ...(lemburAktif !== undefined && { lemburAktif }),
        ...(lemburAwalMin !== undefined && { lemburAwalMin: lemburAwalMin ?? null }),
        ...(lemburAwalMax !== undefined && { lemburAwalMax: lemburAwalMax ?? null }),
        ...(lemburAkhirMin !== undefined && { lemburAkhirMin: lemburAkhirMin ?? null }),
        ...(lemburAkhirMax !== undefined && { lemburAkhirMax: lemburAkhirMax ?? null }),
        ...(maxDuration !== undefined && { maxDuration: maxDuration ?? null }),
        ...(cutoffStart !== undefined && { cutoffStart: cutoffStart || null }),
        ...(cutoffEnd !== undefined && { cutoffEnd: cutoffEnd || null }),
        ...(lemburMin !== undefined && { lemburMin: lemburMin ?? null }),
        ...(lemburMax !== undefined && { lemburMax: lemburMax ?? null }),
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal mengupdate jam kerja" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.jamKerja.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Jam kerja tidak ditemukan" }, { status: 404 });
    }

    await prisma.jamKerja.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal menghapus jam kerja" }, { status: 500 });
  }
}
