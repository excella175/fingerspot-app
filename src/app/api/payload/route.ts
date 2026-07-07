import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";
    const source = searchParams.get("source") || "api"; // "api" or "webhook"

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    let data;
    if (source === "webhook") {
      data = await prisma.webhookLog.findUnique({ where: { id } });
    } else {
      data = await prisma.apiLog.findUnique({ where: { id } });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch payload" },
      { status: 500 }
    );
  }
}
