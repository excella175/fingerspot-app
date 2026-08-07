import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const users = await prisma.userInfo.findMany({
      orderBy: { pin: "asc" },
      include: { kantor: { select: { nama: true } }, jabatan: { select: { nama: true } } },
    });

    const rows = users.map((u) => ({
      PIN: u.pin,
      Nama: u.name,
      Kantor: u.kantor?.nama || "",
      Jabatan: u.jabatan?.nama || "",
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
      { wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
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

async function parseFile(file: File) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws);
  return rows;
}

// Get existing pins + kantor/jabatan lookup tables
async function buildLookup() {
  const existingPins = new Set((await prisma.userInfo.findMany({ select: { pin: true } })).map((u) => u.pin));
  const kantors = await prisma.kantor.findMany({ include: { jabatans: true } });
  const kantorByName = new Map(kantors.map((k) => [k.nama.toLowerCase(), k]));
  return { existingPins, kantorByName };
}

// Validate a single row against lookup. Returns { valid, errors[], warnings[], kantorId, jabatanId }
function validateRow(row: any, lookup: Awaited<ReturnType<typeof buildLookup>>) {
  const pin = String(row.PIN ?? row.pin ?? "").trim();
  const name = String(row.Nama ?? row.nama ?? row.name ?? "").trim();
  const kantorName = String(row.Kantor ?? row.kantor ?? "").trim();
  const jabatanName = String(row.Jabatan ?? row.jabatan ?? "").trim();

  const errors: string[] = [];
  const warnings: string[] = [];
  let kantorId: string | null = null;
  let jabatanId: string | null = null;

  if (!pin) {
    errors.push("PIN wajib diisi");
  } else if (lookup.existingPins.has(pin)) {
    errors.push(`PIN ${pin} sudah ada di database`);
  }

  if (kantorName) {
    const kantor = lookup.kantorByName.get(kantorName.toLowerCase());
    if (!kantor) {
      warnings.push(`Kantor "${kantorName}" tidak ditemukan, diabaikan`);
    } else {
      kantorId = kantor.id;
      if (jabatanName) {
        const jabatan = kantor.jabatans.find((j) => j.nama.toLowerCase() === jabatanName.toLowerCase());
        if (!jabatan) {
          warnings.push(`Jabatan "${jabatanName}" tidak ada di kantor "${kantor.nama}", diabaikan`);
        } else {
          jabatanId = jabatan.id;
        }
      }
    }
  } else if (jabatanName) {
    warnings.push(`Jabatan "${jabatanName}" diabaikan karena kantor kosong`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    pin,
    name,
    kantorName,
    jabatanName,
    kantorId,
    jabatanId,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "File Excel tidak ditemukan" }, { status: 400 });
    }

    const rows = await parseFile(file);
    const lookup = await buildLookup();
    const validated = rows.map((row) => validateRow(row, lookup));

    let created = 0;
    let skipped = 0;

    for (const v of validated) {
      if (!v.valid) { skipped++; continue; }
      await prisma.userInfo.create({
        data: {
          pin: v.pin,
          name: v.name || `User ${v.pin}`,
          privilege: 1,
          finger: 0,
          face: 0,
          rfid: 0,
          vein: 0,
          kantorId: v.kantorId,
          jabatanId: v.jabatanId,
        },
      });
      created++;
    }

    const withWarnings = validated.filter((v) => v.valid && v.warnings.length > 0).length;

    return NextResponse.json({
      success: true,
      message: `Import selesai: ${created} tersimpan, ${skipped} dilewati (${withWarnings} dengan peringatan)`,
      created,
      skipped,
      withWarnings,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
