"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Download, CalendarClock, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Employee {
  pin: string;
  name: string;
}

interface ReportEntry {
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

const STATUS_LABELS: Record<string, string> = {
  H: "Hadir",
  A: "Alpha",
  I: "Izin",
  S: "Sakit",
  C: "Cuti",
  L: "Libur",
  TL: "Terlambat",
};

const STATUS_COLORS: Record<string, string> = {
  H: "bg-green-50 text-green-700 border-green-200",
  A: "bg-red-50 text-red-700 border-red-200",
  I: "bg-yellow-50 text-yellow-700 border-yellow-200",
  S: "bg-blue-50 text-blue-700 border-blue-200",
  C: "bg-purple-50 text-purple-700 border-purple-200",
  L: "bg-gray-100 text-gray-500 border-gray-200",
  TL: "bg-orange-50 text-orange-700 border-orange-200",
};

function formatTime(val: string | null) {
  if (!val) return "-";
  const parts = val.split(":");
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return val;
}

export default function ReportDetailPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [employeePin, setEmployeePin] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [report, setReport] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/userinfo?limit=9999")
      .then((r) => r.json())
      .then((d) => {
        const list: Employee[] = (d.data || []).map((u: any) => ({
          pin: u.pin,
          name: u.name,
        }));
        setEmployees(list);
      })
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ command: "detail", month, year });
    if (employeePin) params.set("employeePin", employeePin);

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
  }, [month, year, employeePin]);

  useEffect(() => {
    fetchReport();
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
      a.download = `laporan-detail-${month}-${year}.xlsx`;
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
      const title = `Laporan Detail ${month}/${year}`;
      doc.setFontSize(14);
      doc.text(title, 14, 16);
      doc.setFontSize(8);
      doc.text(`Diexport: ${new Date().toLocaleDateString("id-ID")}`, 14, 22);

      const headers = [
        [
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

      doc.save(`laporan-detail-${month}-${year}.pdf`);
    } catch {
      alert("Gagal export PDF");
    }
    setExporting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
          <CalendarClock className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Laporan Detail</h1>
          <p className="text-[13px] text-gray-400">
            Perincian absensi harian per karyawan
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="block text-[13px] font-medium text-gray-500">
              Bulan / Tahun
            </label>
            <input
              type="month"
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-");
                setYear(y);
                setMonth(m);
              }}
              className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="block text-[13px] font-medium text-gray-500">
              Karyawan
            </label>
            <select
              value={employeePin}
              onChange={(e) => setEmployeePin(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Semua Karyawan</option>
              {employees.map((emp) => (
                <option key={emp.pin} value={emp.pin}>
                  {emp.name} ({emp.pin})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
          >
            <Search className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Memuat..." : "Tampilkan"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleExportExcel}
            disabled={report.length === 0 || exporting !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-200"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "excel" ? "Mengexport..." : "Export Excel"}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={report.length === 0 || exporting !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm shadow-red-200"
          >
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? "Mengexport..." : "Export PDF"}
          </button>
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
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-400">Tanggal</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-400">Hari</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-400">Jadwal Masuk</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-400">Jadwal Pulang</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-400">Scan Masuk</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-400">Scan Pulang</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-gray-400">Status</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-400">Telat (menit)</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-400">Pulang Cepat</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-400">Lembur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-300">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : report.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-300">
                    {employeePin
                      ? "Tidak ada data untuk karyawan yang dipilih"
                      : "Pilih periode dan klik Tampilkan untuk melihat laporan"}
                  </td>
                </tr>
              ) : (
                report.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-700">{row.date}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{row.dayName}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-700">
                      {formatTime(row.scheduledStart)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-700">
                      {formatTime(row.scheduledEnd)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-700">
                      {formatTime(row.scanIn)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-700">
                      {formatTime(row.scanOut)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                          STATUS_COLORS[row.status] || "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {row.status} - {STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-gray-700">
                      {row.lateMinutes > 0 ? (
                        <span className="text-orange-600">{row.lateMinutes}</span>
                      ) : (
                        row.lateMinutes
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-gray-700">
                      {row.earlyLeaveMinutes > 0 ? (
                        <span className="text-orange-600">{row.earlyLeaveMinutes}</span>
                      ) : (
                        row.earlyLeaveMinutes
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-gray-700">
                      {row.overtimeMinutes > 0 ? (
                        <span className="text-emerald-600">{row.overtimeMinutes}</span>
                      ) : (
                        row.overtimeMinutes
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {report.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-900">Ringkasan</h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-1.5 text-[13px] text-gray-600">
              Total Hari: <strong className="text-gray-900">{summary.total}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-1.5 text-[13px] text-green-700">
              H: <strong>{summary.H}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-[13px] text-red-700">
              A: <strong>{summary.A}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-50 px-3 py-1.5 text-[13px] text-yellow-700">
              I: <strong>{summary.I}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-[13px] text-blue-700">
              S: <strong>{summary.S}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 px-3 py-1.5 text-[13px] text-purple-700">
              C: <strong>{summary.C}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-[13px] text-gray-500">
              L: <strong>{summary.L}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5 text-[13px] text-orange-700">
              TL: <strong>{summary.TL}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
