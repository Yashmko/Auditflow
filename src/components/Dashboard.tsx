import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Scan, Send, ShieldAlert, DollarSign, TrendingUp, Activity,
  Play, Square, AlertCircle, Mail
} from 'lucide-react';
import { usePipeline } from '../hooks/usePipeline';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-3" style={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}>
        <div className="font-bold mb-1">{label}</div>
        {payload.map((p) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === 'actual' ? 'Actual' : 'Projected'}: ${p.value?.toFixed(0)}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const { stats, revenueData, campaigns, leads, activeCampaignId, pipelineRunning, startPipeline, stopPipeline, updateStats } = useStore();
  const { stage } = usePipeline();
  const [editDeal, setEditDeal] = useState(false);
  const [dealVal, setDealVal] = useState(String(stats.dealValue));
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
        setBackendOnline(r.ok);
      } catch {
        setBackendOnline(false);
      }
    };
    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, []);

  const recentActivity = leads
    .filter(l => l.emailSentAt)
    .sort((a, b) => new Date(b.emailSentAt!).getTime() - new Date(a.emailSentAt!).getTime())
    .slice(0, 8);

  const statCards = [
    { label: 'Total Scanned', value: stats.totalScanned.toLocaleString(), icon: Scan, color: '#3b82f6', sub: '+12 today' },
    { label: 'Emails Sent Today', value: stats.emailsSentToday, icon: Send, color: '#00ff88', sub: `${stats.emailsSentWeek} this week` },
    { label: 'Issues Detected', value: stats.bothMissing.toLocaleString(), icon: ShieldAlert, color: '#f59e0b', sub: `${stats.spfMissing} SPF + ${stats.dmarcMissing} DMARC missing` },
    { label: 'Est. Revenue', value: `$${stats.estimatedRevenue.toLocaleString()}`, icon: DollarSign, color: '#00ff88', sub: `@ $${stats.dealValue}/deal avg`, action: () => setEditDeal(true) },
    { label: 'Reply Rate', value: (() => { const contacted = leads.filter(l => l.emailSentAt).length; const replied = leads.filter(l => l.status === 'replied').length; return contacted > 0 ? `${((replied / contacted) * 100).toFixed(1)}%` : '0.0%'; })(), icon: TrendingUp, color: '#a855f7', sub: `${leads.filter(l => l.status === 'replied').length} replies from ${leads.filter(l => l.emailSentAt).length} sent` },
    { label: 'This Month', value: stats.emailsSentMonth.toLocaleString(), icon: Activity, color: '#3b82f6', sub: 'emails delivered' },
  ];

  const activeCampaign = campaigns.find(c => c.id === activeCampaignId) || campaigns.find(c => c.status === 'active');

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your automated outreach performance</p>
        </div>
        <div className="flex items-center gap-3">
          {pipelineRunning ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,255,136,0.2)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse-green" style={{ background: 'var(--accent)' }} />
                <span className="text-xs font-mono font-medium" style={{ color: 'var(--accent)' }}>
                  {stage === 'idle' ? 'Starting...' : stage.replace(/-/g, ' ').toUpperCase()}
                </span>
              </div>
              <button onClick={stopPipeline} className="btn-danger flex items-center gap-2" style={{ fontSize: 13, padding: '6px 14px' }}>
                <Square size={14} />
                Stop Pipeline
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  if (!activeCampaign) return;
                  if (activeCampaign.status === 'paused' || activeCampaign.status === 'completed') {
                    alert(`Campaign is "${activeCampaign.status}". Set it to Active in Campaigns first.`);
                    return;
                  }
                  startPipeline(activeCampaign.id);
                }}
                className="btn-primary flex items-center gap-2"
                style={{ fontSize: 13, padding: '8px 16px' }}
                disabled={!activeCampaign}
              >
                <Play size={14} />
                Start Pipeline
              </button>
              <div className="flex items-center gap-1.5 text-xs mt-2" style={{ color: backendOnline === false ? 'var(--error)' : backendOnline === true ? 'var(--accent)' : 'var(--text-muted)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: backendOnline === false ? 'var(--error)' : backendOnline === true ? 'var(--accent)' : 'var(--text-muted)', display: 'inline-block', flexShrink: 0 }} />
                {backendOnline === false ? 'Backend offline — run: python3 server.py' : backendOnline === true ? 'Backend connected' : 'Checking backend...'}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={i}
                className="card stat-card p-5 cursor-pointer"
                onClick={card.action}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    {card.label}
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}20` }}>
                    <Icon size={16} style={{ color: card.color }} />
                  </div>
                </div>
                <div className="text-3xl font-bold font-mono mb-1" style={{ color: card.color }}>
                  {card.value}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.sub}</div>
              </div>
            );
          })}
        </div>

        {/* Revenue chart + Activity */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 360px' }}>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold">Revenue Projection</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Monthly projected vs actual</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full" style={{ background: '#00ff88' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 rounded-full" style={{ background: '#1a4a1a' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Projected</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} barGap={2}>
                <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="projected" fill="#1a3a1a" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" fill="#00ff88" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5 flex flex-col">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Activity size={16} style={{ color: 'var(--accent)' }} />
              Recent Activity
            </h3>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  No activity yet. Start the pipeline to begin.
                </div>
              ) : (
                recentActivity.map(lead => (
                  <div key={lead.id} className="flex items-start gap-3 animate-fade-in-up">
                    <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: lead.status === 'replied' ? 'rgba(0,255,136,0.15)' : 'rgba(59,130,246,0.15)' }}>
                      {lead.status === 'replied'
                        ? <TrendingUp size={12} style={{ color: 'var(--accent)' }} />
                        : <Mail size={12} style={{ color: '#3b82f6' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{lead.domain}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {lead.status === 'replied' ? '✅ Reply received' : `📧 Emailed → ${lead.email?.split('@')[0]}@...`}
                      </div>
                    </div>
                    <div className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-dim)' }}>
                      {lead.emailSentAt ? format(parseISO(lead.emailSentAt), 'HH:mm') : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Campaigns + Issues */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="card p-5">
            <h3 className="font-bold mb-4 flex items-center justify-between">
              Active Campaigns
              <button className="text-xs" style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={() => useStore.getState().setActivePage('campaigns')}>
                View all →
              </button>
            </h3>
            <div className="space-y-3">
              {campaigns.slice(0, 3).map(c => (
                <div key={c.id} className="p-3 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate mr-2">{c.name}</span>
                    <span className="badge" style={{
                      background: c.status === 'active' ? 'var(--accent-dim)' : 'rgba(100,100,100,0.2)',
                      color: c.status === 'active' ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>📧 {c.totalSent} sent</span>
                    <span>📊 {c.sentToday}/{c.dailyLimit} today</span>
                  </div>
                  <div className="mt-2 rounded-full overflow-hidden" style={{ height: 3, background: 'var(--border2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(c.sentToday / c.dailyLimit) * 100}%`, background: 'var(--accent)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
              Issues Detected
            </h3>
            <div className="space-y-3">
              {[
                { label: 'SPF Record Missing', value: stats.spfMissing, color: 'var(--warning)', pct: stats.totalScanned > 0 ? Math.round((stats.spfMissing / stats.totalScanned) * 100) : 0 },
                { label: 'DMARC Missing', value: stats.dmarcMissing, color: 'var(--error)', pct: stats.totalScanned > 0 ? Math.round((stats.dmarcMissing / stats.totalScanned) * 100) : 0 },
                { label: 'Both Missing (Critical)', value: stats.bothMissing, color: '#ff4444', pct: stats.totalScanned > 0 ? Math.round((stats.bothMissing / stats.totalScanned) * 100) : 0 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    <span className="font-mono font-bold" style={{ color: item.color }}>{item.value.toLocaleString()}</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--border2)' }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.pct}%`, background: item.color }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Avg pitch success rate: <span className="font-mono" style={{ color: 'var(--accent)' }}>4.2%</span>
                  {' → '}
                  <span className="font-mono" style={{ color: 'var(--accent)' }}>${(stats.bothMissing * 0.042 * stats.dealValue).toFixed(0)}</span> projected
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deal value modal */}
      {editDeal && (
        <div className="modal-overlay" onClick={() => setEditDeal(false)}>
          <div className="modal-content" style={{ maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">Edit Deal Value</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Average deal value for revenue projections</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg" style={{ color: 'var(--accent)' }}>$</span>
              <input type="number" value={dealVal} onChange={e => setDealVal(e.target.value)} className="input-field" min="1" />
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-ghost flex-1" onClick={() => setEditDeal(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={() => { updateStats({ dealValue: Number(dealVal) }); setEditDeal(false); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
