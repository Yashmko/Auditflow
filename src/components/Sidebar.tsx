import { useStore } from '../store/useStore';
import {
  Zap, LayoutDashboard, Terminal, Database, Megaphone,
  Mail, Settings, LogOut, Crown, ChevronRight, CircleDot
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Live Pipeline', icon: Terminal },
  { id: 'leads', label: 'Lead Database', icon: Database },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'followups', label: 'Follow-ups', icon: Mail },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { activePage, setActivePage, user, logout, settings, pipelineRunning } = useStore();

  return (
    <aside className="flex flex-col h-full" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', width: 220, flexShrink: 0 }}>
      {/* Logo */}
      <div className="p-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)', color: '#000' }}>
            <Zap size={18} strokeWidth={3} />
          </div>
          <div>
            <div className="font-bold font-mono text-sm" style={{ color: 'var(--accent)', lineHeight: 1.2 }}>AuditFlow</div>
            <div className="font-mono text-xs" style={{ color: 'var(--text-dim)' }}>v2.1.0</div>
          </div>
        </div>
      </div>

      {/* Pipeline status */}
      {pipelineRunning && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,255,136,0.2)' }}>
          <CircleDot size={12} className="animate-pulse-green" style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-mono font-medium" style={{ color: 'var(--accent)' }}>Pipeline Running</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`sidebar-item w-full ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'pipeline' && pipelineRunning && (
                <span className="w-2 h-2 rounded-full animate-pulse-green" style={{ background: 'var(--accent)' }} />
              )}
              {isActive && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
            </button>
          );
        })}
      </nav>

      {/* Plan badge */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="card p-3 mb-3" style={{ background: 'var(--surface2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Crown size={14} style={{ color: settings.plan === 'free' ? 'var(--warning)' : 'var(--accent)' }} />
            <span className="text-xs font-bold font-mono uppercase" style={{ color: settings.plan === 'free' ? 'var(--warning)' : 'var(--accent)' }}>
              {settings.plan === 'free' ? 'Free Plan' : settings.plan === 'pro' ? 'Pro Plan' : 'Agency Plan'}
            </span>
          </div>
          {settings.plan === 'free' && (
            <>
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{useStore.getState().stats.totalScanned} / 50 targets used</div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'var(--border2)' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((useStore.getState().stats.totalScanned / 50) * 100, 100)}%`, background: 'var(--warning)' }} />
              </div>
              <button
                onClick={() => setActivePage('settings')}
                className="w-full mt-2 text-xs font-medium py-1.5 rounded-md"
                style={{ background: 'var(--accent)', color: '#000', border: 'none', cursor: 'pointer' }}
              >
                Upgrade to Pro
              </button>
            </>
          )}
          {settings.plan !== 'free' && (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Unlimited targets</div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,255,136,0.3)' }}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.name || 'User'}</div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
          <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
