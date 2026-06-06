"use client";
// app/pemasukan/page.tsx

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Income, IncomeSource } from "@/types";
import {
  fetchIncomesByMonth,
  createIncome,
  updateIncome,
  deleteIncome,
  computeIncomeStats,
  INCOME_SOURCES,
  INCOME_SOURCE_MAP,
} from "@/lib/incomes";

// ── Helpers ───────────────────────────────────────────────

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function rp(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const BADGE_CLASS: Record<IncomeSource, string> = {
  donasi: "bg-teal-100 text-teal-800",
  hibah: "bg-blue-100 text-blue-800",
  denda: "bg-amber-100 text-amber-800",
  lainnya: "bg-gray-100 text-gray-700",
};

// ── Form state ────────────────────────────────────────────

type FormState = {
  date: string;
  description: string;
  source: IncomeSource;
  amount: string;
  proof: string;
};

const emptyForm = (): FormState => ({
  date: new Date().toISOString().slice(0, 10),
  description: "",
  source: "donasi",
  amount: "",
  proof: "",
});

// ── Main page ─────────────────────────────────────────────

export default function PemasukanPage() {
  const supabase = createClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSrc, setFilterSrc] = useState<"all" | IncomeSource>("all");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Income | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleExportPDF() {
    window.print();
  }

  async function handleUploadProof(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `incomes/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const { data, error } = await supabase.storage
        .from("bukti-pembayaran")
        .upload(fileName, file);

      if (error) {
        alert("Gagal mengunggah foto: " + error.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("bukti-pembayaran")
        .getPublicUrl(fileName);

      setF("proof", publicUrl);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengunggah.");
    } finally {
      setUploading(false);
    }
  }

  // ── Fetch ───────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchIncomesByMonth(month, year);
      setIncomes(data);
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const m = params.get("month");
      const y = params.get("year");
      if (m) setMonth(parseInt(m, 10));
      if (y) setYear(parseInt(y, 10));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Stats ───────────────────────────────────────────────

  const stats = computeIncomeStats(incomes);

  // ── Filtered list ────────────────────────────────────────

  const filtered = filterSrc === "all"
    ? incomes
    : incomes.filter((e) => e.source === filterSrc);

  // ── Form helpers ─────────────────────────────────────────

  function openAdd() {
    const today = new Date();
    const isCurrentMonthYear = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const dayStr = isCurrentMonthYear ? String(today.getDate()).padStart(2, "0") : "01";
    const defaultDate = `${year}-${String(month).padStart(2, "0")}-${dayStr}`;

    setForm({
      date: defaultDate,
      description: "",
      source: "donasi",
      amount: "",
      proof: "",
    });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(item: Income) {
    setForm({
      date: item.date,
      description: item.description,
      source: item.source,
      amount: String(item.amount),
      proof: item.proof ?? "",
    });
    setEditId(item.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.description.trim() || !form.amount || !form.date) return;
    setSaving(true);
    const payload = {
      date: form.date,
      description: form.description.trim(),
      source: form.source,
      amount: Number(form.amount),
      proof: form.proof.trim(),
    };
    try {
      if (editId) {
        await updateIncome(editId, payload);
        showToast("Pemasukan diperbarui");
      } else {
        await createIncome(payload);
        showToast("Pemasukan ditambahkan");
      }
      await load();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Income) {
    await deleteIncome(item.id);
    await load();
    setConfirmDel(null);
    showToast(`"${item.description}" dihapus`);
  }

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {/* Header */}
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-lg print:hidden">←</Link>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 print:text-xl">
                Pemasukan Lain-lain
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 print:text-sm">
                {MONTHS[month - 1]} {year}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 print:hidden w-full sm:w-auto">
            <select
              value={month}
              onChange={(e) => setMonth(+e.target.value)}
              className="w-full sm:w-auto text-sm border border-gray-200 rounded-lg px-2.5 sm:px-3 py-2 bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <div className="flex items-center justify-between border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 overflow-hidden focus-within:border-teal-500 transition-colors w-full sm:w-auto">
              <button onClick={() => setYear(y => y - 1)} className="px-3 sm:px-3 py-2 text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-neutral-700 transition-colors active:bg-gray-100">
                <span className="text-[10px] sm:text-xs">◀</span>
              </button>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(+e.target.value)}
                className="w-10 sm:w-14 text-sm text-center px-0 py-2 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button onClick={() => setYear(y => y + 1)} className="px-3 sm:px-3 py-2 text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-neutral-700 transition-colors active:bg-gray-100">
                <span className="text-[10px] sm:text-xs">▶</span>
              </button>
            </div>
            <button
              onClick={handleExportPDF}
              className="flex items-center justify-center gap-1 text-sm w-full sm:w-auto px-2.5 sm:px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-200 transition-colors"
            >
              ⬇️ PDF
            </button>
            <button
              onClick={openAdd}
              className="flex items-center justify-center gap-1 text-sm w-full sm:w-auto px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors"
            >
              + Tambah
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm">
            <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Pemasukan Lain</p>
            <h3 className="text-lg sm:text-xl font-bold mt-1 sm:mt-1.5 text-teal-600 dark:text-teal-400">{loading ? "..." : rp(stats.total)}</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 hidden sm:block">Akumulasi donasi & hibah di luar iuran warga</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Jumlah Entri</p>
               <h3 className="text-lg sm:text-xl font-bold mt-1 sm:mt-1.5 text-gray-900 dark:text-white">{stats.count} Transaksi</h3>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>


        {/* Tabel semua transaksi */}
        <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">
              Semua Transaksi ({filtered.length})
            </p>
            {/* Filter kategori - scrollable edge-to-edge on mobile */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide print:hidden">
              <button
                onClick={() => setFilterSrc("all")}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors whitespace-nowrap flex-shrink-0 ${filterSrc === "all" ? "bg-teal-100 border-teal-300 text-teal-800 font-semibold" : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-400"}`}
              >
                Semua
              </button>
              {INCOME_SOURCES.map((src) => (
                <button
                  key={src.id}
                  onClick={() => setFilterSrc(src.id)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors whitespace-nowrap flex-shrink-0 ${filterSrc === src.id ? "font-semibold" : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-neutral-700 dark:text-gray-400"}`}
                  style={filterSrc === src.id ? { background: src.color + "22", borderColor: src.color, color: src.color } : {}}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Memuat data...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-3xl mb-2">🧾</div>
              <p className="text-sm">Tidak ada transaksi di sumber ini</p>
            </div>
          ) : (
            <>
              {/* Mobile: Card view */}
              <div className="block sm:hidden flex flex-col gap-2">
                {filtered.map((item) => {
                  const src = INCOME_SOURCE_MAP[item.source];
                  return (
                    <div key={item.id} className="bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl p-3 hover:border-gray-200 dark:hover:border-neutral-700 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.description}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{fmtDate(item.date)}</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">{rp(item.amount)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${BADGE_CLASS[item.source]}`}>
                            {src.label}
                          </span>
                          {item.proof && item.proof.startsWith("http") && (
                            <a href={item.proof} target="_blank" rel="noreferrer" className="text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-bold hover:underline">
                              🖼️ Bukti
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2 print:hidden">
                          <button onClick={() => openEdit(item)} className="w-8 h-8 flex items-center justify-center border border-gray-200 dark:border-neutral-700 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors" title="Edit">✏️</button>
                          <button onClick={() => setConfirmDel(item)} className="w-8 h-8 flex items-center justify-center border border-red-100 dark:border-red-950 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors" title="Hapus">🗑️</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Mobile total */}
                <div className="bg-gray-100 dark:bg-neutral-800 rounded-xl p-3 flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-gray-500">Total ({filtered.length} transaksi)</span>
                  <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{rp(filtered.reduce((s, e) => s + e.amount, 0))}</span>
                </div>
              </div>

              {/* Desktop: Table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-neutral-700">
                      {["Tanggal", "Keterangan", "Sumber", "Bukti", "Nominal", "Aksi"].map((h) => (
                        <th key={h} className={`text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-2 px-3 first:pl-0 last:pr-0 whitespace-nowrap ${(h === "Bukti" || h === "Aksi") ? "print:hidden" : ""}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const src = INCOME_SOURCE_MAP[item.source];
                      return (
                        <tr key={item.id} className="border-b border-gray-50 dark:border-neutral-700/50 hover:bg-gray-50 dark:hover:bg-neutral-700/30 transition-colors">
                          <td className="py-2.5 px-3 first:pl-0 text-xs text-gray-500 whitespace-nowrap">{fmtDate(item.date)}</td>
                          <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200 max-w-[180px]">
                            <span className="block truncate">{item.description}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_CLASS[item.source]}`}>
                              {src.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap print:hidden">
                            {item.proof ? (
                              item.proof.startsWith("http") ? (
                                <a href={item.proof} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-teal-600 dark:text-teal-400 font-semibold hover:underline" title="Lihat Foto Bukti">
                                  🖼️ Lihat Bukti
                                </a>
                              ) : (
                                <span className="truncate block max-w-[120px]" title={item.proof}>{item.proof}</span>
                              )
                            ) : ("—")}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">{rp(item.amount)}</td>
                          <td className="py-2.5 px-3 last:pr-0 print:hidden">
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(item)} className="px-2 py-1 text-xs border border-gray-200 dark:border-neutral-600 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors" title="Edit">✏️</button>
                              <button onClick={() => setConfirmDel(item)} className="px-2 py-1 text-xs border border-red-100 dark:border-red-900 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors" title="Hapus">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-neutral-600">
                      <td colSpan={4} className="py-2.5 px-3 first:pl-0 text-xs font-semibold text-gray-500 print:hidden">
                        Total ({filtered.length} transaksi)
                      </td>
                      <td colSpan={3} className="py-2.5 px-3 first:pl-0 text-xs font-semibold text-gray-500 hidden print:table-cell">
                        Total ({filtered.length} transaksi)
                      </td>
                      <td className="py-2.5 px-3 font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                        {rp(filtered.reduce((s, e) => s + e.amount, 0))}
                      </td>
                      <td className="print:hidden" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal Form ───────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {editId ? "Edit Pemasukan" : "Tambah Pemasukan"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tanggal</label>
                <input type="date" value={form.date} onChange={(e) => setF("date", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-teal-500" />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Sumber</label>
                <select value={form.source} onChange={(e) => setF("source", e.target.value as IncomeSource)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-teal-500">
                  {INCOME_SOURCES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Keterangan</label>
              <input value={form.description} onChange={(e) => setF("description", e.target.value)}
                placeholder="Mis: Bantuan Desa..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-teal-500" />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Nominal (Rp)</label>
              <input type="number" value={form.amount} onChange={(e) => setF("amount", e.target.value)}
                placeholder="500000" min={0}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-teal-500" />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Bukti Transaksi (Opsional)</label>

              {form.proof && form.proof.startsWith("http") ? (
                <div className="relative border border-gray-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-neutral-900 p-2 flex items-center justify-between gap-3 mb-2.5">
                  <img src={form.proof} alt="Bukti" className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-neutral-700" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{form.proof.split("/").pop()}</p>
                    <a href={form.proof} target="_blank" rel="noreferrer" className="text-[10px] text-teal-600 font-semibold hover:underline">Lihat Fullscreen ↗</a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setF("proof", "")}
                    className="px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors font-medium"
                    title="Hapus Bukti"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-gray-200 dark:border-neutral-600 rounded-xl p-5 text-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/20 transition-all mb-2.5">
                  <div className="text-2xl mb-1">{uploading ? "⏳" : "📸"}</div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    {uploading ? "Sedang Mengunggah..." : "Klik untuk Upload Foto/Struk"}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Maks. 5MB (JPG, PNG)</div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadProof}
                    disabled={uploading}
                  />
                </label>
              )}

              <input
                value={form.proof}
                onChange={(e) => setF("proof", e.target.value)}
                placeholder="Atau tempel link URL bukti secara manual di sini..."
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 dark:border-neutral-700">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium disabled:opacity-50 transition-colors">
                {saving ? "Menyimpan..." : editId ? "Perbarui" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ───────────────────────────────── */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Hapus Transaksi?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Yakin hapus <strong>"{confirmDel.description}"</strong>? Data tidak bisa dikembalikan.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDel(null)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300">
                Batal
              </button>
              <button onClick={() => handleDelete(confirmDel)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors">
                🗑️ Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto bg-gray-900 text-white text-sm px-4 py-3 rounded-xl z-[300] flex items-center gap-2 shadow-lg">
          ✅ {toast}
        </div>
      )}
    </div>
  );
}
