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

interface PinItem {
  pin: string;
  name: string;
  checked: boolean;
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
  const [pinPopupOpen, setPinPopupOpen] = useState(false);
  const [pinList, setPinList] = useState<PinItem[]>([]);
  const [findingPins, setFindingPins] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingNames, setFetchingNames] = useState(false);
  const [appUrl, setAppUrl] = useState("");
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
    setAppUrl(window.location.origin);
  }, [page]);

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

  const handleFindPins = async () => {
    setFindingPins(true);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "find_pins", params: {} }),
      });
      const result = await res.json();
      if (result.success && result.pins) {
        const existing = await fetch("/api/userinfo?limit=9999").then(r => r.json());
        const existingPins = new Set((existing.data || []).map((u: UserInfoEntry) => u.pin));

        const items: PinItem[] = result.pins.map((p: any) => ({
          pin: String(p.pin ?? p),
          name: p.name || "",
          checked: !existingPins.has(String(p.pin ?? p)),
        }));
        setPinList(items);
        setPinPopupOpen(true);
      } else {
        alert("❌ Gagal: " + (result.error || "Tidak ada PIN ditemukan"));
      }
    } catch {
      alert("❌ Gagal mencari PIN");
    }
    setFindingPins(false);
  };

  const handleSaveSelectedPins = async () => {
    const selected = pinList.filter(p => p.checked);
    if (selected.length === 0) {
      alert("Pilih minimal 1 PIN untuk disimpan");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "save_selected_pins",
          params: {},
          pins: selected.map(p => ({ pin: p.pin, name: p.name || `User ${p.pin}` })),
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`✅ ${result.usersCreated} user baru, ${result.usersUpdated} diupdate dari ${result.totalPins} PIN`);
        setPinPopupOpen(false);
        fetchData();
      } else {
        alert("❌ Gagal: " + (result.error || "Unknown error"));
      }
    } catch {
      alert("❌ Gagal menyimpan");
    }
    setSaving(false);
  };

  const toggleAll = (checked: boolean) => {
    setPinList(prev => prev.map(p => ({ ...p, checked })));
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
            onClick={() => { setPage(1); fetchData(); }}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Search className="h-4 w-4" />
            Cari
          </button>
          <button
            onClick={handleFindPins}
            disabled={findingPins}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
          >
            <RefreshCw className={`h-4 w-4 ${findingPins ? "animate-spin" : ""}`} />
            {findingPins ? "Mencari..." : "Cari PIN dari Mesin"}
          </button>
          <button
            onClick={async () => {
              setRefreshing(true);
              try {
                const res = await fetch("/api/fingerspot", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ command: "refresh_names", params: {} }),
                });
                const r = await res.json();
                alert(r.message || (r.success ? "OK" : "Gagal"));
              } catch {
                alert("Gagal");
              }
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-200"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Mengirim..." : "Refresh Nama via Webhook"}
          </button>
          <button
            onClick={async () => {
              setFetchingNames(true);
              const unnamed = data.filter(u => u.name.startsWith("User ")).map(u => u.pin);
              if (unnamed.length === 0) { alert("Semua user sudah punya nama"); setFetchingNames(false); return; }
              try {
                const res = await fetch("/api/fingerspot", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ command: "try_fetch_userinfo", pins: unnamed }),
                });
                const r = await res.json();
                if (r.success) {
                  let msg = `${r.gotNames} nama didapat, ${r.ackOnly} masih ACK (via webhook)`;
                  if (r.gotNames > 0) {
                    // update names in DB
                    for (const item of r.results) {
                      if (item.name) {
                        await fetch("/api/userinfo", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ pin: item.pin, name: item.name }),
                        });
                      }
                    }
                    msg += ". Nama sudah disimpan!";
                    fetchData();
                  }
                  alert(msg);
                } else {
                  alert("Gagal: " + (r.error || "Unknown"));
                }
              } catch { alert("Gagal"); }
              setFetchingNames(false);
            }}
            disabled={fetchingNames || data.filter(u => u.name.startsWith("User ")).length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm shadow-amber-200"
          >
            <RefreshCw className={`h-4 w-4 ${fetchingNames ? "animate-spin" : ""}`} />
            {fetchingNames ? "Memuat..." : "Ambil Nama Langsung"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-[12px] text-blue-700 leading-relaxed">
        <strong>Info:</strong> Nama user otomatis terisi saat mesin mengirim callback webhook.
        Pastikan Webhook URL di <code className="bg-blue-100 px-1 rounded">developer.fingerspot.io</code> → Device → Detail sudah diisi:
        <code className="bg-blue-100 px-1 rounded block mt-1 break-all">{appUrl || "https://..."}/api/webhook/fingerspot</code>
        <br />Tombol <strong>"Ambil Nama Langsung"</strong> mencoba ambil data langsung dari API (berhasil tergantung tipe mesin).
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
                    Tidak ada data. Klik &quot;Cari PIN dari Mesin&quot; untuk mengambil data.
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

      {pinPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPinPopupOpen(false)}>
          <div className="w-full max-w-lg max-h-[80vh] rounded-2xl bg-white p-6 shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">
                Pilih PIN untuk Disimpan ({pinList.length} ditemukan)
              </h3>
              <button onClick={() => setPinPopupOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-3 text-[13px]">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-700">
                <input type="checkbox" checked={pinList.every(p => p.checked)} onChange={(e) => toggleAll(e.target.checked)} className="rounded" />
                Pilih Semua
              </label>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">Centang PIN yang ingin disimpan ke database</span>
            </div>
            <div className="overflow-y-auto flex-1 border border-gray-100 rounded-xl">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="w-10 px-3 py-2"></th>
                    <th className="px-3 py-2 font-medium text-gray-400">PIN</th>
                    <th className="px-3 py-2 font-medium text-gray-400">Nama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pinList.map((item) => (
                    <tr key={item.pin} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => setPinList(prev => prev.map(p => p.pin === item.pin ? { ...p, checked: !p.checked } : p))}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-700">{item.pin}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => setPinList(prev => prev.map(p => p.pin === item.pin ? { ...p, name: e.target.value } : p))}
                          placeholder={`User ${item.pin}`}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setPinPopupOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSelectedPins}
                disabled={saving || pinList.filter(p => p.checked).length === 0}
                className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Menyimpan..." : `Simpan ${pinList.filter(p => p.checked).length} PIN`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
