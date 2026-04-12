/**
 * auth.js
 * Login / signup screen for Laser2Uni.
 * Owner: UI person
 *
 * Depends on: state.js, supabase.js, scoring.js, ai.js,
 *             swipe.js (startLoadingMessages), dashboard.js (buildDashboard)
 */

/**
 * setupAuthScreen()
 * Injects the auth screen before #screen-onboarding and wires up buttons.
 * Called from app.js on DOMContentLoaded.
 */
function setupAuthScreen() {
  const screen     = document.createElement('div');
  screen.id        = 'screen-auth';
  screen.className = 'screen active';

  screen.innerHTML = `
    <div class="onboarding-wrap">
      <div class="ob-logo">Lasers<span>2</span>Uni</div>
      <p class="ob-tagline">Find your transfer fit  -  built for IVC students.</p>

      <div class="auth-form">
        <label class="field-label">Username</label>
        <input
          type="text"
          id="auth-username"
          class="text-input"
          placeholder="e.g. alex_ivc"
          autocomplete="username"
        />

        <label class="field-label" style="margin-top:16px">Password</label>
        <input
          type="password"
          id="auth-password"
          class="text-input"
          placeholder="Choose a password"
          autocomplete="current-password"
        />

        <div class="auth-error hidden" id="auth-error"></div>

        <button class="btn-primary auth-btn" id="btn-auth-submit">
          Login / Create Account
        </button>
        <button class="btn-ghost auth-btn" id="btn-auth-guest">
          Continue as Guest →
        </button>
      </div>
    </div>
  `;

  // Insert before #screen-onboarding
  const onboarding = document.getElementById('screen-onboarding');
  onboarding.parentNode.insertBefore(screen, onboarding);

  document.getElementById('btn-auth-submit').addEventListener('click', handleAuthSubmit);
  document.getElementById('btn-auth-guest').addEventListener('click', handleGuestLogin);

  screen.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAuthSubmit();
  });
}

/**
 * handleAuthSubmit()
 * Upserts the user, restores their session if they have previous data,
 * or sends them to onboarding if they're new.
 */
async function handleAuthSubmit() {
  const username  = document.getElementById('auth-username')?.value.trim();
  const password  = document.getElementById('auth-password')?.value;
  const submitBtn = document.getElementById('btn-auth-submit');

  if (!username || !password) {
    showAuthError('Please enter a username and password.');
    return;
  }

  submitBtn.disabled    = true;
  submitBtn.textContent = 'Loading…';
  hideAuthError();

  const result = await upsertUser(username, password);

  submitBtn.disabled    = false;
  submitBtn.textContent = 'Login / Create Account';

  if (result.error) {
    if (result.error === 'wrong_password') {
      showAuthError('Incorrect password.');
    } else {
      showAuthError('Something went wrong. Try again.');
    }
    return;
  }

  currentUserId = result.user.id;
  saveSession(currentUserId);

  // Check for existing onboarding data
  const existing = await getUserOnboarding(currentUserId);

  if (existing) {
    // Restore student object from saved row
    student.name             = existing.name             || '';
    student.major            = existing.major            || '';
    student.gpa              = existing.gpa != null ? String(existing.gpa) : '3.50';
    student.units            = existing.units            || '';
    student.igetc            = existing.igetc            || '';
    student.igetcCompleted   = existing.igetc_completed  || [];
    student.honors           = existing.honors           || '';
    student.career           = existing.career           || '';
    student.industries       = existing.industries       || [];
    student.grad             = existing.grad             || '';
    student.size             = existing.size             || '';
    student.regions          = existing.regions          || [];
    student.priorities       = existing.priorities       || [];
    student.extracurriculars = existing.extracurriculars || [];
    student.extra            = existing.extra            || '';

    // Pre-fetch all course progress so the requirements tab can restore state
    window.savedCourseProgress = await getAllCourseProgress(currentUserId);

    // Build deck and all three rankings, then show dashboard
    deck = buildDeck(student);
    const pool = deck.slice(0, 8);
    prestigeList  = buildPrestigeRanking(pool);
    fitList       = buildFitRanking(pool);
    balancedList  = buildBalancedRanking(pool);

    showScreen('screen-loading');
    startLoadingMessages();

    aiData = await generateAIContent(student, balancedList, []);
    buildDashboard(prestigeList, fitList, balancedList);
    showScreen('screen-dashboard');

    // Inject "Edit profile" button into student chip
    const chip = document.getElementById('student-chip');
    if (chip) {
      chip.innerHTML =
        `${student.name} - ${student.major} - ${student.gpa} GPA` +
        `<button class="edit-profile-btn" onclick="showScreen('screen-onboarding')">Edit</button>`;
    }
  } else {
    showScreen('screen-onboarding');
  }
}

/**
 * handleGuestLogin()
 * Skips auth, generates a local guest ID, goes to onboarding.
 */
function handleGuestLogin() {
  currentUserId = 'guest_' + Date.now();
  showScreen('screen-onboarding');
}

/* ── Helpers ──────────────────────────────────────────────────── */

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideAuthError() {
  const el = document.getElementById('auth-error');
  if (el) el.classList.add('hidden');
}
