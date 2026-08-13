"use client";

import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import {
  Search, RefreshCw, Users, ChevronLeft, ChevronRight,
  Pencil, Trash2, Upload, Download, Plus,
  CheckSquare, Square, Loader2, Database, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface UserInfoEntry {
  id: string;
  pin: string;
  name: string;
  privilege: number;
  finger: number;
  face: number;
  rfid: number;
  vein: number;
  password?: string | null;
  facePhoto?: string | null;
  template?: string | null;
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
  const [syncStatus, setSyncStatus] = useState("");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Edit dialog
  const [editPin, setEditPin] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFacePhoto, setEditFacePhoto] = useState<string | null>(null);
  const [editFacePreview, setEditFacePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const editFileRef = useRef<HTMLInputElement>(null);

  // Add dialog
  const [showAdd, setShowAdd] = useState(false);
  const [addPin, setAddPin] = useState("");
  const [addName, setAddName] = useState("");
  const [addPrivilege, setAddPrivilege] = useState("1");
  const [addPassword, setAddPassword] = useState("");
  const [addRfid, setAddRfid] = useState("");
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState("");

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    mode: "single" | "bulk";
    pins: string[];
  } | null>(null);

  // Bulk sync to device
  const [bulkSyncing, setBulkSyncing] = useState(false);

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kantor & Jabatan
  const [kantors, setKantors] = useState<{ id: string; nama: string; jabatans: { id: string; nama: string }[] }[]>([]);
  const [editKantorId, setEditKantorId] = useState("");
  const [editJabatanId, setEditJabatanId] = useState("");

  // Delete single
  const [deletingPins, setDeletingPins] = useState<Set<string>>(new Set());

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limit = 50;

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
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

  useEffect(() => { fetchData(); }, [page]);

  // Devices for multi-device sync
  const [devices, setDevices] = useState<{ id: string; cloudId: string; name: string }[]>([]);
  const [syncDeviceId, setSyncDeviceId] = useState(""); // "" = default env (legacy)
  const [pushDialog, setPushDialog] = useState<{ cloudId: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/device")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.length > 0) {
          setDevices(d.data);
          setSyncDeviceId(d.data[0].cloudId);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/kantor")
      .then((r) => r.json())
      .then((d) => setKantors(d.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ---- Sync from device ----
  const handleSync = async () => {
    if (!syncDeviceId) { toast.error("Tidak ada mesin terdaftar. Tambah mesin di halaman Perangkat dulu."); return; }
    setSyncing(true);
    setSyncStatus("Mengirim perintah ke mesin...");
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "get_all_pin", params: { cloudId: syncDeviceId } }),
      });
      const r = await res.json();
      if (r.success) {
        setSyncStatus("Perintah terkirim! Menunggu data dari mesin...");
        if (pollRef.current) clearInterval(pollRef.current);
        let attempts = 0;
        const initialTotal = total;
        pollRef.current = setInterval(async () => {
          attempts++;
          const res2 = await fetch(`/api/userinfo?page=1&limit=1`);
          const d2 = await res2.json();
          if (d2.total > initialTotal || attempts > 30) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setSyncing(false);
            setSyncStatus(d2.total > initialTotal ? `✅ ${d2.total} user tersimpan` : "⏱ Waktu habis, cek nanti");
            setPage(1);
            fetchData();
            setTimeout(() => setSyncStatus(""), 5000);
          }
        }, 5000);
      } else {
        setSyncStatus("❌ Gagal: " + (r.error || "Perintah ditolak"));
        setSyncing(false);
        setTimeout(() => setSyncStatus(""), 5000);
      }
    } catch {
      setSyncStatus("❌ Gagal mengirim perintah");
      setSyncing(false);
      setTimeout(() => setSyncStatus(""), 5000);
    }
  };

  // ---- Selection ----
  const toggleSelect = (pin: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pin)) next.delete(pin); else next.add(pin);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((d) => d.pin)));
    }
  };

  // ---- Edit (save to DB only) ----
  const handleEdit = async () => {
    if (!editPin || !editName.trim()) return;
    setSaving(true);
    setEditStatus("");
    try {
      const res = await fetch("/api/userinfo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: editPin,
          name: editName.trim(),
          facePhoto: editFacePhoto || null,
          kantorId: editKantorId || null,
          jabatanId: editJabatanId || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setEditStatus("✅ Tersimpan di database");
        toast.success("Perubahan tersimpan");
        fetchData();
      } else {
        setEditStatus("❌ " + (result.error || "Gagal"));
        toast.error(result.error || "Gagal menyimpan perubahan");
      }
    } catch {
      setEditStatus("❌ Gagal menyimpan");
      toast.error("Gagal menyimpan perubahan");
    }
    setSaving(false);
  };

  // ---- Face photo upload ----
  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/jpeg") && !file.type.startsWith("image/png")) {
      toast.error("Hanya file JPEG/PNG yang diizinkan");
      return;
    }

    if (file.size > 100 * 1024) {
      toast.error("Foto maksimal 100KB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]; // remove data:image/... prefix
      setEditFacePhoto(base64);
      setEditFacePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (editFileRef.current) editFileRef.current.value = "";
  };

  // ---- Delete execution ----
  const executeDelete = async (pins: string[], syncToDevice: boolean) => {
    setDeleteDialog(null);

    if (pins.length === 1 && !syncToDevice) {
      // Single delete, DB only
      setDeletingPins((prev) => new Set(prev).add(pins[0]));
      try {
        const res = await fetch(`/api/userinfo?pin=${pins[0]}&syncToDevice=false`, { method: "DELETE" });
        const result = await res.json();
        if (result.success) {
          setSelected((prev) => { const n = new Set(prev); n.delete(pins[0]); return n; });
          toast.success("User berhasil dihapus");
          fetchData();
        }
      } catch {}
      setDeletingPins((prev) => { const n = new Set(prev); n.delete(pins[0]); return n; });
      return;
    }

    // Bulk or sync to device — use bulk endpoint
    setDeletingPins((prev) => new Set([...prev, ...pins]));
    try {
      const res = await fetch("/api/userinfo/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pins, syncToDevice }),
      });
      const result = await res.json();
      if (result.success) {
        setSelected(new Set());
        setPage(1);
        toast.success(`${pins.length} user berhasil dihapus`);
        fetchData();
      } else {
        toast.error(result.error || "Gagal menghapus user");
      }
    } catch {
      toast.error("Gagal menghapus user");
    }
    setDeletingPins((prev) => {
      const n = new Set(prev);
      pins.forEach((p) => n.delete(p));
      return n;
    });
  };

  // ---- Bulk sync to device ----
  const handleBulkSync = async (cloudId: string) => {
    const pins = Array.from(selected);
    if (pins.length === 0) return;
    setPushDialog(null);
    setBulkSyncing(true);
    let success = 0;
    let failed = 0;
    for (const pin of pins) {
      try {
        const res = await fetch("/api/userinfo/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, cloudId }),
        });
        const result = await res.json();
        if (result.success) success++; else failed++;
      } catch { failed++; }
    }
    setBulkSyncing(false);
    setSyncStatus(`✅ ${success} user dikirim ke mesin${failed ? `, ${failed} gagal` : ""}`);
    toast.success(`${success} user berhasil dikirim ke mesin`);
    setTimeout(() => setSyncStatus(""), 5000);
  };

  // ---- Add user ----
  const handleAdd = async () => {
    if (!addPin.trim() || !addName.trim()) { toast.error("PIN dan nama harus diisi"); return; }
    setAdding(true);
    setAddStatus("Mengirim ke mesin...");
    try {
      const res = await fetch("/api/userinfo/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: addPin.trim(),
          name: addName.trim(),
          privilege: addPrivilege,
          password: addPassword,
          rfid: addRfid,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setAddStatus("✅ Perintah terkirim! Tunggu webhook, data akan muncul setelah sinkron.");
        toast.success("Perintah tambah user berhasil dikirim ke mesin");
        setAddPin(""); setAddName(""); setAddPassword(""); setAddRfid("");
        setTimeout(() => { setShowAdd(false); setAddStatus(""); }, 3000);
      } else {
        setAddStatus("❌ " + (result.message || result.error || "Gagal"));
        toast.error(result.message || result.error || "Gagal menambahkan user");
      }
    } catch {
      setAddStatus("❌ Gagal mengirim perintah");
      toast.error("Gagal mengirim perintah");
    }
    setAdding(false);
  };

  // ---- Export Excel ----
  const handleExport = () => {
    const a = document.createElement("a");
    a.href = "/api/userinfo/excel";
    a.download = `data-user-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
  };

  // ---- Import Excel (preview dulu) ----
  const [preview, setPreview] = useState<{
    total: number; valid: number; errors: number; warnings: number;
    rows: { rowIndex: number; pin: string; name: string; kantorName: string; jabatanName: string; valid: boolean; errors: string[]; warnings: string[]; kantorFound: boolean; jabatanFound: boolean }[];
  } | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus("Mengecek file...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/userinfo/excel/preview", { method: "POST", body: fd });
      const result = await res.json();
      if (result.success) {
        setPreview(result);
        setPreviewFile(file);
      } else {
        setImportStatus("❌ " + (result.error || "Gagal membaca file"));
        toast.error(result.error || "Gagal membaca file Excel");
      }
    } catch {
      setImportStatus("❌ Gagal membaca file");
      toast.error("Gagal membaca file Excel");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = async () => {
    if (!previewFile) return;
    setImporting(true);
    setImportStatus("Mengimport...");
    try {
      const fd = new FormData();
      fd.append("file", previewFile);
      const res = await fetch("/api/userinfo/excel", { method: "POST", body: fd });
      const result = await res.json();
      setImportStatus(result.success
        ? `✅ ${result.message}`
        : "❌ " + (result.error || "Gagal import"));
      if (result.success) {
        setPreview(null); setPage(1); fetchData();
        toast.success(result.message || "Import Excel berhasil");
      } else {
        toast.error(result.error || "Gagal import file");
      }
    } catch {
      setImportStatus("❌ Gagal import file");
      toast.error("Gagal import file Excel");
    }
    setImporting(false);
  };

  const totalPages = Math.ceil(total / limit);
  const getPrivilegeLabel = (p: number) => {
    const labels: Record<number, string> = { 1: "User", 2: "Admin", 3: "Sub Admin" };
    return labels[p] || `Level ${p}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-200">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-bold tracking-tight text-gray-900">Data User</h1>
          <p className="text-[13px] text-gray-400">Data user dari mesin absensi</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          <Button variant="outline" onClick={handleExport} title="Export Excel">
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} title="Import Excel">
            <Upload className="h-4 w-4 mr-1.5" /> Import
          </Button>
          <Button variant="outline" onClick={() => setShowAdd(true)} title="Tambah User Baru">
            <Plus className="h-4 w-4 mr-1.5" /> Tambah
          </Button>
        </div>
      </div>

      {importStatus && (
        <div className={`rounded-xl p-3 text-[13px] ${
          importStatus.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {importStatus}
          <button className="ml-2 text-[11px] underline" onClick={() => setImportStatus("")}>tutup</button>
        </div>
      )}

      {/* Search + Sync */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">Cari PIN atau Nama</label>
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), fetchData())}
                placeholder="Ketik PIN atau nama..."
              />
            </div>
            <Button variant="secondary" onClick={() => { setPage(1); fetchData(); }}>
              <Search className="h-4 w-4 mr-1.5" /> Cari
            </Button>
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">Mesin</label>
              <select
                value={syncDeviceId}
                onChange={(e) => setSyncDeviceId(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 min-w-[180px]"
              >
                {devices.length === 0 && <option value="">Belum ada mesin</option>}
                {devices.map((d) => (
                  <option key={d.cloudId} value={d.cloudId}>{d.name} ({d.cloudId})</option>
                ))}
              </select>
            </div>
            <Button onClick={handleSync} disabled={syncing || devices.length === 0}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Menunggu data..." : "Ambil Data User dari Mesin"}
            </Button>
          </div>
          {syncStatus && (
            <div className={`mt-3 rounded-xl p-3 text-[13px] ${
              syncStatus.startsWith("✅") ? "bg-green-50 text-green-700" :
              syncStatus.startsWith("❌") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
            }`}>
              {syncStatus}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/50 px-5 py-3">
          <span className="text-[13px] font-medium text-blue-700">
            {selected.size} user terpilih
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary" size="sm"
              onClick={() => setPushDialog({ cloudId: null })}
              disabled={bulkSyncing}
            >
              {bulkSyncing
                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                : <Monitor className="h-4 w-4 mr-1.5" />
              }
              Turunkan ke Mesin
            </Button>
            <Button
              variant="destructive" size="sm"
              onClick={() => setDeleteDialog({ mode: "bulk", pins: Array.from(selected) })}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Hapus
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <button onClick={toggleSelectAll} className="p-0.5">
                  {selected.size === data.length && data.length > 0
                    ? <CheckSquare className="h-4 w-4 text-blue-600" />
                    : <Square className="h-4 w-4 text-gray-400" />
                  }
                </button>
              </TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kantor</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Privilege</TableHead>
              <TableHead className="text-center">Fingerprint</TableHead>
              <TableHead className="text-center">Face</TableHead>
              <TableHead className="text-center">RFID</TableHead>
              <TableHead>Device ID</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} className="h-48 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Memuat...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-48 text-center text-muted-foreground">
                  Tidak ada data. Klik &quot;Ambil Data User dari Mesin&quot; untuk mengambil data.
                </TableCell>
              </TableRow>
            ) : data.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <button onClick={() => toggleSelect(row.pin)} className="p-0.5">
                    {selected.has(row.pin)
                      ? <CheckSquare className="h-4 w-4 text-blue-600" />
                      : <Square className="h-4 w-4 text-gray-400" />
                    }
                  </button>
                </TableCell>
                <TableCell className="font-mono">{row.pin}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-[12.5px]">
                  {(row as any).kantor?.nama ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11.5px] font-medium text-indigo-700">
                      {(row as any).kantor.nama}
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </TableCell>
                <TableCell className="text-[12.5px]">
                  {(row as any).jabatan?.nama ? (
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11.5px] font-medium text-blue-700">
                      {(row as any).jabatan.nama}
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={row.privilege === 2 ? "default" : "secondary"}>
                    {getPrivilegeLabel(row.privilege)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">{row.finger}</TableCell>
                <TableCell className="text-center">{row.face}</TableCell>
                <TableCell className="text-center">{row.rfid}</TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground">{row.deviceCloudId || "-"}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => {
                        setEditPin(row.pin);
                        setEditName(row.name);
                        setEditFacePhoto(row.facePhoto || null);
                        setEditFacePreview(row.facePhoto ? `data:image/jpeg;base64,${row.facePhoto}` : null);
                        setEditKantorId((row as any).kantor?.id || "");
                        setEditJabatanId((row as any).jabatan?.id || "");
                        setEditStatus("");
                      }}
                      title="Edit nama"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => setDeleteDialog({ mode: "single", pins: [row.pin] })}
                      disabled={deletingPins.has(row.pin)}
                      title="Hapus user"
                    >
                      <Trash2 className={`h-3.5 w-3.5 ${deletingPins.has(row.pin) ? "animate-pulse" : ""}`} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">Total {total.toLocaleString("id-ID")} data</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm font-medium">{page} / {totalPages}</span>
              <Button variant="ghost" size="icon" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editPin} onOpenChange={(open) => { if (!open) { setEditPin(null); setEditStatus(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Edit nama user. Data hanya disimpan di database. Untuk mengirim ke mesin, centang user lalu klik &quot;Turunkan ke Mesin&quot;.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">PIN</label>
              <p className="font-mono text-sm">{editPin}</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">Nama</label>
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                autoFocus
              />
            </div>

            {/* Kantor & Jabatan */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-muted-foreground mb-1">Kantor</label>
                <select
                  value={editKantorId}
                  onChange={(e) => {
                    setEditKantorId(e.target.value);
                    setEditJabatanId("");
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Tanpa Kantor</option>
                  {kantors.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-muted-foreground mb-1">Jabatan</label>
                <select
                  value={editJabatanId}
                  onChange={(e) => setEditJabatanId(e.target.value)}
                  disabled={!editKantorId}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Tanpa Jabatan</option>
                  {kantors
                    .find((k) => k.id === editKantorId)
                    ?.jabatans.map((j) => (
                      <option key={j.id} value={j.id}>{j.nama}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Face Photo */}
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">Foto Wajah</label>
              <input
                ref={editFileRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFaceUpload}
                className="hidden"
              />
              {editFacePreview ? (
                <div className="space-y-2">
                  <img
                    src={editFacePreview}
                    alt="Face preview"
                    className="h-32 w-32 rounded-xl border object-cover"
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => editFileRef.current?.click()}>
                      Ganti Foto
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditFacePhoto(null); setEditFacePreview(null); }}>
                      Hapus Foto
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => editFileRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload Foto Wajah
                </Button>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Format JPEG/PNG, maks 100 KB, close-up wajah
              </p>
            </div>

            {editStatus && (
              <div className="text-[13px] text-green-600">{editStatus}</div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setEditPin(null); setEditStatus(""); }}>
                Batal
              </Button>
              <Button className="flex-1" onClick={handleEdit} disabled={saving || !editName.trim()}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { if (!open) { setShowAdd(false); setAddStatus(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
            <DialogDescription>Data akan dikirim ke mesin absensi via set_userinfo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">PIN*</label>
              <Input type="text" value={addPin} onChange={(e) => setAddPin(e.target.value)} placeholder="Contoh: 1001" autoFocus />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">Nama*</label>
              <Input type="text" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">Privilege</label>
              <select value={addPrivilege} onChange={(e) => setAddPrivilege(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="1">User</option>
                <option value="2">Admin</option>
                <option value="3">Sub Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">Password</label>
              <Input type="text" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder="Kosongkan jika tidak ada" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">RFID / Card</label>
              <Input type="text" value={addRfid} onChange={(e) => setAddRfid(e.target.value)} placeholder="Kosongkan jika tidak ada" />
            </div>
            {addStatus && (
              <div className={`text-[13px] ${addStatus.startsWith("✅") ? "text-green-600" : addStatus.startsWith("❌") ? "text-red-600" : "text-blue-600"}`}>
                {addStatus}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); setAddStatus(""); }}>
                Batal
              </Button>
              <Button className="flex-1" onClick={handleAdd} disabled={adding || !addPin.trim() || !addName.trim()}>
                {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                {adding ? "Mengirim..." : "Tambah & Kirim ke Mesin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Import Dialog */}
      <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Import Excel</DialogTitle>
            <DialogDescription>
              Periksa hasil pembacaan file. Baris dengan error tidak akan disimpan. Kantor/jabatan yang tidak ditemukan akan diabaikan (user tetap disimpan dengan PIN &amp; Nama).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 text-[12.5px]">
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
              Total: {preview?.total} baris
            </span>
            <span className="rounded-lg bg-green-100 px-2.5 py-1 font-medium text-green-700">
              ✅ Siap disimpan: {preview?.valid}
            </span>
            <span className="rounded-lg bg-red-100 px-2.5 py-1 font-medium text-red-700">
              ❌ Error: {preview?.errors}
            </span>
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
              ⚠️ Peringatan: {preview?.warnings}
            </span>
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-[12.5px]">
              <thead className="sticky top-0 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Baris</th>
                  <th className="px-3 py-2 font-semibold">PIN</th>
                  <th className="px-3 py-2 font-semibold">Nama</th>
                  <th className="px-3 py-2 font-semibold">Kantor</th>
                  <th className="px-3 py-2 font-semibold">Jabatan</th>
                  <th className="px-3 py-2 font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {preview?.rows.map((r) => (
                  <tr key={r.rowIndex} className="border-t border-gray-50">
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-400">{r.rowIndex}</td>
                    <td className="px-3 py-2 font-mono">{r.pin}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">
                      {r.kantorName === "-" ? <span className="text-gray-300">-</span> : r.kantorName}
                      {!r.kantorFound && r.kantorName !== "-" && (
                        <span className="ml-1 text-[10px] text-red-500">(tidak ada)</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.jabatanName === "-" ? <span className="text-gray-300">-</span> : r.jabatanName}
                      {!r.jabatanFound && r.jabatanName !== "-" && (
                        <span className="ml-1 text-[10px] text-red-500">(tidak ada)</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.errors.length > 0 ? (
                        <span className="text-[11px] font-medium text-red-600">
                          {r.errors.join("; ")}
                        </span>
                      ) : r.warnings.length > 0 ? (
                        <span className="text-[11px] text-amber-600">{r.warnings.join("; ")}</span>
                      ) : (
                        <span className="text-[11px] text-green-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPreview(null)} disabled={importing}>
              Batal
            </Button>
            <Button className="flex-1" onClick={handleConfirmImport} disabled={importing || (preview?.valid ?? 0) === 0}>
              {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {importing ? "Mengimport..." : `Simpan ${preview?.valid ?? 0} Baris`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Push to device dialog */}
      <Dialog open={!!pushDialog} onOpenChange={(open) => { if (!open) setPushDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Turunkan ke Mesin</DialogTitle>
            <DialogDescription>
              Pilih mesin tujuan untuk {selected.size} user terpilih. Data dikirim via set_userinfo dan hasilnya akan masuk via webhook.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {devices.map((d) => (
              <button
                key={d.cloudId}
                onClick={() => handleBulkSync(d.cloudId)}
                disabled={bulkSyncing}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-left hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors disabled:opacity-50"
              >
                <Monitor className="h-4 w-4 text-indigo-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-gray-900">{d.name}</div>
                  <div className="font-mono text-[11.5px] text-gray-400">Cloud ID: {d.cloudId}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </button>
            ))}
            {devices.length === 0 && (
              <p className="text-[13px] text-gray-400">Belum ada mesin terdaftar. Tambahkan di halaman Perangkat.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus User</DialogTitle>
            <DialogDescription>
              {deleteDialog?.pins.length === 1
                ? `Yakin ingin menghapus user PIN ${deleteDialog.pins[0]}?`
                : `Yakin ingin menghapus ${deleteDialog?.pins.length} user?`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="destructive"
              className="w-full justify-start gap-3"
              onClick={() => deleteDialog && executeDelete(deleteDialog.pins, true)}
            >
              <Monitor className="h-4 w-4" />
              Hapus dari Database &amp; Mesin
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start gap-3"
              onClick={() => deleteDialog && executeDelete(deleteDialog.pins, false)}
            >
              <Database className="h-4 w-4" />
              Hapus dari Database saja
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setDeleteDialog(null)}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
