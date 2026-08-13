"use client";

import { useEffect, useState } from "react";
import {
  Fingerprint, Users, ScrollText, Webhook, Activity,
  Clock, ArrowUpRight, Zap, Database, Loader2, Radio,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TONES: Record<string, { tile: string; icon: string }> = {
  indigo: { tile: "bg-indigo-50", icon: "text-indigo-600" },
  emerald: { tile: "bg-emerald-50", icon: "text-emerald-600" },
  violet: { tile: "bg-violet-50", icon: "text-violet-600" },
  amber: { tile: "bg-amber-50", icon: "text-amber-600" },
  cyan: { tile: "bg-cyan-50", icon: "text-cyan-600" },
  rose: { tile: "bg-rose-50", icon: "text-rose-600" },
};

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
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const timeLabel = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

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
    { label: "Total Absensi", value: stats?.totalAttlog || 0, icon: Fingerprint, tone: "indigo", href: "/attlog" },
    { label: "Hari Ini", value: stats?.todayAttlog || 0, icon: Clock, tone: "emerald", href: "/attlog" },
    { label: "Total User", value: stats?.totalUsers || 0, icon: Users, tone: "violet", href: "/userinfo" },
    { label: "Total Mesin", value: stats?.totalDevices || 0, icon: Activity, tone: "amber", href: "/devices" },
    { label: "Riwayat API", value: stats?.totalApiLogs || 0, icon: ScrollText, tone: "cyan", href: "/api-logs" },
    { label: "Riwayat Webhook", value: stats?.totalWebhookLogs || 0, icon: Webhook, tone: "rose", href: "/webhook-logs" },
  ];

  return (
    <div className="space-y-6">
      {/* Today Strip */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-emerald-600">Live WIB</span>
                </div>
                <p className="font-heading text-2xl font-bold tabular-nums tracking-tight text-gray-900">{timeLabel}</p>
                <p className="mt-0.5 text-[13px] text-gray-500">{dateLabel}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {(stats?.todayStatus || []).map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 shadow-sm backdrop-blur"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-[12.5px] font-medium text-gray-500">{s.label}</span>
                  <span className="font-heading text-[15px] font-bold tabular-nums text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="group relative overflow-hidden border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className={cn("absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full opacity-[0.07]", TONES[card.tone].tile)} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", TONES[card.tone].tile)}>
                    <card.icon className={cn("h-4 w-4", TONES[card.tone].icon)} />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
                </div>
                <p className="font-heading mt-3 text-2xl font-bold tabular-nums tracking-tight text-gray-900">{card.value.toLocaleString("id-ID")}</p>
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
            <h3 className="font-heading mb-1 text-sm font-semibold text-gray-900">Absensi 7 Hari Terakhir</h3>
            <p className="mb-5 text-xs text-muted-foreground">Jumlah scan masuk per hari</p>
            <div className="flex items-end gap-2 h-36">
              {(stats?.attendanceByDay || []).map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] font-medium text-muted-foreground">{d.hadir}</span>
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-indigo-500 to-indigo-400 transition-all hover:from-indigo-600"
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
            <h3 className="font-heading mb-1 text-sm font-semibold text-gray-900">Status Hari Ini</h3>
            <p className="mb-4 text-xs text-muted-foreground">Distribusi kehadiran</p>
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
                <span className="font-heading text-2xl font-bold tabular-nums text-gray-900">{stats?.todayAttlog || 0}</span>
                <p className="text-[11px] text-muted-foreground">Scan Hari Ini</p>
              </div>
              <div className="mt-4 flex gap-4">
                {(stats?.todayStatus || []).map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className="font-heading text-xs font-bold tabular-nums text-gray-900">{s.value}</span>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Zap className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-heading text-sm font-semibold text-gray-900">Webhook URL</h2>
              <p className="text-xs text-muted-foreground">
                Set URL ini di dashboard developer.fingerspot.io untuk menerima data real-time
              </p>
            </div>
          </div>
          <div className="mt-3 select-all rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-3 font-mono text-[13px] text-indigo-700">
            https://fingerspot-app.vercel.app/api/webhook/fingerspot
          </div>
        </CardContent>
      </Card>

      {/* Seed Data */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Database className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-sm font-semibold text-gray-900">Data Sample / Demo</h2>
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
