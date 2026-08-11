"use client";

import { useEffect, useState } from "react";
import { Briefcase, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

  const openAdd = () => { setForm({ ...defaultForm, type: tab }); setModal({}); };
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 shadow-sm shadow-cyan-200">
          <Briefcase className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Jam Kerja</h1>
          <p className="text-[13px] text-gray-400">Definisi jam kerja tetap dan fleksibel</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              <Button
                variant={tab === "tetap" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTab("tetap")}
                className={tab === "tetap" ? "bg-white text-gray-900 shadow-sm hover:bg-white" : "text-gray-500 hover:text-gray-700"}
              >
                Tetap
              </Button>
              <Button
                variant={tab === "fleksibel" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTab("fleksibel")}
                className={tab === "fleksibel" ? "bg-white text-gray-900 shadow-sm hover:bg-white" : "text-gray-500 hover:text-gray-700"}
              >
                Fleksibel
              </Button>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchData()}
                placeholder="Cari..."
                className="w-full"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <Search className="h-4 w-4" />
              Cari
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Aturan</TableHead>
              {tab === "tetap" && (
                <>
                  <TableHead>Jam Kerja</TableHead>
                  <TableHead className="text-center">Istirahat</TableHead>
                  <TableHead className="text-center">Lembur</TableHead>
                </>
              )}
              {tab === "fleksibel" && (
                <>
                  <TableHead>Durasi Maks</TableHead>
                  <TableHead>Cutoff</TableHead>
                </>
              )}
              <TableHead className="text-center">Hari Kerja</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-gray-300">Memuat...</TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-gray-300">Belum ada data.</TableCell>
              </TableRow>
            ) : data.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-medium text-gray-700">{item.kode}</TableCell>
                <TableCell className="text-gray-900">{item.name}</TableCell>
                <TableCell className="text-[12px] text-gray-500">{getAturanName(item.aturanKode)}</TableCell>
                {tab === "tetap" && (
                  <>
                    <TableCell className="font-mono text-gray-700">{item.startTime} - {item.endTime}</TableCell>
                    <TableCell className="text-center text-gray-600">{item.istirahatAktif ? `${item.istirahatStart}-${item.istirahatEnd}` : "-"}</TableCell>
                    <TableCell className="text-center text-gray-600">{item.lemburAktif ? "Ya" : "Tidak"}</TableCell>
                  </>
                )}
                {tab === "fleksibel" && (
                  <>
                    <TableCell className="text-gray-700">{item.maxDuration} mnt</TableCell>
                    <TableCell className="font-mono text-gray-700">{item.cutoffStart} - {item.cutoffEnd}</TableCell>
                  </>
                )}
                <TableCell className="text-center text-gray-700">{item.hariKerja}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modal?.item ? "Edit Jam Kerja" : "Tambah Jam Kerja"} ({form.type === "tetap" ? "Tetap" : "Fleksibel"})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Kode</label>
                <Input type="text" value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Nama</label>
                <Input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Aturan</label>
                <select value={form.aturanKode} onChange={e => setForm(p => ({ ...p, aturanKode: e.target.value }))} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Pilih Aturan</option>
                  {aturan.map(a => <option key={a.id} value={a.kode}>{a.kode} - {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Hari Kerja</label>
                <Input type="number" min={1} max={7} value={form.hariKerja} onChange={e => setForm(p => ({ ...p, hariKerja: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>

            {form.type === "tetap" && <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Jam Mulai</label>
                  <Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Jam Selesai</label>
                  <Input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} className="mt-1" />
                </div>
              </div>
              {form.startTime && form.endTime && <p className="text-[12px] text-gray-400">Durasi Maksimal: <strong>{durasi} menit</strong> ({Math.floor(durasi / 60)} jam {durasi % 60} menit)</p>}

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="istirahat" checked={form.istirahatAktif} onChange={e => setForm(p => ({ ...p, istirahatAktif: e.target.checked }))} className="rounded" />
                <label htmlFor="istirahat" className="text-[13px] font-medium text-gray-600">Aktifkan Istirahat</label>
              </div>
              {form.istirahatAktif && <div className="grid grid-cols-2 gap-3 ml-5">
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Istirahat Mulai</label>
                  <Input type="time" value={form.istirahatStart} onChange={e => setForm(p => ({ ...p, istirahatStart: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Istirahat Selesai</label>
                  <Input type="time" value={form.istirahatEnd} onChange={e => setForm(p => ({ ...p, istirahatEnd: e.target.value }))} className="mt-1" />
                </div>
              </div>}

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="lembur" checked={form.lemburAktif} onChange={e => setForm(p => ({ ...p, lemburAktif: e.target.checked }))} className="rounded" />
                <label htmlFor="lembur" className="text-[13px] font-medium text-gray-600">Aktifkan Lembur</label>
              </div>
              {form.lemburAktif && <div className="grid grid-cols-2 gap-3 ml-5">
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Lembur Awal Min (mnt)</label>
                  <Input type="number" value={form.lemburAwalMin} onChange={e => setForm(p => ({ ...p, lemburAwalMin: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Lembur Awal Max (mnt)</label>
                  <Input type="number" value={form.lemburAwalMax} onChange={e => setForm(p => ({ ...p, lemburAwalMax: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Lembur Akhir Min (mnt)</label>
                  <Input type="number" value={form.lemburAkhirMin} onChange={e => setForm(p => ({ ...p, lemburAkhirMin: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Lembur Akhir Max (mnt)</label>
                  <Input type="number" value={form.lemburAkhirMax} onChange={e => setForm(p => ({ ...p, lemburAkhirMax: Number(e.target.value) }))} className="mt-1" />
                </div>
              </div>}
            </>}

            {form.type === "fleksibel" && <>
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Durasi Maksimal Bekerja (menit)</label>
                <Input type="number" value={form.maxDuration} onChange={e => setForm(p => ({ ...p, maxDuration: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Jam Mulai Cutoff</label>
                  <Input type="time" value={form.cutoffStart} onChange={e => setForm(p => ({ ...p, cutoffStart: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Jam Akhir Cutoff</label>
                  <Input type="time" value={form.cutoffEnd} onChange={e => setForm(p => ({ ...p, cutoffEnd: e.target.value }))} className="mt-1" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="lemburF" checked={form.lemburAktif} onChange={e => setForm(p => ({ ...p, lemburAktif: e.target.checked }))} className="rounded" />
                <label htmlFor="lemburF" className="text-[13px] font-medium text-gray-600">Aktifkan Lembur</label>
              </div>
              {form.lemburAktif && <div className="grid grid-cols-2 gap-3 ml-5">
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Lembur Min (mnt)</label>
                  <Input type="number" value={form.lemburMin} onChange={e => setForm(p => ({ ...p, lemburMin: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Lembur Max (mnt)</label>
                  <Input type="number" value={form.lemburMax} onChange={e => setForm(p => ({ ...p, lemburMax: Number(e.target.value) }))} className="mt-1" />
                </div>
              </div>}
            </>}
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <Button variant="outline" onClick={() => setModal(null)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
