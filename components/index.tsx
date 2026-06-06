// components/index.tsx
// Semua komponen UI dikumpulkan di sini

import React from "react";
import type { Payment, PaymentDetail, PeriodStats } from "@/types";

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export function StatsCards({ stats }: { stats: PeriodStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {[
        { label: "Total Warga", value: stats.total, color: "text-gray-800" },
        { label: "Sudah Bayar", value: stats.paid, color: "text-teal-700" },
        { label: "Belum Bayar", value: stats.unpaid, color: "text-amber-700" },
        { label: "Terkumpul", value: formatRp(stats.totalCollected), color: "text-blue-700", small: true },
      ].map((s) => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <div className="text-xs text-gray-400 mb-1">{s.label}</div>
          <div className={`font-semibold ${s.color} ${s.small ? "text-xs truncate" : "text-xl"}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-100 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-teal-500 transition-colors";
const MONTHS_FULL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export function AddPeriodModal({ onClose, onSave }: { onClose: () => void; onSave: (data: { name: string; month: number; year: number; amount: number }, members: string[]) => void }) {
  const now = new Date();
  const [name, setName] = React.useState("Iuran Keamanan & Kebersihan");
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());
  const [amount, setAmount] = React.useState(50000);
  const [members, setMembers] = React.useState([""]);

  function handleSave() {
    const clean = members.filter((m) => m.trim());
    if (!clean.length) return alert("Tambahkan minimal satu warga.");
    onSave({ name, month, year, amount }, clean);
  }

  return (
    <Modal title="Buat Tagihan Baru" onClose={onClose}>
      <FormGroup label="Nama Iuran">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </FormGroup>
      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="Bulan">
          <select className={inputClass} value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Tahun">
          <input type="number" className={inputClass} value={year} onChange={(e) => setYear(+e.target.value)} />
        </FormGroup>
      </div>
      <FormGroup label="Nominal (Rp)">
        <input type="number" className={inputClass} value={amount} onChange={(e) => setAmount(+e.target.value)} min={0} />
      </FormGroup>
      <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 mt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
        <button onClick={handleSave} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">Buat Tagihan</button>
      </div>
    </Modal>
  );
}

export function AddMemberModal({ defaultAmount, onClose, onSave }: { defaultAmount: number; onClose: () => void; onSave: (name: string, amount: number) => void }) {
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState(defaultAmount);
  return (
    <Modal title="Tambah Warga / Siswa" onClose={onClose}>
      <FormGroup label="Nama Lengkap">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama warga..." />
      </FormGroup>
      <FormGroup label="Nominal (Rp)">
        <input type="number" className={inputClass} value={amount} onChange={(e) => setAmount(+e.target.value)} />
      </FormGroup>
      <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 mt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
        <button onClick={() => name.trim() && onSave(name.trim(), amount)} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">Tambah</button>
      </div>
    </Modal>
  );
}

export function EditPaymentModal({ pay, onClose, onSave }: { pay: PaymentDetail; onClose: () => void; onSave: (id: string, updates: Partial<Pick<PaymentDetail, "member_name" | "amount" | "notes">>) => void }) {
  const [name, setName] = React.useState(pay.member_name);
  const [amount, setAmount] = React.useState(pay.amount);
  const [notes, setNotes] = React.useState(pay.notes || "");
  return (
    <Modal title="Edit Data Tagihan" onClose={onClose}>
      <FormGroup label="Nama Warga">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </FormGroup>
      <FormGroup label="Nominal (Rp)">
        <input type="number" className={inputClass} value={amount} onChange={(e) => setAmount(+e.target.value)} />
      </FormGroup>
      <FormGroup label="Catatan">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional..." />
      </FormGroup>
      <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 mt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
        <button onClick={() => onSave(pay.id, { member_name: name, amount, notes })} className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">Simpan</button>
      </div>
    </Modal>
  );
}

export function ConfirmDialog({ title, description, onConfirm, onCancel }: { title: string; description: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-sm w-full shadow-xl">
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{description}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Hapus</button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, type = "success" }: { message: string; type?: "success" | "warning" }) {
  return (
    <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl z-[300] flex items-center gap-2 shadow-lg">
      <span>{type === "success" ? "OK" : "!"}</span>
      {message}
    </div>
  );
}
