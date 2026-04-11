/**
 * onboarding.js
 * Onboarding flow for Laser2Uni: tooltips, step navigation, form collection.
 * Owner: UI person
 *
 * Depends on: state.js (student, currentStep, EXTRACURRICULAR_MAP, getMajorGroup)
 */

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

const CAL_GETC_AREAS = [
  'Area 1A – English Composition',
  'Area 1B – Critical Thinking & Composition',
  'Area 1C – Oral Communication',
  'Area 2 – Mathematical Concepts & Quantitative Reasoning',
  'Area 3A – Arts',
  'Area 3B – Humanities',
  'Area 4 – Social & Behavioral Sciences',
  'Area 5A – Physical Sciences',
  'Area 5B – Biological Sciences',
  'Area 5C – Laboratory Activity',
  'Area 6 – Ethnic Studies'
];

function setupOnboarding() {
  // GPA text input live validation
  const gpaInput = document.getElementById('input-gpa');
  if (gpaInput) {
    gpaInput.addEventListener('blur', () => {
      const val = parseFloat(gpaInput.value);
      if (!isNaN(val)) {
        gpaInput.value = Math.min(4.0, Math.max(1.5, val)).toFixed(2);
      }
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

  // IGETC pill: show/hide Cal-GETC areas when "In Progress" selected
  const igetcGroup = document.querySelector('.pill-group[data-key="igetc"]');
  if (igetcGroup) {
    igetcGroup.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const wrap = document.getElementById('calgetc-areas-wrap');
        if (!wrap) return;
        if (pill.dataset.val === 'In Progress') {
          wrap.classList.remove('hidden');
        } else {
          wrap.classList.add('hidden');
          wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
      });
    });
  }

  // Major change: re-render extracurricular pills
  document.getElementById('input-major')?.addEventListener('change', e => {
    renderExtracurricularPills(e.target.value);
  });

  // Render default extracurricular pills on init
  renderExtracurricularPills('');

  // Nav buttons
  document.getElementById('btn-ob-next').addEventListener('click', advanceStep);
  document.getElementById('btn-ob-back').addEventListener('click', retreatStep);

  updateStepUI();
}

/**
 * renderExtracurricularPills()
 * Clears and re-renders extracurricular pills based on major group.
 */
function renderExtracurricularPills(major) {
  const group = document.getElementById('extracurricular-pill-group');
  if (!group) return;

  const options = EXTRACURRICULAR_MAP[getMajorGroup(major)] || EXTRACURRICULAR_MAP['default'];
  group.innerHTML = '';

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className    = 'pill';
    btn.dataset.val  = opt;
    btn.textContent  = opt;
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
    group.appendChild(btn);
  });
}

/* ── Step navigation ──────────────────────────────────────────── */

function advanceStep() {
  if (!validateStep(currentStep)) return;
  collectStep(currentStep);
  if (currentStep < 3) {
    currentStep++;
    updateStepUI();
  } else {
    collectStep(3);
    saveOnboarding(currentUserId, student); // fire-and-forget
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
  for (let i = 0; i <= 3; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.toggle('hidden', i !== currentStep);
  }

  const pct  = ((currentStep + 1) / 4) * 100;
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct + '%';

  const lbl = document.getElementById('step-indicator');
  if (lbl) lbl.textContent = `Step ${currentStep + 1} of 4`;

  const backBtn = document.getElementById('btn-ob-back');
  if (backBtn) backBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';

  const nextBtn = document.getElementById('btn-ob-next');
  if (nextBtn) nextBtn.textContent = currentStep === 3 ? 'Find My Schools →' : currentStep === 0 ? 'Get Started →' : 'Next →';
}

/* ── Validation ───────────────────────────────────────────────── */

function validateStep(step) {
  if (step === 0) {
    const name  = document.getElementById('input-name')?.value.trim();
    const major = document.getElementById('input-major')?.value;
    if (!name)  { showToast('Please enter your first name.', 3000);      return false; }
    if (!major) { showToast('Please select your intended major.', 3000); return false; }
  }
  if (step === 1) {
    const gpaVal = parseFloat(document.getElementById('input-gpa')?.value);
    const units  = getSelectedPills('units');
    const igetc  = getSelectedPills('igetc');
    const honors = getSelectedPills('honors');
    if (isNaN(gpaVal) || gpaVal < 1.5 || gpaVal > 4.0) {
      showToast('Please enter a GPA between 1.5 and 4.0.', 3000); return false;
    }
    if (units.length === 0)  { showToast('Please select units completed.', 3000);        return false; }
    if (igetc.length === 0)  { showToast('Please select your IGETC status.', 3000);      return false; }
    if (honors.length === 0) { showToast('Please select your IVC Honors status.', 3000); return false; }
  }
  if (step === 2) {
    const career = document.getElementById('input-career')?.value.trim();
    if (!career) { showToast('Please describe your career goals.', 3000); return false; }
  }
  return true;
}

/* ── Data collection ──────────────────────────────────────────── */

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
    // Collect Cal-GETC areas completed (only relevant if "In Progress")
    student.igetcCompleted = Array.from(
      document.querySelectorAll('#calgetc-areas-wrap input[type="checkbox"]:checked')
    ).map(cb => cb.value);
  }
  if (step === 2) {
    student.career          = document.getElementById('input-career')?.value.trim() || '';
    student.industries      = getSelectedPills('industries');
    student.grad            = getSelectedPills('grad')[0] || '';
    student.extracurriculars = getSelectedPills('extracurriculars');
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
