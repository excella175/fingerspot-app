"use client";

import { useEffect, useState, useRef } from "react";
import { Search, RefreshCw, Users, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UserInfoEntry {
  id: string;
  pin: string;
  name: string;
  privilege: number;
  finger: number;
  face: number;
  rfid: number;
  vein: number;
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
  const [editPin, setEditPin] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
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

  useEffect(() => {
    fetchData();
  }, [page]);

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

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleEdit = async () => {
    if (!editPin || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/userinfo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: editPin, name: editName.trim() }),
      });
      const result = await res.json();
      if (result.success) { setEditPin(null); fetchData(); }
      else alert("Gagal: " + (result.error || "Unknown error"));
    } catch { alert("Gagal menyimpan"); }
    setSaving(false);
  };

  const handleDelete = async (pin: string) => {
    if (!confirm(`Yakin ingin menghapus user PIN ${pin}?`)) return;
    setDeleting(pin);
    try {
      const res = await fetch(`/api/userinfo?pin=${pin}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) fetchData();
      else alert("Gagal: " + (result.error || "Unknown error"));
    } catch { alert("Gagal menghapus"); }
    setDeleting(null);
  };

  const totalPages = Math.ceil(total / limit);

  const getPrivilegeLabel = (p: number) => {
    const labels: Record<number, string> = { 1: "User", 2: "Admin", 3: "Sub Admin" };
    return labels[p] || `Level ${p}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
          <Users className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data User</h1>
          <p className="text-[13px] text-gray-400">Data user dari mesin absensi</p>
        </div>
      </div>

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
            <Button
              variant="secondary"
              onClick={() => { setPage(1); fetchData(); }}
            >
              <Search className="h-4 w-4 mr-1.5" /> Cari
            </Button>
            <Button
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Menunggu data..." : "Ambil Data User dari Mesin"}
            </Button>
          </div>
          {syncStatus && (
            <div className={`mt-3 rounded-xl p-3 text-[13px] ${
              syncStatus.startsWith("✅") ? "bg-green-50 text-green-700" :
              syncStatus.startsWith("❌") ? "bg-red-50 text-red-700" :
              "bg-blue-50 text-blue-700"
            }`}>
              {syncStatus}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Memuat...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                  Tidak ada data. Klik &quot;Ambil Data User dari Mesin&quot; untuk mengambil data.
                </TableCell>
              </TableRow>
            ) : data.map((row) => (
              <TableRow key={row.id}>
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
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditPin(row.pin); setEditName(row.name); }}
                      title="Edit nama"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(row.pin)}
                      disabled={deleting === row.pin}
                      title="Hapus user"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={!!editPin} onOpenChange={(open) => { if (!open) setEditPin(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Nama User</DialogTitle>
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
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditPin(null)}>Batal</Button>
              <Button onClick={handleEdit} disabled={saving || !editName.trim()}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
