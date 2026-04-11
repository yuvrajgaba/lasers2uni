# Laser2Uni

> Find your transfer fit — built for IVC students.

A Tinder-style transfer school finder for students at Irvine Valley College (IVC), Irvine CA.

---

## What It Does

1. **Onboarding (4 steps)** — Student fills in name, major, GPA, IGETC status, IVC Honors enrollment, career goals, campus preferences, and priorities.
2. **Swipe** — Swipe right to like a school, left to pass, up to skip. Tinder-style card stack.
3. **AI Dashboard** — Ollama generates a personalized dashboard with:
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
| AI | Ollama local model — default `llama3.1` |

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
│   ├── ai.js           ← Ollama call + fallback
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

### 2. Configure Ollama And Supabase

Open `js/ai.js` and set:
```js
const OLLAMA_ENABLED = true;
const OLLAMA_URL = 'http://localhost:11434';
const AI_MODEL = 'llama3.1';
```

Open `js/supabase.js` and set:
```js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...';
```

If you want to demo without local AI, set:
```js
const OLLAMA_ENABLED = false;
```

That forces the polished fallback content so the dashboard never breaks.

### 3. Ollama Setup

Install and start Ollama locally:

```bash
OLLAMA_ORIGINS=* ollama serve
```

Then pull a model once:

```bash
ollama pull llama3.1
```

If you prefer a different local model, just change `AI_MODEL` in `js/ai.js`.

If Ollama is not running or the browser cannot reach `http://localhost:11434`, the app automatically falls back to built-in content.

If you open the app directly in the browser and the AI request silently fails, the usual cause is browser-origin blocking. Starting Ollama with `OLLAMA_ORIGINS=*` is the easiest hackathon-safe fix for local browser access.

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
