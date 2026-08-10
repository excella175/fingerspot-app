"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, CalendarClock, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker, getDateRange } from "@/components/date-range-picker";

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

interface ReportResponse {
  success: boolean;
  report: ReportEntry[];
}

interface Kantor {
  id: string;
  nama: string;
  jabatans: { id: string; nama: string }[];
}

interface EmployeeBlock {
  pin: string;
  name: string;
  kantor: string;
  jabatan: string;
  rows: ReportEntry[];
}

const STATUS_LABELS: Record<string, string> = {
  H: "Hadir",
  A: "Alpha",
  I: "Izin",
  S: "Sakit",
  C: "Cuti",
  L: "Libur",
  TL: "Terlambat",
};

const STATUS_BADGE_VARIANT: Record<string, string> = {
  H: "default",
  A: "destructive",
  I: "secondary",
  S: "secondary",
  C: "secondary",
  L: "secondary",
  TL: "default",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  H: "bg-green-100 text-green-800 hover:bg-green-100 border-green-300",
  A: "",
  I: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300",
  S: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300",
  C: "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-300",
  L: "bg-gray-100 text-gray-500 hover:bg-gray-100 border-gray-300",
  TL: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300",
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

export default function ReportDetailPage() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [kantorId, setKantorId] = useState("");
  const [jabatanId, setJabatanId] = useState("");
  const [kantors, setKantors] = useState<Kantor[]>([]);
  const [report, setReport] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/kantor")
      .then((r) => r.json())
      .then((d) => setKantors(d.data || []))
      .catch(() => {});
  }, []);

  const selectedKantor = kantors.find((k) => k.id === kantorId);

  const fetchReport = useCallback(() => {
    setLoading(true);
    setError("");
    const dr = getDateRange();
    const params = new URLSearchParams({ command: "detail", from: dr.from, to: dr.to });
    if (pin) params.set("employeePin", pin);
    if (name) params.set("name", name);
    if (kantorId) params.set("kantorId", kantorId);
    if (jabatanId) params.set("jabatanId", jabatanId);

    fetch(`/api/reports?${params}`)
      .then((res) => res.json())
      .then((d: ReportResponse) => {
        if (d.success) {
          setReport(d.report || []);
        } else {
          setError("Gagal memuat laporan");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Terjadi kesalahan saat memuat data");
        setLoading(false);
      });
  }, [pin, name, kantorId, jabatanId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    const handler = () => fetchReport();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [fetchReport]);

  const blocks: EmployeeBlock[] = [];
  const blockMap = new Map<string, EmployeeBlock>();
  for (const r of report) {
    let b = blockMap.get(r.employeePin);
    if (!b) {
      b = { pin: r.employeePin, name: r.employeeName, kantor: r.employeeKantor || "", jabatan: r.employeeJabatan || "", rows: [] };
      blockMap.set(r.employeePin, b);
      blocks.push(b);
    }
    b.rows.push(r);
  }

  const summary = report.reduce(
    (acc, r) => {
      acc.total++;
      const s = r.status;
      if (s === "H") acc.H++;
      else if (s === "A") acc.A++;
      else if (s === "I") acc.I++;
      else if (s === "S") acc.S++;
      else if (s === "C") acc.C++;
      else if (s === "L") acc.L++;
      else if (s === "TL") acc.TL++;
      else acc.other++;
      return acc;
    },
    { total: 0, H: 0, A: 0, I: 0, S: 0, C: 0, L: 0, TL: 0, other: 0 }
  );

  const handleExportExcel = () => {
    setExporting("excel");
    try {
      const dr = getDateRange();
      const aoa: any[][] = [];
      const merges: any[] = [];

      blocks.forEach((b) => {
        const base = aoa.length;
        aoa.push(["Laporan Fingerspot Solo"]);
        merges.push({ s: { r: base + 0, c: 0 }, e: { r: base + 0, c: 12 } });
        aoa.push([`${dr.from} s/d ${dr.to}`]);
        merges.push({ s: { r: base + 1, c: 0 }, e: { r: base + 1, c: 12 } });
        aoa.push([]);
        aoa.push([]);
        aoa.push(["Nama Karyawan", b.name, "", "", "", "", "", "", "Jabatan", b.jabatan]);
        aoa.push(["ID/NIK", b.pin, "", "", "", "", "", "", "Kantor", b.kantor]);
        aoa.push([]);
        aoa.push([]);
        aoa.push(["Tanggal", "Jam Kerja", "", "", "Kehadiran", "", "Terlambat", "Pulang Cepat", "Total Jam Kerja", "Istirahat", "Lembur Awal", "Lembur Akhir", "Total Lembur", "Masuk Kerja", "Keterangan"]);
        aoa.push(["", "Masuk", "Pulang", "Durasi", "Jam Masuk", "Jam Pulang", "", "", "", "", "", "", "", "", ""]);
        merges.push({ s: { r: base + 8, c: 0 }, e: { r: base + 9, c: 0 } });
        merges.push({ s: { r: base + 8, c: 1 }, e: { r: base + 8, c: 3 } });
        merges.push({ s: { r: base + 8, c: 4 }, e: { r: base + 8, c: 5 } });
        for (let c = 6; c <= 14; c++) merges.push({ s: { r: base + 8, c }, e: { r: base + 9, c } });

        for (const r of b.rows) {
          aoa.push([
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
          ]);
        }

        const t = blockTotals(b.rows);
        aoa.push(["TOTAL", "", "", "", "", "", jm(t.terlambat), jm(t.cepat), jm(t.kerja), jm(t.istirahat), jm(t.lemburAwal), jm(t.lemburAkhir), jm(t.lemburTotal), `${t.hadir} hari`, ""]);
        merges.push({ s: { r: base + 41, c: 0 }, e: { r: base + 41, c: 5 } });
        aoa.push([]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!merges"] = merges;
      ws["!cols"] = [
        { wch: 20 }, { wch: 22 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
        { wch: 11 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 11 }, { wch: 11 },
        { wch: 11 }, { wch: 11 }, { wch: 22 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Detail Kehadiran");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-detail_${dr.from}_${dr.to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Gagal export Excel");
    }
    setExporting(null);
  };

  const handleExportPdf = () => {
    setExporting("pdf");
    try {
      const dr = getDateRange();
      const doc = new jsPDF({ orientation: "landscape" });

      const head = [
        ["Tanggal", "Jam Kerja", "", "", "Kehadiran", "", "Terlambat", "Pulang Cepat", "Total Jam Kerja", "Istirahat", "Lembur Awal", "Lembur Akhir", "Total Lembur", "Masuk Kerja", "Keterangan"],
        ["", "Masuk", "Pulang", "Durasi", "Jam Masuk", "Jam Pulang", "", "", "", "", "", "", "", "", ""],
      ];

      blocks.forEach((b, bi) => {
        if (bi > 0) doc.addPage();
        doc.setFontSize(14);
        doc.text("Laporan Fingerspot Solo", 14, 14);
        doc.setFontSize(10);
        doc.text(`${dr.from} s/d ${dr.to}`, 14, 20);
        doc.setFontSize(9);
        doc.text(`Nama: ${b.name}    ID/NIK: ${b.pin}    Jabatan: ${b.jabatan || "-"}    Kantor: ${b.kantor || "-"}`, 14, 26);

        const body = b.rows.map((r) => [
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

        const t = blockTotals(b.rows);
        body.push(["TOTAL", "", "", "", "", "", jm(t.terlambat), jm(t.cepat), jm(t.kerja), jm(t.istirahat), jm(t.lemburAwal), jm(t.lemburAkhir), jm(t.lemburTotal), `${t.hadir} hari`, ""]);

        (doc as any).autoTable({
          head,
          body,
          startY: 31,
          styles: { fontSize: 7, cellPadding: 1.2 },
          headStyles: { fillColor: [59, 130, 246] },
          bodyStyles: { textColor: 40 },
          alternateRowStyles: { fillColor: [245, 247, 250] },
        });
      });

      doc.save(`laporan-detail_${dr.from}_${dr.to}.pdf`);
    } catch {
      alert("Gagal export PDF");
    }
    setExporting(null);
  };

  const inputCls =
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-200">
          <CalendarClock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Laporan Detail</h1>
          <p className="text-[13px] text-gray-400">
            Perincian absensi harian per karyawan
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-32">
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                ID (PIN)
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Semua"
                className={inputCls}
              />
            </div>
            <div className="w-44">
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                Nama
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cari nama..."
                className={inputCls}
              />
            </div>
            <div className="w-44">
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                Kantor
              </label>
              <select
                value={kantorId}
                onChange={(e) => { setKantorId(e.target.value); setJabatanId(""); }}
                className={inputCls}
              >
                <option value="">Semua Kantor</option>
                {kantors.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>
            <div className="w-44">
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                Jabatan
              </label>
              <select
                value={jabatanId}
                onChange={(e) => setJabatanId(e.target.value)}
                disabled={!kantorId}
                className={inputCls + " disabled:opacity-50"}
              >
                <option value="">{kantorId ? "Semua Jabatan" : "Pilih Kantor dulu"}</option>
                {selectedKantor?.jabatans.map((j) => (
                  <option key={j.id} value={j.id}>{j.nama}</option>
                ))}
              </select>
            </div>
            <DateRangePicker />
            <Button onClick={fetchReport} disabled={loading}>
              <Search className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Memuat..." : "Tampilkan"}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={handleExportExcel}
              disabled={report.length === 0 || exporting !== null}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              {exporting === "excel" ? "Mengexport..." : "Export Excel"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleExportPdf}
              disabled={report.length === 0 || exporting !== null}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              {exporting === "pdf" ? "Mengexport..." : "Export PDF"}
            </Button>
            <Button
              onClick={async () => {
                setGenerating(true);
                try {
                  const dr = getDateRange();
                  const res = await fetch(`/api/reports?command=generate&from=${dr.from}&to=${dr.to}`);
                  const d = await res.json();
                  if (d.success) { alert("Laporan berhasil digenerate untuk " + dr.from + " sd " + dr.to); fetchReport(); }
                  else alert("Gagal: " + (d.error || ""));
                } catch { alert("Gagal generate laporan"); }
                setGenerating(false);
              }}
              disabled={generating}
            >
              {generating ? "Memproses..." : "Generate Laporan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {blocks.length > 0 && (
        <div className="space-y-6">
          {blocks.map((b) => {
            const t = blockTotals(b.rows);
            return (
              <Card key={b.pin}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-b p-4 text-[13px] md:grid-cols-4">
                  <div>
                    <span className="text-gray-400">Nama Karyawan</span>
                    <div className="mt-0.5 font-semibold text-gray-900">{b.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">ID/NIK</span>
                    <div className="mt-0.5 font-mono text-gray-900">{b.pin}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Jabatan</span>
                    <div className="mt-0.5 font-medium text-gray-900">{b.jabatan || "-"}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Kantor</span>
                    <div className="mt-0.5 font-medium text-gray-900">{b.kantor || "-"}</div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead rowSpan={2} className="whitespace-nowrap">Tanggal</TableHead>
                        <TableHead colSpan={3} className="text-center">Jam Kerja</TableHead>
                        <TableHead colSpan={2} className="text-center">Kehadiran</TableHead>
                        <TableHead rowSpan={2} className="whitespace-nowrap text-center">Terlambat</TableHead>
                        <TableHead rowSpan={2} className="whitespace-nowrap text-center">Pulang Cepat</TableHead>
                        <TableHead rowSpan={2} className="whitespace-nowrap text-center">Total Jam Kerja</TableHead>
                        <TableHead rowSpan={2} className="whitespace-nowrap text-center">Istirahat</TableHead>
                        <TableHead rowSpan={2} className="whitespace-nowrap text-center">Lembur Awal</TableHead>
                        <TableHead rowSpan={2} className="whitespace-nowrap text-center">Lembur Akhir</TableHead>
                        <TableHead rowSpan={2} className="whitespace-nowrap text-center">Total Lembur</TableHead>
                        <TableHead rowSpan={2} className="whitespace-nowrap text-center">Masuk Kerja</TableHead>
                        <TableHead rowSpan={2} className="whitespace-nowrap">Keterangan</TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead className="text-center">Masuk</TableHead>
                        <TableHead className="text-center">Pulang</TableHead>
                        <TableHead className="text-center">Durasi</TableHead>
                        <TableHead className="text-center">Jam Masuk</TableHead>
                        <TableHead className="text-center">Jam Pulang</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {b.rows.map((r, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="whitespace-nowrap font-medium">
                            {r.dayName}, <span className="font-mono">{r.date}</span>
                          </TableCell>
                          <TableCell className="text-center font-mono">{r.scheduledStart || "-"}</TableCell>
                          <TableCell className="text-center font-mono">{r.scheduledEnd || "-"}</TableCell>
                          <TableCell className="text-center font-mono">{hm(r.workDurationMinutes)}</TableCell>
                          <TableCell className="text-center font-mono">
                            {r.scanIn ? (
                              <span className={r.lateMinutes > 0 ? "text-orange-600" : ""}>{isoToHm(r.scanIn)}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {r.scanOut ? (
                              <span className={r.earlyLeaveMinutes > 0 ? "text-orange-600" : ""}>{isoToHm(r.scanOut)}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono">{r.lateMinutes != null ? hm(r.lateMinutes) : "-"}</TableCell>
                          <TableCell className="text-center font-mono">{r.earlyLeaveMinutes != null ? hm(r.earlyLeaveMinutes) : "-"}</TableCell>
                          <TableCell className="text-center font-mono">{hm(r.workDurationMinutes)}</TableCell>
                          <TableCell className="text-center font-mono">{hm(r.istirahatMinutes)}</TableCell>
                          <TableCell className="text-center font-mono">
                            {r.overtimeStartMinutes ? <span className="text-emerald-600">{hm(r.overtimeStartMinutes)}</span> : hm(r.overtimeStartMinutes)}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {r.overtimeEndMinutes ? <span className="text-emerald-600">{hm(r.overtimeEndMinutes)}</span> : hm(r.overtimeEndMinutes)}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {r.overtimeMinutes ? <span className="text-emerald-600">{hm(r.overtimeMinutes)}</span> : hm(r.overtimeMinutes)}
                          </TableCell>
                          <TableCell className="text-center font-mono">{isHadir(r.status) ? "1" : "0"}</TableCell>
                          <TableCell className="max-w-[220px] text-[12.5px] text-gray-600">
                            {r.note || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-blue-50/60">
                        <TableCell colSpan={6} className="font-bold text-gray-900">TOTAL</TableCell>
                        <TableCell className="text-center font-mono text-[12.5px] font-semibold">{jm(t.terlambat)}</TableCell>
                        <TableCell className="text-center font-mono text-[12.5px] font-semibold">{jm(t.cepat)}</TableCell>
                        <TableCell className="text-center font-mono text-[12.5px] font-semibold">{jm(t.kerja)}</TableCell>
                        <TableCell className="text-center font-mono text-[12.5px] font-semibold">{jm(t.istirahat)}</TableCell>
                        <TableCell className="text-center font-mono text-[12.5px] font-semibold">{jm(t.lemburAwal)}</TableCell>
                        <TableCell className="text-center font-mono text-[12.5px] font-semibold">{jm(t.lemburAkhir)}</TableCell>
                        <TableCell className="text-center font-mono text-[12.5px] font-semibold">{jm(t.lemburTotal)}</TableCell>
                        <TableCell className="text-center font-mono text-[12.5px] font-semibold">{t.hadir} hari</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && report.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-[13px] text-muted-foreground">
            {pin || name || kantorId || jabatanId
              ? "Tidak ada data untuk filter yang dipilih"
              : "Pilih periode dan klik Tampilkan untuk melihat laporan"}
          </CardContent>
        </Card>
      )}

      {report.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Ringkasan</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-foreground text-[13px] py-1.5 px-3">
                Total Hari: <strong className="ml-1">{summary.total}</strong>
              </Badge>
              <Badge variant={STATUS_BADGE_VARIANT["H"] as any} className={STATUS_BADGE_CLASS["H"] + " text-[13px] py-1.5 px-3"}>
                H: <strong className="ml-1">{summary.H}</strong>
              </Badge>
              <Badge variant={STATUS_BADGE_VARIANT["A"] as any} className={STATUS_BADGE_CLASS["A"] + " text-[13px] py-1.5 px-3"}>
                A: <strong className="ml-1">{summary.A}</strong>
              </Badge>
              <Badge variant={STATUS_BADGE_VARIANT["I"] as any} className={STATUS_BADGE_CLASS["I"] + " text-[13px] py-1.5 px-3"}>
                I: <strong className="ml-1">{summary.I}</strong>
              </Badge>
              <Badge variant={STATUS_BADGE_VARIANT["S"] as any} className={STATUS_BADGE_CLASS["S"] + " text-[13px] py-1.5 px-3"}>
                S: <strong className="ml-1">{summary.S}</strong>
              </Badge>
              <Badge variant={STATUS_BADGE_VARIANT["C"] as any} className={STATUS_BADGE_CLASS["C"] + " text-[13px] py-1.5 px-3"}>
                C: <strong className="ml-1">{summary.C}</strong>
              </Badge>
              <Badge variant={STATUS_BADGE_VARIANT["L"] as any} className={STATUS_BADGE_CLASS["L"] + " text-[13px] py-1.5 px-3"}>
                L: <strong className="ml-1">{summary.L}</strong>
              </Badge>
              <Badge variant={STATUS_BADGE_VARIANT["TL"] as any} className={STATUS_BADGE_CLASS["TL"] + " text-[13px] py-1.5 px-3"}>
                TL: <strong className="ml-1">{summary.TL}</strong>
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
