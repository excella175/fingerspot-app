"use client";

import { useEffect, useState, useRef } from "react";
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
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

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

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ---- Sync from device ----
  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus("Mengirim perintah ke mesin...");
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "get_all_pin", params: {} }),
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
        }),
      });
      const result = await res.json();
      if (result.success) {
        setEditStatus("✅ Tersimpan di database");
        fetchData();
      } else {
        setEditStatus("❌ " + (result.error || "Gagal"));
      }
    } catch {
      setEditStatus("❌ Gagal menyimpan");
    }
    setSaving(false);
  };

  // ---- Face photo upload ----
  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/jpeg") && !file.type.startsWith("image/png")) {
      alert("Hanya file JPEG/PNG yang diizinkan");
      return;
    }

    if (file.size > 100 * 1024) {
      alert("Foto maksimal 100KB");
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
        fetchData();
      }
    } catch {}
    setDeletingPins((prev) => {
      const n = new Set(prev);
      pins.forEach((p) => n.delete(p));
      return n;
    });
  };

  // ---- Bulk sync to device ----
  const handleBulkSync = async () => {
    const pins = Array.from(selected);
    if (pins.length === 0) return;
    setBulkSyncing(true);
    let success = 0;
    let failed = 0;
    for (const pin of pins) {
      try {
        const res = await fetch("/api/userinfo/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const result = await res.json();
        if (result.success) success++; else failed++;
      } catch { failed++; }
    }
    setBulkSyncing(false);
    setSyncStatus(`✅ ${success} user dikirim ke mesin${failed ? `, ${failed} gagal` : ""}`);
    setTimeout(() => setSyncStatus(""), 5000);
  };

  // ---- Add user ----
  const handleAdd = async () => {
    if (!addPin.trim() || !addName.trim()) return;
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
        setAddPin(""); setAddName(""); setAddPassword(""); setAddRfid("");
        setTimeout(() => { setShowAdd(false); setAddStatus(""); }, 3000);
      } else {
        setAddStatus("❌ " + (result.message || result.error || "Gagal"));
      }
    } catch {
      setAddStatus("❌ Gagal mengirim perintah");
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

  // ---- Import Excel ----
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus("Mengimport...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/userinfo/excel", { method: "POST", body: fd });
      const result = await res.json();
      setImportStatus(result.success
        ? `✅ ${result.message}`
        : "❌ " + (result.error || "Gagal import"));
      if (result.success) { setPage(1); fetchData(); }
    } catch {
      setImportStatus("❌ Gagal import file");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
          <Users className="h-5 w-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Data User</h1>
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
            <Button onClick={handleSync} disabled={syncing}>
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
        <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 px-5 py-3">
          <span className="text-[13px] font-medium text-blue-700">
            {selected.size} user terpilih
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary" size="sm"
              onClick={handleBulkSync}
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
                <TableCell colSpan={10} className="h-48 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Memuat...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-48 text-center text-muted-foreground">
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
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
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
