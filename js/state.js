/**
 * state.js
 * Shared application state and utility functions for Laser2Uni.
 * Owner: UI person
 *
 * Must be loaded before: onboarding.js, swipe.js, dashboard.js, outcomes.js
 */

/* ══════════════════════════════════════════════════════════════════
   SHARED STATE
══════════════════════════════════════════════════════════════════ */

/** @type {Object} collected form data */
let student = {};

/** @type {Array<{school, score, fit}>} full scored deck (all 20 schools) */
let deck = [];

/** @type {number} index of the current top card in `deck` */
let deckIndex = 0;

/** Swipe buckets */
let likedItems   = [];
let passedItems  = [];
let skippedItems = [];

/** Total swipes taken */
let swipeCount = 0;

/** Active ranking view */
let activeView = 'balanced'; // 'balanced' | 'fit' | 'rankings'

/** Three ranked school lists built after swiping */
let prestigeList = [];
let fitList      = [];
let balancedList = [];

/** AI-generated dashboard data */
let aiData = {};

/** Current onboarding step (0–3) */
let currentStep = 0;

/** ID of the logged-in user (uuid from Supabase, or 'guest_<timestamp>') */
let currentUserId = null;

/* ══════════════════════════════════════════════════════════════════
   EXTRACURRICULAR DATA (shared between onboarding.js + dashboard.js)
══════════════════════════════════════════════════════════════════ */

const EXTRACURRICULAR_MAP = {
  cs_data: [
    'Coding Club', 'Hackathons', 'Research Assistant',
    'Open Source Projects', 'Math Club', 'Robotics Club',
    'Peer Tutoring', 'Student Government',
    'Part-time Tech Job', 'Personal Projects / GitHub'
  ],
  engineering: [
    'Robotics Club', 'Engineering Club', 'Research Assistant',
    'Hackathons', 'CAD / Design Projects', 'Part-time Engineering Job',
    'Math Club', 'Physics Tutoring', 'Peer Tutoring', 'Student Government'
  ],
  bio_premed: [
    'Pre-Med Club', 'Volunteering at Hospital/Clinic', 'Research Lab',
    'Science Tutoring', 'Nursing Assistant', 'Red Cross / EMT',
    'Student Government', 'Community Service'
  ],
  business: [
    'Business Club', 'Entrepreneurship Club', 'Investing Club',
    'Part-time Business Job', 'Marketing Internship',
    'Student Government', 'Community Service', 'Case Competitions'
  ],
  polisci_social: [
    'Student Government', 'Debate Club', 'Community Organizing',
    'Internship at Government Office', 'Volunteering',
    'Model UN', 'Writing for Student Newspaper'
  ],
  film_media: [
    'Film Club', 'Photography Club', 'Student Newspaper',
    'YouTube / Content Creation', 'Social Media Management',
    'Community Theatre', 'Podcast Production'
  ],
  default: [
    'Student Government', 'Volunteering', 'Tutoring / Mentoring',
    'Part-time Job', 'Club Officer Role', 'Community Service',
    'Research Assistant', 'Athletics'
  ]
};

/**
 * getMajorGroup()
 * Maps a major string to one of the EXTRACURRICULAR_MAP keys.
 */
function getMajorGroup(major) {
  if (!major) return 'default';
  const m = major.toLowerCase();
  if (m.includes('computer science') || m.includes('data science')) return 'cs_data';
  if (m.includes('engineering')) return 'engineering';
  if (m.includes('bio') || m.includes('pre-med') || m.includes('chemistry') ||
      m.includes('neuroscience') || m.includes('nursing') || m.includes('psychology') ||
      m.includes('kinesiology') || m.includes('public health')) return 'bio_premed';
  if (m.includes('business') || m.includes('finance') || m.includes('economics') ||
      m.includes('marketing') || m.includes('accounting')) return 'business';
  if (m.includes('political') || m.includes('sociology') || m.includes('communication') ||
      m.includes('history') || m.includes('philosophy') || m.includes('education')) return 'polisci_social';
  if (m.includes('film') || m.includes('media') || m.includes('graphic') ||
      m.includes('music') || m.includes('architecture')) return 'film_media';
  return 'default';
}

/* ══════════════════════════════════════════════════════════════════
   SHARED UTILITIES
══════════════════════════════════════════════════════════════════ */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }
}

function showToast(message, duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className   = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
