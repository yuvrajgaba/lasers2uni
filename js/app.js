/**
 * app.js
 * Application boot for Laser2Uni.
 * Owner: UI person
 *
 * Depends on: all other js/ files (must be loaded last)
 */

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  setupTooltips();
  setupOnboarding();
  setupSwipeButtons();
  setupDashboardTabs();
  setupOutcomesModal();
  startRealtimeFeed();
});
