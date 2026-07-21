"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
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
import { Input } from "@/components/ui/input";

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
  days: DayEntry[];
  totals: EmployeeTotals;
}

interface ReportResponse {
  success: boolean;
  report: EmployeeReport[];
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export default function AttendanceReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [generating, setGenerating] = useState(false);

  const daysInMonth = getDaysInMonth(year, month);

  const fetchReport = useCallback(() => {
    setLoading(true);
    fetch(`/api/reports?command=attendance&month=${month}&year=${year}`)
      .then((res) => res.json())
      .then((d: ReportResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [month, year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const reportData = data?.report || [];

  const filteredData = useMemo(() => {
    if (!employeeSearch.trim()) return reportData;
    const q = employeeSearch.toLowerCase();
    return reportData.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.pin.toLowerCase().includes(q)
    );
  }, [reportData, employeeSearch]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

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

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const exportExcel = () => {
    const header = [
      "No",
      "Nama Karyawan",
      ...daysArray.map(String),
      "H",
      "A",
      "I",
      "S",
      "C",
      "TL",
      "Total Hari",
    ];
    const rows = filteredData.map((emp, idx) => [
      idx + 1,
      emp.name,
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
    XLSX.writeFile(wb, `Laporan_Kehadiran_${MONTHS[month - 1]}_${year}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    doc.text(`Laporan Kehadiran - ${MONTHS[month - 1]} ${year}`, pageWidth / 2, 15, {
      align: "center",
    });
    const header = [
      "No",
      "Nama Karyawan",
      ...daysArray.map(String),
      "H",
      "A",
      "I",
      "S",
      "C",
      "TL",
      "Total",
    ];
    const body = filteredData.map((emp, idx) => [
      idx + 1,
      emp.name,
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
    doc.save(`Laporan_Kehadiran_${MONTHS[month - 1]}_${year}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
          <CalendarCheck className="h-5 w-5 text-violet-600" />
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
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  Bulan
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {MONTHS.map((name, idx) => (
                    <option key={idx} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                  Tahun
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const y = now.getFullYear() - 5 + i;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 pb-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-[13px] font-semibold text-gray-700 min-w-[120px] text-center">
                {MONTHS[month - 1]} {year}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                title="Bulan berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 min-w-[180px] max-w-[280px]">
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                Cari Karyawan
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Nama atau PIN..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pb-0.5">
              <Button
                onClick={async () => {
                  setGenerating(true);
                  try {
                    const res = await fetch(`/api/reports?command=generate&month=${month}&year=${year}`);
                    const d = await res.json();
                    if (d.success) { alert("Laporan berhasil digenerate untuk " + month + "/" + year); fetchReport(); }
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
                <TableHead className="min-w-[160px]">Nama Karyawan</TableHead>
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
                    colSpan={daysInMonth + 9}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={daysInMonth + 9}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {employeeSearch
                      ? "Tidak ada karyawan yang cocok dengan pencarian."
                      : "Belum ada data laporan untuk bulan ini."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((emp, idx) => (
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
