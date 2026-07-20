"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, X, Search, Download, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";

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

  // Shared
  const [jamKerja, setJamKerja] = useState<JamKerjaItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  // Auto
  const [autoList, setAutoList] = useState<JadwalAutoItem[]>([]);
  const [autoLoading, setAutoLoading] = useState(true);
  const [autoModal, setAutoModal] = useState(false);
  const [autoForm, setAutoForm] = useState({ name: "", days: ["", "", "", "", "", "", ""], employees: [] as string[] });
  const [editAutoId, setEditAutoId] = useState<string | null>(null);
  const [savingAuto, setSavingAuto] = useState(false);

  // Manual
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

  // Get schedule for an employee on a specific date
  const getScheduleForDate = (pin: string, dateStr: string): { jamKerjaKode: string; source: "manual" | "auto" | "none"; startTime?: string; endTime?: string } => {
    // 1. Check manual
    const manual = manualData.find(m => m.employeePin === pin && m.date?.slice(0, 10) === dateStr);
    if (manual) return { jamKerjaKode: manual.jamKerjaKode, source: "manual", startTime: manual.startTime, endTime: manual.endTime };

    // 2. Check auto
    const dayOfWeek = new Date(dateStr).getDay();
    for (const auto of autoList) {
      const isAssigned = auto.employees.some(e => e.employeePin === pin);
      if (!isAssigned) continue;
      const day = auto.days.find(d => d.dayOfWeek === dayOfWeek);
      if (day && day.jamKerjaKode) return { jamKerjaKode: day.jamKerjaKode, source: "auto" };
    }

    return { jamKerjaKode: "", source: "none" };
  };

  // Build a combined list of employee-date entries for the month
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
        if (schedule.source !== "none") {
          rows.push({ pin: user.pin, name: user.name, date: dateStr, day: d, schedule });
        }
      }
    }

    // Also include employees with no schedule at all but still in user list
    // Actually, only show rows where there IS a schedule (either auto or manual)
    // If user wants to see all employees, they can use the search
    return rows;
  };

  const manualView = buildManualView();

  const openAddManual = (pin?: string, date?: string) => {
    setManualForm({
      employeePin: pin || "",
      date: date || "",
      jamKerjaKode: "",
      startTime: "",
      endTime: "",
    });
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

  // Auto CRUD
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

  // Excel Export/Import
  const exportExcel = () => {
    const rows = manualView.map(m => ({
      Karyawan: m.name,
      PIN: m.pin,
      Tanggal: m.date,
      "Jam Kerja": getJKName(m.schedule.jamKerjaKode),
      "Jam Mulai": m.schedule.startTime || "",
      "Jam Selesai": m.schedule.endTime || "",
      Sumber: m.schedule.source,
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
        <button onClick={() => setTab("auto")} className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all ${tab === "auto" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Auto</button>
        <button onClick={() => setTab("manual")} className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all ${tab === "manual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Manual</button>
      </div>

      {tab === "auto" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openAddAuto} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 shadow-sm shadow-blue-200"><Plus className="h-4 w-4" />Buat Jadwal Auto</button>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead><tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-medium text-gray-400">Nama Jadwal</th>
                {DAYS.map(d => <th key={d} className="px-2 py-3 text-center font-medium text-gray-400">{d}</th>)}
                <th className="px-4 py-3 font-medium text-gray-400">Karyawan</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Aksi</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {autoLoading ? <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-300">Memuat...</td></tr>
                : autoList.length === 0 ? <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-300">Belum ada jadwal auto.</td></tr>
                : autoList.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                    {[0,1,2,3,4,5,6].map(d => {
                      const day = item.days.find(dd => dd.dayOfWeek === d);
                      return <td key={d} className="px-2 py-3 text-center font-mono text-[11px] text-gray-600">{day ? getJKName(day.jamKerjaKode) : "-"}</td>;
                    })}
                    <td className="px-4 py-3 text-gray-500">{item.employees.length} org</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditAuto(item)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deleteAuto(item.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "manual" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Bulan</label>
                <select value={manualMonth} onChange={e => setManualMonth(Number(e.target.value))} className="mt-1 rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none">
                  {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-500">Tahun</label>
                <select value={manualYear} onChange={e => setManualYear(Number(e.target.value))} className="mt-1 rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none">
                  {Array.from({length: 5}, (_, i) => <option key={i} value={2024+i}>{2024+i}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[13px] font-medium text-gray-500">Cari Karyawan</label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-gray-400" />
                  <input value={manualSearch} onChange={e => setManualSearch(e.target.value)} className="flex-1 border-0 bg-transparent text-[13px] outline-none" placeholder="Nama atau PIN..." />
                </div>
              </div>
              <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200"><Download className="h-4 w-4" />Export Excel</button>
              <label className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-amber-700 shadow-sm shadow-amber-200 cursor-pointer">
                <Upload className="h-4 w-4" />Import Excel
                <input type="file" accept=".xlsx,.xls" onChange={importExcel} className="hidden" />
              </label>
            </div>
          </div>

          {manualLoading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-300 shadow-sm">Memuat...</div>
          ) : manualView.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-300 shadow-sm">
              <p>Tidak ada jadwal untuk bulan ini.</p>
              <p className="text-xs mt-1">Buat jadwal Auto terlebih dahulu atau tambah jadwal Manual.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead><tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 font-medium text-gray-400">Karyawan</th>
                    <th className="px-4 py-3 font-medium text-gray-400">Tanggal</th>
                    <th className="px-4 py-3 font-medium text-gray-400">Hari</th>
                    <th className="px-4 py-3 font-medium text-gray-400">Jam Kerja</th>
                    <th className="px-4 py-3 font-medium text-gray-400">Jam Mulai</th>
                    <th className="px-4 py-3 font-medium text-gray-400">Jam Selesai</th>
                    <th className="px-4 py-3 font-medium text-gray-400">Sumber</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-400">Aksi</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {manualView.map((row, idx) => {
                      const manualEntry = manualData.find(m => m.employeePin === row.pin && m.date?.slice(0, 10) === row.date);
                      return (
                        <tr key={`${row.pin}-${row.date}`} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-gray-900 font-medium">{row.name}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-700">{row.date}</td>
                          <td className="px-4 py-2.5 text-gray-500">{DAYS_FULL[new Date(row.date).getDay()]}</td>
                          <td className="px-4 py-2.5 text-gray-700">{getJKName(row.schedule.jamKerjaKode)}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-700">{row.schedule.startTime || getJK(row.schedule.jamKerjaKode)?.startTime || "-"}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-700">{row.schedule.endTime || getJK(row.schedule.jamKerjaKode)?.endTime || "-"}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${row.schedule.source === "manual" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                              {row.schedule.source === "manual" ? "MANUAL" : "AUTO"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {manualEntry && (
                                <>
                                  <button onClick={() => openEditManual(manualEntry)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => deleteManual(manualEntry.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Edit Modal */}
      {manualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setManualModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Edit Jadwal Manual</h3>
              <button onClick={() => setManualModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-[13px] font-medium text-gray-500">Karyawan</label>
                <select value={manualForm.employeePin} onChange={e => setManualForm(p => ({ ...p, employeePin: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none">
                  {users.map(u => <option key={u.pin} value={u.pin}>{u.name} ({u.pin})</option>)}
                </select>
              </div>
              <div><label className="block text-[13px] font-medium text-gray-500">Tanggal</label><input type="date" value={manualForm.date} onChange={e => setManualForm(p => ({ ...p, date: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none" /></div>
              <div><label className="block text-[13px] font-medium text-gray-500">Jam Kerja</label>
                <select value={manualForm.jamKerjaKode} onChange={e => setManualForm(p => ({ ...p, jamKerjaKode: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none">
                  {jamKerja.map(j => <option key={j.kode} value={j.kode}>{j.kode} - {j.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[13px] font-medium text-gray-500">Jam Mulai</label><input type="time" value={manualForm.startTime} onChange={e => setManualForm(p => ({ ...p, startTime: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none" /></div>
                <div><label className="block text-[13px] font-medium text-gray-500">Jam Selesai</label><input type="time" value={manualForm.endTime} onChange={e => setManualForm(p => ({ ...p, endTime: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none" /></div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setManualModal(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={saveManual} disabled={savingManual} className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">{savingManual ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Modal */}
      {autoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAutoModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">{editAutoId ? "Edit" : "Buat"} Jadwal Auto</h3>
              <button onClick={() => setAutoModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-gray-500">Nama Jadwal</label>
              <input value={autoForm.name} onChange={e => setAutoForm(p => ({ ...p, name: e.target.value }))} className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="mb-4">
              <label className="block text-[13px] font-medium text-gray-500 mb-2">Jam Kerja per Hari</label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_FULL.map((day, i) => (
                  <div key={i}>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1 text-center">{day.slice(0, 3)}</label>
                    <select value={autoForm.days[i]} onChange={e => { const d = [...autoForm.days]; d[i] = e.target.value; setAutoForm(p => ({ ...p, days: d })); }} className="block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] focus:border-blue-500 focus:outline-none">
                      <option value="">-</option>
                      {jamKerja.map(j => <option key={j.kode} value={j.kode}>{j.kode}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-2">Pilih Karyawan</label>
              <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-2 space-y-1">
                {users.map(u => (
                  <label key={u.pin} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={autoForm.employees.includes(u.pin)} onChange={() => toggleEmployee(u.pin)} className="rounded" />
                    <span className="text-[13px] text-gray-700">{u.name} ({u.pin})</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setAutoModal(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={saveAuto} disabled={savingAuto} className="rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">{savingAuto ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
