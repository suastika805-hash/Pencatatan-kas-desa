// lib/incomes.ts
import { supabase } from "./supabase";
import type { Income, IncomeSource } from "@/types";

export async function fetchIncomes(): Promise<Income[]> {
  const { data, error } = await supabase
    .from("incomes")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return data as Income[];
}

export async function fetchIncomesByMonth(
  month: number,
  year: number
): Promise<Income[]> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("incomes")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (error) throw error;
  return data as Income[];
}

export async function createIncome(
  payload: Omit<Income, "id" | "created_at">
): Promise<Income> {
  const { data, error } = await supabase
    .from("incomes")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Income;
}

export async function updateIncome(
  id: string,
  updates: Partial<Omit<Income, "id" | "created_at">>
): Promise<void> {
  const { error } = await supabase
    .from("incomes")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase
    .from("incomes")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Helpers ──────────────────────────────────────────────

export const INCOME_SOURCES: {
  id: IncomeSource;
  label: string;
  color: string;
}[] = [
  { id: "donasi",   label: "Donasi", color: "#1D9E75" },
  { id: "hibah",    label: "Hibah",  color: "#378ADD" },
  { id: "denda",    label: "Denda",  color: "#EF9F27" },
  { id: "lainnya",  label: "Lainnya",color: "#888780" },
];

export const INCOME_SOURCE_MAP = Object.fromEntries(
  INCOME_SOURCES.map((c) => [c.id, c])
) as Record<IncomeSource, typeof INCOME_SOURCES[0]>;

export function computeIncomeStats(incomes: Income[]) {
  const total = incomes.reduce((s, e) => s + e.amount, 0);
  
  const breakdown = INCOME_SOURCES.map((src) => {
    const srcTotal = incomes
      .filter((e) => e.source === src.id)
      .reduce((s, e) => s + e.amount, 0);
    return {
      ...src,
      total: srcTotal,
      percent: total > 0 ? Math.round((srcTotal / total) * 100) : 0,
    };
  }).filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return { total, count: incomes.length, breakdown };
}
