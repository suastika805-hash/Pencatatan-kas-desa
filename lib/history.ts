import { supabase } from "./supabase";
import type { Expense, PaymentDetail } from "@/types";

export type Transaction = 
  | { type: "income"; date: string; amount: number; title: string; subtitle: string; raw: PaymentDetail }
  | { type: "expense"; date: string; amount: number; title: string; subtitle: string; raw: Expense };

export async function fetchTransactionHistory(limit = 100): Promise<Transaction[]> {
  // 1. Fetch recent payments (pemasukan)
  const { data: payments, error: pErr } = await supabase
    .from("payment_details")
    .select("*")
    .eq("status", "lunas")
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(limit);

  if (pErr) throw pErr;

  // 2. Fetch recent expenses (pengeluaran)
  const { data: expenses, error: eErr } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (eErr) throw eErr;

  // 3. Fetch recent non-iuran incomes (Pemasukan Lain-lain)
  const { data: incomes, error: iErr } = await supabase
    .from("incomes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (iErr) throw iErr;

  // 4. Merge and format
  const transactions: Transaction[] = [];

  for (const p of (payments || []) as PaymentDetail[]) {
    transactions.push({
      type: "income",
      date: p.paid_at!,
      amount: p.amount,
      title: `Pelunasan: ${p.member_name}`,
      subtitle: `Tagihan ${p.period_name} (${p.month}/${p.year})`,
      raw: p as any,
    });
  }

  for (const inc of (incomes || []) as any[]) {
    transactions.push({
      type: "income",
      date: inc.date, // transaction date
      amount: inc.amount,
      title: inc.description || "Pemasukan Lain",
      subtitle: `Sumber: ${inc.source ? inc.source.charAt(0).toUpperCase() + inc.source.slice(1) : "Lainnya"}`,
      raw: inc,
    });
  }

  for (const e of (expenses || []) as Expense[]) {
    transactions.push({
      type: "expense",
      date: e.created_at, // using created_at for accurate sorting with paid_at
      amount: e.amount,
      title: e.description,
      subtitle: `Kategori: ${e.category}`,
      raw: e,
    });
  }

  // 5. Sort by date descending
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return transactions.slice(0, limit);
}
