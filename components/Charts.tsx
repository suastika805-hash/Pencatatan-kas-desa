"use client";
// components/Charts.tsx — Grafik Statistik Pembayaran

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const PIE_COLORS   = ["#0F6E56", "#F59E0B"];

interface MonthData {
  paid: number;
  unpaid: number;
  collected: number;
}

interface ChartsProps {
  monthlyData: Record<number, MonthData>;
  currentYear: number;
  paidCount: number;
  unpaidCount: number;
}

export function MonthlyBarChart({ monthlyData, currentYear }: Pick<ChartsProps, "monthlyData" | "currentYear">) {
  const chartData = Object.entries(monthlyData)
    .filter(([, d]) => d.paid + d.unpaid > 0)
    .map(([month, d]) => ({
      bulan: MONTHS_SHORT[+month - 1],
      Lunas: d.paid,
      Menunggak: d.unpaid,
      Terkumpul: d.collected,
    }));

  if (chartData.length === 0)
    return <div className="text-center py-8 text-gray-400 text-sm">Belum ada data tagihan di tahun {currentYear}</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid #e5e7eb" }}
          formatter={(value: number, name: string) => [value, name]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Lunas"     fill="#1D9E75" radius={[4,4,0,0]} />
        <Bar dataKey="Menunggak" fill="#F59E0B" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentPieChart({ paidCount, unpaidCount }: Pick<ChartsProps, "paidCount" | "unpaidCount">) {
  const total = paidCount + unpaidCount;
  
  const legendItems = [
    { name: "Lunas",     value: paidCount,   color: "#0F6E56", percent: total ? Math.round(paidCount / total * 100) : 0 },
    { name: "Menunggak", value: unpaidCount, color: "#F59E0B", percent: total ? Math.round(unpaidCount / total * 100) : 0 },
  ];

  const chartData = legendItems.filter((d) => d.value > 0);

  if (total === 0)
    return <div className="text-center py-8 text-gray-400 text-sm">Belum ada data iuran</div>;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full h-[140px] flex justify-center items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%" cy="50%"
              innerRadius={30}
              outerRadius={50}
              label={false}
            >
              {chartData.map((item, i) => (
                <Cell key={i} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "0.5px solid #e5e7eb" }}
              formatter={(value: number) => [`${value} warga`, "Jumlah"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Premium Custom Legend - ensures absolutely zero clipping */}
      <div className="flex flex-col gap-1.5 w-full px-2 mt-1">
        {legendItems.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-[11px] bg-gray-50/50 hover:bg-gray-55 border border-gray-100 rounded-lg px-2.5 py-1.5 transition-all">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="font-semibold text-gray-600">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">{item.value} warga</span>
              <span className="font-bold text-gray-800 bg-white border border-gray-200 rounded px-1">{item.percent}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
