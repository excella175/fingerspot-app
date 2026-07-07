import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalAttlog, todayAttlog, totalUsers, totalDevices, recentApiLogs, recentWebhookLogs] =
      await Promise.all([
        prisma.attendanceLog.count(),
        prisma.attendanceLog.count({
          where: { createdAt: { gte: todayStart } },
        }),
        prisma.userInfo.count(),
        prisma.pinList.groupBy({
          by: ["deviceCloudId"],
        }),
        prisma.apiLog.count(),
        prisma.webhookLog.count(),
      ]);

    return NextResponse.json({
      totalAttlog,
      todayAttlog,
      totalUsers,
      totalDevices: totalDevices.length,
      totalApiLogs: recentApiLogs,
      totalWebhookLogs: recentWebhookLogs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
