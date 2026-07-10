"use client";

import { useState } from "react";
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
} from "lucide-react";

export default function DevicesPage() {
  const [deviceData, setDeviceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [pin, setPin] = useState("");
  const [qrString, setQrString] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleGetDevice = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "get_device", params: {} }),
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
        body: JSON.stringify({ command: "set_time", params: { timezone } }),
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
        body: JSON.stringify({ command: "restart_device", params: {} }),
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
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "set_qrcode", params: { pin, qrString } }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ type: "success", message: "Perintah set_qrcode berhasil dikirim" });
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
          </div>
        </div>
      </div>
    </div>
  );
}
