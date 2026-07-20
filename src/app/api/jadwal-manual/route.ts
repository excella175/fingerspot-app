import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "");
    const year = parseInt(searchParams.get("year") || "");
    const employeePin = searchParams.get("employeePin") || "";

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const where: any = {
      date: { gte: startDate, lte: endDate },
    };

    if (employeePin) where.employeePin = employeePin;

    const data = await prisma.jadwalManual.findMany({
      where,
      orderBy: [{ employeePin: "asc" }, { date: "asc" }],
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Gagal mengambil jadwal manual" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "batch") {
      const rows = body.data || [];
      let success = 0;
      for (const row of rows) {
        try {
          await prisma.jadwalManual.upsert({
            where: {
              employeePin_date: {
                employeePin: row.employeePin,
                date: new Date(row.date),
              },
            },
            update: {
              jamKerjaKode: row.jamKerjaKode,
              startTime: row.startTime || null,
              endTime: row.endTime || null,
            },
            create: {
              employeePin: row.employeePin,
              date: new Date(row.date),
              jamKerjaKode: row.jamKerjaKode,
              startTime: row.startTime || null,
              endTime: row.endTime || null,
            },
          });
          success++;
        } catch { }
      }
      return NextResponse.json({ success: true, count: success });
    }

    const { employeePin, date, jamKerjaKode, startTime, endTime } = body;

    if (!employeePin || !date || !jamKerjaKode) {
      return NextResponse.json({ success: false, error: "employeePin, date, jamKerjaKode harus diisi" }, { status: 400 });
    }

    const existing = await prisma.jadwalManual.findUnique({
      where: { employeePin_date: { employeePin, date: new Date(date) } },
    });

    if (existing) {
      const data = await prisma.jadwalManual.update({
        where: { id: existing.id },
        data: { jamKerjaKode, startTime: startTime || null, endTime: endTime || null },
      });
      return NextResponse.json({ success: true, data });
    }

    const data = await prisma.jadwalManual.create({
      data: { employeePin, date: new Date(date), jamKerjaKode, startTime: startTime || null, endTime: endTime || null },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal menyimpan jadwal manual" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await request.json();
    const { jamKerjaKode, startTime, endTime } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.jadwalManual.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Jadwal manual tidak ditemukan" }, { status: 404 });
    }

    const data = await prisma.jadwalManual.update({
      where: { id },
      data: {
        ...(jamKerjaKode !== undefined && { jamKerjaKode }),
        ...(startTime !== undefined && { startTime: startTime || null }),
        ...(endTime !== undefined && { endTime: endTime || null }),
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal mengupdate jadwal manual" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID harus diisi" }, { status: 400 });
    }

    const existing = await prisma.jadwalManual.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Jadwal manual tidak ditemukan" }, { status: 404 });
    }

    await prisma.jadwalManual.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal menghapus jadwal manual" }, { status: 500 });
  }
}
