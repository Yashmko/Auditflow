import { useState, useMemo } from 'react';
import { useStore, LeadStatus } from '../store/useStore';
import { Search, Download, Plus, ExternalLink, FileText, Trash2, X, Globe } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { NICHES, COUNTRIES } from '../data/niches';

const STATUS_STYLES: Record<LeadStatus, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(100,100,100,0.15)', color: '#888', label: 'Pending' },
  scanning:  { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Scanning' },
  contacted: { bg: 'rgba(0,255,136,0.12)', color: '#00ff88', label: 'Contacted' },
  replied:   { bg: 'rgba(0,255,136,0.25)', color: '#00ff88', label: 'Replied ✓' },
  closed:    { bg: 'rgba(0,255,136,0.08)', color: '#00aa55', label: 'Closed' },
  failed:    { bg: 'rgba(255,68,68,0.12)', color: '#ff4444', label: 'Failed' },
  skipped:   { bg: 'rgba(100,100,100,0.1)', color: '#555', label: 'Skipped' },
  tested:    { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Tested' },
};

export function LeadDatabase() {
  const { leads, deleteLead, updateLead, setSelectedLead, selectedLeadId } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [nicheFilter, setNicheFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  const filtered = useMemo(() => {
    return leads
      .filter(l => {
        if (search && !l.domain.toLowerCase().includes(search.toLowerCase()) &&
          !l.email?.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== 'all' && l.status !== statusFilter) return false;
        if (nicheFilter !== 'all' && l.niche !== nicheFilter) return false;
        if (countryFilter !== 'all' && l.country !== countryFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, search, statusFilter, nicheFilter, countryFilter]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(l => l.id)));
  };

  const exportCSV = () => {
    const rows = [
      ['Domain', 'Email', 'Niche', 'City', 'Country', 'SPF', 'DMARC', 'Status', 'Doc URL', 'Date Contacted'],
      ...filtered.map(l => [
        l.domain, l.email || '', l.niche, l.city, l.country,
        l.spf ? 'Yes' : 'No', l.dmarc ? 'Yes' : 'No', l.status,
        l.docUrl || '', l.emailSentAt ? format(parseISO(l.emailSentAt), 'yyyy-MM-dd') : ''
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditflow-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bulkDelete = () => {
    selected.forEach(id => deleteLead(id));
    setSelected(new Set());
  };

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h1 className="text-xl font-bold">Lead Database</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{filtered.length.toLocaleString()} of {leads.length.toLocaleString()} leads</p>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)' }}>
                <span className="text-xs font-mono" style={{ color: '#ff4444' }}>{selected.size} selected</span>
                <button onClick={bulkDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-2" style={{ fontSize: 13, padding: '7px 14px' }}>
              <Download size={14} />
              Export CSV
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2" style={{ fontSize: 13, padding: '7px 14px' }}>
              <Plus size={14} />
              Add Domain
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search domain or email..."
              className="input-field"
              style={{ paddingLeft: 36, paddingTop: 7, paddingBottom: 7 }}
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ width: 140, padding: '7px 32px 7px 12px' }}>
            <option value="all">All Status</option>
            {Object.entries(STATUS_STYLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={nicheFilter} onChange={e => setNicheFilter(e.target.value)} className="input-field" style={{ width: 160, padding: '7px 32px 7px 12px' }}>
            <option value="all">All Niches</option>
            {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="input-field" style={{ width: 150, padding: '7px 32px 7px 12px' }}>
            <option value="all">All Countries</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || statusFilter !== 'all' || nicheFilter !== 'all' || countryFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setNicheFilter('all'); setCountryFilter('all'); }} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ width: 40, padding: '10px 8px 10px 20px', textAlign: 'left' }}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} style={{ accentColor: 'var(--accent)' }} />
                </th>
                {['Domain', 'Email', 'Niche', 'Location', 'Security', 'Status', 'Contacted', 'Actions'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-medium" style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr
                  key={lead.id}
                  className="table-row cursor-pointer"
                  style={{ borderBottom: '1px solid var(--border)', background: selectedLeadId === lead.id ? 'var(--surface2)' : 'transparent' }}
                  onClick={() => setSelectedLead(selectedLeadId === lead.id ? null : lead.id)}
                >
                  <td style={{ padding: '10px 8px 10px 20px' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} style={{ accentColor: 'var(--accent)' }} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Globe size={12} style={{ color: 'var(--text-dim)' }} />
                      <span className="font-mono" style={{ color: 'var(--text)', fontSize: 12 }}>{lead.domain}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {lead.email ? (lead.email.length > 24 ? lead.email.substring(0, 24) + '…' : lead.email) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{lead.niche}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{lead.city}, {lead.country.substring(0, 2).toUpperCase()}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {lead.spf === null ? null : lead.spf
                        ? <span className="badge" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', fontSize: 10 }}>SPF ✓</span>
                        : <span className="badge" style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', fontSize: 10 }}>SPF ✗</span>}
                      {lead.dmarc === null ? null : lead.dmarc
                        ? <span className="badge" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', fontSize: 10 }}>DMARC ✓</span>
                        : <span className="badge" style={{ background: 'rgba(255,68,68,0.1)', color: '#ff4444', fontSize: 10 }}>DMARC ✗</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="badge" style={{ background: STATUS_STYLES[lead.status].bg, color: STATUS_STYLES[lead.status].color }}>
                      {STATUS_STYLES[lead.status].label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {lead.emailSentAt ? format(parseISO(lead.emailSentAt), 'MMM d') : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {lead.docUrl && (
                        <a href={lead.docUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                          <FileText size={14} />
                        </a>
                      )}
                      <button onClick={() => deleteLead(lead.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    No leads match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <div className="flex-shrink-0 overflow-y-auto" style={{ width: 360, borderLeft: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Lead Details</h3>
              <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium mb-1 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Domain</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{selectedLead.domain}</span>
                  <a href={`https://${selectedLead.domain}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs mb-1 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Status</div>
                  <span className="badge" style={{ background: STATUS_STYLES[selectedLead.status].bg, color: STATUS_STYLES[selectedLead.status].color }}>
                    {STATUS_STYLES[selectedLead.status].label}
                  </span>
                </div>
                <div>
                  <div className="text-xs mb-1 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Niche</div>
                  <span className="text-sm">{selectedLead.niche}</span>
                </div>
                <div>
                  <div className="text-xs mb-1 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>City</div>
                  <span className="text-sm">{selectedLead.city}</span>
                </div>
                <div>
                  <div className="text-xs mb-1 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Country</div>
                  <span className="text-sm">{selectedLead.country}</span>
                </div>
              </div>

              <div>
                <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Email</div>
                <div className="font-mono text-sm" style={{ color: selectedLead.email ? 'var(--text)' : 'var(--text-dim)' }}>
                  {selectedLead.email || 'Not discovered'}
                </div>
              </div>

              <div>
                <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Security Status</div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'spf', label: 'SPF', value: selectedLead.spf },
                    { key: 'dmarc', label: 'DMARC', value: selectedLead.dmarc },
                    { key: 'https', label: 'HTTPS', value: selectedLead.https },
                    { key: 'mx', label: 'MX', value: selectedLead.mx },
                  ].map(item => item.value !== null && (
                    <span key={item.key} className="badge" style={{
                      background: item.value ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
                      color: item.value ? '#00ff88' : '#ff4444'
                    }}>
                      {item.label} {item.value ? '✓' : '✗'}
                    </span>
                  ))}
                </div>
              </div>

              {selectedLead.docUrl && (
                <div>
                  <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Audit Report</div>
                  <a href={selectedLead.docUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                    <FileText size={14} />
                    View Google Doc
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {selectedLead.auditReport && (
                <div>
                  <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Report Preview</div>
                  <div className="p-3 rounded-lg overflow-y-auto" style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-muted)',
                    maxHeight: 200, whiteSpace: 'pre-wrap', lineHeight: 1.5
                  }}>
                    {selectedLead.auditReport}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Notes</div>
                <textarea
                  value={selectedLead.notes}
                  onChange={e => updateLead(selectedLead.id, { notes: e.target.value })}
                  className="input-field"
                  placeholder="Add notes..."
                  style={{ minHeight: 80, fontSize: 13 }}
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedLead.status}
                  onChange={e => updateLead(selectedLead.id, { status: e.target.value as LeadStatus })}
                  className="input-field flex-1"
                  style={{ fontSize: 12, padding: '7px 32px 7px 10px' }}
                >
                  {Object.entries(STATUS_STYLES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <button className="btn-danger" onClick={() => { deleteLead(selectedLead.id); setSelectedLead(null); }} style={{ padding: '7px 12px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold mb-4">Add Domain Manually</h3>
            <div>
              <label className="block mb-2 text-sm font-medium">Domain</label>
              <input value={newDomain} onChange={e => setNewDomain(e.target.value)} className="input-field" placeholder="example.com" />
            </div>
            <div className="flex gap-2 mt-6">
              <button className="btn-ghost flex-1" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={() => {
                if (newDomain) {
                  useStore.getState().addLead({
                    campaignId: 'manual', domain: newDomain, email: null,
                    niche: 'unknown', city: 'Unknown', country: 'Unknown',
                    spf: null, dmarc: null, https: null, mx: null,
                    status: 'pending', docUrl: null, emailSentAt: null, notes: 'Manually added',
                  });
                  setNewDomain('');
                  setShowAddModal(false);
                }
              }}>Add Lead</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
