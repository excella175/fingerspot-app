"use client";

import { useEffect, useState } from "react";
import { Plus, Search, CheckCircle, XCircle, CalendarClock } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const STATUS_BADGE_VARIANT: Record<string, string> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-300",
  approved: "bg-green-100 text-green-800 hover:bg-green-100 border-green-300",
  rejected: "",
};

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
    const map: Record<string, { label: string }> = {
      pending: { label: "Pending" },
      approved: { label: "Disetujui" },
      rejected: { label: "Ditolak" },
    };
    const s = map[status] || { label: status };
    const variant = (STATUS_BADGE_VARIANT[status] || "outline") as "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
    const badgeClass = STATUS_BADGE_CLASS[status] || "";
    return (
      <Badge variant={variant} className={badgeClass}>
        {s.label}
      </Badge>
    );
  };

  const selectedMaster = masterList.find((m) => m.id === form.masterIzinId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-200">
            <CalendarClock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-gray-900">Riwayat Izin & Cuti</h1>
            <p className="text-sm text-gray-500">Daftar pengajuan izin dan cuti karyawan</p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Pengajuan
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Card className="flex-1">
          <CardContent className="flex items-center gap-3 px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Cari karyawan / jenis izin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
            />
          </CardContent>
        </Card>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Selesai</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Belum ada data
                  </TableCell>
                </TableRow>
              ) : filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{getEmployeeName(item.employeePin)}</TableCell>
                  <TableCell>
                    <Badge variant={getMasterTipe(item.masterIzinId) === "cuti" ? "secondary" : "default"}>
                      {getMasterName(item.masterIzinId)}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(item.startDate).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell>{new Date(item.endDate).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{item.catatan || "-"}</TableCell>
                  <TableCell>{statusBadge(item.status)}</TableCell>
                  <TableCell>
                    {item.status === "pending" && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatus(item.id, "approved")}
                          className="text-muted-foreground hover:text-green-600 hover:bg-green-50"
                          title="Setuju"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatus(item.id, "rejected")}
                          className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          title="Tolak"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {item.status !== "pending" && (
                      <span className="text-xs text-muted-foreground">
                        {item.status === "approved" ? "Disetujui" : "Ditolak"}
                      </span>
                    )}
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
            <DialogTitle>Tambah Pengajuan Izin / Cuti</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Karyawan *</label>
              <select value={form.employeePin} onChange={(e) => setForm({ ...form, employeePin: e.target.value })} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" required>
                <option value="">Pilih Karyawan</option>
                {employees.map((emp) => (
                  <option key={emp.pin} value={emp.pin}>{emp.nama} ({emp.pin})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Jenis Izin / Cuti *</label>
              <select value={form.masterIzinId} onChange={(e) => setForm({ ...form, masterIzinId: e.target.value })} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" required>
                <option value="">Pilih Jenis</option>
                {masterList.map((m) => (
                  <option key={m.id} value={m.id}>{m.nama} ({m.tipe.toUpperCase()})</option>
                ))}
              </select>
              {selectedMaster && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Status absensi: <strong>{selectedMaster.statusAbsensi}</strong> | Kuota: <strong>{selectedMaster.kuota}</strong>/bulan
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal Mulai *</label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal Selesai *</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Foto (URL)</label>
              <Input value={form.foto} onChange={(e) => setForm({ ...form, foto: e.target.value })} placeholder="https://..." />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Catatan</label>
              <textarea value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} rows={3} className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
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
