-- ══════════════════════════════════════════════════════════════════
-- Laser2Uni — Seed Data (manual run in Supabase SQL Editor)
-- 100 realistic IVC student outcomes + 5 demo users
-- ══════════════════════════════════════════════════════════════════
-- Run AFTER SUPABASE_SETUP.sql. Safe to re-run (only users may conflict).
-- ══════════════════════════════════════════════════════════════════

INSERT INTO outcomes
(student_name, student_major, student_gpa, school_id, school_name, accepted, year)
VALUES
-- ── High achievers (3.7-4.0 GPA) ──────────────────────────────
('Maya Chen',       'Computer Science',       3.92, 'uci',   'UC Irvine',           true,  2024),
('Maya Chen',       'Computer Science',       3.92, 'ucsd',  'UC San Diego',        true,  2024),
('Marcus Johnson',  'Computer Science',       3.85, 'uci',   'UC Irvine',           true,  2024),
('Marcus Johnson',  'Computer Science',       3.85, 'ucsb',  'UC Santa Barbara',    true,  2024),
('Priya Patel',     'Mechanical Engineering', 3.91, 'uci',   'UC Irvine',           true,  2024),
('Priya Patel',     'Mechanical Engineering', 3.91, 'ucla',  'UC Los Angeles',      true,  2024),
('James Kim',       'Biology',                3.88, 'uci',   'UC Irvine',           true,  2024),
('James Kim',       'Biology',                3.88, 'ucsd',  'UC San Diego',        true,  2024),
('Sofia Torres',    'Business Administration',3.79, 'uci',   'UC Irvine',           true,  2024),
('Sofia Torres',    'Business Administration',3.79, 'usc',   'USC',                 true,  2024),
('Aiden Park',      'Computer Science',       3.95, 'ucla',  'UC Los Angeles',      true,  2024),
('Aiden Park',      'Computer Science',       3.95, 'ucb',   'UC Berkeley',         true,  2024),
('Aiden Park',      'Computer Science',       3.95, 'uci',   'UC Irvine',           true,  2024),
('Isabella Nguyen', 'Nursing',                3.87, 'uci',   'UC Irvine',           true,  2024),
('Isabella Nguyen', 'Nursing',                3.87, 'csulb', 'Cal State Long Beach',true,  2024),
('Ethan Williams',  'Psychology',             3.82, 'uci',   'UC Irvine',           true,  2024),
('Ethan Williams',  'Psychology',             3.82, 'ucla',  'UC Los Angeles',      true,  2024),
('Zoe Martinez',    'Biological Sciences',    3.76, 'ucd',   'UC Davis',            true,  2024),
('Zoe Martinez',    'Biological Sciences',    3.76, 'ucsb',  'UC Santa Barbara',    true,  2024),
('Ryan Lee',        'Mechanical Engineering', 3.83, 'ucsd',  'UC San Diego',        true,  2024),
('Ryan Lee',        'Mechanical Engineering', 3.83, 'cpslo', 'Cal Poly SLO',        true,  2024),

-- ── Mid-range students (3.2-3.6 GPA) ─────────────────────────
('Alex Rivera',     'Computer Science',       3.52, 'uci',   'UC Irvine',           true,  2024),
('Alex Rivera',     'Computer Science',       3.52, 'ucsc',  'UC Santa Cruz',       true,  2024),
('Alex Rivera',     'Computer Science',       3.52, 'ucla',  'UC Los Angeles',      false, 2024),
('Jasmine Huang',   'Business Administration',3.45, 'csuf',  'Cal State Fullerton', true,  2024),
('Jasmine Huang',   'Business Administration',3.45, 'csulb', 'Cal State Long Beach',true,  2024),
('Jasmine Huang',   'Business Administration',3.45, 'uci',   'UC Irvine',           false, 2024),
('Daniel Cho',      'Psychology',             3.38, 'ucr',   'UC Riverside',        true,  2024),
('Daniel Cho',      'Psychology',             3.38, 'csuf',  'Cal State Fullerton', true,  2024),
('Daniel Cho',      'Psychology',             3.38, 'uci',   'UC Irvine',           false, 2024),
('Natalie Wong',    'Nursing',                3.55, 'csulb', 'Cal State Long Beach',true,  2024),
('Natalie Wong',    'Nursing',                3.55, 'ucr',   'UC Riverside',        true,  2024),
('Natalie Wong',    'Nursing',                3.55, 'uci',   'UC Irvine',           false, 2024),
('Kevin Tran',      'Mechanical Engineering', 3.41, 'cpp',   'Cal Poly Pomona',     true,  2024),
('Kevin Tran',      'Mechanical Engineering', 3.41, 'cpslo', 'Cal Poly SLO',        false, 2024),
('Kevin Tran',      'Mechanical Engineering', 3.41, 'csulb', 'Cal State Long Beach',true,  2024),
('Mia Rodriguez',   'Biology',                3.33, 'ucr',   'UC Riverside',        true,  2024),
('Mia Rodriguez',   'Biology',                3.33, 'ucm',   'UC Merced',           true,  2024),
('Mia Rodriguez',   'Biology',                3.33, 'uci',   'UC Irvine',           false, 2024),
('Tyler Jackson',   'Communication',          3.48, 'csuf',  'Cal State Fullerton', true,  2024),
('Tyler Jackson',   'Communication',          3.48, 'sdsu',  'San Diego State',     true,  2024),
('Tyler Jackson',   'Communication',          3.48, 'usc',   'USC',                 false, 2024),
('Hannah Kim',      'Accounting',             3.61, 'csuf',  'Cal State Fullerton', true,  2024),
('Hannah Kim',      'Accounting',             3.61, 'uci',   'UC Irvine',           true,  2024),
('Hannah Kim',      'Accounting',             3.61, 'usc',   'USC',                 false, 2024),
('Chris Nguyen',    'Computer Science',       3.29, 'ucsc',  'UC Santa Cruz',       true,  2024),
('Chris Nguyen',    'Computer Science',       3.29, 'sjsu',  'San Jose State',      true,  2024),
('Chris Nguyen',    'Computer Science',       3.29, 'uci',   'UC Irvine',           false, 2024),
('Emma Davis',      'Education',              3.44, 'csuf',  'Cal State Fullerton', true,  2024),
('Emma Davis',      'Education',              3.44, 'csulb', 'Cal State Long Beach',true,  2024),
('Lucas Park',      'History',                3.36, 'ucr',   'UC Riverside',        true,  2024),
('Lucas Park',      'History',                3.36, 'csuf',  'Cal State Fullerton', true,  2024),

-- ── IVC Honors students with TAG advantage ───────────────────
('Sarah Chen',      'Computer Science',       3.72, 'uci',   'UC Irvine',           true,  2024),
('Sarah Chen',      'Computer Science',       3.72, 'ucsd',  'UC San Diego',        true,  2024),
('Michael Patel',   'Mechanical Engineering', 3.68, 'uci',   'UC Irvine',           true,  2024),
('Michael Patel',   'Mechanical Engineering', 3.68, 'ucd',   'UC Davis',            true,  2024),
('Ashley Torres',   'Biology',                3.71, 'uci',   'UC Irvine',           true,  2024),
('Ashley Torres',   'Biology',                3.71, 'ucsb',  'UC Santa Barbara',    true,  2024),
('Brandon Lee',     'Psychology',             3.65, 'uci',   'UC Irvine',           true,  2024),
('Brandon Lee',     'Psychology',             3.65, 'ucla',  'UC Los Angeles',      false, 2024),
('Jennifer Wu',     'Nursing',                3.74, 'uci',   'UC Irvine',           true,  2024),
('Jennifer Wu',     'Nursing',                3.74, 'ucd',   'UC Davis',            true,  2024),

-- ── Average students (2.8-3.2 GPA) ───────────────────────────
('Jordan Smith',    'Business Administration',3.12, 'csuf',  'Cal State Fullerton', true,  2024),
('Jordan Smith',    'Business Administration',3.12, 'sdsu',  'San Diego State',     true,  2024),
('Jordan Smith',    'Business Administration',3.12, 'uci',   'UC Irvine',           false, 2024),
('Taylor Brown',    'Communication',          3.05, 'csuf',  'Cal State Fullerton', true,  2024),
('Taylor Brown',    'Communication',          3.05, 'sdsu',  'San Diego State',     true,  2024),
('Morgan Wilson',   'Psychology',             2.95, 'ucr',   'UC Riverside',        true,  2024),
('Morgan Wilson',   'Psychology',             2.95, 'ucm',   'UC Merced',           true,  2024),
('Morgan Wilson',   'Psychology',             2.95, 'csuf',  'Cal State Fullerton', true,  2024),
('Casey Martinez',  'Biology',                2.88, 'ucm',   'UC Merced',           true,  2024),
('Casey Martinez',  'Biology',                2.88, 'ucr',   'UC Riverside',        true,  2024),
('Casey Martinez',  'Biology',                2.88, 'uci',   'UC Irvine',           false, 2024),
('Jamie Anderson',  'Computer Science',       2.98, 'sjsu',  'San Jose State',      true,  2024),
('Jamie Anderson',  'Computer Science',       2.98, 'ucsc',  'UC Santa Cruz',       false, 2024),
('Jamie Anderson',  'Computer Science',       2.98, 'uci',   'UC Irvine',           false, 2024),
('Riley Thompson',  'Accounting',             3.08, 'csuf',  'Cal State Fullerton', true,  2024),
('Riley Thompson',  'Accounting',             3.08, 'cpp',   'Cal Poly Pomona',     true,  2024),
('Avery Garcia',    'Education',              2.92, 'csuf',  'Cal State Fullerton', true,  2024),
('Avery Garcia',    'Education',              2.92, 'csulb', 'Cal State Long Beach',true,  2024),
('Sam Johnson',     'History',                3.15, 'ucr',   'UC Riverside',        true,  2024),
('Sam Johnson',     'History',                3.15, 'csuf',  'Cal State Fullerton', true,  2024),
('Quinn Davis',     'Mechanical Engineering', 2.91, 'cpp',   'Cal Poly Pomona',     true,  2024),
('Quinn Davis',     'Mechanical Engineering', 2.91, 'cpslo', 'Cal Poly SLO',        false, 2024),

-- ── Low GPA students (below 2.5) - rejected ──────────────────
('Derek Hall',      'Computer Science',       2.31, 'uci',   'UC Irvine',           false, 2024),
('Derek Hall',      'Computer Science',       2.31, 'ucsd',  'UC San Diego',        false, 2024),
('Derek Hall',      'Computer Science',       2.31, 'sjsu',  'San Jose State',      false, 2024),
('Derek Hall',      'Computer Science',       2.31, 'ucsc',  'UC Santa Cruz',       false, 2024),
('Brittany Moore',  'Business Administration',2.18, 'csuf',  'Cal State Fullerton', false, 2024),
('Brittany Moore',  'Business Administration',2.18, 'sdsu',  'San Diego State',     false, 2024),
('Brittany Moore',  'Business Administration',2.18, 'cpp',   'Cal Poly Pomona',     false, 2024),
('Tyler Ross',      'Nursing',                2.45, 'uci',   'UC Irvine',           false, 2024),
('Tyler Ross',      'Nursing',                2.45, 'csulb', 'Cal State Long Beach',false, 2024),
('Tyler Ross',      'Nursing',                2.45, 'ucr',   'UC Riverside',        false, 2024),
('Amanda Foster',   'Biology',                2.22, 'ucm',   'UC Merced',           false, 2024),
('Amanda Foster',   'Biology',                2.22, 'ucr',   'UC Riverside',        false, 2024),
('Amanda Foster',   'Biology',                2.22, 'csuf',  'Cal State Fullerton', false, 2024),
('Nathan Price',    'Psychology',             2.38, 'ucr',   'UC Riverside',        false, 2024),
('Nathan Price',    'Psychology',             2.38, 'ucm',   'UC Merced',           false, 2024),
('Nathan Price',    'Psychology',             2.38, 'csuf',  'Cal State Fullerton', false, 2024),
('Jessica Long',    'Mechanical Engineering', 2.15, 'cpp',   'Cal Poly Pomona',     false, 2024),
('Jessica Long',    'Mechanical Engineering', 2.15, 'cpslo', 'Cal Poly SLO',        false, 2024),
('Jessica Long',    'Mechanical Engineering', 2.15, 'csulb', 'Cal State Long Beach',false, 2024),
('Kevin Stone',     'Computer Science',       2.05, 'sjsu',  'San Jose State',      false, 2023),
('Kevin Stone',     'Computer Science',       2.05, 'ucsc',  'UC Santa Cruz',       false, 2023),
('Kevin Stone',     'Computer Science',       2.05, 'ucr',   'UC Riverside',        false, 2023);

-- ══════════════════════════════════════════════════════════════════
-- Demo "anonymous profile" users that students can view in Community
-- ══════════════════════════════════════════════════════════════════
INSERT INTO users (id, username, password, created_at) VALUES
('a1b2c3d4-0001-0001-0001-000000000001', 'silent_fox', 'demo', now()),
('a1b2c3d4-0002-0002-0002-000000000002', 'brave_owl',  'demo', now()),
('a1b2c3d4-0003-0003-0003-000000000003', 'calm_wolf',  'demo', now()),
('a1b2c3d4-0004-0004-0004-000000000004', 'swift_hawk', 'demo', now()),
('a1b2c3d4-0005-0005-0005-000000000005', 'bold_lion',  'demo', now())
ON CONFLICT (username) DO NOTHING;
