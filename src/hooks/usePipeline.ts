/// <reference types="vite/client" />
import { useEffect, useRef, useCallback } from 'react';
import { useStore, PipelineStage } from '../store/useStore';
import { NICHE_ANGLES } from '../data/niches';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
const API = ((import.meta as any).env?.VITE_API_URL as string) || '/api'; // BUG-03 fixed: use Vite proxy, not hardcoded localhost


async function checkBackend(): Promise<boolean> {
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

const CITY_MAP: Record<string, string[]> = {
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle'],
  'New Zealand': ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Bristol', 'Edinburgh'],
  'Canada': ['Toronto', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Montreal'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Diego', 'Dallas', 'Seattle'],
  'Ireland': ['Dublin', 'Cork', 'Limerick', 'Galway'],
  'South Africa': ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'],
  'Singapore': ['Singapore'],
  'UAE': ['Dubai', 'Abu Dhabi'],
};

// ── Real API calls ────────────────────────────────────────
async function realDNSCheck(domain: string) {
  const r = await fetch(`${API}/dns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });
  if (!r.ok) throw new Error(`DNS check failed: ${r.status}`);
  return r.json();
}

async function realFindEmail(domain: string) {
  const r = await fetch(`${API}/find-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });
  if (!r.ok) throw new Error(`Email finder failed: ${r.status}`);
  return r.json();
}

async function realDiscoverTargets(niche: string, city: string, country: string) {
  const r = await fetch(`${API}/discover-targets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ niche, city, country, limit: 10 }),
  });
  if (!r.ok) throw new Error(`Target discovery failed: ${r.status}`);
  return r.json();
}

async function realGenerateReport(params: {
  domain: string; niche: string; city: string; country: string;
  spf: boolean; dmarc: boolean; dmarc_policy?: string;
  sales_angle: string; geminiApiKey: string;
}) {
  const r = await fetch(`${API}/generate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error || 'AI report failed');
  }
  return r.json();
}

async function realCreateDoc(domain: string, report: string, serviceAccount: string) {
  const r = await fetch(`${API}/create-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, report, serviceAccount }),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error || 'Doc creation failed');
  }
  return r.json();
}

async function realSendEmail(params: {
  to: string; subject: string; body: string;
  gmailAddress: string; gmailAppPassword: string;
  senderName?: string; replyToAddress?: string;
  emailSignature?: string; appendUnsubscribe?: boolean;
}) {
  const r = await fetch(`${API}/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error || 'Email send failed');
  }
  return r.json();
}

// ── Pipeline hook ─────────────────────────────────────────
export function usePipeline() {
  const store = useStore();
  const runningRef = useRef(false);
  const abortRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' | 'ai' | 'dns', stage?: PipelineStage) => {
    const campaignId = useStore.getState().activeCampaignId || 'system';
    useStore.getState().addLog({ message, type, campaignId, stage });
  }, []);

  const runPipelineCycle = useCallback(async () => {
    if (runningRef.current) return;
    if (!useStore.getState().pipelineRunning) return;
    runningRef.current = true;
    abortRef.current = false;

    // Fix: reset daily counters if it's a new day
    useStore.getState().resetDailyCounters();

    // Fix: verify backend is reachable before doing anything
    const backendOk = await checkBackend();
    if (!backendOk) {
      addLog('❌ Backend not running. Open a terminal and run: python3 server.py', 'error', 'acquisition');
      addLog('   Then click Start again.', 'error', 'acquisition');
      useStore.getState().stopPipeline();
      runningRef.current = false;
      return;
    }

    const state = useStore.getState();
    const settings = state.settings;
    const campaign = state.campaigns.find(c => c.id === state.activeCampaignId);
    if (!campaign) { runningRef.current = false; return; }

    const niches = campaign.niches.length > 0 ? campaign.niches : settings.activeNiches.slice(0, 3);
    const countries = campaign.countries.length > 0 ? campaign.countries : settings.activeCountries.slice(0, 2);

    const niche = niches[Math.floor(Math.random() * niches.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    const citiesForCountry = CITY_MAP[country] || ['Capital City'];
    const city = citiesForCountry[Math.floor(Math.random() * citiesForCountry.length)];

    const freshCampaign = useStore.getState().campaigns.find(c => c.id === campaign.id);
    const sentToday = freshCampaign?.sentToday ?? 0;
    const batchSize = Math.min(campaign.dailyLimit - sentToday, 5);

    if (batchSize <= 0) {
      addLog(`Daily limit reached for "${campaign.name}". Resuming tomorrow.`, 'warning');
      useStore.getState().stopPipeline();
      runningRef.current = false;
      return;
    }

    // ── STAGE 1: Real target discovery ───────────────────
    useStore.getState().setPipelineStage('acquisition');
    addLog(`▶ New batch: ${niche} in ${city}, ${country}`, 'info', 'acquisition');
    if (abortRef.current) { runningRef.current = false; return; }

    addLog(`🔍 Searching DuckDuckGo for "${niche} in ${city}, ${country}"...`, 'info', 'acquisition');
    let domains: string[] = [];
    try {
      const result = await realDiscoverTargets(niche, city, country);
      domains = result.domains || [];
      addLog(`✅ Found ${domains.length} real domains from DuckDuckGo search`, 'success', 'acquisition');
    } catch (e) {
      addLog(`⚠️ Discovery error: ${e}. Check backend is running.`, 'error', 'acquisition');
      runningRef.current = false;
      return;
    }

    if (domains.length === 0) {
      addLog('No domains found for this niche+city combo. Trying next cycle.', 'warning');
      runningRef.current = false;
      return;
    }

    // filter blacklisted
    const blacklist = new Set(settings.blacklistedDomains || []);
    // processedDomains grows during the loop so we don't double-process within a batch
    const processedDomains = new Set(state.leads.map(l => l.domain));
    const targets = domains
      .filter(d => !blacklist.has(d) && !processedDomains.has(d))
      .slice(0, batchSize);

    if (targets.length === 0) {
      addLog('All discovered domains already processed. Moving to next batch.', 'info');
      runningRef.current = false;
      return;
    }

    useStore.getState().setPipelineProgress(0, targets.length);
    addLog(`📋 Processing ${targets.length} new targets`, 'success', 'acquisition');

    for (let i = 0; i < targets.length; i++) {
      if (abortRef.current || !useStore.getState().pipelineRunning) break;

      const domain = targets[i];
      processedDomains.add(domain); // prevent re-processing within same batch
      const freshSettings = useStore.getState().settings;
      useStore.getState().setPipelineProgress(i, targets.length);

      addLog(``, 'info');
      addLog(`━━━ [${i + 1}/${targets.length}] ${domain}`, 'info', 'dns');

      // ── STAGE 2: Real DNS ─────────────────────────────
      useStore.getState().setPipelineStage('dns');
      addLog(`🔷 DNS recon via 8.8.8.8...`, 'dns', 'dns');
      if (abortRef.current) break;

      let dnsResult: any;
      try {
        dnsResult = await realDNSCheck(domain);
        if (dnsResult.spf) addLog(`  SPF: ✅ ${dnsResult.spf_value?.substring(0, 50) || 'found'}`, 'dns', 'dns');
        else addLog(`  SPF: ⚠️  MISSING — domain can be spoofed`, 'warning', 'dns');
        if (dnsResult.dmarc) addLog(`  DMARC: ✅ policy=${dnsResult.dmarc_policy || 'found'}`, 'dns', 'dns');
        else addLog(`  DMARC: ⚠️  MISSING — no fraud protection`, 'warning', 'dns');
        addLog(`  HTTPS: ${dnsResult.https ? '✅' : '❌'} | MX: ${dnsResult.mx ? '✅' : '❌'}`, 'dns', 'dns');
      } catch (e) {
        addLog(`  ❌ DNS check failed: ${e}`, 'error', 'dns');
        continue;
      }

      if (dnsResult.spf && dnsResult.dmarc) {
        addLog(`  ⏭  No issues found — skipping (nothing to pitch)`, 'info');
        useStore.getState().addLead({
          campaignId: campaign.id, domain, email: null, niche, city, country,
          spf: dnsResult.spf, dmarc: dnsResult.dmarc, https: dnsResult.https, mx: dnsResult.mx,
          status: 'skipped', docUrl: null, emailSentAt: null, notes: '',
        });
        continue;
      }

      const leadId = useStore.getState().addLead({
        campaignId: campaign.id, domain, email: null, niche, city, country,
        spf: dnsResult.spf, dmarc: dnsResult.dmarc, https: dnsResult.https, mx: dnsResult.mx,
        status: 'scanning', docUrl: null, emailSentAt: null, notes: '',
      });

      // ── STAGE 3: Real email finder ────────────────────
      if (abortRef.current) break;
      useStore.getState().setPipelineStage('email-discovery');
      addLog(`📧 Finding contact email (scraping + SMTP verify)...`, 'info', 'email-discovery');

      let email = `info@${domain}`;
      try {
        const emailResult = await realFindEmail(domain);
        email = emailResult.email;
        const method = emailResult.method;
        if (method === 'mailto') addLog(`  ✅ Found via mailto link: ${email}`, 'success', 'email-discovery');
        else if (method === 'scrape') addLog(`  ✅ Found via page scrape: ${email}`, 'success', 'email-discovery');
        else if (method === 'smtp_verified') addLog(`  ✅ SMTP verified: ${email}`, 'success', 'email-discovery');
        else addLog(`  📨 Best-guess fallback: ${email}`, 'info', 'email-discovery');
      } catch (e) {
        addLog(`  ⚠️ Email finder error — using fallback: ${email}`, 'warning', 'email-discovery');
      }
      useStore.getState().updateLead(leadId, { email });

      // ── STAGE 4: Real AI report ───────────────────────
      if (abortRef.current) break;
      useStore.getState().setPipelineStage('ai-report');
      addLog(`🤖 Calling Gemini 1.5 Flash API...`, 'ai', 'ai-report');
      const angle = (NICHE_ANGLES as Record<string, string>)[niche] || 'Email security vulnerabilities detected';
      addLog(`  ↳ Angle: "${angle.substring(0, 60)}..."`, 'ai', 'ai-report');

      let report = '';
      let emailContent = '';

      if (!freshSettings.geminiApiKey) {
        addLog(`  ❌ Gemini API key not set — go to Settings`, 'error', 'ai-report');
        useStore.getState().updateLead(leadId, { status: 'failed' });
        continue;
      }

      try {
        const freshCampaignForTemplate = useStore.getState().campaigns.find(c => c.id === campaign.id);
        const aiResult = await realGenerateReport({
          domain, niche, city, country,
          spf: dnsResult.spf, dmarc: dnsResult.dmarc,
          dmarc_policy: dnsResult.dmarc_policy,
          sales_angle: angle,
          geminiApiKey: freshSettings.geminiApiKey,
          senderName: freshSettings.senderName || 'Independent Infrastructure Auditor',
        });
        report = aiResult.report;
        emailContent = aiResult.emailContent;
        addLog(`  ✅ AI report generated (${report.length} chars)`, 'ai', 'ai-report');
        useStore.getState().updateLead(leadId, { auditReport: report, emailContent });
      } catch (e) {
        addLog(`  ❌ AI error: ${e}`, 'error', 'ai-report');
        useStore.getState().updateLead(leadId, { status: 'failed' });
        continue;
      }

      // ── STAGE 5: Real Google Doc ──────────────────────
      if (abortRef.current) break;
      useStore.getState().setPipelineStage('doc-creation');
      addLog(`📄 Creating Google Doc...`, 'info', 'doc-creation');

      let docUrl = '';
      if (!freshSettings.googleServiceAccount) {
        addLog(`  ⚠️  No Google service account — skipping doc creation`, 'warning', 'doc-creation');
        docUrl = '';
      } else {
        try {
          const docResult = await realCreateDoc(domain, report, freshSettings.googleServiceAccount);
          docUrl = docResult.docUrl;
          addLog(`  ✅ Doc created: ${docUrl}`, 'success', 'doc-creation');
          useStore.getState().updateLead(leadId, { docUrl });
        } catch (e) {
          addLog(`  ❌ Doc creation failed: ${e}`, 'error', 'doc-creation');
          docUrl = '';
        }
      }

      // ── STAGE 6: Real email send ──────────────────────
      if (abortRef.current) break;
      useStore.getState().setPipelineStage('sending');
      const finalBody = emailContent.replace('[DOC_LINK]', docUrl || '[Report available on request]');
      const subject = `Infrastructure Issue Found on ${domain}`;

      if (freshSettings.testMode) {
        addLog(`🧪 TEST MODE — would send to ${email}`, 'warning', 'sending');
        addLog(`  Subject: "${subject}"`, 'warning', 'sending');
        if (docUrl) addLog(`  Doc: ${docUrl}`, 'warning', 'sending');
      } else {
        if (!freshSettings.gmailAddress || !freshSettings.gmailAppPassword) {
          addLog(`  ❌ Gmail credentials not configured — go to Settings`, 'error', 'sending');
          useStore.getState().updateLead(leadId, { status: 'failed' });
          continue;
        }
        addLog(`📤 Sending SMTP to ${email}...`, 'info', 'sending');
        try {
          await realSendEmail({
            to: email, subject, body: finalBody,
            gmailAddress: freshSettings.gmailAddress,
            gmailAppPassword: freshSettings.gmailAppPassword,
            senderName: freshSettings.senderName,
            replyToAddress: freshSettings.replyToAddress,
            emailSignature: freshSettings.emailSignature,
            appendUnsubscribe: freshSettings.appendUnsubscribe,
          });
          addLog(`  ✅ Email sent successfully`, 'success', 'sending');
        } catch (e) {
          addLog(`  ❌ Send failed: ${e}`, 'error', 'sending');
          useStore.getState().updateLead(leadId, { status: 'failed' });
          continue;
        }
      }

      // ── STAGE 7: CRM update ───────────────────────────
      useStore.getState().setPipelineStage('crm-update');
      useStore.getState().updateLead(leadId, {
        status: freshSettings.testMode ? 'tested' : 'contacted',
        emailSentAt: new Date().toISOString()
      });

      const latestCampaign = useStore.getState().campaigns.find(c => c.id === campaign.id);
      const latestStats = useStore.getState().stats;
      useStore.getState().updateCampaign(campaign.id, {
        sentToday: (latestCampaign?.sentToday ?? 0) + 1,
        totalSent: (latestCampaign?.totalSent ?? 0) + 1,
      });
      useStore.getState().updateStats({
        totalScanned: latestStats.totalScanned + 1,
        emailsSentToday: latestStats.emailsSentToday + 1,
        emailsSentWeek: latestStats.emailsSentWeek + 1,
        emailsSentMonth: latestStats.emailsSentMonth + 1,
        spfMissing: !dnsResult.spf ? latestStats.spfMissing + 1 : latestStats.spfMissing,
        dmarcMissing: !dnsResult.dmarc ? latestStats.dmarcMissing + 1 : latestStats.dmarcMissing,
        bothMissing: (!dnsResult.spf && !dnsResult.dmarc) ? latestStats.bothMissing + 1 : latestStats.bothMissing,
        estimatedRevenue: latestStats.estimatedRevenue + latestStats.dealValue,
      });
      addLog(`✅ ${domain} → contacted`, 'success', 'crm-update');

      // 3s between targets to respect rate limits
      await sleep(3000);
    }

    if (!abortRef.current) {
      useStore.getState().setPipelineProgress(targets.length, targets.length);
      addLog(``, 'info');
      addLog(`✅ Batch done. Next batch starting soon...`, 'success');
    }

    runningRef.current = false;
  }, [addLog]);

  useEffect(() => {
    if (store.pipelineRunning) {
      abortRef.current = false;
      runPipelineCycle();
      intervalRef.current = setInterval(() => {
        if (!runningRef.current && useStore.getState().pipelineRunning) {
          runPipelineCycle();
        }
      }, 2000);
    } else {
      abortRef.current = true;
      runningRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [store.pipelineRunning, runPipelineCycle]);

  return {
    isRunning: store.pipelineRunning,
    stage: store.pipelineStage,
    logs: store.pipelineLogs,
    progress: store.pipelineProgress,
    batchDone: store.currentBatchDone,
    batchTotal: store.currentBatchTotal,
  };
}
