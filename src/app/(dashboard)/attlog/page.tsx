"use client";

import { useEffect, useState, useRef } from "react";
import { formatDateTime, getVerifyMethod, getStatusScan } from "@/lib/utils";
import { Download, Search, ChevronLeft, ChevronRight, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AttlogEntry {
  id: string;
  employeePin: string;
  deviceCloudId: string;
  scanTime: string;
  verifyMethod: number | null;
  statusScan: number | null;
  status: string;
  source: string;
  createdAt: string;
}

export default function AttlogPage() {
  const [data, setData] = useState<AttlogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pin, setPin] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fetching, setFetching] = useState(false);
  const limit = 50;
  const initialLoad = useRef(true);

  const fetchData = (silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (pin) params.set("pin", pin);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    fetch(`/api/attlog?${params}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d.data || []);
        setTotal(d.total || 0);
        if (!silent) setLoading(false);
      })
      .catch(() => { if (!silent) setLoading(false); });
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [page, pin, startDate, endDate]);

  const handleFetchFromDevice = async () => {
    if (!startDate || !endDate) {
      alert("Isi tanggal mulai dan tanggal akhir");
      return;
    }
    setFetching(true);
    try {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "get_attlog",
          params: { startDate, endDate },
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert("Perintah get_attlog berhasil dikirim ke mesin!");
        setTimeout(fetchData, 2000);
      } else {
        alert("Gagal: " + (result.error || "Unknown error"));
      }
    } catch {
      alert("Gagal mengirim perintah");
    }
    setFetching(false);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Fingerprint className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Absensi</h1>
          <p className="text-[13px] text-gray-400">
            Riwayat scan absensi dari mesin
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                PIN Karyawan
              </label>
              <Input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Semua"
                className="w-36"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                Dari Tanggal
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                Sampai Tanggal
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setPage(1);
                fetchData();
              }}
            >
              <Search className="h-4 w-4 mr-1.5" />
              Filter
            </Button>
            <Button
              onClick={handleFetchFromDevice}
              disabled={fetching}
            >
              <Download className="h-4 w-4 mr-1.5" />
              {fetching ? "Mengirim..." : "Ambil dari Mesin"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PIN</TableHead>
              <TableHead>Waktu Scan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verifikasi</TableHead>
              <TableHead>Status Scan</TableHead>
              <TableHead>Sumber</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Memuat...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  Tidak ada data ditemukan
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono">{row.employeePin}</TableCell>
                  <TableCell>{formatDateTime(row.scanTime)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                        row.status === "IN"
                          ? "bg-emerald-50 text-emerald-700"
                          : row.status === "OUT"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.verifyMethod
                      ? getVerifyMethod(row.verifyMethod)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {row.statusScan != null
                      ? getStatusScan(row.statusScan)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                        row.source === "realtime"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {row.source}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Total {total.toLocaleString("id-ID")} data
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
