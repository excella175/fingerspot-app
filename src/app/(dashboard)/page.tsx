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
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg("Membuat data sample...");
    try {
      const res = await fetch("/api/seed-sample");
      const data = await res.json();
      setSeedMsg(data.success ? "✅ " + data.message : "❌ " + (data.error || "Gagal"));
    } catch {
      setSeedMsg("❌ Gagal membuat data sample");
    }
    setSeeding(false);
    // Refresh stats
    fetch("/api/stats").then((r) => r.json()).then((d) => setStats(d)).catch(() => {});
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

  const cards = [
    {
      title: "Total Absensi",
      value: stats?.totalAttlog || 0,
      icon: Fingerprint,
      color: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-100",
      href: "/attlog",
    },
    {
      title: "Absensi Hari Ini",
      value: stats?.todayAttlog || 0,
      icon: Clock,
      color: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-100",
      href: "/attlog",
    },
    {
      title: "Total User",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "from-violet-500 to-violet-600",
      shadow: "shadow-violet-100",
      href: "/userinfo",
    },
    {
      title: "Total Mesin",
      value: stats?.totalDevices || 0,
      icon: Activity,
      color: "from-amber-500 to-amber-600",
      shadow: "shadow-amber-100",
      href: "/devices",
    },
    {
      title: "Riwayat API",
      value: stats?.totalApiLogs || 0,
      icon: ScrollText,
      color: "from-cyan-500 to-cyan-600",
      shadow: "shadow-cyan-100",
      href: "/api-logs",
    },
    {
      title: "Riwayat Webhook",
      value: stats?.totalWebhookLogs || 0,
      icon: Webhook,
      color: "from-rose-500 to-rose-600",
      shadow: "shadow-rose-100",
      href: "/webhook-logs",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitoring integrasi Fingerspot Attendance System
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={cn("block", card.shadow)}
          >
            <Card className="group overflow-hidden transition-all hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                      {card.value.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-lg`}
                  >
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-muted-foreground/50 transition-colors group-hover:text-muted-foreground">
                  Lihat detail
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Webhook URL
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Set URL ini di dashboard developer.fingerspot.io untuk menerima data real-time
              </p>
            </div>
          </div>
          <div className="mt-4 select-all rounded-xl bg-muted px-4 py-3 font-mono text-[13px] text-foreground/60">
            https://fingerspot-app.vercel.app/api/webhook/fingerspot
          </div>
        </CardContent>
      </Card>

      {/* Seed Data */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Database className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-foreground">
                Data Sample / Demo
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Buat sample data absensi, aturan, jadwal, dan karyawan untuk demo
              </p>
            </div>
            <Button onClick={handleSeed} disabled={seeding}>
              {seeding && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {seeding ? "Memproses..." : "Generate Sample Data"}
            </Button>
          </div>
          {seedMsg && (
            <div className={`mt-3 rounded-xl p-3 text-[13px] ${
              seedMsg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {seedMsg}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
