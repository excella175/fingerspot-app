"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  FileSpreadsheet,
  FileText,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker, getDateRange } from "@/components/date-range-picker";

interface DayEntry {
  date: string;
  day: number;
  status: string | null;
  lateMinutes: number;
}

interface EmployeeTotals {
  H: number;
  A: number;
  I: number;
  S: number;
  C: number;
  TL: number;
  total: number;
}

interface EmployeeReport {
  pin: string;
  name: string;
  kantor: string;
  jabatan: string;
  days: DayEntry[];
  totals: EmployeeTotals;
}

interface ReportResponse {
  success: boolean;
  report: EmployeeReport[];
}

interface Kantor {
  id: string;
  nama: string;
  jabatans: { id: string; nama: string }[];
}

const STATUS_BADGE_VARIANT: Record<string, string> = {
  H: "default",
  A: "destructive",
  I: "secondary",
  S: "secondary",
  C: "secondary",
  TL: "default",
  D: "secondary",
  L: "secondary",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  H: "bg-green-100 text-green-800 hover:bg-green-100 border-green-300",
  A: "",
  I: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300",
  S: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300",
  C: "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-300",
  TL: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-300",
  D: "bg-teal-100 text-teal-800 hover:bg-teal-100 border-teal-300",
  L: "bg-gray-100 text-gray-400 hover:bg-gray-100 border-gray-300",
};

function getDaysInRange(from: string, to: string): number[] {
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const days: number[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d).getDate());
  }
  return days;
}

const inputCls =
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function AttendanceReportPage() {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [kantorId, setKantorId] = useState("");
  const [jabatanId, setJabatanId] = useState("");
  const [kantors, setKantors] = useState<Kantor[]>([]);

  const dr = getDateRange();
  const daysArray = useMemo(() => getDaysInRange(dr.from, dr.to), [dr.from, dr.to]);

  useEffect(() => {
    fetch("/api/kantor")
      .then((r) => r.json())
      .then((d) => setKantors(d.data || []))
      .catch(() => {});
  }, []);

  const selectedKantor = kantors.find((k) => k.id === kantorId);

  const fetchReport = useCallback(() => {
    setLoading(true);
    const d = getDateRange();
    const params = new URLSearchParams({ command: "attendance", from: d.from, to: d.to });
    if (pin) params.set("pin", pin);
    if (name) params.set("name", name);
    if (kantorId) params.set("kantorId", kantorId);
    if (jabatanId) params.set("jabatanId", jabatanId);
    fetch(`/api/reports?${params}`)
      .then((res) => res.json())
      .then((d2: ReportResponse) => {
        setData(d2);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pin, name, kantorId, jabatanId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    const handler = () => fetchReport();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [fetchReport]);

  const reportData = data?.report || [];

  function getStatus(report: EmployeeReport, day: number): string | null {
    const entry = report.days.find((d) => d.day === day);
    return entry?.status || null;
  }

  function getLateMinutes(report: EmployeeReport, day: number): number {
    const entry = report.days.find((d) => d.day === day);
    return entry?.lateMinutes || 0;
  }

  function renderCell(status: string | null, lateMinutes: number) {
    if (!status) {
      return <span className="text-gray-200">-</span>;
    }
    const variant = (STATUS_BADGE_VARIANT[status] || "secondary") as "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
    const badgeClass = STATUS_BADGE_CLASS[status] || "";
    const isTL = status === "TL";
    return (
      <Badge variant={variant} className={badgeClass}>
        {status}
        {isTL && lateMinutes > 0 && (
          <span className="ml-0.5 text-[9px] font-normal opacity-60">
            {lateMinutes}m
          </span>
        )}
      </Badge>
    );
  }

  const exportExcel = () => {
    const header = [
      "No",
      "ID",
      "Nama Karyawan",
      "Kantor",
      "Jabatan",
      ...daysArray.map(String),
      "H",
      "A",
      "I",
      "S",
      "C",
      "TL",
      "Total Hari",
    ];
    const rows = reportData.map((emp, idx) => [
      idx + 1,
      emp.pin,
      emp.name,
      emp.kantor || "-",
      emp.jabatan || "-",
      ...daysArray.map((d) => getStatus(emp, d) || ""),
      emp.totals.H,
      emp.totals.A,
      emp.totals.I,
      emp.totals.S,
      emp.totals.C,
      emp.totals.TL,
      emp.totals.total,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    const d = getDateRange();
    XLSX.writeFile(wb, `Laporan_Kehadiran_${d.from}_${d.to}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    const d = getDateRange();
    doc.text(`Laporan Kehadiran - ${d.from} sd ${d.to}`, pageWidth / 2, 15, {
      align: "center",
    });
    const header = [
      "No",
      "ID",
      "Nama Karyawan",
      "Kantor",
      "Jabatan",
      ...daysArray.map(String),
      "H",
      "A",
      "I",
      "S",
      "C",
      "TL",
      "Total",
    ];
    const body = reportData.map((emp, idx) => [
      idx + 1,
      emp.pin,
      emp.name,
      emp.kantor || "-",
      emp.jabatan || "-",
      ...daysArray.map((d) => getStatus(emp, d) || "-"),
      emp.totals.H,
      emp.totals.A,
      emp.totals.I,
      emp.totals.S,
      emp.totals.C,
      emp.totals.TL,
      emp.totals.total,
    ]);
    (doc as any).autoTable({
      head: [header],
      body,
      startY: 22,
      styles: { fontSize: 6, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246], fontSize: 6 },
      tableWidth: "auto",
    });
    doc.save(`Laporan_Kehadiran_${d.from}_${d.to}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-200">
          <CalendarCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Laporan Kehadiran
          </h1>
          <p className="text-[13px] text-gray-400">
            Rekap absensi bulanan berdasarkan hari
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

            <div className="flex items-center gap-2 pb-0.5">
              <Button onClick={fetchReport} disabled={loading}>
                <Search className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Memuat..." : "Tampilkan"}
              </Button>
              <Button
                variant="secondary"
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
              <Button
                variant="secondary"
                onClick={exportExcel}
                disabled={!data || reportData.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                Excel
              </Button>
              <Button
                variant="destructive"
                onClick={exportPDF}
                disabled={!data || reportData.length === 0}
              >
                <FileText className="h-4 w-4 mr-1.5" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">No</TableHead>
                <TableHead className="min-w-[140px]">Nama Karyawan</TableHead>
                <TableHead className="min-w-[110px]">Kantor</TableHead>
                <TableHead className="min-w-[100px]">Jabatan</TableHead>
                {daysArray.map((d) => (
                  <TableHead key={d} className="text-center text-[11px] w-8 px-1.5">
                    {d}
                  </TableHead>
                ))}
                <TableHead className="text-center text-green-600 text-[11px] w-10 px-2">
                  H
                </TableHead>
                <TableHead className="text-center text-red-600 text-[11px] w-8 px-2">
                  A
                </TableHead>
                <TableHead className="text-center text-amber-500 text-[11px] w-8 px-2">
                  I
                </TableHead>
                <TableHead className="text-center text-blue-600 text-[11px] w-8 px-2">
                  S
                </TableHead>
                <TableHead className="text-center text-purple-600 text-[11px] w-8 px-2">
                  C
                </TableHead>
                <TableHead className="text-center text-orange-500 text-[11px] w-8 px-2">
                  TL
                </TableHead>
                <TableHead className="text-center text-[11px] w-14 px-3">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={daysArray.length + 11}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat...
                    </div>
                  </TableCell>
                </TableRow>
              ) : reportData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={daysArray.length + 11}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {pin || name || kantorId || jabatanId
                      ? "Tidak ada karyawan yang cocok dengan filter."
                      : "Belum ada data laporan untuk periode ini."}
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((emp, idx) => (
                  <TableRow key={emp.pin}>
                    <TableCell className="text-center text-muted-foreground text-[12px]">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="text-[11px] text-muted-foreground font-mono mr-1.5">
                        {emp.pin}
                      </span>
                      {emp.name}
                    </TableCell>
                    <TableCell className="text-[12px]">
                      {emp.kantor ? (
                        <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">
                          {emp.kantor}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[12px]">
                      {emp.jabatan ? (
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                          {emp.jabatan}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    {daysArray.map((d) => (
                      <TableCell key={d} className="text-center px-1.5">
                        {renderCell(getStatus(emp, d), getLateMinutes(emp, d))}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold text-green-600 text-[12px] px-2">
                      {emp.totals.H}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-red-600 text-[12px] px-2">
                      {emp.totals.A}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-amber-500 text-[12px] px-2">
                      {emp.totals.I}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-blue-600 text-[12px] px-2">
                      {emp.totals.S}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-purple-600 text-[12px] px-2">
                      {emp.totals.C}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-orange-500 text-[12px] px-2">
                      {emp.totals.TL}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-[12px] px-3">
                      {emp.totals.total}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {!loading && reportData.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-[12px] text-blue-700 leading-relaxed">
          <strong>Keterangan:</strong>{" "}
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block h-3 w-6 rounded bg-green-50 text-[10px] text-center font-bold text-green-600">
              H
            </span>{" "}
            Hadir
          </span>
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block h-3 w-6 rounded bg-red-50 text-[10px] text-center font-bold text-red-600">
              A
            </span>{" "}
            Alpha
          </span>
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block h-3 w-6 rounded bg-amber-50 text-[10px] text-center font-bold text-amber-500">
              I
            </span>{" "}
            Izin
          </span>
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block h-3 w-6 rounded bg-blue-50 text-[10px] text-center font-bold text-blue-600">
              S
            </span>{" "}
            Sakit
          </span>
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block h-3 w-6 rounded bg-purple-50 text-[10px] text-center font-bold text-purple-600">
              C
            </span>{" "}
            Cuti
          </span>
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block h-3 w-6 rounded bg-orange-50 text-[10px] text-center font-bold text-orange-500">
              TL
            </span>{" "}
            Terlambat
          </span>
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block h-3 w-6 rounded bg-teal-50 text-[10px] text-center font-bold text-teal-600">
              D
            </span>{" "}
            Dinas
          </span>
          <span className="inline-flex items-center gap-1 mr-3">
            <span className="inline-block h-3 w-6 rounded bg-gray-50 text-[10px] text-center font-bold text-gray-400">
              L
            </span>{" "}
            Libur
          </span>
        </div>
      )}
    </div>
  );
}
