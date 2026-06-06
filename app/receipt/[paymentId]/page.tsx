"use client";
// app/receipt/[paymentId]/page.tsx — Cetak Kwitansi

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PaymentDetail } from "@/types";

const MONTHS = ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export default function ReceiptPage({ params }: { params: { paymentId: string } }) {
  const [pay, setPay] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("payment_details")
        .select("*")
        .eq("id", params.paymentId)
        .single();
      setPay(data as PaymentDetail);
      setLoading(false);
    }
    load();
  }, [params.paymentId]);

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Memuat...</div>;
  if (!pay)    return <div className="flex items-center justify-center h-screen text-gray-400">Data tidak ditemukan.</div>;

  const paidDate = pay.paid_at
    ? new Date(pay.paid_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "-";

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
        @page { size: A5; margin: 1cm; }
      `}</style>

      {/* Action bar (tidak ikut print) */}
      <div className="no-print bg-gray-100 border-b px-4 sm:px-6 py-3 flex gap-3 items-center">
        <button onClick={() => { window.close(); window.location.href = '/'; }} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">← Kembali</button>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 sm:px-5 py-2 bg-teal-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          🖨️ Cetak Kwitansi
        </button>
      </div>

      {/* Kwitansi */}
      <div className="max-w-lg mx-3 sm:mx-auto my-6 sm:my-8 bg-white border-2 border-gray-800 rounded-lg p-4 sm:p-8 font-mono text-xs sm:text-sm shadow-sm">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
          <div className="text-2xl font-bold tracking-widest">KasDesa RT</div>
          <div className="text-xs text-gray-500 mt-1">Sistem Pencatatan Iuran Digital</div>
        </div>

        {/* Kwitansi label */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Kwitansi Pembayaran</div>
            <div className="text-xs text-gray-400 mt-0.5">No: {pay.id.split("-")[0].toUpperCase()}</div>
          </div>
          <div
            className={`px-3 py-1.5 text-xs font-bold rounded border-2 ${
              pay.status === "lunas"
                ? "border-teal-600 text-teal-700 bg-teal-50"
                : "border-amber-500 text-amber-700 bg-amber-50"
            }`}
          >
            {pay.status === "lunas" ? "✓ LUNAS" : "BELUM LUNAS"}
          </div>
        </div>

        {/* Detail */}
        <table className="w-full text-sm mb-6">
          <tbody>
            {[
              ["Nama",        pay.member_name],
              ["No. Rumah",   pay.house_number || "-"],
              ["Alamat",      pay.address || "-"],
              ["Periode",     `${MONTHS[pay.month]} ${pay.year}`],
              ["Jenis Iuran", pay.period_name],
              ["Nominal",     `Rp ${pay.amount.toLocaleString("id-ID")}`],
              ["Tgl Bayar",   paidDate],
              ["Catatan",     pay.notes || "-"],
            ].map(([label, value]) => (
              <tr key={label} className="border-b border-gray-100">
                <td className="py-1.5 text-gray-500 w-28">{label}</td>
                <td className="py-1.5 text-gray-400 pr-2">:</td>
                <td className="py-1.5 font-medium text-gray-800">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Terbilang */}
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-3 mb-6 text-xs text-gray-600 italic">
          Terbilang: <strong>{terbilang(pay.amount)} rupiah</strong>
        </div>

        {/* TTD */}
        <div className="flex justify-end">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-12">Bendahara RT,</div>
            <div className="border-t border-gray-400 pt-1 text-xs text-gray-700">(___________________)</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 mt-6 border-t pt-3">
          Dicetak via KasDesa · {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
        </div>
      </div>
    </>
  );
}

// Fungsi terbilang sederhana
function terbilang(n: number): string {
  const satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan",
    "sepuluh", "sebelas", "dua belas", "tiga belas", "empat belas", "lima belas", "enam belas",
    "tujuh belas", "delapan belas", "sembilan belas"];
  const puluhan = ["", "", "dua puluh", "tiga puluh", "empat puluh", "lima puluh",
    "enam puluh", "tujuh puluh", "delapan puluh", "sembilan puluh"];

  if (n === 0) return "nol";
  if (n < 20) return satuan[n];
  if (n < 100) return puluhan[Math.floor(n / 10)] + (n % 10 ? " " + satuan[n % 10] : "");
  if (n < 1000) return (n < 200 ? "seratus" : satuan[Math.floor(n / 100)] + " ratus") + (n % 100 ? " " + terbilang(n % 100) : "");
  if (n < 1000000) return (n < 2000 ? "seribu" : terbilang(Math.floor(n / 1000)) + " ribu") + (n % 1000 ? " " + terbilang(n % 1000) : "");
  return terbilang(Math.floor(n / 1000000)) + " juta" + (n % 1000000 ? " " + terbilang(n % 1000000) : "");
}
