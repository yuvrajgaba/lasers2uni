/**
 * outcomes.js
 * Outcomes modal + realtime feed for Laser2Uni.
 *
 * NOTE: Run this in Supabase SQL Editor before deploying:
 *   ALTER TABLE outcomes ADD COLUMN IF NOT EXISTS advice text;
 */

function addOutcomesFAB() {
  const existing = document.getElementById('outcomes-fab-btn');
  if (existing) existing.remove();

  const fab = document.createElement('button');
  fab.id          = 'outcomes-fab-btn';
  fab.className   = 'outcomes-fab';
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

  const nameEl  = document.getElementById('outcome-name');
  const majorEl = document.getElementById('outcome-major');
  const gpaEl   = document.getElementById('outcome-gpa');
  if (nameEl  && student.name)  nameEl.value  = student.name;
  if (majorEl && student.major) majorEl.value = student.major;
  if (gpaEl   && student.gpa)   gpaEl.value   = student.gpa;
}

function closeOutcomesModal() {
  document.getElementById('outcomes-modal')?.classList.add('hidden');
  // Clear advice field on close
  const advEl = document.getElementById('outcome-advice');
  if (advEl) advEl.value = '';
}

async function submitOutcome() {
  const name   = document.getElementById('outcome-name')?.value.trim();
  const major  = document.getElementById('outcome-major')?.value.trim();
  const gpa    = parseFloat(document.getElementById('outcome-gpa')?.value);
  const advice = (document.getElementById('outcome-advice')?.value || '').trim();

  const checkedBoxes = Array.from(
    document.querySelectorAll('#outcome-school-list input[name="outcome-school"]:checked')
  );

  if (!name || !major || !gpa) {
    showToast('Please fill in your name, major, and GPA.', 3000);
    return;
  }
  if (checkedBoxes.length === 0) {
    showToast('Please select at least one school.', 3000);
    return;
  }

  const submitBtn = document.getElementById('btn-modal-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

  const year        = new Date().getFullYear();
  const schoolNames = [];

  for (const cb of checkedBoxes) {
    const schoolId   = cb.value;
    const schoolName = cb.nextElementSibling?.textContent?.replace(/^\S+\s/, '') || schoolId;
    schoolNames.push(schoolName);

    await saveOutcome({
      studentName:  name,
      studentMajor: major,
      studentGpa:   gpa,
      schoolId,
      schoolName,
      accepted: true,
      year,
      advice: advice || null
    });
  }

  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit ✓'; }
  closeOutcomesModal();

  const schoolList = schoolNames.join(', ');
  showToast(`🎉 Congrats ${name}! Acceptances to ${schoolList} recorded!`, 5000);
}

/* ══════════════════════════════════════════════════════════════════
   REALTIME FEED — updates Community tab badge instead of toast
══════════════════════════════════════════════════════════════════ */

function startRealtimeFeed() {
  subscribeToOutcomes(row => {
    if (!row.accepted) return;

    // Badge on Community tab
    const tabBtn = document.querySelector('[data-tab="community"]');
    if (tabBtn) {
      let badge = tabBtn.querySelector('.tab-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'tab-badge';
        tabBtn.appendChild(badge);
      }
      badge.textContent = (parseInt(badge.textContent) || 0) + 1;
    }
  });
}
