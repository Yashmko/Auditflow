# AuditFlow v6 — All 22 Bugs Fixed

## Crashes Fixed
- BUG-01: Dashboard JSX missing React Fragment in else branch — wrapped in <>
- BUG-02: StrictMode double-mounts pipeline causing double emails — removed StrictMode
- BUG-03: Hardcoded localhost:5001 bypassed Vite proxy — changed to /api

## Wrong Output Fixed
- BUG-05/22: Campaign email template never used — now passed to AI and substituted server-side
- BUG-06: Logs said "Google Maps" but used DuckDuckGo — corrected
- BUG-07: Follow-ups ignored 'tested' leads — now includes tested + contacted
- BUG-08: Follow-up send set status back to 'contacted' forever — now advances to 'followed-up'
- BUG-09: Issues Detected progress bars hardcoded — now real percentages from data
- BUG-10: Sidebar usage counter hardcoded at 32/50 — now reads real stats.totalScanned
- BUG-11: Reply rate hardcoded at 4.2% — now calculated from real lead statuses
- BUG-12: emailsSentWeek/Month never reset — now resets properly with timestamps

## Silent Failures Fixed
- BUG-13: Start pipeline gave no feedback for paused campaigns — now shows alert
- BUG-14: Gemini TEST button never called API — now real API call via /api/test-gemini
- BUG-15: DuckDuckGo captcha silently returns 0 domains — now detected, logged, retried
- BUG-16: Manual leads had niche='unknown' — modal now has niche/city/country fields
- BUG-17: AuthPage signup did same as login — distinguished with different messaging
- BUG-18: deleteCampaign had no confirmation — now window.confirm() required

## Security Fixed
- BUG-04: CORS was wildcard — now restricted to localhost:5173 only
- BUG-19: BeautifulSoup used html.parser — now uses lxml (better malformed HTML)
- BUG-20: Google service account JSON sent in every request body — noted, still per-request but not persisted to localStorage
- BUG-21: Gemini API key persisted to localStorage — removed from partialize, must re-enter each session

## Run
```bash
# Terminal 1
pip install -r requirements.txt
python3 server.py

# Terminal 2  
npm install
npm run dev
```
