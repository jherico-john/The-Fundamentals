'use client';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, DollarSign, TrendingUp, Link2, MousePointerClick,
  ShoppingCart, Percent, LogOut, ChevronRight, ChevronDown, Copy, Check,
  RefreshCw, BookOpen, User,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  total_sales: number; total_revenue: number; total_affiliates: number;
  total_clicks: number; total_commissions_owed: number; total_commissions_paid: number;
  sales_last_7d: number; revenue_last_7d: number; total_customers: number;
}
interface ChartPoint { date: string; sales: number; revenue: number; }
interface Purchase { id: string; reference_number: string; amount: number; product_name: string; affiliate_code: string | null; purchased_at: string; }
interface Affiliate {
  id: string; name: string; mobile_number: string; referral_link: string; referral_code: string;
  tier: string; earnings: number; paid_earnings: number; click_count: number; created_at: string;
  referred_by_code: string | null; root_code: string; product_link: string;
}

const TIER_COLOR: Record<string, string> = {
  primary:'#00FF87', secondary:'#00C46A', tertiary:'#FFA500', quaternary:'#FF6B6B', quinary:'#9B7EDE',
};

type View = 'dashboard' | 'affiliates' | 'purchases';

export default function DashboardPage() {
  const [view, setView]             = useState<View>('dashboard');
  const [stats, setStats]           = useState<Stats | null>(null);
  const [chart, setChart]           = useState<ChartPoint[]>([]);
  const [purchases, setPurchases]   = useState<Purchase[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [copied, setCopied]         = useState<string | null>(null);
  const [expandedAff, setExpandedAff] = useState<string | null>(null);
  const [treeData, setTreeData]     = useState<Record<string, Affiliate[]>>({});

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, aRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/purchases'),
        fetch('/api/dashboard/affiliates'),
      ]);
      const sData = await sRes.json();
      const pData = await pRes.json();
      const aData = await aRes.json();
      if (sData.stats) setStats(sData.stats);
      if (sData.salesChart) setChart(sData.salesChart);
      if (pData.purchases) setPurchases(pData.purchases);
      if (aData.affiliates) setAffiliates(aData.affiliates);
    } finally { setLoading(false); }
  };

  const loadTree = async (rootCode: string) => {
    if (treeData[rootCode]) { setExpandedAff(expandedAff === rootCode ? null : rootCode); return; }
    const res  = await fetch(`/api/affiliate/tree?code=${rootCode}`);
    const data = await res.json();
    if (data.tree) setTreeData(prev => ({ ...prev, [rootCode]: data.tree }));
    setExpandedAff(rootCode);
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(link); setTimeout(() => setCopied(null), 2000);
  };

  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; };

  const STAT_CARDS = stats ? [
    { label:'Total Sales', value: stats.total_sales, icon:<ShoppingCart size={20}/>, color:'#00FF87', bg:'rgba(0,255,135,0.1)' },
    { label:'Total Revenue', value: `₱${(stats.total_revenue||0).toLocaleString()}`, icon:<DollarSign size={20}/>, color:'#60a5fa', bg:'rgba(96,165,250,0.1)' },
    { label:'Total Affiliates', value: stats.total_affiliates, icon:<Users size={20}/>, color:'#a78bfa', bg:'rgba(167,139,250,0.1)' },
    { label:'Total Clicks', value: stats.total_clicks, icon:<MousePointerClick size={20}/>, color:'#fb923c', bg:'rgba(251,146,60,0.1)' },
    { label:'Sales (7 days)', value: stats.sales_last_7d, icon:<TrendingUp size={20}/>, color:'#34d399', bg:'rgba(52,211,153,0.1)' },
    { label:'Revenue (7 days)', value: `₱${(stats.revenue_last_7d||0).toLocaleString()}`, icon:<TrendingUp size={20}/>, color:'#f472b6', bg:'rgba(244,114,182,0.1)' },
    { label:'Commissions Owed', value: `₱${(stats.total_commissions_owed||0).toLocaleString()}`, icon:<Percent size={20}/>, color:'#fbbf24', bg:'rgba(251,191,36,0.1)' },
    { label:'Commissions Paid', value: `₱${(stats.total_commissions_paid||0).toLocaleString()}`, icon:<DollarSign size={20}/>, color:'#4ade80', bg:'rgba(74,222,128,0.1)' },
    { label:'Total Customers', value: stats.total_customers ?? '—', icon:<User size={20}/>, color:'#38bdf8', bg:'rgba(56,189,248,0.1)' },
    { label:'Unpaid Commission', value: `₱${((stats.total_commissions_owed||0)-(stats.total_commissions_paid||0)).toLocaleString()}`, icon:<DollarSign size={20}/>, color:'#f87171', bg:'rgba(248,113,113,0.1)' },
    { label:'Referral Links', value: stats.total_affiliates, icon:<Link2 size={20}/>, color:'#818cf8', bg:'rgba(129,140,248,0.1)' },
    { label:'Paid Referrals', value: stats.total_sales, icon:<ShoppingCart size={20}/>, color:'#2dd4bf', bg:'rgba(45,212,191,0.1)' },
  ] : [];

  return (
    <div className="min-h-screen flex" style={{ background: '#0f172a', color: '#e2e8f0' }}>

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-700" style={{ background: '#1e293b' }}>
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-emerald-400" />
            <span className="font-bold text-white text-sm">Ministry Dashboard</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-2">Activity</p>
          {([
            { id:'dashboard', icon:<LayoutDashboard size={16}/>, label:'Dashboard' },
            { id:'affiliates', icon:<Users size={16}/>, label:'Affiliates' },
            { id:'purchases', icon:<ShoppingCart size={16}/>, label:'Purchases' },
          ] as { id: View; icon: React.ReactNode; label: string }[]).map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                view === item.id ? 'bg-emerald-500 bg-opacity-20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}>
              {item.icon} {item.label}
            </button>
          ))}

          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-2">Products</p>
            {[
              { label:'The Fundamentals', href:'/checkout' },
              { label:'SUNYL 12 Lessons', href:'/products/sunyl' },
              { label:'Encounter', href:'/products/encounter' },
              { label:'Post-Encounter', href:'/products/post-encounter' },
              { label:'Lifegroup Fundamentals', href:'/products/lifegroup' },
            ].map(p => (
              <a key={p.href} href={p.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <BookOpen size={13} /> {p.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Admin identity */}
        <div className="p-4 border-t border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black text-xs font-bold">JB</div>
            <div>
              <p className="text-white text-xs font-semibold">Admin</p>
              <p className="text-slate-500 text-[10px]">jhericojohnbalasa@gmail.com</p>
            </div>
          </div>
          <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="px-8 py-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white capitalize">{view === 'dashboard' ? 'Performance Overview' : view}</h1>
              <p className="text-slate-400 text-xs mt-0.5">Ministry Checkout v4 · Real-time data from Supabase</p>
            </div>
            <button onClick={loadStats} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {/* ── DASHBOARD VIEW ── */}
          {view === 'dashboard' && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {loading ? (
                  Array.from({length:12}).map((_,i) => (
                    <div key={i} className="rounded-2xl p-4 animate-pulse" style={{background:'#1e293b',height:96}} />
                  ))
                ) : STAT_CARDS.map((c,i) => (
                  <div key={i} className="rounded-2xl p-4" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-slate-400 text-xs">{c.label}</p>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
                    </div>
                    <p className="text-2xl font-bold text-white">{c.value}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              {chart.length > 0 && (
                <div className="rounded-2xl p-5 mb-6" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                  <h2 className="font-bold text-white mb-1">Daily Sales — Last 30 Days</h2>
                  <p className="text-slate-400 text-xs mb-4">Sales count and revenue by day</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chart} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#e2e8f0', fontSize:12 }} />
                      <Bar dataKey="sales" fill="#00C46A" radius={[4,4,0,0]} name="Sales" />
                      <Bar dataKey="revenue" fill="#60a5fa" radius={[4,4,0,0]} name="Revenue (₱)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recent purchases */}
              <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <h2 className="font-bold text-white mb-4">Recent Purchases</h2>
                {purchases.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No purchases yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {['Ref No.','Product','Amount','Affiliate','Date'].map(h => (
                            <th key={h} className="text-left text-xs text-slate-400 font-medium py-2 pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.slice(0,15).map(p => (
                          <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800 transition-colors">
                            <td className="py-2.5 pr-4 font-mono text-xs text-slate-300">{p.reference_number}</td>
                            <td className="py-2.5 pr-4 text-xs text-slate-300 truncate max-w-[150px]">{p.product_name}</td>
                            <td className="py-2.5 pr-4 text-xs font-bold text-emerald-400">₱{p.amount.toLocaleString()}</td>
                            <td className="py-2.5 pr-4 text-xs text-slate-400">{p.affiliate_code || '—'}</td>
                            <td className="py-2.5 text-xs text-slate-500">{new Date(p.purchased_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── AFFILIATES VIEW ── */}
          {view === 'affiliates' && (
            <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white">All Affiliates ({affiliates.length})</h2>
                <p className="text-xs text-slate-400">Click a row to see referral tree</p>
              </div>
              {affiliates.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No affiliates yet.</p>
              ) : (
                <div className="space-y-2">
                  {affiliates.filter(a => a.tier === 'primary').map(aff => (
                    <div key={aff.id}>
                      <div
                        onClick={() => loadTree(aff.root_code)}
                        className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors hover:bg-slate-700"
                        style={{ background: '#0f172a' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-black text-sm font-bold"
                            style={{ background: TIER_COLOR[aff.tier] }}>
                            {aff.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm">{aff.name}</p>
                            <p className="text-slate-400 text-xs">{aff.mobile_number}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-xs">
                          <div className="text-center">
                            <p className="text-slate-400">Tier</p>
                            <span className="font-bold" style={{ color: TIER_COLOR[aff.tier] }}>{aff.tier}</span>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-400">Clicks</p>
                            <p className="text-white font-bold">{aff.click_count}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-400">Earnings</p>
                            <p className="text-emerald-400 font-bold">₱{(aff.earnings||0).toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-slate-400">Paid</p>
                            <p className="text-blue-400 font-bold">₱{(aff.paid_earnings||0).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={e => { e.stopPropagation(); copyLink(aff.referral_link); }}
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors">
                              {copied === aff.referral_link ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            </button>
                            {expandedAff === aff.root_code ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                          </div>
                        </div>
                      </div>

                      {/* Tree */}
                      {expandedAff === aff.root_code && treeData[aff.root_code] && (
                        <div className="mt-1 ml-6 space-y-1 border-l-2 pl-4" style={{ borderColor: TIER_COLOR.primary }}>
                          {treeData[aff.root_code].filter(t => t.id !== aff.id).map(child => (
                            <div key={child.id} className="flex items-center justify-between p-3 rounded-xl"
                              style={{ background: '#1e293b', borderLeft: `3px solid ${TIER_COLOR[child.tier]}` }}>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-black text-xs font-bold"
                                  style={{ background: TIER_COLOR[child.tier] }}>
                                  {child.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <span className="text-white text-xs font-medium">{child.name}</span>
                                  <span className="text-slate-400 text-[10px] ml-2">{child.mobile_number}</span>
                                  <span className="ml-2 text-[10px] font-bold" style={{ color: TIER_COLOR[child.tier] }}>[{child.tier}]</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-emerald-400 font-bold">₱{(child.earnings||0).toFixed(2)}</span>
                                <span className="text-slate-400">{new Date(child.created_at).toLocaleDateString()}</span>
                                <button onClick={() => copyLink(child.referral_link)}
                                  className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">
                                  {copied === child.referral_link ? <Check size={11} className="text-emerald-400"/> : <Copy size={11}/>}
                                </button>
                              </div>
                            </div>
                          ))}
                          {treeData[aff.root_code].filter(t => t.id !== aff.id).length === 0 && (
                            <p className="text-slate-500 text-xs py-2 pl-2">No referrals yet from this affiliate.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PURCHASES VIEW ── */}
          {view === 'purchases' && (
            <div className="rounded-2xl p-5" style={{ background: '#1e293b', border: '1px solid #334155' }}>
              <h2 className="font-bold text-white mb-4">All Purchases ({purchases.length})</h2>
              {purchases.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No purchases yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        {['#','Ref No.','Product','Amount','Affiliate Code','Date'].map(h => (
                          <th key={h} className="text-left text-xs text-slate-400 font-medium py-2 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p, i) => (
                        <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800 transition-colors">
                          <td className="py-2.5 pr-4 text-xs text-slate-500">{i+1}</td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-slate-300">{p.reference_number}</td>
                          <td className="py-2.5 pr-4 text-xs text-slate-300">{p.product_name}</td>
                          <td className="py-2.5 pr-4 text-xs font-bold text-emerald-400">₱{p.amount.toLocaleString()}</td>
                          <td className="py-2.5 pr-4 text-xs">
                            {p.affiliate_code
                              ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900 text-purple-300">{p.affiliate_code}</span>
                              : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-2.5 text-xs text-slate-500">{new Date(p.purchased_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
