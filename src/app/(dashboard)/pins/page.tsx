"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { ListOrdered, ChevronLeft, ChevronRight } from "lucide-react";

interface PinEntry {
  id: string;
  deviceCloudId: string;
  pin: string;
  total: number | null;
  createdAt: string;
}

export default function PinsPage() {
  const [data, setData] = useState<PinEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/pins?page=${page}&limit=${limit}`)
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 shadow-sm shadow-cyan-200">
        <ListOrdered className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daftar PIN</h1>
          <p className="text-[13px] text-gray-400">
            Daftar PIN / User ID dari mesin absensi
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-medium text-gray-400">PIN</th>
                <th className="px-4 py-3 font-medium text-gray-400">Device Cloud ID</th>
                <th className="px-4 py-3 font-medium text-gray-400">Total User</th>
                <th className="px-4 py-3 font-medium text-gray-400">Diterima Pada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-300">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-300">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">
                      {row.pin}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                      {row.deviceCloudId}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.total || "-"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDateTime(row.createdAt)}
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
