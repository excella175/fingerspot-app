import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(val: string | Date | null | undefined): string {
  if (!val) return "-";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getVerifyMethod(method: number | null | undefined): string {
  const map: Record<number, string> = {
    0: "Password",
    1: "Fingerprint",
    2: "Card",
    3: "Face",
    4: "Vein",
    7: "QR Code",
    8: "Face & Finger",
  };
  return method != null ? map[method] || `Unknown (${method})` : "-";
}

export function getStatusScan(status: number | null | undefined): string {
  const map: Record<number, string> = {
    0: "IN",
    1: "OUT",
    2: "Break IN",
    3: "Break OUT",
  };
  return status != null ? map[status] || `Unknown (${status})` : "-";
}

export function getStatusBadge(status: string | null | undefined): string {
  const map: Record<string, string> = {
    SUCCESS: "success",
    FAILED: "destructive",
    RECEIVED: "secondary",
    PENDING: "warning",
  };
  return status ? map[status] || "secondary" : "secondary";
}
