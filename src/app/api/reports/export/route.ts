import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeAttendance, computeDetail } from "@/lib/reports";

const INDIGO: [number, number, number] = [79, 70, 229];
const INDIGO_DARK: [number, number, number] = [49, 46, 129];
const INK: [number, number, number] = [15, 23, 42];
const GRAY_LINE: [number, number, number] = [226, 232, 240];

// Status → (bg fill argb, text color argb) for Excel; (bg rgb, text rgb) for PDF
const STATUS_FILLS: Record<string, { bg: string; fg: string }> = {
  H: { bg: "DCFCE7", fg: "166534" },
  A: { bg: "FEE2E2", fg: "991B1B" },
  I: { bg: "FEF3C7", fg: "92400E" },
  S: { bg: "DBEAFE", fg: "1E40AF" },
  C: { bg: "F3E8FF", fg: "6B21A8" },
  TL: { bg: "FFEDD5", fg: "9A3412" },
  D: { bg: "CCFBF1", fg: "115E59" },
  L: { bg: "F1F5F9", fg: "64748B" },
};

const STATUS_PDF: Record<string, { fill: [number, number, number]; text: [number, number, number] }> = {
  H: { fill: [220, 252, 231], text: [22, 101, 52] },
  A: { fill: [254, 226, 226], text: [153, 27, 27] },
  I: { fill: [254, 243, 199], text: [146, 64, 14] },
  S: { fill: [219, 234, 254], text: [30, 64, 175] },
  C: { fill: [243, 232, 255], text: [107, 33, 168] },
  TL: { fill: [255, 237, 213], text: [154, 52, 18] },
  D: { fill: [204, 251, 241], text: [17, 94, 89] },
  L: { fill: [241, 245, 249], text: [100, 116, 139] },
};

function hm(min: number | null | undefined): string {
  if (min == null) return "-";
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function jm(min: number | null | undefined): string {
  const m = min ?? 0;
  return `${Math.floor(m / 60)}j ${m % 60}m`;
}

function isoToHm(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isHadir(status: string) {
  return status === "H" || status === "TL" || status === "PL";
}

interface ReportEntry {
  employeePin: string;
  employeeName: string;
  employeeKantor: string;
  employeeJabatan: string;
  date: string;
  dayName: string;
  scanIn: string | null;
  scanOut: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  workDurationMinutes: number | null;
  istirahatMinutes: number | null;
  overtimeStartMinutes: number | null;
  overtimeEndMinutes: number | null;
  note: string;
}

function blockTotals(rows: ReportEntry[]) {
  const t = { terlambat: 0, cepat: 0, kerja: 0, istirahat: 0, lemburAwal: 0, lemburAkhir: 0, lemburTotal: 0, hadir: 0 };
  for (const r of rows) {
    t.terlambat += r.lateMinutes ?? 0;
    t.cepat += r.earlyLeaveMinutes ?? 0;
    t.kerja += r.workDurationMinutes ?? 0;
    t.istirahat += r.istirahatMinutes ?? 0;
    t.lemburAwal += r.overtimeStartMinutes ?? 0;
    t.lemburAkhir += r.overtimeEndMinutes ?? 0;
    t.lemburTotal += r.overtimeMinutes ?? 0;
    if (isHadir(r.status)) t.hadir++;
  }
  return t;
}

// ---------- EXCEL: Laporan Kehadiran (matrix) ----------
async function buildAttendanceXlsx(params: URLSearchParams) {
  const { report, totalDays } = await computeAttendance(params);
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const daysCount = totalDays;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Fingerspot Presence Board";
  wb.created = new Date();
  const ws = wb.addWorksheet("Laporan Kehadiran", {
    views: [{ state: "frozen", xSplit: 5, ySplit: 4 }],
  });

  const totalCols = 5 + daysCount + 7; // No,ID,Nama,Kantor,Jabatan + days + H,A,I,S,C,TL,Total
  const lastColLetter = ws.getColumn(totalCols).letter;

  // Title
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "LAPORAN KEHADIRAN";
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
  ws.getRow(1).height = 30;

  // Period
  ws.mergeCells(2, 1, 2, totalCols);
  const periodCell = ws.getCell(2, 1);
  periodCell.value = `Periode: ${from} s/d ${to}`;
  periodCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "3730A3" } };
  periodCell.alignment = { horizontal: "center", vertical: "middle" };
  periodCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EEF2FF" } };
  ws.getRow(2).height = 22;

  // Blank spacer
  ws.getRow(3).height = 6;

  // Header
  const headerRow = ws.getRow(4);
  const headerLabels: (string | number)[] = ["No", "ID", "Nama Karyawan", "Kantor", "Jabatan"];
  for (let d = 1; d <= daysCount; d++) headerLabels.push(d);
  headerLabels.push("H", "A", "I", "S", "C", "TL", "Total Hari");

  headerRow.height = 26;
  headerLabels.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4338CA" } };
    cell.border = {
      top: { style: "thin", color: { argb: "312E81" } },
      bottom: { style: "thin", color: { argb: "312E81" } },
      left: { style: "thin", color: { argb: "312E81" } },
      right: { style: "thin", color: { argb: "312E81" } },
    };
  });

  // Column widths
  const colWidths: number[] = [5, 10, 26, 20, 18];
  for (let i = 0; i < daysCount; i++) colWidths.push(5);
  colWidths.push(6, 6, 6, 6, 6, 6, 11);
  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Data rows
  report.forEach((emp: any, idx: number) => {
    const row = ws.getRow(5 + idx);
    row.height = 18;
    const statusByDay: Record<number, string> = {};
    for (const day of emp.days) statusByDay[day.day] = day.status;

    const values: (string | number)[] = [
      idx + 1,
      emp.pin,
      emp.name,
      emp.kantor || "-",
      emp.jabatan || "-",
    ];
    for (let d = 1; d <= daysCount; d++) {
      const s = statusByDay[d];
      values.push(s || "");
    }
    values.push(emp.totals.H, emp.totals.A, emp.totals.I, emp.totals.S, emp.totals.C, emp.totals.TL, emp.totals.total);

    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.border = {
        top: { style: "thin", color: { argb: "E2E8F0" } },
        bottom: { style: "thin", color: { argb: "E2E8F0" } },
        left: { style: "thin", color: { argb: "E2E8F0" } },
        right: { style: "thin", color: { argb: "E2E8F0" } },
      };
      if (i === 0) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Calibri", size: 10, color: { argb: "64748B" } };
      } else if (i === 1) {
        cell.font = { name: "Consolas", size: 9, color: { argb: "64748B" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (i === 2) {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: INK.map((c) => c.toString(16).padStart(2, "0")).join("") } };
        cell.alignment = { vertical: "middle" };
      } else if (i === 3 || i === 4) {
        cell.font = { name: "Calibri", size: 9, color: { argb: "475569" } };
        cell.alignment = { vertical: "middle" };
      } else if (i >= 5 && i < 5 + daysCount) {
        const status = String(v || "");
        cell.alignment = { horizontal: "center", vertical: "middle" };
        if (status && STATUS_FILLS[status]) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILLS[status].bg } };
          cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: STATUS_FILLS[status].fg } };
        } else {
          cell.font = { name: "Calibri", size: 9, color: { argb: "CBD5E1" } };
        }
      } else {
        const isTotalCol = i >= 5 + daysCount;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { name: "Calibri", size: 9, bold: isTotalCol, color: { argb: "334155" } };
      }
    });
  });

  // Zebra striping on empty status cells
  report.forEach((_: any, idx: number) => {
    if (idx % 2 === 1) {
      const row = ws.getRow(5 + idx);
      for (let d = 1; d <= daysCount; d++) {
        const cell = row.getCell(5 + d);
        if (!cell.fill || (cell.fill as any).fgColor?.argb === undefined) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
        }
      }
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ---------- EXCEL: Laporan Detail (per employee) ----------
async function buildDetailXlsx(params: URLSearchParams) {
  const { report } = await computeDetail(params);
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const blocks = new Map<string, ReportEntry[]>();
  for (const r of report) {
    if (!blocks.has(r.employeePin)) blocks.set(r.employeePin, []);
    blocks.get(r.employeePin)!.push(r);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Fingerspot Presence Board";
  wb.created = new Date();
  const ws = wb.addWorksheet("Laporan Detail", {
    views: [{ state: "frozen", ySplit: 4 }],
  });

  const totalCols = 15;
  const lastColLetter = ws.getColumn(totalCols).letter;

  // Title
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "LAPORAN DETAIL KEHADIRAN";
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, totalCols);
  const periodCell = ws.getCell(2, 1);
  periodCell.value = `Periode: ${from} s/d ${to}`;
  periodCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "3730A3" } };
  periodCell.alignment = { horizontal: "center", vertical: "middle" };
  periodCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EEF2FF" } };
  ws.getRow(2).height = 22;

  ws.getRow(3).height = 6;

  const colWidths = [22, 10, 8, 8, 10, 10, 11, 12, 14, 10, 11, 11, 11, 12, 24];
  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  let rowIndex = 4;

  for (const [pin, rows] of blocks) {
    const first = rows[0];
    const t = blockTotals(rows);

    // Employee header band
    ws.mergeCells(rowIndex, 1, rowIndex, totalCols);
    const empCell = ws.getCell(rowIndex, 1);
    empCell.value = `${first.employeeName}  •  ${pin}  •  ${first.employeeJabatan || "-"}  •  ${first.employeeKantor || "-"}`;
    empCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "1E1B4B" } };
    empCell.alignment = { horizontal: "left", vertical: "middle" };
    empCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E0E7FF" } };
    empCell.border = {
      top: { style: "thin", color: { argb: "A5B4FC" } },
      bottom: { style: "thin", color: { argb: "A5B4FC" } },
      left: { style: "thin", color: { argb: "A5B4FC" } },
      right: { style: "thin", color: { argb: "A5B4FC" } },
    };
    ws.getRow(rowIndex).height = 22;
    rowIndex++;

    // Column header — two rows
    const h1 = ws.getRow(rowIndex);
    const h2 = ws.getRow(rowIndex + 1);
    h1.height = 20;
    h2.height = 20;

    ws.mergeCells(rowIndex, 1, rowIndex + 1, 1); // Tanggal
    ws.mergeCells(rowIndex, 2, rowIndex, 4);     // Jam Kerja
    ws.mergeCells(rowIndex, 5, rowIndex, 6);     // Kehadiran
    for (let c = 7; c <= 15; c++) ws.mergeCells(rowIndex, c, rowIndex + 1, c);

    const h1Labels: { text: string; col: number; align: "center" }[] = [
      { text: "Tanggal", col: 1, align: "center" },
      { text: "Jam Kerja", col: 2, align: "center" },
      { text: "Kehadiran", col: 5, align: "center" },
      { text: "Terlambat", col: 7, align: "center" },
      { text: "Pulang Cepat", col: 8, align: "center" },
      { text: "Total Jam Kerja", col: 9, align: "center" },
      { text: "Istirahat", col: 10, align: "center" },
      { text: "Lembur Awal", col: 11, align: "center" },
      { text: "Lembur Akhir", col: 12, align: "center" },
      { text: "Total Lembur", col: 13, align: "center" },
      { text: "Masuk Kerja", col: 14, align: "center" },
      { text: "Keterangan", col: 15, align: "center" },
    ];
    const h2Labels: { text: string; col: number }[] = [
      { text: "", col: 1 },
      { text: "Masuk", col: 2 },
      { text: "Pulang", col: 3 },
      { text: "Durasi", col: 4 },
      { text: "Jam Masuk", col: 5 },
      { text: "Jam Pulang", col: 6 },
    ];

    for (const l of h1Labels) {
      const cell = h1.getCell(l.col);
      cell.value = l.text;
      cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { horizontal: l.align, vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4338CA" } };
      cell.border = { top: { style: "thin", color: { argb: "312E81" } }, bottom: { style: "thin", color: { argb: "312E81" } }, left: { style: "thin", color: { argb: "312E81" } }, right: { style: "thin", color: { argb: "312E81" } } };
    }
    for (const l of h2Labels) {
      const cell = h2.getCell(l.col);
      if (l.text) {
        cell.value = l.text;
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
        cell.border = { top: { style: "thin", color: { argb: "312E81" } }, bottom: { style: "thin", color: { argb: "312E81" } }, left: { style: "thin", color: { argb: "312E81" } }, right: { style: "thin", color: { argb: "312E81" } } };
      }
    }
    // Fill cells for h2 merged with h1 (cols 7-15) already covered by h1 merge
    rowIndex += 2;

    // Data rows
    rows.forEach((r, di) => {
      const row = ws.getRow(rowIndex);
      row.height = 18;
      const values: (string | number)[] = [
        `${r.dayName}, ${r.date}`,
        r.scheduledStart || "-",
        r.scheduledEnd || "-",
        hm(r.workDurationMinutes),
        isoToHm(r.scanIn),
        isoToHm(r.scanOut),
        r.lateMinutes != null ? hm(r.lateMinutes) : "-",
        r.earlyLeaveMinutes != null ? hm(r.earlyLeaveMinutes) : "-",
        hm(r.workDurationMinutes),
        hm(r.istirahatMinutes),
        r.overtimeStartMinutes != null ? hm(r.overtimeStartMinutes) : "-",
        r.overtimeEndMinutes != null ? hm(r.overtimeEndMinutes) : "-",
        r.overtimeMinutes != null ? hm(r.overtimeMinutes) : "-",
        isHadir(r.status) ? 1 : 0,
        r.note || "-",
      ];
      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v;
        cell.font = { name: "Calibri", size: 9, color: { argb: "334155" } };
        cell.alignment = { horizontal: i === 0 || i === 14 ? "left" : "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "E2E8F0" } },
          bottom: { style: "thin", color: { argb: "E2E8F0" } },
          left: { style: "thin", color: { argb: "E2E8F0" } },
          right: { style: "thin", color: { argb: "E2E8F0" } },
        };
        if (di % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } };
        }
      });
      rowIndex++;
    });

    // Total row
    const totRow = ws.getRow(rowIndex);
    totRow.height = 20;
    ws.mergeCells(rowIndex, 1, rowIndex, 6);
    const totLabel = totRow.getCell(1);
    totLabel.value = "TOTAL";
    totLabel.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFF" } };
    totLabel.alignment = { horizontal: "center", vertical: "middle" };
    totLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
    totLabel.border = { top: { style: "thin", color: { argb: "4338CA" } }, bottom: { style: "thin", color: { argb: "4338CA" } }, left: { style: "thin", color: { argb: "4338CA" } }, right: { style: "thin", color: { argb: "4338CA" } } };

    const totValues = ["", "", "", "", "", "", jm(t.terlambat), jm(t.cepat), jm(t.kerja), jm(t.istirahat), jm(t.lemburAwal), jm(t.lemburAkhir), jm(t.lemburTotal), `${t.hadir} hari`, ""];
    totValues.forEach((v, i) => {
      if (i === 0) return; // merged label handled above
      const cell = totRow.getCell(i + 1);
      cell.value = v;
      cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4F46E5" } };
      cell.border = { top: { style: "thin", color: { argb: "4338CA" } }, bottom: { style: "thin", color: { argb: "4338CA" } }, left: { style: "thin", color: { argb: "4338CA" } }, right: { style: "thin", color: { argb: "4338CA" } } };
    });
    rowIndex += 2; // spacer between blocks
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ---------- PDF: Laporan Kehadiran ----------
async function buildAttendancePdf(params: URLSearchParams) {
  const { report, totalDays } = await computeAttendance(params);
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text("LAPORAN KEHADIRAN", pageWidth / 2, 10, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text(`Periode: ${from} s/d ${to}`, pageWidth / 2, 16, { align: "center" });

  const header = [
    "No",
    "ID",
    "Nama Karyawan",
    "Kantor",
    "Jabatan",
    ...Array.from({ length: totalDays }, (_, i) => String(i + 1)),
    "H",
    "A",
    "I",
    "S",
    "C",
    "TL",
    "Total",
  ];

  const body = report.map((emp: any, idx: number) => {
    const statusByDay: Record<number, string> = {};
    for (const day of emp.days) statusByDay[day.day] = day.status;
    return [
      String(idx + 1),
      emp.pin,
      emp.name,
      emp.kantor || "-",
      emp.jabatan || "-",
      ...Array.from({ length: totalDays }, (_, i) => statusByDay[i + 1] || ""),
      String(emp.totals.H),
      String(emp.totals.A),
      String(emp.totals.I),
      String(emp.totals.S),
      String(emp.totals.C),
      String(emp.totals.TL),
      String(emp.totals.total),
    ];
  });

  autoTable(doc, {
    head: [header],
    body,
    startY: 26,
    margin: { left: 6, right: 6 },
    styles: { font: "helvetica", fontSize: 5.5, cellPadding: 1, textColor: INK, lineColor: GRAY_LINE, lineWidth: 0.1 },
    headStyles: { fillColor: INDIGO_DARK, textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle" },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { halign: "center", cellWidth: 14 },
      2: { cellWidth: 38, fontStyle: "bold" },
      3: { cellWidth: 26 },
      4: { cellWidth: 22 },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const col = data.column.index;
        if (col >= 5 && col < 5 + totalDays) {
          const s = String(data.cell.raw || "");
          if (STATUS_PDF[s]) {
            data.cell.styles.fillColor = STATUS_PDF[s].fill;
            data.cell.styles.textColor = STATUS_PDF[s].text;
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.halign = "center";
          } else {
            data.cell.styles.textColor = [203, 213, 225];
            data.cell.styles.halign = "center";
          }
        }
        if (col >= 5 + totalDays) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "center";
        }
        if (col === 1) {
          data.cell.styles.font = "courier";
          data.cell.styles.fontSize = 5;
          data.cell.styles.halign = "center";
          data.cell.styles.textColor = [100, 116, 139];
        }
        if (col === 0) {
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
    },
    didDrawPage: (data2) => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Fingerspot Presence Board  •  Halaman ${data2.pageNumber}`,
        pageWidth / 2,
        pageH - 5,
        { align: "center" }
      );
    },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

// ---------- PDF: Laporan Detail ----------
async function buildDetailPdf(params: URLSearchParams) {
  const { report } = await computeDetail(params);
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const blocks = new Map<string, ReportEntry[]>();
  for (const r of report) {
    if (!blocks.has(r.employeePin)) blocks.set(r.employeePin, []);
    blocks.get(r.employeePin)!.push(r);
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const head = [
    [
      { content: "Tanggal", rowSpan: 2 },
      { content: "Jam Kerja", colSpan: 3 },
      { content: "Kehadiran", colSpan: 2 },
      { content: "Terlambat", rowSpan: 2 },
      { content: "Pulang Cepat", rowSpan: 2 },
      { content: "Total Jam Kerja", rowSpan: 2 },
      { content: "Istirahat", rowSpan: 2 },
      { content: "Lembur Awal", rowSpan: 2 },
      { content: "Lembur Akhir", rowSpan: 2 },
      { content: "Total Lembur", rowSpan: 2 },
      { content: "Masuk Kerja", rowSpan: 2 },
      { content: "Keterangan", rowSpan: 2 },
    ],
    ["", "Masuk", "Pulang", "Durasi", "Jam Masuk", "Jam Pulang"],
  ];

  let firstPage = true;
  blocks.forEach((rows, _pin) => {
    const first = rows[0];
    const t = blockTotals(rows);

    if (firstPage) {
      doc.setFillColor(INDIGO[0], INDIGO[1], INDIGO[2]);
      doc.rect(0, 0, pageWidth, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.text("LAPORAN DETAIL KEHADIRAN", pageWidth / 2, 10, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(224, 231, 255);
      doc.text(`Periode: ${from} s/d ${to}`, pageWidth / 2, 16, { align: "center" });
      firstPage = false;
    } else {
      doc.addPage();
    }

    // Employee band
    doc.setFillColor(INDIGO_DARK[0], INDIGO_DARK[1], INDIGO_DARK[2]);
    doc.rect(6, 26, pageWidth - 12, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${first.employeeName}  •  ${first.employeePin}  •  ${first.employeeJabatan || "-"}  •  ${first.employeeKantor || "-"}`,
      8,
      31.5
    );

    const body = rows.map((r) => [
      `${r.dayName}, ${r.date}`,
      r.scheduledStart || "-",
      r.scheduledEnd || "-",
      hm(r.workDurationMinutes),
      isoToHm(r.scanIn),
      isoToHm(r.scanOut),
      r.lateMinutes != null ? hm(r.lateMinutes) : "-",
      r.earlyLeaveMinutes != null ? hm(r.earlyLeaveMinutes) : "-",
      hm(r.workDurationMinutes),
      hm(r.istirahatMinutes),
      r.overtimeStartMinutes != null ? hm(r.overtimeStartMinutes) : "-",
      r.overtimeEndMinutes != null ? hm(r.overtimeEndMinutes) : "-",
      r.overtimeMinutes != null ? hm(r.overtimeMinutes) : "-",
      isHadir(r.status) ? "1" : "0",
      r.note || "-",
    ]);
    body.push([
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      jm(t.terlambat),
      jm(t.cepat),
      jm(t.kerja),
      jm(t.istirahat),
      jm(t.lemburAwal),
      jm(t.lemburAkhir),
      jm(t.lemburTotal),
      `${t.hadir} hari`,
      "",
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 38,
      margin: { left: 6, right: 6 },
      styles: { font: "helvetica", fontSize: 6, cellPadding: 1, textColor: INK, lineColor: GRAY_LINE, lineWidth: 0.1 },
      headStyles: { fillColor: INDIGO, textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle" },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === body.length - 1) {
          data.cell.styles.fillColor = INDIGO;
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
        }
      },
      didDrawPage: (data2) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Fingerspot Presence Board  •  Halaman ${data2.pageNumber}`, pageWidth / 2, pageHeight - 5, { align: "center" });
      },
    });
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const command = searchParams.get("command") || "attendance";
    const format = searchParams.get("format") || "xlsx";

    let buf: Buffer;
    let contentType: string;
    let filename: string;
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    if (format === "pdf") {
      buf =
        command === "detail"
          ? await buildDetailPdf(searchParams)
          : await buildAttendancePdf(searchParams);
      contentType = "application/pdf";
      filename = command === "detail"
        ? `laporan-detail_${from}_${to}.pdf`
        : `laporan-kehadiran_${from}_${to}.pdf`;
    } else {
      buf =
        command === "detail"
          ? await buildDetailXlsx(searchParams)
          : await buildAttendanceXlsx(searchParams);
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      filename = command === "detail"
        ? `laporan-detail_${from}_${to}.xlsx`
        : `laporan-kehadiran_${from}_${to}.xlsx`;
    }

    const body = new Uint8Array(buf.length);
    buf.copy(body, 0);
    return new NextResponse(new Blob([body.buffer as ArrayBuffer], { type: contentType }), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}