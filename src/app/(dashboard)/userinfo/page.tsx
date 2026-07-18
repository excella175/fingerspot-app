"use client";

import { useEffect, useState } from "react";
import { Search, RefreshCw, Users, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";

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
  const [syncing, setSyncing] = useState(false);
  const [editPin, setEditPin] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "sync_users", params: {} }),
      });
      const result = await res.json();
      if (result.success && result.sync) {
        const msg =
          `✅ Sinkron selesai!\n` +
          `PIN ditemukan: ${result.sync.pinsFound}\n` +
          `User baru: ${result.sync.usersCreated}\n` +
          (result.note ? `\n${result.note}` : "");
        alert(msg);
        fetchData();
      } else {
        alert("❌ Gagal: " + (result.error || "Unknown error"));
      }
    } catch {
      alert("❌ Gagal mengirim perintah");
    }
    setSyncing(false);
  };

  const handleEdit = async () => {
    if (!editPin || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/userinfo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: editPin, name: editName.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        setEditPin(null);
        fetchData();
      } else {
        alert("Gagal: " + (result.error || "Unknown error"));
      }
    } catch {
      alert("Gagal menyimpan");
    }
    setSaving(false);
  };

  const handleDelete = async (pin: string) => {
    if (!confirm(`Yakin ingin menghapus user PIN ${pin}?`)) return;
    setDeleting(pin);
    try {
      const res = await fetch(`/api/userinfo?pin=${pin}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        fetchData();
      } else {
        alert("Gagal: " + (result.error || "Unknown error"));
      }
    } catch {
      alert("Gagal menghapus");
    }
    setDeleting(null);
  };

  const totalPages = Math.ceil(total / limit);

  const getPrivilegeLabel = (p: number) => {
    const labels: Record<number, string> = { 1: "User", 2: "Admin", 3: "Sub Admin" };
    return labels[p] || `Level ${p}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
          <Users className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data User</h1>
          <p className="text-[13px] text-gray-400">
            Data user yang tersimpan dari mesin absensi
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[13px] font-medium text-gray-500">
              Cari PIN atau Nama
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchData())}
              placeholder="Ketik PIN atau nama..."
              className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            Cari
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Mengirim..." : "Sinkron dari Mesin"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-medium text-gray-400">PIN</th>
                <th className="px-4 py-3 font-medium text-gray-400">Nama</th>
                <th className="px-4 py-3 font-medium text-gray-400">Privilege</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Fingerprint</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Face</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">RFID</th>
                <th className="px-4 py-3 font-medium text-gray-400">Device ID</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-300">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Memuat...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-300">
                    Tidak ada data. Klik &quot;Sinkron dari Mesin&quot; untuk mengambil data.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-700">{row.pin}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                          row.privilege === 2
                            ? "bg-purple-50 text-purple-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {getPrivilegeLabel(row.privilege)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.finger}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.face}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.rfid}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">
                      {row.deviceCloudId || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setEditPin(row.pin); setEditName(row.name); }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Edit nama"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.pin)}
                          disabled={deleting === row.pin}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors"
                          title="Hapus user"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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

      {editPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditPin(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Edit Nama User</h3>
              <button onClick={() => setEditPin(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-1">
              <label className="block text-[13px] font-medium text-gray-500">PIN</label>
              <p className="mt-0.5 font-mono text-sm text-gray-900">{editPin}</p>
            </div>
            <div className="mb-5">
              <label className="block text-[13px] font-medium text-gray-500">Nama</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditPin(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleEdit}
                disabled={saving || !editName.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
