# Laser2Uni

> Find your transfer fit — built for IVC students.

A Tinder-style transfer school finder for students at Irvine Valley College (IVC), Irvine CA.

---

## What It Does

1. **Onboarding (4 steps)** — Student fills in name, major, GPA, IGETC status, IVC Honors enrollment, career goals, campus preferences, and priorities.
2. **Swipe** — Swipe right to like a school, left to pass, up to skip. Tinder-style card stack.
3. **AI Dashboard** — Claude API generates a personalized dashboard with:
   - **Schools tab** — Reach / 50-50 / Safety tiers with admission tips
   - **Requirements tab** — Course requirements, min GPA, IVC articulation notes
   - **Life Plan tab** — Career roadmap and timeline
4. **Live Outcomes** — Past IVC students can log acceptances; a real-time Supabase feed shows a toast notification during the demo.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Plain HTML / CSS / JS — zero frameworks, zero build tools |
| Fonts | Google Fonts: Syne (headings) + DM Sans (body) |
| Database | Supabase (JS client via CDN) |
| AI | Claude API — `claude-sonnet-4-6` |

---

## File Structure

```
laser2uni/
├── index.html          ← single-page app shell
├── css/
│   └── style.css       ← all styles (dark theme, design system)
├── js/
│   ├── schools.js      ← school data array (owned by data person)
│   ├── scoring.js      ← scoring + tiering algorithm
│   ├── ai.js           ← Claude API call + fallback
│   ├── supabase.js     ← Supabase client + DB helpers
│   └── ui.js           ← all UI logic, swipe engine, dashboard render
├── data/
│   └── schools.json    ← placeholder for future offline use
└── README.md
```

---

## Setup

### 1. Clone & Open
```bash
git clone https://github.com/<your-org>/laser2uni.git
cd laser2uni
# Open index.html in browser — no server needed for most features
```

### 2. Add Your API Keys

Open `js/ai.js` and set:
```js
const ANTHROPIC_API_KEY = 'sk-ant-...';
```

Open `js/supabase.js` and set:
```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

> **Never commit real keys.** Add them locally only. Consider a gitignored `config.js` for secrets.

### 3. Claude API & CORS

The Anthropic API blocks direct browser calls (CORS). For the hackathon demo pick one:

**Option A — Chrome with CORS disabled (easiest for demo day)**
```bash
open -na "Google Chrome" --args --disable-web-security --user-data-dir=/tmp/chrome-demo
```

**Option B — 10-line Node proxy**
```js
// proxy.js — run: node proxy.js
const http = require('http');
const https = require('https');
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const body = [];
  req.on('data', c => body.push(c));
  req.on('end', () => {
    const pr = https.request('https://api.anthropic.com' + req.url, {
      method: req.method, headers: { ...req.headers, host: 'api.anthropic.com' }
    }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    pr.write(Buffer.concat(body)); pr.end();
  });
}).listen(4000, () => console.log('Proxy on :4000'));
```
Then set `const PROXY_URL = 'http://localhost:4000'` in `js/ai.js`.

**Option C — Fallback only**
Leave `ANTHROPIC_API_KEY` empty — `buildFallback()` returns polished static content and the demo never crashes.

### 4. Supabase Tables

Run this SQL in your Supabase SQL editor:

```sql
-- Students
create table students (
  id uuid default gen_random_uuid() primary key,
  name text, major text, gpa numeric,
  igetc text, honors text, career text,
  industries text[], grad text, size text,
  regions text[], priorities text[], extra text,
  created_at timestamptz default now()
);

-- Outcomes (IVC alum acceptances)
create table outcomes (
  id uuid default gen_random_uuid() primary key,
  student_name text, student_major text, student_gpa numeric,
  school_id text, school_name text,
  accepted boolean default true,
  year int,
  created_at timestamptz default now()
);

-- Enable realtime
alter publication supabase_realtime add table outcomes;

-- Seed demo outcome
insert into outcomes (student_name, student_major, student_gpa, school_id, school_name, accepted, year)
values ('Alex Chen', 'Computer Science', 3.6, 'uci', 'UC Irvine', true, 2024);
```

---

## Team File Ownership

| File | Owner |
|---|---|
| `css/style.css` | UI person |
| `js/ui.js` | UI person |
| `js/schools.js` | Data person |
| `js/scoring.js` | Algorithm person |
| `js/ai.js` | AI person |
| `js/supabase.js` | Backend person |

---

## Design System

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#0a0a0f` | Page background |
| `--surface` | `#13131a` | Cards |
| `--surface2` | `#1c1c26` | Inputs, pills |
| `--border` | `#2a2a38` | Borders |
| `--accent` | `#7c6df0` | Purple — primary CTA |
| `--accent2` | `#f05c7c` | Pink — pass / private schools |
| `--accent3` | `#3de8a0` | Green — like / safety tier |
| `--gold` | `#ffb432` | Good Fit label |
| `--text` | `#f0f0f8` | Body text |
| `--muted` | `#6b6b88` | Secondary text |

School banner colors: UC = purple, CSU = green, Private = pink, OOS = amber.

---

## License

MIT — hack freely.
