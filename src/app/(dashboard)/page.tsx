"use client";

import { useEffect, useState } from "react";
import {
  Fingerprint, Users, ScrollText, Webhook, Activity,
  Clock, ArrowUpRight, Zap, Database, Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Stats {
  totalAttlog: number;
  todayAttlog: number;
  totalUsers: number;
  totalDevices: number;
  totalApiLogs: number;
  totalWebhookLogs: number;
  attendanceByDay: { day: string; date: string; hadir: number; telat: number }[];
  todayStatus: { label: string; value: number; color: string }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  const fetchStats = () => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchStats(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg("Membuat data sample...");
    try {
      const res = await fetch("/api/seed-sample");
      const data = await res.json();
      setSeedMsg(data.success ? "✅ " + data.message : "❌ " + (data.error || "Gagal"));
      fetchStats();
    } catch {
      setSeedMsg("❌ Gagal membuat data sample");
    }
    setSeeding(false);
    setTimeout(() => setSeedMsg(""), 6000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Memuat data...
        </div>
      </div>
    );
  }

  const maxHadir = Math.max(1, ...(stats?.attendanceByDay?.map((d) => d.hadir) || [0]));
  const totalStatus = (stats?.todayStatus || []).reduce((s, d) => s + d.value, 0) || 1;
  let donutOffset = 0;

  const statCards = [
    { label: "Total Absensi", value: stats?.totalAttlog || 0, icon: Fingerprint, gradient: "from-blue-600 to-blue-700", shadow: "shadow-blue-200", href: "/attlog" },
    { label: "Hari Ini", value: stats?.todayAttlog || 0, icon: Clock, gradient: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-200", href: "/attlog" },
    { label: "Total User", value: stats?.totalUsers || 0, icon: Users, gradient: "from-violet-500 to-violet-600", shadow: "shadow-violet-200", href: "/userinfo" },
    { label: "Total Mesin", value: stats?.totalDevices || 0, icon: Activity, gradient: "from-amber-500 to-amber-600", shadow: "shadow-amber-200", href: "/devices" },
    { label: "Riwayat API", value: stats?.totalApiLogs || 0, icon: ScrollText, gradient: "from-cyan-500 to-cyan-600", shadow: "shadow-cyan-200", href: "/api-logs" },
    { label: "Riwayat Webhook", value: stats?.totalWebhookLogs || 0, icon: Webhook, gradient: "from-rose-500 to-rose-600", shadow: "shadow-rose-200", href: "/webhook-logs" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitoring integrasi Fingerspot Attendance System
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className={cn("group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5", card.shadow)}>
              <div className={cn("absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full bg-gradient-to-br opacity-10", card.gradient)} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm", card.gradient)}>
                    <card.icon className="h-4 w-4 text-white" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight">{card.value.toLocaleString("id-ID")}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bar Chart: 7 Hari Terakhir */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-1">Absensi 7 Hari Terakhir</h3>
            <p className="text-xs text-muted-foreground mb-5">Jumlah scan masuk per hari</p>
            <div className="flex items-end gap-2 h-36">
              {(stats?.attendanceByDay || []).map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-medium text-muted-foreground">{d.hadir}</span>
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-blue-500 to-blue-400 transition-all hover:from-blue-600"
                    style={{ height: `${(d.hadir / maxHadir) * 100}%`, minHeight: d.hadir > 0 ? "8px" : "0" }}
                  />
                  <span className="text-[11px] text-muted-foreground/60">{d.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart: Status Hari Ini */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-1">Status Hari Ini</h3>
            <p className="text-xs text-muted-foreground mb-4">Distribusi kehadiran</p>
            <div className="flex flex-col items-center">
              <svg width="140" height="140" viewBox="0 0 100 100" className="-rotate-90">
                {(stats?.todayStatus || []).map((s) => {
                  const pct = s.value / totalStatus;
                  const circumference = 2 * Math.PI * 38;
                  const dashLen = circumference * pct;
                  const dashOffset = donutOffset;
                  donutOffset += dashLen;
                  return (
                    <circle
                      key={s.label}
                      cx="50" cy="50" r="38"
                      fill="none"
                      stroke={s.color}
                      strokeWidth="12"
                      strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                      strokeDashoffset={-dashOffset}
                      className="transition-all duration-700"
                    />
                  );
                })}
                <circle cx="50" cy="50" r="28" fill="white" className="dark:fill-gray-800" />
              </svg>
              <div className="mt-2 text-center">
                <span className="text-2xl font-bold">{stats?.todayAttlog || 0}</span>
                <p className="text-[11px] text-muted-foreground">Scan Hari Ini</p>
              </div>
              <div className="mt-4 flex gap-4">
                {(stats?.todayStatus || []).map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className="text-xs font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook URL */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-200">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Webhook URL</h2>
              <p className="text-xs text-muted-foreground">
                Set URL ini di dashboard developer.fingerspot.io untuk menerima data real-time
              </p>
            </div>
          </div>
          <div className="mt-3 select-all rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 font-mono text-[13px] text-blue-700">
            https://fingerspot-app.vercel.app/api/webhook/fingerspot
          </div>
        </CardContent>
      </Card>

      {/* Seed Data */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm shadow-amber-200">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Data Sample / Demo</h2>
              <p className="text-xs text-muted-foreground">
                Buat sample data absensi, aturan, jadwal, dan karyawan untuk demo
              </p>
            </div>
            <Button onClick={handleSeed} disabled={seeding} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-sm shadow-amber-200">
              {seeding && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {seeding ? "Memproses..." : "Generate Sample Data"}
            </Button>
          </div>
          {seedMsg && (
            <div className={`mt-3 rounded-xl p-3 text-[13px] ${
              seedMsg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {seedMsg}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
