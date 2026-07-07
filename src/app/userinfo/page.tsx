"use client";

import { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";

interface UserInfoEntry {
  id: string;
  pin: string;
  name: string;
  privilege: number;
  finger: number;
  face: number;
  rfid: number;
  vein: number;
  deviceCloudId: string | null;
  createdAt: string;
}

export default function UserinfoPage() {
  const [data, setData] = useState<UserInfoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const limit = 50;

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.set("search", search);

    fetch(`/api/userinfo?${params}`)
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

  const handleGetAllPin = async () => {
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "get_all_pin", params: {} }),
      });
      const result = await res.json();
      if (result.success) {
        alert("Perintah get_all_pin berhasil dikirim! Data akan muncul via webhook.");
      } else {
        alert("Gagal: " + (result.error || "Unknown error"));
      }
    } catch {
      alert("Gagal mengirim perintah");
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getPrivilegeLabel = (p: number) => {
    const labels: Record<number, string> = { 1: "User", 2: "Admin", 3: "Sub Admin" };
    return labels[p] || `Level ${p}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data User</h1>
        <p className="mt-1 text-sm text-gray-500">
          Data user yang tersimpan dari mesin absensi
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Cari PIN atau Nama
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik PIN atau nama..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            Cari
          </button>
          <button
            onClick={handleGetAllPin}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Sinkron dari Mesin
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">PIN</th>
                <th className="px-4 py-3 font-medium text-gray-500">Nama</th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Privilege
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Fingerprint
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">Face</th>
                <th className="px-4 py-3 font-medium text-gray-500">RFID</th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Device ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data. Klik &quot;Sinkron dari Mesin&quot; untuk
                    mengambil data.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{row.pin}</td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          row.privilege === 2
                            ? "bg-purple-50 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {getPrivilegeLabel(row.privilege)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{row.finger}</td>
                    <td className="px-4 py-3 text-center">{row.face}</td>
                    <td className="px-4 py-3 text-center">{row.rfid}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.deviceCloudId || "-"}
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
