"use client";
// app/members/page.tsx — Manajemen Data Warga

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Member } from "@/types";
import { fetchMembers, createMember, updateMember, deleteMember } from "@/lib/db";
import { normalizePhoneNumber } from "@/lib/whatsapp";
import { HistoryModal } from "@/components/HistoryModal";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

const emptyForm = { name: "", house_number: "", address: "", whatsapp: "" };

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Member | null>(null);
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function load() {
    setLoading(true);
    const data = await fetchMembers();
    setMembers(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm(emptyForm);
    setSelected(null);
    setModal("add");
  }

  function openEdit(m: Member) {
    setSelected(m);
    setForm({ name: m.name, house_number: m.house_number, address: m.address, whatsapp: m.whatsapp });
    setModal("edit");
  }

  async function handleSave() {
    if (!form.name.trim() || !form.house_number.trim()) return;
    setSaving(true);
    try {
      if (modal === "add") {
        await createMember(form);
        showToast(`${form.name} berhasil ditambahkan`);
      } else if (selected) {
        await updateMember(selected.id, form);
        showToast(`Data ${form.name} diperbarui`);
      }
      await load();
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: Member) {
    await deleteMember(m.id);
    await load();
    setConfirmDel(null);
    showToast(`${m.name} dinonaktifkan`);
  }

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.house_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link href="/" className="text-gray-400 hover:text-gray-700 text-lg flex-shrink-0">←</Link>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold truncate">Data Warga</h1>
              <p className="text-[11px] sm:text-xs text-gray-500">{members.length} warga terdaftar</p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-teal-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-teal-700 flex-shrink-0"
          >
            + Tambah
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white mb-4 shadow-sm">
          <span className="text-gray-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau nomor rumah..."
            className="text-sm outline-none bg-transparent text-gray-800 w-full"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Memuat data...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">👥</div>
                <p>Belum ada warga. Tambahkan dulu!</p>
              </div>
            ) : (
              filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setHistoryMember(m)}
                  className="bg-white border border-gray-100 rounded-xl px-3 sm:px-4 py-3 shadow-sm hover:border-teal-200 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-semibold flex-shrink-0 group-hover:scale-105 transition-transform">
                      {m.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-teal-700 transition-colors truncate">{m.name}</p>
                        <span className="px-1.5 sm:px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] sm:text-xs rounded-full flex-shrink-0">
                          {m.house_number}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 flex items-start gap-1 truncate">
                        <span className="mt-0.5 flex-shrink-0">📍</span>
                        <span className="truncate">{m.address || "Belum ada alamat"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions - separate row on mobile with tactile touch targets */}
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {m.whatsapp && (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                          <span>📞</span>
                          <span className="font-mono">{m.whatsapp}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {m.whatsapp && (
                        <a
                          href={`https://wa.me/${normalizePhoneNumber(m.whatsapp)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Buka WhatsApp"
                          className="flex items-center justify-center p-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 transition-colors w-8 h-8"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => openEdit(m)}
                        title="Edit Data Warga"
                        className="flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors w-8 h-8"
                      >
                        <span>✏️</span>
                      </button>
                      <button
                        onClick={() => setConfirmDel(m)}
                        title="Hapus / Nonaktifkan Warga"
                        className="flex items-center justify-center p-2 rounded-lg border border-red-150 text-red-600 hover:bg-red-50 transition-colors w-8 h-8"
                      >
                        <span>🗑️</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold">{modal === "add" ? "Tambah Warga Baru" : "Edit Data Warga"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { label: "Nama Lengkap *", key: "name", placeholder: "Budi Santoso" },
                { label: "No. Rumah / No. Absen *", key: "house_number", placeholder: "A-01 atau 15" },
                { label: "Alamat", key: "address", placeholder: "Jl. Melati No. 1" },
                { label: "No. WhatsApp (628xxx)", key: "whatsapp", placeholder: "6281234567890" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.house_number.trim()}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60 font-medium"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold mb-1">Nonaktifkan Warga?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Data <strong>{confirmDel.name}</strong> akan dinonaktifkan. Riwayat pembayaran tetap tersimpan.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg">Batal</button>
              <button onClick={() => handleDelete(confirmDel)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Profile Modal */}
      {historyMember && (
        <HistoryModal member={historyMember} onClose={() => setHistoryMember(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto bg-gray-900 text-white text-sm px-4 py-3 rounded-xl z-50 shadow-lg">
          ✅ {toast}
        </div>
      )}
    </div>
  );
}
