"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daftar PIN</h1>
        <p className="mt-1 text-sm text-gray-500">
          Daftar PIN / User ID dari mesin absensi
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">PIN</th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Device Cloud ID
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Total User
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Diterima Pada
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium">
                      {row.pin}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.deviceCloudId}
                    </td>
                    <td className="px-4 py-3">{row.total || "-"}</td>
                    <td className="px-4 py-3">
                      {formatDateTime(row.createdAt)}
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
