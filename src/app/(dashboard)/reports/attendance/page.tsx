"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Search,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

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

interface UserInfoEntry {
  id: string;
  pin: string;
  name: string;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const STATUS_COLORS: Record<string, string> = {
  H: "text-green-600",
  A: "text-red-600",
  I: "text-amber-500",
  S: "text-blue-600",
  C: "text-purple-600",
  TL: "text-orange-500",
  D: "text-teal-600",
  L: "text-gray-400",
};

const STATUS_BG: Record<string, string> = {
  H: "bg-green-50",
  A: "bg-red-50",
  I: "bg-amber-50",
  S: "bg-blue-50",
  C: "bg-purple-50",
  TL: "bg-orange-50",
  D: "bg-teal-50",
  L: "bg-gray-50",
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
  const [userList, setUserList] = useState<UserInfoEntry[]>([]);
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

  useEffect(() => {
    fetch("/api/userinfo?limit=9999")
      .then((res) => res.json())
      .then((d) => setUserList(d.data || []))
      .catch(() => {});
  }, []);

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
    const colorClass = STATUS_COLORS[status] || "text-gray-500";
    const bgClass = STATUS_BG[status] || "bg-gray-50";
    const isTL = status === "TL";
    return (
      <span
        className={`inline-flex items-center justify-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${colorClass} ${bgClass}`}
      >
        {status}
        {isTL && lateMinutes > 0 && (
          <span className="text-[9px] font-normal text-gray-400">
            {lateMinutes}m
          </span>
        )}
      </span>
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

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-[13px] font-medium text-gray-500">
                Bulan
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1.5 block rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MONTHS.map((name, idx) => (
                  <option key={idx} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-500">
                Tahun
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1.5 block rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            <button
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-[13px] font-semibold text-gray-700 min-w-[120px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              title="Bulan berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-w-[180px] max-w-[280px]">
            <label className="block text-[13px] font-medium text-gray-500">
              Cari Karyawan
            </label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Nama atau PIN..."
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pb-0.5">
            <button
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
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
            >
              {generating ? "Memproses..." : "Generate Laporan"}
            </button>
            <button
              onClick={exportExcel}
              disabled={!data || reportData.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-200"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={!data || reportData.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm shadow-red-200"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="sticky left-0 z-10 bg-gray-50/50 px-3 py-3 font-medium text-gray-400 w-10 text-center">
                  No
                </th>
                <th className="sticky left-[40px] z-10 bg-gray-50/50 px-3 py-3 font-medium text-gray-400 min-w-[160px]">
                  Nama Karyawan
                </th>
                {daysArray.map((d) => (
                  <th
                    key={d}
                    className="px-1.5 py-3 text-center font-medium text-gray-400 text-[11px] w-8"
                  >
                    {d}
                  </th>
                ))}
                <th className="px-2 py-3 text-center font-medium text-green-600 text-[11px] w-10">
                  H
                </th>
                <th className="px-2 py-3 text-center font-medium text-red-600 text-[11px] w-8">
                  A
                </th>
                <th className="px-2 py-3 text-center font-medium text-amber-500 text-[11px] w-8">
                  I
                </th>
                <th className="px-2 py-3 text-center font-medium text-blue-600 text-[11px] w-8">
                  S
                </th>
                <th className="px-2 py-3 text-center font-medium text-purple-600 text-[11px] w-8">
                  C
                </th>
                <th className="px-2 py-3 text-center font-medium text-orange-500 text-[11px] w-8">
                  TL
                </th>
                <th className="px-3 py-3 text-center font-medium text-gray-500 text-[11px] w-14">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={daysInMonth + 9}
                    className="px-4 py-12 text-center text-gray-300"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysInMonth + 9}
                    className="px-4 py-12 text-center text-gray-300"
                  >
                    {employeeSearch
                      ? "Tidak ada karyawan yang cocok dengan pencarian."
                      : "Belum ada data laporan untuk bulan ini."}
                  </td>
                </tr>
              ) : (
                filteredData.map((emp, idx) => (
                  <tr
                    key={emp.pin}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 text-center text-gray-400 text-[12px]">
                      {idx + 1}
                    </td>
                    <td className="sticky left-[40px] z-10 bg-white px-3 py-2 font-medium text-gray-900 text-[12px]">
                      <span className="text-[11px] text-gray-400 font-mono mr-1.5">
                        {emp.pin}
                      </span>
                      {emp.name}
                    </td>
                    {daysArray.map((d) => (
                      <td key={d} className="px-1.5 py-2 text-center">
                        {renderCell(getStatus(emp, d), getLateMinutes(emp, d))}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center font-semibold text-green-600 text-[12px]">
                      {emp.totals.H}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-red-600 text-[12px]">
                      {emp.totals.A}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-amber-500 text-[12px]">
                      {emp.totals.I}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-blue-600 text-[12px]">
                      {emp.totals.S}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-purple-600 text-[12px]">
                      {emp.totals.C}
                    </td>
                    <td className="px-2 py-2 text-center font-semibold text-orange-500 text-[12px]">
                      {emp.totals.TL}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-700 text-[12px]">
                      {emp.totals.total}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && reportData.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-[12px] text-blue-700 leading-relaxed">
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
