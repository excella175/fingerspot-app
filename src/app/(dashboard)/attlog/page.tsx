"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { formatDateTime, getVerifyMethod, getStatusScan } from "@/lib/utils";
import { Download, Search, ChevronLeft, ChevronRight, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker, getDateRange } from "@/components/date-range-picker";

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
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");
  const [devices, setDevices] = useState<{ id: string; cloudId: string; name: string }[]>([]);
  const [deviceCloudId, setDeviceCloudId] = useState("");
  const limit = 50;
  const initialLoad = useRef(true);

  useEffect(() => {
    fetch("/api/device").then((r) => r.json()).then((d) => {
      if (d.success) setDevices(d.data);
    }).catch(() => {});
  }, []);

  const getParams = useCallback(() => {
    const dr = getDateRange();
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (pin) params.set("pin", pin);
    if (deviceCloudId) params.set("deviceCloudId", deviceCloudId);
    if (dr.from) params.set("startDate", dr.from);
    if (dr.to) params.set("endDate", dr.to);
    return params;
  }, [page, pin, deviceCloudId]);

  const fetchData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetch(`/api/attlog?${getParams()}`)
      .then((res) => res.json())
      .then((d) => { setData(d.data || []); setTotal(d.total || 0); if (!silent) setLoading(false); })
      .catch(() => { if (!silent) setLoading(false); });
  }, [getParams]);

  useEffect(() => { fetchData(); }, [page]);

  // Re-fetch on popstate (back/forward nav changes URL)
  useEffect(() => {
    const handler = () => { setPage(1); fetchData(); };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [fetchData]);

  // Silent poll
  useEffect(() => {
    const interval = window.setInterval(() => fetchData(true), 10000);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  // Chunked fetch from device
  const handleFetchFromDevice = async () => {
    const { from, to } = getDateRange();
    if (!from || !to) { alert("Pilih tanggal dulu"); return; }
    if (!deviceCloudId) { alert("Pilih mesin dulu"); return; }

    const start = new Date(from);
    const end = new Date(to);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    setFetching(true);
    setFetchProgress(`Mengirim perintah ke mesin (${diffDays} hari)...`);

    const callChunk = async (cs: string, ce: string) => {
      const res = await fetch("/api/fingerspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "get_attlog", params: { startDate: cs, endDate: ce, cloudId: deviceCloudId } }),
      });
      return res.json();
    };

    if (diffDays <= 2) {
      // Single API call
      setFetchProgress("Memproses...");
      const r = await callChunk(from, to);
      setFetchProgress(r.success ? "✅ Selesai!" : "❌ Gagal: " + (r.error || ""));
      if (r.success) setTimeout(fetchData, 2000);
    } else {
      // Split into 2-day chunks
      let successCount = 0;
      let failCount = 0;
      const chunks: { start: string; end: string }[] = [];
      let current = new Date(start);
      while (current <= end) {
        const chunkEnd = new Date(current);
        chunkEnd.setDate(chunkEnd.getDate() + 1);
        if (chunkEnd > end) chunkEnd.setTime(end.getTime());
        chunks.push({
          start: current.toISOString().split("T")[0],
          end: chunkEnd.toISOString().split("T")[0],
        });
        current.setDate(current.getDate() + 2);
      }

      for (let i = 0; i < chunks.length; i++) {
        const { start: cs, end: ce } = chunks[i];
        setFetchProgress(`Memproses ${i + 1}/${chunks.length} (${cs} ~ ${ce})...`);
        try {
          const r = await callChunk(cs, ce);
          if (r.success) successCount++; else failCount++;
        } catch { failCount++; }
      }

      setFetchProgress(`✅ ${successCount} sukses${failCount ? `, ${failCount} gagal` : ""}`);
      if (successCount > 0) setTimeout(fetchData, 2000);
    }

    setTimeout(() => { setFetching(false); setFetchProgress(""); }, 3000);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-200">
          <Fingerprint className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Data Absensi</h1>
          <p className="text-[13px] text-gray-400">Riwayat scan absensi dari mesin</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">PIN Karyawan</label>
              <Input type="text" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Semua" className="w-36" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">Mesin</label>
              <select
                value={deviceCloudId}
                onChange={(e) => setDeviceCloudId(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 min-w-[180px]"
              >
                <option value="">Semua Mesin</option>
                {devices.map((d) => (
                  <option key={d.cloudId} value={d.cloudId}>{d.name} ({d.cloudId})</option>
                ))}
              </select>
            </div>
            <DateRangePicker />
            <Button variant="secondary" onClick={() => { setPage(1); fetchData(); }}>
              <Search className="h-4 w-4 mr-1.5" /> Cari
            </Button>
            <Button onClick={handleFetchFromDevice} disabled={fetching}>
              {fetching ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              {fetching ? "Memproses..." : "Tarik dari Mesin"}
            </Button>
          </div>
          {fetchProgress && (
            <div className={`mt-3 rounded-xl p-3 text-[13px] ${
              fetchProgress.startsWith("✅") ? "bg-green-50 text-green-700" :
              fetchProgress.startsWith("❌") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
            }`}>
              {fetchProgress}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu Scan</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verifikasi</TableHead>
              <TableHead>Mesin</TableHead>
              <TableHead>Sumber</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Memuat...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  Tidak ada data. Pilih tanggal dan klik &quot;Tarik dari Mesin&quot;.
                </TableCell>
              </TableRow>
            ) : data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(row.scanTime)}</TableCell>
                <TableCell className="font-mono">{row.employeePin}</TableCell>
                <TableCell>{getStatusScan(row.statusScan)}</TableCell>
                <TableCell>{getVerifyMethod(row.verifyMethod)}</TableCell>
                <TableCell className="text-xs">
                  {devices.find((d) => d.cloudId === row.deviceCloudId)?.name || row.deviceCloudId || "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">Total {total.toLocaleString("id-ID")} data</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm font-medium">{page} / {totalPages}</span>
              <Button variant="ghost" size="icon" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
