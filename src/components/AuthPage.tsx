import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useStore(s => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      const ok = await login(email, password);
      if (ok) toast.success('Welcome to AuditFlow!');
    } catch {
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    await login('demo@auditflow.io', 'demo123');
    toast.success('Signed in as Demo User');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', color: '#000' }}>
              <Zap size={22} strokeWidth={3} />
            </div>
            <span className="text-xl font-bold font-mono" style={{ color: 'var(--accent)' }}>AuditFlow</span>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4" style={{ lineHeight: 1.2 }}>
                Automated email security auditing for the world's businesses.
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6 }}>
                Scan thousands of business websites, generate AI-powered audit reports, and send targeted cold outreach — all on autopilot.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: '🌐', text: '5,000+ niche×city combos — never run out of targets' },
                { icon: '🤖', text: 'Gemini AI writes personalised reports for every niche' },
                { icon: '📄', text: 'Auto-generates Google Docs with full audit findings' },
                { icon: '📧', text: 'Sends cold outreach emails automatically via SMTP' },
                { icon: '💰', text: 'Avg $60/deal — 100 emails/week = serious revenue' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-4 font-mono text-sm" style={{ fontSize: 12 }}>
          <div style={{ color: 'var(--accent)' }}>$ auditflow --scan --niche="dental clinic" --city="Sydney"</div>
          <div style={{ color: 'var(--text-muted)' }}>▶ Acquiring 25 targets...</div>
          <div style={{ color: '#3b82f6' }}>🔷 DNS: SPF missing on brightonsmiles.com.au</div>
          <div style={{ color: '#a855f7' }}>🤖 AI: Generating personalised audit report...</div>
          <div style={{ color: 'var(--accent)' }}>✅ Email sent → info@brightonsmiles.com.au</div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)', color: '#000' }}>
              <Zap size={20} strokeWidth={3} />
            </div>
            <span className="text-lg font-bold font-mono" style={{ color: 'var(--accent)' }}>AuditFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {mode === 'login' ? 'Sign in to your AuditFlow workspace' : 'Start your free plan — 50 targets/month'}
            </p>
          </div>

          {/* Google OAuth button */}
          <button
            onClick={handleDemo}
            className="w-full flex items-center justify-center gap-3 mb-6 font-medium"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              borderRadius: 8,
              padding: '12px 16px',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.48a4.72 4.72 0 010-3l-2.67-2.07a8 8 0 000 7.14L4.5 10.48z"/>
              <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.54-2.54A8 8 0 001.83 5.41L4.5 7.48a4.77 4.77 0 014.48-3.9z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field"
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  style={{ paddingLeft: 40, paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              style={{ padding: '12px 16px', fontSize: 15 }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <button
            onClick={handleDemo}
            className="w-full mt-3 flex items-center justify-center gap-2 font-medium"
            style={{
              background: 'transparent',
              border: '1px dashed var(--border2)',
              borderRadius: 8,
              padding: '10px 16px',
              cursor: 'pointer',
              color: 'var(--accent)',
              fontSize: 14,
            }}
          >
            <Zap size={14} />
            Try Demo Account
          </button>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          <div className="flex items-center justify-center gap-2 mt-8" style={{ color: 'var(--text-dim)', fontSize: 12 }}>
            <Shield size={12} />
            <span>SOC2 compliant · GDPR ready · 99.9% uptime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
