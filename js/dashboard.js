/**
 * dashboard.js
 * Dashboard rendering for Laser2Uni.
 * Owner: UI person
 *
 * Tabs: Balanced (default) | Best For You | Rankings | Requirements | Your Path
 *
 * Depends on: state.js, scoring.js, supabase.js, courses.js
 */

/* ══════════════════════════════════════════════════════════════════
   BUILD DASHBOARD
══════════════════════════════════════════════════════════════════ */

function buildDashboard(prestigeListArg, fitListArg, balancedListArg) {
  prestigeList = prestigeListArg || [];
  fitList      = fitListArg      || [];
  balancedList = balancedListArg || [];

  const chip = document.getElementById('student-chip');
  if (chip) {
    chip.textContent = `${student.name} - ${student.major} - ${student.gpa} GPA`;
  }

  renderBalancedTab();
  renderFitTab();
  renderRankingsTab();
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
   SHARED SCHOOL CARD BUILDER
══════════════════════════════════════════════════════════════════ */

function buildRankedSchoolCard(item, rank, topLabel) {
  const { school, score: s, fit } = item;
  const typeClass = school.type.toLowerCase().replace(/ /g, '-');
  const schoolAI  = aiData?.schools?.[school.id] || {};

  // TAG eligibility
  const studentGpa    = parseFloat(student.gpa || 0);
  const tagExcluded   = (school.tagExclusions || []).includes(student.major);
  const isTagEligible = school.tagGpa != null && !tagExcluded && studentGpa >= school.tagGpa;
  const isTagClose    = !isTagEligible && school.tagGpa != null && !tagExcluded
    && studentGpa >= school.tagGpa - 0.2;

  // Major-specific GPA minimum
  const majorMinGpa = (school.majorMinGpa || {})[student.major]
    ?? (school.majorMinGpa || {})['default']
    ?? school.minGPA;

  // Competitiveness
  let comp = (school.competitiveness || {})[student.major];
  if (comp == null) {
    for (const [key, val] of Object.entries(school.competitiveness || {})) {
      if (key !== 'default' && student.major.toLowerCase().includes(key.toLowerCase())) {
        comp = val; break;
      }
    }
  }
  if (comp == null) comp = (school.competitiveness || {})['default'] ?? 3;
  const compLabel = comp <= 2 ? 'Accessible' : comp === 3 ? 'Competitive'
    : comp === 4 ? 'Very Competitive' : 'Highly Selective';
  const compColor = comp <= 2 ? 'var(--accent3)' : comp === 3 ? 'var(--gold)'
    : comp === 4 ? '#f09040' : 'var(--accent2)';

  const admitPct = school.admitRate ? `${Math.round(school.admitRate * 100)}%` : 'N/A';
  const projectsHtml = (schoolAI.projects || []).map(p => `<li>${p}</li>`).join('');

  const card = document.createElement('div');
  card.className = 'school-card';

  card.innerHTML = `
    <div class="school-card-header">
      <div class="school-card-stripe ${typeClass}"></div>
      ${rank ? `<div class="rank-num">${rank}</div>` : ''}
      <div style="flex-shrink:0;width:40px;height:40px;display:flex;align-items:center;justify-content:center">
        ${school.logo
          ? `<img src="${school.logo}" alt="${school.name}" style="width:40px;height:40px;padding:3px;box-sizing:border-box;object-fit:contain;object-position:center" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none;font-size:1.5rem">${school.emoji}</span>`
          : `<span style="font-size:1.5rem">${school.emoji}</span>`}
      </div>
      <div class="school-card-info">
        <div class="school-card-name">${school.name}</div>
        <div class="school-card-loc">${school.loc}</div>
      </div>
    </div>
    <div class="card-badge-row">
      ${topLabel ? `<span class="top-pick-badge">${topLabel}</span>` : ''}
      ${isTagEligible ? `<span class="tag-elig-badge">TAG Eligible</span>` : ''}
      ${isTagClose    ? `<span class="tag-close-badge">TAG: Close</span>` : ''}
    </div>
    <div class="card-stat-row">
      <span class="card-stat">
        <span class="card-stat-label">Admit Rate</span>${admitPct}
      </span>
      <span class="card-stat">
        <span class="card-stat-label">Min GPA</span>${typeof majorMinGpa === 'number' ? majorMinGpa.toFixed(1) : majorMinGpa}
      </span>
      <span class="card-stat" style="color:${compColor}">
        <span class="card-stat-label">Competition</span>${compLabel}
      </span>
      <span class="card-stat" style="color:${fit.colorVar}">
        <span class="card-stat-label">Fit Score</span>${s}
      </span>
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

  // Async social proof badge (non-blocking)
  getSimilarStudentOutcomes(studentGpa, school.id).then(outcomes => {
    if (!outcomes || outcomes.length === 0) return;
    const statRow = card.querySelector('.card-stat-row');
    if (statRow) {
      const badge = document.createElement('span');
      badge.style.cssText = `
        font-size: 0.7rem; font-weight: 600; padding: 3px 9px;
        border-radius: 99px; background: rgba(61,232,160,0.15);
        color: var(--accent3); white-space: nowrap;
      `;
      badge.textContent = `${outcomes.length} similar student${outcomes.length > 1 ? 's' : ''} got in`;
      statRow.appendChild(badge);
    }
  }).catch(() => {});

  return card;
}

/* ══════════════════════════════════════════════════════════════════
   BALANCED TAB (default / recommended)
══════════════════════════════════════════════════════════════════ */

function renderBalancedTab() {
  const pane = document.getElementById('tab-balanced');
  if (!pane) return;
  pane.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'list-tab-header';
  header.innerHTML = `
    <h3 class="list-tab-title">Our Recommendation</h3>
    <p class="list-tab-sub">A blend of prestige and personal fit - the honest list we'd give a friend.</p>
  `;
  pane.appendChild(header);

  if (!balancedList || balancedList.length === 0) {
    pane.innerHTML += '<p class="empty-note">Swipe more schools to get recommendations.</p>';
    return;
  }

  balancedList.forEach((item, i) => {
    const label = i === 0 ? 'Top Pick' : null;
    pane.appendChild(buildRankedSchoolCard(item, i + 1, label));
  });

  renderPassedSection(pane);
}

/* ══════════════════════════════════════════════════════════════════
   FIT TAB (best for you)
══════════════════════════════════════════════════════════════════ */

function renderFitTab() {
  const pane = document.getElementById('tab-fit');
  if (!pane) return;
  pane.innerHTML = '';

  const topPriorities = (student.priorities || []).slice(0, 3).join(', ') || 'your preferences';
  const header = document.createElement('div');
  header.className = 'list-tab-header';
  header.innerHTML = `
    <h3 class="list-tab-title">Ranked by Your Preferences</h3>
    <p class="list-tab-sub">These schools match what YOU said matters: ${topPriorities}.</p>
  `;
  pane.appendChild(header);

  if (!fitList || fitList.length === 0) {
    pane.innerHTML += '<p class="empty-note">Swipe more schools to see your best matches.</p>';
    return;
  }

  fitList.forEach((item, i) => {
    const label = i === 0 ? 'Best Match' : null;
    pane.appendChild(buildRankedSchoolCard(item, i + 1, label));
  });
}

/* ══════════════════════════════════════════════════════════════════
   RANKINGS TAB (prestige)
══════════════════════════════════════════════════════════════════ */

function renderRankingsTab() {
  const pane = document.getElementById('tab-rankings');
  if (!pane) return;
  pane.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'list-tab-header';
  header.innerHTML = `
    <h3 class="list-tab-title">Ranked by Prestige</h3>
    <p class="list-tab-sub">The most selective schools you liked, ordered by reputation and admit rate.</p>
  `;
  pane.appendChild(header);

  if (!prestigeList || prestigeList.length === 0) {
    pane.innerHTML += '<p class="empty-note">Swipe more schools to see the rankings.</p>';
    return;
  }

  prestigeList.forEach((item, i) => {
    const label = i === 0 ? 'Most Prestigious' : null;
    pane.appendChild(buildRankedSchoolCard(item, i + 1, label));
  });
}

/* ══════════════════════════════════════════════════════════════════
   PASSED SCHOOLS SECTION (balanced tab only)
══════════════════════════════════════════════════════════════════ */

function renderPassedSection(container) {
  if (!passedItems || passedItems.length === 0) return;

  const section = document.createElement('div');
  section.className = 'passed-section';

  const toggle = document.createElement('button');
  toggle.className = 'passed-toggle';
  toggle.textContent = `+ Schools you passed on (${passedItems.length})`;

  const list = document.createElement('div');
  list.className = 'passed-list hidden';

  passedItems.forEach(item => list.appendChild(buildPassedCard(item)));

  toggle.addEventListener('click', () => {
    const hidden = list.classList.toggle('hidden');
    toggle.textContent = hidden
      ? `+ Schools you passed on (${passedItems.length})`
      : `- Schools you passed on (${passedItems.length})`;
  });

  section.appendChild(toggle);
  section.appendChild(list);
  container.appendChild(section);
}

function buildPassedCard(item) {
  const { school } = item;
  const wrapper = document.createElement('div');

  function renderNormal() {
    wrapper.className = 'passed-card';
    wrapper.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:0.65rem;font-weight:700;letter-spacing:0.1em;color:var(--muted);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 6px">PASSED</span>
        <span style="font-weight:600">${school.emoji} ${school.name}</span>
        <span style="color:var(--muted);font-size:0.8rem;margin-left:auto">${school.loc}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn-ghost btn-sm passed-add-btn">Add to My List</button>
        <button class="btn-ghost btn-sm passed-keep-btn">Keep Passed</button>
      </div>
    `;
    wrapper.querySelector('.passed-add-btn').addEventListener('click', renderConfirm);
    wrapper.querySelector('.passed-keep-btn').addEventListener('click', () => wrapper.remove());
  }

  function renderConfirm() {
    wrapper.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:0.65rem;font-weight:700;color:var(--muted);background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 6px">PASSED</span>
        <span style="font-weight:600">${school.emoji} ${school.name}</span>
      </div>
      <div style="margin-top:8px;font-size:0.85rem;color:var(--text)">Re-run scoring with ${school.name} included?</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn-primary btn-sm confirm-yes-btn">Yes</button>
        <button class="btn-ghost btn-sm confirm-no-btn">No</button>
      </div>
    `;
    wrapper.querySelector('.confirm-yes-btn').addEventListener('click', () => {
      const idx = passedItems.findIndex(x => x.school.id === school.id);
      if (idx !== -1) likedItems.push(passedItems.splice(idx, 1)[0]);
      const pool = likedItems.length > 0 ? likedItems : deck.slice(0, 8);
      prestigeList  = buildPrestigeRanking(pool);
      fitList       = buildFitRanking(pool);
      balancedList  = buildBalancedRanking(pool);
      renderBalancedTab();
      renderFitTab();
      renderRankingsTab();
    });
    wrapper.querySelector('.confirm-no-btn').addEventListener('click', renderNormal);
  }

  renderNormal();
  return wrapper;
}

/* ══════════════════════════════════════════════════════════════════
   REQUIREMENTS TAB
══════════════════════════════════════════════════════════════════ */

function renderRequirementsTab() {
  const pane = document.getElementById('tab-requirements');
  if (!pane) return;
  pane.innerHTML = '';

  const note = document.createElement('div');
  note.className = 'req-note';
  note.innerHTML = `Always verify course articulation at <a href="https://www.assist.org" target="_blank" rel="noopener">assist.org</a>. Check off courses as you complete them - your progress saves automatically.`;
  pane.appendChild(note);

  // Use balancedList as the canonical set of schools for requirements
  const schools = (balancedList.length > 0 ? balancedList : fitList).map(x => x.school);

  schools.forEach(school => {
    const typeClass  = school.type.toLowerCase().replace(/ /g, '-');
    const schoolData = (typeof COURSE_REQUIREMENTS !== 'undefined')
      ? COURSE_REQUIREMENTS?.[school.id]?.[student.major]
      : null;

    const block = document.createElement('div');
    block.className = 'req-school-block';

    block.innerHTML = `
      <div class="req-school-name">
        <div class="school-card-stripe ${typeClass}" style="position:relative;width:4px;height:20px;border-radius:2px;flex-shrink:0"></div>
        ${school.logo
          ? `<img src="${school.logo}" alt="${school.name}" style="width:22px;height:22px;padding:2px;box-sizing:border-box;object-fit:contain;object-position:center;vertical-align:middle" onerror="this.style.display='none'">`
          : school.emoji} ${school.name}
        <span style="font-size:0.75rem;color:var(--muted);font-weight:400;margin-left:auto">${school.loc}</span>
      </div>
    `;

    if (schoolData && schoolData.sections) {
      const allCourses = schoolData.sections.flatMap(s => s.courses);
      const total      = allCourses.length;
      let   completed  = 0;

      const counter = document.createElement('div');
      counter.className   = 'checklist-counter';
      counter.id          = `counter-${school.id}`;
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
          row.className   = 'course-row';
          row.dataset.key = course.key;

          const cb = document.createElement('input');
          cb.type           = 'checkbox';
          cb.id             = `cb-${course.key}`;
          cb.className      = 'course-checkbox';
          cb.dataset.school = school.id;
          cb.dataset.major  = student.major;
          cb.dataset.key    = course.key;

          const lbl = document.createElement('label');
          lbl.htmlFor = cb.id;
          lbl.innerHTML = `
            <span class="course-label">${course.label}</span>
            <span class="course-note">${course.note}</span>
          `;

          cb.addEventListener('change', () => {
            row.classList.toggle('course-completed', cb.checked);
            const checked   = block.querySelectorAll('.course-checkbox:checked').length;
            const counterEl = document.getElementById(`counter-${school.id}`);
            if (counterEl) counterEl.textContent = `${checked} / ${total} courses completed`;
            saveCourseProgress(currentUserId, school.id, student.major, course.key, cb.checked);
          });

          row.appendChild(cb);
          row.appendChild(lbl);
          sectionEl.appendChild(row);
        });

        block.appendChild(sectionEl);
      });

      // Restore saved progress
      if (window.savedCourseProgress && window.savedCourseProgress.length > 0) {
        window.savedCourseProgress.forEach(row => {
          if (row.school_id === school.id && row.major === student.major && row.completed) {
            const cb = block.querySelector(`input[data-key="${row.course_key}"]`);
            if (cb) { cb.checked = true; cb.closest('.course-row')?.classList.add('course-completed'); completed++; }
          }
        });
        const counterEl = document.getElementById(`counter-${school.id}`);
        if (counterEl && completed > 0) counterEl.textContent = `${completed} / ${total} courses completed`;
      } else if (!currentUserId?.startsWith('guest_') && !currentUserId?.startsWith('local_')) {
        getCourseProgress(currentUserId, school.id, student.major).then(rows => {
          rows.forEach(row => {
            if (row.completed) {
              const cb = block.querySelector(`input[data-key="${row.course_key}"]`);
              if (cb) { cb.checked = true; cb.closest('.course-row')?.classList.add('course-completed'); }
            }
          });
          const checked   = block.querySelectorAll('.course-checkbox:checked').length;
          const counterEl = document.getElementById(`counter-${school.id}`);
          if (counterEl) counterEl.textContent = `${checked} / ${total} courses completed`;
        });
      }

    } else {
      // Fallback: AI-generated requirements table
      const req        = aiData?.schools?.[school.id]?.transfer_requirements || {};
      const coursesHtml = (req.required_courses || []).map(c => `<span>${c}</span>`).join('');
      const table = document.createElement('table');
      table.className = 'req-table';
      table.innerHTML = `
        <tr><td>Min GPA Required</td><td>${req.gpa_required || school.minGPA.toFixed(1) + ' (competitive)'}</td></tr>
        <tr><td>IGETC</td><td>Strongly recommended - complete at IVC before transferring</td></tr>
        <tr><td>Required Courses</td><td><div class="req-courses">${coursesHtml || '<span>See assist.org for full articulation</span>'}</div></td></tr>
        <tr><td>IVC Notes</td><td class="ivc-note-cell">${req.ivc_notes || school.ivcPerks || 'Review IVC articulation at assist.org'}</td></tr>
      `;
      block.appendChild(table);
    }

    pane.appendChild(block);
  });
}

/* ══════════════════════════════════════════════════════════════════
   YOUR PATH TAB
══════════════════════════════════════════════════════════════════ */

async function renderYourPathTab() {
  const pane = document.getElementById('tab-your-path');
  if (!pane) return;
  pane.innerHTML = '';

  // Social proof: Students Like You
  try {
    const rows = await getRecentOutcomes(20);
    if (rows && rows.length > 0) {
      const gpa      = parseFloat(student.gpa);
      const matching = rows.filter(r =>
        r.student_major === student.major && Math.abs(r.student_gpa - gpa) <= 0.3
      );
      if (matching.length > 0) {
        const section = document.createElement('div');
        section.innerHTML = `
          <div style="font-weight:700;font-size:1rem;color:var(--text);margin-bottom:4px">Students Like You</div>
          <div style="font-size:0.82rem;color:var(--muted);margin-bottom:12px">IVC students with similar profiles who got accepted:</div>
        `;
        matching.forEach(r => {
          const card = document.createElement('div');
          card.style.cssText = `background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;font-size:0.85rem;color:var(--text);margin-bottom:6px;line-height:1.4;`;
          card.innerHTML = `${r.student_name} (GPA ${r.student_gpa}, ${r.student_major}) admitted to <span style="color:var(--accent3)">${r.school_name}</span> (${r.year})`;
          section.appendChild(card);
        });
        section.style.marginBottom = '24px';
        pane.appendChild(section);
      }
    }
  } catch (_) {}

  renderExtracurricularRecommendations(pane);

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
      const actionsHtml = (phase.actions || []).map(a => `<li>${a}</li>`).join('');
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

function renderExtracurricularRecommendations(pane) {
  const majorGroup = getMajorGroup(student.major);
  const allOptions = EXTRACURRICULAR_MAP[majorGroup] || EXTRACURRICULAR_MAP['default'];
  const existing   = student.extracurriculars || [];
  const suggestions = allOptions.filter(e => !existing.includes(e));

  const section = document.createElement('div');
  section.style.cssText = 'display:flex;flex-direction:column;gap:12px;margin-bottom:24px';

  const heading = document.createElement('div');
  heading.innerHTML = `
    <div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:4px">Recommended Extracurriculars</div>
    <div style="font-size:0.82rem;color:var(--muted)">Based on your major and target schools, these strengthen your transfer application.</div>
  `;
  section.appendChild(heading);

  if (existing.length > 0) {
    const doingWrap = document.createElement('div');
    doingWrap.innerHTML = `<div class="field-label" style="margin-bottom:6px">You are already doing:</div>`;
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
    suggestWrap.innerHTML = `<div class="field-label" style="margin-bottom:6px">Consider adding:</div>`;
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
