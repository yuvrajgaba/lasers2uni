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

/** Tiered schools after swiping */
let tiers = { reach: [], match: [], safety: [] };

/** AI-generated dashboard data */
let aiData = {};

/** Current onboarding step (0–3) */
let currentStep = 0;

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
