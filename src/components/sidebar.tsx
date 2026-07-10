"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Fingerprint,
  Users,
  ListOrdered,
  ScrollText,
  Webhook,
  FileJson,
  MonitorCog,
  LogOut,
  FingerprintIcon,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Data Absensi", href: "/attlog", icon: Fingerprint },
  { name: "Data User", href: "/userinfo", icon: Users },
  { name: "Daftar PIN", href: "/pins", icon: ListOrdered },
  { name: "Perangkat", href: "/devices", icon: MonitorCog },
  { name: "Riwayat API", href: "/api-logs", icon: ScrollText },
  { name: "Riwayat Webhook", href: "/webhook-logs", icon: Webhook },
  { name: "Detail Payload", href: "/payload", icon: FileJson },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-100 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm shadow-blue-200">
          <FingerprintIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-gray-900">Fingerspot</span>
          <p className="text-[10px] font-medium text-gray-400">Attendance System</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-blue-600")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-gray-400 transition-all duration-150 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
