"use client";

import { useEffect, useState } from "react";
import { formatDateTime, getVerifyMethod, getStatusScan } from "@/lib/utils";
import { Download, Search } from "lucide-react";

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Absensi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat scan absensi dari mesin
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              PIN Karyawan
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Semua"
              className="mt-1 block w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Search className="h-4 w-4" />
            Filter
          </button>
          <button
            onClick={handleFetchFromDevice}
            disabled={fetching}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {fetching ? "Mengirim..." : "Ambil dari Mesin"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">PIN</th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Waktu Scan
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Verifikasi
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Status Scan
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">Sumber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{row.employeePin}</td>
                    <td className="px-4 py-3">{formatDateTime(row.scanTime)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          row.status === "IN"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.verifyMethod
                        ? getVerifyMethod(row.verifyMethod)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {row.statusScan != null
                        ? getStatusScan(row.statusScan)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          row.source === "realtime"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-700"
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
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <span className="text-sm text-gray-500">
              Total {total.toLocaleString("id-ID")} data
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
