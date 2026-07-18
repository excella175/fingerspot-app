import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { pin: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.userInfo.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.userInfo.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { pin, name } = await request.json();
    if (!pin || !name) {
      return NextResponse.json(
        { success: false, error: "PIN dan nama harus diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.userInfo.findUnique({ where: { pin } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.userInfo.update({
      where: { pin },
      data: { name: String(name) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Gagal mengupdate user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");

    if (!pin) {
      return NextResponse.json(
        { success: false, error: "PIN harus diisi" },
        { status: 400 }
      );
    }

    const existing = await prisma.userInfo.findUnique({ where: { pin } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.userInfo.delete({ where: { pin } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Gagal menghapus user" },
      { status: 500 }
    );
  }
}
