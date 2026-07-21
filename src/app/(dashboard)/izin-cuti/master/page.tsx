"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MasterIzinCuti {
  id: string;
  nama: string;
  tipe: string;
  kuota: number;
  masaKerja: number;
  aturPengajuan: number;
  batasPengajuan: number;
  statusAbsensi: string;
  jenisKelamin: string;
  createdAt: string;
}

export default function MasterIzinCutiPage() {
  const [data, setData] = useState<MasterIzinCuti[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MasterIzinCuti | null>(null);
  const [form, setForm] = useState({
    nama: "",
    tipe: "izin",
    kuota: 1,
    masaKerja: 1,
    aturPengajuan: 0,
    batasPengajuan: 1,
    statusAbsensi: "H",
    jenisKelamin: "semua",
  });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/master-izin-cuti");
      const json = await res.json();
      setData(json.data || []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = data.filter((item) =>
    item.nama.toLowerCase().includes(search.toLowerCase()) ||
    item.tipe.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditItem(null);
    setForm({ nama: "", tipe: "izin", kuota: 1, masaKerja: 1, aturPengajuan: 0, batasPengajuan: 1, statusAbsensi: "H", jenisKelamin: "semua" });
    setShowModal(true);
  };

  const openEdit = (item: MasterIzinCuti) => {
    setEditItem(item);
    setForm({
      nama: item.nama,
      tipe: item.tipe,
      kuota: item.kuota,
      masaKerja: item.masaKerja,
      aturPengajuan: item.aturPengajuan,
      batasPengajuan: item.batasPengajuan,
      statusAbsensi: item.statusAbsensi,
      jenisKelamin: item.jenisKelamin,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama) return toast.error("Nama harus diisi");

    try {
      const url = "/api/master-izin-cuti";
      const method = editItem ? "PUT" : "POST";
      const body = editItem ? { ...form, id: editItem.id } : form;

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();

      if (!json.success) throw new Error(json.error || "Gagal");

      toast.success(editItem ? "Berhasil diupdate" : "Berhasil ditambahkan");
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data ini?")) return;
    try {
      const res = await fetch(`/api/master-izin-cuti?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Berhasil dihapus");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus");
    }
  };

  const statusAbsensiOptions = ["H", "I", "S", "A", "C", "DL", "SD", "CT", "OFF"];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Master Izin & Cuti</h1>
          <p className="text-sm text-gray-500">Kelola jenis izin dan cuti karyawan</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Izin / Cuti
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="flex items-center gap-3 px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Cari izin / cuti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
          />
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead>Masa Kerja (Bln)</TableHead>
                <TableHead>Atur Pengajuan</TableHead>
                <TableHead>Batas</TableHead>
                <TableHead>Status Absensi</TableHead>
                <TableHead>Jenis Kelamin</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    Belum ada data
                  </TableCell>
                </TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nama}</TableCell>
                  <TableCell>
                    <Badge variant={item.tipe === "izin" ? "secondary" : "default"}>
                      {item.tipe.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.kuota}</TableCell>
                  <TableCell>{item.masaKerja}</TableCell>
                  <TableCell>{item.aturPengajuan === 0 ? "Mendadak" : `H-${item.aturPengajuan}`}</TableCell>
                  <TableCell>{item.batasPengajuan} hari</TableCell>
                  <TableCell>{item.statusAbsensi}</TableCell>
                  <TableCell className="capitalize">{item.jenisKelamin}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Izin / Cuti" : "Tambah Izin / Cuti"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nama Izin *</label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipe *</label>
              <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="izin">Izin</option>
                <option value="cuti">Cuti</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Kuota Izin *</label>
                <Input type="number" min={1} value={form.kuota} onChange={(e) => setForm({ ...form, kuota: parseInt(e.target.value) || 1 })} />
                <p className="mt-0.5 text-[11px] text-muted-foreground">Periode 1 bulan</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Masa Kerja (Bulan) *</label>
                <Input type="number" min={1} value={form.masaKerja} onChange={(e) => setForm({ ...form, masaKerja: parseInt(e.target.value) || 1 })} />
                <p className="mt-0.5 text-[11px] text-muted-foreground">Minimal masa kerja</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Atur Pengajuan *</label>
                <Input type="number" min={0} value={form.aturPengajuan} onChange={(e) => setForm({ ...form, aturPengajuan: parseInt(e.target.value) || 0 })} />
                <p className="mt-0.5 text-[11px] text-muted-foreground">0 = mendadak</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Batas Satu Pengajuan *</label>
                <Input type="number" min={1} value={form.batasPengajuan} onChange={(e) => setForm({ ...form, batasPengajuan: parseInt(e.target.value) || 1 })} />
                <p className="mt-0.5 text-[11px] text-muted-foreground">Maks hari per pengajuan</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status Absensi</label>
                <select value={form.statusAbsensi} onChange={(e) => setForm({ ...form, statusAbsensi: e.target.value })} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {statusAbsensiOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Jenis Kelamin</label>
                <select value={form.jenisKelamin} onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="semua">Semua Jenis Kelamin</option>
                  <option value="laki-laki">Laki-laki</option>
                  <option value="perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit">
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
