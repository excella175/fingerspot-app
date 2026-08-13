"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function firstOfMonth() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0];
}

function lastOfMonth() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0];
}

function parseParams(): { from: string; to: string } {
  if (typeof window === "undefined") return { from: firstOfMonth(), to: lastOfMonth() };
  const p = new URLSearchParams(window.location.search);
  return {
    from: p.get("from") || firstOfMonth(),
    to: p.get("to") || lastOfMonth(),
  };
}

export function DateRangePicker() {
  const router = useRouter();
  const [{ from, to }, setRange] = useState(parseParams);

  useEffect(() => {
    const onPop = () => setRange(parseParams());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const update = useCallback((newFrom: string, newTo: string) => {
    const p = new URLSearchParams(window.location.search);
    p.set("from", newFrom);
    p.set("to", newTo);
    const qs = p.toString();
    const url = window.location.pathname + (qs ? `?${qs}` : "");
    window.history.replaceState(null, "", url);
    setRange({ from: newFrom, to: newTo });
  }, []);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-[13px] font-medium text-gray-500 mb-1.5">Dari Tanggal</label>
        <input
          type="date"
          value={from}
          onChange={(e) => update(e.target.value, to)}
          className="block rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-[13px] font-medium text-gray-500 mb-1.5">Sampai Tanggal</label>
        <input
          type="date"
          value={to}
          onChange={(e) => update(from, e.target.value)}
          className="block rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

// Get current date range from URL anywhere (not a hook, just a function)
export function getDateRange(): { from: string; to: string } {
  return parseParams();
}
