"use client";
// app/laporan/page.tsx — Laporan Keuangan Tahunan KasDesa v3 (with Monthly Filter)

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  fetchYearlyFinancialReport,
  fetchExpensesByMonth,
  updateExpense,
  createExpense,
  fetchLifetimeBalance,
} from "@/lib/expenses";
import type { Expense } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

const MONTHS_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

type StatusFilter = "all" | "surplus" | "defisit" | "ada_transaksi";

function rp(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export default function LaporanTahunanPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<{
    monthlyReport: { month: number; income: number; expense: number }[];
    totalIncome: number;
    totalExpense: number;
    balance: number;
  }>({
    monthlyReport: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0 })),
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  const [lifetimeBalance, setLifetimeBalance] = useState<{
    totalIncome: number;
    totalExpense: number;
    balance: number;
  }>({ totalIncome: 0, totalExpense: 0, balance: 0 });

  // ── Filter state ───────────────────────────────────────
  const [fromMonth, setFromMonth] = useState(1);
  const [toMonth, setToMonth] = useState(12);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilter, setShowFilter] = useState(false);

  const [editMonth, setEditMonth] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalExpenses, setModalExpenses] = useState<Expense[]>([]);
  const [newExpenseForm, setNewExpenseForm] = useState({ description: "", amount: "", category: "lainnya" as any });

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [data, lifetime] = await Promise.all([
        fetchYearlyFinancialReport(year),
        fetchLifetimeBalance(),
      ]);
      setReportData(data);
      setLifetimeBalance(lifetime);
    } catch (err) {
      console.error("Gagal memuat laporan tahunan:", err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  const openQuickEdit = useCallback(async (month: number) => {
    setEditMonth(month);
    setModalLoading(true);
    try {
      const data = await fetchExpensesByMonth(month, year);
      setModalExpenses(data);
      setNewExpenseForm({ description: "", amount: "", category: "lainnya" });
    } catch (err) {
      console.error("Gagal mengambil data pengeluaran:", err);
    } finally {
      setModalLoading(false);
    }
  }, [year]);

  async function handleSaveQuickEdit() {
    setModalLoading(true);
    try {
      for (const exp of modalExpenses) {
        await updateExpense(exp.id, {
          amount: Number(exp.amount),
          description: exp.description,
        });
      }
      if (editMonth !== null && newExpenseForm.description.trim() && newExpenseForm.amount) {
        const defaultDate = `${year}-${String(editMonth).padStart(2, "0")}-01`;
        await createExpense({
          date: defaultDate,
          description: newExpenseForm.description.trim(),
          category: newExpenseForm.category,
          amount: Number(newExpenseForm.amount),
          proof: "",
          period_id: null,
        });
      }
      await loadReport();
      setEditMonth(null);
    } catch (err) {
      console.error("Gagal menyimpan perubahan pengeluaran:", err);
      alert("Gagal menyimpan perubahan.");
    } finally {
      setModalLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // ── Computed: filtered months ─────────────────────────
  const filteredMonths = useMemo(() => {
    return reportData.monthlyReport.filter((m) => {
      // Filter rentang bulan
      if (m.month < fromMonth || m.month > toMonth) return false;
      // Filter status
      const balance = m.income - m.expense;
      if (statusFilter === "surplus" && balance <= 0) return false;
      if (statusFilter === "defisit" && balance >= 0) return false;
      if (statusFilter === "ada_transaksi" && m.income === 0 && m.expense === 0) return false;
      return true;
    });
  }, [reportData.monthlyReport, fromMonth, toMonth, statusFilter]);

  // ── Computed: summary for filtered months ─────────────
  const filteredSummary = useMemo(() => {
    const totalIncome = filteredMonths.reduce((s, m) => s + m.income, 0);
    const totalExpense = filteredMonths.reduce((s, m) => s + m.expense, 0);
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [filteredMonths]);

  // ── Computed: chart data (only filtered months) ───────
  const chartData = filteredMonths.map((m) => ({
    bulan: MONTHS_SHORT[m.month - 1],
    Pemasukan: m.income,
    Pengeluaran: m.expense,
  }));

  // ── Check if filter is active ─────────────────────────
  const isFilterActive = fromMonth !== 1 || toMonth !== 12 || statusFilter !== "all";

  function resetFilter() {
    setFromMonth(1);
    setToMonth(12);
    setStatusFilter("all");
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#262626] rounded-xl border border-neutral-800 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-neutral-400 hover:text-white text-lg">←</Link>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-white">Laporan Keuangan Tahunan</h1>
              <p className="text-[11px] sm:text-xs text-neutral-400">Ringkasan Uang Masuk & Pengeluaran Kas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-9 sm:ml-0">
            <label className="text-xs text-neutral-400 font-medium">Tahun:</label>
            <div className="flex items-center border border-neutral-700 rounded-lg bg-neutral-800 overflow-hidden focus-within:border-teal-500 transition-colors">
              <button onClick={() => setYear(y => y - 1)} className="px-2.5 py-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors">
                <span className="text-[10px]">◀</span>
              </button>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                className="w-12 sm:w-14 text-sm text-center px-0 py-1.5 bg-transparent text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button onClick={() => setYear(y => y + 1)} className="px-2.5 py-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors">
                <span className="text-[10px]">▶</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lifetime Banner */}
        <div className="bg-gradient-to-r from-teal-950/40 via-teal-950/20 to-[#262626] border border-teal-800/40 rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-teal-600/90 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-xl sm:text-3xl shadow-lg shadow-teal-500/10 flex-shrink-0">💰</div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span className="hidden sm:inline">Total Saldo Kas Seluruh Tahun (Lifetime)</span>
                <span className="sm:hidden">Saldo Kas Lifetime</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-teal-400 font-medium truncate">Akumulasi pemasukan dikurangi pengeluaran</p>
            </div>
          </div>
          <div className="flex flex-col sm:items-end bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 sm:min-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total Dana Kas Bersih</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
              {loading ? "..." : rp(lifetimeBalance.balance)}
            </span>
          </div>
        </div>

        {/* Stats Grid (yearly totals) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl flex-shrink-0 shadow-sm shadow-emerald-500/20">📥</div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-emerald-400 uppercase tracking-wider">Total Pemasukan</p>
              <h3 className="text-base sm:text-lg font-bold text-emerald-300 mt-0.5">{loading ? "..." : rp(reportData.totalIncome)}</h3>
              <p className="text-[10px] text-emerald-500/70 mt-0.5 hidden sm:block">Akumulasi iuran lunas warga</p>
            </div>
          </div>

          <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl flex-shrink-0 shadow-sm shadow-rose-500/20">📤</div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-medium text-rose-400 uppercase tracking-wider">Total Pengeluaran</p>
              <h3 className="text-base sm:text-lg font-bold text-rose-300 mt-0.5">{loading ? "..." : rp(reportData.totalExpense)}</h3>
              <p className="text-[10px] text-rose-500/70 mt-0.5 hidden sm:block">Dibelanjakan untuk kebutuhan RT</p>
            </div>
          </div>

          <div className={`${reportData.balance >= 0 ? "bg-teal-950/30 border-teal-900/50 text-teal-300" : "bg-red-950/30 border-red-900/50 text-red-300"} border rounded-xl sm:rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 shadow-sm`}>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${reportData.balance >= 0 ? "bg-teal-600 shadow-teal-500/20" : "bg-red-600 shadow-red-500/20"} rounded-lg sm:rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl flex-shrink-0 shadow-sm`}>🛡️</div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider">Saldo Bersih Sisa</p>
              <h3 className="text-base sm:text-lg font-bold mt-0.5">{loading ? "..." : rp(reportData.balance)}</h3>
              <p className={`text-[10px] ${reportData.balance >= 0 ? "text-teal-400" : "text-red-400"} mt-0.5 hidden sm:block`}>
                {reportData.balance >= 0 ? "✓ Keuangan surplus & aman" : "⚠️ Kas mengalami defisit!"}
              </p>
            </div>
          </div>
        </div>

        {/* ── FILTER PANEL ───────────────────────────────── */}
        <div className="bg-[#262626] border border-neutral-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔍</span>
              <span className="text-xs sm:text-sm font-semibold text-white">Filter Rekap Bulanan</span>
              {isFilterActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600/30 text-teal-400 border border-teal-700/50">
                  Aktif
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isFilterActive && (
                <button
                  onClick={resetFilter}
                  className="text-[11px] text-neutral-400 hover:text-rose-400 transition-colors font-medium"
                >
                  ✕ Reset
                </button>
              )}
              <button
                onClick={() => setShowFilter(v => !v)}
                className="text-xs px-3 py-1.5 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors font-medium"
              >
                {showFilter ? "▲ Tutup" : "▼ Buka"}
              </button>
            </div>
          </div>

          {showFilter && (
            <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* From month */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Dari Bulan</label>
                <select
                  value={fromMonth}
                  onChange={(e) => {
                    const v = +e.target.value;
                    setFromMonth(v);
                    if (v > toMonth) setToMonth(v);
                  }}
                  className="w-full px-3 py-2 text-sm border border-neutral-700 rounded-lg bg-neutral-800 text-white focus:outline-none focus:border-teal-500"
                >
                  {MONTHS_FULL.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>

              {/* To month */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Sampai Bulan</label>
                <select
                  value={toMonth}
                  onChange={(e) => {
                    const v = +e.target.value;
                    setToMonth(v);
                    if (v < fromMonth) setFromMonth(v);
                  }}
                  className="w-full px-3 py-2 text-sm border border-neutral-700 rounded-lg bg-neutral-800 text-white focus:outline-none focus:border-teal-500"
                >
                  {MONTHS_FULL.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Status Keuangan</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full px-3 py-2 text-sm border border-neutral-700 rounded-lg bg-neutral-800 text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="all">Semua Bulan</option>
                  <option value="surplus">Hanya Surplus ✓</option>
                  <option value="defisit">Hanya Defisit ⚠️</option>
                  <option value="ada_transaksi">Ada Transaksi</option>
                </select>
              </div>
            </div>
          )}

          {/* Filter summary result */}
          {isFilterActive && !loading && (
            <div className="mt-4 pt-4 border-t border-neutral-800">
              <p className="text-[11px] text-neutral-400 mb-2 font-medium uppercase tracking-wider">
                Hasil Filter — {filteredMonths.length} bulan ({MONTHS_FULL[fromMonth - 1]}
                {fromMonth !== toMonth ? ` – ${MONTHS_FULL[toMonth - 1]}` : ""})
                {statusFilter !== "all" && ` · ${statusFilter === "surplus" ? "Surplus" : statusFilter === "defisit" ? "Defisit" : "Ada Transaksi"}`}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider mb-0.5">Pemasukan</p>
                  <p className="text-sm sm:text-base font-bold text-emerald-300">{rp(filteredSummary.totalIncome)}</p>
                </div>
                <div className="bg-rose-950/30 border border-rose-900/40 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-rose-400 font-medium uppercase tracking-wider mb-0.5">Pengeluaran</p>
                  <p className="text-sm sm:text-base font-bold text-rose-300">{rp(filteredSummary.totalExpense)}</p>
                </div>
                <div className={`${filteredSummary.balance >= 0 ? "bg-teal-950/30 border-teal-900/40" : "bg-red-950/30 border-red-900/40"} rounded-xl p-3 text-center`}>
                  <p className={`text-[10px] font-medium uppercase tracking-wider mb-0.5 ${filteredSummary.balance >= 0 ? "text-teal-400" : "text-red-400"}`}>Selisih</p>
                  <p className={`text-sm sm:text-base font-bold ${filteredSummary.balance >= 0 ? "text-teal-300" : "text-red-300"}`}>
                    {filteredSummary.balance >= 0 ? "+" : ""}{rp(filteredSummary.balance)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Visual Chart — filtered data */}
        <div className="bg-[#262626] border border-neutral-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-4 sm:mb-6 shadow-sm">
          <h2 className="text-xs sm:text-sm font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
            📊 Grafik Pemasukan vs Pengeluaran ({year})
            {isFilterActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-700/30 text-teal-400 border border-teal-700/40">Terfilter</span>}
          </h2>
          {loading ? (
            <div className="text-center py-12 sm:py-16 text-neutral-500 text-sm">Memuat grafik...</div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-sm">Tidak ada data untuk filter ini.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={0} angle={-45} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(value: number) => `${value / 1000}k`} width={45} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: '#262626', borderColor: '#404040', color: '#ffffff' }}
                  itemStyle={{ color: '#ffffff' }}
                  formatter={(value: number) => [rp(value), ""]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Breakdown Table */}
        <div className="bg-[#262626] border border-neutral-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
              🗓️ Rekap Per Bulan ({year})
              {isFilterActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-700/30 text-teal-400 border border-teal-700/40">
                  {filteredMonths.length} bulan
                </span>
              )}
            </h2>
          </div>

          {/* Mobile: Card view */}
          <div className="block sm:hidden">
            {loading ? (
              <div className="text-center py-12 text-neutral-500 text-sm">Memuat laporan...</div>
            ) : filteredMonths.length === 0 ? (
              <div className="text-center py-10 text-neutral-500 text-sm">
                <div className="text-3xl mb-2">📭</div>
                <p>Tidak ada bulan yang sesuai filter.</p>
                <button onClick={resetFilter} className="mt-3 text-xs text-teal-400 hover:underline">Reset filter</button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredMonths.map((m) => {
                  const balance = m.income - m.expense;
                  const status = balance > 0 ? "Surplus" : balance < 0 ? "Defisit" : "Nihil";
                  return (
                    <div key={m.month} className="bg-neutral-900 rounded-xl border border-neutral-800 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-neutral-200">{MONTHS_FULL[m.month - 1]}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          status === "Surplus" ? "bg-emerald-950/40 text-emerald-400"
                          : status === "Defisit" ? "bg-rose-950/40 text-rose-400"
                          : "bg-neutral-800 text-neutral-400"
                        }`}>
                          {status === "Surplus" ? "✓ Surplus" : status === "Defisit" ? "⚠️ Defisit" : "● Nihil"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-neutral-500">Masuk</p>
                          <p className="text-xs font-medium text-emerald-400">{m.income > 0 ? rp(m.income) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-500">Keluar</p>
                          <p className="text-xs font-medium text-rose-400">{m.expense > 0 ? rp(m.expense) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-500">Selisih</p>
                          <p className={`text-xs font-semibold ${balance > 0 ? "text-emerald-400" : balance < 0 ? "text-rose-400" : "text-neutral-500"}`}>
                            {balance > 0 ? "+" + rp(balance) : balance < 0 ? rp(balance) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-neutral-800">
                        <button
                          onClick={() => openQuickEdit(m.month)}
                          className="flex-1 text-center text-xs py-2 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 font-semibold transition-all"
                        >
                          ✏️ Edit Cepat
                        </button>
                        <Link
                          href={`/pengeluaran?month=${m.month}&year=${year}`}
                          className="flex-1 text-center text-xs py-2 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 font-semibold transition-all"
                        >
                          📋 Pengeluaran
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Mobile filter total */}
                {filteredMonths.length > 0 && (
                  <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-3 mt-1">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold mb-2">
                      Total {filteredMonths.length} Bulan
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-neutral-500">Masuk</p>
                        <p className="text-xs font-bold text-emerald-400">{rp(filteredSummary.totalIncome)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-500">Keluar</p>
                        <p className="text-xs font-bold text-rose-400">{rp(filteredSummary.totalExpense)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-500">Selisih</p>
                        <p className={`text-xs font-bold ${filteredSummary.balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {filteredSummary.balance >= 0 ? "+" : ""}{rp(filteredSummary.balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 first:pl-0 whitespace-nowrap">Bulan</th>
                  <th className="py-2.5 px-3">Total Pemasukan</th>
                  <th className="py-2.5 px-3">Total Pengeluaran</th>
                  <th className="py-2.5 px-3">Selisih Bersih</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 last:pr-0 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-neutral-500">Memuat laporan...</td>
                  </tr>
                ) : filteredMonths.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-neutral-500">
                      <div className="text-2xl mb-2">📭</div>
                      <p className="text-sm">Tidak ada bulan yang sesuai filter.</p>
                      <button onClick={resetFilter} className="mt-2 text-xs text-teal-400 hover:underline">Reset filter</button>
                    </td>
                  </tr>
                ) : (
                  filteredMonths.map((m) => {
                    const balance = m.income - m.expense;
                    const status = balance > 0 ? "Surplus" : balance < 0 ? "Defisit" : "Nihil";
                    const statusClass =
                      status === "Surplus"
                        ? "bg-emerald-950/40 text-emerald-400"
                        : status === "Defisit"
                        ? "bg-rose-950/40 text-rose-400"
                        : "bg-neutral-800 text-neutral-400";

                    return (
                      <tr
                        key={m.month}
                        className="border-b border-neutral-800/60 hover:bg-neutral-800/30 transition-colors"
                      >
                        <td className="py-3 px-3 first:pl-0 font-medium text-neutral-200">
                          {MONTHS_FULL[m.month - 1]}
                        </td>
                        <td className="py-3 px-3 text-emerald-400 font-medium">
                          {m.income > 0 ? rp(m.income) : "—"}
                        </td>
                        <td className="py-3 px-3 text-rose-400 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span>{m.expense > 0 ? rp(m.expense) : "—"}</span>
                            <button
                              type="button"
                              onClick={() => openQuickEdit(m.month)}
                              className="text-xs text-neutral-500 hover:text-rose-400 transition-colors p-0.5 rounded hover:bg-neutral-800"
                              title="Edit Cepat Pengeluaran Bulan Ini"
                            >
                              ✏️
                            </button>
                          </div>
                        </td>
                        <td className={`py-3 px-3 font-semibold ${balance > 0 ? "text-emerald-400" : balance < 0 ? "text-rose-400" : "text-neutral-500"}`}>
                          {balance > 0 ? "+" + rp(balance) : balance < 0 ? rp(balance) : "—"}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                            {status === "Surplus" ? "✓ Surplus" : status === "Defisit" ? "⚠️ Defisit" : "● Nihil"}
                          </span>
                        </td>
                        <td className="py-3 px-3 last:pr-0 text-center">
                          <Link
                            href={`/pengeluaran?month=${m.month}&year=${year}`}
                            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 font-medium transition-colors"
                          >
                            ✏️ Pengeluaran
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Desktop tfoot total */}
              {!loading && filteredMonths.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-neutral-700">
                    <td className="py-3 px-3 first:pl-0 text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      Total ({filteredMonths.length} bulan)
                    </td>
                    <td className="py-3 px-3 text-sm font-bold text-emerald-300">
                      {rp(filteredSummary.totalIncome)}
                    </td>
                    <td className="py-3 px-3 text-sm font-bold text-rose-300">
                      {rp(filteredSummary.totalExpense)}
                    </td>
                    <td className={`py-3 px-3 text-sm font-black ${filteredSummary.balance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {filteredSummary.balance >= 0 ? "+" : ""}{rp(filteredSummary.balance)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>

      {/* Quick Edit Modal */}
      {editMonth !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#262626] rounded-2xl border border-neutral-800 shadow-xl max-w-md w-full p-6 text-left">

            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Edit Cepat Pengeluaran</h3>
                <p className="text-xs text-neutral-400">Bulan {MONTHS_FULL[editMonth - 1]} {year}</p>
              </div>
              <button type="button" onClick={() => setEditMonth(null)} className="text-neutral-400 hover:text-white text-lg">✕</button>
            </div>

            {modalLoading ? (
              <div className="text-center py-8 text-neutral-500 text-sm">Sedang memproses...</div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
                {modalExpenses.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Daftar Transaksi</p>
                    {modalExpenses.map((exp, idx) => (
                      <div key={exp.id} className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 flex flex-col gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-neutral-400">Keterangan Transaksi</label>
                          <input
                            type="text"
                            value={exp.description}
                            onChange={(e) => {
                              const copy = [...modalExpenses];
                              copy[idx].description = e.target.value;
                              setModalExpenses(copy);
                            }}
                            className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-neutral-700 rounded-lg bg-[#1f1f1f] text-white focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-neutral-400">Nominal (Rp)</label>
                          <input
                            type="number"
                            value={exp.amount}
                            onChange={(e) => {
                              const copy = [...modalExpenses];
                              copy[idx].amount = Number(e.target.value);
                              setModalExpenses(copy);
                            }}
                            className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-neutral-700 rounded-lg bg-[#1f1f1f] font-semibold text-rose-400 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-neutral-900 rounded-xl border border-dashed border-neutral-800 text-neutral-500 text-xs">
                    Belum ada pengeluaran di bulan ini.
                  </div>
                )}

                <div className="border-t border-neutral-800 pt-3">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">+ Tambah Pengeluaran Baru</p>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Mis: Beli sapu, alat tulis..."
                      value={newExpenseForm.description}
                      onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-neutral-700 rounded-lg bg-[#1f1f1f] text-white focus:outline-none focus:border-teal-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Nominal (Rp)"
                        value={newExpenseForm.amount}
                        onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-neutral-700 rounded-lg bg-[#1f1f1f] text-white focus:outline-none focus:border-teal-500"
                      />
                      <select
                        value={newExpenseForm.category}
                        onChange={(e) => setNewExpenseForm({ ...newExpenseForm, category: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 text-xs border border-neutral-700 rounded-lg bg-[#1f1f1f] text-white focus:outline-none focus:border-teal-500"
                      >
                        <option value="kebersihan">Kebersihan</option>
                        <option value="keamanan">Keamanan</option>
                        <option value="perlengkapan">Perlengkapan</option>
                        <option value="sosial">Sosial</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t border-neutral-800 mt-4">
              <button
                type="button"
                onClick={() => setEditMonth(null)}
                className="px-4 py-2 text-xs border border-neutral-700 text-neutral-300 rounded-lg font-medium hover:bg-neutral-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickEdit}
                disabled={modalLoading}
                className="px-4 py-2 text-xs bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {modalLoading ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
