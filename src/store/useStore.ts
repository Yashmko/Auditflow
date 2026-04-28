import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NICHES } from '../data/niches';

export type LeadStatus = 'pending' | 'scanning' | 'contacted' | 'tested' | 'replied' | 'closed' | 'failed' | 'skipped';
export type LogType = 'info' | 'success' | 'warning' | 'error' | 'ai' | 'dns';
export type PipelineStage = 'idle' | 'acquisition' | 'dns' | 'email-discovery' | 'ai-report' | 'doc-creation' | 'sending' | 'crm-update';

export interface Lead {
  id: string;
  campaignId: string;
  domain: string;
  email: string | null;
  niche: string;
  city: string;
  country: string;
  spf: boolean | null;
  dmarc: boolean | null;
  https: boolean | null;
  mx: boolean | null;
  status: LeadStatus;
  docUrl: string | null;
  emailSentAt: string | null;
  notes: string;
  createdAt: string;
  auditReport?: string;
  emailContent?: string;
}

export interface PipelineLog {
  id: string;
  campaignId: string;
  leadId?: string;
  message: string;
  type: LogType;
  createdAt: string;
  stage?: PipelineStage;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  niches: string[];
  countries: string[];
  status: 'active' | 'paused' | 'completed';
  dailyLimit: number;
  emailTemplate: string;
  reportTone: 'professional' | 'alarming' | 'friendly';
  schedule: 'once' | 'daily' | 'weekly';
  sentToday: number;
  totalSent: number;
  lastResetDate?: string;
  createdAt: string;
}

export interface UserSettings {
  geminiApiKey: string;
  googleServiceAccount: string;
  gmailAddress: string;
  gmailAppPassword: string;
  activeNiches: string[];
  activeCountries: string[];
  blacklistedDomains: string[];
  dailyLimit: number;
  senderName: string;
  emailSignature: string;
  replyToAddress: string;
  testMode: boolean;
  appendUnsubscribe: boolean;
  plan: 'free' | 'pro' | 'agency';
}

export interface Stats {
  totalScanned: number;
  emailsSentToday: number;
  emailsSentWeek: number;
  emailsSentMonth: number;
  spfMissing: number;
  dmarcMissing: number;
  bothMissing: number;
  replyRate: number;
  lastWeekReset?: string;
  lastMonthReset?: string;
  estimatedRevenue: number;
  dealValue: number;
}

export interface RevenueData {
  month: string;
  projected: number;
  actual: number;
}

const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

const generateMockLeads = (): Lead[] => {
  const domains = [
    { domain: 'brightonsmiles.com.au', niche: 'dental clinic', city: 'Melbourne', country: 'Australia' },
    { domain: 'sydneylaw.com.au', niche: 'law firm', city: 'Sydney', country: 'Australia' },
    { domain: 'manchesterplumber.co.uk', niche: 'plumber', city: 'Manchester', country: 'United Kingdom' },
    { domain: 'torontophysio.ca', niche: 'physiotherapy', city: 'Toronto', country: 'Canada' },
    { domain: 'nycaccounting.com', niche: 'accounting firm', city: 'New York', country: 'United States' },
    { domain: 'perthrealty.com.au', niche: 'real estate agent', city: 'Perth', country: 'Australia' },
    { domain: 'dublinvet.ie', niche: 'veterinary clinic', city: 'Dublin', country: 'Ireland' },
    { domain: 'brisbaneyoga.com.au', niche: 'yoga studio', city: 'Brisbane', country: 'Australia' },
    { domain: 'londonbarber.co.uk', niche: 'barber', city: 'London', country: 'United Kingdom' },
    { domain: 'melbournecafe.com.au', niche: 'cafe', city: 'Melbourne', country: 'Australia' },
    { domain: 'calgaryelectric.ca', niche: 'electrician', city: 'Calgary', country: 'Canada' },
    { domain: 'aucklandgym.co.nz', niche: 'gym', city: 'Auckland', country: 'New Zealand' },
    { domain: 'capetownrestaurant.co.za', niche: 'restaurant', city: 'Cape Town', country: 'South Africa' },
    { domain: 'singaporeit.com.sg', niche: 'IT support', city: 'Singapore', country: 'Singapore' },
    { domain: 'dubaimarketing.ae', niche: 'marketing agency', city: 'Dubai', country: 'UAE' },
  ];
  const statuses: LeadStatus[] = ['pending', 'scanning', 'contacted', 'replied', 'closed', 'failed', 'skipped'];
  return domains.map((d, i) => ({
    id: generateId(),
    campaignId: 'campaign-1',
    domain: d.domain,
    email: `info@${d.domain}`,
    niche: d.niche,
    city: d.city,
    country: d.country,
    spf: Math.random() > 0.4,
    dmarc: Math.random() > 0.5,
    https: Math.random() > 0.2,
    mx: Math.random() > 0.1,
    status: statuses[i % statuses.length],
    docUrl: i % 3 === 0 ? `https://docs.google.com/document/d/${generateId()}/edit` : null,
    emailSentAt: i < 8 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    notes: '',
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    auditReport: i % 3 === 0 ? `# Security Audit Report: ${d.domain}\n\n## Executive Summary\n\nCritical email security vulnerabilities detected on ${d.domain}.\n\n## Findings\n\n### SPF Record: MISSING ⚠️\nNo SPF record found. Anyone can send emails pretending to be from your domain.\n\n### DMARC Record: MISSING ⚠️\nNo DMARC policy configured. Zero protection against email fraud.\n\n## Risk Level: HIGH\n\nWithout SPF and DMARC, your clients are vulnerable to phishing attacks sent in your name.\n\n## Recommended Actions\n\n1. Implement SPF record immediately\n2. Configure DMARC policy\n3. Enable email authentication monitoring` : undefined,
  }));
};

const generateMockRevenueData = (): RevenueData[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  return months.map((month, i) => ({
    month,
    projected: 1200 + i * 300 + Math.random() * 200,
    actual: i <= currentMonth ? 800 + i * 250 + Math.random() * 400 : 0,
  }));
};

const DEFAULT_EMAIL_TEMPLATE = `Hi there,

I ran a quick security scan on {domain} and found something you should know about.

Your email infrastructure is missing critical security records (SPF/DMARC), which means anyone can send emails pretending to be from your business. This puts your clients at risk and could explain why your emails are landing in spam.

I've put together a full audit report here: {doc_link}

Happy to help you get this fixed — it usually takes about 20 minutes.

{sender_name}`;

const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: 'campaign-1',
    userId: 'user-1',
    name: 'AU Dentists & Law Firms — May 2025',
    niches: ['dental clinic', 'law firm', 'accounting firm'],
    countries: ['Australia', 'New Zealand'],
    status: 'active',
    dailyLimit: 25,
    emailTemplate: DEFAULT_EMAIL_TEMPLATE,
    reportTone: 'professional',
    schedule: 'daily',
    sentToday: 8,
    totalSent: 127,
    lastResetDate: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'campaign-2',
    userId: 'user-1',
    name: 'UK Tradespeople — June 2025',
    niches: ['plumber', 'electrician', 'HVAC technician', 'roofer'],
    countries: ['United Kingdom', 'Ireland'],
    status: 'paused',
    dailyLimit: 30,
    emailTemplate: DEFAULT_EMAIL_TEMPLATE,
    reportTone: 'alarming',
    schedule: 'daily',
    sentToday: 0,
    totalSent: 43,
    lastResetDate: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

interface AppState {
  isAuthenticated: boolean;
  user: { email: string; name: string; avatar?: string } | null;
  activePage: string;
  pipelineRunning: boolean;
  pipelineStage: PipelineStage;
  pipelineLogs: PipelineLog[];
  pipelineProgress: number;
  currentBatchTotal: number;
  currentBatchDone: number;
  activeCampaignId: string | null;
  leads: Lead[];
  campaigns: Campaign[];
  settings: UserSettings;
  stats: Stats;
  revenueData: RevenueData[];
  selectedLeadId: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setActivePage: (page: string) => void;
  startPipeline: (campaignId: string) => void;
  stopPipeline: () => void;
  addLog: (log: Omit<PipelineLog, 'id' | 'createdAt'>) => void;
  clearLogs: () => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => string;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'sentToday' | 'totalSent'>) => string;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  resetDailyCounters: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateStats: (updates: Partial<Stats>) => void;
  setSelectedLead: (id: string | null) => void;
  setPipelineStage: (stage: PipelineStage) => void;
  setPipelineProgress: (done: number, total: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      activePage: 'dashboard',
      pipelineRunning: false,
      pipelineStage: 'idle',
      pipelineLogs: [],
      pipelineProgress: 0,
      currentBatchTotal: 25,
      currentBatchDone: 0,
      activeCampaignId: null,
      leads: generateMockLeads(),
      campaigns: DEFAULT_CAMPAIGNS,
      settings: {
        geminiApiKey: '',
        googleServiceAccount: '',
        gmailAddress: '',
        gmailAppPassword: '',
        activeNiches: NICHES.slice(0, 20),
        activeCountries: ['Australia', 'United Kingdom', 'United States', 'Canada'],
        blacklistedDomains: [],
        dailyLimit: 25,
        senderName: '',
        emailSignature: '',
        replyToAddress: '',
        testMode: true,
        appendUnsubscribe: true,
        plan: 'free',
      },
      stats: {
        totalScanned: 847,
        emailsSentToday: 18,
        emailsSentWeek: 87,
        emailsSentMonth: 312,
        spfMissing: 523,
        dmarcMissing: 601,
        bothMissing: 398,
        replyRate: 4.2,
        estimatedRevenue: 18720,
        dealValue: 60,
      },
      revenueData: generateMockRevenueData(),
      selectedLeadId: null,

      login: async (email: string, _password: string) => {
        await new Promise(r => setTimeout(r, 800));
        set({
          isAuthenticated: true,
          user: { email, name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
        });
        return true;
      },

      logout: () => set({ isAuthenticated: false, user: null, activePage: 'dashboard', pipelineRunning: false, pipelineStage: 'idle', activeCampaignId: null }),

      setActivePage: (page) => set({ activePage: page }),

      startPipeline: (campaignId) => {
        const campaign = get().campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        if (campaign.status === 'paused' || campaign.status === 'completed') {
          get().addLog({ message: `Campaign "${campaign.name}" is ${campaign.status}. Activate it first.`, type: 'warning', campaignId });
          return;
        }
        set({ pipelineRunning: true, activeCampaignId: campaignId, pipelineStage: 'acquisition' });
      },

      stopPipeline: () => {
        const { activeCampaignId } = get();
        set({ pipelineRunning: false, pipelineStage: 'idle', activeCampaignId: null });
        get().addLog({ message: 'Pipeline stopped by user. Progress saved.', type: 'warning', campaignId: activeCampaignId || 'system' });
      },

      addLog: (log) => {
        const newLog: PipelineLog = { ...log, id: generateId(), createdAt: new Date().toISOString() };
        set(state => ({ pipelineLogs: [...state.pipelineLogs.slice(-300), newLog] }));
      },

      clearLogs: () => set({ pipelineLogs: [] }),

      addLead: (lead) => {
        const id = generateId();
        const newLead: Lead = { ...lead, id, createdAt: new Date().toISOString() };
        set(state => ({ leads: [...state.leads, newLead] }));
        return id;
      },

      updateLead: (id, updates) => {
        set(state => ({ leads: state.leads.map(l => l.id === id ? { ...l, ...updates } : l) }));
      },

      deleteLead: (id) => {
        set(state => ({ leads: state.leads.filter(l => l.id !== id) }));
      },

      addCampaign: (campaign) => {
        const id = generateId();
        const newCampaign: Campaign = { ...campaign, id, createdAt: new Date().toISOString(), sentToday: 0, totalSent: 0, lastResetDate: new Date().toISOString().split('T')[0] };
        set(state => ({ campaigns: [...state.campaigns, newCampaign] }));
        return id;
      },

      updateCampaign: (id, updates) => {
        set(state => ({ campaigns: state.campaigns.map(c => c.id === id ? { ...c, ...updates } : c) }));
      },

      deleteCampaign: (id) => {
        set(state => ({ campaigns: state.campaigns.filter(c => c.id !== id) }));
      },

      updateSettings: (settings) => {
        set(state => ({ settings: { ...state.settings, ...settings } }));
      },

      updateStats: (updates) => {
        set(state => ({ stats: { ...state.stats, ...updates } }));
      },

      setSelectedLead: (id) => set({ selectedLeadId: id }),
  resetDailyCounters: () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    set(state => ({
      campaigns: state.campaigns.map(c =>
        c.lastResetDate !== today
          ? { ...c, sentToday: 0, lastResetDate: today }
          : c
      ),
      stats: {
        ...state.stats,
        emailsSentToday: state.campaigns.some(c => c.lastResetDate !== today) ? 0 : state.stats.emailsSentToday,
        // Reset week counter if last reset was >7 days ago
        emailsSentWeek: (state.stats.lastWeekReset || '') < weekAgo ? 0 : state.stats.emailsSentWeek,
        emailsSentMonth: (state.stats.lastMonthReset || '') < monthAgo ? 0 : state.stats.emailsSentMonth,
        lastWeekReset: (state.stats.lastWeekReset || '') < weekAgo ? today : state.stats.lastWeekReset,
        lastMonthReset: (state.stats.lastMonthReset || '') < monthAgo ? today : state.stats.lastMonthReset,
      }
    }));
  },
      setPipelineStage: (stage) => set({ pipelineStage: stage }),
      setPipelineProgress: (done, total) => set({
        currentBatchDone: done,
        currentBatchTotal: total,
        pipelineProgress: total > 0 ? (done / total) * 100 : 0
      }),
    }),
    {
      name: 'auditflow-storage',
      // Don't persist transient pipeline state
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        activePage: state.activePage,
        leads: state.leads,
        campaigns: state.campaigns,
        // BUG-20/21: Strip sensitive keys from localStorage persistence.
        // Users must re-enter API keys each session. This prevents key theft via XSS or devtools.
        settings: {
          ...state.settings,
          geminiApiKey: '',
          googleServiceAccount: '',
          gmailAppPassword: '',
        },
        stats: state.stats,
        revenueData: state.revenueData,
      }),
    }
  )
);
