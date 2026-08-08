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

function formatTime(val: string | null) {
  if (!val) return "-";
  const parts = val.split(":");
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return val;
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
      const rows = report.map((r) => ({
        ID: r.employeePin,
        Nama: r.employeeName,
        Kantor: r.employeeKantor || "-",
        Jabatan: r.employeeJabatan || "-",
        Tanggal: r.date,
        Hari: r.dayName,
        "Jadwal Masuk": formatTime(r.scheduledStart),
        "Jadwal Pulang": formatTime(r.scheduledEnd),
        "Scan Masuk": formatTime(r.scanIn),
        "Scan Pulang": formatTime(r.scanOut),
        Status: STATUS_LABELS[r.status] || r.status,
        "Telat (menit)": r.lateMinutes,
        "Pulang Cepat": r.earlyLeaveMinutes,
        Lembur: r.overtimeMinutes,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detail");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dl = getDateRange();
      a.download = `laporan-detail_${dl.from}_${dl.to}.xlsx`;
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
      const doc = new jsPDF({ orientation: "landscape" });
      const dl3 = getDateRange();
      const title = `Laporan Detail ${dl3.from} sd ${dl3.to}`;
      doc.setFontSize(14);
      doc.text(title, 14, 16);
      doc.setFontSize(8);
      doc.text(`Diexport: ${new Date().toLocaleDateString("id-ID")}`, 14, 22);

      const headers = [
        [
          "ID",
          "Nama",
          "Kantor",
          "Jabatan",
          "Tanggal",
          "Hari",
          "Jadwal Masuk",
          "Jadwal Pulang",
          "Scan Masuk",
          "Scan Pulang",
          "Status",
          "Telat",
          "Pulang Cepat",
          "Lembur",
        ],
      ];
      const body = report.map((r) => [
        r.employeePin,
        r.employeeName,
        r.employeeKantor || "-",
        r.employeeJabatan || "-",
        r.date,
        r.dayName,
        formatTime(r.scheduledStart),
        formatTime(r.scheduledEnd),
        formatTime(r.scanIn),
        formatTime(r.scanOut),
        STATUS_LABELS[r.status] || r.status,
        r.lateMinutes,
        r.earlyLeaveMinutes,
        r.overtimeMinutes,
      ]);

      (doc as any).autoTable({
        head: headers,
        body,
        startY: 28,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      const dl2 = getDateRange();
      doc.save(`laporan-detail_${dl2.from}_${dl2.to}.pdf`);
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

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kantor</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Hari</TableHead>
                <TableHead>Jadwal Masuk</TableHead>
                <TableHead>Jadwal Pulang</TableHead>
                <TableHead>Scan Masuk</TableHead>
                <TableHead>Scan Pulang</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Telat (menit)</TableHead>
                <TableHead className="text-right">Pulang Cepat</TableHead>
                <TableHead className="text-right">Lembur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-32 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : report.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-32 text-center text-muted-foreground">
                    {pin || name || kantorId || jabatanId
                      ? "Tidak ada data untuk filter yang dipilih"
                      : "Pilih periode dan klik Tampilkan untuk melihat laporan"}
                  </TableCell>
                </TableRow>
              ) : (
                report.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{row.employeePin}</TableCell>
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell className="text-[12.5px]">
                      {row.employeeKantor ? (
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11.5px] font-medium text-indigo-700">
                          {row.employeeKantor}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[12.5px]">
                      {row.employeeJabatan ? (
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11.5px] font-medium text-blue-700">
                          {row.employeeJabatan}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{row.date}</TableCell>
                    <TableCell>{row.dayName}</TableCell>
                    <TableCell className="font-mono">{formatTime(row.scheduledStart)}</TableCell>
                    <TableCell className="font-mono">{formatTime(row.scheduledEnd)}</TableCell>
                    <TableCell className="font-mono">{formatTime(row.scanIn)}</TableCell>
                    <TableCell className="font-mono">{formatTime(row.scanOut)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[row.status] as "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"} className={STATUS_BADGE_CLASS[row.status]}>
                        {row.status} - {STATUS_LABELS[row.status] || row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.lateMinutes > 0 ? (
                        <span className="text-orange-600">{row.lateMinutes}</span>
                      ) : (
                        row.lateMinutes
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.earlyLeaveMinutes > 0 ? (
                        <span className="text-orange-600">{row.earlyLeaveMinutes}</span>
                      ) : (
                        row.earlyLeaveMinutes
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.overtimeMinutes > 0 ? (
                        <span className="text-emerald-600">{row.overtimeMinutes}</span>
                      ) : (
                        row.overtimeMinutes
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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
