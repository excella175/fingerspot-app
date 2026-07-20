import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.jadwalAuto.findMany({
      include: { days: true, employees: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil jadwal auto" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, days, employees } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama jadwal harus diisi" }, { status: 400 });
    }

    const jadwal = await prisma.jadwalAuto.create({
      data: {
        name,
        days: {
          create: (days || []).map((d: any) => ({
            dayOfWeek: d.dayOfWeek,
            jamKerjaKode: d.jamKerjaKode,
          })),
        },
        employees: {
          create: (employees || []).map((pin: string) => ({
            employeePin: pin,
          })),
        },
      },
      include: { days: true, employees: true },
    });

    return NextResponse.json({ success: true, data: jadwal });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal membuat jadwal auto" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json();
    const { name, days, employees } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.jadwalAuto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Jadwal tidak ditemukan" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.jadwalAutoDay.deleteMany({ where: { jadwalId: id } }),
      prisma.jadwalAutoEmployee.deleteMany({ where: { jadwalId: id } }),
      prisma.jadwalAuto.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          days: {
            create: (days || []).map((d: any) => ({
              dayOfWeek: d.dayOfWeek,
              jamKerjaKode: d.jamKerjaKode,
            })),
          },
          employees: {
            create: (employees || []).map((pin: string) => ({
              employeePin: pin,
            })),
          },
        },
      }),
    ]);

    const updated = await prisma.jadwalAuto.findUnique({
      where: { id },
      include: { days: true, employees: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal mengupdate jadwal auto" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.jadwalAuto.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Jadwal tidak ditemukan" }, { status: 404 });
    }

    await prisma.jadwalAuto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal menghapus jadwal auto" }, { status: 500 });
  }
}
