/**
 * app.js
 * Application boot for Laser2Uni.
 * Owner: UI person
 *
 * Depends on: all other js/ files (must be loaded last)
 */

/*
 DEMO DAY SETUP — run these before presenting:

 1. Terminal 1: cd ~/Desktop/lasers2uni && python3 -m http.server 8080
 2. Terminal 2: OLLAMA_ORIGINS=* ollama serve (if not already running)
 3. Browser: http://localhost:8080
 4. Have Supabase Table Editor open in second tab showing outcomes
 5. Demo account: use a fresh username each demo so judges see
    the full onboarding flow
 6. Demo GPA: use 3.6 for best AI responses and match animation
 7. Demo major: Computer Science shows the most features

 DEMO FLOW (2 min 30 sec):
 - Login (15s)
 - Onboarding: Alex, CS, 3.6 GPA, Honors, SoCal,
   Industry connections + Prestige (30s)
 - Swipe: like UCI, UCLA, UCSD, pass ASU, like UCSB (20s)
 - Done swiping → You Matched! animation (10s)
 - School chat with UCI — let AI respond (20s)
 - Dashboard: show Balanced tab with confidence scores (15s)
 - Community tab: show Transfer Wall polaroids (15s)
 - Type "@coach what are my chances at UCI CS?" in chat (15s)
 - Report acceptance in outcomes modal (10s)
 - Watch Transfer Wall update live (10s)

 SQL TO RUN BEFORE DEMO (Supabase SQL Editor):
   ALTER TABLE school_chats ADD CONSTRAINT
     school_chats_user_school_unique
     UNIQUE (user_id, school_id);
*/

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  setupAuthScreen();
  setupTooltips();
  setupOnboarding();
  setupSwipeButtons();
  setupDashboardTabs();
  setupOutcomesModal();
  startRealtimeFeed();
  if (typeof setupUpdateProfilePanel === 'function') setupUpdateProfilePanel();
});
