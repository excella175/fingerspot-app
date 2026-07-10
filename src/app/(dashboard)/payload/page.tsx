"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, FileJson } from "lucide-react";
import Link from "next/link";

interface PayloadData {
  id: string;
  command?: string;
  type?: string;
  deviceCloudId: string;
  transId: string | null;
  status: string;
  requestPayload?: any;
  responsePayload?: any;
  payload?: any;
  errorMessage?: string | null;
  duration?: number | null;
  createdAt: string;
}

function PayloadContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const source = searchParams.get("source") || "api";
  const [data, setData] = useState<PayloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fetch(`/api/payload?id=${id}&source=${source}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d.data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat data");
        setLoading(false);
      });
  }, [id, source]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-[13px] text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Memuat...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href={source === "webhook" ? "/webhook-logs" : "/api-logs"}
          className="inline-flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-[13px] text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link
          href={source === "webhook" ? "/webhook-logs" : "/api-logs"}
          className="inline-flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-[13px] text-gray-300">
          Data tidak ditemukan
        </div>
      </div>
    );
  }

  const getPayloadJson = () => {
    if (source === "webhook") {
      return data.payload;
    }
    return {
      request: data.requestPayload,
      response: data.responsePayload,
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={source === "webhook" ? "/webhook-logs" : "/api-logs"}
          className="inline-flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <FileJson className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Detail Payload</h1>
            <p className="text-[13px] text-gray-400">
              {source === "webhook" ? "Webhook" : "API"} - {data.command || data.type} - {formatDateTime(data.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-[13px] font-semibold text-gray-500 uppercase tracking-wider">
            Informasi
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <dt className="text-[13px] text-gray-400">ID</dt>
              <dd className="max-w-[200px] truncate font-mono text-[13px] text-gray-700">{data.id}</dd>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <dt className="text-[13px] text-gray-400">
                {source === "webhook" ? "Tipe" : "Command"}
              </dt>
              <dd className="text-[13px] font-medium text-gray-900">
                {data.command || data.type}
              </dd>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <dt className="text-[13px] text-gray-400">Cloud ID</dt>
              <dd className="font-mono text-[13px] text-gray-700">
                {data.deviceCloudId}
              </dd>
            </div>
            {data.transId && (
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <dt className="text-[13px] text-gray-400">Trans ID</dt>
                <dd className="font-mono text-[13px] text-gray-700">{data.transId}</dd>
              </div>
            )}
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <dt className="text-[13px] text-gray-400">Status</dt>
              <dd>
                <span
                  className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
                    data.status === "SUCCESS"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : data.status === "FAILED"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {data.status}
                </span>
              </dd>
            </div>
            {data.duration != null && (
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <dt className="text-[13px] text-gray-400">Durasi</dt>
                <dd className="text-[13px] text-gray-700">{data.duration}ms</dd>
              </div>
            )}
            {data.errorMessage && (
              <div className="flex justify-between pb-2">
                <dt className="text-[13px] text-gray-400">Error</dt>
                <dd className="max-w-[300px] text-[13px] text-red-500">
                  {data.errorMessage}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-[13px] font-semibold text-gray-500 uppercase tracking-wider">
          Raw Payload (JSON)
        </h2>
        <pre className="overflow-x-auto rounded-xl bg-gray-50 border border-gray-100 p-4 text-[13px] leading-relaxed text-gray-700">
          {JSON.stringify(getPayloadJson(), null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default function PayloadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 text-[13px] text-gray-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Memuat...
          </div>
        </div>
      }
    >
      <PayloadContent />
    </Suspense>
  );
}
