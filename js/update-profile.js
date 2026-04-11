/**
 * update-profile.js
 * Slide-up panel that lets the student edit their profile after reaching the dashboard,
 * then re-runs rankings + AI and rebuilds the dashboard.
 */

function setupUpdateProfilePanel() {
  const fab      = document.getElementById('btn-open-update');
  const panel    = document.getElementById('update-profile-panel');
  const btnClose = document.getElementById('btn-update-close');
  const btnCancel = document.getElementById('btn-update-cancel');
  const btnSave  = document.getElementById('btn-update-save');
  if (!fab || !panel) return;

  fab.addEventListener('click', () => {
    renderUpdateForm();
    panel.classList.remove('hidden');
  });

  const close = () => panel.classList.add('hidden');
  btnClose.addEventListener('click', close);
  btnCancel.addEventListener('click', close);

  btnSave.addEventListener('click', async () => {
    const changes = readUpdateForm();
    if (!changes) return;
    // Merge into the global student
    Object.assign(student, changes);
    close();
    showToast('Re-running your matches with your updated profile…', 3500);
    await rerunWithUpdatedProfile();
  });

  // Show the FAB once the dashboard screen becomes visible
  const dash = document.getElementById('screen-dashboard');
  if (dash) {
    const obs = new MutationObserver(() => {
      if (!dash.classList.contains('hidden')) fab.classList.add('visible');
      else fab.classList.remove('visible');
    });
    obs.observe(dash, { attributes: true, attributeFilter: ['class'] });
  }
}

function renderUpdateForm() {
  const body = document.getElementById('update-panel-body');
  if (!body || typeof student === 'undefined' || !student) return;

  const ecList = (student.extracurriculars || []).join(', ');

  body.innerHTML = `
    <label class="field-label">First Name</label>
    <input type="text" id="up-name" class="text-input" value="${attr(student.name)}" />

    <label class="field-label">Major</label>
    <input type="text" id="up-major" class="text-input" value="${attr(student.major)}" />

    <label class="field-label">GPA</label>
    <input type="text" id="up-gpa" class="text-input" value="${attr(student.gpa)}" inputmode="decimal" />

    <label class="field-label">Units Completed</label>
    <div class="pill-group" id="up-units" data-multi="false">
      ${pillOptions(['30–45','45–60','60+'], student.units)}
    </div>

    <label class="field-label">IGETC Status</label>
    <div class="pill-group" id="up-igetc" data-multi="false">
      ${pillOptions(['Completed','In Progress','Not Started',"Don't Know"], student.igetc)}
    </div>

    <label class="field-label">IVC Honors</label>
    <div class="pill-group" id="up-honors" data-multi="false">
      ${pillOptions(['Yes  -  actively enrolled','Interested, not yet','Not in honors'], student.honors)}
    </div>

    <label class="field-label">Campus Size</label>
    <div class="pill-group" id="up-size" data-multi="false">
      ${pillOptions(['Large','Medium','Small','No preference'], student.size)}
    </div>

    <label class="field-label">Preferred Region <span class="muted-hint">(pick all that apply)</span></label>
    <div class="pill-group" id="up-regions" data-multi="true">
      ${pillOptions(['SoCal','NorCal / Bay Area','No Preference'], student.regions)}
    </div>

    <label class="field-label">Priorities <span class="muted-hint">(pick all that apply)</span></label>
    <div class="pill-group" id="up-priorities" data-multi="true">
      ${pillOptions([
        'Research opportunities','Industry connections','Cost/financial aid','Prestige/rankings',
        'Social life','Diversity','Job placement rate','Staying close to home'
      ], student.priorities)}
    </div>

    <label class="field-label">Extracurriculars <span class="muted-hint">(comma separated)</span></label>
    <textarea id="up-ecs" class="text-area" rows="2">${escapeAttr(ecList)}</textarea>

    <label class="field-label">Career Goals</label>
    <textarea id="up-career" class="text-area" rows="2">${escapeAttr(student.career)}</textarea>

    <p class="muted-hint" style="margin-top:14px">
      Saving will re-run your rankings and regenerate AI insights. Your swipe list is preserved.
    </p>
  `;

  // Wire up pill groups inside the panel
  body.querySelectorAll('.pill-group .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.pill-group');
      const multi = group.dataset.multi === 'true';
      if (multi) btn.classList.toggle('active');
      else {
        group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });
}

function pillOptions(values, current) {
  const isArray = Array.isArray(current);
  return values.map(v => {
    const active = isArray ? current.includes(v) : (current === v);
    return `<button class="pill ${active ? 'active' : ''}" data-val="${attr(v)}">${escapeAttr(v)}</button>`;
  }).join('');
}

function readUpdateForm() {
  const name   = (document.getElementById('up-name')?.value  || '').trim();
  const major  = (document.getElementById('up-major')?.value || '').trim();
  const gpaStr = (document.getElementById('up-gpa')?.value   || '').trim();
  const career = (document.getElementById('up-career')?.value || '').trim();
  const ecText = (document.getElementById('up-ecs')?.value   || '').trim();

  const units    = groupSingle('up-units');
  const igetc    = groupSingle('up-igetc');
  const honors   = groupSingle('up-honors');
  const size     = groupSingle('up-size');
  const regions  = groupMulti('up-regions');
  const priorities = groupMulti('up-priorities');

  const extracurriculars = ecText ? ecText.split(',').map(s => s.trim()).filter(Boolean) : [];

  return {
    name, major,
    gpa: gpaStr,
    units, igetc, honors, size, regions, priorities,
    extracurriculars,
    career
  };
}

function groupSingle(id) {
  const group = document.getElementById(id);
  if (!group) return null;
  const active = group.querySelector('.pill.active');
  return active ? active.dataset.val : null;
}
function groupMulti(id) {
  const group = document.getElementById(id);
  if (!group) return [];
  return Array.from(group.querySelectorAll('.pill.active')).map(el => el.dataset.val);
}

/**
 * rerunWithUpdatedProfile()
 * Re-scores the current pool with the updated student, rebuilds rankings,
 * regenerates AI content, and rebuilds the dashboard.
 */
async function rerunWithUpdatedProfile() {
  try {
    showScreen('screen-loading');
    if (typeof startLoadingMessages === 'function') startLoadingMessages();

    // Start from a pool — prefer liked items, else top of the deck
    let pool;
    if (typeof likedItems !== 'undefined' && Array.isArray(likedItems) && likedItems.length > 0) {
      pool = likedItems.slice();
    } else if (typeof deck !== 'undefined' && Array.isArray(deck) && deck.length > 0) {
      pool = deck.slice(0, 10);
    } else {
      pool = SCHOOLS.slice(0, 10).map(school => ({ school, score: 0, fit: fitLabel(0) }));
    }

    // Fetch outcomes for top pool items
    let outcomesMap = {};
    let outcomesData = [];
    if (typeof getSimilarStudentOutcomes === 'function') {
      outcomesData = await Promise.all(
        pool.slice(0, 8).map(async item => ({
          schoolId:   item.school.id,
          schoolName: item.school.name,
          outcomes:   await getSimilarStudentOutcomes(student.gpa, item.school.id)
        }))
      ).catch(() => []);
      outcomesData.forEach(d => { outcomesMap[d.schoolId] = d.outcomes; });
    }

    // Re-score the pool with the updated student
    pool = pool.map(item => ({
      ...item,
      score: score(item.school, student, outcomesMap),
      fit:   fitLabel(score(item.school, student, outcomesMap))
    }));

    prestigeList = buildPrestigeRanking(pool);
    fitList      = buildFitRanking(pool);
    balancedList = buildBalancedRanking(pool);

    if (typeof generateAIContent === 'function') {
      aiData = await generateAIContent(student, balancedList, outcomesData);
    }

    buildDashboard(prestigeList, fitList, balancedList);
    showScreen('screen-dashboard');
    showToast('Your matches have been updated.', 3000);

    // Persist the updated onboarding
    if (typeof saveOnboarding === 'function' && typeof currentUserId !== 'undefined' && currentUserId) {
      saveOnboarding(currentUserId, student);
    }
  } catch (err) {
    console.error('[update-profile] rerun failed:', err);
    showScreen('screen-dashboard');
    showToast('Could not rerun matches. Please try again.', 3500);
  }
}

/* ─── tiny helpers ─── */
function attr(v) {
  if (v == null) return '';
  return String(v).replace(/"/g, '&quot;');
}
function escapeAttr(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
