"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  MonitorCog,
  RefreshCw,
  Clock,
  RotateCcw,
  QrCode,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Server,
} from "lucide-react";

type Device = {
  id: string;
  cloudId: string;
  name: string;
  status: string;
  lastSync: string | null;
  createdAt: string;
};

export default function DevicesPage() {
  const [deviceData, setDeviceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [pin, setPin] = useState("");
  const [qrString, setQrString] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  // ---- Multi-device ----
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedCloudId, setSelectedCloudId] = useState("");
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [newCloudId, setNewCloudId] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchDevices = async () => {
    setDevicesLoading(true);
    try {
      const res = await fetch("/api/device");
      const data = await res.json();
      if (data.success) {
        setDevices(data.data);
        setSelectedCloudId((prev) =>
          prev && data.data.some((d: Device) => d.cloudId === prev) ? prev : (data.data[0]?.cloudId ?? ""),
        );
      }
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
        setSelectedCloudId(data.data.cloudId);
        await fetchDevices();
        setResult({ type: "success", message: "Mesin berhasil ditambahkan" });
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

  const commandBody = (command: string, params: Record<string, any> = {}) => ({
    command,
    params: selectedCloudId ? { ...params, cloudId: selectedCloudId } : params,
  });

  const handleGetDevice = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commandBody("get_device", { name: devices.find((d) => d.cloudId === selectedCloudId)?.name })),
      });
      const data = await res.json();
      if (data.success) {
        setDeviceData(data.data?.data || data.data);
        setResult({ type: "success", message: "Berhasil mengambil data perangkat" });
      } else {
        setResult({ type: "error", message: data.error || "Gagal mengambil data" });
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
    }
    setLoading(false);
  };

  const handleSetTime = async () => {
    setActionLoading("set_time");
    setResult(null);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commandBody("set_time", { timezone })),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", message: "Perintah set_time berhasil dikirim" });
      } else {
        setResult({ type: "error", message: data.error || "Gagal" });
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
    }
    setActionLoading("");
  };

  const handleRestart = async () => {
    if (!confirm("Yakin ingin restart mesin?")) return;
    setActionLoading("restart");
    setResult(null);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commandBody("restart_device")),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", message: "Perintah restart berhasil dikirim" });
      } else {
        setResult({ type: "error", message: data.error || "Gagal" });
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
    }
    setActionLoading("");
  };

  const handleSetQrCode = async () => {
    if (!pin || !qrString) {
      alert("PIN dan QR String harus diisi");
      return;
    }
    setActionLoading("set_qrcode");
    setResult(null);
    setQrImageUrl(null);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commandBody("set_qrcode", { pin, qrString })),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", message: "Perintah set_qrcode berhasil dikirim" });
        const url = await QRCode.toDataURL(qrString, { width: 200, margin: 2 });
        setQrImageUrl(url);
      } else {
        setResult({ type: "error", message: data.error || "Gagal" });
      }
    } catch {
      setResult({ type: "error", message: "Gagal mengirim perintah" });
    }
    setActionLoading("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <MonitorCog className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Perangkat</h1>
          <p className="text-[13px] text-gray-400">
            Kelola dan monitor mesin absensi
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

      {/* Daftar Mesin */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Daftar Mesin</h2>
            <p className="mt-1 text-[13px] text-gray-400">
              Tambah mesin dengan Cloud ID dari portal developer Fingerspot. Mesin baru akan otomatis terdaftar saat webhook atau perintah API pertama kali masuk.
            </p>
          </div>
          {devicesLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-300" />}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {devices.map((device) => (
            <div
              key={device.id}
              onClick={() => setSelectedCloudId(device.cloudId)}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                selectedCloudId === device.cloudId
                  ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200"
                  : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
              }`}
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                device.status === "ONLINE" ? "bg-emerald-100" : "bg-gray-100"
              }`}>
                <Server className={`h-4 w-4 ${device.status === "ONLINE" ? "text-emerald-600" : "text-gray-400"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-gray-900">{device.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    device.status === "ONLINE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {device.status === "ONLINE" ? "Online" : "Offline"}
                  </span>
                </div>
                <p className="truncate font-mono text-[11.5px] text-gray-400">Cloud ID: {device.cloudId}</p>
                <p className="text-[11px] text-gray-400">
                  {device.lastSync ? `Sinkron: ${new Date(device.lastSync).toLocaleString("id-ID")}` : "Belum pernah sinkron"}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device); }}
                className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Hapus mesin"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {devices.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-[13px] text-gray-400">
              Belum ada mesin terdaftar. Tambahkan mesin di bawah ini.
            </div>
          )}
        </div>

        {/* Tambah Mesin */}
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={newCloudId}
            onChange={(e) => setNewCloudId(e.target.value)}
            placeholder="Cloud ID (dari portal Fingerspot)"
            className="min-w-[220px] flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-mono focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nama mesin (opsional, misal: Kantor Pusat)"
            className="min-w-[200px] flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleAddDevice}
            disabled={adding}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tambah Mesin
          </button>
        </div>
      </div>

      {/* Pemilih mesin untuk perintah */}
      {devices.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <span className="text-[13px] font-medium text-gray-500">Kirim perintah ke:</span>
          <select
            value={selectedCloudId}
            onChange={(e) => setSelectedCloudId(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] font-medium focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {devices.map((d) => (
              <option key={d.cloudId} value={d.cloudId}>{d.name} ({d.cloudId})</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Info Perangkat</h2>
            <button
              onClick={handleGetDevice}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-200"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {loading ? "Memuat..." : "Ambil Info"}
            </button>
          </div>
          {deviceData ? (
            <div className="mt-4 space-y-3">
              {Object.entries(deviceData).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-[13px] text-gray-400">{key}</span>
                  <span className="font-mono text-[13px] text-gray-700">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[13px] text-gray-300">
              Klik &quot;Ambil Info&quot; untuk memuat data perangkat
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Atur Zona Waktu</h2>
          <p className="mt-1 text-[13px] text-gray-400">
            Mengirim perintah set_time ke perangkat
          </p>
          <div className="mt-4 flex gap-3">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
              <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
              <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
            </select>
            <button
              onClick={handleSetTime}
              disabled={actionLoading === "set_time"}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200"
            >
              {actionLoading === "set_time" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              Set Time
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Restart Perangkat</h2>
          <p className="mt-1 text-[13px] text-gray-400">
            Mengirim perintah restart ke perangkat
          </p>
          <div className="mt-4">
            <button
              onClick={handleRestart}
              disabled={actionLoading === "restart"}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm shadow-rose-200"
            >
              {actionLoading === "restart" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              Restart Mesin
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Set QR Code</h2>
          <p className="mt-1 text-[13px] text-gray-400">
            Setel string QR code untuk pengguna (VIDA Series)
          </p>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN Pengguna"
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={qrString}
              onChange={(e) => setQrString(e.target.value)}
              placeholder="String QR Code (max 300 karakter)"
              maxLength={300}
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSetQrCode}
              disabled={actionLoading === "set_qrcode"}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm shadow-amber-200"
            >
              {actionLoading === "set_qrcode" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              Set QR Code
            </button>
            {qrImageUrl && (
              <div className="mt-4 text-center">
                <p className="text-[13px] font-medium text-gray-500 mb-2">Preview QR Code:</p>
                <img src={qrImageUrl} alt="QR Code" className="mx-auto rounded-xl border border-gray-200" />
                <p className="mt-2 text-[11px] text-gray-400 font-mono break-all">{qrString}</p>
                <a
                  href={qrImageUrl}
                  download={`qr-${pin}.png`}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-[12px] text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Download PNG
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
