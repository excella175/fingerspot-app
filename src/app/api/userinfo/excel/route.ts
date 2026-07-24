import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const users = await prisma.userInfo.findMany({ orderBy: { pin: "asc" } });

    const rows = users.map((u) => ({
      PIN: u.pin,
      Nama: u.name,
      Privilege: u.privilege,
      Password: u.password || "",
      RFID: u.rfid || "",
      Fingerprint: u.finger ?? 0,
      Face: u.face ?? 0,
      Vein: u.vein ?? 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 10 }, { wch: 30 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Data User");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="data-user-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "File Excel tidak ditemukan" }, { status: 400 });
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const pin = String(row.PIN ?? row.pin ?? "").trim();
      const name = String(row.Nama ?? row.Nama ?? row.name ?? "").trim();
      if (!pin || !name) { skipped++; continue; }

      const existing = await prisma.userInfo.findUnique({ where: { pin } });
      if (existing) {
        await prisma.userInfo.update({
          where: { pin },
          data: {
            name,
            privilege: row.Privilege != null ? Number(row.Privilege) : existing.privilege,
            password: row.Password ? String(row.Password) : existing.password,
            rfid: row.RFID ? Number(row.RFID) : existing.rfid,
          },
        });
        updated++;
      } else {
        await prisma.userInfo.create({
          data: {
            pin,
            name: name || `User ${pin}`,
            privilege: row.Privilege ? Number(row.Privilege) : 1,
            password: row.Password ? String(row.Password) : null,
            rfid: row.RFID ? Number(row.RFID) : 0,
            finger: 0,
            face: 0,
            vein: 0,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import selesai: ${created} baru, ${updated} diupdate, ${skipped} dilewati`,
      created,
      updated,
      skipped,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
