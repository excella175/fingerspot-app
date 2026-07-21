"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Webhook,
  MonitorCog,
  LogOut,
  FingerprintIcon,
  FileText,
  ChevronDown,
  CalendarClock,
  CalendarCheck,
  ClipboardList,
  Clock,
  Ban,
  Gavel,
  Briefcase,
  CalendarDays,
  Send,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    name: "Laporan",
    icon: FileText,
    children: [
      { name: "Data Absensi", href: "/attlog", icon: ClipboardList },
      { name: "Laporan Detail", href: "/reports/detail", icon: CalendarClock },
      { name: "Laporan Kehadiran", href: "/reports/attendance", icon: CalendarCheck },
    ],
  },
  {
    name: "Jam & Jadwal",
    icon: Clock,
    children: [
      { name: "Aturan", href: "/aturan", icon: Gavel },
      { name: "Jam Kerja", href: "/jam-kerja", icon: Briefcase },
      { name: "Jadwal", href: "/jadwal", icon: CalendarDays },
    ],
  },
  {
    name: "Izin & Cuti",
    icon: Ban,
    children: [
      { name: "Master Izin & Cuti", href: "/izin-cuti/master", icon: ClipboardList },
      { name: "Riwayat Izin & Cuti", href: "/izin-cuti/riwayat", icon: CalendarClock },
    ],
  },
  { name: "Data User", href: "/userinfo", icon: Users },
  { name: "Perangkat", href: "/devices", icon: MonitorCog },
  { name: "Riwayat API", href: "/api-logs", icon: ScrollText },
  { name: "Riwayat Webhook", href: "/webhook-logs", icon: Webhook },
  { name: "Test Webhook", href: "/webhook-test", icon: Send },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Laporan: pathname.startsWith("/attlog") || pathname.startsWith("/reports/"),
    "Jam & Jadwal": pathname.startsWith("/aturan") || pathname.startsWith("/jam-kerja") || pathname.startsWith("/jadwal"),
    "Izin & Cuti": pathname.startsWith("/izin-cuti/"),
  });

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm shadow-blue-200">
          <FingerprintIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-foreground">Fingerspot</span>
          <p className="text-[10px] font-medium text-muted-foreground">Attendance System</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          if ("children" in item && item.children) {
            const isOpen = openMenus[item.name] ?? true;
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "w-full justify-between"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {item.name}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-150",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 pl-2">
                    {item.children.map((child) => {
                      const active = isActive(child.href);
                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-all",
                            active
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                buttonVariants({ variant: active ? "secondary" : "ghost" }),
                "w-full justify-start gap-3"
              )}
            >
              <item.icon
                className={cn("h-[18px] w-[18px] flex-shrink-0", active && "text-blue-600")}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="p-3">
        <button
          onClick={handleLogout}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
