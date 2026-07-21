"use client";

import { useState } from "react";
import { Webhook, Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const SAMPLE_PAYLOADS = {
  get_userid_list: {
    type: "get_userid_list",
    cloud_id: "test",
    trans_id: "test-manual-" + Date.now(),
    data: {
      pin_arr: ["1001", "1002"],
      total: 2,
    },
  },
  get_userinfo: {
    type: "get_userinfo",
    cloud_id: "test",
    trans_id: "test-manual-" + Date.now(),
    data: {
      PIN: "1001",
      Name: "Test User",
      Privilege: 1,
      Finger: 1,
      Face: 1,
    },
  },
  attlog: {
    type: "attlog",
    cloud_id: "test",
    trans_id: "test-manual-" + Date.now(),
    data: [
      {
        PIN: "1001",
        Scan: new Date().toISOString(),
        Verify: 1,
        StatusScan: 0,
      },
    ],
  },
};

export default function WebhookTestPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: string; data: any; error?: string } | null>(null);

  const sendTest = async (type: "get_userid_list" | "get_userinfo" | "attlog") => {
    setLoading(type);
    setResult(null);

    try {
      const payload = JSON.parse(JSON.stringify(SAMPLE_PAYLOADS[type]));
      payload.trans_id = `test-manual-${Date.now()}`;

      const res = await fetch("/api/webhook/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setResult({ type, data });
    } catch (err: any) {
      setResult({ type, data: null, error: err.message || String(err) });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
          <Webhook className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Test Webhook</h1>
          <p className="text-[13px] text-gray-400">
            Kirim callback simulasi ke endpoint webhook untuk verifikasi
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <button
          onClick={() => sendTest("get_userid_list")}
          disabled={loading !== null}
          className="rounded-2xl border border-cyan-200 bg-white p-5 text-left shadow-sm hover:border-cyan-300 hover:shadow-md transition-all disabled:opacity-50"
        >
          <div className="mb-1 text-[15px] font-semibold text-cyan-700">get_userid_list</div>
          <div className="mb-3 text-[12px] text-gray-400">Simulasi callback daftar PIN</div>
          {loading === "get_userid_list" ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
          ) : (
            <Send className="h-4 w-4 text-cyan-500" />
          )}
        </button>

        <button
          onClick={() => sendTest("get_userinfo")}
          disabled={loading !== null}
          className="rounded-2xl border border-blue-200 bg-white p-5 text-left shadow-sm hover:border-blue-300 hover:shadow-md transition-all disabled:opacity-50"
        >
          <div className="mb-1 text-[15px] font-semibold text-blue-700">get_userinfo</div>
          <div className="mb-3 text-[12px] text-gray-400">Simulasi callback data user</div>
          {loading === "get_userinfo" ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          ) : (
            <Send className="h-4 w-4 text-blue-500" />
          )}
        </button>

        <button
          onClick={() => sendTest("attlog")}
          disabled={loading !== null}
          className="rounded-2xl border border-emerald-200 bg-white p-5 text-left shadow-sm hover:border-emerald-300 hover:shadow-md transition-all disabled:opacity-50"
        >
          <div className="mb-1 text-[15px] font-semibold text-emerald-700">attlog</div>
          <div className="mb-3 text-[12px] text-gray-400">Simulasi callback absensi realtime</div>
          {loading === "attlog" ? (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          ) : (
            <Send className="h-4 w-4 text-emerald-500" />
          )}
        </button>
      </div>

      {result && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            {result.error ? (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-[13px] font-semibold text-red-600">Gagal</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-[13px] font-semibold text-emerald-600">Berhasil</span>
              </>
            )}
            <span className="text-[11px] text-gray-400">— {result.type}</span>
          </div>
          {result.error ? (
            <div className="rounded-lg bg-red-50 p-3 text-[13px] text-red-600 font-mono">
              {result.error}
            </div>
          ) : (
            <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 p-3 text-[12px] text-gray-600 font-mono">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
          {!result.error && (
            <p className="mt-3 text-[12px] text-gray-400">
              ✅ Webhook handler merespon dalam &lt; 1 detik.{" "}
              <a href="/webhook-logs" className="text-blue-600 hover:underline">
                Cek riwayat webhook →
              </a>
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 text-[13px] text-amber-800">
        <strong>PENTING:</strong> Test ini hanya memverifikasi endpoint webhook dari browser.
        Jika berhasil, berarti handler webhook berfungsi. Jika tidak ada callback dari mesin
        Fingerspot, kemungkinan masalah ada di konfigurasi Webhook URL di{" "}
        <code className="rounded bg-amber-100 px-1.5 py-0.5 text-[12px]">
          developer.fingerspot.io
        </code>{" "}
        atau mesin tidak mengirim callback.
      </div>
    </div>
  );
}
