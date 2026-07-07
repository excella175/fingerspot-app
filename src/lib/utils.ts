import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getVerifyMethod(code: number): string {
  const methods: Record<number, string> = {
    1: "Finger",
    2: "Password",
    3: "Card",
    4: "Face",
    5: "GPS",
    6: "Vein",
  };
  return methods[code] || "Unknown";
}

export function getStatusScan(code: number): string {
  const statuses: Record<number, string> = {
    0: "Scan In",
    1: "Scan Out",
    2: "Break In",
    3: "Break Out",
    4: "OT In",
    5: "OT Out",
  };
  return statuses[code] || "Unknown";
}

export function getStatusBadge(status: string) {
  switch (status) {
    case "SUCCESS":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "FAILED":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}
