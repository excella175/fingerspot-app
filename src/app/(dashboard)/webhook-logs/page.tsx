"use client";

import { useEffect, useState } from "react";
import { formatDateTime, getStatusBadge } from "@/lib/utils";
import { Eye, Webhook, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface WebhookLogEntry {
  id: string;
  type: string;
  deviceCloudId: string;
  transId: string | null;
  status: string;
  createdAt: string;
}

export default function WebhookLogsPage() {
  const [data, setData] = useState<WebhookLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const limit = 50;

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (typeFilter) params.set("type", typeFilter);

    fetch(`/api/webhook-logs?${params}`)
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      attlog: "Realtime Attlog",
      userinfo: "User Info",
      get_userinfo: "Get Userinfo",
      set_userinfo: "Set Userinfo",
      delete_userinfo: "Delete Userinfo",
      get_userid_list: "Get All PIN",
      set_time: "Set Time",
      reg_online: "Register Online",
      restart_device: "Restart Device",
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "attlog":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "userinfo":
      case "get_userinfo":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "set_userinfo":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "get_userid_list":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "restart_device":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-sm shadow-rose-200">
          <Webhook className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Riwayat Webhook</h1>
          <p className="text-[13px] text-gray-400">
            Riwayat data yang diterima dari mesin absensi via webhook
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[13px] font-medium text-gray-500">Tipe Webhook</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1.5 block rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="attlog">Realtime Attlog</option>
              <option value="userinfo">User Info</option>
              <option value="set_userinfo">Set Userinfo</option>
              <option value="delete_userinfo">Delete Userinfo</option>
              <option value="get_userid_list">Get All PIN</option>
              <option value="set_time">Set Time</option>
              <option value="reg_online">Register Online</option>
              <option value="restart_device">Restart Device</option>
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
                <th className="px-4 py-3 font-medium text-gray-400">Tipe</th>
                <th className="px-4 py-3 font-medium text-gray-400">Cloud ID</th>
                <th className="px-4 py-3 font-medium text-gray-400">Trans ID</th>
                <th className="px-4 py-3 font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-400">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-300">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-300">
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
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${getTypeBadgeColor(row.type)}`}
                      >
                        {getTypeLabel(row.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                      {row.deviceCloudId}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                      {row.transId || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${getStatusBadge(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/payload?id=${row.id}&source=webhook`}
                        className="inline-flex items-center gap-1 rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
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
