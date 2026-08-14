import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAttendance, computeDetail } from "@/lib/reports";

async function handleGenerate(searchParams: URLSearchParams) {
  const data = await computeAttendance(searchParams);

  for (const emp of data.report) {
    for (const day of emp.days) {
      const date = new Date(day.date + "T00:00:00+07:00");
      try {
        await prisma.attendanceReport.upsert({
          where: { employeePin_date: { employeePin: emp.pin, date } },
          update: { status: day.status },
          create: { employeePin: emp.pin, date, status: day.status },
        });
      } catch { /* skip dupes */ }
    }
  }
  return NextResponse.json({ success: true, message: "Laporan kehadiran berhasil digenerate" });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const command = searchParams.get("command") || "detail";

    switch (command) {
      case "detail": {
        const data = await computeDetail(searchParams);
        return NextResponse.json({ success: true, ...data });
      }
      case "attendance": {
        const data = await computeAttendance(searchParams);
        return NextResponse.json({ success: true, ...data });
      }
      case "generate": return handleGenerate(searchParams);
      default: return NextResponse.json({ success: false, error: "Unknown command" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
