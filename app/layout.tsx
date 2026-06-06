import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KasDesa — Iuran RT / Kas Kelas",
  description: "Pencatatan iuran warga dan kas kelas untuk bendahara",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
