"use client";

import { useEffect, useState } from "react";
import { formatDateTime, getVerifyMethod, getStatusScan } from "@/lib/utils";
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Fingerprint,
} from "lucide-react";

interface AttlogEntry {
  id: string;
  employeePin: string;
  deviceCloudId: string;
  scanTime: string;
  verifyMethod: number | null;
  statusScan: number | null;
  status: string;
  source: string;
  createdAt: string;
}

export default function AttlogPage() {
  const [data, setData] = useState<AttlogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pin, setPin] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fetching, setFetching] = useState(false);
  const limit = 50;

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (pin) params.set("pin", pin);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    fetch(`/api/attlog?${params}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d.data || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchData();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [page, pin, startDate, endDate]);

  const handleFetchFromDevice = async () => {
    if (!startDate || !endDate) {
      alert("Isi tanggal mulai dan tanggal akhir");
      return;
    }
    setFetching(true);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "get_attlog",
          params: { startDate, endDate },
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert("Perintah get_attlog berhasil dikirim ke mesin!");
        setTimeout(fetchData, 2000);
      } else {
        alert("Gagal: " + (result.error || "Unknown error"));
      }
    } catch {
      alert("Gagal mengirim perintah");
    }
    setFetching(false);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Fingerprint className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Absensi</h1>
          <p className="text-[13px] text-gray-400">
            Riwayat scan absensi dari mesin
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[13px] font-medium text-gray-500">
              PIN Karyawan
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Semua"
              className="mt-1.5 block w-36 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-500">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1.5 block rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-500">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1.5 block rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Search className="h-4 w-4" />
            Filter
          </button>
          <button
            onClick={handleFetchFromDevice}
            disabled={fetching}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
          >
            <Download className="h-4 w-4" />
            {fetching ? "Mengirim..." : "Ambil dari Mesin"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-medium text-gray-400">PIN</th>
                <th className="px-4 py-3 font-medium text-gray-400">
                  Waktu Scan
                </th>
                <th className="px-4 py-3 font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-400">
                  Verifikasi
                </th>
                <th className="px-4 py-3 font-medium text-gray-400">
                  Status Scan
                </th>
                <th className="px-4 py-3 font-medium text-gray-400">Sumber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-300"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-300"
                  >
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {row.employeePin}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDateTime(row.scanTime)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                          row.status === "IN"
                            ? "bg-emerald-50 text-emerald-700"
                            : row.status === "OUT"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.verifyMethod
                        ? getVerifyMethod(row.verifyMethod)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.statusScan != null
                        ? getStatusScan(row.statusScan)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                          row.source === "realtime"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {row.source}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-gray-50/30">
            <span className="text-[13px] text-gray-400">
              Total {total.toLocaleString("id-ID")} data
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-[13px] font-medium text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
