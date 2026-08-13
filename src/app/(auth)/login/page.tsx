"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FingerprintIcon, Eye, EyeOff, User, Lock } from "lucide-react";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4">
      {/* Subtle decorative accents */}
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="absolute left-1/2 top-0 h-40 w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-indigo-100/60 to-transparent blur-2xl" />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="rounded-3xl border border-gray-100 bg-white/80 p-8 shadow-xl shadow-indigo-100/60 backdrop-blur-sm">
          <div className="mb-8 text-center">
            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-300/50">
              <FingerprintIcon className="h-8 w-8 text-white" />
              <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900">Fingerspot</h1>
            <p className="mt-1.5 text-[13px] text-gray-400">
              Masuk untuk mengelola dashboard absensi
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-600">Username</label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-[13px] text-gray-800 placeholder-gray-300 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Masukkan username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-600">Password</label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-[13px] text-gray-800 placeholder-gray-300 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 transition-colors hover:text-gray-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-indigo-300/40 transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg hover:shadow-indigo-300/50 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-50"
            >
              {loading ? "Memasuki..." : "Masuk"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[11px] text-gray-300">Sistem Absensi</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-300">
          &copy; 2026 Fingerspot Attendance System
        </p>
      </div>
    </div>
  );
}
