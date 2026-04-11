/**
 * competitor.js
 * "Your Competitor" tab — AI-generated rival profile with VS layout.
 *
 * Produces a realistic competing transfer applicant, compares stats side-by-side,
 * and shows strengths / weaknesses / your edge / verdict.
 */

let _lastCompetitor = null;

/**
 * renderCompetitorTab(pane)
 * Builds the tab shell and (re)generates a competitor.
 */
async function renderCompetitorTab(pane) {
  if (!pane) return;
  pane.innerHTML = `
    <div class="competitor-wrap">
      <div class="competitor-header">
        <h2 class="section-title" style="margin:0">⚔ Your Competitor</h2>
        <button class="btn-primary competitor-regenerate" id="btn-regen-competitor">↻ Generate New</button>
      </div>
      <p class="section-sub">
        Meet a typical student you're up against for your top-choice schools. See who wins on each stat —
        and what your unique edge is.
      </p>
      <div id="competitor-content">
        <div class="competitor-loading">⏳ Generating a realistic rival profile…</div>
      </div>
    </div>
  `;

  document.getElementById('btn-regen-competitor').onclick = async () => {
    document.getElementById('competitor-content').innerHTML = '<div class="competitor-loading">⏳ Generating a fresh rival…</div>';
    const c = await generateCompetitor(student);
    _lastCompetitor = c;
    renderVersus(c);
  };

  const c = await generateCompetitor(student);
  _lastCompetitor = c;
  renderVersus(c);
}

/**
 * generateCompetitor(studentObj)
 * Calls Ollama to produce a JSON competitor profile. Falls back offline.
 */
async function generateCompetitor(studentObj) {
  const s = studentObj || {};
  const topSchool = pickTargetSchool();

  const prompt =
`You are an admissions analyst. Invent ONE realistic transfer applicant competing with this student for ${topSchool} ${s.major || 'their major'}.

This student:
- Name: ${s.name || 'Student'}
- Major: ${s.major || 'unknown'}
- GPA: ${s.gpa || 'unknown'}
- Units: ${s.units || 'unknown'}
- IGETC: ${s.igetc || 'unknown'}
- Honors: ${s.honors || 'unknown'}
- Extracurriculars: ${(s.extracurriculars || []).join(', ') || 'none listed'}

Return ONLY valid JSON in this exact shape (no markdown fences, no prose outside JSON):
{
  "name": "first-name plus initial, e.g. Jordan K.",
  "gpa": 3.XX,
  "major": "same major as this student",
  "honors": "short label e.g. 'Honors program' or 'No honors'",
  "units": "e.g. 60+",
  "igetc": "e.g. Completed",
  "extracurriculars": ["item 1","item 2","item 3"],
  "strength": "one-sentence thing this rival is really good at",
  "weakness": "one-sentence thing this rival is weaker at",
  "yourEdge": "one-sentence concrete advantage YOU have over this rival",
  "verdict": "2 sentences — realistic, direct, no sugarcoating",
  "targetSchool": "${topSchool}",
  "targetSchoolChance": "e.g. 45%"
}

Make stats realistic: GPA similar or slightly above this student, honors/extracurriculars varied, not a perfect angel. Do NOT wrap in markdown. Only JSON.`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3.1', prompt, stream: false, format: 'json' }),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (!res.ok) throw new Error('ollama');
    const data = await res.json();
    const parsed = safeParseJSON(data.response);
    if (parsed) return normalizeCompetitor(parsed, topSchool);
  } catch (_) {}

  return fallbackCompetitor(s, topSchool);
}

function pickTargetSchool() {
  // Pick the top school from the balanced list, fallback to a sensible default
  if (typeof balancedList !== 'undefined' && Array.isArray(balancedList) && balancedList.length) {
    const top = balancedList[0];
    const school = top.school || top;
    return school.name || 'UC Irvine';
  }
  return 'UC Irvine';
}

function safeParseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  // Try to extract JSON substring
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }
  return null;
}

function normalizeCompetitor(raw, targetSchool) {
  return {
    name:             raw.name             || 'Jordan K.',
    gpa:              typeof raw.gpa === 'number' ? raw.gpa : parseFloat(raw.gpa) || 3.6,
    major:            raw.major            || (student && student.major) || 'Computer Science',
    honors:           raw.honors           || 'No honors',
    units:            raw.units            || '60+',
    igetc:            raw.igetc            || 'Completed',
    extracurriculars: Array.isArray(raw.extracurriculars) ? raw.extracurriculars : [],
    strength:         raw.strength         || 'Strong GPA and consistent academic record.',
    weakness:         raw.weakness         || 'Limited community involvement.',
    yourEdge:         raw.yourEdge         || 'You have a clearer career focus and stronger personal narrative.',
    verdict:          raw.verdict          || 'This is a close matchup. A strong personal statement will be the deciding factor.',
    targetSchool:     raw.targetSchool     || targetSchool,
    targetSchoolChance: raw.targetSchoolChance || '50%'
  };
}

function fallbackCompetitor(s, targetSchool) {
  const myGpa = parseFloat(s.gpa) || 3.5;
  const rivalGpa = Math.min(4.0, (myGpa + 0.1)).toFixed(2);
  return {
    name: 'Jordan K.',
    gpa: parseFloat(rivalGpa),
    major: s.major || 'Computer Science',
    honors: 'Honors program',
    units: '60+',
    igetc: 'Completed',
    extracurriculars: ['Tutoring at IVC', 'Club officer', 'Internship (unpaid)'],
    strength: 'Slightly higher GPA and already in an Honors program.',
    weakness: 'No paid industry experience; extracurriculars feel template-y.',
    yourEdge: 'Your specific project portfolio tells a clearer story than theirs.',
    verdict: 'Very close matchup. Personal statement quality and rec-letters decide this one.',
    targetSchool: targetSchool,
    targetSchoolChance: '50%'
  };
}

function renderVersus(rival) {
  const content = document.getElementById('competitor-content');
  if (!content) return;

  const you = student || {};
  const myGpa  = parseFloat(you.gpa) || 0;
  const myHon  = you.honors || 'Not in honors';
  const myUnits = you.units || 'unknown';
  const myIgetc = you.igetc || 'unknown';
  const myEc   = (you.extracurriculars && you.extracurriculars.length) ? you.extracurriculars.join(', ') : 'none listed';

  const rivalGpa = rival.gpa;
  const stats = [
    { key: 'GPA',      me: myGpa.toFixed(2), them: rivalGpa.toFixed(2), cmp: cmpGpa(myGpa, rivalGpa) },
    { key: 'Honors',   me: myHon, them: rival.honors, cmp: cmpHonors(myHon, rival.honors) },
    { key: 'Units',    me: myUnits, them: rival.units, cmp: 'tie' },
    { key: 'IGETC',    me: myIgetc, them: rival.igetc, cmp: cmpIgetc(myIgetc, rival.igetc) },
    { key: 'ECs',      me: myEc, them: (rival.extracurriculars || []).join(', '), cmp: 'tie' }
  ];

  content.innerHTML = `
    <div class="versus-grid">
      <div class="versus-card you">
        <div class="versus-head">
          <div class="versus-label">You</div>
          <div class="versus-name">${escapeHtmlC(you.name || 'Student')}</div>
        </div>
        ${stats.map(s => `
          <div class="versus-stat ${s.cmp === 'win' ? 'win' : (s.cmp === 'lose' ? 'lose' : 'tie')}">
            <span class="versus-stat-key">${escapeHtmlC(s.key)}</span>
            <span class="versus-stat-val">${escapeHtmlC(s.me)}</span>
          </div>
        `).join('')}
      </div>
      <div class="versus-center">VS</div>
      <div class="versus-card rival">
        <div class="versus-head">
          <div class="versus-label">Rival</div>
          <div class="versus-name">${escapeHtmlC(rival.name)}</div>
        </div>
        ${stats.map(s => `
          <div class="versus-stat ${s.cmp === 'win' ? 'lose' : (s.cmp === 'lose' ? 'win' : 'tie')}">
            <span class="versus-stat-key">${escapeHtmlC(s.key)}</span>
            <span class="versus-stat-val">${escapeHtmlC(s.them)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="versus-verdict">
      <h4>Verdict — ${escapeHtmlC(rival.targetSchool)} (${escapeHtmlC(rival.targetSchoolChance)} rival chance)</h4>
      <p><strong>Their strength:</strong> ${escapeHtmlC(rival.strength)}</p>
      <p><strong>Their weakness:</strong> ${escapeHtmlC(rival.weakness)}</p>
      <p class="edge-row"><strong>Your edge:</strong> ${escapeHtmlC(rival.yourEdge)}</p>
      <p style="margin-top:10px">${escapeHtmlC(rival.verdict)}</p>
    </div>
  `;
}

function cmpGpa(me, them) {
  if (me > them + 0.03) return 'win';
  if (me < them - 0.03) return 'lose';
  return 'tie';
}
function cmpHonors(me, them) {
  const has = (s) => /yes|actively|honors/i.test(s) && !/not in honors|no honors/i.test(s);
  const a = has(me), b = has(them);
  if (a && !b) return 'win';
  if (!a && b) return 'lose';
  return 'tie';
}
function cmpIgetc(me, them) {
  const rank = (s) => /completed/i.test(s) ? 3 : (/progress/i.test(s) ? 2 : 1);
  const a = rank(me), b = rank(them);
  if (a > b) return 'win';
  if (a < b) return 'lose';
  return 'tie';
}

function escapeHtmlC(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
