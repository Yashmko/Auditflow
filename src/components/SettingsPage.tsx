import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { NICHES, COUNTRIES } from '../data/niches';
import { Key, Mail, Globe, Shield, CheckCircle, Eye, EyeOff, Upload, AlertTriangle, Zap, Crown, X } from 'lucide-react';
import toast from 'react-hot-toast';

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
          {icon}
        </div>
        <h3 className="font-bold">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div className="grid items-start" style={{ gridTemplateColumns: '200px 1fr', gap: 16 }}>
      <div>
        <div className="text-sm font-medium">{label}</div>
        {sublabel && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sublabel}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ApiKeyField({ label, value, onChange, placeholder, testFn }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; testFn?: () => void;
}) {
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!testFn || !value) return;
    setTesting(true);
    await new Promise(r => setTimeout(r, 1200));
    testFn();
    setTesting(false);
  };

  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label}...`}
        className="input-field font-mono"
        style={{ paddingRight: testFn ? 120 : 40, fontSize: 13 }}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button type="button" onClick={() => setShow(!show)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        {testFn && (
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !value}
            style={{
              background: 'var(--accent-dim)', border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: 4, color: 'var(--accent)', fontSize: 11,
              padding: '2px 8px', cursor: value ? 'pointer' : 'not-allowed',
              opacity: value ? 1 : 0.4, fontWeight: 600,
            }}
          >
            {testing ? '...' : 'TEST'}
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings } = useStore();
  const [saved, setSaved] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [blacklistInput, setBlacklistInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    // Validate required fields before saving
    if (!settings.testMode && (!settings.gmailAddress || !settings.gmailAppPassword)) {
      toast.error('Gmail credentials required when Test Mode is off');
      return;
    }
    setSaved(true);
    toast.success('Settings saved successfully');
    setTimeout(() => setSaved(false), 2000);
  };

  const testGemini = async () => {
    if (!settings.geminiApiKey) { toast.error('Enter an API key first'); return; }
    try {
      const r = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: settings.geminiApiKey }),
      });
      const d = await r.json();
      if (r.ok) toast.success('✅ Gemini API key is valid and working');
      else toast.error(`❌ Invalid key: ${d.error}`);
    } catch {
      toast.error('❌ Could not reach backend — is server.py running?');
    }
  };

  const handleServiceAccountUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a .json service account file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text); // validate it's valid JSON
        updateSettings({ googleServiceAccount: text });
        toast.success('✅ Service account JSON loaded');
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const addBlacklist = () => {
    const domain = blacklistInput.trim().toLowerCase().replace(/^https?:\/\//, '');
    if (domain && !settings.blacklistedDomains.includes(domain)) {
      updateSettings({ blacklistedDomains: [...settings.blacklistedDomains, domain] });
      setBlacklistInput('');
    }
  };

  const removeBlacklist = (domain: string) => {
    updateSettings({ blacklistedDomains: settings.blacklistedDomains.filter(d => d !== domain) });
  };

  const toggleNiche = (niche: string) => {
    const active = settings.activeNiches;
    updateSettings({
      activeNiches: active.includes(niche) ? active.filter(n => n !== niche) : [...active, niche]
    });
  };

  const toggleCountry = (country: string) => {
    const active = settings.activeCountries;
    updateSettings({
      activeCountries: active.includes(country) ? active.filter(c => c !== country) : [...active, country]
    });
  };

  const maxDailyLimit = settings.plan === 'free' ? 50 : settings.plan === 'pro' ? 500 : 2000;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-xl font-bold">Settings & Configuration</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Configure your API keys, targeting, and pipeline behaviour</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPricing(true)} className="btn-ghost flex items-center gap-2" style={{ fontSize: 13 }}>
            <Crown size={14} style={{ color: 'var(--warning)' }} />
            Upgrade Plan
          </button>
          <button onClick={save} className="btn-primary flex items-center gap-2" style={{ fontSize: 13 }}>
            {saved ? <CheckCircle size={14} /> : <Zap size={14} />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* API Keys */}
        <Section title="API Keys" icon={<Key size={16} style={{ color: 'var(--accent)' }} />}>
          <FieldRow label="Gemini API Key" sublabel="Google Gemini 1.5 Flash (free tier)">
            <ApiKeyField label="Gemini API Key" value={settings.geminiApiKey} onChange={v => updateSettings({ geminiApiKey: v })} placeholder="AIza..." testFn={testGemini} />
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs mt-1 block" style={{ color: 'var(--accent)' }}>Get free API key →</a>
          </FieldRow>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <FieldRow label="Gmail Address" sublabel="Used as the sender email">
            <input type="email" value={settings.gmailAddress} onChange={e => updateSettings({ gmailAddress: e.target.value })} className="input-field" placeholder="yourname@gmail.com" />
          </FieldRow>
          <FieldRow label="Gmail App Password" sublabel="16-character app password (not your Gmail password)">
            <ApiKeyField label="Gmail App Password" value={settings.gmailAppPassword} onChange={v => updateSettings({ gmailAppPassword: v })} placeholder="xxxx xxxx xxxx xxxx" />
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-xs mt-1 block" style={{ color: 'var(--accent)' }}>Generate app password →</a>
          </FieldRow>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <FieldRow label="Google Service Account" sublabel="JSON key file for Docs/Drive API">
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleServiceAccountUpload}
              style={{ display: 'none' }}
            />
            <div
              className="flex items-center justify-center gap-3 cursor-pointer"
              style={{ border: '2px dashed var(--border2)', borderRadius: 8, padding: 20, color: 'var(--text-muted)', fontSize: 13, transition: 'border-color 0.2s' }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,255,136,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
            >
              <Upload size={16} />
              {settings.googleServiceAccount ? (
                <span style={{ color: 'var(--accent)' }}>✅ Service account JSON loaded — click to replace</span>
              ) : (
                <span>Drop service-account.json here or click to upload</span>
              )}
            </div>
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-xs mt-1 block" style={{ color: 'var(--accent)' }}>Create service account →</a>
          </FieldRow>
        </Section>

        {/* Targeting */}
        <Section title="Target Settings" icon={<Globe size={16} style={{ color: '#3b82f6' }} />}>
          <FieldRow label="Daily Target Limit" sublabel={`Max leads processed per day (${settings.plan} plan: up to ${maxDailyLimit})`}>
            <div className="flex items-center gap-4">
              <input type="range" min={10} max={maxDailyLimit} value={Math.min(settings.dailyLimit, maxDailyLimit)}
                onChange={e => updateSettings({ dailyLimit: Number(e.target.value) })} style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <span className="font-mono font-bold text-xl w-16 text-center" style={{ color: 'var(--accent)' }}>{Math.min(settings.dailyLimit, maxDailyLimit)}</span>
            </div>
          </FieldRow>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <FieldRow label="Active Niches" sublabel={`${settings.activeNiches.length} of ${NICHES.length} selected`}>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {NICHES.map(n => (
                <button key={n} type="button" onClick={() => toggleNiche(n)} className="badge" style={{
                  background: settings.activeNiches.includes(n) ? 'var(--accent-dim)' : 'rgba(100,100,100,0.1)',
                  color: settings.activeNiches.includes(n) ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  border: settings.activeNiches.includes(n) ? '1px solid rgba(0,255,136,0.3)' : '1px solid transparent',
                  padding: '4px 10px', fontSize: 12,
                }}>{n}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => updateSettings({ activeNiches: [...NICHES] })} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Select all</button>
              <button onClick={() => updateSettings({ activeNiches: [] })} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
            </div>
          </FieldRow>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <FieldRow label="Active Countries" sublabel={`${settings.activeCountries.length} selected`}>
            <div className="flex flex-wrap gap-1.5">
              {COUNTRIES.map(c => (
                <button key={c} type="button" onClick={() => toggleCountry(c)} className="badge" style={{
                  background: settings.activeCountries.includes(c) ? 'rgba(168,85,247,0.15)' : 'rgba(100,100,100,0.1)',
                  color: settings.activeCountries.includes(c) ? '#a855f7' : 'var(--text-muted)',
                  cursor: 'pointer',
                  border: settings.activeCountries.includes(c) ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
                  padding: '4px 10px', fontSize: 12,
                }}>{c}</button>
              ))}
            </div>
          </FieldRow>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <FieldRow label="Blacklisted Domains" sublabel="These domains will never be contacted">
            <div className="flex gap-2 mb-2">
              <input value={blacklistInput} onChange={e => setBlacklistInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBlacklist()} className="input-field flex-1" placeholder="example.com" style={{ fontSize: 12 }} />
              <button onClick={addBlacklist} className="btn-ghost" style={{ padding: '8px 12px', fontSize: 12 }}>Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {settings.blacklistedDomains.map(d => (
                <span key={d} className="badge flex items-center gap-1" style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', fontSize: 12 }}>
                  {d}
                  <button onClick={() => removeBlacklist(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444', padding: 0, display: 'flex' }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              {settings.blacklistedDomains.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>No domains blacklisted</span>
              )}
            </div>
          </FieldRow>
        </Section>

        {/* Email */}
        <Section title="Email Settings" icon={<Mail size={16} style={{ color: '#f59e0b' }} />}>
          <FieldRow label="Sender Name" sublabel="Name shown in the From: field">
            <input value={settings.senderName} onChange={e => updateSettings({ senderName: e.target.value })} className="input-field" placeholder="Your Name" />
          </FieldRow>
          <FieldRow label="Reply-to Address" sublabel="Replies will go to this email">
            <input type="email" value={settings.replyToAddress} onChange={e => updateSettings({ replyToAddress: e.target.value })} className="input-field" placeholder="replies@yourdomain.com" />
          </FieldRow>
          <FieldRow label="Email Signature" sublabel="Appended to all outreach emails">
            <textarea value={settings.emailSignature} onChange={e => updateSettings({ emailSignature: e.target.value })} className="input-field"
              placeholder={"Best regards,\nYour Name\nyour@email.com"} style={{ minHeight: 80, fontSize: 13 }} />
          </FieldRow>
        </Section>

        {/* Safety */}
        <Section title="Safety & Compliance" icon={<Shield size={16} style={{ color: '#ff4444' }} />}>
          {[
            { label: 'Test Mode', sub: 'Preview emails without actually sending them (recommended until configured)', key: 'testMode' as const, warning: true },
            { label: 'Auto-append Unsubscribe Link', sub: 'Adds an unsubscribe link to every email for CAN-SPAM/GDPR compliance', key: 'appendUnsubscribe' as const, warning: false },
          ].map(item => (
            <FieldRow key={item.key} label={item.label} sublabel={item.sub}>
              <div className="flex items-center gap-3">
                <label className="switch">
                  <input type="checkbox" checked={settings[item.key]} onChange={e => updateSettings({ [item.key]: e.target.checked })} />
                  <span className="switch-slider" />
                </label>
                {settings[item.key] && item.warning && (
                  <span className="badge flex items-center gap-1" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                    <AlertTriangle size={10} />
                    Test mode active — no emails sent
                  </span>
                )}
                {!settings[item.key] && item.warning && (
                  <span className="badge flex items-center gap-1" style={{ background: 'rgba(255,68,68,0.1)', color: 'var(--error)' }}>
                    <AlertTriangle size={10} />
                    Live mode — emails will be sent!
                  </span>
                )}
              </div>
            </FieldRow>
          ))}
        </Section>
      </div>

      {/* Pricing Modal */}
      {showPricing && (
        <div className="modal-overlay" onClick={() => setShowPricing(false)}>
          <div className="modal-content" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Choose Your Plan</h2>
              <button onClick={() => setShowPricing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'Free', price: '$0', period: '/mo', color: 'var(--text-muted)', features: ['50 targets/month', '1 campaign', 'Basic reports', 'Test mode only'], plan: 'free' as const },
                { name: 'Pro', price: '$29', period: '/mo', color: 'var(--accent)', badge: 'Most Popular', features: ['500 targets/day', '5 campaigns', 'Follow-up sequences', 'AI reports', 'Google Docs API', 'CSV export', 'Live sending'], plan: 'pro' as const },
                { name: 'Agency', price: '$79', period: '/mo', color: '#a855f7', features: ['2000 targets/day', 'Unlimited campaigns', 'Everything in Pro', 'Team seats', 'White-label reports', 'Priority support', 'API access'], plan: 'agency' as const },
              ].map(p => (
                <div key={p.name} className="card p-5" style={{
                  borderColor: settings.plan === p.plan ? p.color : 'var(--border)',
                  background: settings.plan === p.plan ? `${p.color}08` : 'var(--surface)',
                }}>
                  {'badge' in p && p.badge && <div className="badge mb-3" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>{p.badge}</div>}
                  <div className="font-bold text-lg mb-1">{p.name}</div>
                  <div className="flex items-end gap-1 mb-4">
                    <span className="text-3xl font-bold font-mono" style={{ color: p.color }}>{p.price}</span>
                    <span className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{p.period}</span>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle size={14} style={{ color: p.color, flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => { updateSettings({ plan: p.plan }); toast.success(`Switched to ${p.name} plan`); setShowPricing(false); }}
                    className={p.plan === 'pro' ? 'btn-primary w-full' : 'btn-ghost w-full'}
                    style={p.plan === 'agency' ? { borderColor: '#a855f7', color: '#a855f7' } : {}}
                  >
                    {settings.plan === p.plan ? 'Current Plan' : `Select ${p.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
