"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

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

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [newCloudId, setNewCloudId] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [deviceData, setDeviceData] = useState<Record<string, any>>({});
  const [loadingInfo, setLoadingInfo] = useState<Record<string, boolean>>({});
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
    if (!newCloudId.trim()) { alert("Cloud ID wajib diisi"); return; }
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
        await fetchDevices();
      } else {
        setResult({ type: "error", message: data.error || "Gagal menambahkan" });
      }
    } catch {
      setResult({ type: "error", message: "Gagal menambahkan mesin" });
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
        await fetchDevices();
      } else {
        setResult({ type: "error", message: data.error || "Gagal menghapus" });
      }
    } catch {
      setResult({ type: "error", message: "Gagal menghapus mesin" });
    }
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
    setLoadingInfo(p => ({ ...p, [cloudId]: true }));
    setResult(null);
    try {
      const data = await callFingerspot(cloudId, "get_device", { name });
      if (data.success) {
        setDeviceData(p => ({ ...p, [cloudId]: data.data?.data || data.data }));
        setResult({ type: "success", message: `Info perangkat ${name} berhasil diambil` });
      } else {
        setResult({ type: "error", message: data.error || "Gagal mengambil data" });
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
    }
    setLoadingInfo(p => ({ ...p, [cloudId]: false }));
  };

  const handleSetTime = async (cloudId: string, name: string) => {
    setActionLoading(`${cloudId}:set_time`);
    setResult(null);
    try {
      const data = await callFingerspot(cloudId, "set_time", { timezone: timezones[cloudId] || "Asia/Jakarta" });
      if (data.success) {
        setResult({ type: "success", message: `Perintah set_time berhasil dikirim ke ${name}` });
      } else {
        setResult({ type: "error", message: data.error || "Gagal" });
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
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
      } else {
        setResult({ type: "error", message: data.error || "Gagal" });
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
    }
    setActionLoading("");
  };

  const onlineCount = devices.filter((d) => d.status === "ONLINE").length;
  const latestSync = devices.reduce<string | null>((acc, d) => {
    if (!d.lastSync) return acc;
    if (!acc || d.lastSync > acc) return d.lastSync;
    return acc;
  }, null);

  const btnPrimary =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white transition-colors disabled:opacity-50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-200">
          <MonitorCog className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Perangkat</h1>
          <p className="text-[13px] text-gray-400">
            Kelola mesin absensi dan kirim perintah langsung ke perangkat
          </p>
        </div>
      </div>

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
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-gray-400">Sinkron Terakhir</p>
            <p className="text-[14px] font-semibold text-gray-800">
              {latestSync ? new Date(latestSync).toLocaleString("id-ID") : "Belum ada"}
            </p>
          </div>
        </div>
      </div>

      {/* Kartu per mesin */}
      {devicesLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 text-gray-300">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-[13px] text-gray-400">
          Belum ada mesin terdaftar. Tambahkan mesin di bawah ini.
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => {
            const isOnline = device.status === "ONLINE";
            const data = deviceData[device.cloudId];
            const loading = !!loadingInfo[device.cloudId];
            const tz = timezones[device.cloudId] || "Asia/Jakarta";
            return (
              <div key={device.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                {/* Judul kartu: nama mesin */}
                <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isOnline ? "bg-emerald-100" : "bg-gray-100"}`}>
                    <Server className={`h-5 w-5 ${isOnline ? "text-emerald-600" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[15px] font-bold text-gray-900">{device.name}</h2>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        isOnline ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    <p className="truncate font-mono text-[11.5px] text-gray-400">Cloud ID: {device.cloudId}</p>
                    <p className="text-[11px] text-gray-400">
                      {device.lastSync ? `Sinkron: ${new Date(device.lastSync).toLocaleString("id-ID")}` : "Belum pernah sinkron"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteDevice(device)}
                    className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Hapus mesin"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Aksi dalam kartu */}
                <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
                  {/* Info Perangkat */}
                  <div className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                          <Info className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="text-[13.5px] font-semibold text-gray-900">Info Perangkat</h3>
                      </div>
                      <button
                        onClick={() => handleGetDevice(device.cloudId, device.name)}
                        disabled={loading}
                        className={`${btnPrimary} bg-blue-600 hover:bg-blue-700`}
                      >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        {loading ? "Memuat..." : "Ambil"}
                      </button>
                    </div>
                    <div className="mt-3 flex-1">
                      {data ? (
                        <div className="max-h-64 space-y-2 overflow-auto pr-1">
                          {Object.entries(data).map(([key, value]) => (
                            <div key={key} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-1.5">
                              <span className="text-[12px] text-gray-400">{formatKey(key)}</span>
                              <span className="break-all text-right font-mono text-[12px] text-gray-700">
                                {formatValue(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[12.5px] text-gray-300">
                          Klik &quot;Ambil&quot; untuk memuat info perangkat
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Atur Zona Waktu */}
                  <div className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
                        <Clock className="h-4 w-4 text-indigo-600" />
                      </div>
                      <h3 className="text-[13.5px] font-semibold text-gray-900">Atur Zona Waktu</h3>
                    </div>
                    <p className="mt-2 text-[12.5px] text-gray-400">
                      Kirim perintah set_time untuk menyetel zona waktu mesin
                    </p>
                    <div className="mt-4 flex flex-1 flex-col justify-end gap-3">
                      <select
                        value={tz}
                        onChange={(e) => setTimezones(p => ({ ...p, [device.cloudId]: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                        <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                        <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                      </select>
                      <button
                        onClick={() => handleSetTime(device.cloudId, device.name)}
                        disabled={actionLoading === `${device.cloudId}:set_time`}
                        className={`${btnPrimary} justify-center bg-indigo-600 hover:bg-indigo-700`}
                      >
                        {actionLoading === `${device.cloudId}:set_time` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                        Set Time
                      </button>
                    </div>
                  </div>

                  {/* Reset Perangkat */}
                  <div className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50/40 p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100">
                        <RotateCcw className="h-4 w-4 text-rose-600" />
                      </div>
                      <h3 className="text-[13.5px] font-semibold text-gray-900">Reset Perangkat</h3>
                    </div>
                    <p className="mt-2 text-[12.5px] text-gray-400">
                      Kirim perintah restart_device untuk me-restart mesin
                    </p>
                    <div className="mt-4 flex flex-1 items-end">
                      <button
                        onClick={() => handleRestart(device.cloudId, device.name)}
                        disabled={actionLoading === `${device.cloudId}:restart`}
                        className={`${btnPrimary} w-full justify-center bg-rose-600 hover:bg-rose-700`}
                      >
                        {actionLoading === `${device.cloudId}:restart` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Restart Mesin
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            className="min-w-[220px] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama mesin (opsional, misal: Kantor Pusat)"
            className="min-w-[200px] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
    </div>
  );
}
