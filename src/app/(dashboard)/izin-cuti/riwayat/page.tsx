"use client";

import { useEffect, useState } from "react";
import { Plus, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

interface UserInfo {
  pin: string;
  nama: string;
}

interface MasterIzinCuti {
  id: string;
  nama: string;
  tipe: string;
  kuota: number;
  statusAbsensi: string;
}

interface RiwayatItem {
  id: string;
  employeePin: string;
  masterIzinId: string;
  startDate: string;
  endDate: string;
  foto: string | null;
  catatan: string | null;
  status: string;
  createdAt: string;
}

export default function RiwayatIzinCutiPage() {
  const [data, setData] = useState<RiwayatItem[]>([]);
  const [employees, setEmployees] = useState<UserInfo[]>([]);
  const [masterList, setMasterList] = useState<MasterIzinCuti[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState({
    employeePin: "",
    masterIzinId: "",
    startDate: "",
    endDate: "",
    foto: "",
    catatan: "",
  });

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const [resData, resEmp, resMaster] = await Promise.all([
        fetch(`/api/riwayat-izin-cuti?${params}`),
        fetch("/api/userinfo"),
        fetch("/api/master-izin-cuti"),
      ]);

      const jsonData = await resData.json();
      const jsonEmp = await resEmp.json();
      const jsonMaster = await resMaster.json();

      setData(jsonData.data || []);
      setEmployees(jsonEmp.data || []);
      setMasterList(jsonMaster.data || []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const getEmployeeName = (pin: string) => {
    const emp = employees.find((e) => e.pin === pin);
    return emp?.nama || pin;
  };

  const getMasterName = (id: string) => {
    const m = masterList.find((e) => e.id === id);
    return m?.nama || id;
  };

  const getMasterTipe = (id: string) => {
    const m = masterList.find((e) => e.id === id);
    return m?.tipe || "";
  };

  const filtered = data.filter((item) => {
    if (!search) return true;
    const name = getEmployeeName(item.employeePin).toLowerCase();
    const type = getMasterName(item.masterIzinId).toLowerCase();
    return name.includes(search.toLowerCase()) || type.includes(search.toLowerCase());
  });

  const openAdd = () => {
    setForm({ employeePin: "", masterIzinId: "", startDate: "", endDate: "", foto: "", catatan: "" });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeePin || !form.masterIzinId || !form.startDate || !form.endDate) {
      return toast.error("Data harus lengkap");
    }

    try {
      const res = await fetch("/api/riwayat-izin-cuti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal");
      toast.success("Berhasil ditambahkan");
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan");
    }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/riwayat-izin-cuti", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Status diubah ke ${status}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status");
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; class: string }> = {
      pending: { label: "Pending", class: "bg-yellow-100 text-yellow-700" },
      approved: { label: "Disetujui", class: "bg-green-100 text-green-700" },
      rejected: { label: "Ditolak", class: "bg-red-100 text-red-700" },
    };
    const s = map[status] || { label: status, class: "bg-gray-100 text-gray-600" };
    return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.class}`}>{s.label}</span>;
  };

  const selectedMaster = masterList.find((m) => m.id === form.masterIzinId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Riwayat Izin & Cuti</h1>
          <p className="text-sm text-gray-500">Daftar pengajuan izin dan cuti karyawan</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Tambah Pengajuan
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-gray-400" />
          <input className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Cari karyawan / jenis izin..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400">
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600">Karyawan</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Jenis</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Tanggal Mulai</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Tanggal Selesai</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Catatan</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Belum ada data</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{getEmployeeName(item.employeePin)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getMasterTipe(item.masterIzinId) === "cuti" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {getMasterName(item.masterIzinId)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{new Date(item.startDate).toLocaleDateString("id-ID")}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(item.endDate).toLocaleDateString("id-ID")}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-500">{item.catatan || "-"}</td>
                  <td className="px-4 py-3">{statusBadge(item.status)}</td>
                  <td className="px-4 py-3">
                    {item.status === "pending" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleStatus(item.id, "approved")} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-green-50 hover:text-green-600" title="Setuju"><CheckCircle className="h-4 w-4" /></button>
                        <button onClick={() => handleStatus(item.id, "rejected")} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600" title="Tolak"><XCircle className="h-4 w-4" /></button>
                      </div>
                    )}
                    {item.status !== "pending" && (
                      <span className="text-xs text-gray-400">{item.status === "approved" ? "Disetujui" : "Ditolak"}</span>
                    )}
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
            <h2 className="mb-4 text-lg font-bold text-gray-900">Tambah Pengajuan Izin / Cuti</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Karyawan *</label>
                <select value={form.employeePin} onChange={(e) => setForm({ ...form, employeePin: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" required>
                  <option value="">Pilih Karyawan</option>
                  {employees.map((emp) => (
                    <option key={emp.pin} value={emp.pin}>{emp.nama} ({emp.pin})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Jenis Izin / Cuti *</label>
                <select value={form.masterIzinId} onChange={(e) => setForm({ ...form, masterIzinId: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" required>
                  <option value="">Pilih Jenis</option>
                  {masterList.map((m) => (
                    <option key={m.id} value={m.id}>{m.nama} ({m.tipe.toUpperCase()})</option>
                  ))}
                </select>
                {selectedMaster && (
                  <p className="mt-1 text-xs text-gray-400">
                    Status absensi: <strong>{selectedMaster.statusAbsensi}</strong> | Kuota: <strong>{selectedMaster.kuota}</strong>/bulan
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal Mulai *</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal Selesai *</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" required />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Foto (URL)</label>
                <input value={form.foto} onChange={(e) => setForm({ ...form, foto: e.target.value })} placeholder="https://..." className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Catatan</label>
                <textarea value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
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
