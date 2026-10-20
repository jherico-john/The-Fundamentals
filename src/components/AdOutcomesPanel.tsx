'use client';
// Admin: outcomes of the three ad engines (Google Ads · Meta · TikTok) side by
// side, plus payment-channel and product breakdowns.
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Outcome { source: string; visitors: number; sales: number; revenue: number; conversionPct: number; newCustomers: number }
interface Channel { channel: string; sales: number; revenue: number; avgFee: number }
interface Prod { slug: string; name: string; sales: number; revenue: number }

const ENGINE: Record<string, { label: string; color: string; icon: string }> = {
  google: { label: 'Google Ads', color: '#4285F4', icon: 'G' },
  meta: { label: 'Meta (Facebook / Instagram)', color: '#1877F2', icon: 'f' },
  tiktok: { label: 'TikTok Ads', color: '#fe2c55', icon: '♪' },
  affiliate: { label: 'Affiliates', color: '#a78bfa', icon: '🤝' },
  organic: { label: 'Organic / Direct', color: '#34d399', icon: '🌱' },
  other: { label: 'Other campaigns', color: '#94a3b8', icon: '•' },
};
const peso = (n: number) => `₱${Math.round(n).toLocaleString()}`;

export default function AdOutcomesPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<{ outcomes: Outcome[]; channels: Channel[]; products: Prod[] } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setData(null); setErr('');
    fetch(`/api/dashboard/ads?days=${days}`).then(r => r.json()).then(d => d.error ? setErr(d.error) : setData(d)).catch(() => setErr('Could not load ad outcomes.'));
  }, [days]);

  if (err) return <p className="text-red-400 text-sm">{err}</p>;
  if (!data) return <div className="rounded-2xl p-6 animate-pulse" style={{ background: '#1e293b', height: 220 }} />;

  const engines = ['google', 'meta', 'tiktok'].map(k => data.outcomes.find(o => o.source === k)!).filter(Boolean);
  const others = data.outcomes.filter(o => !['google', 'meta', 'tiktok'].includes(o.source));
  const chart = data.outcomes.map(o => ({ name: ENGINE[o.source]?.label.split(' ')[0] || o.source, revenue: o.revenue, sales: o.sales }));

  return (
    <div className="space-y-6" data-testid="ad-outcomes">
      <div className="flex items-center gap-2">
        {[7, 30, 90].map(d => (
          <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${days === d ? 'bg-emerald-500 bg-opacity-20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>Last {d} days</button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {engines.map(o => {
          const e = ENGINE[o.source];
          return (
            <div key={o.source} className="rounded-2xl p-5" style={{ background: '#1e293b', border: `1px solid ${e.color}55` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white" style={{ background: e.color }}>{e.icon}</div>
                <p className="text-white font-semibold text-sm">{e.label}</p>
              </div>
              <p className="text-3xl font-bold text-white">{peso(o.revenue)}</p>
              <p className="text-slate-400 text-xs mb-4">revenue · {o.sales} sale{o.sales === 1 ? '' : 's'}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[{ l: 'Visitors', v: o.visitors }, { l: 'Conv. rate', v: `${o.conversionPct}%` }, { l: 'New buyers', v: o.newCustomers }].map(x => (
                  <div key={x.l} className="rounded-lg p-2" style={{ background: '#0f172a' }}>
                    <p className="text-white font-bold text-sm">{x.v}</p><p className="text-slate-500 text-[10px]">{x.l}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
        <h2 className="font-bold text-white mb-1">Revenue by traffic source</h2>
        <p className="text-slate-400 text-xs mb-4">Attributed from gclid / fbclid / ttclid and UTM tags captured on landing (30-day window)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} />
            <Bar dataKey="revenue" fill="#00C46A" radius={[4, 4, 0, 0]} name="Revenue (₱)" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          {others.map(o => (
            <div key={o.source} className="rounded-lg p-2" style={{ background: '#0f172a' }}>
              <p className="text-slate-300 font-semibold">{ENGINE[o.source]?.label}</p>
              <p className="text-slate-500">{o.visitors} visitors · {o.sales} sales · {peso(o.revenue)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h2 className="font-bold text-white mb-3">Payment channels used</h2>
          {data.channels.length === 0 ? <p className="text-slate-500 text-sm">No sales yet.</p> : (
            <table className="w-full text-xs"><thead><tr className="text-slate-500 text-left"><th className="pb-2">Channel</th><th>Sales</th><th>Revenue</th><th>Avg fee</th></tr></thead>
              <tbody>{data.channels.map(c => <tr key={c.channel} className="border-t border-slate-700 text-slate-300"><td className="py-2 font-semibold uppercase">{c.channel}</td><td>{c.sales}</td><td>{peso(c.revenue)}</td><td>₱{c.avgFee.toFixed(1)}</td></tr>)}</tbody></table>
          )}
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
          <h2 className="font-bold text-white mb-3">Sales by product</h2>
          {data.products.length === 0 ? <p className="text-slate-500 text-sm">No sales yet.</p> : (
            <table className="w-full text-xs"><thead><tr className="text-slate-500 text-left"><th className="pb-2">Product</th><th>Sales</th><th>Revenue</th></tr></thead>
              <tbody>{data.products.map(p => <tr key={p.slug} className="border-t border-slate-700 text-slate-300"><td className="py-2 font-semibold">{p.name}</td><td>{p.sales}</td><td>{peso(p.revenue)}</td></tr>)}</tbody></table>
          )}
        </div>
      </div>
    </div>
  );
}
