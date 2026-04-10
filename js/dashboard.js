/**
 * dashboard.js
 * Dashboard rendering for Laser2Uni: Schools, Requirements, and Life Plan tabs.
 * Owner: UI person
 *
 * Depends on: state.js
 */

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════════ */

function buildDashboard() {
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

/* ── Tab switching ────────────────────────────────────────────── */

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

/* ── Schools tab ──────────────────────────────────────────────── */

function renderSchoolsTab() {
  const pane = document.getElementById('tab-schools');
  if (!pane) return;
  pane.innerHTML = '';

  const tierConfig = [
    { key: 'reach',  label: 'Reach',  headClass: 'reach-head',  admitClass: 'reach'  },
    { key: 'match',  label: '50-50',  headClass: 'match-head',  admitClass: 'match'  },
    { key: 'safety', label: 'Safety', headClass: 'safety-head', admitClass: 'safety' }
  ];

  tierConfig.forEach(({ key, label, headClass, admitClass }) => {
    const schools = tiers[key];
    if (!schools || schools.length === 0) return;

    const section = document.createElement('div');
    section.className = 'tier-section';

    const heading = document.createElement('div');
    heading.className   = `tier-heading ${headClass}`;
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
  const typeClass = school.type.toLowerCase().replace(/ /g, '-');
  const schoolAI  = aiData?.schools?.[school.id] || {};

  const admitLabels = { reach: 'Reach', match: '50-50', safety: 'Safety' };

  const card = document.createElement('div');
  card.className = 'school-card';

  const projectsHtml = (schoolAI.projects || [])
    .map(p => `<li>${p}</li>`)
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

  card.querySelector('.school-card-header').addEventListener('click', () => {
    card.classList.toggle('expanded');
  });

  return card;
}

/* ── Requirements tab ─────────────────────────────────────────── */

function renderRequirementsTab() {
  const pane = document.getElementById('tab-requirements');
  if (!pane) return;
  pane.innerHTML = '';

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
    const req       = aiData?.schools?.[school.id]?.transfer_requirements || {};
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

/* ── Life Plan tab ────────────────────────────────────────────── */

function renderLifePlanTab() {
  const pane = document.getElementById('tab-life-plan');
  if (!pane) return;
  pane.innerHTML = '';

  const plan = aiData?.life_plan || {};

  if (plan.summary) {
    const summaryEl = document.createElement('div');
    summaryEl.className   = 'life-summary';
    summaryEl.textContent = plan.summary;
    pane.appendChild(summaryEl);
  }

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

  if (plan.job_strategy) {
    const jobEl = document.createElement('div');
    jobEl.className = 'life-strategy-block';
    jobEl.innerHTML = `
      <h4>Job Strategy</h4>
      <p>${plan.job_strategy}</p>
    `;
    pane.appendChild(jobEl);
  }

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
