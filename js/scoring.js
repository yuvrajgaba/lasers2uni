/**
 * scoring.js
 * Fit scoring and school ranking for Laser2Uni.
 * Owner: algorithm person
 *
 * Exports:
 *   score(school, student, outcomesMap)  - integer 1-100
 *   fitLabel(scoreVal)                   - { label, colorVar, cssClass }
 *   buildPrestigeRanking(pool)           - sorted by selectivity + admit rate
 *   buildFitRanking(pool)                - sorted by student preference fit
 *   buildBalancedRanking(pool)           - blend of prestige and fit
 *   buildDeck(student, outcomesMap)      - scored + sorted array for all schools
 */

/* ── Helpers ──────────────────────────────────────────────────── */

/**
 * getMajorMinGpa() - returns the minimum GPA for a student's major at a school.
 * Tries exact match first, then partial match (e.g. 'Engineering' matches
 * 'Mechanical Engineering'), then falls back to 'default'.
 */
function getMajorMinGpa(school, major) {
  const map = school.majorMinGpa;
  if (!map) return school.minGPA;
  if (map[major] != null) return map[major];
  for (const [key, val] of Object.entries(map)) {
    if (key === 'default') continue;
    if (major.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return map['default'] ?? school.minGPA;
}

/**
 * getCompetitiveness() - returns the 1-5 competitiveness rating for a major.
 * Same partial-match fallback as getMajorMinGpa.
 */
function getCompetitiveness(school, major) {
  const map = school.competitiveness;
  if (!map) return 3;
  if (map[major] != null) return map[major];
  for (const [key, val] of Object.entries(map)) {
    if (key === 'default') continue;
    if (major.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return map['default'] ?? 3;
}

/* ══════════════════════════════════════════════════════════════════
   SCORE
══════════════════════════════════════════════════════════════════ */

/**
 * score() - returns a fit score 1-100 for a school/student pair.
 */
function score(school, student, outcomesMap = {}) {
  let s = 50;

  // Major-specific GPA gap
  const majorMinGpa = getMajorMinGpa(school, student.major || '');
  const gap = majorMinGpa - parseFloat(student.gpa || 0);
  if      (gap <= -0.5) s += 20;
  else if (gap <= -0.1) s += 13;
  else if (gap <=  0.2) s +=  5;
  else if (gap <=  0.4) s -=  5;
  else                  s -= 18;

  // Competitiveness penalty (comp 5 = -8, comp 3 = 0, comp 1 = +8)
  const comp = getCompetitiveness(school, student.major || '');
  s -= (comp - 3) * 4;

  // Admit rate bonus
  if (school.admitRate != null) {
    if      (school.admitRate >= 0.65) s += 10;
    else if (school.admitRate >= 0.50) s +=  5;
    else if (school.admitRate >= 0.35) s +=  0;
    else if (school.admitRate >= 0.25) s -=  8;
    else                               s -= 15;
  }

  // TAG bonus
  const studentGpa = parseFloat(student.gpa || 0);
  const isTagEligible = school.tagGpa != null &&
    !(school.tagExclusions || []).includes(student.major);
  if (isTagEligible && studentGpa >= school.tagGpa)         s += 15;
  else if (isTagEligible && studentGpa >= school.tagGpa - 0.2) s +=  7;

  // Honors / TAP bonus (match both old em-dash and new hyphen format)
  if ((student.honors || '').includes('actively enrolled')) {
    if ((school.tags || []).some(t => t.includes('Honors') || t.includes('TAP'))) s += 10;
  }

  // Region match
  const studentRegions = student.regions || [];
  const regionMatch    = (school.regions || []).some(r => studentRegions.includes(r));
  if (studentRegions.length === 0 || regionMatch) s += 8;
  else                                             s -= 10;

  // Industry / strength match (+6 per match)
  const studentIndustries = student.industries || [];
  if (studentIndustries.length > 0 && school.strengths) {
    const matches = studentIndustries.filter(i => school.strengths.includes(i));
    s += matches.length * 6;
  }

  // Campus size match
  if (student.size && student.size !== 'No preference' && school.size === student.size) s += 8;

  // Priority bonuses
  const priorities = student.priorities || [];
  if (priorities.includes('Research opportunities') &&
      (school.tags || []).some(t => t.toLowerCase().includes('research'))) s += 7;
  if (priorities.includes('Cost/financial aid') &&
      (school.type === 'CSU' ||
       (school.tags || []).some(t => t.toLowerCase().includes('scholarship')))) s += 8;
  if (priorities.includes('Prestige/rankings') &&
      (school.type === 'UC' || school.type === 'Private')) s += 6;
  if (priorities.includes('Social life') &&
      (school.tags || []).some(t => t.toLowerCase().includes('social'))) s += 5;
  if (priorities.includes('Staying close to home') &&
      (school.regions || []).includes('SoCal')) s += 9;
  if (priorities.includes('Job placement rate') &&
      (school.tags || []).some(t =>
        t.toLowerCase().includes('tech') || t.toLowerCase().includes('silicon'))) s += 6;

  // Extracurriculars
  const extras = student.extracurriculars || [];
  if (extras.length >= 3) s += 6;
  if (extras.length >= 5) s += 4;
  const researchExtras = ['Research Assistant', 'Research Lab'];
  if (extras.some(e => researchExtras.includes(e)) &&
      (school.tags || []).some(t => t.toLowerCase().includes('research'))) s += 8;

  // Outcomes data bonus
  const schoolOutcomes = outcomesMap[school.id] || [];
  if (schoolOutcomes.length >= 1) s += 5;
  if (schoolOutcomes.length >= 3) s += 5;

  return Math.max(1, Math.min(100, Math.round(s)));
}

/* ══════════════════════════════════════════════════════════════════
   FIT LABEL
══════════════════════════════════════════════════════════════════ */

/**
 * fitLabel() - maps a score to a human-readable label + CSS class.
 */
function fitLabel(s) {
  if (s >= 72) return { label: 'Strong Fit', colorVar: 'var(--accent3)', cssClass: 'strong'   };
  if (s >= 52) return { label: 'Good Fit',   colorVar: 'var(--gold)',    cssClass: 'good'     };
  return              { label: 'Possible',   colorVar: 'var(--accent2)', cssClass: 'possible' };
}

/* ══════════════════════════════════════════════════════════════════
   RANKING FUNCTIONS
══════════════════════════════════════════════════════════════════ */

/**
 * buildPrestigeRanking() - ranks by school prestige / selectivity.
 * Uses selectivity and admit rate (lower admit rate = more prestigious).
 */
function buildPrestigeRanking(pool) {
  return [...pool].sort((a, b) => {
    const aScore = (a.school.selectivity * 20) + ((1 - (a.school.admitRate || 0.5)) * 30);
    const bScore = (b.school.selectivity * 20) + ((1 - (b.school.admitRate || 0.5)) * 30);
    return bScore - aScore;
  }).slice(0, 6);
}

/**
 * buildFitRanking() - ranks purely by student preference fit score.
 */
function buildFitRanking(pool) {
  return [...pool].sort((a, b) => b.score - a.score).slice(0, 6);
}

/**
 * buildBalancedRanking() - blends prestige and fit equally.
 */
function buildBalancedRanking(pool) {
  return [...pool].sort((a, b) => {
    const aPrestige = (a.school.selectivity * 20) + ((1 - (a.school.admitRate || 0.5)) * 30);
    const bPrestige = (b.school.selectivity * 20) + ((1 - (b.school.admitRate || 0.5)) * 30);
    const aBlend = (a.score * 0.5) + (aPrestige * 0.5);
    const bBlend = (b.score * 0.5) + (bPrestige * 0.5);
    return bBlend - aBlend;
  }).slice(0, 6);
}

/* ══════════════════════════════════════════════════════════════════
   BUILD DECK
══════════════════════════════════════════════════════════════════ */

/**
 * buildDeck() - scores every school and returns them sorted highest-first.
 * Called once after onboarding to build the swipe deck.
 */
function buildDeck(student, outcomesMap = {}) {
  return SCHOOLS
    .map(school => ({
      school,
      score: score(school, student, outcomesMap),
      fit:   fitLabel(score(school, student, outcomesMap))
    }))
    .sort((a, b) => b.score - a.score);
}
