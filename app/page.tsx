"use client";
// app/page.tsx — Dashboard Utama KasDesa v2

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FilterType, Member, PaymentDetail, Period } from "@/types";
import {
  fetchPeriods, createPeriod,
  fetchPaymentDetails, fetchMembers,
  updatePaymentStatus, updatePayment, deletePayment, addMemberToperiod,
  fetchMonthlyStats, subscribeToPayments,
} from "@/lib/db";
import { getSession, signOut, onAuthChange } from "@/lib/auth";
import { sendWhatsApp, buildReminderMessage } from "@/lib/whatsapp";
import { MonthlyBarChart, PaymentPieChart } from "@/components/Charts";
import { HistoryModal } from "@/components/HistoryModal";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

const MONTHS_FULL = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const cls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500";

function periodLabel(p: Period) { return `${MONTHS_SHORT[p.month]} ${p.year}`; }
function formatRp(n: number) { return "Rp " + n.toLocaleString("id-ID"); }
function initials(name: string) { return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase(); }

function computeStats(payments: PaymentDetail[]) {
  const paid = payments.filter((p) => p.status === "lunas");
  return {
    total: payments.length, paid: paid.length, unpaid: payments.length - paid.length,
    totalCollected: paid.reduce((s, p) => s + p.amount, 0),
    progress: payments.length ? Math.round(paid.length / payments.length * 100) : 0,
  };
}

// ── Modal wrapper ─────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── AddPeriodModal ────────────────────────────────────────────
function AddPeriodModal({ members, onClose, onSave }: {
  members: Member[];
  onClose: () => void;
  onSave: (data: Omit<Period, "id" | "created_at">, memberIds: string[]) => void;
}) {
  const now = new Date();
  const [name, setName] = useState("Iuran Keamanan & Kebersihan");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState(50000);
  const [selected, setSelected] = useState<Set<string>>(new Set(members.map((m) => m.id)));

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <Modal title="Buat Tagihan Baru" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nama Iuran</label>
          <input className={cls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Bulan</label>
            <select className={cls} value={month} onChange={(e) => setMonth(+e.target.value)}>
              {MONTHS_FULL.slice(1).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tahun</label>
            <input type="number" className={cls} value={year} onChange={(e) => setYear(+e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nominal (Rp)</label>
          <input type="number" className={cls} value={amount} onChange={(e) => setAmount(+e.target.value)} />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-500">Pilih Warga ({selected.size})</label>
            <button className="text-xs text-teal-600" onClick={() => setSelected(new Set(members.map(m => m.id)))}>Semua</button>
          </div>
          <div className="max-h-44 overflow-y-auto border border-gray-100 rounded-lg p-2 flex flex-col gap-1">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="accent-teal-600" />
                <span className="text-sm">{m.house_number} — {m.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">Batal</button>
          <button onClick={() => onSave({ name, month, year, amount }, [...selected])}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg font-medium">Buat Tagihan</button>
        </div>
      </div>
    </Modal>
  );
}

// ── AddMemberModal ────────────────────────────────────────────
function AddMemberModal({ members, payments, defaultAmount, onClose, onSave }: {
  members: Member[]; payments: PaymentDetail[];
  defaultAmount: number; onClose: () => void;
  onSave: (memberId: string, amount: number) => void;
}) {
  const existing = new Set(payments.map((p) => p.member_id));
  const available = members.filter((m) => !existing.has(m.id));
  const [memberId, setMemberId] = useState(available[0]?.id ?? "");
  const [amount, setAmount] = useState(defaultAmount);

  if (available.length === 0) return (
    <Modal title="Tambah Warga" onClose={onClose}>
      <p className="text-sm text-gray-500 text-center py-4">Semua warga sudah masuk tagihan ini.</p>
    </Modal>
  );

  return (
    <Modal title="Tambah Warga ke Tagihan" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Warga</label>
          <select className={cls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {available.map((m) => <option key={m.id} value={m.id}>{m.house_number} — {m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nominal (Rp)</label>
          <input type="number" className={cls} value={amount} onChange={(e) => setAmount(+e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">Batal</button>
          <button onClick={() => memberId && onSave(memberId, amount)} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg font-medium">Tambah</button>
        </div>
      </div>
    </Modal>
  );
}

// ── EditPaymentModal ──────────────────────────────────────────
function EditPaymentModal({ pay, onClose, onSave }: {
  pay: PaymentDetail; onClose: () => void;
  onSave: (id: string, u: { amount?: number; notes?: string }) => void;
}) {
  const [amount, setAmount] = useState(pay.amount);
  const [notes, setNotes] = useState(pay.notes);
  return (
    <Modal title="Edit Tagihan" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{pay.member_name} · {pay.house_number}</p>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Nominal (Rp)</label>
          <input type="number" className={cls} value={amount} onChange={(e) => setAmount(+e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Catatan</label>
          <input className={cls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional..." />
        </div>
        <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">Batal</button>
          <button onClick={() => onSave(pay.id, { amount, notes })} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg font-medium">Simpan</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<PaymentDetail[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [showChart, setShowChart] = useState(false);
  const [monthlyData, setMonthlyData] = useState<Record<number, { paid: number; unpaid: number; collected: number }>>({});
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editPayment, setEditPayment] = useState<PaymentDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PaymentDetail | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(null);
  const [sendingWa, setSendingWa] = useState<string | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastQueue, setBroadcastQueue] = useState<PaymentDetail[]>([]);
  const [broadcastIndex, setBroadcastIndex] = useState(0);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    title: "KasDesa",
    subtitle: "Pencatatan Iuran RT / Kas Kelas",
    bank: "BRI 1234-5678-9012 a.n. Bendahara RT",
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tempProfile, setTempProfile] = useState(profile);

  useEffect(() => {
    const saved = localStorage.getItem("kasdesa_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        setTempProfile(parsed);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  function handleSaveProfile(newProfile: typeof profile) {
    setProfile(newProfile);
    localStorage.setItem("kasdesa_profile", JSON.stringify(newProfile));
    showToast("Profil kas berhasil diperbarui");
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // Auth
  useEffect(() => {
    getSession().then((s) => { if (!s) { router.push("/login"); return; } setAuthed(true); });
    const { data: l } = onAuthChange((s) => { if (!s) router.push("/login"); });
    return () => l.subscription.unsubscribe();
  }, [router]);

  const loadPeriods = useCallback(async () => { const d = await fetchPeriods(); setPeriods(d); if (d.length && !selectedId) setSelectedId(d[0].id); }, [selectedId]);
  const loadMembers = useCallback(async () => { setMembers(await fetchMembers()); }, []);
  const loadPayments = useCallback(async () => { if (!selectedId) return; setPayments(await fetchPaymentDetails(selectedId)); }, [selectedId]);
  const loadChart = useCallback(async () => { setMonthlyData(await fetchMonthlyStats(new Date().getFullYear())); }, []);

  useEffect(() => { if (authed) { loadPeriods(); loadMembers(); loadChart(); } }, [authed]);
  useEffect(() => { if (authed) loadPayments(); }, [selectedId, authed]);
  useEffect(() => {
    if (!selectedId) return;
    const ch = subscribeToPayments(selectedId, loadPayments);
    return () => { ch.unsubscribe(); };
  }, [selectedId, loadPayments]);

  const period = periods.find((p) => p.id === selectedId);
  const stats = computeStats(payments);
  const filtered = payments.filter((p) => {
    if (filter === "lunas" && p.status !== "lunas") return false;
    if (filter === "belum" && p.status !== "belum") return false;
    if (search && !p.member_name.toLowerCase().includes(search.toLowerCase()) &&
      !p.house_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleToggle(pay: PaymentDetail) {
    const ns = pay.status === "lunas" ? "belum" : "lunas";
    await updatePaymentStatus(pay.id, ns);
    await loadPayments(); await loadChart();
    showToast(`${pay.member_name} → ${ns === "lunas" ? "Lunas" : "Belum Bayar"}`);
  }

  async function handleSendWa(pay: PaymentDetail) {
    if (!pay.whatsapp) { showToast("No. WA belum diisi di halaman Warga", false); return; }
    if (!period) return;
    setSendingWa(pay.id);
    const msg = buildReminderMessage(
      pay.member_name,
      `${MONTHS_FULL[pay.month]} ${pay.year}`,
      pay.amount,
      profile.bank
    );
    const res = await sendWhatsApp(pay.whatsapp, msg);
    setSendingWa(null);
    showToast(res.message, res.ok);
  }

  function handleStartBroadcast() {
    const targets = filtered.filter(p => p.status === "belum" && p.whatsapp);
    if (targets.length === 0) {
      showToast("Tidak ada warga yang belum lunas & punya no WA di daftar ini.", false);
      return;
    }
    setBroadcastQueue(targets);
    setBroadcastIndex(0);
    setShowBroadcast(true);
  }

  async function handleSendBroadcastItem() {
    const pay = broadcastQueue[broadcastIndex];
    if (!pay) return;

    const msg = buildReminderMessage(
      pay.member_name,
      `${MONTHS_FULL[pay.month]} ${pay.year}`,
      pay.amount,
      profile.bank
    );

    // Buka tab WA
    await sendWhatsApp(pay.whatsapp, msg);

    // Lanjut ke indeks berikutnya
    if (broadcastIndex < broadcastQueue.length - 1) {
      setBroadcastIndex(prev => prev + 1);
    } else {
      setShowBroadcast(false);
      showToast("Semua pesan broadcast telah dibuka di WA!");
    }
  }

  if (authed === null) return <div className="flex items-center justify-center h-screen text-gray-400">Memuat...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 sm:pb-6">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => { setTempProfile(profile); setShowProfileModal(true); }}
                title="Edit Profil Kas Desa"
                className="w-9 h-9 bg-teal-600 hover:bg-teal-700 transition-colors rounded-lg flex items-center justify-center text-white flex-shrink-0 relative group"
              >
                <span>🏘️</span>
                <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px]">✏️</span>
                </div>
              </button>
              <div className="min-w-0 cursor-pointer" onClick={() => { setTempProfile(profile); setShowProfileModal(true); }}>
                <h1 className="text-sm sm:text-base font-semibold truncate hover:text-teal-700 transition-colors">{profile.title}</h1>
                <p className="text-[11px] sm:text-xs text-gray-400 truncate">{profile.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => setShowAddPeriod(true)} className="px-2.5 sm:px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg font-medium">+ Tagihan</button>
              <button onClick={async () => { await signOut(); router.push("/login"); }} title="Logout" className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">🚪</button>
            </div>
          </div>
          {/* Navigation - Premium Horizontally Scrollable Bar on Mobile */}
          <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:-mx-0 sm:px-0">
            <Link href="/members" className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap flex-shrink-0 transition-colors">👥 Warga</Link>
            <Link href="/laporan" className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap flex-shrink-0 transition-colors">📋 Laporan</Link>
            <Link href="/pemasukan" className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap flex-shrink-0 transition-colors">💰 Pemasukan</Link>
            <Link href="/pengeluaran" className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap flex-shrink-0 transition-colors">💸 Pengeluaran</Link>
            <Link href="/riwayat" className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap flex-shrink-0 transition-colors">📜 Riwayat</Link>
            <button onClick={() => setShowChart(s => !s)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap flex-shrink-0 transition-colors">📊 Grafik</button>
          </div>
        </div>

        {/* Chart */}
        {showChart && (
          <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm">
            <h2 className="text-sm font-semibold mb-3">📊 Statistik {new Date().getFullYear()}</h2>
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 min-h-[200px]"><MonthlyBarChart monthlyData={monthlyData} currentYear={new Date().getFullYear()} /></div>
              <div><p className="text-xs text-gray-400 text-center mb-2">Periode ini</p><PaymentPieChart paidCount={stats.paid} unpaidCount={stats.unpaid} /></div>
            </div>
          </div>
        )}

        {/* Stats */}
        {period && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              { label: "Total", value: stats.total, color: "text-gray-800" },
              { label: "Lunas", value: stats.paid, color: "text-teal-700" },
              { label: "Belum", value: stats.unpaid, color: "text-amber-600" },
              { label: "Terkumpul", value: formatRp(stats.totalCollected), color: "text-blue-700", small: true },
            ].map((s) => (
              <div key={s.label} className="bg-gray-100 rounded-lg p-2 sm:p-2.5 text-center">
                <div className="text-[11px] sm:text-xs text-gray-400">{s.label}</div>
                <div className={`font-semibold ${s.color} ${s.small ? "text-[11px] sm:text-xs mt-1 truncate" : "text-lg sm:text-xl"}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        {period && (
          <div className="bg-white rounded-lg border border-gray-100 px-3 sm:px-4 py-2.5 mb-3 shadow-sm">
            <div className="flex justify-between text-[11px] sm:text-xs mb-1.5">
              <span className="text-gray-500 truncate">{periodLabel(period)} — {period.name}</span>
              <span className="font-medium text-teal-700 ml-2 flex-shrink-0">{stats.progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }} />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-2 mb-3">
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:border-teal-500">
            {periods.map((p) => <option key={p.id} value={p.id}>{periodLabel(p)} — {p.name}</option>)}
          </select>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm flex-1">
              <span className="text-gray-400 text-sm">🔍</span>
              <input placeholder="Cari nama atau nomor rumah..." value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm outline-none bg-transparent w-full" />
            </div>
            <div className="flex bg-gray-100 border border-gray-200/50 rounded-lg p-1 flex-shrink-0 justify-between sm:justify-start gap-1">
              {(["all", "lunas", "belum"] as FilterType[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:bg-white/40"}`}>
                  {f === "all" ? "Semua" : f === "lunas" ? "Lunas" : "Belum"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List header */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">{filtered.length} warga</span>
          <div className="flex gap-2">
            {period && filter === "belum" && <button onClick={handleStartBroadcast} className="text-xs px-3 py-1.5 border border-green-200 text-green-700 rounded-lg bg-green-50 hover:bg-green-100 flex items-center gap-1"><WhatsAppIcon className="w-3.5 h-3.5" /> Broadcast</button>}
            {period && <button onClick={() => setShowAddMember(true)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">+ Warga</button>}
          </div>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">👥</div>
              <p>{filter === "belum" ? "Semua sudah bayar! 🎉" : "Tidak ada data."}</p>
            </div>
          ) : filtered.map((pay) => (
            <div key={pay.id} className="bg-white border border-gray-100 rounded-xl px-3 sm:px-4 py-3 hover:border-gray-200 shadow-sm">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${pay.status === "lunas" ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"}`}>
                  {initials(pay.member_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{pay.member_name}</p>
                    <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">{pay.house_number}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {pay.status === "lunas" && pay.paid_at
                      ? `Bayar: ${new Date(pay.paid_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                      : formatRp(pay.amount)}
                  </p>
                </div>
                <span className={`text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${pay.status === "lunas" ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"}`}>
                  {pay.status === "lunas" ? "✓ Lunas" : "⏳ Belum"}
                </span>
              </div>
              {/* Action buttons - three-dot menu dropdown for WA, Kwitansi, Edit, Hapus */}
              <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-gray-100 items-center justify-between relative">
                <div className="flex gap-1.5 flex-1 sm:flex-initial">
                  <button onClick={() => handleToggle(pay)}
                    className={`px-3 py-1.5 text-xs rounded-lg border whitespace-nowrap font-semibold transition-all flex-1 sm:flex-initial text-center ${pay.status === "lunas" ? "border-gray-200 text-gray-600 hover:bg-gray-50" : "border-teal-500 bg-teal-600 text-white hover:bg-teal-700"}`}>
                    {pay.status === "lunas" ? "Batal" : "✓ Lunas"}
                  </button>
                  <button onClick={() => { const m = members.find(m => m.id === pay.member_id); if (m) setHistoryMember(m); }}
                    title="Riwayat" className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-all font-semibold flex items-center justify-center gap-1.5 flex-1 sm:flex-none">
                    <span>📋</span> <span className="hidden sm:inline">Riwayat</span>
                  </button>
                </div>

                {/* Dropdown Container */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === pay.id ? null : pay.id);
                    }}
                    className="p-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg flex items-center justify-center transition-all bg-white"
                    title="Menu Aksi"
                  >
                    <span className="text-gray-600 font-bold text-sm tracking-widest px-1">•••</span>
                  </button>

                  {openDropdownId === pay.id && (
                    <>
                      {/* Transparent backdrop to close dropdown */}
                      <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }} />
                      <div className="absolute right-0 bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 z-20 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 animate-scale-up">
                        {pay.status === "belum" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); handleSendWa(pay); }}
                            className="w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-50 flex items-center gap-2 transition-colors"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span className="font-semibold">Kirim WhatsApp</span>
                          </button>
                        )}
                        <Link
                          href={`/receipt/${pay.id}`}
                          target="_blank"
                          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-55 flex items-center gap-2 transition-colors block"
                        >
                          <span>🧾</span>
                          <span className="font-semibold">Cetak Kwitansi</span>
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setEditPayment(pay); }}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-55 flex items-center gap-2 transition-colors"
                        >
                          <span>✏️</span>
                          <span className="font-semibold">Edit Tagihan</span>
                        </button>
                        <hr className="my-1 border-gray-100" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setConfirmDelete(pay); }}
                          className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-semibold"
                        >
                          <span>🗑️</span>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showAddPeriod && <AddPeriodModal members={members} onClose={() => setShowAddPeriod(false)} onSave={async (d, ids) => { const np = await createPeriod(d, ids); await loadPeriods(); await loadChart(); setSelectedId(np.id); setShowAddPeriod(false); showToast(`Tagihan ${periodLabel(np)} dibuat!`); }} />}
      {showAddMember && period && <AddMemberModal members={members} payments={payments} defaultAmount={period.amount} onClose={() => setShowAddMember(false)} onSave={async (id, amt) => { await addMemberToperiod(selectedId, id, amt); await loadPayments(); setShowAddMember(false); showToast("Warga ditambahkan"); }} />}
      {editPayment && <EditPaymentModal pay={editPayment} onClose={() => setEditPayment(null)} onSave={async (id, u) => { await updatePayment(id, u); await loadPayments(); setEditPayment(null); showToast("Data diperbarui"); }} />}
      {historyMember && <HistoryModal member={historyMember} onClose={() => setHistoryMember(null)} />}

      {/* Broadcast WA Modal */}
      {showBroadcast && broadcastQueue.length > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><WhatsAppIcon className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-gray-900">Broadcast WhatsApp</h3>
                <p className="text-xs text-gray-500">Kirim pengingat ke {broadcastQueue.length} warga</p>
              </div>
            </div>

            <div className="mt-4 mb-5">
              <p className="text-sm text-gray-600 mb-2">Tujuan saat ini ({broadcastIndex + 1} dari {broadcastQueue.length}):</p>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="font-semibold text-gray-900">{broadcastQueue[broadcastIndex].member_name}</p>
                <p className="text-xs text-gray-500">{broadcastQueue[broadcastIndex].house_number} • {broadcastQueue[broadcastIndex].whatsapp}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowBroadcast(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleSendBroadcastItem} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-1.5">
                Kirim & Lanjut <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full p-6 animate-scale-up text-left">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">⚙️ Pengaturan Profil Kas</h3>
                <p className="text-xs text-gray-550">Edit identitas kas, nama RT/kelas, dan info rekening pembayaran.</p>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500">Nama RT / Kas Kelas</label>
                <input
                  type="text"
                  value={tempProfile.title}
                  onChange={(e) => setTempProfile({ ...tempProfile, title: e.target.value })}
                  placeholder="Contoh: Kas RT 03"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Deskripsi / Sub-Branding</label>
                <input
                  type="text"
                  value={tempProfile.subtitle}
                  onChange={(e) => setTempProfile({ ...tempProfile, subtitle: e.target.value })}
                  placeholder="Contoh: Pencatatan Iuran Warga RT 03"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Informasi Rekening Pembayaran (Tampil di WhatsApp)</label>
                <textarea
                  rows={3}
                  value={tempProfile.bank}
                  onChange={(e) => setTempProfile({ ...tempProfile, bank: e.target.value })}
                  placeholder="Contoh: BRI 1234-5678-9012 a.n. Bendahara RT"
                  className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:border-teal-500 resize-none"
                />
                <p className="text-[10px] text-gray-455 mt-1 leading-relaxed">
                  * Teks ini akan otomatis dimasukkan ke template pesan tagihan iuran yang dikirim via WhatsApp.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 mt-5">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-xs border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  handleSaveProfile(tempProfile);
                  setShowProfileModal(false);
                }}
                className="px-4 py-2 text-xs bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-sm"
              >
                Simpan Profil
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold mb-1">Hapus Entri?</h3>
            <p className="text-sm text-gray-500 mb-5">Yakin hapus data <strong>{confirmDelete.member_name}</strong>?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">Batal</button>
              <button onClick={async () => { await deletePayment(confirmDelete.id); await loadPayments(); setConfirmDelete(null); showToast("Entri dihapus", false); }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg">🗑️ Hapus</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto text-sm px-4 py-3 rounded-xl z-50 shadow-lg flex items-center gap-2 ${toast.ok !== false ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}>
          {toast.ok !== false ? "✅" : "⚠️"} {toast.msg}
        </div>
      )}
    </div>
  );
}
