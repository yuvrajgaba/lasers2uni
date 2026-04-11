/**
 * ui.js
 * All UI logic for Laser2Uni: onboarding, swipe engine, loading, dashboard.
 * Owner: UI person
 *
 * Depends on: schools.js, scoring.js, ai.js, supabase.js (loaded before this file)
 */

/* ══════════════════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════════════════ */

/** @type {Object} collected form data */
let student = {};

/** @type {Array<{school, score, fit}>} full scored deck (all 20 schools) */
let deck = [];

/** @type {number} index of the current top card in `deck` */
let deckIndex = 0;

/** Swipe buckets */
let likedItems  = [];
let passedItems = [];
let skippedItems = [];

/** Total swipes taken */
let swipeCount = 0;

/** Tiered schools after swiping */
let tiers = { reach: [], match: [], safety: [] };

/** AI-generated dashboard data */
let aiData = {};

/** Current onboarding step (0–3) */
let currentStep = 0;

/* ── Drag state (module-scope per spec) ───────────────────────── */
let _mmov = null;  // mousemove listener ref
let _mup  = null;  // mouseup listener ref
let _tmov = null;  // touchmove listener ref
let _tup  = null;  // touchend listener ref
let dragging        = false;
let swipeInProgress = false;
let dragStartX      = 0;
let dragStartY      = 0;
let dragCurrentX    = 0;
let dragCurrentY    = 0;
let activeCardEl    = null;

/* ══════════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  setupTooltips();
  setupOnboarding();
  setupSwipeButtons();
  setupDashboardTabs();
  setupOutcomesModal();
  startRealtimeFeed();
});

/* ══════════════════════════════════════════════════════════════════
   SCREEN ROUTING
══════════════════════════════════════════════════════════════════ */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

/* ══════════════════════════════════════════════════════════════════
   TOOLTIPS (info badges)
══════════════════════════════════════════════════════════════════ */

function setupTooltips() {
  const box = document.getElementById('tooltip-box');
  if (!box) return;

  document.querySelectorAll('.info-badge').forEach(btn => {
    btn.addEventListener('mouseenter', e => {
      box.textContent = btn.dataset.tooltip || '';
      box.classList.remove('hidden');
      positionTooltip(box, e);
    });
    btn.addEventListener('mousemove', e => positionTooltip(box, e));
    btn.addEventListener('mouseleave', () => box.classList.add('hidden'));
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
  });
}

function positionTooltip(box, e) {
  const margin = 12;
  let x = e.clientX + margin;
  let y = e.clientY + margin;
  if (x + 290 > window.innerWidth)  x = e.clientX - 290 - margin;
  if (y + 120 > window.innerHeight) y = e.clientY - 120 - margin;
  box.style.left = x + 'px';
  box.style.top  = y + 'px';
}

/* ══════════════════════════════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════════════════════════════ */

function setupOnboarding() {
  // GPA slider live display
  const gpaSlider  = document.getElementById('input-gpa');
  const gpaDisplay = document.getElementById('gpa-display');
  if (gpaSlider && gpaDisplay) {
    gpaSlider.addEventListener('input', () => {
      gpaDisplay.textContent = parseFloat(gpaSlider.value).toFixed(2);
    });
  }

  // Pill selection
  document.querySelectorAll('.pill-group').forEach(group => {
    const isMulti = group.dataset.multi === 'true';
    group.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        if (isMulti) {
          pill.classList.toggle('selected');
        } else {
          group.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
          pill.classList.add('selected');
        }
      });
    });
  });

  // Nav buttons
  document.getElementById('btn-ob-next').addEventListener('click', advanceStep);
  document.getElementById('btn-ob-back').addEventListener('click', retreatStep);

  updateStepUI();
}

function advanceStep() {
  if (!validateStep(currentStep)) return;
  collectStep(currentStep);
  if (currentStep < 3) {
    currentStep++;
    updateStepUI();
  } else {
    // All 4 steps done → begin swiping
    collectStep(3);
    startSwiping();
  }
}

function retreatStep() {
  if (currentStep > 0) {
    currentStep--;
    updateStepUI();
  }
}

function updateStepUI() {
  // Show/hide steps
  for (let i = 0; i <= 3; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.toggle('hidden', i !== currentStep);
  }

  // Progress bar (25% per step, filled fully at last step completion)
  const pct = ((currentStep + 1) / 4) * 100;
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct + '%';

  // Step label
  const lbl = document.getElementById('step-indicator');
  if (lbl) lbl.textContent = `Step ${currentStep + 1} of 4`;

  // Back button visibility
  const backBtn = document.getElementById('btn-ob-back');
  if (backBtn) backBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';

  // Next button label on last step
  const nextBtn = document.getElementById('btn-ob-next');
  if (nextBtn) nextBtn.textContent = currentStep === 3 ? 'Find My Schools →' : 'Next →';
}

function validateStep(step) {
  if (step === 0) {
    const name  = document.getElementById('input-name')?.value.trim();
    const major = document.getElementById('input-major')?.value;
    if (!name) { showToast('Please enter your first name.', 3000); return false; }
    if (!major) { showToast('Please select your intended major.', 3000); return false; }
  }
  if (step === 1) {
    const units  = getSelectedPills('units');
    const igetc  = getSelectedPills('igetc');
    const honors = getSelectedPills('honors');
    if (units.length === 0)  { showToast('Please select units completed.', 3000); return false; }
    if (igetc.length === 0)  { showToast('Please select your IGETC status.', 3000); return false; }
    if (honors.length === 0) { showToast('Please select your IVC Honors status.', 3000); return false; }
  }
  if (step === 2) {
    const career = document.getElementById('input-career')?.value.trim();
    if (!career) { showToast('Please describe your career goals.', 3000); return false; }
  }
  return true;
}

function collectStep(step) {
  if (step === 0) {
    student.name  = document.getElementById('input-name')?.value.trim() || '';
    student.major = document.getElementById('input-major')?.value || '';
  }
  if (step === 1) {
    student.gpa    = parseFloat(document.getElementById('input-gpa')?.value || 3.5).toFixed(2);
    student.units  = getSelectedPills('units')[0]  || '';
    student.igetc  = getSelectedPills('igetc')[0]  || '';
    student.honors = getSelectedPills('honors')[0] || '';
  }
  if (step === 2) {
    student.career     = document.getElementById('input-career')?.value.trim() || '';
    student.industries = getSelectedPills('industries');
    student.grad       = getSelectedPills('grad')[0] || '';
  }
  if (step === 3) {
    student.size       = getSelectedPills('size')[0] || 'No preference';
    student.regions    = getSelectedPills('regions');
    student.priorities = getSelectedPills('priorities');
    student.extra      = document.getElementById('input-extra')?.value.trim() || '';
  }
}

/**
 * getSelectedPills()
 * Returns an array of selected pill values for a given data-key group.
 */
function getSelectedPills(key) {
  const group = document.querySelector(`.pill-group[data-key="${key}"]`);
  if (!group) return [];
  return Array.from(group.querySelectorAll('.pill.selected')).map(p => p.dataset.val);
}

/* ══════════════════════════════════════════════════════════════════
   SWIPE ENGINE
══════════════════════════════════════════════════════════════════ */

function startSwiping() {
  // Build and shuffle the scored deck
  deck        = buildDeck(student);
  deckIndex   = 0;
  likedItems  = [];
  passedItems = [];
  skippedItems = [];
  swipeCount  = 0;

  // Save student to Supabase (fire-and-forget)
  saveStudent(student);

  showScreen('screen-swipe');
  renderCardStack();
  updateSwipeHeader();
}

function setupSwipeButtons() {
  document.getElementById('btn-pass')?.addEventListener('click', () => triggerButtonSwipe('left'));
  document.getElementById('btn-skip')?.addEventListener('click', () => triggerButtonSwipe('up'));
  document.getElementById('btn-like')?.addEventListener('click', () => triggerButtonSwipe('right'));
  document.getElementById('btn-done-swiping')?.addEventListener('click', finishSwiping);
}

function triggerButtonSwipe(direction) {
  if (swipeInProgress || deckIndex >= deck.length) return;
  const card = document.querySelector('.card-top');
  if (!card) return;

  // Animate card out programmatically
  const DIST = window.innerWidth + 200;
  let tx = 0, ty = 0, rot = 0;
  if (direction === 'right') { tx =  DIST; rot =  30; showStamp(card, 'like'); }
  if (direction === 'left')  { tx = -DIST; rot = -30; showStamp(card, 'pass'); }
  if (direction === 'up')    { ty = -(window.innerHeight + 200); showStamp(card, 'skip'); }

  card.style.transition = 'transform 0.4s ease';
  card.style.transform  = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;

  performSwipe(direction);
}

/* ── Drag system ────────────────────────────────────────────────── */

/**
 * cleanDrag()
 * Removes all document-level drag listeners and resets drag state.
 * Called before attaching listeners to a new card (per spec).
 */
function cleanDrag() {
  if (_mmov) document.removeEventListener('mousemove', _mmov);
  if (_mup)  document.removeEventListener('mouseup',   _mup);
  if (_tmov) document.removeEventListener('touchmove', _tmov);
  if (_tup)  document.removeEventListener('touchend',  _tup);
  _mmov = _mup = _tmov = _tup = null;
  dragging = false;
}

/**
 * attachDrag()
 * Always calls cleanDrag() first, then wires up the top card.
 * Per spec: listener refs stored at module scope.
 */
function attachDrag(card) {
  cleanDrag();
  activeCardEl = card;

  // Assign module-scope refs
  _mmov = onDragMove;
  _mup  = onDragEnd;
  _tmov = onDragMoveTouch;
  _tup  = onDragEnd;

  card.addEventListener('mousedown',  onDragStart);
  card.addEventListener('touchstart', onDragStart, { passive: true });
}

function onDragStart(e) {
  if (swipeInProgress) return;
  dragging = true;
  const pt = e.touches ? e.touches[0] : e;
  dragStartX    = pt.clientX;
  dragStartY    = pt.clientY;
  dragCurrentX  = 0;
  dragCurrentY  = 0;
  activeCardEl.classList.add('dragging');

  document.addEventListener('mousemove', _mmov);
  document.addEventListener('mouseup',   _mup);
  document.addEventListener('touchmove', _tmov, { passive: false });
  document.addEventListener('touchend',  _tup);
}

function onDragMove(e) {
  if (!dragging || !activeCardEl) return;
  dragCurrentX = e.clientX - dragStartX;
  dragCurrentY = e.clientY - dragStartY;
  applyCardTransform(activeCardEl, dragCurrentX, dragCurrentY);
  updateStampsOnDrag(activeCardEl, dragCurrentX, dragCurrentY);
}

function onDragMoveTouch(e) {
  if (!dragging || !activeCardEl) return;
  e.preventDefault();
  const pt = e.touches[0];
  dragCurrentX = pt.clientX - dragStartX;
  dragCurrentY = pt.clientY - dragStartY;
  applyCardTransform(activeCardEl, dragCurrentX, dragCurrentY);
  updateStampsOnDrag(activeCardEl, dragCurrentX, dragCurrentY);
}

function onDragEnd() {
  if (!dragging || !activeCardEl) return;
  dragging = false;
  activeCardEl.classList.remove('dragging');

  const SWIPE_X_THRESHOLD =  80;
  const SWIPE_Y_THRESHOLD = -100;

  if      (dragCurrentX >  SWIPE_X_THRESHOLD)  flyOut(activeCardEl, 'right');
  else if (dragCurrentX < -SWIPE_X_THRESHOLD)  flyOut(activeCardEl, 'left');
  else if (dragCurrentY <  SWIPE_Y_THRESHOLD)  flyOut(activeCardEl, 'up');
  else {
    // Snap back
    activeCardEl.style.transition = 'transform 0.35s ease';
    activeCardEl.style.transform  = '';
    hideAllStamps(activeCardEl);
    cleanDrag();
  }
}

function flyOut(card, direction) {
  const DIST = window.innerWidth + 300;
  let tx = 0, ty = 0, rot = 0;
  if (direction === 'right') { tx =  DIST; rot =  35; }
  if (direction === 'left')  { tx = -DIST; rot = -35; }
  if (direction === 'up')    { ty = -(window.innerHeight + 300); }

  card.style.transition = 'transform 0.4s ease';
  card.style.transform  = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
  performSwipe(direction);
}

/* ── Card visual helpers ─────────────────────────────────────────── */

function applyCardTransform(card, dx, dy) {
  const rot = dx * 0.07;
  card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
}

function updateStampsOnDrag(card, dx, dy) {
  const likeEl = card.querySelector('.stamp.like-stamp');
  const passEl = card.querySelector('.stamp.pass-stamp');
  const skipEl = card.querySelector('.stamp.skip-stamp');

  const FADE_START = 20;
  const FADE_FULL  = 80;

  if (dx > FADE_START) {
    const op = Math.min(1, (dx - FADE_START) / (FADE_FULL - FADE_START));
    if (likeEl) likeEl.style.opacity = op;
    if (passEl) passEl.style.opacity = 0;
    if (skipEl) skipEl.style.opacity = 0;
  } else if (dx < -FADE_START) {
    const op = Math.min(1, (-dx - FADE_START) / (FADE_FULL - FADE_START));
    if (passEl) passEl.style.opacity = op;
    if (likeEl) likeEl.style.opacity = 0;
    if (skipEl) skipEl.style.opacity = 0;
  } else if (dy < -40) {
    const op = Math.min(1, (-dy - 40) / 60);
    if (skipEl) skipEl.style.opacity = op;
    if (likeEl) likeEl.style.opacity = 0;
    if (passEl) passEl.style.opacity = 0;
  } else {
    hideAllStamps(card);
  }
}

function showStamp(card, type) {
  const el = card.querySelector(`.stamp.${type}-stamp`);
  if (el) el.style.opacity = 1;
}

function hideAllStamps(card) {
  card.querySelectorAll('.stamp').forEach(s => s.style.opacity = 0);
}

/* ── Swipe outcome recording ─────────────────────────────────────── */

function performSwipe(direction) {
  if (swipeInProgress) return;
  swipeInProgress = true;

  // Defer state update until after fly-out animation
  setTimeout(() => {
    const item = deck[deckIndex];
    if (item) {
      if      (direction === 'right') likedItems  .push(item);
      else if (direction === 'left')  passedItems .push(item);
      else                            skippedItems.push(item);
    }

    swipeCount++;
    deckIndex++;

    cleanDrag();
    updateSwipeHeader();

    const doneBtn = document.getElementById('btn-done-swiping');
    if (swipeCount >= 5 && doneBtn) doneBtn.classList.remove('hidden');

    if (deckIndex >= deck.length) {
      // All cards exhausted
      if (doneBtn) doneBtn.classList.remove('hidden');
      const stack = document.getElementById('card-stack');
      if (stack) {
        stack.innerHTML = `
          <div class="deck-empty">
            <div class="deck-empty-icon">🎉</div>
            <p>You've seen all 20 schools!</p>
            <p style="margin-top:4px;font-size:0.8rem">Tap the button below to see your results.</p>
          </div>`;
      }
      const fitBar = document.getElementById('fit-bar');
      if (fitBar) fitBar.style.visibility = 'hidden';
    } else {
      renderCardStack();
    }

    swipeInProgress = false;
  }, 420);
}

function updateSwipeHeader() {
  const remaining = Math.max(0, deck.length - deckIndex);
  const el1 = document.getElementById('cards-remaining');
  const el2 = document.getElementById('liked-count');
  if (el1) el1.textContent = `${remaining} left`;
  if (el2) el2.textContent = `❤ ${likedItems.length} liked`;
}

/* ── Card rendering ──────────────────────────────────────────────── */

function renderCardStack() {
  const stack = document.getElementById('card-stack');
  if (!stack) return;
  stack.innerHTML = '';

  const slice  = deck.slice(deckIndex, deckIndex + 3);
  const layers = ['card-top', 'card-mid', 'card-bot'];

  // Render back-to-front so top card is painted last (on top)
  for (let i = slice.length - 1; i >= 0; i--) {
    const item = slice[i];
    const card = buildCardElement(item, layers[i]);
    stack.appendChild(card);
  }

  // Attach drag to the top card
  const topCard = stack.querySelector('.card-top');
  if (topCard) attachDrag(topCard);

  // Update fit bar for top card
  if (slice[0]) updateFitBar(slice[0]);
}

function buildCardElement(item, posClass) {
  const { school, score: s, fit } = item;
  const typeClass = school.type.toLowerCase().replace(' ', '-'); // uc, csu, private, oos

  const card = document.createElement('div');
  card.className   = `card ${posClass}`;
  card.dataset.schoolId = school.id;

  // Highlight IVC-specific tags
  const highlightTags = ['TAG Eligible', 'IVC Honors→UCI'];
  const tagsHtml = (school.tags || []).map(t =>
    `<span class="card-tag ${highlightTags.includes(t) ? 'highlight' : ''}">${t}</span>`
  ).join('');

  const ivcHtml = school.ivcPerks
    ? `<div class="card-ivc-perks">🎓 ${school.ivcPerks}</div>`
    : '';

  card.innerHTML = `
    <div class="card-banner ${typeClass}"></div>
    <div class="stamp like-stamp">LIKE</div>
    <div class="stamp pass-stamp">PASS</div>
    <div class="stamp skip-stamp">SKIP</div>
    <div class="card-body">
      <div class="card-emoji">${school.emoji}</div>
      <div class="card-name">${school.name}</div>
      <div class="card-loc">${school.loc} · ${school.type}</div>
      <div class="card-tagline">${school.tagline}</div>
      <div class="card-tags">${tagsHtml}</div>
      <div class="card-gpa-row">
        Min GPA: <span class="card-gpa-val">${school.minGPA.toFixed(1)}</span>
      </div>
      ${ivcHtml}
    </div>
  `;

  return card;
}

function updateFitBar(item) {
  const labelEl = document.getElementById('fit-label-text');
  const fillEl  = document.getElementById('fit-meter-fill');
  const scoreEl = document.getElementById('fit-score-text');

  if (!labelEl || !fillEl || !scoreEl) return;

  const { label, colorVar, cssClass } = item.fit;
  labelEl.textContent     = label;
  labelEl.style.color     = colorVar;
  fillEl.style.width      = item.score + '%';
  fillEl.style.background = colorVar;
  scoreEl.textContent     = item.score;
}

/* ── Finish swiping → generate dashboard ─────────────────────────── */

async function finishSwiping() {
  showScreen('screen-loading');

  // Build liked pool; if nothing liked, fall back to top 6 by score
  let pool = likedItems.length > 0
    ? likedItems
    : deck.slice(0, 6);

  // Tier the liked schools
  tiers = tierSchools(pool, student.gpa);

  // If we still have no schools in any tier after tiering, grab from full deck
  const total = tiers.reach.length + tiers.match.length + tiers.safety.length;
  if (total === 0) {
    tiers = tierSchools(deck.slice(0, 6), student.gpa);
  }

  startLoadingMessages();

  // Call local AI provider
  aiData = await generateAIContent(student, tiers);

  // Small buffer so the last loading message is readable
  await delay(600);

  buildDashboard();
  showScreen('screen-dashboard');
}

/* ── Loading messages ───────────────────────────────────────────── */

const LOADING_MESSAGES = [
  'Analyzing your preferences…',
  'Tiering schools by reach, match, and safety…',
  'Pulling transfer requirements and IVC pathways…',
  'Drafting your personalized life plan…',
  'Almost ready — putting it all together…'
];

let loadingInterval = null;
let loadingMsgIndex = 0;

function startLoadingMessages() {
  loadingMsgIndex = 0;
  const el = document.getElementById('loading-msg');
  if (el) el.textContent = LOADING_MESSAGES[0];

  clearInterval(loadingInterval);
  loadingInterval = setInterval(() => {
    loadingMsgIndex = (loadingMsgIndex + 1) % LOADING_MESSAGES.length;
    if (el) {
      el.style.animation = 'none';
      el.offsetHeight; // reflow
      el.style.animation = '';
      el.textContent = LOADING_MESSAGES[loadingMsgIndex];
    }
  }, 2600);
}

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════════ */

function buildDashboard() {
  clearInterval(loadingInterval);

  // Student chip
  const chip = document.getElementById('student-chip');
  if (chip) {
    chip.textContent = `${student.name} · ${student.major} · ${student.gpa} GPA`;
  }

  renderSchoolsTab();
  renderRequirementsTab();
  renderLifePlanTab();
  addOutcomesFAB();
}

/* ── Tab switching ──────────────────────────────────────────────── */

function setupDashboardTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      const pane = document.getElementById(`tab-${tab.dataset.tab}`);
      if (pane) pane.classList.remove('hidden');
    });
  });
}

/* ── Schools tab ────────────────────────────────────────────────── */

function renderSchoolsTab() {
  const pane = document.getElementById('tab-schools');
  if (!pane) return;
  pane.innerHTML = '';

  const tierConfig = [
    { key: 'reach',  label: 'Reach',   headClass: 'reach-head',  admitClass: 'reach'  },
    { key: 'match',  label: '50-50',   headClass: 'match-head',  admitClass: 'match'  },
    { key: 'safety', label: 'Safety',  headClass: 'safety-head', admitClass: 'safety' }
  ];

  tierConfig.forEach(({ key, label, headClass, admitClass }) => {
    const schools = tiers[key];
    if (!schools || schools.length === 0) return;

    const section = document.createElement('div');
    section.className = 'tier-section';

    const heading = document.createElement('div');
    heading.className = `tier-heading ${headClass}`;
    heading.textContent = label;
    section.appendChild(heading);

    schools.forEach(item => {
      const card = buildDashboardSchoolCard(item, admitClass);
      section.appendChild(card);
    });

    pane.appendChild(section);
  });
}

function buildDashboardSchoolCard(item, admitClass) {
  const { school, score: s, fit } = item;
  const typeClass  = school.type.toLowerCase().replace(/ /g, '-');
  const schoolAI   = aiData?.schools?.[school.id] || {};

  const admitLabels = { reach: 'Reach', match: '50-50', safety: 'Safety' };

  const card = document.createElement('div');
  card.className = 'school-card';

  // Projects list HTML
  const projectsHtml = (schoolAI.projects || [])
    .map(p => `<li>${p}</li>`)
    .join('');

  // Required courses HTML
  const reqCoursesHtml = (schoolAI.transfer_requirements?.required_courses || [])
    .map(c => `<span>${c}</span>`)
    .join('');

  card.innerHTML = `
    <div class="school-card-header">
      <div class="school-card-stripe ${typeClass}"></div>
      <div style="font-size:1.5rem;flex-shrink:0">${school.emoji}</div>
      <div class="school-card-info">
        <div class="school-card-name">${school.name}</div>
        <div class="school-card-loc">${school.loc} · Min GPA ${school.minGPA.toFixed(1)}</div>
      </div>
      <div class="school-card-chips">
        <span class="admit-chip ${admitClass}">${admitLabels[admitClass]}</span>
        <span class="fit-chip ${fit.cssClass}">${fit.label}</span>
      </div>
      <span class="school-card-toggle">▾</span>
    </div>
    <div class="school-card-body">
      ${schoolAI.admission_tips ? `
        <div class="school-card-section-label">Admission Tips</div>
        <div class="school-card-tip">${schoolAI.admission_tips}</div>
      ` : ''}
      ${school.ivcPerks || schoolAI.transfer_requirements?.ivc_notes ? `
        <div class="school-card-section-label">IVC Pathway</div>
        <div class="school-card-ivc">
          ${schoolAI.transfer_requirements?.ivc_notes || school.ivcPerks || ''}
        </div>
      ` : ''}
      ${projectsHtml ? `
        <div class="school-card-section-label">Portfolio Projects to Build</div>
        <ul class="projects-list">${projectsHtml}</ul>
      ` : ''}
    </div>
  `;

  // Toggle expand/collapse
  card.querySelector('.school-card-header').addEventListener('click', () => {
    card.classList.toggle('expanded');
  });

  return card;
}

/* ── Requirements tab ───────────────────────────────────────────── */

function renderRequirementsTab() {
  const pane = document.getElementById('tab-requirements');
  if (!pane) return;
  pane.innerHTML = '';

  // Top note
  const note = document.createElement('div');
  note.className = 'req-note';
  note.innerHTML = `Always verify course articulation at <a href="https://www.assist.org" target="_blank" rel="noopener">assist.org</a>. The requirements below are a starting point — your specific major may have additional prerequisites.`;
  pane.appendChild(note);

  const allTiered = [
    ...tiers.reach .map(x => ({ ...x, tier: 'reach'  })),
    ...tiers.match .map(x => ({ ...x, tier: 'match'  })),
    ...tiers.safety.map(x => ({ ...x, tier: 'safety' }))
  ];

  allTiered.forEach(({ school, tier }) => {
    const req = aiData?.schools?.[school.id]?.transfer_requirements || {};
    const typeClass = school.type.toLowerCase().replace(/ /g, '-');

    const block = document.createElement('div');
    block.className = 'req-school-block';

    const coursesHtml = (req.required_courses || [])
      .map(c => `<span>${c}</span>`)
      .join('');

    block.innerHTML = `
      <div class="req-school-name">
        <div class="school-card-stripe ${typeClass}" style="position:relative;width:4px;height:20px;border-radius:2px;flex-shrink:0"></div>
        ${school.emoji} ${school.name}
        <span style="font-size:0.75rem;color:var(--muted);font-weight:400;margin-left:auto">${school.loc}</span>
      </div>
      <table class="req-table">
        <tr>
          <td>Min GPA Required</td>
          <td>${req.gpa_required || school.minGPA.toFixed(1) + ' (competitive)'}</td>
        </tr>
        <tr>
          <td>IGETC</td>
          <td>Strongly recommended — complete at IVC before transferring</td>
        </tr>
        <tr>
          <td>Required Courses</td>
          <td><div class="req-courses">${coursesHtml || '<span>See assist.org for full articulation</span>'}</div></td>
        </tr>
        <tr>
          <td>IVC Notes</td>
          <td class="ivc-note-cell">${req.ivc_notes || (school.ivcPerks ? school.ivcPerks : 'Review IVC articulation at assist.org')}</td>
        </tr>
      </table>
    `;

    pane.appendChild(block);
  });
}

/* ── Life Plan tab ──────────────────────────────────────────────── */

function renderLifePlanTab() {
  const pane = document.getElementById('tab-life-plan');
  if (!pane) return;
  pane.innerHTML = '';

  const plan = aiData?.life_plan || {};

  // Career summary
  if (plan.summary) {
    const summaryEl = document.createElement('div');
    summaryEl.className = 'life-summary';
    summaryEl.textContent = plan.summary;
    pane.appendChild(summaryEl);
  }

  // Timeline
  const timeline = plan.timeline || [];
  if (timeline.length > 0) {
    const timelineEl = document.createElement('div');
    timelineEl.className = 'timeline';

    timeline.forEach((phase, i) => {
      const actionsHtml = (phase.actions || [])
        .map(a => `<li>${a}</li>`)
        .join('');

      const phaseEl = document.createElement('div');
      phaseEl.className = 'timeline-phase';
      phaseEl.innerHTML = `
        <div class="timeline-dot dot-${i}"></div>
        <div class="timeline-content">
          <div class="timeline-phase-name">${phase.phase}</div>
          <ul class="timeline-actions">${actionsHtml}</ul>
        </div>
      `;
      timelineEl.appendChild(phaseEl);
    });

    pane.appendChild(timelineEl);
  }

  // Job strategy
  if (plan.job_strategy) {
    const jobEl = document.createElement('div');
    jobEl.className = 'life-strategy-block';
    jobEl.innerHTML = `
      <h4>Job Strategy</h4>
      <p>${plan.job_strategy}</p>
    `;
    pane.appendChild(jobEl);
  }

  // Grad school advice
  if (plan.grad_school_advice) {
    const gradEl = document.createElement('div');
    gradEl.className = 'life-strategy-block';
    gradEl.innerHTML = `
      <h4>Grad School Advice</h4>
      <p>${plan.grad_school_advice}</p>
    `;
    pane.appendChild(gradEl);
  }
}

/* ══════════════════════════════════════════════════════════════════
   OUTCOMES — Report Your Acceptance (Demo Feature)
══════════════════════════════════════════════════════════════════ */

function addOutcomesFAB() {
  // Remove existing FAB if any
  const existing = document.getElementById('outcomes-fab-btn');
  if (existing) existing.remove();

  const fab = document.createElement('button');
  fab.id        = 'outcomes-fab-btn';
  fab.className = 'outcomes-fab';
  fab.textContent = '🎉 Report Your Acceptance';
  fab.addEventListener('click', openOutcomesModal);
  document.body.appendChild(fab);
}

function setupOutcomesModal() {
  document.getElementById('btn-modal-cancel')?.addEventListener('click', closeOutcomesModal);
  document.getElementById('btn-modal-submit')?.addEventListener('click', submitOutcome);
  document.getElementById('outcomes-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeOutcomesModal();
  });
}

function openOutcomesModal() {
  populateOutcomeSchoolSelect();
  document.getElementById('outcomes-modal')?.classList.remove('hidden');

  // Pre-fill with current student data if available
  const nameEl  = document.getElementById('outcome-name');
  const majorEl = document.getElementById('outcome-major');
  const gpaEl   = document.getElementById('outcome-gpa');
  if (nameEl  && student.name)  nameEl.value  = student.name;
  if (majorEl && student.major) majorEl.value = student.major;
  if (gpaEl   && student.gpa)   gpaEl.value   = student.gpa;
}

function closeOutcomesModal() {
  document.getElementById('outcomes-modal')?.classList.add('hidden');
}

async function submitOutcome() {
  const nameEl   = document.getElementById('outcome-name');
  const majorEl  = document.getElementById('outcome-major');
  const gpaEl    = document.getElementById('outcome-gpa');
  const schoolEl = document.getElementById('outcome-school');

  const name       = nameEl?.value.trim();
  const major      = majorEl?.value.trim();
  const gpa        = parseFloat(gpaEl?.value);
  const schoolId   = schoolEl?.value;
  const schoolName = schoolEl?.options[schoolEl.selectedIndex]?.text;

  if (!name || !major || !gpa || !schoolId) {
    showToast('Please fill in all fields.', 3000);
    return;
  }

  const submitBtn = document.getElementById('btn-modal-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

  const result = await saveOutcome({
    studentName:  name,
    studentMajor: major,
    studentGpa:   gpa,
    schoolId,
    schoolName,
    accepted:     true,
    year:         new Date().getFullYear()
  });

  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit ✓'; }
  closeOutcomesModal();
  showToast(`🎉 Congrats ${name}! Your acceptance to ${schoolName} has been recorded!`, 5000);
}

/* ══════════════════════════════════════════════════════════════════
   REALTIME OUTCOMES FEED (Supabase)
══════════════════════════════════════════════════════════════════ */

function startRealtimeFeed() {
  subscribeToOutcomes(row => {
    if (row.accepted) {
      showToast(
        `🔴 Live: ${row.student_name} from IVC just reported getting into ${row.school_name}!`,
        6000
      );
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════════════════════ */

function showToast(message, duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className   = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.add('exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    // Safety fallback
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/* ══════════════════════════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════════════════════════ */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
