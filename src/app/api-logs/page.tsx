"use client";

import { useEffect, useState } from "react";
import { formatDateTime, getStatusBadge } from "@/lib/utils";
import { Eye } from "lucide-react";
import Link from "next/link";

interface ApiLogEntry {
  id: string;
  command: string;
  deviceCloudId: string;
  transId: string | null;
  status: string;
  errorMessage: string | null;
  duration: number | null;
  createdAt: string;
}

export default function ApiLogsPage() {
  const [data, setData] = useState<ApiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [commandFilter, setCommandFilter] = useState("");
  const limit = 50;

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (statusFilter) params.set("status", statusFilter);
    if (commandFilter) params.set("command", commandFilter);

    fetch(`/api/api-logs?${params}`)
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

  const getCommandLabel = (cmd: string) => {
    const labels: Record<string, string> = {
      get_attlog: "Get Attlog",
      get_userinfo: "Get Userinfo",
      set_userinfo: "Set Userinfo",
      delete_userinfo: "Delete Userinfo",
      get_all_pin: "Get All PIN",
      set_time: "Set Time",
      reg_online: "Register Online",
      restart_device: "Restart Mesin",
    };
    return labels[cmd] || cmd;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Riwayat API</h1>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat pengiriman perintah API ke mesin absensi
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Command
            </label>
            <select
              value={commandFilter}
              onChange={(e) => setCommandFilter(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="get_attlog">Get Attlog</option>
              <option value="get_userinfo">Get Userinfo</option>
              <option value="set_userinfo">Set Userinfo</option>
              <option value="delete_userinfo">Delete Userinfo</option>
              <option value="get_all_pin">Get All PIN</option>
              <option value="set_time">Set Time</option>
              <option value="reg_online">Register Online</option>
              <option value="restart_device">Restart Mesin</option>
            </select>
          </div>
          <button
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Filter
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Waktu</th>
                <th className="px-4 py-3 font-medium text-gray-500">Command</th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Cloud ID
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Durasi</th>
                <th className="px-4 py-3 font-medium text-gray-500">Error</th>
                <th className="px-4 py-3 font-medium text-gray-500">Detail</th>
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
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {getCommandLabel(row.command)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.deviceCloudId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getStatusBadge(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.duration != null ? `${row.duration}ms` : "-"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-red-600">
                      {row.errorMessage || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/payload?id=${row.id}&source=api`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
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
