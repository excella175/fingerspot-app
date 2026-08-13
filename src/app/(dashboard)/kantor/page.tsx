"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Building2, Plus, Search, Pencil, Trash2, MapPin, Users as UsersIcon, Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Jabatan {
  id: string;
  nama: string;
  _count?: { users: number };
  users?: { id: string; pin: string; name: string; jabatanId: string | null }[];
}

interface Kantor {
  id: string;
  nama: string;
  alamat: string | null;
  jabatans: Jabatan[];
  _count?: { users: number };
}

interface BlockedUser {
  id: string;
  pin: string;
  name: string;
  jabatanId: string | null;
  jabatanNama?: string;
}

export default function KantorPage() {
  const [kantors, setKantors] = useState<Kantor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit/create modal
  const [editing, setEditing] = useState<{ id?: string; nama: string; alamat: string; jabatans: string[] } | null>(null);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [newJabatanInput, setNewJabatanInput] = useState("");

  // Delete modal
  const [deleting, setDeleting] = useState<{ id: string; nama: string; blocked: boolean; users: BlockedUser[] } | null>(null);
  const [reassigns, setReassigns] = useState<Record<string, string>>({});
  const [moving, setMoving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Per-jabatan actions
  const [jabatanBusy, setJabatanBusy] = useState<string | null>(null);
  const [renameJabatan, setRenameJabatan] = useState<{ id: string; nama: string; kantorNama: string } | null>(null);
  const [renameInput, setRenameInput] = useState("");

  const fetchKantors = useCallback(() => {
    setLoading(true);
    fetch("/api/kantor")
      .then((r) => r.json())
      .then((d) => {
        setKantors(d.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchKantors();
  }, [fetchKantors]);

  const filtered = kantors.filter((k) =>
    k.nama.toLowerCase().includes(search.toLowerCase()) ||
    (k.alamat || "").toLowerCase().includes(search.toLowerCase()) ||
    k.jabatans.some((j) => j.nama.toLowerCase().includes(search.toLowerCase()))
  );

  // ---- Save kantor (create or edit) ----
  const handleSave = async () => {
    if (!editing || !editing.nama.trim()) return;
    setSaving(true);
    setEditError("");
    try {
      const body = {
        nama: editing.nama.trim(),
        alamat: editing.alamat.trim() || null,
        jabatans: editing.jabatans.map((j) => j.trim()).filter(Boolean),
      };
      const res = await fetch("/api/kantor", {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing.id ? { id: editing.id, ...body } : body),
      });
      const d = await res.json();
      if (d.success) {
        setEditing(null);
        fetchKantors();
        toast.success(editing.id ? "Kantor berhasil diupdate" : "Kantor berhasil ditambahkan");
      } else {
        setEditError(d.error || "Gagal menyimpan");
        toast.error(d.error || "Gagal menyimpan kantor");
      }
    } catch {
      setEditError("Gagal menyimpan");
      toast.error("Gagal menyimpan kantor");
    }
    setSaving(false);
  };

  const handleAddJabatan = () => {
    if (!editing) return;
    const v = newJabatanInput.trim();
    if (!v) return;
    if (editing.jabatans.some((j) => j.toLowerCase() === v.toLowerCase())) return;
    setEditing({ ...editing, jabatans: [...editing.jabatans, v] });
    setNewJabatanInput("");
  };

  // ---- Delete flow ----
  const startDelete = async (k: Kantor) => {
    setDeleteError("");
    try {
      const res = await fetch(`/api/kantor?id=${k.id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) {
        fetchKantors();
        toast.success("Kantor berhasil dihapus");
        return;
      }
      if (d.blocked) {
        setDeleting({
          id: k.id,
          nama: d.kantorNama || k.nama,
          blocked: true,
          users: d.users || [],
        });
        const initial: Record<string, string> = {};
        (d.users || []).forEach((u: BlockedUser) => { initial[u.id] = ""; });
        setReassigns(initial);
      } else {
        setDeleteError(d.error || "Gagal menghapus");
      }
    } catch {
      setDeleteError("Gagal menghapus");
    }
  };

  // Reassign users then delete kantor
  const handleReassignAndDelete = async () => {
    if (!deleting) return;
    setMoving(true);
    setDeleteError("");
    try {
      const payload: Record<string, string | null> = {};
      let hasTarget = false;
      for (const u of deleting.users) {
        payload[u.id] = reassigns[u.id] || null;
        if (reassigns[u.id]) hasTarget = true;
      }
      if (!hasTarget) {
        setDeleteError("Pilih jabatan tujuan minimal untuk 1 user, atau pilih 'Tanpa Jabatan'");
        setMoving(false);
        return;
      }
      const reassignRes = await fetch("/api/kantor/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kantorId: deleting.id, reassignments: payload }),
      });
      const reassignData = await reassignRes.json();
      if (!reassignData.success) {
        setDeleteError(reassignData.error || "Gagal memindahkan user");
        setMoving(false);
        return;
      }

      const delRes = await fetch(`/api/kantor?id=${deleting.id}`, { method: "DELETE" });
      const delData = await delRes.json();
      if (!delData.success) {
        setDeleteError(delData.error || "Gagal menghapus kantor setelah memindahkan user");
        setMoving(false);
        return;
      }

      setDeleting(null);
      fetchKantors();
      toast.success("Kantor berhasil dihapus");
    } catch {
      setDeleteError("Terjadi kesalahan");
      toast.error("Gagal menghapus kantor");
    }
    setMoving(false);
  };

  // ---- Per-jabatan delete ----
  const handleDeleteJabatan = async (j: Jabatan) => {
    setJabatanBusy(j.id);
    try {
      const res = await fetch(`/api/jabatan?id=${j.id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) {
        fetchKantors();
        toast.success("Jabatan berhasil dihapus");
      } else {
        toast.error(d.error || "Gagal menghapus jabatan");
      }
    } catch {
      toast.error("Gagal menghapus jabatan");
    }
    setJabatanBusy(null);
  };

  // ---- Per-jabatan rename ----
  const handleRenameJabatan = async () => {
    if (!renameJabatan) return;
    const v = renameInput.trim();
    if (!v) return;
    try {
      const res = await fetch("/api/jabatan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: renameJabatan.id, nama: v }),
      });
      const d = await res.json();
      if (d.success) {
        setRenameJabatan(null);
        fetchKantors();
        toast.success("Jabatan berhasil diubah");
      } else {
        toast.error(d.error || "Gagal mengubah jabatan");
      }
    } catch {
      toast.error("Gagal mengubah jabatan");
    }
  };

  // All jabatans from other kantors (for reassign dropdown)
  const otherJabatans = kantors
    .filter((k) => k.id !== deleting?.id)
    .flatMap((k) => k.jabatans.map((j) => ({ ...j, kantorNama: k.nama })));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-200">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-bold tracking-tight text-gray-900">Kantor &amp; Jabatan</h1>
          <p className="text-[13px] text-gray-400">Kelola kantor dan jabatan karyawan</p>
        </div>
        <Button onClick={() => { setEditing({ nama: "", alamat: "", jabatans: [] }); setEditError(""); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Kantor
        </Button>
      </div>

      {deleteError && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-[13px] text-red-700">
          {deleteError}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kantor atau jabatan..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white py-16 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /> Memuat...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-white py-16 text-center text-muted-foreground">
          {kantors.length === 0
            ? "Belum ada kantor. Klik 'Tambah Kantor' untuk membuat."
            : "Tidak ada kantor yang cocok dengan pencarian."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((k) => (
            <Card key={k.id} className="overflow-hidden">
              <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{k.nama}</h3>
                      {k.alamat ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-gray-500">
                          <MapPin className="h-3 w-3" /> {k.alamat}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11.5px] text-gray-400">Tanpa alamat</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" title="Edit kantor" onClick={() => {
                      setEditing({
                        id: k.id,
                        nama: k.nama,
                        alamat: k.alamat || "",
                        jabatans: k.jabatans.map((j) => j.nama),
                      });
                      setEditError("");
                    }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Hapus kantor" onClick={() => startDelete(k)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Jabatan ({k.jabatans.length})
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <UsersIcon className="h-3 w-3" /> {k._count?.users ?? 0} user
                  </span>
                </div>

                <div className="space-y-1.5">
                  {k.jabatans.length === 0 && (
                    <p className="text-[12px] text-gray-300">Belum ada jabatan</p>
                  )}
                  {k.jabatans.map((j) => (
                    <div key={j.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-1.5">
                      <span className="text-[13px] text-gray-700">
                        {j.nama}
                        {(j._count?.users ?? 0) > 0 && (
                          <span className="ml-1.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                            {j._count?.users} user
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          title="Ubah nama jabatan"
                          className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600"
                          onClick={() => { setRenameJabatan({ id: j.id, nama: j.nama, kantorNama: k.nama }); setRenameInput(j.nama); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          title="Hapus jabatan"
                          className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-500"
                          disabled={jabatanBusy === j.id}
                          onClick={() => handleDeleteJabatan(j)}
                        >
                          {jabatanBusy === j.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setEditing({
                      id: k.id,
                      nama: k.nama,
                      alamat: k.alamat || "",
                      jabatans: k.jabatans.map((j) => j.nama),
                    });
                    setEditError("");
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 py-2 text-[12.5px] font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Jabatan
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Kantor Modal */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); setEditError(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Kantor" : "Tambah Kantor"}</DialogTitle>
            <DialogDescription>
              {editing?.id
                ? "Ubah nama/alamat kantor atau kelola jabatan di kantor ini."
                : "Buat kantor baru beserta daftar jabatannya."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">Nama Kantor*</label>
              <Input
                type="text"
                value={editing?.nama || ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, nama: e.target.value } : prev)}
                placeholder="Contoh: HO, Cabang Surabaya, Gudang"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1">Alamat</label>
              <Input
                type="text"
                value={editing?.alamat || ""}
                onChange={(e) => setEditing((prev) => prev ? { ...prev, alamat: e.target.value } : prev)}
                placeholder="Alamat kantor (opsional)"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">
                Jabatan di kantor ini
              </label>
              <div className="space-y-1.5">
                {editing?.jabatans.map((j, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5">
                    <span className="text-[13px] text-gray-700">{j}</span>
                    <button
                      className="rounded p-1 text-gray-400 hover:text-red-500"
                      onClick={() => setEditing((prev) => prev ? { ...prev, jabatans: prev.jabatans.filter((_, i) => i !== idx) } : prev)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newJabatanInput}
                    onChange={(e) => setNewJabatanInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddJabatan(); }}
                    placeholder="Nama jabatan baru (contoh: Staff)"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddJabatan} className="shrink-0">
                    Tambah
                  </Button>
                </div>
              </div>
            </div>
            {editError && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-2.5 text-[12.5px] text-red-700">
                {editError}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>Batal</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !editing?.nama.trim()}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {editing?.id ? "Simpan" : "Buat Kantor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Jabatan Modal */}
      <Dialog open={!!renameJabatan} onOpenChange={(open) => { if (!open) setRenameJabatan(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Nama Jabatan</DialogTitle>
            <DialogDescription>
              Jabatan di kantor <strong>{renameJabatan?.kantorNama}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameJabatan(); }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRenameJabatan(null)}>Batal</Button>
              <Button className="flex-1" onClick={handleRenameJabatan} disabled={!renameInput.trim()}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Kantor Modal (blocked with reassign) */}
      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Tidak bisa hapus &quot;{deleting?.nama}&quot;
            </DialogTitle>
            <DialogDescription>
              {deleting?.users.length} user masih terikat. Pilih jabatan tujuan untuk memindahkan mereka, lalu kantor (beserta jabatannya) akan dihapus.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {deleting?.users.map((u) => (
              <div key={u.id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                <p className="text-[12.5px] font-medium text-gray-700">
                  {u.name} <span className="ml-1 font-mono text-[11px] text-gray-400">{u.pin}</span>
                  {u.jabatanNama && (
                    <span className="ml-1.5 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">{u.jabatanNama}</span>
                  )}
                </p>
                <select
                  value={reassigns[u.id] || ""}
                  onChange={(e) => setReassigns((prev) => ({ ...prev, [u.id]: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12.5px] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Tanpa Jabatan</option>
                  {otherJabatans.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama} ({j.kantorNama})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleting(null)}>Batal</Button>
            <Button className="flex-1" onClick={handleReassignAndDelete} disabled={moving}>
              {moving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {moving ? "Memproses..." : "Pindahkan & Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
