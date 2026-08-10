import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const pin = searchParams.get("pin") || "";
    const name = searchParams.get("name") || "";
    const kantorId = searchParams.get("kantorId") || "";
    const jabatanId = searchParams.get("jabatanId") || "";
    const deviceCloudId = searchParams.get("deviceCloudId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const where: any = {};
    if (pin) where.employeePin = pin;

    // Filter karyawan (nama / kantor / jabatan) lalu batasi ke PIN yang cocok
    if (name || kantorId || jabatanId) {
      const empWhere: any = {};
      if (name) empWhere.name = { contains: name, mode: "insensitive" };
      if (kantorId) empWhere.kantorId = kantorId;
      if (jabatanId) empWhere.jabatanId = jabatanId;
      const employees = await prisma.userInfo.findMany({
        where: empWhere,
        select: { pin: true },
      });
      const pins = employees.map((e) => e.pin);
      if (pins.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit });
      }
      where.employeePin = pin ? pin : { in: pins };
    }

    if (deviceCloudId) where.deviceCloudId = deviceCloudId;
    if (startDate && endDate) {
      // Fingerspot payload scan_date biasanya tanpa timezone (contoh: "2026-06-29 16:41:10").
      // Di webhook kita normalisasi menjadi +07:00, jadi filter di sini harus konsisten (+07:00).
      where.scanTime = {
        gte: new Date(`${startDate}T00:00:00+07:00`),
        lte: new Date(`${endDate}T23:59:59+07:00`),
      };
    }

    const [data, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        orderBy: { scanTime: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.attendanceLog.count({ where }),
    ]);

    // Enrich dengan nama / kantor / jabatan karyawan
    const pinsOnPage = [...new Set(data.map((l) => l.employeePin))];
    const emps = pinsOnPage.length
      ? await prisma.userInfo.findMany({
          where: { pin: { in: pinsOnPage } },
          select: {
            pin: true,
            name: true,
            kantor: { select: { nama: true } },
            jabatan: { select: { nama: true } },
          },
        })
      : [];
    const empMap = new Map(emps.map((e) => [e.pin, e]));

    const enriched = data.map((l) => {
      const e = empMap.get(l.employeePin);
      return {
        ...l,
        employeeName: e?.name || null,
        employeeKantor: e?.kantor?.nama || null,
        employeeJabatan: e?.jabatan?.nama || null,
      };
    });

    return NextResponse.json({ data: enriched, total, page, limit });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch attendance logs" },
      { status: 500 },
    );
  }
}

