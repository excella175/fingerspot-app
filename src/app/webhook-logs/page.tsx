"use client";

import { useEffect, useState } from "react";
import { formatDateTime, getStatusBadge } from "@/lib/utils";
import { Eye } from "lucide-react";
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
      set_userinfo: "Set Userinfo",
      delete_userinfo: "Delete Userinfo",
      get_userid_list: "Get All PIN",
      set_time: "Set Time",
      reg_online: "Register Online",
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "attlog":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "userinfo":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "set_userinfo":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "get_userid_list":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Riwayat Webhook</h1>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat data yang diterima dari mesin absensi via webhook
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipe Webhook
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="attlog">Realtime Attlog</option>
              <option value="userinfo">User Info</option>
              <option value="set_userinfo">Set Userinfo</option>
              <option value="delete_userinfo">Delete Userinfo</option>
              <option value="get_userid_list">Get All PIN</option>
              <option value="set_time">Set Time</option>
              <option value="reg_online">Register Online</option>
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
                <th className="px-4 py-3 font-medium text-gray-500">Tipe</th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Cloud ID
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">
                  Trans ID
                </th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Detail</th>
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
                    <td className="px-4 py-3">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getTypeBadgeColor(row.type)}`}
                      >
                        {getTypeLabel(row.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.deviceCloudId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.transId || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getStatusBadge(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/payload?id=${row.id}&source=webhook`}
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
