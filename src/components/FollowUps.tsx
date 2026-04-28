import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Mail, Clock, Send, ChevronDown, ChevronRight, Edit2, X, CheckCircle } from 'lucide-react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

const SEQUENCE_TEMPLATES = [
  {
    day: 3,
    subject: 'Re: Security Issue Found on {domain}',
    body: `Hi there,

Just wanted to check in — did you get a chance to look at the audit report I sent a few days ago?

The vulnerabilities I found on {domain} are still open. It's a quick fix and I'd hate for your clients to be affected.

Report link: {doc_link}

Let me know if you have any questions!

{sender_name}`,
  },
  {
    day: 7,
    subject: 'Still seeing the issue on {domain}',
    body: `Hi again,

I noticed the email security vulnerabilities on {domain} are still unresolved.

This matters because without SPF/DMARC, your emails may land in spam and anyone can impersonate your business.

I've helped 30+ businesses in your industry fix this in under 20 minutes. Happy to jump on a quick call.

{sender_name}`,
  },
  {
    day: 14,
    subject: 'Last heads up about {domain}',
    body: `Hi,

This is my final follow-up about the security issue I found on {domain}.

Your competitors may already have this fixed — meaning their emails land in inboxes while yours go to spam.

The full technical breakdown is still here: {doc_link}

If you'd like help sorting this, reply and I'll get it fixed quickly. Otherwise, I'll remove you from my list.

{sender_name}`,
  },
];

export function FollowUps() {
  const { leads, settings, updateLead } = useStore();
  const [enabledSteps, setEnabledSteps] = useState([true, true, true]);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [templates, setTemplates] = useState(SEQUENCE_TEMPLATES);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const contactedLeads = leads.filter(l => (l.status === 'contacted' || l.status === 'tested') && l.emailSentAt);

  // Calculate which leads need follow-ups
  const followUpQueue = contactedLeads.map(lead => {
    const daysSince = differenceInDays(new Date(), parseISO(lead.emailSentAt!));
    // Find the highest step whose threshold has passed (e.g. day 8 → step #2 not step #1)
    let nextStep = -1;
    for (let i = templates.length - 1; i >= 0; i--) {
      if (enabledSteps[i] && daysSince >= templates[i].day) {
        nextStep = i;
        break;
      }
    }
    return { lead, daysSince, nextStep };
  }).filter(({ nextStep }) => nextStep !== -1);

  const upcomingFollowups = contactedLeads.map(lead => {
    const daysSince = differenceInDays(new Date(), parseISO(lead.emailSentAt!));
    const nextTemplate = templates.find((t, i) => enabledSteps[i] && daysSince < t.day);
    if (!nextTemplate) return null;
    const daysUntil = nextTemplate.day - daysSince;
    return { lead, daysUntil, template: nextTemplate };
  }).filter(Boolean) as Array<{ lead: typeof leads[0]; daysUntil: number; template: typeof SEQUENCE_TEMPLATES[0] }>;

  const handleSendFollowUp = async (leadId: string, stepIndex: number) => {
    setSending(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (!lead) { setSending(null); return; }

    const template = templates[stepIndex];
    const body = template.body
      .replace(/\{domain\}/g, lead.domain)
      .replace(/\{doc_link\}/g, lead.docUrl || '[report available on request]')
      .replace(/\{sender_name\}/g, settings.senderName || 'Infrastructure Auditor');
    const subject = template.subject.replace(/\{domain\}/g, lead.domain);

    if (settings.testMode) {
      toast.success(`[TEST] Follow-up #${stepIndex + 1} preview — not sent`);
    } else {
      // Send real email via backend
      try {
        const r = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: lead.email,
            subject,
            body,
            gmailAddress: settings.gmailAddress,
            gmailAppPassword: settings.gmailAppPassword,
          }),
        });
        if (!r.ok) throw new Error('Send failed');
        toast.success(`Follow-up #${stepIndex + 1} sent to ${lead.email}`);
      } catch (e) {
        toast.error(`Failed to send: ${e}`);
        setSending(null);
        return;
      }
    }
    // BUG-08 fix: advance status so lead leaves the queue
    updateLead(leadId, {
      status: 'contacted',
      followUpSentAt: new Date().toISOString(),
      followUpStep: stepIndex + 1,
    });
    setSending(null);
  };

  const saveTemplate = (index: number, updated: typeof templates[0]) => {
    setTemplates(prev => prev.map((t, i) => i === index ? updated : t));
    setEditingStep(null);
    toast.success('Template saved');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h1 className="text-xl font-bold">Follow-up Sequences</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Automated multi-step follow-up for non-responders</p>
        </div>
        <div className="flex items-center gap-3">
          {settings.testMode && (
            <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', fontSize: 12 }}>
              Test Mode — no emails sent
            </span>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Sequences</span>
            <label className="switch">
              <input type="checkbox" checked={globalEnabled} onChange={e => setGlobalEnabled(e.target.checked)} />
              <span className="switch-slider" />
            </label>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Contacted', value: contactedLeads.length, color: '#3b82f6' },
            { label: 'Need Follow-up', value: followUpQueue.length, color: 'var(--warning)' },
            { label: 'Upcoming', value: upcomingFollowups.length, color: '#a855f7' },
            { label: 'Replied', value: leads.filter(l => l.status === 'replied').length, color: 'var(--accent)' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <div className="text-2xl font-bold font-mono mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sequence configuration */}
        <div className="card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Mail size={16} style={{ color: 'var(--accent)' }} />
            Sequence Steps
          </h3>
          <div className="space-y-3">
            {templates.map((template, i) => (
              <div key={i}>
                <div className="flex items-center gap-4 p-4 rounded-lg" style={{
                  background: enabledSteps[i] ? 'var(--accent-dim)' : 'var(--surface2)',
                  border: `1px solid ${enabledSteps[i] ? 'rgba(0,255,136,0.2)' : 'var(--border2)'}`,
                }}>
                  <label className="switch" style={{ flexShrink: 0 }}>
                    <input type="checkbox" checked={enabledSteps[i]} onChange={e => {
                      const next = [...enabledSteps];
                      next[i] = e.target.checked;
                      setEnabledSteps(next);
                    }} />
                    <span className="switch-slider" />
                  </label>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm flex-shrink-0"
                    style={{ background: enabledSteps[i] ? 'var(--accent)' : 'var(--border2)', color: enabledSteps[i] ? '#000' : 'var(--text-muted)' }}>
                    {i + 1}
                  </div>
                  <Clock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span className="text-sm font-medium" style={{ minWidth: 80, color: enabledSteps[i] ? 'var(--accent)' : 'var(--text-muted)' }}>
                    Day {template.day}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{template.subject}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{template.body.split('\n')[2]?.trim()}</div>
                  </div>
                  <button
                    onClick={() => setEditingStep(editingStep === i ? null : i)}
                    className="btn-ghost"
                    style={{ padding: '6px 10px', fontSize: 12, flexShrink: 0 }}
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                </div>

                {/* Inline editor */}
                {editingStep === i && (
                  <EditTemplateForm
                    template={template}
                    onSave={(updated) => saveTemplate(i, updated)}
                    onCancel={() => setEditingStep(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up queue */}
        {followUpQueue.length > 0 && (
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Send size={16} style={{ color: 'var(--warning)' }} />
              Ready to Send ({followUpQueue.length})
            </h3>
            <div className="space-y-2">
              {followUpQueue.map(({ lead, daysSince, nextStep }) => (
                <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{lead.domain}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{lead.email} · {daysSince}d since contact</div>
                  </div>
                  <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                    Follow-up #{nextStep + 1}
                  </span>
                  <button
                    onClick={() => handleSendFollowUp(lead.id, nextStep)}
                    disabled={sending === lead.id}
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    {sending === lead.id ? (
                      <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Send size={12} />{settings.testMode ? 'Preview' : 'Send'}</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming follow-ups */}
        {upcomingFollowups.length > 0 && (
          <div className="card p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Clock size={16} style={{ color: '#a855f7' }} />
              Upcoming Follow-ups
            </h3>
            <div className="space-y-2">
              {upcomingFollowups.slice(0, 10).map(({ lead, daysUntil, template }) => (
                <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{lead.domain}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{template.subject.replace('{domain}', lead.domain)}</div>
                  </div>
                  <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                    in {daysUntil}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {contactedLeads.length === 0 && (
          <div className="card p-12 text-center">
            <Mail size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
            <div className="font-medium mb-2">No contacted leads yet</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Start the pipeline to begin contacting leads. Follow-ups will appear here automatically.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditTemplateForm({ template, onSave, onCancel }: {
  template: typeof SEQUENCE_TEMPLATES[0];
  onSave: (t: typeof SEQUENCE_TEMPLATES[0]) => void;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [day, setDay] = useState(template.day);

  return (
    <div className="mt-2 p-4 rounded-lg space-y-3" style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}>
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium w-16" style={{ color: 'var(--text-muted)' }}>Send on</label>
        <div className="flex items-center gap-2">
          <span className="text-sm">Day</span>
          <input type="number" value={day} min={1} max={90} onChange={e => setDay(Number(e.target.value))}
            className="input-field" style={{ width: 70 }} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} className="input-field" />
      </div>
      <div>
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
          Body <span style={{ fontWeight: 400 }}>· vars: {'{domain}'} {'{doc_link}'} {'{sender_name}'}</span>
        </label>
        <textarea value={body} onChange={e => setBody(e.target.value)} className="input-field" style={{ minHeight: 160, fontSize: 12 }} />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-ghost" style={{ fontSize: 12 }}><X size={12} /> Cancel</button>
        <button onClick={() => onSave({ ...template, subject, body, day })} className="btn-primary" style={{ fontSize: 12 }}>
          <CheckCircle size={12} /> Save
        </button>
      </div>
    </div>
  );
}
