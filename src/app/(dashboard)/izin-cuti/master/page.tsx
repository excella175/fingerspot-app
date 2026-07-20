"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";

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
        <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Tambah Izin / Cuti
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
        <Search className="h-4 w-4 text-gray-400" />
        <input className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Cari izin / cuti..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600">Nama</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Tipe</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Kuota</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Masa Kerja (Bln)</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Atur Pengajuan</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Batas</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status Absensi</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Jenis Kelamin</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Belum ada data</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.nama}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${item.tipe === "cuti" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {item.tipe.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.kuota}</td>
                  <td className="px-4 py-3 text-gray-600">{item.masaKerja}</td>
                  <td className="px-4 py-3 text-gray-600">{item.aturPengajuan === 0 ? "Mendadak" : `H-${item.aturPengajuan}`}</td>
                  <td className="px-4 py-3 text-gray-600">{item.batasPengajuan} hari</td>
                  <td className="px-4 py-3 text-gray-600">{item.statusAbsensi}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{item.jenisKelamin}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(item)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{editItem ? "Edit Izin / Cuti" : "Tambah Izin / Cuti"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nama Izin *</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" required />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tipe *</label>
                <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400">
                  <option value="izin">Izin</option>
                  <option value="cuti">Cuti</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Kuota Izin *</label>
                  <input type="number" min={1} value={form.kuota} onChange={(e) => setForm({ ...form, kuota: parseInt(e.target.value) || 1 })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  <p className="mt-0.5 text-[11px] text-gray-400">Periode 1 bulan</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Masa Kerja (Bulan) *</label>
                  <input type="number" min={1} value={form.masaKerja} onChange={(e) => setForm({ ...form, masaKerja: parseInt(e.target.value) || 1 })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  <p className="mt-0.5 text-[11px] text-gray-400">Minimal masa kerja</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Atur Pengajuan *</label>
                  <input type="number" min={0} value={form.aturPengajuan} onChange={(e) => setForm({ ...form, aturPengajuan: parseInt(e.target.value) || 0 })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  <p className="mt-0.5 text-[11px] text-gray-400">0 = mendadak</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Batas Satu Pengajuan *</label>
                  <input type="number" min={1} value={form.batasPengajuan} onChange={(e) => setForm({ ...form, batasPengajuan: parseInt(e.target.value) || 1 })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
                  <p className="mt-0.5 text-[11px] text-gray-400">Maks hari per pengajuan</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status Absensi</label>
                  <select value={form.statusAbsensi} onChange={(e) => setForm({ ...form, statusAbsensi: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400">
                    {statusAbsensiOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Jenis Kelamin</label>
                  <select value={form.jenisKelamin} onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400">
                    <option value="semua">Semua Jenis Kelamin</option>
                    <option value="laki-laki">Laki-laki</option>
                    <option value="perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50">Batal</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
