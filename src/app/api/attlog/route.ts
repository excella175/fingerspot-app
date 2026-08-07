import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const pin = searchParams.get("pin") || "";
    const deviceCloudId = searchParams.get("deviceCloudId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const where: any = {};
    if (pin) where.employeePin = pin;
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

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch attendance logs" },
      { status: 500 },
    );
  }
}
