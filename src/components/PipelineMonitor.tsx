import React, { useEffect, useRef, useState } from 'react';
import { useStore, PipelineStage } from '../store/useStore';
import { usePipeline } from '../hooks/usePipeline';
import { Play, Square, Trash2, Globe, ShieldCheck, Mail, Bot, FileText, Send, Database } from 'lucide-react';

const STAGES: { id: PipelineStage; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'acquisition', label: 'Target Acquisition', icon: Globe, color: '#3b82f6' },
  { id: 'dns', label: 'DNS Recon', icon: ShieldCheck, color: '#3b82f6' },
  { id: 'email-discovery', label: 'Email Discovery', icon: Mail, color: '#f59e0b' },
  { id: 'ai-report', label: 'AI Report', icon: Bot, color: '#a855f7' },
  { id: 'doc-creation', label: 'Doc Creation', icon: FileText, color: '#06b6d4' },
  { id: 'sending', label: 'Outreach', icon: Send, color: '#00ff88' },
  { id: 'crm-update', label: 'CRM Update', icon: Database, color: '#00ff88' },
];

const LOG_COLORS: Record<string, string> = {
  info: '#e8e8e8',
  success: '#00ff88',
  warning: '#f59e0b',
  error: '#ff4444',
  ai: '#a855f7',
  dns: '#3b82f6',
};

export function PipelineMonitor() {
  const { campaigns, pipelineRunning, pipelineStage, pipelineLogs, startPipeline, stopPipeline, clearLogs, settings } = useStore();
  const { progress, batchDone, batchTotal } = usePipeline();
  const terminalRef = useRef<HTMLDivElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]?.id || '');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [pipelineLogs, autoScroll]);

  const handleStart = () => {
    if (!selectedCampaign) return;
    const campaign = campaigns.find(c => c.id === selectedCampaign);
    if (!campaign) return;
    if (campaign.status === 'paused' || campaign.status === 'completed') {
      alert(`Campaign is "${campaign.status}". Go to Campaigns and set it to Active first.`);
      return;
    }
    startPipeline(selectedCampaign);
  };

  const activeCampaign = campaigns.find(c => c.id === selectedCampaign);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-xl font-bold">Live Pipeline Monitor</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Real-time view of the automation engine</p>
        </div>
        <div className="flex items-center gap-3">
          {!pipelineRunning && (
            <select
              value={selectedCampaign}
              onChange={e => setSelectedCampaign(e.target.value)}
              className="input-field"
              style={{ width: 220, padding: '6px 32px 6px 12px' }}
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {pipelineRunning ? (
            <button onClick={stopPipeline} className="btn-danger flex items-center gap-2" style={{ padding: '8px 16px' }}>
              <Square size={14} />
              Stop Pipeline
            </button>
          ) : (
            <button onClick={handleStart} className="btn-primary flex items-center gap-2" disabled={!selectedCampaign || campaigns.find(c => c.id === selectedCampaign)?.status === "paused" || campaigns.find(c => c.id === selectedCampaign)?.status === "completed"}>
              <Play size={14} />
              Start Pipeline
            </button>
          )}
          <button onClick={clearLogs} className="btn-ghost flex items-center gap-2" style={{ padding: '8px 12px' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
        {/* Stage cards */}
        <div className="grid grid-cols-7 gap-2 flex-shrink-0">
          {STAGES.map((stage, stageIdx) => {
            const Icon = stage.icon;
            const isActive = pipelineStage === stage.id;
            const currentIdx = STAGES.findIndex(s => s.id === pipelineStage);
            const isDone = pipelineRunning && currentIdx > stageIdx;
            return (
              <div
                key={stage.id}
                className={`card p-3 flex flex-col items-center gap-2 transition-all duration-300 ${isActive ? 'stage-active' : ''}`}
                style={{
                  background: isActive ? 'rgba(0,255,136,0.05)' : isDone ? 'var(--surface2)' : 'var(--surface)',
                  borderColor: isActive ? 'var(--accent)' : isDone ? '#1a3a1a' : 'var(--border)',
                  opacity: !pipelineRunning && !isDone && !isActive ? 0.5 : 1,
                }}
              >
                <div style={{
                  color: isActive ? 'var(--accent)' : isDone ? '#2a5a2a' : stage.color,
                  filter: isActive ? 'drop-shadow(0 0 6px var(--accent))' : 'none',
                }}>
                  <Icon size={18} />
                </div>
                <span className="text-center leading-tight font-mono" style={{
                  fontSize: 9,
                  color: isActive ? 'var(--accent)' : isDone ? '#2a5a2a' : 'var(--text-muted)',
                }}>
                  {stage.label}
                </span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full animate-pulse-green" style={{ background: 'var(--accent)' }} />}
                {isDone && <div className="text-xs" style={{ color: '#2a5a2a' }}>✓</div>}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="flex-shrink-0 card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {pipelineRunning ? (
                  <span style={{ color: 'var(--accent)' }}>● Processing batch...</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Pipeline idle</span>
                )}
              </span>
              {pipelineRunning && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {batchDone} / {batchTotal} targets
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {activeCampaign && (
                <>
                  <span>Campaign: <span style={{ color: 'var(--text)' }}>{activeCampaign.name}</span></span>
                  <span>Limit: <span style={{ color: 'var(--text)' }}>{activeCampaign.dailyLimit}/day</span></span>
                  <span>Sent today: <span style={{ color: 'var(--accent)' }}>{activeCampaign.sentToday}</span></span>
                </>
              )}
              {settings.testMode && (
                <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                  TEST MODE
                </span>
              )}
            </div>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 8, background: 'var(--border2)' }}>
            <div
              className="h-full rounded-full progress-bar-fill"
              style={{ width: `${pipelineRunning ? Math.max(progress, 3) : 0}%` }}
            />
          </div>
        </div>

        {/* Terminal */}
        <div className="flex-1 card overflow-hidden flex flex-col" style={{ background: '#050808', borderColor: '#1a2a1a' }}>
          <div className="flex items-center justify-between px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #0f1f0f', background: '#030606' }}>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
              </div>
              <span className="font-mono text-xs ml-2" style={{ color: '#2a4a2a' }}>auditflow — pipeline.log</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-mono cursor-pointer" style={{ color: '#2a4a2a' }}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={e => setAutoScroll(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                auto-scroll
              </label>
              <span className="font-mono text-xs" style={{ color: '#2a4a2a' }}>{pipelineLogs.length} lines</span>
            </div>
          </div>

          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono"
            style={{ fontSize: 12, lineHeight: 1.7 }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 20;
              setAutoScroll(atBottom);
            }}
          >
            {pipelineLogs.length === 0 ? (
              <div style={{ color: '#1a3a1a' }}>
                <div>{'>'} AuditFlow Pipeline Engine v2.1.0</div>
                <div>{'>'} Ready. Select a campaign and press Start Pipeline.</div>
                <div>{'>'} <span className="animate-blink">█</span></div>
              </div>
            ) : (
              pipelineLogs.map((log) => (
                <div
                  key={log.id}
                  className="log-line flex items-start gap-2"
                  style={{ color: LOG_COLORS[log.type] || '#e8e8e8' }}
                >
                  <span style={{ color: '#1a3a1a', flexShrink: 0 }}>
                    {new Date(log.createdAt).toLocaleTimeString('en', { hour12: false })}
                  </span>
                  <span className="break-all">{log.message || '\u00A0'}</span>
                </div>
              ))
            )}
            {pipelineRunning && (
              <div className="font-mono" style={{ color: 'var(--accent)', fontSize: 12 }}>
                {'>'} <span className="animate-blink">█</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
