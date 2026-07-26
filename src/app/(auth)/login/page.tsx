"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FingerprintIcon, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) { router.push("/"); router.refresh(); }
      else setError(data.error || "Login gagal");
    } catch { setError("Terjadi kesalahan. Coba lagi."); }
    finally { setLoading(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 px-4">
      {/* Animated background circles */}
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl animate-pulse [animation-delay:1s]" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/5 blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* Glass card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-violet-500 shadow-lg shadow-blue-500/30 ring-2 ring-white/20">
              <FingerprintIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">Fingerspot</h1>
            <p className="mt-1 text-[13px] text-white/50">
              Dashboard Attendance System
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-white/60">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[13px] text-white placeholder-white/30 outline-none transition-all focus:border-blue-400/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-white/60">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-[13px] text-white placeholder-white/30 outline-none transition-all focus:border-blue-400/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-4 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-violet-700 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
            >
              {loading ? "Memasuki..." : "Masuk"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/20">
          &copy; 2026 Fingerspot Attendance System
        </p>
      </div>
    </div>
  );
}
