import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.kantor.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        jabatans: {
          orderBy: { createdAt: "asc" },
          include: { _count: { select: { users: true } } },
        },
        _count: { select: { users: true } },
      },
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nama, alamat, jabatans } = await request.json();
    const namaClean = String(nama || "").trim();
    if (!namaClean) {
      return NextResponse.json({ success: false, error: "Nama kantor wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.kantor.findUnique({ where: { nama: namaClean } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Kantor "${namaClean}" sudah ada` }, { status: 400 });
    }

    const jabatanNames = Array.isArray(jabatans)
      ? [...new Set(jabatans.map((j: any) => String(j).trim()).filter(Boolean))]
      : [];

    const kantor = await prisma.kantor.create({
      data: {
        nama: namaClean,
        alamat: alamat ? String(alamat).trim() : null,
        jabatans: {
          create: jabatanNames.map((j) => ({ nama: j })),
        },
      },
      include: { jabatans: true },
    });

    return NextResponse.json({ success: true, data: kantor });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, nama, alamat, jabatans } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: "ID wajib" }, { status: 400 });

    const kantor = await prisma.kantor.findUnique({ where: { id }, include: { jabatans: { include: { _count: { select: { users: true } } } } } });
    if (!kantor) return NextResponse.json({ success: false, error: "Kantor tidak ditemukan" }, { status: 404 });

    const namaClean = String(nama || "").trim();
    if (!namaClean) return NextResponse.json({ success: false, error: "Nama kantor wajib diisi" }, { status: 400 });

    const dup = await prisma.kantor.findFirst({ where: { nama: namaClean, id: { not: id } } });
    if (dup) return NextResponse.json({ success: false, error: `Kantor "${namaClean}" sudah ada` }, { status: 400 });

    const newNames = Array.isArray(jabatans)
      ? [...new Set(jabatans.map((j: any) => String(j).trim()).filter(Boolean))]
      : [];

    const existingNames = kantor.jabatans.map((j) => j.nama);
    const removedNames = existingNames.filter((n) => !newNames.includes(n));

    // Block if removed jabatan still has users
    const blockedJabatan = kantor.jabatans.filter(
      (j) => removedNames.includes(j.nama) && j._count.users > 0
    );
    if (blockedJabatan.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Jabatan masih dipakai user: ${blockedJabatan.map((j) => `"${j.nama}" (${j._count.users} user)`).join(", ")}. Pindahkan dulu usernya.`,
        blocked: true,
        blockedJabatans: blockedJabatan.map((j) => ({ id: j.id, nama: j.nama, userCount: j._count.users })),
      }, { status: 400 });
    }

    // Delete removed jabatans (no users)
    for (const j of kantor.jabatans) {
      if (removedNames.includes(j.nama)) {
        await prisma.jabatan.delete({ where: { id: j.id } });
      }
    }

    // Create new jabatans
    const addedNames = newNames.filter((n) => !existingNames.includes(n));
    if (addedNames.length > 0) {
      await prisma.jabatan.createMany({
        data: addedNames.map((n) => ({ nama: n, kantorId: id })),
      });
    }

    const updated = await prisma.kantor.update({
      where: { id },
      data: { nama: namaClean, alamat: alamat ? String(alamat).trim() : null },
      include: { jabatans: true },
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

    const kantor = await prisma.kantor.findUnique({
      where: { id },
      include: {
        jabatans: { include: { users: { select: { id: true, pin: true, name: true, jabatanId: true } } } },
        users: { select: { id: true, pin: true, name: true } },
      },
    });
    if (!kantor) return NextResponse.json({ success: false, error: "Kantor tidak ditemukan" }, { status: 404 });

    // Users linked directly to kantor (kantorId) or via jabatans
    const linkedUsers = [
      ...kantor.jabatans.flatMap((j) =>
        j.users.map((u) => ({ ...u, jabatanNama: j.nama }))
      ),
      ...kantor.users.map((u) => ({ ...u, jabatanNama: "" })),
    ];

    const uniqueUsers = new Map<string, typeof linkedUsers[number]>();
    for (const u of linkedUsers) {
      if (!uniqueUsers.has(u.id)) uniqueUsers.set(u.id, u);
    }

    if (uniqueUsers.size > 0) {
      return NextResponse.json({
        success: false,
        blocked: true,
        error: `${uniqueUsers.size} user masih terikat di kantor "${kantor.nama}"`,
        kantorNama: kantor.nama,
        users: Array.from(uniqueUsers.values()),
      }, { status: 400 });
    }

    await prisma.kantor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
