"use client";

import { useEffect, useState } from "react";
import {
  Fingerprint,
  Users,
  ScrollText,
  Webhook,
  Activity,
  Clock,
} from "lucide-react";

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

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Absensi",
      value: stats?.totalAttlog || 0,
      icon: Fingerprint,
      color: "bg-blue-500",
    },
    {
      title: "Absensi Hari Ini",
      value: stats?.todayAttlog || 0,
      icon: Clock,
      color: "bg-emerald-500",
    },
    {
      title: "Total User",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "bg-violet-500",
    },
    {
      title: "Total Mesin",
      value: stats?.totalDevices || 0,
      icon: Activity,
      color: "bg-amber-500",
    },
    {
      title: "Riwayat API",
      value: stats?.totalApiLogs || 0,
      icon: ScrollText,
      color: "bg-cyan-500",
    },
    {
      title: "Riwayat Webhook",
      value: stats?.totalWebhookLogs || 0,
      icon: Webhook,
      color: "bg-rose-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitoring integrasi Fingerspot Attendance System
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {card.title}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {card.value.toLocaleString("id-ID")}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}
              >
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Informasi Webhook
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Untuk menerima data real-time dari mesin absensi, set URL webhook di
          dashboard developer.fingerspot.io ke:
        </p>
        <div className="mt-3 rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-700">
          {typeof window !== "undefined"
            ? `${window.location.origin}/api/webhook/fingerspot`
            : "/api/webhook/fingerspot"}
        </div>
      </div>
    </div>
  );
}
