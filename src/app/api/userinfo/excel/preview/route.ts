import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

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

    const existingPins = new Set(
      (await prisma.userInfo.findMany({ select: { pin: true } })).map((u) => u.pin)
    );
    const kantors = await prisma.kantor.findMany({ include: { jabatans: true } });
    const kantorByName = new Map(kantors.map((k) => [k.nama.toLowerCase(), k]));

    const previewRows = rows.map((row, idx) => {
      const pin = String(row.PIN ?? row.pin ?? "").trim();
      const name = String(row.Nama ?? row.nama ?? row.name ?? "").trim();
      const kantorName = String(row.Kantor ?? row.kantor ?? "").trim();
      const jabatanName = String(row.Jabatan ?? row.jabatan ?? "").trim();

      const errors: string[] = [];
      const warnings: string[] = [];
      let kantorFound = false;
      let jabatanFound = false;

      if (!pin) {
        errors.push("PIN wajib diisi");
      } else if (existingPins.has(pin)) {
        errors.push(`PIN ${pin} sudah ada di database`);
      }

      if (kantorName) {
        const kantor = kantorByName.get(kantorName.toLowerCase());
        if (!kantor) {
          warnings.push(`Kantor "${kantorName}" tidak ditemukan — kantor/jabatan diabaikan`);
        } else {
          kantorFound = true;
          if (jabatanName) {
            const jabatan = kantor.jabatans.find((j) => j.nama.toLowerCase() === jabatanName.toLowerCase());
            if (!jabatan) {
              warnings.push(`Jabatan "${jabatanName}" tidak ada di kantor "${kantor.nama}" — jabatan diabaikan`);
            } else {
              jabatanFound = true;
            }
          }
        }
      } else if (jabatanName) {
        warnings.push(`Kantor kosong — jabatan "${jabatanName}" diabaikan`);
      }

      return {
        rowIndex: idx + 2,
        pin,
        name: name || "(kosong)",
        kantorName: kantorName || "-",
        jabatanName: jabatanName || "-",
        valid: errors.length === 0,
        errors,
        warnings,
        kantorFound,
        jabatanFound,
      };
    });

    const validCount = previewRows.filter((r) => r.valid).length;
    const errorCount = previewRows.length - validCount;
    const warningCount = previewRows.filter((r) => r.warnings.length > 0).length;

    return NextResponse.json({
      success: true,
      total: previewRows.length,
      valid: validCount,
      errors: errorCount,
      warnings: warningCount,
      rows: previewRows,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
