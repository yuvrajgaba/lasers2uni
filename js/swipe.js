/**
 * swipe.js
 * Swipe engine for Laser2Uni: drag gestures, card rendering, fit bar, loading, dashboard transition.
 * Owner: UI person
 *
 * Depends on: state.js, onboarding.js, schools.js, scoring.js, ai.js, supabase.js
 */

/* ── Drag state ───────────────────────────────────────────────── */
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

/* ── Loading messages state ───────────────────────────────────── */
const LOADING_MESSAGES = [
  'Analyzing your preferences…',
  'Tiering schools by reach, match, and safety…',
  'Pulling transfer requirements and IVC pathways…',
  'Drafting your personalized life plan…',
  'Almost ready  -  putting it all together…'
];

let loadingInterval = null;
let loadingMsgIndex = 0;

/* ══════════════════════════════════════════════════════════════════
   SWIPE ENGINE
══════════════════════════════════════════════════════════════════ */

function startSwiping() {
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

  const DIST = window.innerWidth + 200;
  let tx = 0, ty = 0, rot = 0;
  if (direction === 'right') { tx =  DIST; rot =  30; showStamp(card, 'like'); }
  if (direction === 'left')  { tx = -DIST; rot = -30; showStamp(card, 'pass'); }
  if (direction === 'up')    { ty = -(window.innerHeight + 200); showStamp(card, 'skip'); }

  card.style.transition = 'transform 0.4s ease';
  card.style.transform  = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;

  performSwipe(direction);
}

/* ── Drag system ──────────────────────────────────────────────── */

/**
 * cleanDrag()
 * Removes all document-level drag listeners and resets drag state.
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
 */
function attachDrag(card) {
  cleanDrag();
  activeCardEl = card;

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
  dragStartX   = pt.clientX;
  dragStartY   = pt.clientY;
  dragCurrentX = 0;
  dragCurrentY = 0;
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

  if      (dragCurrentX >  SWIPE_X_THRESHOLD) flyOut(activeCardEl, 'right');
  else if (dragCurrentX < -SWIPE_X_THRESHOLD) flyOut(activeCardEl, 'left');
  else if (dragCurrentY <  SWIPE_Y_THRESHOLD) flyOut(activeCardEl, 'up');
  else {
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

/* ── Card visual helpers ──────────────────────────────────────── */

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

/* ── Swipe outcome recording ──────────────────────────────────── */

function performSwipe(direction) {
  if (swipeInProgress) return;
  swipeInProgress = true;

  setTimeout(() => {
    const item = deck[deckIndex];
    if (item) {
      if      (direction === 'right') likedItems  .push(item);
      else if (direction === 'left')  passedItems .push(item);
      else                            skippedItems.push(item);
      saveSwipe(currentUserId, item.school.id, direction); // fire-and-forget
    }

    swipeCount++;
    deckIndex++;

    cleanDrag();
    updateSwipeHeader();

    const doneBtn = document.getElementById('btn-done-swiping');
    if (swipeCount >= 5 && doneBtn) doneBtn.classList.remove('hidden');

    if (deckIndex >= deck.length) {
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

/* ── Card rendering ───────────────────────────────────────────── */

function renderCardStack() {
  const stack = document.getElementById('card-stack');
  if (!stack) return;
  stack.innerHTML = '';

  const slice  = deck.slice(deckIndex, deckIndex + 3);
  const layers = ['card-top', 'card-mid', 'card-bot'];

  for (let i = slice.length - 1; i >= 0; i--) {
    const item = slice[i];
    const card = buildCardElement(item, layers[i]);
    stack.appendChild(card);
  }

  const topCard = stack.querySelector('.card-top');
  if (topCard) attachDrag(topCard);

  if (slice[0]) updateFitBar(slice[0]);
}

function buildCardElement(item, posClass) {
  const { school, score: s, fit } = item;
  const typeClass = school.type.toLowerCase().replace(' ', '-');

  const card = document.createElement('div');
  card.className       = `card ${posClass}`;
  card.dataset.schoolId = school.id;

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
      <div class="card-emoji">
        ${school.logo
          ? `<img src="${school.logo}" alt="${school.name}" class="school-logo-img" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none">${school.emoji}</span>`
          : school.emoji}
      </div>
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

/* ── Loading messages ─────────────────────────────────────────── */

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

/* ── Finish swiping → generate dashboard ─────────────────────── */

async function finishSwiping() {
  showScreen('screen-loading');

  let pool = likedItems.length > 0 ? likedItems : deck.slice(0, 8);

  startLoadingMessages();

  // Fetch outcomes for top schools in the pool
  const outcomesData = await Promise.all(
    pool.slice(0, 8).map(async item => ({
      schoolId:   item.school.id,
      schoolName: item.school.name,
      outcomes:   await getSimilarStudentOutcomes(student.gpa, item.school.id)
    }))
  ).catch(() => []);

  // Build outcomesMap and re-score pool with real data
  const outcomesMap = {};
  outcomesData.forEach(d => { outcomesMap[d.schoolId] = d.outcomes; });
  pool = pool.map(item => ({
    ...item,
    score: score(item.school, student, outcomesMap),
    fit:   fitLabel(score(item.school, student, outcomesMap))
  }));

  // Build all three ranking views
  prestigeList  = buildPrestigeRanking(pool);
  fitList       = buildFitRanking(pool);
  balancedList  = buildBalancedRanking(pool);

  aiData = await generateAIContent(student, balancedList, outcomesData);

  await delay(600);

  buildDashboard(prestigeList, fitList, balancedList);
  showScreen('screen-dashboard');
}
