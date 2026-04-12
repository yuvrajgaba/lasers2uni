/**
 * dashboard.js
 * Dashboard rendering for Laser2Uni.
 *
 * Tabs: Balanced ✨ (default) | Best For You | Rankings |
 *       Your Competitor ⚔ | Community ◎ | Requirements ☑
 *
 * Depends on: state.js, scoring.js, supabase.js, match.js, community.js,
 *             competitor.js, update-profile.js
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
  addOutcomesFAB();

  // Auto-trigger "You Matched!" animation for the top balanced pick
  if (balancedList.length > 0 && typeof showMatchAnimation === 'function') {
    setTimeout(() => showMatchAnimation(balancedList[0]), 1500);
  }
}

/* ── Tab switching ────────────────────────────────────────────── */

function setupDashboardTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      const paneId = `tab-${tab.dataset.tab}`;
      const pane = document.getElementById(paneId);
      if (pane) pane.classList.remove('hidden');

      // Lazy-render for the two dynamic tabs
      if (tab.dataset.tab === 'community' && typeof renderCommunityTab === 'function') {
        renderCommunityTab(pane);
      } else if (tab.dataset.tab === 'competitor' && typeof renderCompetitorTab === 'function') {
        renderCompetitorTab(pane);
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   WHY-MATCH PILLS  (quick reasons this school matched)
══════════════════════════════════════════════════════════════════ */
function buildWhyMatchPills(school, isTagEligible) {
  const pills = [];
  const studentRegions    = student.regions    || [];
  const studentIndustries = student.industries || [];
  const studentSize       = student.size       || '';

  // Region match — infer from loc string
  const loc = (school.loc || '').toLowerCase();
  const isNorCal = /berkeley|san\s?jose|santa\s?cruz|davis|merced/i.test(loc);
  const isSoCal  = /irvine|los\s?angeles|san\s?diego|santa\s?barbara|riverside|long\s?beach|fullerton|pomona|san\s?luis\s?obispo|orange/i.test(loc);
  if (studentRegions.includes('No Preference')) {
    // noop — implicit match
  } else if (isNorCal && studentRegions.includes('NorCal / Bay Area')) {
    pills.push(`<span class="why-match-pill">✓ NorCal region</span>`);
  } else if (isSoCal && studentRegions.includes('SoCal')) {
    pills.push(`<span class="why-match-pill">✓ SoCal region</span>`);
  }

  // Industry hint from tags
  const tagStr = (school.tags || []).join(' ').toLowerCase();
  if (studentIndustries.includes('Tech / Software') && /cs|tech|silicon|engineering/.test(tagStr)) {
    pills.push(`<span class="why-match-pill">✓ Tech industry</span>`);
  } else if (studentIndustries.includes('Healthcare / Medicine') && /pre-?med|biotech|bio|health/.test(tagStr)) {
    pills.push(`<span class="why-match-pill">✓ Healthcare path</span>`);
  } else if (studentIndustries.includes('Research / Academia') && /research/.test(tagStr)) {
    pills.push(`<span class="why-match-pill">✓ Research-heavy</span>`);
  } else if (studentIndustries.includes('Business / Finance') && /business/.test(tagStr)) {
    pills.push(`<span class="why-match-pill">✓ Business focus</span>`);
  } else if (studentIndustries.includes('Creative / Media') && /film|media|creative/.test(tagStr)) {
    pills.push(`<span class="why-match-pill">✓ Film / Media</span>`);
  }

  // TAG eligibility
  if (isTagEligible) {
    pills.push(`<span class="why-match-pill">✓ TAG eligible</span>`);
  }

  // Size match
  if (studentSize && school.size && (studentSize === school.size || studentSize === 'No preference')) {
    pills.push(`<span class="why-match-pill">✓ ${school.size} campus</span>`);
  }

  return pills;
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

  // Why-match reasons (quick pills explaining why this school fits)
  const whyPills = buildWhyMatchPills(school, isTagEligible);

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
    ${whyPills.length ? `<div class="why-match-row">${whyPills.join('')}</div>` : ''}
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
    <div style="display:flex;justify-content:flex-end;margin:10px 0 4px">
      <button class="btn-school-chat" data-school-id="${school.id}">💬 Chat with ${school.name}</button>
    </div>
    <div class="school-card-body">
      <!-- Confidence score — injected async below the card is built -->
      <div class="confidence-skeleton" id="conf-${school.id}"></div>
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

  // Wire up "Chat with school" button
  const chatBtn = card.querySelector('.btn-school-chat');
  if (chatBtn) {
    chatBtn.addEventListener('click', () => {
      if (typeof openSchoolChat === 'function') openSchoolChat(item);
    });
  }

  // Async confidence score injection (non-blocking)
  if (typeof generateConfidenceScore === 'function') {
    generateConfidenceScore(school, student).then(conf => {
      const skeleton = card.querySelector(`#conf-${school.id}`);
      if (!skeleton || !conf) { if (skeleton) skeleton.remove(); return; }
      const verdictClass = (conf.verdict || 'possible').toLowerCase().replace(/\s+/g, '-');
      const pct = Math.min(100, Math.max(0, conf.percentage || 0));
      const fillColor = pct >= 60 ? 'var(--accent3)' : pct >= 35 ? 'var(--gold)' : 'var(--accent2)';
      const block = document.createElement('div');
      block.className = 'confidence-block';
      block.innerHTML = `
        <div class="confidence-header">
          <span class="confidence-label">Your Chances</span>
          <span class="confidence-verdict ${verdictClass}">${conf.verdict || 'Possible'}</span>
        </div>
        <div class="confidence-bar-wrap">
          <div class="confidence-bar-fill" style="width:0%;background:${fillColor}"></div>
        </div>
        <div class="confidence-percentage">${pct}%</div>
        <div class="confidence-reasoning">${escapeHtmlD(conf.reasoning || '')}</div>
        <div class="confidence-factors">
          <span class="factor-good">✓ ${escapeHtmlD(conf.topFactor || '')}</span>
          <span class="factor-risk">✗ ${escapeHtmlD(conf.riskFactor || '')}</span>
        </div>
      `;
      skeleton.replaceWith(block);
      // Animate bar after paint
      requestAnimationFrame(() => {
        const fill = block.querySelector('.confidence-bar-fill');
        if (fill) fill.style.width = pct + '%';
      });
    }).catch(() => {
      const skeleton = card.querySelector(`#conf-${school.id}`);
      if (skeleton) skeleton.remove();
    });
  } else {
    const skeleton = card.querySelector(`#conf-${school.id}`);
    if (skeleton) skeleton.remove();
  }

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
  const topSchool = (balancedList && balancedList.length > 0) ? balancedList[0] : null;
  const topSchoolName = topSchool ? topSchool.school.name : '';
  header.innerHTML = `
    <h3 class="list-tab-title">✨ Our Recommendation</h3>
    <p class="list-tab-sub">A blend of prestige and personal fit - the honest list we'd give a friend.</p>
    ${topSchool ? `
      <button class="btn-school-chat btn-school-chat-hero" id="btn-balanced-hero-chat">
        💬 Chat with ${topSchoolName}
      </button>
    ` : ''}
  `;
  pane.appendChild(header);

  if (topSchool) {
    const btn = header.querySelector('#btn-balanced-hero-chat');
    if (btn) btn.addEventListener('click', () => {
      if (typeof openSchoolChat === 'function') openSchoolChat(topSchool);
    });
  }

  if (!balancedList || balancedList.length === 0) {
    pane.innerHTML += '<p class="empty-note">Swipe more schools to get recommendations.</p>';
    return;
  }

  balancedList.forEach((item, i) => {
    const label = i === 0 ? 'Top Pick' : null;
    pane.appendChild(buildRankedSchoolCard(item, i + 1, label));
  });

  renderPassedSection(pane);

  // Life-plan content (moved from the old "Your Path" tab)
  renderLifePlanSection(pane);
}

/* ══════════════════════════════════════════════════════════════════
   LIFE PLAN SECTION — embedded inside the Balanced tab
══════════════════════════════════════════════════════════════════ */
async function renderLifePlanSection(pane) {
  const wrap = document.createElement('div');
  wrap.className = 'life-plan-section';
  wrap.style.cssText = 'margin-top:28px;padding-top:24px;border-top:1px solid var(--border)';

  const h = document.createElement('h3');
  h.textContent = '→ Your Path Forward';
  h.style.cssText = 'margin:0 0 6px;font-size:1.15rem;color:var(--text)';
  wrap.appendChild(h);

  // "Students Like You" social proof
  try {
    if (typeof getRecentOutcomes === 'function') {
      const rows = await getRecentOutcomes(20);
      if (rows && rows.length > 0) {
        const gpa      = parseFloat(student.gpa);
        const matching = rows.filter(r =>
          r.student_major === student.major && Math.abs(r.student_gpa - gpa) <= 0.3
        );
        if (matching.length > 0) {
          const section = document.createElement('div');
          section.style.marginTop = '18px';
          section.innerHTML = `
            <div style="font-weight:700;font-size:0.95rem;color:var(--text);margin-bottom:4px">Students Like You</div>
            <div style="font-size:0.82rem;color:var(--muted);margin-bottom:12px">IVC students with similar profiles who got accepted:</div>
          `;
          matching.slice(0, 6).forEach(r => {
            const card = document.createElement('div');
            card.style.cssText = `background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;font-size:0.85rem;color:var(--text);margin-bottom:6px;line-height:1.4;`;
            card.innerHTML = `${escapeHtmlD(r.student_name)} (GPA ${r.student_gpa}, ${escapeHtmlD(r.student_major)}) admitted to <span style="color:var(--accent3)">${escapeHtmlD(r.school_name)}</span> (${r.year})`;
            section.appendChild(card);
          });
          wrap.appendChild(section);
        }
      }
    }
  } catch (_) {}

  // Extracurricular recommendations
  renderExtracurricularRecommendations(wrap);

  const plan = aiData?.life_plan || {};

  if (plan.summary) {
    const summaryEl = document.createElement('div');
    summaryEl.className   = 'life-summary';
    summaryEl.textContent = plan.summary;
    wrap.appendChild(summaryEl);
  }

  const timeline = plan.timeline || [];
  if (timeline.length > 0) {
    const timelineEl = document.createElement('div');
    timelineEl.className = 'timeline';
    timeline.forEach((phase, i) => {
      const actionsHtml = (phase.actions || []).map(a => `<li>${escapeHtmlD(a)}</li>`).join('');
      const phaseEl = document.createElement('div');
      phaseEl.className = 'timeline-phase';
      phaseEl.innerHTML = `
        <div class="timeline-dot dot-${i}"></div>
        <div class="timeline-content">
          <div class="timeline-phase-name">${escapeHtmlD(phase.phase)}</div>
          <ul class="timeline-actions">${actionsHtml}</ul>
        </div>
      `;
      timelineEl.appendChild(phaseEl);
    });
    wrap.appendChild(timelineEl);
  }

  if (plan.job_strategy) {
    const jobEl = document.createElement('div');
    jobEl.className = 'life-strategy-block';
    jobEl.innerHTML = `<h4>Job Strategy</h4><p>${escapeHtmlD(plan.job_strategy)}</p>`;
    wrap.appendChild(jobEl);
  }

  if (plan.grad_school_advice) {
    const gradEl = document.createElement('div');
    gradEl.className = 'life-strategy-block';
    gradEl.innerHTML = `<h4>Grad School Advice</h4><p>${escapeHtmlD(plan.grad_school_advice)}</p>`;
    wrap.appendChild(gradEl);
  }

  pane.appendChild(wrap);
}

function escapeHtmlD(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
   REQUIREMENTS TAB  —  simplified assist.org link list
══════════════════════════════════════════════════════════════════ */

function renderRequirementsTab() {
  const pane = document.getElementById('tab-requirements');
  if (!pane) return;
  pane.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'list-tab-header';
  header.innerHTML = `
    <h3 class="list-tab-title">☑ Course Requirements</h3>
    <p class="list-tab-sub">Official articulation lives on assist.org — the single source of truth for which IVC courses transfer. Click any school below to see the exact course list for ${escapeHtmlD(student.major || 'your major')}.</p>
  `;
  pane.appendChild(header);

  // Use balancedList as the canonical set of schools
  const schools = ((balancedList.length > 0 ? balancedList : fitList) || []).map(x => x.school);

  const list = document.createElement('div');
  list.className = 'assist-list';

  schools.forEach(school => {
    const card = document.createElement('div');
    card.className = 'assist-card';

    card.innerHTML = `
      <div class="assist-card-title">
        ${school.logo ? `<img src="${school.logo}" alt="${school.name}" style="width:20px;height:20px;vertical-align:middle;margin-right:6px;object-fit:contain" onerror="this.style.display='none'">` : school.emoji + ' '}
        ${escapeHtmlD(school.name)}
      </div>
      <div style="font-size:0.82rem;color:var(--muted)">${escapeHtmlD(school.loc)}</div>
      <a href="https://assist.org" target="_blank" rel="noopener" class="assist-card-link">Open on assist.org →</a>
    `;
    list.appendChild(card);
  });

  pane.appendChild(list);

  const note = document.createElement('div');
  note.className = 'assist-note';
  note.innerHTML = `
    <strong>Coming soon:</strong> a built-in IVC course database (maintained by the team) will let you check off courses directly in the app.
    For now, verify every articulation on <a href="https://assist.org" target="_blank" rel="noopener" style="color:var(--accent)">assist.org</a>
    before enrolling — it's the only official source your counselor and UC/CSU admissions will trust.
  `;
  pane.appendChild(note);
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
