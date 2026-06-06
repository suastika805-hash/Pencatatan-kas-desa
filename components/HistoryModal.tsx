"use client";
// components/HistoryModal.tsx — Riwayat Pembayaran Per Warga

import { useEffect, useState } from "react";
import { fetchMemberHistory } from "@/lib/db";
import type { Member, PaymentDetail } from "@/types";

const MONTHS = ["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

interface Props {
  member: Member;
  onClose: () => void;
}

export function HistoryModal({ member, onClose }: Props) {
  const [history, setHistory] = useState<PaymentDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemberHistory(member.id).then((data) => {
      setHistory(data);
      setLoading(false);
    });
  }, [member.id]);

  const totalPaid = history.filter((h) => h.status === "lunas").reduce((s, h) => s + h.amount, 0);
  const paidCount = history.filter((h) => h.status === "lunas").length;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {member.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{member.name}</p>
            <p className="text-xs text-gray-400">{member.house_number} · {member.address || "—"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
        </div>

        {/* Summary */}
        {!loading && (
          <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 text-center py-3">
            <div>
              <div className="text-lg font-semibold text-teal-700">{paidCount}</div>
              <div className="text-xs text-gray-500">Kali Bayar</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-amber-600">{history.length - paidCount}</div>
              <div className="text-xs text-gray-500">Menunggak</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-blue-700">Rp {(totalPaid / 1000).toFixed(0)}rb</div>
              <div className="text-xs text-gray-500">Total Bayar</div>
            </div>
          </div>
        )}

        {/* History list */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Memuat riwayat...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Belum ada riwayat tagihan.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200"
                >
                  {/* Status icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                    h.status === "lunas" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {h.status === "lunas" ? "✓" : "⏳"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {MONTHS[h.month]} {h.year}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{h.period_name}</p>
                  </div>

                  {/* Amount & date */}
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      Rp {h.amount.toLocaleString("id-ID")}
                    </p>
                    {h.paid_at && (
                      <p className="text-xs text-gray-400">
                        {new Date(h.paid_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>

                  {/* Badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    h.status === "lunas"
                      ? "bg-teal-100 text-teal-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {h.status === "lunas" ? "Lunas" : "Belum"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
