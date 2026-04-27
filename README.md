# AuditFlow v3.0

Automated email security auditing + cold outreach pipeline for selling DNS fix services to local businesses.

## Setup (5 minutes)

### Prerequisites
- Python 3.8+
- Node.js 18+

### Run

```bash
./start.sh
```

That's it. Opens at http://localhost:5173

The app needs both servers running. The frontend talks to the backend at `localhost:5001` via the Vite proxy.

---

## What you need to configure (Settings page)

| Setting | What it is | Where to get it |
|---|---|---|
| **Gemini API key** | AI that writes the audit reports | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — free |
| **Gmail address** | The email you send from | Your Gmail |
| **Gmail App Password** | Not your main password — a special one | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — enable 2FA first |
| **Google Service Account JSON** | Creates Google Docs automatically | GCP Console → IAM → Service Accounts → Create → Download JSON |

Leave **Test Mode ON** until you've tested with your own domains. Test Mode runs the whole pipeline but never sends emails.

---

## How the pipeline works

1. **Acquisition** — DuckDuckGo search finds real local businesses in your niche+city
2. **DNS Recon** — Checks SPF, DMARC, HTTPS, MX on Google's DNS (8.8.8.8)
3. **Email Discovery** — Scrapes contact pages for mailto links, falls back to best-guess
4. **AI Report** — Gemini writes a personalised audit report + cold email
5. **Google Doc** — Creates a shared doc with the audit findings
6. **Send** — Sends cold email via Gmail SMTP with doc link
7. **CRM** — Updates lead status, logs it

---

## Known limits

- **Domain discovery**: Uses DuckDuckGo HTML search. Works well for most niches. For higher volume, add a Google Places API key (unlimited with billing enabled).
- **Email verification**: Scrapes contact pages. If no mailto link found, uses `info@domain` as best guess. SMTP port 25 verification is blocked by all ISPs so is not used.
- **Daily limits**: `sentToday` resets automatically at midnight based on your local clock.
- **Google Docs**: Requires a service account. If you skip this, the pipeline still works but emails won't have a doc link.

---

## Stack

- React 18 + TypeScript + Vite 5
- Tailwind CSS v4
- Zustand (persisted to localStorage)
- Flask + Python backend
- dnspython, BeautifulSoup4, google-genai
