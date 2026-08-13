"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  MonitorCog,
  RefreshCw,
  Clock,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Server,
  Info,
  Activity,
  Wifi,
  Settings2,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";

type Device = {
  id: string;
  cloudId: string;
  name: string;
  status: string;
  lastSync: string | null;
  createdAt: string;
};

function formatKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "Belum pernah sinkron";
  return new Date(value).toLocaleString("id-ID");
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [newCloudId, setNewCloudId] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [manageTarget, setManageTarget] = useState<Device | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [deviceData, setDeviceData] = useState<Record<string, any>>({});
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [actionLoading, setActionLoading] = useState(""); // "<cloudId>:<action>"
  const [timezones, setTimezones] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchDevices = async () => {
    setDevicesLoading(true);
    try {
      const res = await fetch("/api/device");
      const data = await res.json();
      if (data.success) setDevices(data.data);
    } catch { /* ignore */ }
    setDevicesLoading(false);
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleAddDevice = async () => {
    if (!newCloudId.trim()) { toast.error("Cloud ID wajib diisi"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloudId: newCloudId, name: newName }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCloudId(""); setNewName("");
        setResult({ type: "success", message: "Mesin berhasil ditambahkan" });
        toast.success("Mesin berhasil ditambahkan");
        await fetchDevices();
      } else {
        setResult({ type: "error", message: data.error || "Gagal menambahkan" });
        toast.error(data.error || "Gagal menambahkan mesin");
      }
    } catch {
      setResult({ type: "error", message: "Gagal menambahkan mesin" });
      toast.error("Gagal menambahkan mesin");
    }
    setAdding(false);
  };

  const handleDeleteDevice = async (device: Device) => {
    if (!confirm(`Yakin hapus mesin "${device.name}" (${device.cloudId})?`)) return;
    try {
      const res = await fetch(`/api/device?id=${device.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", message: "Mesin berhasil dihapus" });
        toast.success("Mesin berhasil dihapus");
        await fetchDevices();
      } else {
        setResult({ type: "error", message: data.error || "Gagal menghapus" });
        toast.error(data.error || "Gagal menghapus mesin");
      }
    } catch {
      setResult({ type: "error", message: "Gagal menghapus mesin" });
      toast.error("Gagal menghapus mesin");
    }
  };

  const handleSaveName = async () => {
    if (!manageTarget) return;
    const name = editName.trim();
    if (!name) { toast.error("Nama mesin tidak boleh kosong"); return; }
    setSavingName(true);
    try {
      const res = await fetch("/api/device", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: manageTarget.id, name }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", message: "Nama mesin berhasil diubah" });
        toast.success("Nama mesin berhasil diubah");
        setManageTarget({ ...manageTarget, name: data.data.name });
        await fetchDevices();
      } else {
        setResult({ type: "error", message: data.error || "Gagal mengubah nama" });
        toast.error(data.error || "Gagal mengubah nama mesin");
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengubah nama mesin" });
      toast.error("Gagal mengubah nama mesin");
    }
    setSavingName(false);
  };

  const callFingerspot = async (cloudId: string, command: string, params: Record<string, any> = {}) => {
    const res = await fetch("/api/fingerspot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, params: { ...params, cloudId } }),
    });
    return res.json();
  };

  const handleGetDevice = async (cloudId: string, name: string) => {
    setLoadingInfo(true);
    setResult(null);
    try {
      const data = await callFingerspot(cloudId, "get_device", { name });
      if (data.success) {
        setDeviceData(p => ({ ...p, [cloudId]: data.data?.data || data.data }));
        setResult({ type: "success", message: `Info perangkat ${name} berhasil diambil` });
        toast.success(`Data perangkat ${name} berhasil diambil`);
      } else {
        setResult({ type: "error", message: data.error || "Gagal mengambil data" });
        toast.error(data.error || "Gagal mengambil data perangkat");
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
      toast.error("Gagal mengirim perintah");
    }
    setLoadingInfo(false);
  };

  const handleSetTime = async (cloudId: string, name: string) => {
    setActionLoading(`${cloudId}:set_time`);
    setResult(null);
    try {
      const data = await callFingerspot(cloudId, "set_time", { timezone: timezones[cloudId] || "Asia/Jakarta" });
      if (data.success) {
        setResult({ type: "success", message: `Perintah set_time berhasil dikirim ke ${name}` });
        toast.success(`Zona waktu ${name} berhasil diatur`);
      } else {
        setResult({ type: "error", message: data.error || "Gagal" });
        toast.error(data.error || "Gagal mengatur zona waktu");
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
      toast.error("Gagal mengirim perintah set_time");
    }
    setActionLoading("");
  };

  const handleRestart = async (cloudId: string, name: string) => {
    if (!confirm(`Yakin ingin restart mesin "${name}"?`)) return;
    setActionLoading(`${cloudId}:restart`);
    setResult(null);
    try {
      const data = await callFingerspot(cloudId, "restart_device");
      if (data.success) {
        setResult({ type: "success", message: `Perintah restart berhasil dikirim ke ${name}` });
        toast.success(`Perintah restart berhasil dikirim ke ${name}`);
      } else {
        setResult({ type: "error", message: data.error || "Gagal" });
        toast.error(data.error || "Gagal mengirim perintah restart");
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
      toast.error("Gagal mengirim perintah restart");
    }
    setActionLoading("");
  };

  const onlineCount = devices.filter((d) => d.status === "ONLINE").length;
  const latestSync = devices.reduce<string | null>((acc, d) => {
    if (!d.lastSync) return acc;
    if (!acc || d.lastSync > acc) return d.lastSync;
    return acc;
  }, null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader icon={MonitorCog} title="Perangkat" description="Kelola mesin absensi dan kirim perintah langsung ke perangkat" gradient="indigo" />

      {result && (
        <div
          className={`flex items-center gap-2 rounded-2xl border p-4 text-[13px] font-medium ${
            result.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {result.message}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50">
            <Server className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-gray-400">Total Mesin</p>
            <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <Wifi className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-gray-400">Mesin Online</p>
            <p className="text-2xl font-bold text-emerald-600">{onlineCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50">
            <Activity className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-gray-400">Sinkron Terakhir</p>
            <p className="text-[14px] font-semibold text-gray-800">
              {latestSync ? formatDateTime(latestSync) : "Belum ada"}
            </p>
          </div>
        </div>
      </div>

      {/* Daftar mesin (baris kompak) */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Daftar Mesin</h2>
          <p className="text-[12px] text-gray-400">Klik &quot;Kelola&quot; untuk melihat info, mengatur waktu, atau mereset mesin</p>
        </div>

        {devicesLoading ? (
          <div className="flex items-center justify-center p-10 text-gray-300">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...
          </div>
        ) : devices.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-gray-400">
            Belum ada mesin terdaftar. Tambahkan mesin di bawah ini.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {devices.map((device) => {
              const isOnline = device.status === "ONLINE";
              return (
                <li
                  key={device.id}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-gray-50/60"
                >
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${isOnline ? "bg-emerald-100" : "bg-gray-100"}`}>
                    <Server className={`h-4.5 w-4.5 ${isOnline ? "text-emerald-600" : "text-gray-400"}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-semibold text-gray-900">{device.name}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${isOnline ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11.5px] text-gray-400">
                      <span className="font-mono">Cloud ID: {device.cloudId}</span>
                      <span>Sinkron: {formatDateTime(device.lastSync)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setManageTarget(device); setEditName(device.name); setResult(null); }}
                    className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-[12px] font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Kelola
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteDevice(device)}
                    className="flex-shrink-0 rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Hapus mesin"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Tambah Mesin */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Tambah Mesin</h2>
        <p className="mt-1 text-[13px] text-gray-400">
          Tambah mesin dengan Cloud ID dari portal developer Fingerspot. Mesin baru juga otomatis terdaftar saat webhook atau perintah API pertama kali masuk.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={newCloudId}
            onChange={(e) => setNewCloudId(e.target.value)}
            placeholder="Cloud ID (dari portal Fingerspot)"
            className="min-w-[220px] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] font-mono focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama mesin (opsional, misal: Kantor Pusat)"
            className="min-w-[200px] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleAddDevice}
            disabled={adding}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-medium text-white transition-colors shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tambah Mesin
          </button>
        </div>
      </div>

      {/* Popup Kelola */}
      <Dialog open={!!manageTarget} onOpenChange={(open) => { if (!open) setManageTarget(null); }}>
        <DialogContent className="sm:max-w-lg">
          {manageTarget && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 pr-8">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${manageTarget.status === "ONLINE" ? "bg-emerald-100" : "bg-gray-100"}`}>
                    <Server className={`h-5 w-5 ${manageTarget.status === "ONLINE" ? "text-emerald-600" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-[15px] font-semibold text-gray-900">
                      {manageTarget.name}
                    </DialogTitle>
                    <DialogDescription className="text-[12px] text-gray-400">
                      <span className="font-mono">{manageTarget.cloudId}</span>
                      {" · "}
                      <span className="capitalize">{manageTarget.status.toLowerCase()}</span>
                      {" · "}Sinkron: {formatDateTime(manageTarget.lastSync)}
                    </DialogDescription>
                  </div>
                </div>
                <div className="mt-1 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-[12px] font-medium text-gray-500">Nama Mesin</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nama mesin"
                      className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Simpan Nama
                  </button>
                </div>
              </DialogHeader>

              {/* Info Perangkat */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                      <Info className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="text-[13.5px] font-semibold text-gray-900">Info Perangkat</h3>
                  </div>
                  <button
                    onClick={() => handleGetDevice(manageTarget.cloudId, manageTarget.name)}
                    disabled={loadingInfo}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loadingInfo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {loadingInfo ? "Memuat..." : "Ambil"}
                  </button>
                </div>
                <div className="mt-3">
                  {deviceData[manageTarget.cloudId] ? (
                    <div className="max-h-48 space-y-1.5 overflow-auto pr-1">
                      {Object.entries(deviceData[manageTarget.cloudId]).map(([key, value]) => (
                        <div key={key} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-1.5">
                          <span className="text-[12px] text-gray-400">{formatKey(key)}</span>
                          <span className="break-all text-right font-mono text-[12px] text-gray-700">
                            {formatValue(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-gray-300">
                      Klik &quot;Ambil&quot; untuk memuat info perangkat
                    </p>
                  )}
                </div>
              </div>

              {/* Atur Zona Waktu */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                    <Clock className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h3 className="text-[13.5px] font-semibold text-gray-900">Atur Zona Waktu</h3>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <select
                    value={timezones[manageTarget.cloudId] || "Asia/Jakarta"}
                    onChange={(e) => setTimezones(p => ({ ...p, [manageTarget.cloudId]: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                    <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                    <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                  </select>
                  <button
                    onClick={() => handleSetTime(manageTarget.cloudId, manageTarget.name)}
                    disabled={actionLoading === `${manageTarget.cloudId}:set_time`}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[12px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {actionLoading === `${manageTarget.cloudId}:set_time` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    Set Time
                  </button>
                </div>
              </div>

              {/* Reset Perangkat */}
              <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                    <RotateCcw className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-gray-900">Reset Perangkat</h3>
                    <p className="text-[12px] text-gray-400">Mengirim perintah restart_device ke mesin</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRestart(manageTarget.cloudId, manageTarget.name)}
                  disabled={actionLoading === `${manageTarget.cloudId}:restart`}
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionLoading === `${manageTarget.cloudId}:restart` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Restart
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
