/**
 * dashboard.js
 * Dashboard rendering for Laser2Uni: Schools, Requirements, and Your Path tabs.
 * Owner: UI person
 *
 * Depends on: state.js (student, tiers, aiData, EXTRACURRICULAR_MAP, getMajorGroup),
 *             supabase.js, courses.js
 */

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════════════ */

function buildDashboard() {
  const chip = document.getElementById('student-chip');
  if (chip) {
    chip.textContent = `${student.name} · ${student.major} · ${student.gpa} GPA`;
  }

  renderSchoolsTab();
  renderRequirementsTab();
  renderYourPathTab();
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

/* ══════════════════════════════════════════════════════════════════
   SCHOOLS TAB
══════════════════════════════════════════════════════════════════ */

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

  // Async: inject social proof badge after render (non-blocking)
  getSimilarStudentOutcomes(parseFloat(student.gpa), school.id).then(outcomes => {
    if (!outcomes || outcomes.length === 0) return;
    const chips = card.querySelector('.school-card-chips');
    if (chips) {
      const badge = document.createElement('span');
      badge.style.cssText = `
        font-size: 0.7rem;
        font-weight: 600;
        padding: 3px 9px;
        border-radius: 99px;
        background: rgba(61,232,160,0.15);
        color: var(--accent3);
        margin-right: 4px;
        white-space: nowrap;
      `;
      badge.textContent = `${outcomes.length} similar student${outcomes.length > 1 ? 's' : ''} got in`;
      chips.insertBefore(badge, chips.firstChild);
    }
  }).catch(() => {});

  return card;
}

/* ══════════════════════════════════════════════════════════════════
   REQUIREMENTS TAB — Course Checklist
══════════════════════════════════════════════════════════════════ */

function renderRequirementsTab() {
  const pane = document.getElementById('tab-requirements');
  if (!pane) return;
  pane.innerHTML = '';

  const note = document.createElement('div');
  note.className = 'req-note';
  note.innerHTML = `Always verify course articulation at <a href="https://www.assist.org" target="_blank" rel="noopener">assist.org</a>. Check off courses as you complete them — your progress saves automatically.`;
  pane.appendChild(note);

  const allTiered = [
    ...tiers.reach .map(x => ({ ...x, tier: 'reach'  })),
    ...tiers.match .map(x => ({ ...x, tier: 'match'  })),
    ...tiers.safety.map(x => ({ ...x, tier: 'safety' }))
  ];

  allTiered.forEach(({ school }) => {
    const typeClass  = school.type.toLowerCase().replace(/ /g, '-');
    const schoolData = (typeof COURSE_REQUIREMENTS !== 'undefined')
      ? COURSE_REQUIREMENTS?.[school.id]?.[student.major]
      : null;

    const block = document.createElement('div');
    block.className = 'req-school-block';

    // School header
    block.innerHTML = `
      <div class="req-school-name">
        <div class="school-card-stripe ${typeClass}" style="position:relative;width:4px;height:20px;border-radius:2px;flex-shrink:0"></div>
        ${school.emoji} ${school.name}
        <span style="font-size:0.75rem;color:var(--muted);font-weight:400;margin-left:auto">${school.loc}</span>
      </div>
    `;

    if (schoolData && schoolData.sections) {
      // ── Checklist mode ──────────────────────────────────────────
      const allCourses = schoolData.sections.flatMap(s => s.courses);
      const total      = allCourses.length;
      let   completed  = 0;

      // Counter
      const counter = document.createElement('div');
      counter.className = 'checklist-counter';
      counter.id        = `counter-${school.id}`;
      counter.textContent = `0 / ${total} courses completed`;
      block.appendChild(counter);

      schoolData.sections.forEach(section => {
        const sectionEl = document.createElement('div');
        sectionEl.className = 'checklist-section';

        const titleEl = document.createElement('div');
        titleEl.className   = 'checklist-section-title';
        titleEl.textContent = section.title;
        sectionEl.appendChild(titleEl);

        section.courses.forEach(course => {
          const row = document.createElement('div');
          row.className       = 'course-row';
          row.dataset.key     = course.key;

          const cb = document.createElement('input');
          cb.type        = 'checkbox';
          cb.id          = `cb-${course.key}`;
          cb.className   = 'course-checkbox';
          cb.dataset.school = school.id;
          cb.dataset.major  = student.major;
          cb.dataset.key    = course.key;

          const lbl = document.createElement('label');
          lbl.htmlFor = cb.id;
          lbl.innerHTML = `
            <span class="course-label">${course.label}</span>
            <span class="course-note">${course.note}</span>
          `;

          // Apply completed style
          const applyChecked = (checked) => {
            row.classList.toggle('course-completed', checked);
          };

          cb.addEventListener('change', () => {
            applyChecked(cb.checked);
            // Update counter
            const checked = block.querySelectorAll('.course-checkbox:checked').length;
            const counterEl = document.getElementById(`counter-${school.id}`);
            if (counterEl) counterEl.textContent = `${checked} / ${total} courses completed`;
            // Save to Supabase (guests skip)
            saveCourseProgress(currentUserId, school.id, student.major, course.key, cb.checked);
          });

          row.appendChild(cb);
          row.appendChild(lbl);
          sectionEl.appendChild(row);
        });

        block.appendChild(sectionEl);
      });

      // Restore saved progress from window.savedCourseProgress (returning users)
      if (window.savedCourseProgress && window.savedCourseProgress.length > 0) {
        window.savedCourseProgress.forEach(row => {
          if (row.school_id === school.id && row.major === student.major && row.completed) {
            const cb = block.querySelector(`input[data-key="${row.course_key}"]`);
            if (cb) {
              cb.checked = true;
              cb.closest('.course-row')?.classList.add('course-completed');
              completed++;
            }
          }
        });
        const counterEl = document.getElementById(`counter-${school.id}`);
        if (counterEl && completed > 0) {
          counterEl.textContent = `${completed} / ${total} courses completed`;
        }
      } else if (!currentUserId?.startsWith('guest_') && !currentUserId?.startsWith('local_')) {
        // Live fetch for users whose progress wasn't pre-fetched
        getCourseProgress(currentUserId, school.id, student.major).then(rows => {
          rows.forEach(row => {
            if (row.completed) {
              const cb = block.querySelector(`input[data-key="${row.course_key}"]`);
              if (cb) {
                cb.checked = true;
                cb.closest('.course-row')?.classList.add('course-completed');
              }
            }
          });
          const checked   = block.querySelectorAll('.course-checkbox:checked').length;
          const counterEl = document.getElementById(`counter-${school.id}`);
          if (counterEl) counterEl.textContent = `${checked} / ${total} courses completed`;
        });
      }

    } else {
      // ── Fallback: AI-generated requirements table ────────────────
      const req = aiData?.schools?.[school.id]?.transfer_requirements || {};
      const coursesHtml = (req.required_courses || [])
        .map(c => `<span>${c}</span>`)
        .join('');

      const table = document.createElement('table');
      table.className = 'req-table';
      table.innerHTML = `
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
      `;
      block.appendChild(table);
    }

    pane.appendChild(block);
  });
}

/* ══════════════════════════════════════════════════════════════════
   YOUR PATH TAB (renamed from Life Plan)
══════════════════════════════════════════════════════════════════ */

async function renderYourPathTab() {
  const pane = document.getElementById('tab-your-path');
  if (!pane) return;
  pane.innerHTML = '';

  // ── Social proof: Students Like You ─────────────────────────
  try {
    const rows = await getRecentOutcomes(20);
    if (rows && rows.length > 0) {
      const gpa     = parseFloat(student.gpa);
      const matching = rows.filter(r =>
        r.student_major === student.major &&
        Math.abs(r.student_gpa - gpa) <= 0.3
      );
      if (matching.length > 0) {
        const section = document.createElement('div');
        section.innerHTML = `
          <div style="font-weight:700;font-size:1rem;color:var(--text);margin-bottom:4px">
            Students Like You
          </div>
          <div style="font-size:0.82rem;color:var(--muted);margin-bottom:12px">
            IVC students with similar profiles who got accepted:
          </div>
        `;
        matching.forEach(r => {
          const card = document.createElement('div');
          card.style.cssText = `
            background: var(--surface2);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 10px 14px;
            font-size: 0.85rem;
            color: var(--text);
            margin-bottom: 6px;
            line-height: 1.4;
          `;
          card.innerHTML = `${r.student_name} (GPA ${r.student_gpa}, ${r.student_major}) → admitted to <span style="color:var(--accent3)">${r.school_name}</span> (${r.year})`;
          section.appendChild(card);
        });
        section.style.marginBottom = '24px';
        pane.appendChild(section);
      }
    }
  } catch (_) {}

  // ── Extracurricular recommendations ─────────────────────────
  renderExtracurricularRecommendations(pane);

  // ── AI life plan content ─────────────────────────────────────
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
    jobEl.innerHTML = `<h4>Job Strategy</h4><p>${plan.job_strategy}</p>`;
    pane.appendChild(jobEl);
  }

  if (plan.grad_school_advice) {
    const gradEl = document.createElement('div');
    gradEl.className = 'life-strategy-block';
    gradEl.innerHTML = `<h4>Grad School Advice</h4><p>${plan.grad_school_advice}</p>`;
    pane.appendChild(gradEl);
  }
}

/**
 * renderExtracurricularRecommendations()
 * Shows what the student is already doing and what they should add,
 * based on their major group and selected extracurriculars.
 */
function renderExtracurricularRecommendations(pane) {
  const majorGroup = getMajorGroup(student.major);
  const allOptions = EXTRACURRICULAR_MAP[majorGroup] || EXTRACURRICULAR_MAP['default'];
  const existing   = student.extracurriculars || [];
  const suggestions = allOptions.filter(e => !existing.includes(e));

  const section = document.createElement('div');
  section.style.cssText = 'display:flex;flex-direction:column;gap:12px;margin-bottom:24px';

  const heading = document.createElement('div');
  heading.innerHTML = `
    <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:4px">
      Recommended Extracurriculars
    </div>
    <div style="font-size:0.82rem;color:var(--muted)">
      Based on your major and target schools, these strengthen your transfer application.
    </div>
  `;
  section.appendChild(heading);

  if (existing.length > 0) {
    const doingWrap = document.createElement('div');
    doingWrap.innerHTML = `<div class="field-label" style="margin-bottom:6px">✅ You're already doing:</div>`;
    const pills = document.createElement('div');
    pills.className = 'pill-group';
    existing.forEach(e => {
      const p = document.createElement('span');
      p.className = 'pill selected';
      p.style.pointerEvents = 'none';
      p.textContent = e;
      pills.appendChild(p);
    });
    doingWrap.appendChild(pills);
    section.appendChild(doingWrap);
  }

  if (suggestions.length > 0) {
    const suggestWrap = document.createElement('div');
    suggestWrap.innerHTML = `<div class="field-label" style="margin-bottom:6px">💡 Consider adding:</div>`;
    const pills = document.createElement('div');
    pills.className = 'pill-group';
    suggestions.forEach(e => {
      const p = document.createElement('span');
      p.className = 'pill';
      p.style.pointerEvents = 'none';
      p.textContent = e;
      pills.appendChild(p);
    });
    suggestWrap.appendChild(pills);
    section.appendChild(suggestWrap);
  }

  pane.appendChild(section);
}
