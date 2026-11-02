"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { euro, numberPt } from "@/lib/format";
import type { Listing } from "@/lib/types";

export function PriceChart({ listings }: { listings: Listing[] }) {
  const byConcelho = new Map<string, { total: number; count: number }>();
  for (const listing of listings) {
    if (!listing.usefulArea || listing.usefulArea <= 0 || !listing.concelho) continue;
    const current = byConcelho.get(listing.concelho) ?? { total: 0, count: 0 };
    current.total += listing.price / listing.usefulArea;
    current.count += 1;
    byConcelho.set(listing.concelho, current);
  }
  const data = [...byConcelho.entries()]
    .map(([zone, value]) => ({ zone, average: value.total / value.count, count: value.count }))
    .sort((a, b) => b.average - a.average)
    .slice(0, 6);
  const sampleSize = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="chart-wrap">
      <div className="chart-heading">
        <div><span className="eyebrow">Anúncios carregados · {sampleSize} imóveis</span><h3>Preço médio por concelho · €/m²</h3></div>
        <span className="chart-change">{data.length} zonas</span>
      </div>
      {data.length ? <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 15, left: 6, bottom: 0 }}>
            <CartesianGrid stroke="#e9e9e2" strokeDasharray="3 5" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8b9088", fontSize: 10 }} tickFormatter={(value) => numberPt(value)} />
            <YAxis type="category" dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: "#768078", fontSize: 10 }} width={82} />
            <Tooltip formatter={(value) => [`${euro(Number(value))}/m²`, "Média anunciada"]} labelFormatter={(label) => String(label)} contentStyle={{ borderRadius: 12, border: "1px solid #e8e8df", boxShadow: "0 8px 24px #1c382c12" }} />
            <Bar dataKey="average" fill="#648773" radius={[0, 4, 4, 0]} barSize={13} />
          </BarChart>
        </ResponsiveContainer>
      </div> : <div className="chart-empty">Adiciona anúncios com área útil para comparar os concelhos.</div>}
      <p className="chart-caption">Média dos anúncios carregados por concelho; não representa uma avaliação oficial de mercado.</p>
    </div>
  );
}
