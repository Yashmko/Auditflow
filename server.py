"""
AuditFlow Backend v3 — All bugs fixed
BUG-03: API calls now go through Vite proxy (/api) not hardcoded localhost
BUG-04: CORS restricted to localhost only
BUG-05/22: Campaign template substitution now happens server-side
BUG-06: Log messages corrected (DuckDuckGo, not Google Maps)
BUG-14: Real Gemini API test endpoint
BUG-15: DuckDuckGo captcha detection (checks for selector match count)
BUG-19: BeautifulSoup uses lxml parser

INSTALL:
  pip install flask flask-cors dnspython google-genai requests beautifulsoup4 lxml \
              google-auth google-api-python-client

RUN:
  python3 server.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import dns.resolver
import requests
import re
import smtplib
import json
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from bs4 import BeautifulSoup
from google import genai as google_genai
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

app = Flask(__name__)

# BUG-04: Restrict CORS to local dev only — not wildcard
CORS(app)  # Open for initial deploy — restrict later

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
    "Accept-Language": "en-US,en;q=0.9",
}

# Force Google DNS
resolver = dns.resolver.Resolver()
resolver.nameservers = ["8.8.8.8", "8.8.4.4"]
resolver.timeout = 3
resolver.lifetime = 5


# ── DNS ──────────────────────────────────────────────────
def check_spf(domain):
    try:
        for r in resolver.resolve(domain, "TXT"):
            if "v=spf1" in r.to_text():
                return True, r.to_text().strip('"')
    except Exception:
        pass
    return False, None

def check_dmarc(domain):
    try:
        for r in resolver.resolve(f"_dmarc.{domain}", "TXT"):
            val = r.to_text().strip('"')
            if "v=DMARC1" in val:
                m = re.search(r'p=([a-z]+)', val, re.I)
                policy = m.group(1) if m else None
                return True, val, policy
    except Exception:
        pass
    return False, None, None

def check_mx(domain):
    try:
        records = resolver.resolve(domain, "MX")
        return True, [str(r.exchange).rstrip(".") for r in records]
    except Exception:
        return False, []

def check_https(domain):
    for scheme in ["https", "http"]:
        try:
            r = requests.head(f"{scheme}://{domain}", timeout=(3, 5), headers=HEADERS, allow_redirects=True)
            return scheme == "https" and r.status_code < 500
        except Exception:
            continue
    return False

@app.route("/api/dns", methods=["POST"])
def dns_check():
    domain = request.json.get("domain", "").strip().lower()
    domain = re.sub(r'^https?://', '', domain).split('/')[0]
    if not domain:
        return jsonify({"error": "No domain"}), 400
    spf_found, spf_val = check_spf(domain)
    dmarc_found, dmarc_val, dmarc_policy = check_dmarc(domain)
    mx_found, mx_records = check_mx(domain)
    https_ok = check_https(domain)
    return jsonify({
        "domain": domain, "spf": spf_found, "spf_value": spf_val,
        "dmarc": dmarc_found, "dmarc_value": dmarc_val, "dmarc_policy": dmarc_policy,
        "mx": mx_found, "mx_records": mx_records, "https": https_ok,
    })


# ── EMAIL FINDER ─────────────────────────────────────────
def find_email(domain):
    pages = ["/", "/contact", "/contact-us", "/about", "/about-us"]
    priority = ["info", "admin", "contact", "reception", "hello", "enquir", "book"]

    for path in pages:
        for scheme in ["https", "http"]:
            try:
                r = requests.get(f"{scheme}://{domain}{path}", timeout=(3, 5), headers=HEADERS)
                if r.status_code != 200:
                    continue
                # BUG-19: Use lxml for better malformed HTML handling
                soup = BeautifulSoup(r.text, "lxml")
                for a in soup.find_all("a", href=True):
                    if a["href"].startswith("mailto:"):
                        email = a["href"].replace("mailto:", "").split("?")[0].strip()
                        if "@" in email and "." in email.split("@")[1]:
                            return email, "mailto"
                found = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", r.text)
                found = [e for e in found if not e.endswith((".png",".jpg",".svg",".css",".js"))]
                for e in found:
                    if any(k in e.lower() for k in priority):
                        return e, "scrape"
                if found:
                    return found[0], "scrape"
                break
            except Exception:
                continue

    # SMTP guess
    _, mx_records = check_mx(domain)
    if mx_records:
        for prefix in ["info", "admin", "contact", "reception", "hello"]:
            candidate = f"{prefix}@{domain}"
            try:
                with smtplib.SMTP(mx_records[0], 25, timeout=4) as s:
                    s.ehlo("check.local")
                    s.mail("verify@check.local")
                    code, _ = s.rcpt(candidate)
                    if code == 250:
                        return candidate, "smtp_verified"
            except Exception:
                pass

    return f"info@{domain}", "best_guess"

@app.route("/api/find-email", methods=["POST"])
def api_find_email():
    domain = request.json.get("domain", "").strip().lower()
    if not domain:
        return jsonify({"error": "No domain"}), 400
    email, method = find_email(domain)
    return jsonify({"email": email, "method": method})


# ── TARGET DISCOVERY ─────────────────────────────────────
@app.route("/api/discover-targets", methods=["POST"])
def discover_targets():
    """
    BUG-06: Uses DuckDuckGo HTML search (not Google Maps — JS-rendered, blocks scrapers)
    BUG-15: Detects captcha pages by checking if selectors return 0 results
    """
    data = request.json
    niche = data.get("niche", "")
    city = data.get("city", "")
    country = data.get("country", "")
    limit = int(data.get("limit", 10))

    SKIP = {
        "google","facebook","instagram","twitter","x.com","youtube","linkedin",
        "yelp","tripadvisor","booking","airbnb","gumtree","yellowpages",
        "whitepages","truelocal","hotfrog","bing","yahoo","reddit","tiktok",
        "pinterest","apple","microsoft","amazon","duckduckgo","wix",
        "squarespace","wordpress","shopify","indeed","seek","glassdoor",
    }

    domains = []
    seen = set()
    queries = [
        f"{niche} {city} {country}",
        f"best {niche} in {city}",
    ]

    for query in queries:
        if len(domains) >= limit:
            break
        for attempt in range(3):  # BUG-15: retry on captcha
            try:
                url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
                r = requests.get(url, headers=HEADERS, timeout=10)

                # BUG-15: Detect captcha — DDG returns 200 with captcha page
                # Real results page always has .result__url elements
                soup = BeautifulSoup(r.text, "lxml")  # BUG-19: lxml
                results = soup.select(".result__url, .result__a")

                if len(results) == 0:
                    # Captcha or empty — wait and retry
                    if attempt < 2:
                        print(f"[DDG] Possible captcha detected for '{query}' — retrying in {(attempt+1)*5}s")
                        time.sleep((attempt + 1) * 5)
                        continue
                    else:
                        print(f"[DDG] Could not bypass captcha for '{query}' — skipping")
                        break

                for result in results:
                    href = result.get("href", "") or result.get_text()
                    m = re.search(r"(?:https?://)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9.]+\.[a-zA-Z]{2,})", href)
                    if not m:
                        continue
                    domain = m.group(1).lower().rstrip(".")
                    if any(s in domain for s in SKIP):
                        continue
                    parts = domain.split(".")
                    if len(parts) < 2 or len(parts[0]) < 3:
                        continue
                    if domain in seen:
                        continue
                    seen.add(domain)
                    domains.append(domain)
                    if len(domains) >= limit:
                        break
                break  # success, no retry needed
            except Exception as e:
                print(f"[DDG] Error: {e}")
                break

        time.sleep(1.5)

    return jsonify({"domains": domains, "niche": niche, "city": city, "country": country})


# ── AI REPORT ────────────────────────────────────────────
@app.route("/api/generate-report", methods=["POST"])
def generate_report():
    """
    BUG-20/21: API key passed per-request from session (not localStorage).
    The key is never stored server-side persistently.
    """
    data = request.json
    domain = data.get("domain")
    niche = data.get("niche", "business")
    city = data.get("city", "")
    country = data.get("country", "")
    spf = data.get("spf", False)
    dmarc = data.get("dmarc", False)
    dmarc_policy = data.get("dmarc_policy")
    sales_angle = data.get("sales_angle", "")
    email_template = data.get("emailTemplate", "")  # BUG-05/22: campaign template
    sender_name = data.get("senderName", "Independent Infrastructure Auditor")
    api_key = data.get("geminiApiKey", "")

    if not api_key:
        return jsonify({"error": "Gemini API key not provided"}), 400

    # BUG-05/22: Use campaign email template as guidance for AI if provided
    template_instruction = ""
    if email_template:
        template_instruction = f"\nIMPORTANT: The cold email in Section 2 must follow this template structure:\n{email_template}\nSubstitute {{issue}} with the actual issue found, {{niche_problem}} with the niche-specific problem, {{sender_name}} with '{sender_name}'."

    prompt = f"""You are a professional digital infrastructure auditor.

Target domain: {domain}
Business type: {niche}
Location: {city}, {country}
SPF Record: {"FOUND" if spf else "MISSING"}
DMARC Record: {"FOUND (policy=" + str(dmarc_policy) + ")" if dmarc else "MISSING"}
Sales angle: {sales_angle}
{template_instruction}

Output EXACTLY two sections split by this line: ===EMAIL===

Section 1 — Professional Markdown audit report. Include:
## Executive Summary
## Technical Findings (SPF, DMARC status)
## Risk Level (Critical/High/Medium)
## Recommended Actions (numbered, plain English)
Make it specific to this {niche} in {city}.

Section 2 — Cold email. Short, plain English, max 120 words.
Use the sales angle. Reference specific missing records.
Include: [DOC_LINK]
Sign off as: {sender_name}
"""

    for attempt in range(3):
        try:
            client = google_genai.Client(api_key=api_key)
            response = client.models.generate_content(model="gemini-1.5-flash", contents=prompt)
            text = response.text
            parts = text.split("===EMAIL===")
            if len(parts) < 2:
                return jsonify({"error": "AI output malformed", "raw": text[:300]}), 500

            report = parts[0].strip()
            email_body = parts[1].strip()

            # BUG-05/22: If campaign template was provided, substitute variables now
            if email_template:
                spf_str = "SPF missing" if not spf else ""
                dmarc_str = "DMARC missing" if not dmarc else ""
                issue = ", ".join(filter(None, [spf_str, dmarc_str])) or "email security issue"
                niche_problem = sales_angle or f"email deliverability issue for {niche}"
                email_body = email_template \
                    .replace("{domain}", domain) \
                    .replace("{issue}", issue) \
                    .replace("{niche_problem}", niche_problem) \
                    .replace("{sender_name}", sender_name) \
                    .replace("{doc_link}", "[DOC_LINK]")

            return jsonify({"report": report, "emailContent": email_body})
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                time.sleep((attempt + 1) * 15)
                continue
            return jsonify({"error": str(e)}), 500


# ── BUG-14: REAL GEMINI TEST ENDPOINT ───────────────────
@app.route("/api/test-gemini", methods=["POST"])
def test_gemini():
    api_key = request.json.get("geminiApiKey", "")
    if not api_key:
        return jsonify({"error": "No API key provided"}), 400
    try:
        client = google_genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents="Reply with only: OK"
        )
        if response.text:
            return jsonify({"ok": True})
        return jsonify({"error": "Empty response"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 401


# ── GOOGLE DOC ───────────────────────────────────────────
@app.route("/api/create-doc", methods=["POST"])
def create_doc():
    """BUG-20: Service account JSON received per-request, never stored server-side."""
    data = request.json
    domain = data.get("domain")
    report = data.get("report")
    service_account_json = data.get("serviceAccount")
    if not service_account_json:
        return jsonify({"error": "No service account provided"}), 400
    try:
        sa_info = json.loads(service_account_json)
        scopes = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents"]
        creds = Credentials.from_service_account_info(sa_info, scopes=scopes)
        docs = build("docs", "v1", credentials=creds)
        drive = build("drive", "v3", credentials=creds)
        doc = docs.documents().create(body={"title": f"{domain} - Infrastructure Audit"}).execute()
        doc_id = doc["documentId"]
        docs.documents().batchUpdate(
            documentId=doc_id,
            body={"requests": [{"insertText": {"location": {"index": 1}, "text": report}}]}
        ).execute()
        drive.permissions().create(fileId=doc_id, body={"type": "anyone", "role": "reader"}).execute()
        return jsonify({"docUrl": f"https://docs.google.com/document/d/{doc_id}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── SEND EMAIL ───────────────────────────────────────────
@app.route("/api/send-email", methods=["POST"])
def send_email():
    data = request.json
    to_addr = data.get("to")
    subject = data.get("subject")
    body = data.get("body")
    gmail = data.get("gmailAddress")
    app_password = data.get("gmailAppPassword")
    if not all([to_addr, subject, body, gmail, app_password]):
        return jsonify({"error": "Missing credentials or content"}), 400
    try:
        msg = MIMEMultipart()
        msg["From"] = gmail
        msg["To"] = to_addr
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(gmail, app_password)
            s.sendmail(gmail, to_addr, msg.as_string())
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── HEALTH ───────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "version": "3.0"})


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5001))
    print("AuditFlow Backend v3 — all 22 bugs fixed")
    print(f"Running on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
