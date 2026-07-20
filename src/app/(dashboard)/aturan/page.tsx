"use client";

import { useEffect, useState } from "react";
import { Gavel, Plus, Pencil, Trash2, X, Search } from "lucide-react";

interface AturanEntry {
  id: string;
  kode: string;
  name: string;
  toleransiTerlambat: number;
  toleransiPulangCepat: number;
  batasAbsensiMasuk: number;
  batasAbsensiPulang: number;
}

export default function AturanPage() {
  const [data, setData] = useState<AturanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ item?: AturanEntry } | null>(null);
  const [form, setForm] = useState({ kode: "", name: "", toleransiTerlambat: 0, toleransiPulangCepat: 0, batasAbsensiMasuk: 0, batasAbsensiPulang: 0 });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/aturan${params}`)
      .then(r => r.json())
      .then(d => { setData(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setForm({ kode: "", name: "", toleransiTerlambat: 0, toleransiPulangCepat: 0, batasAbsensiMasuk: 0, batasAbsensiPulang: 0 });
    setModal({});
  };

  const openEdit = (item: AturanEntry) => {
    setForm({ kode: item.kode, name: item.name, toleransiTerlambat: item.toleransiTerlambat, toleransiPulangCepat: item.toleransiPulangCepat, batasAbsensiMasuk: item.batasAbsensiMasuk, batasAbsensiPulang: item.batasAbsensiPulang });
    setModal({ item });
  };

  const handleSave = async () => {
    if (!form.kode || !form.name) { alert("Kode dan Nama harus diisi"); return; }
    setSaving(true);
    try {
      const isEdit = modal?.item;
      const res = await fetch(`/api/aturan${isEdit ? `?id=${isEdit.id}` : ""}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const r = await res.json();
      if (r.success) { setModal(null); fetchData(); }
      else alert("Gagal: " + (r.error || ""));
    } catch { alert("Gagal menyimpan"); }
    setSaving(false);
  };

  const handleDelete = async (item: AturanEntry) => {
    if (!confirm(`Hapus aturan ${item.kode} - ${item.name}?`)) return;
    try {
      const res = await fetch(`/api/aturan?id=${item.id}`, { method: "DELETE" });
      const r = await res.json();
      if (r.success) fetchData();
      else alert("Gagal: " + (r.error || ""));
    } catch { alert("Gagal menghapus"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
          <Gavel className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Aturan Jam Kerja</h1>
          <p className="text-[13px] text-gray-400">Toleransi terlambat, pulang cepat, dan batas absensi</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchData()} placeholder="Cari kode atau nama aturan..." className="mt-1.5 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-200 transition-colors"><Search className="h-4 w-4" />Cari</button>
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"><Plus className="h-4 w-4" />Tambah Aturan</button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-medium text-gray-400">Kode</th>
                <th className="px-4 py-3 font-medium text-gray-400">Nama Aturan</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Toleransi Terlambat</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Toleransi Pulang Cepat</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Batas Absensi Masuk</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Batas Absensi Pulang</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-300">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-300">Belum ada aturan. Klik Tambah Aturan.</td></tr>
              ) : data.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-gray-700 font-medium">{item.kode}</td>
                  <td className="px-4 py-3 text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.toleransiTerlambat} mnt</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.toleransiPulangCepat} mnt</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.batasAbsensiMasuk} mnt</td>
                  <td className="px-4 py-3 text-center text-gray-600">{item.batasAbsensiPulang} mnt</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(item)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{modal.item ? "Edit Aturan" : "Tambah Aturan"}</h3>
              <button onClick={() => setModal(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-[13px] font-medium text-gray-500">Kode</label><input type="text" value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-[13px] font-medium text-gray-500">Nama Aturan</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[13px] font-medium text-gray-500">Toleransi Terlambat (mnt)</label><input type="number" value={form.toleransiTerlambat} onChange={e => setForm(p => ({ ...p, toleransiTerlambat: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                <div><label className="block text-[13px] font-medium text-gray-500">Toleransi Pulang Cepat (mnt)</label><input type="number" value={form.toleransiPulangCepat} onChange={e => setForm(p => ({ ...p, toleransiPulangCepat: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[13px] font-medium text-gray-500">Batas Absensi Masuk (mnt)</label><input type="number" value={form.batasAbsensiMasuk} onChange={e => setForm(p => ({ ...p, batasAbsensiMasuk: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                <div><label className="block text-[13px] font-medium text-gray-500">Batas Absensi Pulang (mnt)</label><input type="number" value={form.batasAbsensiPulang} onChange={e => setForm(p => ({ ...p, batasAbsensiPulang: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setModal(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
