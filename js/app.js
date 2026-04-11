/**
 * app.js
 * Application boot for Laser2Uni.
 * Owner: UI person
 *
 * Depends on: all other js/ files (must be loaded last)
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
