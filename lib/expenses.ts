// lib/expenses.ts
import { supabase } from "./supabase";
import type { Expense, ExpenseCategory } from "@/types";

export async function fetchExpenses(periodId?: string): Promise<Expense[]> {
  let query = supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });

  if (periodId) query = query.eq("period_id", periodId);

  const { data, error } = await query;
  if (error) throw error;
  return data as Expense[];
}

export async function fetchExpensesByMonth(
  month: number,
  year: number
): Promise<Expense[]> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  
  // Hitung hari terakhir dari bulan ini secara dinamis (28, 29, 30, atau 31)
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (error) throw error;
  return data as Expense[];
}

export async function createExpense(
  payload: Omit<Expense, "id" | "created_at">
): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Expense;
}

export async function updateExpense(
  id: string,
  updates: Partial<Omit<Expense, "id" | "created_at">>
): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Helpers ──────────────────────────────────────────────

export const CATEGORIES: {
  id: ExpenseCategory;
  label: string;
  color: string;
  icon: string;
}[] = [
  { id: "kebersihan",  label: "Kebersihan",   color: "#1D9E75", icon: "ti-bucket"  },
  { id: "keamanan",    label: "Keamanan",     color: "#378ADD", icon: "ti-shield"  },
  { id: "perlengkapan",label: "Perlengkapan", color: "#7F77DD", icon: "ti-tool"    },
  { id: "sosial",      label: "Sosial/Dana",  color: "#EF9F27", icon: "ti-heart"   },
  { id: "lainnya",     label: "Lainnya",      color: "#888780", icon: "ti-dots"    },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<ExpenseCategory, typeof CATEGORIES[0]>;

export function computeExpenseStats(
  expenses: Expense[],
  totalIncome: number
) {
  const totalOut = expenses.reduce((s, e) => s + e.amount, 0);
  const balance  = totalIncome - totalOut;
  const biggest  = expenses.length ? Math.max(...expenses.map((e) => e.amount)) : 0;

  const breakdown = CATEGORIES.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat.id)
      .reduce((s, e) => s + e.amount, 0);
    return {
      ...cat,
      total,
      percent: totalOut > 0 ? Math.round((total / totalOut) * 100) : 0,
    };
  }).filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return { totalIn: totalIncome, totalOut, balance, biggest, count: expenses.length, breakdown };
}

/**
 * Mengambil total pemasukan bersih (status = lunas) untuk bulan & tahun tertentu
 */
export async function fetchMonthlyIncome(month: number, year: number): Promise<number> {
  const { data, error } = await supabase
    .from("payment_details")
    .select("amount")
    .eq("month", month)
    .eq("year", year)
    .eq("status", "lunas");

  if (error) throw error;
  if (!data) return 0;
  return data.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Mengambil laporan keuangan tahunan (pemasukan & pengeluaran terkumpul per bulan)
 */
export async function fetchYearlyFinancialReport(year: number) {
  // 1. Ambil semua pembayaran lunas untuk tahun tersebut
  const { data: paymentsData, error: paymentsError } = await supabase
    .from("payment_details")
    .select("month, amount")
    .eq("year", year)
    .eq("status", "lunas");

  if (paymentsError) throw paymentsError;

  // 2. Ambil semua pengeluaran untuk tahun tersebut
  const { data: expensesData, error: expensesError } = await supabase
    .from("expenses")
    .select("date, amount");

  if (expensesError) throw expensesError;

  // 3. Ambil semua pemasukan lain (non-iuran) untuk tahun tersebut
  const { data: incomesData, error: incomesError } = await supabase
    .from("incomes")
    .select("date, amount");

  if (incomesError) throw incomesError;

  // Inisialisasi laporan bulanan (Januari - Desember)
  const monthlyReport = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
  }));

  // Akumulasikan pemasukan bulanan dari iuran
  if (paymentsData) {
    paymentsData.forEach((p) => {
      if (p.month >= 1 && p.month <= 12) {
        monthlyReport[p.month - 1].income += p.amount;
      }
    });
  }

  // Akumulasikan pemasukan bulanan dari pendapatan lain-lain
  if (incomesData) {
    incomesData.forEach((i) => {
      const parts = i.date.split("-");
      const incYear = parseInt(parts[0], 10);
      const incMonth = parseInt(parts[1], 10); // 1-12
      if (incYear === year && incMonth >= 1 && incMonth <= 12) {
        monthlyReport[incMonth - 1].income += i.amount;
      }
    });
  }

  // Akumulasikan pengeluaran bulanan
  if (expensesData) {
    expensesData.forEach((e) => {
      const parts = e.date.split("-");
      const expYear = parseInt(parts[0], 10);
      const expMonth = parseInt(parts[1], 10); // 1-12
      if (expYear === year && expMonth >= 1 && expMonth <= 12) {
        monthlyReport[expMonth - 1].expense += e.amount;
      }
    });
  }

  // Hitung total akumulasi
  const totalIncome = monthlyReport.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = monthlyReport.reduce((sum, m) => sum + m.expense, 0);
  const balance = totalIncome - totalExpense;

  return {
    monthlyReport,
    totalIncome,
    totalExpense,
    balance,
  };
}

export async function fetchLifetimeBalance(): Promise<{ totalIncome: number; totalExpense: number; balance: number }> {
  const { data: pData, error: pErr } = await supabase
    .from("payment_details")
    .select("amount")
    .eq("status", "lunas");

  if (pErr) throw pErr;

  const { data: iData, error: iErr } = await supabase
    .from("incomes")
    .select("amount");

  if (iErr) throw iErr;

  const { data: eData, error: eErr } = await supabase
    .from("expenses")
    .select("amount");

  if (eErr) throw eErr;

  const paymentsTotal = pData ? pData.reduce((sum, p) => sum + p.amount, 0) : 0;
  const incomesTotal = iData ? iData.reduce((sum, p) => sum + p.amount, 0) : 0;
  
  const totalIncome = paymentsTotal + incomesTotal;
  const totalExpense = eData ? eData.reduce((sum, p) => sum + p.amount, 0) : 0;
  const balance = totalIncome - totalExpense;

  return { totalIncome, totalExpense, balance };
}

