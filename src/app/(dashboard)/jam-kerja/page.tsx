"use client";

import { useEffect, useState } from "react";
import { Briefcase, Plus, Pencil, Trash2, X, Search } from "lucide-react";

interface AturanItem { id: string; kode: string; name: string; }
interface JamKerjaItem {
  id: string; kode: string; name: string; type: string; aturanKode: string; hariKerja: number;
  startTime?: string; endTime?: string; istirahatAktif: boolean; istirahatStart?: string; istirahatEnd?: string;
  lemburAktif: boolean; lemburAwalMin?: number; lemburAwalMax?: number; lemburAkhirMin?: number; lemburAkhirMax?: number;
  maxDuration?: number; cutoffStart?: string; cutoffEnd?: string; lemburMin?: number; lemburMax?: number;
}

export default function JamKerjaPage() {
  const [tab, setTab] = useState<"tetap" | "fleksibel">("tetap");
  const [data, setData] = useState<JamKerjaItem[]>([]);
  const [aturan, setAturan] = useState<AturanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ item?: JamKerjaItem } | null>(null);

  const defaultForm = {
    kode: "", name: "", type: "", aturanKode: "", hariKerja: 5,
    startTime: "", endTime: "", istirahatAktif: false, istirahatStart: "", istirahatEnd: "",
    lemburAktif: false, lemburAwalMin: 0, lemburAwalMax: 0, lemburAkhirMin: 0, lemburAkhirMax: 0,
    maxDuration: 0, cutoffStart: "", cutoffEnd: "", lemburMin: 0, lemburMax: 0,
  };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchAturan = () => fetch("/api/aturan").then(r => r.json()).then(d => setAturan(d.data || [])).catch(() => {});
  const fetchData = () => {
    setLoading(true);
    const params = `?type=${tab}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
    fetch(`/api/jam-kerja${params}`).then(r => r.json()).then(d => { setData(d.data || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAturan(); }, []);
  useEffect(() => { fetchData(); }, [tab]);

  const openAdd = () => { setForm({ ...defaultForm, type: tab as any }); setModal({}); };
  const openEdit = (item: JamKerjaItem) => {
    setForm({
      kode: item.kode, name: item.name, type: item.type, aturanKode: item.aturanKode, hariKerja: item.hariKerja,
      startTime: item.startTime || "", endTime: item.endTime || "",
      istirahatAktif: item.istirahatAktif, istirahatStart: item.istirahatStart || "", istirahatEnd: item.istirahatEnd || "",
      lemburAktif: item.lemburAktif,
      lemburAwalMin: item.lemburAwalMin || 0, lemburAwalMax: item.lemburAwalMax || 0,
      lemburAkhirMin: item.lemburAkhirMin || 0, lemburAkhirMax: item.lemburAkhirMax || 0,
      maxDuration: item.maxDuration || 0, cutoffStart: item.cutoffStart || "", cutoffEnd: item.cutoffEnd || "",
      lemburMin: item.lemburMin || 0, lemburMax: item.lemburMax || 0,
    });
    setModal({ item });
  };

  const calcDuration = () => {
    if (!form.startTime || !form.endTime) return 0;
    const [sh, sm] = form.startTime.split(":").map(Number);
    const [eh, em] = form.endTime.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const handleSave = async () => {
    if (!form.kode || !form.name || !form.aturanKode) { alert("Kode, Nama, dan Aturan harus diisi"); return; }
    if (form.type === "tetap" && (!form.startTime || !form.endTime)) { alert("Jam mulai dan selesai harus diisi"); return; }
    if (form.type === "fleksibel" && (!form.maxDuration || !form.cutoffStart || !form.cutoffEnd)) { alert("Durasi maksimal dan cutoff harus diisi"); return; }
    setSaving(true);
    try {
      const isEdit = modal?.item;
      const res = await fetch(`/api/jam-kerja${isEdit ? `?id=${isEdit.id}` : ""}`, {
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

  const handleDelete = async (item: JamKerjaItem) => {
    if (!confirm(`Hapus jam kerja ${item.kode} - ${item.name}?`)) return;
    try {
      const res = await fetch(`/api/jam-kerja?id=${item.id}`, { method: "DELETE" });
      const r = await res.json();
      if (r.success) fetchData();
      else alert("Gagal: " + (r.error || ""));
    } catch { alert("Gagal menghapus"); }
  };

  const getAturanName = (kode: string) => aturan.find(a => a.kode === kode)?.name || kode;
  const durasi = calcDuration();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50">
          <Briefcase className="h-5 w-5 text-cyan-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Jam Kerja</h1>
          <p className="text-[13px] text-gray-400">Definisi jam kerja tetap dan fleksibel</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
            <button onClick={() => setTab("tetap")} className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all ${tab === "tetap" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Tetap</button>
            <button onClick={() => setTab("fleksibel")} className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all ${tab === "fleksibel" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Fleksibel</button>
          </div>
          <div className="flex-1 min-w-[150px]">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchData()} placeholder="Cari..." className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-200"><Search className="h-4 w-4" />Cari</button>
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 shadow-sm shadow-blue-200"><Plus className="h-4 w-4" />Tambah</button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-medium text-gray-400">Kode</th>
                <th className="px-4 py-3 font-medium text-gray-400">Nama</th>
                <th className="px-4 py-3 font-medium text-gray-400">Aturan</th>
                {tab === "tetap" && <><th className="px-4 py-3 font-medium text-gray-400">Jam Kerja</th><th className="px-4 py-3 text-center font-medium text-gray-400">Istirahat</th><th className="px-4 py-3 text-center font-medium text-gray-400">Lembur</th></>}
                {tab === "fleksibel" && <><th className="px-4 py-3 font-medium text-gray-400">Durasi Maks</th><th className="px-4 py-3 font-medium text-gray-400">Cutoff</th></>}
                <th className="px-4 py-3 text-center font-medium text-gray-400">Hari Kerja</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-300">Memuat...</td></tr>
              : data.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-300">Belum ada data.</td></tr>
              : data.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-gray-700 font-medium">{item.kode}</td>
                  <td className="px-4 py-3 text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-[12px]">{getAturanName(item.aturanKode)}</td>
                  {tab === "tetap" && <>
                    <td className="px-4 py-3 font-mono text-gray-700">{item.startTime} - {item.endTime}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.istirahatAktif ? `${item.istirahatStart}-${item.istirahatEnd}` : "-"}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.lemburAktif ? "Ya" : "Tidak"}</td>
                  </>}
                  {tab === "fleksibel" && <>
                    <td className="px-4 py-3 text-gray-700">{item.maxDuration} mnt</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{item.cutoffStart} - {item.cutoffEnd}</td>
                  </>}
                  <td className="px-4 py-3 text-center text-gray-700">{item.hariKerja} hari</td>
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
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{modal.item ? "Edit Jam Kerja" : "Tambah Jam Kerja"} ({form.type === "tetap" ? "Tetap" : "Fleksibel"})</h3>
              <button onClick={() => setModal(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[13px] font-medium text-gray-500">Kode</label><input type="text" value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                <div><label className="block text-[13px] font-medium text-gray-500">Nama</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[13px] font-medium text-gray-500">Aturan</label>
                  <select value={form.aturanKode} onChange={e => setForm(p => ({ ...p, aturanKode: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Pilih Aturan</option>
                    {aturan.map(a => <option key={a.id} value={a.kode}>{a.kode} - {a.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-[13px] font-medium text-gray-500">Hari Kerja (per minggu)</label><input type="number" min={1} max={7} value={form.hariKerja} onChange={e => setForm(p => ({ ...p, hariKerja: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              </div>

              {form.type === "tetap" && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[13px] font-medium text-gray-500">Jam Mulai</label><input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-[13px] font-medium text-gray-500">Jam Selesai</label><input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                </div>
                {form.startTime && form.endTime && <p className="text-[12px] text-gray-400">Durasi Maksimal: <strong>{durasi} menit</strong> ({Math.floor(durasi / 60)} jam {durasi % 60} menit)</p>}

                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="istirahat" checked={form.istirahatAktif} onChange={e => setForm(p => ({ ...p, istirahatAktif: e.target.checked }))} className="rounded" />
                  <label htmlFor="istirahat" className="text-[13px] font-medium text-gray-600">Aktifkan Istirahat</label>
                </div>
                {form.istirahatAktif && <div className="grid grid-cols-2 gap-3 ml-5">
                  <div><label className="block text-[13px] font-medium text-gray-500">Istirahat Mulai</label><input type="time" value={form.istirahatStart} onChange={e => setForm(p => ({ ...p, istirahatStart: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-[13px] font-medium text-gray-500">Istirahat Selesai</label><input type="time" value={form.istirahatEnd} onChange={e => setForm(p => ({ ...p, istirahatEnd: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                </div>}

                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="lembur" checked={form.lemburAktif} onChange={e => setForm(p => ({ ...p, lemburAktif: e.target.checked }))} className="rounded" />
                  <label htmlFor="lembur" className="text-[13px] font-medium text-gray-600">Aktifkan Lembur</label>
                </div>
                {form.lemburAktif && <div className="grid grid-cols-2 gap-3 ml-5">
                  <div><label className="block text-[13px] font-medium text-gray-500">Lembur Awal Min (mnt)</label><input type="number" value={form.lemburAwalMin} onChange={e => setForm(p => ({ ...p, lemburAwalMin: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-[13px] font-medium text-gray-500">Lembur Awal Max (mnt)</label><input type="number" value={form.lemburAwalMax} onChange={e => setForm(p => ({ ...p, lemburAwalMax: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-[13px] font-medium text-gray-500">Lembur Akhir Min (mnt)</label><input type="number" value={form.lemburAkhirMin} onChange={e => setForm(p => ({ ...p, lemburAkhirMin: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-[13px] font-medium text-gray-500">Lembur Akhir Max (mnt)</label><input type="number" value={form.lemburAkhirMax} onChange={e => setForm(p => ({ ...p, lemburAkhirMax: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                </div>}
              </>}

              {form.type === "fleksibel" && <>
                <div><label className="block text-[13px] font-medium text-gray-500">Durasi Maksimal Bekerja (menit)</label><input type="number" value={form.maxDuration} onChange={e => setForm(p => ({ ...p, maxDuration: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[13px] font-medium text-gray-500">Jam Mulai Cutoff</label><input type="time" value={form.cutoffStart} onChange={e => setForm(p => ({ ...p, cutoffStart: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-[13px] font-medium text-gray-500">Jam Akhir Cutoff</label><input type="time" value={form.cutoffEnd} onChange={e => setForm(p => ({ ...p, cutoffEnd: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="lemburF" checked={form.lemburAktif} onChange={e => setForm(p => ({ ...p, lemburAktif: e.target.checked }))} className="rounded" />
                  <label htmlFor="lemburF" className="text-[13px] font-medium text-gray-600">Aktifkan Lembur</label>
                </div>
                {form.lemburAktif && <div className="grid grid-cols-2 gap-3 ml-5">
                  <div><label className="block text-[13px] font-medium text-gray-500">Lembur Min (mnt)</label><input type="number" value={form.lemburMin} onChange={e => setForm(p => ({ ...p, lemburMin: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-[13px] font-medium text-gray-500">Lembur Max (mnt)</label><input type="number" value={form.lemburMax} onChange={e => setForm(p => ({ ...p, lemburMax: Number(e.target.value) }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
                </div>}
              </>}
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
