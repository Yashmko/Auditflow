import { useState } from 'react';
import { useStore, Campaign } from '../store/useStore';
import { NICHES, COUNTRIES } from '../data/niches';
import { Plus, Play, Pause, Trash2, Edit2, X, Megaphone } from 'lucide-react';

const DEFAULT_TEMPLATE = `Hi there,

I ran a security scan on {domain} and found something you should know about.

Your email infrastructure is missing {issue}, which means {niche_problem}.

I've put together a full audit report here: {doc_link}

Happy to help you get this fixed — it usually takes about 20 minutes.

{sender_name}`;

function CampaignCard({ campaign, onEdit, onDelete, onToggle }: {
  campaign: Campaign;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="card p-5 animate-fade-in-up" style={{
      borderColor: campaign.status === 'active' ? 'rgba(0,255,136,0.2)' : 'var(--border)',
      background: campaign.status === 'active' ? 'rgba(0,255,136,0.02)' : 'var(--surface)',
    }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge" style={{
              background: campaign.status === 'active' ? 'var(--accent-dim)' : campaign.status === 'paused' ? 'rgba(245,158,11,0.15)' : 'rgba(100,100,100,0.15)',
              color: campaign.status === 'active' ? 'var(--accent)' : campaign.status === 'paused' ? 'var(--warning)' : 'var(--text-muted)',
            }}>
              {campaign.status === 'active' ? '● ACTIVE' : campaign.status === 'paused' ? '⏸ PAUSED' : '✓ COMPLETED'}
            </span>
            <span className="badge" style={{ background: 'rgba(100,100,100,0.1)', color: 'var(--text-muted)' }}>
              {campaign.schedule}
            </span>
          </div>
          <h3 className="font-bold text-base">{campaign.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: campaign.status === 'active' ? 'var(--warning)' : 'var(--accent)' }}>
            {campaign.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <Edit2 size={16} />
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Total Sent', value: campaign.totalSent, icon: '📧', color: 'var(--accent)' },
          { label: 'Sent Today', value: `${campaign.sentToday}/${campaign.dailyLimit}`, icon: '📅', color: 'var(--text)' },
          { label: 'Niches', value: campaign.niches.length, icon: '🎯', color: 'var(--text)' },
          { label: 'Countries', value: campaign.countries.length, icon: '🌐', color: 'var(--text)' },
        ].map((stat, i) => (
          <div key={i}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{stat.icon} {stat.label}</div>
            <div className="font-mono font-bold" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
          <span>Daily Progress</span>
          <span>{campaign.sentToday}/{campaign.dailyLimit}</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--border2)' }}>
          <div className="h-full rounded-full" style={{
            width: `${(campaign.sentToday / campaign.dailyLimit) * 100}%`,
            background: 'var(--accent)',
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {campaign.niches.slice(0, 4).map(n => (
          <span key={n} className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{n}</span>
        ))}
        {campaign.niches.length > 4 && (
          <span className="badge" style={{ background: 'rgba(100,100,100,0.1)', color: 'var(--text-muted)' }}>+{campaign.niches.length - 4} more</span>
        )}
        <span className="badge" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
          {campaign.reportTone}
        </span>
      </div>
    </div>
  );
}

function NicheSelector({ selected, onChange }: { selected: string[]; onChange: (niches: string[]) => void }) {
  const toggle = (niche: string) => {
    if (selected.includes(niche)) onChange(selected.filter(n => n !== niche));
    else onChange([...selected, niche]);
  };
  return (
    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
      {NICHES.map(n => (
        <button key={n} type="button" onClick={() => toggle(n)} className="badge" style={{
          background: selected.includes(n) ? 'var(--accent-dim)' : 'rgba(100,100,100,0.1)',
          color: selected.includes(n) ? 'var(--accent)' : 'var(--text-muted)',
          cursor: 'pointer',
          border: selected.includes(n) ? '1px solid rgba(0,255,136,0.3)' : '1px solid transparent',
          padding: '4px 10px', fontSize: 12,
        }}>
          {n}
        </button>
      ))}
    </div>
  );
}

function CountrySelector({ selected, onChange }: { selected: string[]; onChange: (countries: string[]) => void }) {
  const toggle = (c: string) => {
    if (selected.includes(c)) onChange(selected.filter(x => x !== c));
    else onChange([...selected, c]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {COUNTRIES.map(c => (
        <button key={c} type="button" onClick={() => toggle(c)} className="badge" style={{
          background: selected.includes(c) ? 'rgba(168,85,247,0.15)' : 'rgba(100,100,100,0.1)',
          color: selected.includes(c) ? '#a855f7' : 'var(--text-muted)',
          cursor: 'pointer',
          border: selected.includes(c) ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
          padding: '4px 10px', fontSize: 12,
        }}>
          {c}
        </button>
      ))}
    </div>
  );
}

export function CampaignManager() {
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    niches: [] as string[],
    countries: [] as string[],
    status: 'active' as 'active' | 'paused' | 'completed',
    dailyLimit: 25,
    emailTemplate: DEFAULT_TEMPLATE,
    reportTone: 'professional' as 'professional' | 'alarming' | 'friendly',
    schedule: 'daily' as 'once' | 'daily' | 'weekly',
    userId: 'user-1',
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', niches: [], countries: [], status: 'active', dailyLimit: 25, emailTemplate: DEFAULT_TEMPLATE, reportTone: 'professional', schedule: 'daily', userId: 'user-1' });
    setShowModal(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setForm({
      name: campaign.name, niches: campaign.niches, countries: campaign.countries,
      status: campaign.status, dailyLimit: campaign.dailyLimit,
      emailTemplate: campaign.emailTemplate, reportTone: campaign.reportTone,
      schedule: campaign.schedule, userId: campaign.userId,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (form.niches.length === 0) {
      alert('Select at least one niche before saving.');
      return;
    }
    if (form.countries.length === 0) {
      alert('Select at least one country before saving.');
      return;
    }
    if (editingId) updateCampaign(editingId, form);
    else addCampaign(form);
    setShowModal(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-xl font-bold">Campaign Manager</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} · {campaigns.filter(c => c.status === 'active').length} active</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      <div className="px-6 py-4 grid grid-cols-4 gap-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'Total Campaigns', value: campaigns.length, color: 'var(--text)' },
          { label: 'Total Sent', value: campaigns.reduce((a, c) => a + c.totalSent, 0).toLocaleString(), color: 'var(--accent)' },
          { label: 'Active Today', value: campaigns.filter(c => c.status === 'active').length, color: 'var(--accent)' },
          { label: 'Avg Daily Limit', value: Math.round(campaigns.reduce((a, c) => a + c.dailyLimit, 0) / Math.max(campaigns.length, 1)), color: 'var(--text)' },
        ].map((s, i) => (
          <div key={i} className="card p-4">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            <div className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
            <Megaphone size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <div className="text-lg font-medium mb-2">No campaigns yet</div>
            <div className="text-sm mb-6">Create your first campaign to start automating outreach</div>
            <button onClick={openCreate} className="btn-primary">Create Campaign</button>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))' }}>
            {campaigns.map(c => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onEdit={() => openEdit(c)}
                onDelete={() => { if (window.confirm(`Delete campaign "${c.name}"? This cannot be undone.`)) { deleteCampaign(c.id); } }}
                onToggle={() => updateCampaign(c.id, { status: c.status === 'active' ? 'paused' : 'active' })}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 680, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block mb-2 text-sm font-medium">Campaign Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. AU Dentists May 2025" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium">Schedule</label>
                  <select value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value as 'once' | 'daily' | 'weekly' }))} className="input-field">
                    <option value="once">Run Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Report Tone</label>
                  <select value={form.reportTone} onChange={e => setForm(f => ({ ...f, reportTone: e.target.value as 'professional' | 'alarming' | 'friendly' }))} className="input-field">
                    <option value="professional">Professional</option>
                    <option value="alarming">Alarming</option>
                    <option value="friendly">Friendly</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium">Daily Limit</label>
                  <input type="number" min={1} max={500} value={form.dailyLimit} onChange={e => setForm(f => ({ ...f, dailyLimit: Number(e.target.value) }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Target Niches <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({form.niches.length} selected)</span></label>
                <NicheSelector selected={form.niches} onChange={niches => setForm(f => ({ ...f, niches }))} />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Target Countries <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({form.countries.length} selected)</span></label>
                <CountrySelector selected={form.countries} onChange={countries => setForm(f => ({ ...f, countries }))} />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Email Template</label>
                <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  Variables: <code style={{ color: 'var(--accent)' }}>{'{domain}'}</code> <code style={{ color: 'var(--accent)' }}>{'{issue}'}</code> <code style={{ color: 'var(--accent)' }}>{'{doc_link}'}</code> <code style={{ color: 'var(--accent)' }}>{'{sender_name}'}</code>
                </div>
                <textarea
                  value={form.emailTemplate}
                  onChange={e => setForm(f => ({ ...f, emailTemplate: e.target.value }))}
                  className="input-field font-mono"
                  style={{ minHeight: 160, fontSize: 12 }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleSave} className="btn-primary flex-1" disabled={!form.name.trim() || form.niches.length === 0 || form.countries.length === 0}>
                {editingId ? 'Save Changes' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
