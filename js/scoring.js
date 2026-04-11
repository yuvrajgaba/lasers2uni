/**
 * scoring.js
 * Fit scoring and school tiering for Laser2Uni.
 * Owner: algorithm person
 *
 * Exports (module-scope functions, no bundler needed):
 *   score(school, student)        → integer 1–100
 *   fitLabel(scoreVal)            → { label, colorVar, cssClass }
 *   tierSchools(likedPool, gpa)   → { reach, match, safety }
 *   buildDeck(student)            → scored + sorted array for all schools
 */

/**
 * score() — returns a fit score 1–100 for a school/student pair.
 *
 * @param {Object} school  – entry from SCHOOLS array
 * @param {Object} student – collected form data
 * @returns {number} 1–100
 */
function score(school, student) {
  let s = 50;

  // ── GPA gap (school.minGPA − student.gpa) ──────────────────────
  const gap = school.minGPA - parseFloat(student.gpa || 0);
  if      (gap <= -0.5) s += 20;
  else if (gap <= -0.1) s += 13;
  else if (gap <=  0.2) s +=  5;
  else if (gap <=  0.4) s -=  5;
  else                  s -= 18;

  // ── Region match ───────────────────────────────────────────────
  const studentRegions = student.regions || [];
  const hasRegionPref  = studentRegions.length > 0;
  const regionMatch    = school.regions && school.regions.some(r => studentRegions.includes(r));
  if (!hasRegionPref || regionMatch) s += 10;
  else                               s -= 10;

  // ── Industry / strength match (+7 per match) ──────────────────
  const studentIndustries = student.industries || [];
  if (studentIndustries.length > 0 && school.strengths) {
    const matches = studentIndustries.filter(i => school.strengths.includes(i));
    s += matches.length * 7;
  }

  // ── Campus size match ──────────────────────────────────────────
  if (student.size && student.size !== 'No preference' && school.size === student.size) {
    s += 8;
  }

  // ── IVC Honors + TAG ──────────────────────────────────────────
  if (
    student.honors === 'Yes — actively enrolled' &&
    school.tags &&
    school.tags.some(t => t.includes('TAG') || t.includes('Honors'))
  ) {
    s += 12;
  }

  // ── Priority bonuses ──────────────────────────────────────────
  const priorities = student.priorities || [];

  if (priorities.includes('Research opportunities')) {
    const hasResearchTag = school.tags && school.tags.some(t =>
      t.toLowerCase().includes('research') || t.toLowerCase().includes('pre-med')
    );
    if (hasResearchTag) s += 7;
  }

  if (priorities.includes('Cost/financial aid')) {
    const isCostFriendly = school.type === 'CSU' ||
      (school.tags && school.tags.some(t =>
        t.toLowerCase().includes('scholarship') || t.toLowerCase().includes('accessible')
      ));
    if (isCostFriendly) s += 8;
  }

  if (priorities.includes('Prestige/rankings')) {
    if (school.type === 'UC' || school.type === 'Private') s += 6;
  }

  if (priorities.includes('Social life')) {
    const hasSocialTag = school.tags && school.tags.some(t =>
      t.toLowerCase().includes('social') || t.toLowerCase().includes('campus')
    );
    if (hasSocialTag) s += 5;
  }

  if (priorities.includes('Staying close to home')) {
    if (school.regions && school.regions.includes('SoCal')) s += 9;
  }

  // ── Extracurriculars bonus ────────────────────────────────────
  const extras = student.extracurriculars || [];
  if (extras.length >= 3) s += 6;
  if (extras.length >= 5) s += 4; // stacks to +10 total
  const researchExtras = ['Research Assistant', 'Research Lab'];
  const hasResearch    = extras.some(e => researchExtras.includes(e));
  const schoolHasResearchTag = (school.tags || []).some(t =>
    t.toLowerCase().includes('research')
  );
  if (hasResearch && schoolHasResearchTag) s += 8;

  return Math.max(1, Math.min(100, Math.round(s)));
}

/**
 * fitLabel() — maps a score to a human-readable label + CSS class.
 *
 * @param {number} s – score 1–100
 * @returns {{ label: string, colorVar: string, cssClass: string }}
 */
function fitLabel(s) {
  if (s >= 72) return { label: 'Strong Fit', colorVar: 'var(--accent3)', cssClass: 'strong' };
  if (s >= 52) return { label: 'Good Fit',   colorVar: 'var(--gold)',    cssClass: 'good'   };
  return              { label: 'Possible',   colorVar: 'var(--accent2)', cssClass: 'possible' };
}

/**
 * tierSchools() — splits a liked pool into reach / match / safety.
 * Max 2 per tier; empty tiers are filled from the highest-scored remaining schools.
 *
 * @param {Array<{school, score}>} pool – output of buildDeck filtered to liked schools
 * @param {number} studentGPA
 * @returns {{ reach: Array, match: Array, safety: Array }}
 */
function tierSchools(pool, studentGPA) {
  const gpa    = parseFloat(studentGPA || 0);
  const reach  = [];
  const match  = [];
  const safety = [];

  for (const item of pool) {
    const gpaGap   = item.school.minGPA - gpa;
    const selBonus = (item.school.selectivity || 1) * 0.15;
    const combined = gpaGap + selBonus;
    if      (combined >  0.55) reach .push(item);
    else if (combined >= 0.10) match .push(item);
    else                       safety.push(item);
  }

  // Sort each bucket by score descending
  [reach, match, safety].forEach(arr => arr.sort((a, b) => b.score - a.score));

  const result = {
    reach:  reach .slice(0, 2),
    match:  match .slice(0, 2),
    safety: safety.slice(0, 2)
  };

  // Fill any empty tiers from the overall pool sorted by score
  const usedIds = new Set([
    ...result.reach .map(x => x.school.id),
    ...result.match .map(x => x.school.id),
    ...result.safety.map(x => x.school.id)
  ]);

  const remaining = pool
    .filter(x => !usedIds.has(x.school.id))
    .sort((a, b) => b.score - a.score);

  let ri = 0;
  if (result.reach .length === 0 && remaining[ri]) { result.reach .push(remaining[ri]); ri++; }
  if (result.match .length === 0 && remaining[ri]) { result.match .push(remaining[ri]); ri++; }
  if (result.safety.length === 0 && remaining[ri]) { result.safety.push(remaining[ri]); ri++; }

  return result;
}

/**
 * buildDeck() — scores every school and returns them sorted highest-first.
 * Called once after onboarding to build the swipe deck.
 *
 * @param {Object} student – collected form data
 * @returns {Array<{school, score, fit}>} sorted descending by score
 */
function buildDeck(student) {
  return SCHOOLS
    .map(school => ({
      school,
      score: score(school, student),
      fit:   fitLabel(score(school, student))
    }))
    .sort((a, b) => b.score - a.score);
}
