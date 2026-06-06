// types/index.ts

export interface Member {
  id: string;
  name: string;
  house_number: string;
  address: string;
  whatsapp: string;
  is_active: boolean;
  created_at: string;
}

export interface Period {
  id: string;
  name: string;
  month: number;
  year: number;
  amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  period_id: string;
  member_id: string;
  amount: number;
  status: "lunas" | "belum";
  paid_at: string | null;
  notes: string;
  created_at: string;
}

export interface PaymentDetail extends Payment {
  member_name: string;
  house_number: string;
  address: string;
  whatsapp: string;
  period_name: string;
  month: number;
  year: number;
}

export interface PeriodStats {
  total: number;
  paid: number;
  unpaid: number;
  totalCollected: number;
  totalExpected: number;
  progress: number;
}

export type FilterType = "all" | "lunas" | "belum";

export type ExpenseCategory = "kebersihan" | "keamanan" | "perlengkapan" | "sosial" | "lainnya";

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  proof: string;
  period_id: string | null;
  created_at: string;
}

export type IncomeSource = "donasi" | "hibah" | "denda" | "lainnya";

export interface Income {
  id: string;
  date: string;
  description: string;
  source: IncomeSource;
  amount: number;
  proof: string;
  created_at: string;
}

