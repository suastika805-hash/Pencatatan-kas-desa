// lib/db.ts
import { supabase } from "./supabase";
import type { Member, Payment, PaymentDetail, Period } from "@/types";

// ── Members ───────────────────────────────────────────────────

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("is_active", true)
    .order("house_number");
  if (error) throw error;
  return data as Member[];
}

export async function createMember(
  member: Omit<Member, "id" | "created_at" | "is_active">
): Promise<Member> {
  const { data, error } = await supabase
    .from("members")
    .insert({ ...member, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return data as Member;
}

export async function updateMember(
  id: string,
  updates: Partial<Omit<Member, "id" | "created_at">>
): Promise<void> {
  const { error } = await supabase.from("members").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteMember(id: string): Promise<void> {
  // Soft delete — data histori tetap aman
  const { error } = await supabase
    .from("members")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw error;
}

// ── Periods ───────────────────────────────────────────────────

export async function fetchPeriods(): Promise<Period[]> {
  const { data, error } = await supabase
    .from("periods")
    .select("*")
    .order("year",  { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return data as Period[];
}

export async function createPeriod(
  period: Omit<Period, "id" | "created_at">,
  memberIds: string[]
): Promise<Period> {
  const { data: newPeriod, error: pe } = await supabase
    .from("periods")
    .insert(period)
    .select()
    .single();
  if (pe) throw pe;

  if (memberIds.length) {
    const payments = memberIds.map((member_id) => ({
      period_id: newPeriod.id,
      member_id,
      amount: period.amount,
      status: "belum",
    }));
    const { error: pyErr } = await supabase.from("payments").insert(payments);
    if (pyErr) throw pyErr;
  }
  return newPeriod as Period;
}

export async function deletePeriod(id: string): Promise<void> {
  const { error } = await supabase.from("periods").delete().eq("id", id);
  if (error) throw error;
}

// ── Payments ──────────────────────────────────────────────────

export async function fetchPaymentDetails(periodId: string): Promise<PaymentDetail[]> {
  const { data, error } = await supabase
    .from("payment_details")
    .select("*")
    .eq("period_id", periodId)
    .order("house_number");
  if (error) throw error;
  return data as PaymentDetail[];
}

// Riwayat semua tagihan untuk satu warga
export async function fetchMemberHistory(memberId: string): Promise<PaymentDetail[]> {
  const { data, error } = await supabase
    .from("payment_details")
    .select("*")
    .eq("member_id", memberId)
    .order("year",  { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return data as PaymentDetail[];
}

export async function updatePaymentStatus(
  id: string,
  status: "lunas" | "belum"
): Promise<void> {
  const { error } = await supabase.from("payments").update({
    status,
    paid_at: status === "lunas" ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) throw error;
}

export async function updatePayment(
  id: string,
  updates: Partial<Pick<Payment, "amount" | "notes">>
): Promise<void> {
  const { error } = await supabase.from("payments").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
}

// Tambah warga ke periode yang sudah ada
export async function addMemberToperiod(
  periodId: string,
  memberId: string,
  amount: number
): Promise<void> {
  const { error } = await supabase.from("payments").insert({
    period_id: periodId,
    member_id: memberId,
    amount,
    status: "belum",
  });
  if (error) throw error;
}

// Statistik per bulan (untuk grafik)
export async function fetchMonthlyStats(year: number) {
  const { data, error } = await supabase
    .from("payment_details")
    .select("month, status, amount")
    .eq("year", year);
  if (error) throw error;

  const months: Record<number, { paid: number; unpaid: number; collected: number }> = {};
  for (let m = 1; m <= 12; m++) months[m] = { paid: 0, unpaid: 0, collected: 0 };

  (data as { month: number; status: string; amount: number }[]).forEach((p) => {
    if (p.status === "lunas") {
      months[p.month].paid++;
      months[p.month].collected += p.amount;
    } else {
      months[p.month].unpaid++;
    }
  });
  return months;
}

// Real-time subscription
export function subscribeToPayments(
  periodId: string,
  callback: () => void
) {
  return supabase
    .channel(`payments:${periodId}`)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "payments",
      filter: `period_id=eq.${periodId}`,
    }, callback)
    .subscribe();
}
