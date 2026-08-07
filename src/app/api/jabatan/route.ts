import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const { id, nama } = await request.json();
    if (!id || !nama) {
      return NextResponse.json({ success: false, error: "ID dan nama wajib" }, { status: 400 });
    }

    const jabatan = await prisma.jabatan.findUnique({ where: { id } });
    if (!jabatan) {
      return NextResponse.json({ success: false, error: "Jabatan tidak ditemukan" }, { status: 404 });
    }

    const namaClean = String(nama).trim();
    const dup = await prisma.jabatan.findFirst({
      where: { kantorId: jabatan.kantorId, nama: namaClean, id: { not: id } },
    });
    if (dup) {
      return NextResponse.json({ success: false, error: `Jabatan "${namaClean}" sudah ada di kantor ini` }, { status: 400 });
    }

    const updated = await prisma.jabatan.update({
      where: { id },
      data: { nama: namaClean },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "ID wajib" }, { status: 400 });

    const jabatan = await prisma.jabatan.findUnique({
      where: { id },
      include: { _count: { select: { users: true } }, kantor: { select: { nama: true } } },
    });
    if (!jabatan) {
      return NextResponse.json({ success: false, error: "Jabatan tidak ditemukan" }, { status: 404 });
    }

    if (jabatan._count.users > 0) {
      return NextResponse.json({
        success: false,
        blocked: true,
        error: `Jabatan "${jabatan.nama}" masih dipakai ${jabatan._count.users} user. Pindahkan dulu usernya lewat edit user.`,
      }, { status: 400 });
    }

    await prisma.jabatan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
