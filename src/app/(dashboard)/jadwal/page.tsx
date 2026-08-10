"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, Search, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface JamKerjaItem { id: string; kode: string; name: string; type: string; aturanKode: string; startTime?: string; endTime?: string; }
interface UserItem { pin: string; name: string; }
interface AutoDay { dayOfWeek: number; jamKerjaKode: string; }
interface AutoEmp { employeePin: string; }
interface JadwalAutoItem { id: string; name: string; days: AutoDay[]; employees: AutoEmp[]; }
interface JadwalManualItem { id: string; employeePin: string; date: string; jamKerjaKode: string; startTime?: string; endTime?: string; }

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAYS_FULL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function JadwalPage() {
  const [tab, setTab] = useState<"auto" | "manual">("auto");

  const [jamKerja, setJamKerja] = useState<JamKerjaItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  const [autoList, setAutoList] = useState<JadwalAutoItem[]>([]);
  const [autoLoading, setAutoLoading] = useState(true);
  const [autoModal, setAutoModal] = useState(false);
  const [autoForm, setAutoForm] = useState({ name: "", days: ["", "", "", "", "", "", ""], employees: [] as string[] });
  const [editAutoId, setEditAutoId] = useState<string | null>(null);
  const [savingAuto, setSavingAuto] = useState(false);

  const [manualData, setManualData] = useState<JadwalManualItem[]>([]);
  const [manualLoading, setManualLoading] = useState(true);
  const [manualMonth, setManualMonth] = useState(new Date().getMonth() + 1);
  const [manualYear, setManualYear] = useState(new Date().getFullYear());
  const [manualSearch, setManualSearch] = useState("");
  const [manualModal, setManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ employeePin: "", date: "", jamKerjaKode: "", startTime: "", endTime: "" });
  const [editManualId, setEditManualId] = useState<string | null>(null);
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    fetch("/api/jam-kerja").then(r => r.json()).then(d => setJamKerja(d.data || [])).catch(() => {});
    fetch("/api/userinfo?limit=9999").then(r => r.json()).then(d => setUsers(d.data || [])).catch(() => {});
  }, []);

  const fetchAuto = () => {
    setAutoLoading(true);
    fetch("/api/jadwal-auto").then(r => r.json()).then(d => {
      setAutoList(d.data || []);
      setAutoLoading(false);
    }).catch(() => setAutoLoading(false));
  };
  const fetchManual = () => {
    setManualLoading(true);
    fetch(`/api/jadwal-manual?month=${manualMonth}&year=${manualYear}`)
      .then(r => r.json()).then(d => { setManualData(d.data || []); setManualLoading(false); })
      .catch(() => setManualLoading(false));
  };
  useEffect(() => { if (tab === "auto") fetchAuto(); }, [tab]);
  useEffect(() => { if (tab === "manual") fetchManual(); }, [tab, manualMonth, manualYear]);

  const getUserName = (pin: string) => users.find(u => u.pin === pin)?.name || pin;
  const getJKName = (kode: string) => jamKerja.find(j => j.kode === kode)?.name || kode;
  const getJK = (kode: string) => jamKerja.find(j => j.kode === kode);

  const getScheduleForDate = (pin: string, dateStr: string): { jamKerjaKode: string; source: "manual" | "auto" | "none"; startTime?: string; endTime?: string } => {
    const manual = manualData.find(m => m.employeePin === pin && m.date?.slice(0, 10) === dateStr);
    if (manual) return { jamKerjaKode: manual.jamKerjaKode, source: "manual", startTime: manual.startTime, endTime: manual.endTime };
    const dayOfWeek = new Date(dateStr).getDay();
    for (const auto of autoList) {
      const isAssigned = auto.employees.some(e => e.employeePin === pin);
      if (!isAssigned) continue;
      const day = auto.days.find(d => d.dayOfWeek === dayOfWeek);
      if (day && day.jamKerjaKode) return { jamKerjaKode: day.jamKerjaKode, source: "auto" };
    }
    return { jamKerjaKode: "", source: "none" };
  };

  const buildManualView = () => {
    const daysInMonth = new Date(manualYear, manualMonth, 0).getDate();
    const rows: { pin: string; name: string; date: string; day: number; schedule: ReturnType<typeof getScheduleForDate> }[] = [];
    const filteredUsers = manualSearch
      ? users.filter(u => u.name.toLowerCase().includes(manualSearch.toLowerCase()) || u.pin.includes(manualSearch))
      : users;
    for (const user of filteredUsers) {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${manualYear}-${String(manualMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const schedule = getScheduleForDate(user.pin, dateStr);
        rows.push({ pin: user.pin, name: user.name, date: dateStr, day: d, schedule });
      }
    }
    return rows;
  };

  const manualView = buildManualView();

  const openAddManual = () => {
    setManualForm({ employeePin: "", date: "", jamKerjaKode: "", startTime: "", endTime: "" });
    setEditManualId(null);
    setManualModal(true);
  };

  const openEditManual = (item: JadwalManualItem) => {
    setManualForm({
      employeePin: item.employeePin,
      date: item.date.slice(0, 10),
      jamKerjaKode: item.jamKerjaKode,
      startTime: item.startTime || "",
      endTime: item.endTime || "",
    });
    setEditManualId(item.id);
    setManualModal(true);
  };

  const saveManual = async () => {
    if (!manualForm.employeePin || !manualForm.date || !manualForm.jamKerjaKode) { alert("Karyawan, tanggal, dan jam kerja harus diisi"); return; }
    setSavingManual(true);
    try {
      const res = await fetch(`/api/jadwal-manual${editManualId ? `?id=${editManualId}` : ""}`, {
        method: editManualId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });
      const r = await res.json();
      if (r.success) { setManualModal(false); fetchManual(); }
      else alert("Gagal: " + (r.error || ""));
    } catch { alert("Gagal"); }
    setSavingManual(false);
  };

  const deleteManual = async (id: string) => {
    if (!confirm("Hapus jadwal manual ini?")) return;
    try { await fetch(`/api/jadwal-manual?id=${id}`, { method: "DELETE" }); fetchManual(); }
    catch { alert("Gagal"); }
  };

  const openAddAuto = () => {
    setAutoForm({ name: "", days: ["", "", "", "", "", "", ""], employees: [] });
    setEditAutoId(null);
    setAutoModal(true);
  };
  const openEditAuto = (item: JadwalAutoItem) => {
    const days = [...Array(7)].map((_, i) => item.days.find(d => d.dayOfWeek === i)?.jamKerjaKode || "");
    setAutoForm({ name: item.name, days, employees: item.employees.map(e => e.employeePin) });
    setEditAutoId(item.id);
    setAutoModal(true);
  };
  const saveAuto = async () => {
    if (!autoForm.name) { alert("Nama jadwal harus diisi"); return; }
    setSavingAuto(true);
    try {
      const days = autoForm.days.map((kode, i) => ({ dayOfWeek: i, jamKerjaKode: kode })).filter(d => d.jamKerjaKode);
      const body = { name: autoForm.name, days, employees: autoForm.employees };
      const res = await fetch(`/api/jadwal-auto${editAutoId ? `?id=${editAutoId}` : ""}`, {
        method: editAutoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const r = await res.json();
      if (r.success) { setAutoModal(false); fetchAuto(); }
      else alert("Gagal: " + (r.error || ""));
    } catch { alert("Gagal menyimpan"); }
    setSavingAuto(false);
  };
  const deleteAuto = async (id: string) => {
    if (!confirm("Hapus jadwal ini?")) return;
    try { await fetch(`/api/jadwal-auto?id=${id}`, { method: "DELETE" }); fetchAuto(); }
    catch { alert("Gagal"); }
  };
  const toggleEmployee = (pin: string) => {
    setAutoForm(p => ({ ...p, employees: p.employees.includes(pin) ? p.employees.filter(e => e !== pin) : [...p.employees, pin] }));
  };

  const exportExcel = () => {
    const rows = manualView.map(m => ({
      Karyawan: m.name,
      PIN: m.pin,
      Tanggal: m.date,
      "Jam Kerja": getJKName(m.schedule.jamKerjaKode),
      "Jam Mulai": m.schedule.startTime || "",
      "Jam Selesai": m.schedule.endTime || "",
      Sumber: m.schedule.source === "manual" ? "Manual" : m.schedule.source === "auto" ? "Auto" : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal Manual");
    const instructions = [
      { "PETUNJUK": "Kode Jam Kerja yang tersedia:" },
      ...jamKerja.map(j => ({ "PETUNJUK": `${j.kode} - ${j.name} (${j.startTime || "?"} - ${j.endTime || "?"})` })),
    ];
    const ws2 = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, ws2, "Petunjuk");
    XLSX.writeFile(wb, `Jadwal_${manualMonth}_${manualYear}.xlsx`);
  };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];
        const batch = rows.map((r: any) => ({
          employeePin: String(r.PIN || r.employeePin || r.pin || ""),
          date: String(r.Tanggal || r.date || ""),
          jamKerjaKode: String(r["Jam Kerja"] || r.jamKerjaKode || r.kode || "").split(" - ")[0],
          startTime: String(r["Jam Mulai"] || r.startTime || ""),
          endTime: String(r["Jam Selesai"] || r.endTime || ""),
        })).filter(r => r.employeePin && r.date && r.jamKerjaKode);
        if (batch.length === 0) { alert("Tidak ada data valid di Excel"); return; }
        const res = await fetch("/api/jadwal-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "batch", data: batch }),
        });
        const result = await res.json();
        if (result.success) { alert(`${batch.length} jadwal berhasil diimport`); fetchManual(); }
        else alert("Gagal: " + (result.error || ""));
      } catch { alert("Gagal membaca file Excel"); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <CalendarDays className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Jadwal</h1>
          <p className="text-[13px] text-gray-400">Atur jadwal kerja karyawan</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <Button
          variant={tab === "auto" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTab("auto")}
          className={tab === "auto" ? "bg-white text-gray-900 shadow-sm hover:bg-white" : "text-gray-500 hover:text-gray-700"}
        >
          Auto
        </Button>
        <Button
          variant={tab === "manual" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTab("manual")}
          className={tab === "manual" ? "bg-white text-gray-900 shadow-sm hover:bg-white" : "text-gray-500 hover:text-gray-700"}
        >
          Manual
        </Button>
      </div>

      {tab === "auto" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openAddAuto}>
              <Plus className="h-4 w-4" />
              Buat Jadwal Auto
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Jadwal</TableHead>
                  {DAYS.map(d => <TableHead key={d} className="text-center">{d}</TableHead>)}
                  <TableHead>Karyawan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-gray-300">Memuat...</TableCell>
                  </TableRow>
                ) : autoList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-gray-300">Belum ada jadwal auto.</TableCell>
                  </TableRow>
                ) : autoList.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-gray-900">{item.name}</TableCell>
                    {[0,1,2,3,4,5,6].map(d => {
                      const day = item.days.find(dd => dd.dayOfWeek === d);
                      return <TableCell key={d} className="text-center font-mono text-[11px] text-gray-600">{day ? getJKName(day.jamKerjaKode) : "-"}</TableCell>;
                    })}
                    <TableCell className="text-gray-500">{item.employees.length} org</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditAuto(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteAuto(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {tab === "manual" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Bulan</label>
                  <select value={manualMonth} onChange={e => setManualMonth(Number(e.target.value))} className="mt-1 flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                    {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-gray-500">Tahun</label>
                  <select value={manualYear} onChange={e => setManualYear(Number(e.target.value))} className="mt-1 flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                    {Array.from({length: 5}, (_, i) => <option key={i} value={2024+i}>{2024+i}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[13px] font-medium text-gray-500">Cari Karyawan</label>
                  <div className="mt-1 flex items-center gap-2 rounded-md border border-input px-3 py-1 shadow-sm">
                    <Search className="h-3.5 w-3.5 text-gray-400" />
                    <input value={manualSearch} onChange={e => setManualSearch(e.target.value)} className="flex-1 border-0 bg-transparent text-sm outline-none" placeholder="Nama atau PIN..." />
                  </div>
                </div>
                <Button variant="default" size="sm" onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-700">
                  <Download className="h-4 w-4" />Export Excel
                </Button>
                <label className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 cursor-pointer relative">
                  <Upload className="h-4 w-4" />Import Excel
                  <input type="file" accept=".xlsx,.xls" onChange={importExcel} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
              </div>
            </CardContent>
          </Card>

          {manualLoading ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-300">Memuat...</CardContent>
            </Card>
          ) : manualView.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-300">
                <p>Tidak ada karyawan untuk bulan ini.</p>
                <p className="text-xs mt-1">Tambahkan karyawan atau buat jadwal Auto terlebih dahulu.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karyawan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Hari</TableHead>
                    <TableHead>Jam Kerja</TableHead>
                    <TableHead>Jam Mulai</TableHead>
                    <TableHead>Jam Selesai</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manualView.map((row, idx) => {
                    const manualEntry = manualData.find(m => m.employeePin === row.pin && m.date?.slice(0, 10) === row.date);
                    return (
                      <TableRow key={`${row.pin}-${row.date}`}>
                        <TableCell className="font-medium text-gray-900">{row.name}</TableCell>
                        <TableCell className="font-mono text-gray-700">{row.date}</TableCell>
                        <TableCell className="text-gray-500">{DAYS_FULL[new Date(row.date).getDay()]}</TableCell>
                        <TableCell className="text-gray-700">{row.schedule.jamKerjaKode ? getJKName(row.schedule.jamKerjaKode) : "-"}</TableCell>
                        <TableCell className="font-mono text-gray-700">{row.schedule.startTime || (row.schedule.jamKerjaKode ? getJK(row.schedule.jamKerjaKode)?.startTime || "-" : "-")}</TableCell>
                        <TableCell className="font-mono text-gray-700">{row.schedule.endTime || (row.schedule.jamKerjaKode ? getJK(row.schedule.jamKerjaKode)?.endTime || "-" : "-")}</TableCell>
                        <TableCell>
                          {row.schedule.source === "manual" ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">MANUAL</Badge>
                          ) : row.schedule.source === "auto" ? (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100">AUTO</Badge>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {manualEntry && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEditManual(manualEntry)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteManual(manualEntry.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      <Dialog open={manualModal} onOpenChange={(open) => { if (!open) setManualModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editManualId ? "Edit" : "Tambah"} Jadwal Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-gray-500">Karyawan</label>
              <select value={manualForm.employeePin} onChange={e => setManualForm(p => ({ ...p, employeePin: e.target.value }))} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Pilih Karyawan</option>
                {users.map(u => <option key={u.pin} value={u.pin}>{u.name} ({u.pin})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-500">Tanggal</label>
              <Input type="date" value={manualForm.date} onChange={e => setManualForm(p => ({ ...p, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-500">Jam Kerja</label>
              <select value={manualForm.jamKerjaKode} onChange={e => setManualForm(p => ({ ...p, jamKerjaKode: e.target.value }))} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Pilih Jam Kerja</option>
                {jamKerja.map(j => <option key={j.kode} value={j.kode}>{j.kode} - {j.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Jam Mulai</label>
                <Input type="time" value={manualForm.startTime} onChange={e => setManualForm(p => ({ ...p, startTime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Jam Selesai</label>
                <Input type="time" value={manualForm.endTime} onChange={e => setManualForm(p => ({ ...p, endTime: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <Button variant="outline" onClick={() => setManualModal(false)}>Batal</Button>
            <Button onClick={saveManual} disabled={savingManual}>{savingManual ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={autoModal} onOpenChange={(open) => { if (!open) setAutoModal(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAutoId ? "Edit" : "Buat"} Jadwal Auto</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <label className="block text-[13px] font-medium text-gray-500">Nama Jadwal</label>
            <Input type="text" value={autoForm.name} onChange={e => setAutoForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
          </div>
          <div className="mb-4">
            <label className="block text-[13px] font-medium text-gray-500 mb-2">Jam Kerja per Hari</label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_FULL.map((day, i) => (
                <div key={i}>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1 text-center">{day.slice(0, 3)}</label>
                  <select value={autoForm.days[i]} onChange={e => { const d = [...autoForm.days]; d[i] = e.target.value; setAutoForm(p => ({ ...p, days: d })); }} className="block w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-xs shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">-</option>
                    {jamKerja.map(j => <option key={j.kode} value={j.kode}>{j.kode}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-500 mb-2">Pilih Karyawan</label>
            <div className="max-h-40 overflow-y-auto border border-input rounded-md p-2 space-y-1">
              {users.map(u => (
                <label key={u.pin} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={autoForm.employees.includes(u.pin)} onChange={() => toggleEmployee(u.pin)} className="rounded" />
                  <span className="text-[13px] text-gray-700">{u.name} ({u.pin})</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <Button variant="outline" onClick={() => setAutoModal(false)}>Batal</Button>
            <Button onClick={saveAuto} disabled={savingAuto}>{savingAuto ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
