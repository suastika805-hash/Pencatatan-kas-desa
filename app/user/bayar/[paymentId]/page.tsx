"use client";
// app/user/bayar/[paymentId]/page.tsx

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BANKS = [
  { bank: "BCA",     no: process.env.NEXT_PUBLIC_REKENING_BCA     || "1234-5678-90",    holder: "Bendahara RT 05" },
  { bank: "Mandiri", no: process.env.NEXT_PUBLIC_REKENING_MANDIRI  || "1560-0123-4567-8", holder: "Bendahara RT 05" },
  { bank: "BNI",     no: process.env.NEXT_PUBLIC_REKENING_BNI      || "0123-4567-89",    holder: "Bendahara RT 05" },
];

const MONTHS = ["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

type Step = "pilih-metode" | "qris" | "transfer" | "upload" | "sukses";

export default function BayarPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [payment, setPayment] = useState<any>(null);
  const [period, setPeriod] = useState<any>(null);
  const [step, setStep] = useState<Step>("pilih-metode");
  const [method, setMethod] = useState<"qris" | "transfer" | "">("");
  const [buktiFile, setBuktiFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("payments")
        .select("*, periods(*)")
        .eq("id", params.paymentId)
        .single();
      if (!data) { router.push("/user/dashboard"); return; }
      setPayment(data);
      setPeriod(data.periods);
      setLoading(false);
    }
    load();
  }, [params.paymentId]);

  async function handleUploadBukti() {
    if (!buktiFile || !payment) return;
    setUploading(true);

    // Upload file ke Supabase Storage bucket "bukti-pembayaran"
    const ext = buktiFile.name.split(".").pop();
    const fileName = `${payment.id}_${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("bukti-pembayaran")
      .upload(fileName, buktiFile);

    if (uploadErr) { alert("Gagal upload: " + uploadErr.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage
      .from("bukti-pembayaran")
      .getPublicUrl(fileName);

    // Simpan URL bukti ke tabel payments (kolom bukti_url)
    await supabase.from("payments").update({
      bukti_url: publicUrl,
      payment_method: method,
      notes: `Upload bukti ${method} — menunggu verifikasi bendahara`,
    }).eq("id", payment.id);

    setUploading(false);
    setStep("sukses");
  }

  function copyNo(text: string, key: string) {
    navigator.clipboard.writeText(text.replace(/-/g, ""));
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Memuat...</div>;
  }

  const periodLabel = period ? `${MONTHS[period.month]} ${period.year}` : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => step === "pilih-metode" ? router.push("/user/dashboard") : setStep("pilih-metode")}
          className="text-gray-400 hover:text-gray-700">
          ← Kembali
        </button>
        <span className="font-medium text-gray-900 text-sm">
          {step === "pilih-metode" ? "Pilih metode" : step === "qris" ? "Bayar QRIS" : step === "transfer" ? "Transfer bank" : step === "upload" ? "Upload bukti" : "Pembayaran berhasil"}
        </span>
      </nav>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Summary box */}
        {step !== "sukses" && (
          <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
            <div className="text-xs text-gray-500 mb-1">{period?.name || "Iuran"} · {periodLabel}</div>
            <div className="text-xl font-medium text-teal-700">{rp(payment.amount)}</div>
            <div className="text-xs text-gray-400 mt-1">atas nama: {payment.member_name}</div>
          </div>
        )}

        {/* Step: Pilih metode */}
        {step === "pilih-metode" && (
          <div>
            <p className="text-sm text-gray-600 mb-4">Pilih cara pembayaran:</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { id: "qris", icon: "📱", title: "QRIS", sub: "Scan & bayar instan" },
                { id: "transfer", icon: "🏦", title: "Transfer bank", sub: "BCA · Mandiri · BNI" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id as any)}
                  className={`p-4 border rounded-xl text-center transition-all cursor-pointer ${method === m.id ? "border-teal-500 bg-teal-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
                >
                  <div className="text-3xl mb-2">{m.icon}</div>
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.sub}</div>
                </button>
              ))}
            </div>
            {method && (
              <button
                onClick={() => setStep(method as Step)}
                className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                Lanjut ke pembayaran →
              </button>
            )}
          </div>
        )}

        {/* Step: QRIS */}
        {step === "qris" && (
          <div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 text-center mb-4">
              <p className="text-sm font-medium mb-4">Scan QRIS dengan aplikasi bank atau e-wallet</p>
              {/* Ganti src dengan URL QRIS asli dari env */}
              <div className="w-44 h-44 mx-auto border border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 mb-3">
                {process.env.NEXT_PUBLIC_QRIS_IMAGE_URL ? (
                  <img src={process.env.NEXT_PUBLIC_QRIS_IMAGE_URL} alt="QRIS" className="w-full h-full object-contain rounded-xl" />
                ) : (
                  <div className="text-center text-gray-300">
                    <div className="text-5xl">📲</div>
                    <div className="text-xs mt-2">Set NEXT_PUBLIC_QRIS_IMAGE_URL</div>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">Nominal: <span className="font-medium text-teal-700">{rp(payment.amount)}</span></div>
            </div>

            {[
              { icon: "📱", text: "Buka aplikasi m-banking atau e-wallet Anda" },
              { icon: "🔍", text: `Pilih menu "Scan QR" atau "QRIS"` },
              { icon: "✅", text: `Konfirmasi pembayaran ${rp(payment.amount)}` },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3 mb-2.5">
                <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</div>
                <p className="text-sm text-gray-600">{s.text}</p>
              </div>
            ))}

            <button
              onClick={() => setStep("upload")}
              className="w-full mt-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700"
            >
              📤 Sudah bayar? Upload bukti
            </button>
          </div>
        )}

        {/* Step: Transfer bank */}
        {step === "transfer" && (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
              ⚠️ Transfer sesuai nominal tepat <strong>{rp(payment.amount)}</strong>. Jangan dibulatkan.
            </div>

            <p className="text-xs font-medium text-gray-600 mb-2">Pilih rekening tujuan:</p>
            {BANKS.map((b) => (
              <div key={b.bank} className="bg-white border border-gray-100 rounded-xl p-3 mb-2 flex items-center gap-3">
                <div className="w-12 h-8 bg-gray-100 rounded-md flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                  {b.bank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">{b.bank}</div>
                  <div className="text-sm font-medium text-teal-700 tracking-wide">{b.no}</div>
                  <div className="text-xs text-gray-400">{b.holder}</div>
                </div>
                <button
                  onClick={() => copyNo(b.no, b.bank)}
                  className="text-xs text-gray-400 hover:text-teal-600 border border-gray-200 px-2 py-1 rounded-lg"
                >
                  {copied === b.bank ? "✓ Salin" : "Salin"}
                </button>
              </div>
            ))}

            <button
              onClick={() => setStep("upload")}
              className="w-full mt-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700"
            >
              📤 Sudah transfer? Upload bukti
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">Verifikasi oleh bendahara dalam 1×24 jam</p>
          </div>
        )}

        {/* Step: Upload bukti */}
        {step === "upload" && (
          <div>
            <p className="text-sm text-gray-700 mb-4">Upload foto / screenshot bukti pembayaran Anda:</p>
            <label className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-teal-400 transition-colors mb-4">
              <div className="text-3xl mb-2">{buktiFile ? "🖼️" : "📎"}</div>
              <div className="text-sm text-gray-600">{buktiFile ? buktiFile.name : "Klik untuk pilih file"}</div>
              <div className="text-xs text-gray-400 mt-1">JPG, PNG, PDF — maks. 5MB</div>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setBuktiFile(e.target.files?.[0] || null)}
              />
            </label>

            <button
              onClick={handleUploadBukti}
              disabled={!buktiFile || uploading}
              className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? "Mengirim..." : "✉️ Kirim bukti pembayaran"}
            </button>
          </div>
        )}

        {/* Step: Sukses */}
        {step === "sukses" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
            <h2 className="text-base font-medium mb-2">Bukti berhasil dikirim!</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Bendahara akan memverifikasi pembayaran Anda. Status akan diperbarui otomatis.
            </p>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-left mb-5 text-sm">
              {[
                ["Nama", payment.member_name],
                ["Periode", periodLabel],
                ["Nominal", rp(payment.amount)],
                ["Metode", method === "qris" ? "QRIS" : "Transfer Bank"],
                ["Waktu", new Date().toLocaleString("id-ID")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{k}</span>
                  <span className={k === "Nominal" ? "font-medium text-teal-700" : ""}>{v}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push("/user/dashboard")}
              className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700"
            >
              🏠 Kembali ke dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
