"use client";
// app/auth/login/page.tsx

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    if (!email || !password) return setError("Email dan password wajib diisi.");
    setLoading(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { setError("Email atau password salah."); setLoading(false); return; }
    router.push("/user/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white text-xl mx-auto mb-3">🏘️</div>
          <h1 className="text-base font-medium">Masuk ke KasDesa</h1>
          <p className="text-xs text-gray-500 mt-1">Portal pembayaran iuran warga</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-4">
              ⚠️ {error}
            </div>
          )}

          <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
          <input
            type="email" placeholder="email@contoh.com" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:border-teal-500"
          />

          <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
          <input
            type="password" placeholder="••••••••" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-4 focus:outline-none focus:border-teal-500"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Memproses..." : "🔑 Masuk"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Belum punya akun?{" "}
          <Link href="/auth/daftar" className="text-teal-600 hover:underline">Daftar di sini</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          <Link href="/" className="hover:text-gray-600">← Kembali ke beranda</Link>
        </p>
      </div>
    </div>
  );
}
