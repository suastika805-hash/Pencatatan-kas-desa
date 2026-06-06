"use client";
// components/Sidebar.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",             icon: "🏠", label: "Dashboard"        },
  { href: "/warga",        icon: "👥", label: "Data Warga"       },
  { href: "/pemasukan",    icon: "💰", label: "Pemasukan Lain"   },
  { href: "/pengeluaran",  icon: "💸", label: "Pengeluaran"      },
  { href: "/laporan",      icon: "📊", label: "Laporan"          },
  { href: "/whatsapp",     icon: "💬", label: "Notif WhatsApp"   },
  { href: "/kwitansi",     icon: "🧾", label: "Cetak Kwitansi"   },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-52 bg-white dark:bg-neutral-900 border-r border-gray-100 dark:border-neutral-800 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100 dark:border-neutral-800">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white text-sm">🏘️</div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">KasDesa</p>
          <p className="text-xs text-gray-400">Bendahara RT</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.label === "Pengeluaran" && (
                <span className="ml-auto text-xs bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">Baru</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-100 dark:border-neutral-800">
        <Link
          href="/login"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <span>🚪</span>
          <span>Keluar</span>
        </Link>
      </div>
    </aside>
  );
}
