"use client";
// app/riwayat/page.tsx — Riwayat Transaksi (Pemasukan & Pengeluaran)

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTransactionHistory, type Transaction } from "@/lib/history";

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatDate(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RiwayatPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  useEffect(() => {
    fetchTransactionHistory(150)
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gagal memuat riwayat:", err);
        setLoading(false);
      });
  }, []);

  const filtered = transactions.filter((t) => filter === "all" || t.type === filter);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-6 text-gray-900">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-3 sm:p-4 mb-4 shadow-sm gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link href="/" className="text-gray-400 hover:text-gray-700 text-lg flex-shrink-0">
              ←
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold truncate">Riwayat Transaksi</h1>
              <p className="text-[11px] sm:text-xs text-gray-500">Log aktivitas pemasukan & pengeluaran</p>
            </div>
          </div>
        </div>

        {/* Filter - Modern Segmented Control with Premium Styling */}
        <div className="flex gap-1.5 mb-4 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              filter === "all" ? "bg-neutral-900 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("income")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              filter === "income" ? "bg-teal-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Pemasukan
          </button>
          <button
            onClick={() => setFilter("expense")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              filter === "expense" ? "bg-rose-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Pengeluaran
          </button>
        </div>

        {/* Timeline List */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Memuat riwayat transaksi...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm">Belum ada aktivitas transaksi.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((trx, idx) => (
                <div key={idx} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                      trx.type === "income" ? "bg-teal-100 text-teal-600" : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {trx.type === "income" ? "📥" : "📤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{trx.title}</p>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{trx.subtitle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-bold ${
                        trx.type === "income" ? "text-teal-600" : "text-rose-600"
                      }`}
                    >
                      {trx.type === "income" ? "+" : "-"} {formatRp(trx.amount)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(trx.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
