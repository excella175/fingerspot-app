"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Gavel, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";

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
    if (!form.kode || !form.name) { toast.error("Kode dan Nama harus diisi"); return; }
    setSaving(true);
    try {
      const isEdit = modal?.item;
      const res = await fetch(`/api/aturan${isEdit ? `?id=${isEdit.id}` : ""}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const r = await res.json();
      if (r.success) { setModal(null); fetchData(); toast.success(isEdit ? "Aturan berhasil diupdate" : "Aturan berhasil ditambahkan"); }
      else toast.error(r.error || "Gagal menyimpan aturan");
    } catch { toast.error("Gagal menyimpan aturan"); }
    setSaving(false);
  };

  const handleDelete = async (item: AturanEntry) => {
    if (!confirm(`Hapus aturan ${item.kode} - ${item.name}?`)) return;
    try {
      const res = await fetch(`/api/aturan?id=${item.id}`, { method: "DELETE" });
      const r = await res.json();
      if (r.success) { fetchData(); toast.success("Aturan berhasil dihapus"); }
      else toast.error(r.error || "Gagal menghapus aturan");
    } catch { toast.error("Gagal menghapus aturan"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Gavel} title="Aturan Jam Kerja" description="Toleransi terlambat, pulang cepat, dan batas absensi" gradient="amber" />

      <Card>
        <CardContent className="p-5 pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchData()}
                placeholder="Cari kode atau nama aturan..."
                className="w-full"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <Search className="h-4 w-4" />
              Cari
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Tambah Aturan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Aturan</TableHead>
              <TableHead className="text-center">Toleransi Terlambat</TableHead>
              <TableHead className="text-center">Toleransi Pulang Cepat</TableHead>
              <TableHead className="text-center">Batas Absensi Masuk</TableHead>
              <TableHead className="text-center">Batas Absensi Pulang</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-gray-300">Memuat...</TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-gray-300">Belum ada aturan. Klik Tambah Aturan.</TableCell>
              </TableRow>
            ) : data.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-medium text-gray-700">{item.kode}</TableCell>
                <TableCell className="text-gray-900">{item.name}</TableCell>
                <TableCell className="text-center text-gray-600">{item.toleransiTerlambat} mnt</TableCell>
                <TableCell className="text-center text-gray-600">{item.toleransiPulangCepat} mnt</TableCell>
                <TableCell className="text-center text-gray-600">{item.batasAbsensiMasuk} mnt</TableCell>
                <TableCell className="text-center text-gray-600">{item.batasAbsensiPulang} mnt</TableCell>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{modal?.item ? "Edit Aturan" : "Tambah Aturan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-gray-500">Kode</label>
              <Input type="text" value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-500">Nama Aturan</label>
              <Input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Toleransi Terlambat (mnt)</label>
                <Input type="number" value={form.toleransiTerlambat} onChange={e => setForm(p => ({ ...p, toleransiTerlambat: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Toleransi Pulang Cepat (mnt)</label>
                <Input type="number" value={form.toleransiPulangCepat} onChange={e => setForm(p => ({ ...p, toleransiPulangCepat: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Batas Absensi Masuk (mnt)</label>
                <Input type="number" value={form.batasAbsensiMasuk} onChange={e => setForm(p => ({ ...p, batasAbsensiMasuk: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Batas Absensi Pulang (mnt)</label>
                <Input type="number" value={form.batasAbsensiPulang} onChange={e => setForm(p => ({ ...p, batasAbsensiPulang: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
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
