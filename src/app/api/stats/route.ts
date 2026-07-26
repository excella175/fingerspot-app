import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalAttlog,
      todayAttlog,
      totalUsers,
      totalDevices,
      totalApiLogs,
      totalWebhookLogs,
    ] = await Promise.all([
      prisma.attendanceLog.count(),
      prisma.attendanceLog.count({ where: { scanTime: { gte: todayStart } } }),
      prisma.userInfo.count(),
      prisma.pinList.groupBy({ by: ["deviceCloudId"] }),
      prisma.apiLog.count(),
      prisma.webhookLog.count(),
    ]);

    // Attendance by day (last 7 days)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysStart = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate());

    const recentLogs = await prisma.attendanceLog.findMany({
      where: { scanTime: { gte: sevenDaysStart } },
      select: { scanTime: true, statusScan: true },
    });

    const attendanceByDay: { day: string; date: string; hadir: number; telat: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = DAYS[d.getDay()];
      const logsOnDay = recentLogs.filter((l) => l.scanTime.toISOString().startsWith(dateStr));
      const ins = logsOnDay.filter((l) => l.statusScan === 0 || l.statusScan === null);
      // Count unique pins with IN scan
      const uniqueInPins = new Set(ins.map((l) => l.scanTime.toISOString())).size;
      attendanceByDay.push({
        day: dayLabel.slice(0, 3),
        date: dateStr,
        hadir: ins.length,
        telat: 0,
      });
    }

    // Today's status breakdown
    const todayIns = await prisma.attendanceLog.findMany({
      where: { scanTime: { gte: todayStart }, statusScan: 0 },
      select: { employeePin: true },
    });
    const todayUniquePins = new Set(todayIns.map((l) => l.employeePin));
    const totalEmployees = totalUsers || 1;
    const hadirCount = todayUniquePins.size;
    const alphaCount = Math.max(0, totalEmployees - hadirCount);

    return NextResponse.json({
      totalAttlog,
      todayAttlog,
      totalUsers,
      totalDevices: totalDevices.length,
      totalApiLogs,
      totalWebhookLogs,
      attendanceByDay,
      todayStatus: [
        { label: "Hadir", value: hadirCount, color: "#22c55e" },
        { label: "Alpha", value: alphaCount, color: "#ef4444" },
      ],
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
