/**
 * ai.js
 * Ollama integration for Laser2Uni.
 * Owner: AI person
 *
 * ── LOCAL AI NOTE ────────────────────────────────────────────────
 * By default this file calls a local Ollama server.
 * For demo day:
 *   A) Install Ollama and run `OLLAMA_ORIGINS=* ollama serve`
 *   B) Pull a model such as `ollama pull llama3.1`
 *   C) Leave OLLAMA_ENABLED = false to use buildFallback()
 * ─────────────────────────────────────────────────────────────────
 */

const OLLAMA_ENABLED = true;
const OLLAMA_URL     = 'http://localhost:11434';
const AI_MODEL       = 'llama3.1';
const AI_MAX_TOKENS = 1000;

/* ══════════════════════════════════════════════════════════════════
   callOllama()  —  single global function for ALL AI calls
   Uses /api/chat (supports conversation history properly).
   Returns the text response, or null if Ollama is offline.
══════════════════════════════════════════════════════════════════ */

/**
 * callOllama(systemPrompt, userMessage, conversationHistory)
 *
 * @param {string}   systemPrompt        - Instructions / role definition
 * @param {string}   userMessage         - Latest user message
 * @param {Array}    conversationHistory - Prior messages [{role, content}]
 * @param {number}   timeoutMs           - Default 60 000 ms
 * @returns {Promise<string|null>}       - Text reply, or null if offline
 */
async function callOllama(systemPrompt, userMessage, conversationHistory = [], timeoutMs = 60000) {
  if (!OLLAMA_ENABLED) return null;

  const messages = conversationHistory.length > 0
    ? conversationHistory
    : [{ role: 'user', content: userMessage }];

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  controller.signal,
      body: JSON.stringify({
        model:  AI_MODEL,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      })
    });

    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`Ollama ${resp.status}`);

    const data = await resp.json();
    const text = (data.message?.content || data.response || '').trim();
    return text || null;

  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('[callOllama] failed:', err.message);
    }
    return null;
  }
}

/**
 * generateAIContent()
 * Main entry point. Returns AI-generated dashboard data or fallback.
 *
 * @param {Object} student – collected form data
 * @param {Object} tiers   – { reach, match, safety } from tierSchools()
 * @returns {Promise<Object>} dashboard JSON
 */
async function generateAIContent(student, schoolsList, outcomesData = []) {
  if (!OLLAMA_ENABLED) {
    console.info('[ai.js] Ollama disabled  -  using fallback content.');
    return buildFallback(student, schoolsList);
  }

  // schoolsList is an array of {school, score, fit} items (balancedList)
  const allSchools = (schoolsList || []).map((x, i) => ({
    ...x.school,
    rank:     i + 1,
    fitScore: x.score
  }));

  if (allSchools.length === 0) return buildFallback(student, schoolsList);

  const systemPrompt = 'You are an expert college transfer counselor. Return only valid JSON, no markdown fencing, no explanation — just the raw JSON object as instructed.';
  const userMessage  = buildPrompt(student, allSchools, outcomesData);

  const rawText = await callOllama(systemPrompt, userMessage, [], 60000);

  if (!rawText) {
    console.warn('[ai.js] Ollama offline — using fallback');
    return buildFallback(student, schoolsList);
  }

  try {
    // Robustly extract the JSON block from the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[ai.js] JSON parse failed — falling back:', err.message);
    return buildFallback(student, schoolsList);
  }
}

/**
 * buildPrompt()  -  constructs the Ollama prompt.
 * Returns a string requesting a specific JSON shape.
 */
function buildPrompt(student, schools, outcomesData = []) {
  const schoolList = schools
    .map(s => {
      const majorMinGpa = (s.majorMinGpa || {})[student.major]
        ?? (s.majorMinGpa || {})['default']
        ?? s.minGPA;
      const gpaGap  = (parseFloat(student.gpa || 0) - majorMinGpa).toFixed(2);
      const comp    = (s.competitiveness || {})[student.major]
        ?? (s.competitiveness || {})['default'] ?? 3;
      const compLabel = comp <= 2 ? 'Accessible' : comp === 3 ? 'Competitive'
        : comp === 4 ? 'Very Competitive' : 'Highly Selective';
      const admitPct = s.admitRate ? `${Math.round(s.admitRate * 100)}%` : 'N/A';
      return [
        `  [RANK ${s.rank}] ${s.name} (${s.type}, ${s.loc})`,
        `    - Admit rate: ${admitPct} | Major competitiveness: ${compLabel}`,
        `    - Major min GPA: ${majorMinGpa} | Student GPA gap: ${gpaGap}`,
        `    - Tags: ${(s.tags || []).join(', ') || 'None listed'}`,
        `    - Strengths: ${(s.strengths || []).join(', ') || 'None listed'}`,
        `    - IVC context: ${s.ivcPerks || 'No special perk listed'}`
      ].join('\n');
    })
    .join('\n');

  const schoolJsonKeys = schools
    .map(s => `    "${s.id}"`)
    .join(',\n');

  const studentFacts = [
    `${student.name} is an IVC student majoring in ${student.major}.`,
    `Their GPA is ${student.gpa}, units completed are ${student.units || 'not specified'}, and IGETC is ${student.igetc || 'not specified'}.`,
    `Honors status: ${student.honors || 'not specified'}.`,
    `Career goal: ${student.career || 'not specified'}.`,
    `Target industries: ${(student.industries || []).join(', ') || 'not specified'}.`,
    `Grad school interest: ${student.grad || 'not specified'}.`,
    `Campus priorities: ${(student.priorities || []).join(', ') || 'not specified'}.`,
    `Region preferences: ${(student.regions || []).join(', ') || 'not specified'}.`,
    `Campus size preference: ${student.size || 'not specified'}.`,
    `Extra notes: ${student.extra || 'none'}.`
  ].join(' ');

  const relevant = (outcomesData || []).filter(d => d.outcomes && d.outcomes.length > 0);
  const outcomesSection = relevant.length === 0
    ? `REAL STUDENT OUTCOMES FROM IVC DATABASE:\nNo outcome data yet for this student's profile - base advice on IVC transfer patterns and school-specific requirements.`
    : `REAL STUDENT OUTCOMES FROM IVC DATABASE:\nThe following are real acceptance results from IVC students stored in our database. Use these to inform your advice - mention specific examples where relevant (e.g. 'An IVC student with a 3.5 GPA in CS got into UCI last year').\n\n` +
      relevant.map(d => {
        const rows = d.outcomes.map(o => {
          const year = o.created_at ? new Date(o.created_at).getFullYear() : 'recently';
          return `    - ${o.student_name}, GPA ${o.student_gpa}, ${o.student_major} - admitted ${year}`;
        }).join('\n');
        return `  ${d.schoolName}: ${d.outcomes.length} accepted student${d.outcomes.length !== 1 ? 's' : ''}\n${rows}`;
      }).join('\n');

  // Swipe decisions reveal genuine preference signals
  const likedNames   = (typeof likedItems   !== 'undefined' ? likedItems   : []).map(x => x.school.name).join(', ') || 'None recorded';
  const passedNames  = (typeof passedItems  !== 'undefined' ? passedItems  : []).map(x => x.school.name).join(', ') || 'None recorded';
  const skippedNames = (typeof skippedItems !== 'undefined' ? skippedItems : []).map(x => x.school.name).join(', ') || 'None recorded';

  const swipeSection = `STUDENT SWIPE DECISIONS:
Liked (swiped right): ${likedNames}
Passed (swiped left): ${passedNames}
Skipped (neutral): ${skippedNames}

The student's swipe decisions reveal genuine preference signals. Schools they liked should receive more detailed, enthusiastic advice. Schools they passed on should NOT appear in recommendations unless the student specifically added them back.`;

  // Major competitiveness context
  const avgComp = schools.length > 0
    ? Math.round(schools.reduce((sum, s) => {
        const c = (s.competitiveness || {})[student.major]
          ?? (s.competitiveness || {})['default'] ?? 3;
        return sum + c;
      }, 0) / schools.length)
    : 3;
  const avgCompLabel = avgComp <= 2 ? 'Accessible' : avgComp === 3 ? 'Competitive'
    : avgComp === 4 ? 'Very Competitive' : 'Highly Selective';

  const isExceptional = parseFloat(student.gpa || 0) >= 3.9
    && (student.extracurriculars || []).length >= 5
    && (student.honors || '').includes('actively enrolled');

  const compAdvice = avgComp >= 4
    ? 'This is a highly competitive major. Advice should reflect realistic expectations and strong preparation emphasis.'
    : avgComp <= 2
    ? 'This major has accessible pathways at most target schools. Advice can be more encouraging about admission chances.'
    : 'This major is moderately competitive. Encourage preparation while maintaining realistic expectations.';

  const stanfordNote = isExceptional
    ? '\nThis student has an exceptional profile (3.9+ GPA, 5+ extracurriculars, IVC Honors). Mention UC Berkeley\'s TAP Honors pathway and note that Stanford, while extremely selective (2.2% transfer rate), may be worth a reach application given their credentials.'
    : '';

  const communicationNote = student.major === 'Communication'
    ? '\nNOTE: UCI does not offer a Communication major. If UCI appears in their list, suggest UCI\'s Literary Journalism or Film & Media Studies as the closest alternatives, and weight UCSB, UCSD, and UCLA higher in fit for this student.'
    : '';

  const competitivenessSection = `MAJOR COMPETITIVENESS CONTEXT:
The student is applying for ${student.major || 'their major'}.
Average competitiveness across their target schools: ${avgCompLabel} (${avgComp}/5).
${compAdvice}${stanfordNote}${communicationNote}`;

  /* ── HONESTY RULES (injected based on GPA thresholds) ──────────── */
  const gpaNum = parseFloat(student.gpa || 0) || 0;
  const ecCount = (student.extracurriculars || []).length;
  const inHonors = /actively enrolled/i.test(student.honors || '');

  const honestyRules = [];
  honestyRules.push('HONESTY RULES — FOLLOW STRICTLY:');
  honestyRules.push('- Be realistic, not aspirational. Every school advice must include a realistic admission percentage chance for THIS student based on GPA, major competitiveness, and outcomes.');
  honestyRules.push('- Never say "with hard work anything is possible" or similar unless the student\'s stats actually support it. Empty motivation is banned.');
  honestyRules.push('- If this student\'s profile does not realistically match a school, SAY SO directly and recommend a stronger fit instead.');

  if (gpaNum > 0 && gpaNum < 2.5) {
    honestyRules.push(`- CRITICAL: This student has a GPA of ${gpaNum}, which is below the minimum for nearly all UCs and most CSUs. The TOP priority in admission_tips AND life_plan.summary must be "raise your GPA first before applying anywhere." Do NOT pretend UC transfer is realistic at this GPA. Point them to IVC academic recovery, grade replacement, and retaking classes. Do NOT sugarcoat this.`);
  } else if (gpaNum > 0 && gpaNum < 3.0) {
    honestyRules.push(`- IMPORTANT: This student's GPA (${gpaNum}) is below the competitive range for most UCs. The realistic transfer path is CSU-focused (CSUF, CSULB, SJSU, SDSU, CPP). Mention UCs ONLY as reach schools with explicit "low odds" phrasing. Advise them to aim for CSU admission as the primary plan and UC as the stretch goal.`);
  } else if (gpaNum >= 3.8 && inHonors && ecCount >= 4) {
    honestyRules.push(`- This student has an exceptional profile (GPA ${gpaNum}, IVC Honors active, ${ecCount} extracurriculars). Mention UC Berkeley's TAP (Transfer Alliance Project) Honors-to-Honors pathway explicitly in the Berkeley-relevant advice. UCLA and UCB are realistic targets. Do not undersell them.`);
  }

  honestyRules.push('- For each school, the admission_tips must include an explicit realistic chance (e.g. "Realistic admission chance: ~25%") calibrated against major competitiveness and this student\'s GPA gap.');

  const honestySection = honestyRules.join('\n');

  return `You are an expert college transfer counselor at Irvine Valley College (IVC) in Irvine, CA. Generate a highly personalized transfer plan for this specific student.

STUDENT PROFILE:
${studentFacts}

THEIR RANKED SCHOOLS:
${schoolList}

${outcomesSection}

${swipeSection}

${competitivenessSection}

${honestySection}

OUTPUT GOALS:
- Make the advice sound like it was written for this exact IVC student, not a generic transfer applicant.
- Use concrete student details repeatedly: major, GPA, honors status, IGETC status, career goals, industries, and priorities.
- Use the provided school context. Different schools should sound meaningfully different from one another.
- Be accurate and conservative. Do not invent guaranteed pathways, exact course articulations, or admissions promises that were not provided.
- If exact articulation is uncertain, say so in the IVC note and point the student to assist.org rather than hallucinating specifics.

PERSONALIZATION RULES:
- In every school's "admission_tips", mention at least 2 student-specific facts and at least 1 school-specific fact.
- Tie the advice to IVC whenever possible: transfer prep, Honors, TAG, local pipeline, or articulation planning.
- Portfolio projects must be highly specific to the student's major and career goals. Each one should sound demo-able and resume-ready, not like "build a portfolio website."
- Required courses should focus on lower-division prep categories an IVC student can act on now. Use course/category phrasing such as calculus, data structures, physics, economics, general chemistry, portfolio preparation, etc.
- "ivc_notes" should be the most IVC-specific field in each school block and should mention Honors-to-Honors or TAG only when relevant to that school.
- The life plan should reflect transfer timing: what to do now at IVC, immediately after transfer, by graduation, and within 5 years.

STYLE RULES:
- Avoid generic phrases like "network and work hard", "maintain a strong GPA", or "build leadership experience" unless followed by a concrete example tied to this student.
- Keep each string concise but information-dense.
- Do not repeat the same project ideas or sentence structure across schools.

Return ONLY a valid JSON object with NO markdown fencing, NO explanation  -  just the raw JSON:

{
  "schools": {
${schoolJsonKeys.split(',\n').map(key => {
  const id = key.trim().replace(/"/g, '');
  const s  = schools.find(x => x.id === id);
  return `    "${id}": {
      "admission_tips": "2-3 personalized sentences for ${s ? s.name : id} mentioning IVC TAG or Honors pathway where applicable",
      "projects": ["concrete portfolio project 1 for their major", "concrete project 2", "concrete project 3"],
      "transfer_requirements": {
        "gpa_required": "X.X minimum GPA for ${s ? s.name : id}",
        "required_courses": ["specific IVC course 1", "specific course 2", "specific course 3", "specific course 4"],
        "ivc_notes": "IVC-specific articulation, TAG, or Honors pathway note for ${s ? s.name : id}"
      }
    }`;
}).join(',\n')}
  },
  "life_plan": {
    "summary": "2-3 sentence career narrative personalized to ${student.name}'s goals in ${student.major}, referencing at least 2 profile details",
    "timeline": [
      {"phase": "Now at IVC", "actions": ["3 concrete actions for the next 3-6 months"]},
      {"phase": "Transfer Application Year", "actions": ["2-3 concrete actions tied to applications, prep, and portfolio"]},
      {"phase": "First Year After Transfer", "actions": ["2-3 concrete actions tied to internships, research, or recruiting"]},
      {"phase": "Senior Year / Graduation Runway", "actions": ["2-3 concrete actions tied to full-time recruiting or grad school prep"]},
      {"phase": "5-Year Goal", "actions": ["1-2 concrete outcomes tied to ${student.career || 'their long-term goal'}"]}
    ],
    "grad_school_advice": "1-2 sentences on grad school given their stated interest: ${student.grad}",
    "job_strategy": "2-3 sentences on job strategy for ${(student.industries || []).join(' / ') || 'their field'}, including specific internship, networking, or portfolio tactics"
  }
}`;
}

/**
 * buildFallback()
 * Generates polished static content so the dashboard never breaks
 * when the API is unavailable. Uses the tiered schools as input.
 *
 * @param {Object} student – collected form data
 * @param {Object} tiers – { reach, match, safety }
 * @returns {Object} same shape as the API response
 */
function buildFallback(student, schoolsList) {
  const allSchools = (schoolsList || []).map(x => x.school);

  const schoolsData = {};

  for (const school of allSchools) {
    const isTagEligible = school.tags && school.tags.some(t => t.includes('TAG'));
    const hasHonors     = school.tags && school.tags.some(t => t.includes('Honors'));

    const major = student.major || 'their major';
    const careerGoal = student.career || 'their long-term career goals';
    const industries = (student.industries || []).join(', ') || 'their target industries';
    const honorsStatus = student.honors || 'their current honors status';
    const igetcStatus = student.igetc || 'their IGETC progress';

    let admissionTip = `${school.name} is a ${itemizeSchoolAngle(school)} option for an IVC ${major} student with a ${student.gpa || 'strong'} GPA. `;
    if (isTagEligible) {
      admissionTip += `Because this campus is TAG eligible, ${student.name || 'this student'} should pair ${igetcStatus.toLowerCase()} with major prep and watch the November 1 TAG deadline closely. `;
    } else if (hasHonors) {
      admissionTip += `Their current honors status (${honorsStatus}) matters here because the IVC Honors-to-Honors pathway can make the transfer story much stronger. `;
    } else if (school.ivcPerks) {
      admissionTip += school.ivcPerks + ' ';
    } else {
      admissionTip += `IVC students transfer here regularly, so the key is matching ${careerGoal} with the right lower-division preparation now. `;
    }
    admissionTip += `Their application should connect IVC coursework, ${industries}, and why ${school.short || school.name} is a fit for ${careerGoal}.`;

    schoolsData[school.id] = {
      admission_tips: admissionTip,
      projects: buildFallbackProjects(student, school),
      transfer_requirements: {
        gpa_required: `${school.minGPA} minimum (competitive applicants often exceed this)`,
        required_courses: buildFallbackCourses(student),
        ivc_notes: isTagEligible
          ? `${school.name} is TAG eligible from IVC. Verify your exact major's TAG rules on UC admissions and confirm IVC articulation on assist.org before submitting by November 1.`
          : `Review IVC's articulation agreement with ${school.name} on assist.org and compare it against your ${major} prep before registration each term.`
      }
    };
  }

  return {
    schools: schoolsData,
    life_plan: {
      summary: `${student.name || 'This student'} is using IVC as a launchpad into ${student.major || 'their next program'}, with a plan that connects ${student.career || 'their career goals'} to transfer-ready academics and portfolio proof. If they stay intentional about ${student.igetc || 'their GE plan'}, school-specific prep, and hands-on experience, they can transfer with a much clearer story than a generic applicant.`,
      timeline: [
        {
          phase: 'Now at IVC',
          actions: [
            `Map ${student.major || 'major'} prerequisites term by term and verify every target school on assist.org before registering.`,
            `Turn ${student.career || 'your career goal'} into one concrete resume project this semester so your transfer story has proof, not just intent.`,
            (student.honors || '').includes('actively enrolled')
              ? 'Use IVC Honors actively: meet with counselors early and make sure any Honors-to-Honors or TAG advantage is actually on track.'
              : 'Meet with an IVC counselor to decide whether Honors, TAG, or a stronger IGETC plan would improve your transfer options.'
          ]
        },
        {
          phase: 'Transfer Application Year',
          actions: [
            'Finalize essays and application materials around why your target schools match your major, goals, and IVC background.',
            'Polish 2-3 portfolio pieces or experiences that make you memorable in transfer review and later internship recruiting.'
          ]
        },
        {
          phase: 'First Year After Transfer',
          actions: [
            `Join one club, lab, or project team tied to ${(student.industries || []).join(', ') || 'your target field'} within your first term.`,
            'Apply early for internships, research roles, or part-time campus opportunities before recruiting windows close.',
            'Build faculty and alumni relationships right away so referrals and recommendations are in place before senior year.'
          ]
        },
        {
          phase: 'Senior Year / Graduation Runway',
          actions: [
            'Convert internships, research, or project work into a focused resume, portfolio, and interview narrative.',
            student.grad === 'Definitely yes' || student.grad === 'Maybe someday'
              ? 'Decide whether to apply for grad school immediately or after industry experience, and gather recommendation letters early.'
              : 'Focus on full-time recruiting and use transfer-specific resilience as part of your interview story.'
          ]
        },
        {
          phase: '5-Year Goal',
          actions: [
            `Be established in a role connected to ${student.career || 'your long-term goal'} and use your transfer story as part of your professional identity.`
          ]
        }
      ],
      grad_school_advice: student.grad === 'No thanks'
        ? 'Grad school does not need to be part of the immediate plan. Prioritize internships, practical experience, and a strong first job, then revisit graduate study only if it clearly unlocks the next step.'
        : `Because grad school interest is "${student.grad || 'not specified'}," start tracking professors, labs, or mentors connected to ${student.major || 'your field'} as soon as you transfer so you keep both industry and graduate options open.`,
      job_strategy: `Target ${(student.industries || []).join(', ') || 'your preferred industries'} by building proof early: one polished project, one experience with real users or stakeholders, and one warm network path through professors, alumni, or transfer-friendly recruiters. The strongest move is to start internship outreach in your first transfer term rather than waiting for senior year.`
    }
  };
}

function itemizeSchoolAngle(school) {
  if (school.type === 'UC') return 'research-forward';
  if (school.type === 'CSU') return 'career-ready';
  if (school.type === 'Private') return 'relationship-driven';
  return 'out-of-state expansion';
}

function buildFallbackProjects(student, school) {
  const major = student.major || 'your major';
  const careerGoal = student.career || 'your target role';
  const industry = (student.industries || [])[0] || 'your target field';

  if (major === 'Computer Science' || major === 'Data Science') {
    return [
      `Build a transfer-planning web app for IVC students with school matching logic, saved profiles, and a clean dashboard to show product thinking and full-stack depth.`,
      `Create a ${industry.toLowerCase()} project with a real dataset, clear metrics, and a short write-up explaining decisions and tradeoffs.`,
      `Ship a ${school.short || school.name}-aligned project that supports ${careerGoal.toLowerCase()} and can be demoed live in under 2 minutes.`
    ];
  }

  if (major.includes('Engineering')) {
    return [
      `Design a hands-on ${major.toLowerCase()} build with documented constraints, test results, and design iterations.`,
      `Create a simulation, CAD, or hardware-adjacent project that shows how you solve real engineering tradeoffs.`,
      `Package one project around ${careerGoal.toLowerCase()} with diagrams, results, and a short presentation you can reuse in interviews.`
    ];
  }

  if (major === 'Business Administration' || major === 'Marketing' || major === 'Finance' || major === 'Economics') {
    return [
      `Build a market analysis or growth strategy case study for a student-focused product and present the recommendation deck clearly.`,
      `Create a dashboard-based project that turns messy data into a decision memo for a business audience.`,
      `Run a small experiment, campaign, or financial model tied to ${careerGoal.toLowerCase()} and summarize the result with concrete metrics.`
    ];
  }

  return [
    `Create one flagship ${major.toLowerCase()} project that clearly supports ${careerGoal.toLowerCase()} and can be shown in a portfolio or interview.`,
    `Turn a class assignment into a polished public-facing artifact with reflection, results, and next steps.`,
    `Build one collaborative project at IVC that shows initiative, communication, and field-specific skill instead of only coursework.`
  ];
}

function buildFallbackCourses(student) {
  const major = student.major || '';

  if (major === 'Computer Science' || major === 'Data Science') {
    return [
      'English composition / critical thinking sequence',
      'Calculus I and II',
      'Programming fundamentals and data structures',
      'Discrete math or linear algebra where required',
      'Physics sequence if required by the target campus'
    ];
  }

  if (major.includes('Engineering')) {
    return [
      'English composition / critical thinking sequence',
      'Calculus I, II, and III where required',
      'Calculus-based physics sequence',
      'Chemistry for engineers where required',
      'Introductory engineering programming or discipline-specific prep'
    ];
  }

  if (major === 'Biology' || major === 'Pre-Med / Biology' || major === 'Chemistry' || major === 'Neuroscience') {
    return [
      'English composition / critical thinking sequence',
      'General chemistry sequence',
      'Biology sequence for majors',
      'Calculus or statistics depending on the target major',
      'Organic chemistry or physics where required by the target campus'
    ];
  }

  if (major === 'Business Administration' || major === 'Economics' || major === 'Finance' || major === 'Marketing') {
    return [
      'English composition / critical thinking sequence',
      'Microeconomics and macroeconomics',
      'Business calculus or calculus sequence',
      'Financial accounting and managerial accounting',
      'Statistics and introductory business law where required'
    ];
  }

  return [
    'English composition / critical thinking sequence',
    'Lower-division major preparation courses',
    'Statistics or calculus if required for the major',
    'Foundational introductory courses in the field',
    'IGETC completion where recommended before transfer'
  ];
}

/* ══════════════════════════════════════════════════════════════════
   generateConfidenceScore()
   Returns an admission-chance analysis for one school.
   Calls callOllama(); falls back to a static estimate if offline.
══════════════════════════════════════════════════════════════════ */

async function generateConfidenceScore(school, studentObj) {
  const s  = studentObj || {};
  const gpa = parseFloat(s.gpa || 0);
  const majorMinGpa = (school.majorMinGpa || {})[s.major]
    ?? (school.majorMinGpa || {})['default']
    ?? school.minGPA
    ?? 3.0;
  const tagEligible = school.tagGpa && !(school.tagExclusions || []).includes(s.major)
    && gpa >= school.tagGpa ? 'YES' : 'NO';
  const admitPct = school.admitRate ? Math.round(school.admitRate * 100) : 50;

  const systemPrompt =
`You are a brutally honest transfer admissions counselor. Analyze this student's real chances at this specific school for their major.
Return ONLY valid JSON, no markdown:
{
  "percentage": number 0-100,
  "verdict": "one word exactly: Excellent or Strong or Possible or Unlikely or Very Unlikely",
  "reasoning": "2-3 sentences max. Be specific and honest. Reference their actual GPA vs the school competitive range, their major difficulty, TAG eligibility if applicable, and one specific thing they can do to improve chances. If GPA < 2.5, lead with fixing grades.",
  "topFactor": "single biggest factor helping them (short phrase)",
  "riskFactor": "single biggest factor hurting them (short phrase)"
}`;

  const userMessage =
`Student: ${s.name || 'Student'}
Major: ${s.major || 'unknown'}
GPA: ${gpa}
Honors: ${s.honors || 'not specified'}
IGETC: ${s.igetc || 'not specified'}
Extracurriculars: ${(s.extracurriculars || []).join(', ') || 'none listed'}
Priorities: ${(s.priorities || []).join(', ') || 'none'}

School: ${school.name}
School overall admit rate: ${admitPct}%
Major min GPA for this school: ${majorMinGpa}
TAG eligible for this major: ${tagEligible}`;

  const result = await callOllama(systemPrompt, userMessage, [], 30000);

  if (result) {
    try {
      const clean = result.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0] || clean);
      return normalizeConfidence(parsed);
    } catch (_) {}
  }

  return staticConfidenceFallback(gpa, majorMinGpa, admitPct, school.name, tagEligible === 'YES');
}

function normalizeConfidence(raw) {
  const validVerdicts = ['excellent','strong','possible','unlikely','very unlikely'];
  const verdict = (raw.verdict || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return {
    percentage: Math.min(100, Math.max(0, parseInt(raw.percentage) || 50)),
    verdict:    validVerdicts.includes(verdict) ? verdict : 'possible',
    reasoning:  raw.reasoning  || 'Check your GPA against the school\'s competitive range and ensure IGETC is complete.',
    topFactor:  raw.topFactor  || 'Application completeness',
    riskFactor: raw.riskFactor || 'Major competitiveness'
  };
}

function staticConfidenceFallback(gpa, minGpa, admitPct, schoolName, tagEligible) {
  const gap = gpa - minGpa;
  let pct, verdict, reasoning;

  if (tagEligible) {
    pct = 75; verdict = 'strong';
    reasoning = `Your GPA of ${gpa} meets the TAG threshold for this school — submit your TAG by November 1 to lock in admission. Complete IGETC before transfer to avoid GE requirements at ${schoolName}.`;
  } else if (gap >= 0.4) {
    pct = Math.min(70, admitPct * 1.4); verdict = 'strong';
    reasoning = `Your GPA of ${gpa} is comfortably above the ${minGpa} minimum. Focus on a strong personal insight statement and relevant extracurriculars for ${schoolName}.`;
  } else if (gap >= 0) {
    pct = Math.min(55, admitPct * 1.1); verdict = 'possible';
    reasoning = `Your GPA (${gpa}) meets the minimum (${minGpa}) but is in the competitive range. A compelling personal statement and completed IGETC will help at ${schoolName}.`;
  } else if (gap >= -0.3) {
    pct = Math.max(15, admitPct * 0.6); verdict = 'unlikely';
    reasoning = `Your GPA (${gpa}) is slightly below ${schoolName}'s competitive floor of ${minGpa}. Raise it by 0.2–0.3 before applying, or target safer CSU options.`;
  } else {
    pct = Math.max(5, admitPct * 0.25); verdict = 'very unlikely';
    reasoning = `Your GPA (${gpa}) is significantly below the ${minGpa} minimum for ${schoolName}. Prioritize grade improvement and consider CSU options before retrying.`;
  }

  return {
    percentage: Math.round(pct),
    verdict,
    reasoning,
    topFactor:  tagEligible ? 'TAG eligible' : gap >= 0 ? 'GPA meets minimum' : 'Strong extracurriculars can help',
    riskFactor: gpa < 2.5 ? 'GPA below minimum — must improve first' : gap < 0 ? 'GPA below competitive range' : 'Major competitiveness'
  };
}
