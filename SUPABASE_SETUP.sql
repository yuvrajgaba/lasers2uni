-- ══════════════════════════════════════════════════════════════════
-- Laser2Uni — Supabase SQL Setup
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- ══════════════════════════════════════════════════════════════════
--
-- MANUAL STEPS AFTER RUNNING THIS SQL:
--
-- 1. ENABLE REALTIME on the outcomes table:
--    Supabase Dashboard → Database → Replication
--    Find "outcomes" and toggle it ON under "Source"
--
-- 2. DISABLE RLS for now (demo app):
--    Dashboard → Table Editor → click each table → click "RLS" toggle to OFF
--    OR create a policy: Dashboard → Authentication → Policies →
--    New Policy → "Allow all operations" for each table.
--
-- 3. FIND YOUR KEYS:
--    Dashboard → Project Settings → API
--    Copy "Project URL" → paste into SUPABASE_URL in js/supabase.js
--    Copy "anon public" key → paste into SUPABASE_ANON_KEY in js/supabase.js
--
-- ══════════════════════════════════════════════════════════════════

-- Users table (username + plain-text password for demo/hackathon)
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  username   text unique not null,
  password   text not null,
  created_at timestamptz default now()
);

-- Sessions table (one row per login)
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete cascade,
  started_at timestamptz default now()
);

-- Onboarding table (one row per form completion)
create table if not exists onboarding (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references users(id) on delete cascade,
  name            text,
  major           text,
  gpa             numeric,
  units           text,
  igetc           text,
  igetc_completed text[],
  honors          text,
  career          text,
  industries      text[],
  grad            text,
  size            text,
  regions         text[],
  priorities      text[],
  extracurriculars text[],
  extra           text,
  created_at      timestamptz default now()
);

-- Swipes table (one row per card swipe)
create table if not exists swipes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references users(id) on delete cascade,
  school_id text,
  direction text,   -- 'right' (like) | 'left' (pass) | 'up' (skip)
  swiped_at timestamptz default now()
);

-- Outcomes table (IVC student acceptances — powers the realtime demo feed)
create table if not exists outcomes (
  id            uuid primary key default gen_random_uuid(),
  student_name  text,
  student_major text,
  student_gpa   numeric,
  school_id     text,
  school_name   text,
  accepted      boolean default true,
  year          int,
  created_at    timestamptz default now()
);

-- Course progress table (per-user checkbox state for the requirements checklist)
create table if not exists course_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade,
  school_id    text not null,
  major        text not null,
  course_key   text not null,
  completed    boolean default false,
  completed_at timestamptz,
  updated_at   timestamptz default now()
);

-- Unique constraint so we can upsert cleanly
alter table course_progress
  add constraint course_progress_unique
  unique (user_id, school_id, major, course_key);

-- ══════════════════════════════════════════════════════════════════
-- Community / Match / Competitor feature tables
-- ══════════════════════════════════════════════════════════════════
--
-- After creating these, ENABLE REALTIME for chat_messages:
-- Supabase Dashboard → Database → Publications → supabase_realtime
-- → add "chat_messages" to the publication (toggle ON).
-- ══════════════════════════════════════════════════════════════════

-- Community chat messages (one row per message, grouped by major)
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  major       text not null,
  user_id     uuid references users(id) on delete set null,
  display_name text not null,
  content     text not null,
  is_ai       boolean default false,
  ai_context  jsonb,
  sent_at     timestamptz default now()
);

create index if not exists chat_messages_major_sent_at_idx
  on chat_messages (major, sent_at desc);

-- Anonymous nickname assignment (adjective + animal) for each user
create table if not exists user_nicknames (
  user_id    uuid primary key references users(id) on delete cascade,
  nickname   text not null unique,
  created_at timestamptz default now()
);

-- School match conversations (one row per user+school pair)
create table if not exists school_chats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  school_id   text not null,
  school_name text not null,
  messages    jsonb default '[]',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table school_chats
  add constraint school_chats_unique_user_school
  unique (user_id, school_id);

-- Student profiles — anonymous public cards for community/competitor view
create table if not exists student_profiles (
  user_id          uuid primary key references users(id) on delete cascade,
  nickname         text not null,
  major            text,
  gpa              numeric,
  honors           text,
  extracurriculars text[],
  accepted_schools text[],
  advice           text,
  is_public        boolean default true,
  updated_at       timestamptz default now()
);

create index if not exists student_profiles_major_idx
  on student_profiles (major);
