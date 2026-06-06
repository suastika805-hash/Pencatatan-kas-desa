"use client";
// app/auth/daftar/page.tsx

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DaftarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "", house_no: "", phone: "", email: "", password: "", confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleDaftar() {
    setError("");
    if (form.password !== form.confirm) return setError("Password tidak cocok.");
    if (!form.name || !form.house_no || !form.email || !form.password)
      return setError("Semua kolom wajib diisi.");

    setLoading(true);
    const { data, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { name: form.name, house_no: form.house_no, phone: form.phone },
      },
    });

    if (authErr) { setError(authErr.message); setLoading(false); return; }

    // Simpan ke tabel members (status pending verifikasi bendahara)
    if (data.user) {
      await supabase.from("members").insert({
        id: data.user.id,
        name: form.name,
        house_no: form.house_no,
        phone: form.phone,
        is_active: false,   // Bendahara harus aktifkan dulu
      });
    }

    router.push("/auth/daftar/sukses");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-white text-xl mx-auto mb-3">🏘️</div>
          <h1 className="text-base font-medium">Daftar akun warga</h1>
          <p className="text-xs text-gray-500 mt-1">Isi data sesuai KTP / kartu warga</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mb-4">
              ⚠️ {error}
            </div>
          )}

          <Label>Nama lengkap</Label>
          <Input placeholder="Pak Budi Santoso" value={form.name} onChange={(v) => setField("name", v)} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>No. rumah / absen</Label>
              <Input placeholder="01" value={form.house_no} onChange={(v) => setField("house_no", v)} />
            </div>
            <div>
              <Label>No. HP (WA)</Label>
              <Input placeholder="08xx" value={form.phone} onChange={(v) => setField("phone", v)} />
            </div>
          </div>

          <Label>Email</Label>
          <Input type="email" placeholder="email@contoh.com" value={form.email} onChange={(v) => setField("email", v)} />

          <Label>Password</Label>
          <Input type="password" placeholder="Min. 6 karakter" value={form.password} onChange={(v) => setField("password", v)} />

          <Label>Konfirmasi password</Label>
          <Input type="password" placeholder="Ulangi password" value={form.confirm} onChange={(v) => setField("confirm", v)} />

          <button
            onClick={handleDaftar}
            disabled={loading}
            className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60 mt-1"
          >
            {loading ? "Mendaftarkan..." : "👤 Daftar & tunggu verifikasi"}
          </button>

          <p className="text-center text-xs text-gray-500 mt-3 leading-relaxed">
            Setelah daftar, bendahara RT akan memverifikasi akun Anda dalam 1×24 jam.
          </p>
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Sudah punya akun?{" "}
          <Link href="/auth/login" className="text-teal-600 hover:underline">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1.5">{children}</label>;
}

function Input({ type = "text", placeholder, value, onChange }: {
  type?: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:border-teal-500 transition-colors"
    />
  );
}
