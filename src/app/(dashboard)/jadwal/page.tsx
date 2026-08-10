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
const pad2 = (n: number) => String(n).padStart(2, "0");

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
  const [savingCell, setSavingCell] = useState("");

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

  const buildManualGrid = () => {
    const daysInMonth = new Date(manualYear, manualMonth, 0).getDate();
    const filteredUsers = manualSearch
      ? users.filter(u => u.name.toLowerCase().includes(manualSearch.toLowerCase()) || u.pin.includes(manualSearch))
      : users;
    const manualByKey = new Map(manualData.map(m => [`${m.employeePin}|${m.date.slice(0, 10)}`, m]));
    return { daysInMonth, filteredUsers, manualByKey };
  };

  const saveCell = async (pin: string, dateStr: string, kode: string) => {
    const key = `${pin}|${dateStr}`;
    const existing = manualData.find(m => m.employeePin === pin && m.date?.slice(0, 10) === dateStr);
    setSavingCell(key);
    try {
      if (!kode) {
        if (existing) {
          const res = await fetch(`/api/jadwal-manual?id=${existing.id}`, { method: "DELETE" });
          const r = await res.json();
          if (!r.success) alert("Gagal menghapus: " + (r.error || ""));
        }
      } else {
        const res = await fetch("/api/jadwal-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeePin: pin, date: dateStr, jamKerjaKode: kode }),
        });
        const r = await res.json();
        if (!r.success) alert("Gagal menyimpan: " + (r.error || ""));
      }
      fetchManual();
    } catch {
      alert("Gagal menyimpan jadwal");
    }
    setSavingCell("");
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
    const { daysInMonth, filteredUsers, manualByKey } = buildManualGrid();
    const aoa: any[][] = [];
    aoa.push(["Start Date", `${manualYear}-${pad2(manualMonth)}-01`]);
    aoa.push(["End Date", `${manualYear}-${pad2(manualMonth)}-${pad2(daysInMonth)}`]);
    aoa.push([]);
    const header = ["No", "ID", "Name"];
    for (let d = 1; d <= daysInMonth; d++) header.push(`${pad2(d)}/${pad2(manualMonth)}`);
    aoa.push(header);
    filteredUsers.forEach((u, i) => {
      const row: any[] = [i + 1, u.pin, u.name];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${manualYear}-${pad2(manualMonth)}-${pad2(d)}`;
        const manual = manualByKey.get(`${u.pin}|${dateStr}`);
        const auto = getScheduleForDate(u.pin, dateStr);
        row.push(manual?.jamKerjaKode || (auto.source === "auto" ? auto.jamKerjaKode : ""));
      }
      aoa.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 5 }, { wch: 10 }, { wch: 22 }, ...Array(daysInMonth).fill({ wch: 10 })];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
    const instructions = [
      { "PETUNJUK": "Kode Jam Kerja yang tersedia:" },
      ...jamKerja.map(j => ({ "PETUNJUK": `${j.kode} - ${j.name} (${j.startTime || "?"} - ${j.endTime || "?"})` })),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), "Petunjuk");
    XLSX.writeFile(wb, `Timesheet_${pad2(manualMonth)}_${manualYear}.xlsx`);
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
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

        let startDate = "";
        let headerIdx = -1;
        rows.forEach((r, idx) => {
          const c0 = String(r[0] || "").trim().toLowerCase();
          if (c0.includes("start date")) startDate = String(r[1] || "").trim();
          if (c0 === "no" && String(r[2] || "").trim().toLowerCase() === "name" && headerIdx === -1) headerIdx = idx;
        });
        if (!startDate || headerIdx === -1) {
          alert("Format file tidak dikenali. Gunakan format Timesheet (No/ID/Name + kolom tanggal).");
          return;
        }
        const year = parseInt(startDate.slice(0, 4));
        const batch: any[] = [];
        let count = 0;
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          const pin = String(r[1] ?? "").trim();
          if (!pin) continue;
          for (let c = 3; c < r.length; c++) {
            const kode = String(r[c] ?? "").trim();
            if (!kode) continue;
            const dayCol = String(rows[headerIdx][c] ?? "").trim();
            const m = dayCol.match(/^(\d{1,2})\/(\d{1,2})/);
            if (!m) continue;
            batch.push({
              employeePin: pin,
              date: `${year}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`,
              jamKerjaKode: kode,
            });
            count++;
          }
        }
        if (batch.length === 0) { alert("Tidak ada data valid di Excel"); return; }
        const res = await fetch("/api/jadwal-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "batch", data: batch }),
        });
        const result = await res.json();
        if (result.success) { alert(`${count} jadwal berhasil diimport`); fetchManual(); }
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

      {tab === "manual" && (() => {
        const { daysInMonth, filteredUsers, manualByKey } = buildManualGrid();
        return (
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
            ) : filteredUsers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-300">
                  <p>Tidak ada karyawan untuk bulan ini.</p>
                  <p className="text-xs mt-1">Tambahkan karyawan atau buat jadwal Auto terlebih dahulu.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 z-10 min-w-[46px] bg-white">No</TableHead>
                        <TableHead className="sticky left-[46px] z-10 min-w-[88px] bg-white">ID</TableHead>
                        <TableHead className="sticky left-[134px] z-10 min-w-[170px] bg-white">Nama</TableHead>
                        {Array.from({length: daysInMonth}, (_, d) => d + 1).map(d => {
                          const wd = new Date(manualYear, manualMonth - 1, d).getDay();
                          const isWeekend = wd === 0 || wd === 6;
                          return (
                            <TableHead key={d} className={`min-w-[132px] whitespace-nowrap text-center ${isWeekend ? "bg-amber-50/80" : "bg-white"}`}>
                              {d} <span className="ml-1 font-normal text-gray-400">{DAYS[wd]}</span>
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u, i) => (
                        <TableRow key={u.pin}>
                          <TableCell className="sticky left-0 z-10 bg-white text-gray-400">{i + 1}</TableCell>
                          <TableCell className="sticky left-[46px] z-10 bg-white font-mono text-gray-600">{u.pin}</TableCell>
                          <TableCell className="sticky left-[134px] z-10 bg-white font-medium text-gray-900">{u.name}</TableCell>
                          {Array.from({length: daysInMonth}, (_, d) => d + 1).map(d => {
                            const wd = new Date(manualYear, manualMonth - 1, d).getDay();
                            const isWeekend = wd === 0 || wd === 6;
                            const dateStr = `${manualYear}-${pad2(manualMonth)}-${pad2(d)}`;
                            const manual = manualByKey.get(`${u.pin}|${dateStr}`);
                            const auto = getScheduleForDate(u.pin, dateStr);
                            const saving = savingCell === `${u.pin}|${dateStr}`;
                            return (
                              <TableCell key={d} className={`p-1.5 ${isWeekend ? "bg-amber-50/40" : ""}`}>
                                <select
                                  value={manual?.jamKerjaKode || ""}
                                  disabled={saving}
                                  onChange={(e) => saveCell(u.pin, dateStr, e.target.value)}
                                  className={`h-7 w-full min-w-[110px] rounded-md border px-1.5 text-[11.5px] outline-none focus:ring-1 focus:ring-indigo-400 ${
                                    manual
                                      ? "border-indigo-200 bg-indigo-50/60 font-medium text-indigo-800"
                                      : "border-gray-200 bg-white text-gray-500"
                                  } ${saving ? "opacity-50" : ""}`}
                                >
                                  <option value="">—</option>
                                  {jamKerja.map(j => (
                                    <option key={j.kode} value={j.kode}>{j.kode} - {j.name}</option>
                                  ))}
                                </select>
                                {!manual && auto.source === "auto" && (
                                  <span className="mt-0.5 block text-[9.5px] leading-none text-gray-300">auto: {auto.jamKerjaKode}</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-wrap items-center gap-4 border-t bg-gray-50/50 px-4 py-2.5 text-[11.5px] text-gray-400">
                  <span><span className="mr-1 inline-block h-3 w-3 rounded border border-indigo-200 bg-indigo-50 align-middle" /> = jadwal manual</span>
                  <span>Keterangan &quot;auto&quot; kecil = jadwal auto (bisa dioverride dengan memilih jam kerja)</span>
                </div>
              </Card>
            )}
          </div>
        );
      })()}

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
