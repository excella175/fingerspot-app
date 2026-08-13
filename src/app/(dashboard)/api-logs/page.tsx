"use client";

import { useEffect, useState } from "react";
import { formatDateTime, getStatusBadge } from "@/lib/utils";
import { Eye, ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

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
      get_device: "Get Device",
    };
    return labels[cmd] || cmd;
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={ScrollText} title="Riwayat API" description="Riwayat pengiriman perintah API ke mesin absensi" gradient="amber" />

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[13px] font-medium text-gray-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1.5 block rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Semua</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-500">Command</label>
            <select
              value={commandFilter}
              onChange={(e) => setCommandFilter(e.target.value)}
              className="mt-1.5 block rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              <option value="get_device">Get Device</option>
            </select>
          </div>
          <button
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            className="rounded-xl bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-medium text-gray-400">Waktu</th>
                <th className="px-4 py-3 font-medium text-gray-400">Command</th>
                <th className="px-4 py-3 font-medium text-gray-400">Cloud ID</th>
                <th className="px-4 py-3 font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400">Durasi</th>
                <th className="px-4 py-3 font-medium text-gray-400">Error</th>
                <th className="px-4 py-3 font-medium text-gray-400">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-300">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-300">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        {getCommandLabel(row.command)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                      {row.deviceCloudId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${getStatusBadge(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] text-gray-500">
                      {row.duration != null ? `${row.duration}ms` : "-"}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-[12px] text-red-500">
                      {row.errorMessage || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/payload?id=${row.id}&source=api`}
                        className="inline-flex items-center gap-1 rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
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
