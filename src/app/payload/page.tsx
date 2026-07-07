"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
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
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href={source === "webhook" ? "/webhook-logs" : "/api-logs"}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
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
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
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
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Detail Payload
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {source === "webhook" ? "Webhook" : "API"} - {data.command || data.type} - {formatDateTime(data.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Informasi
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">ID</dt>
              <dd className="font-mono text-sm text-gray-900">{data.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">
                {source === "webhook" ? "Tipe" : "Command"}
              </dt>
              <dd className="text-sm font-medium text-gray-900">
                {data.command || data.type}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Cloud ID</dt>
              <dd className="font-mono text-sm text-gray-900">
                {data.deviceCloudId}
              </dd>
            </div>
            {data.transId && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Trans ID</dt>
                <dd className="font-mono text-sm text-gray-900">
                  {data.transId}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd>
                <span
                  className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${
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
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Durasi</dt>
                <dd className="text-sm text-gray-900">{data.duration}ms</dd>
              </div>
            )}
            {data.errorMessage && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Error</dt>
                <dd className="max-w-[300px] text-sm text-red-600">
                  {data.errorMessage}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Raw Payload (JSON)
        </h2>
        <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-800">
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
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      }
    >
      <PayloadContent />
    </Suspense>
  );
}
