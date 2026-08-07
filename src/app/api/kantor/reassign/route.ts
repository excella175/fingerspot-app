import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reassign users before deleting a kantor
// body: { kantorId, reassignments: { [userId]: newJabatanId | null } }
export async function POST(request: NextRequest) {
  try {
    const { kantorId, reassignments } = await request.json();
    if (!kantorId || !reassignments) {
      return NextResponse.json({ success: false, error: "kantorId dan reassignments wajib" }, { status: 400 });
    }

    const kantor = await prisma.kantor.findUnique({ where: { id: kantorId }, include: { jabatans: true } });
    if (!kantor) return NextResponse.json({ success: false, error: "Kantor tidak ditemukan" }, { status: 404 });

    // Validate jabatan ids and resolve their kantor
    const jabatanIds = Object.values(reassignments).filter(Boolean) as string[];
    const jabatans = await prisma.jabatan.findMany({
      where: { id: { in: jabatanIds } },
      select: { id: true, kantorId: true },
    });
    const jabatanMap = new Map(jabatans.map((j) => [j.id, j.kantorId]));

    // Do NOT allow reassigning to a jabatan of the kantor being deleted
    const reassignMap = reassignments as Record<string, string | null>;
    for (const [userId, newJabatanId] of Object.entries(reassignMap)) {
      if (newJabatanId && jabatanMap.has(newJabatanId) && jabatanMap.get(newJabatanId) === kantorId) {
        return NextResponse.json({
          success: false,
          error: "Tidak bisa memindahkan user ke jabatan di kantor yang sama",
        }, { status: 400 });
      }
    }

    const userIds = Object.keys(reassignMap);
    if (userIds.length > 0) {
      for (const userId of userIds) {
        const newJabatanId = reassignMap[userId] || null;
        await prisma.userInfo.update({
          where: { id: userId },
          data: {
            jabatanId: newJabatanId,
            kantorId: newJabatanId ? (jabatanMap.get(newJabatanId) || null) : null,
          },
        });
      }
    }

    return NextResponse.json({ success: true, moved: userIds.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
