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
  FingerprintIcon,
  LogOut,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Data Absensi", href: "/attlog", icon: Fingerprint },
  { name: "Data User", href: "/userinfo", icon: Users },
  { name: "Daftar PIN", href: "/pins", icon: ListOrdered },
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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <FingerprintIcon className="h-6 w-6 text-blue-600" />
        <span className="text-lg font-semibold text-gray-900">Fingerspot</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
