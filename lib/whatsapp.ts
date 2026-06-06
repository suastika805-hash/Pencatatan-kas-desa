// lib/whatsapp.ts
// Kirim pesan WhatsApp secara manual via wa.me (Tanpa API / Tanpa Token / 100% Gratis & Unlimited)

export interface WaResult {
  ok: boolean;
  message: string;
}

/**
 * Normalisasi nomor WhatsApp warga ke format standar internasional (misal: 628xxx)
 */
export function normalizePhoneNumber(phone: string): string {
  // Hapus semua karakter non-angka (seperti +, -, spasi, dll)
  let cleaned = phone.replace(/\D/g, "");

  // Jika diawali dengan '0', ubah menjadi '62' (Kode negara Indonesia)
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }

  return cleaned;
}

/**
 * Membuka WhatsApp Web/App dengan isi pesan yang sudah di-encode
 * @param phone   - nomor tujuan format bebas (akan dinormalisasi)
 * @param message - isi pesan pengingat
 */
export async function sendWhatsApp(phone: string, message: string): Promise<WaResult> {
  try {
    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone) {
      return { ok: false, message: "Nomor WhatsApp tidak valid" };
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    if (typeof window !== "undefined") {
      window.open(waUrl, "_blank");
      return { ok: true, message: "Membuka WhatsApp..." };
    }

    return { ok: false, message: "Gagal mendeteksi window (SSR)" };
  } catch (err) {
    return { ok: false, message: "Gagal membuka WhatsApp" };
  }
}

/**
 * Buat teks pesan pengingat iuran
 */
export function buildReminderMessage(
  memberName: string,
  periodLabel: string,
  amount: number,
  bankInfo = "BRI 1234-5678-9012 a.n. Bendahara RT"
): string {
  return `Halo Bapak/Ibu,
 
Kami mengingatkan bahwa iuran *${periodLabel}* sebesar *Rp ${amount.toLocaleString("id-ID")}* belum kami terima.

Mohon segera melakukan pembayaran ke:
${bankInfo}

Konfirmasi pembayaran bisa langsung balas pesan ini dengan menyertakan bukti transfer.
Terima kasih banyak atas perhatiannya 🙏

_Pengingat KasDesa - RT Kita_`;
}

