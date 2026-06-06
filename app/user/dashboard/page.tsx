"use client";
// app/user/dashboard/page.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Payment, Period } from "@/types";

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function UserDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [member, setMember] = useState<any>(null);
  const [payments, setPayments] = useState<(Payment & { periods: Period })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      // Ambil data member
      const { data: mem } = await supabase
        .from("members")
        .select("*")
        .eq("id", user.id)
        .single();
      setMember(mem);

      // Ambil semua tagihan untuk member ini
      const { data: pays } = await supabase
        .from("payments")
        .select("*, periods(*)")
        .eq("member_id", user.id)
        .order("created_at", { ascending: false });
      setPayments((pays as any) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const belum = payments.filter((p) => p.status === "belum");
  const lunas = payments.filter((p) => p.status === "lunas");
  const totalBelum = belum.reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-sm">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white text-sm">🏘️</div>
          <span className="font-medium text-gray-900">KasDesa</span>
        </div>
        <div className="flex items-center gap-3">
          {member && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-medium">
                {initials(member.name)}
              </div>
              <span className="text-sm text-gray-700 hidden sm:block">{member.name}</span>
            </div>
          )}
          <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg">
            Keluar
          </button>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Alert tunggakan */}
        {belum.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between mb-5">
            <div>
              <div className="text-sm font-medium text-amber-800">
                {belum.length} tagihan belum dibayar
              </div>
              <div className="text-xs text-amber-700 mt-0.5">Total: {rp(totalBelum)}</div>
            </div>
            <Link
              href={`/user/bayar/${belum[0].id}`}
              className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 font-medium"
            >
              Bayar sekarang
            </Link>
          </div>
        )}

        {/* Info warga */}
        {member && (
          <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-medium">
              {initials(member.name)}
            </div>
            <div>
              <div className="text-sm font-medium">{member.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                No. Rumah {member.house_no} · {member.is_active ? "✅ Terverifikasi" : "⏳ Menunggu verifikasi bendahara"}
              </div>
            </div>
          </div>
        )}

        {/* Tagihan belum bayar */}
        <div className="mb-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Tagihan menunggak</h2>
          {belum.length === 0 ? (
            <div className="text-center py-6 bg-white border border-gray-100 rounded-xl text-gray-400 text-sm">
              🎉 Semua tagihan sudah lunas!
            </div>
          ) : (
            belum.map((pay) => (
              <div key={pay.id} className="bg-white border border-gray-100 rounded-xl p-4 mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-content-center items-center justify-center text-lg flex-shrink-0">
                  ⏳
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{(pay.periods as any)?.name || "Iuran"}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {(pay.periods as any) ? `${["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][(pay.periods as any).month]} ${(pay.periods as any).year}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-amber-700">{rp(pay.amount)}</div>
                  <Link
                    href={`/user/bayar/${pay.id}`}
                    className="mt-1 inline-block px-3 py-1 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700"
                  >
                    Bayar
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Riwayat lunas */}
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Riwayat pembayaran</h2>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {lunas.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">Belum ada pembayaran.</div>
            ) : (
              lunas.map((pay, i) => (
                <div key={pay.id} className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t border-gray-50" : ""}`}>
                  <div className="text-lg">✅</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{(pay.periods as any)?.name || "Iuran"}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Lunas · {pay.paid_at ? new Date(pay.paid_at).toLocaleDateString("id-ID") : "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-teal-700">{rp(pay.amount)}</div>
                    <Link href={`/user/kwitansi/${pay.id}`} className="text-xs text-gray-400 hover:text-teal-600">
                      Kwitansi →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
