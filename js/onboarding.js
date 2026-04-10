/**
 * onboarding.js
 * Onboarding flow for Laser2Uni: tooltips, step navigation, form collection.
 * Owner: UI person
 *
 * Depends on: state.js
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
  const pct  = ((currentStep + 1) / 4) * 100;
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
    if (!name)  { showToast('Please enter your first name.', 3000);      return false; }
    if (!major) { showToast('Please select your intended major.', 3000); return false; }
  }
  if (step === 1) {
    const units  = getSelectedPills('units');
    const igetc  = getSelectedPills('igetc');
    const honors = getSelectedPills('honors');
    if (units.length === 0)  { showToast('Please select units completed.', 3000);          return false; }
    if (igetc.length === 0)  { showToast('Please select your IGETC status.', 3000);        return false; }
    if (honors.length === 0) { showToast('Please select your IVC Honors status.', 3000);   return false; }
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
