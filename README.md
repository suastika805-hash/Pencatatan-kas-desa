# 🏘️ KasDesa — Pencatatan Iuran RT / Kas Kelas

Aplikasi web lengkap untuk bendahara RT atau kelas.
**Next.js 14 · Tailwind CSS · Supabase · Recharts**

---

## Fitur Lengkap

| # | Fitur | Keterangan |
|---|---|---|
| 1 | **Login Bendahara** | Supabase Auth — hanya bendahara yang bisa akses |
| 2 | **Data Warga** | CRUD lengkap: nama, no. rumah, alamat, no. WA |
| 3 | **Tagihan per Periode** | Buat tagihan bulanan, pilih warga yang diikutkan |
| 4 | **Tandai Lunas** | Satu klik, timestamp otomatis tercatat |
| 5 | **Filter & Cari** | Filter Lunas/Menunggak, cari nama atau no. rumah |
| 6 | **Grafik Statistik** | Bar chart bulanan + pie chart status pembayaran |
| 7 | **Riwayat Per Warga** | Lihat semua histori bayar warga dari bulan ke bulan |
| 8 | **Kwitansi** | Cetak kwitansi per warga (print-ready, ada terbilang) |
| 9 | **Notif WA** | Kirim pengingat WhatsApp otomatis via Fonnte API |
| 10 | **Real-time** | Sinkronisasi otomatis via Supabase Realtime |

---

## Setup (±20 menit)

### 1. Supabase
1. Buat project di https://supabase.com
2. SQL Editor → paste isi `supabase_schema_v2.sql` → Run
3. Authentication → Users → Add user → buat akun bendahara

### 2. Install & Konfigurasi
```bash
npm install

# Salin file env dan isi dengan data dari Supabase Dashboard → Settings → API
cp .env.local.example .env.local
```

Isi `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. Jalankan
```bash
npm run dev
# Buka http://localhost:3000
# Login dengan akun yang sudah dibuat di Supabase Auth
```

### 4. Deploy ke Vercel (opsional)
```bash
npx vercel
# Tambahkan env vars yang sama di Vercel Dashboard
```

---

## Struktur File

```
kasdesa/
├── app/
│   ├── page.tsx                  ← Dashboard utama
│   ├── login/page.tsx            ← Halaman login bendahara
│   ├── members/page.tsx          ← CRUD data warga
│   └── receipt/[paymentId]/      ← Cetak kwitansi
├── components/
│   ├── Charts.tsx                ← Bar chart & pie chart
│   └── HistoryModal.tsx          ← Riwayat pembayaran warga
├── lib/
│   ├── supabase.ts               ← Client Supabase
│   ├── db.ts                     ← Semua operasi database
│   ├── auth.ts                   ← Login / logout
│   └── whatsapp.ts               ← Kirim WA via Fonnte
├── types/index.ts                ← TypeScript types
├── middleware.ts                 ← Proteksi route (auth)
├── supabase_schema_v2.sql        ← Schema database (jalankan sekali)
└── .env.local.example            ← Template variabel environment
```

## Fitur Pengingat WhatsApp (Bebas Token & Gratis)

Fitur ini menggunakan tautan resmi WhatsApp Web/App (`wa.me`)
1. **Cara Mengirim Pengingat:**
   - Pastikan nomor WhatsApp warga sudah terdaftar di tab **👥 Warga** (format otomatis dinormalisasi, Anda bebas menulis `08xxx`, `628xxx`, atau menggunakan tanda hubung seperti `0812-xxx-xxx`).
   - Pada halaman utama, klik filter **Belum** untuk melihat semua warga yang belum membayar iuran.
   - Klik tombol **💬** di samping nama warga yang ingin diingatkan.
   - Browser akan otomatis membuka tab baru ke WhatsApp Web/App dengan nomor tujuan dan pesan pengingat iuran yang telah terisi rapi secara otomatis. Anda tinggal menekan tombol kirim!

## Akun Bendahara

Buat via: **Supabase Dashboard → Authentication → Users → Invite user**
(masukkan email bendahara, mereka akan terima link untuk set password)
