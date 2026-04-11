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

/**
 * generateAIContent()
 * Main entry point. Returns AI-generated dashboard data or fallback.
 *
 * @param {Object} student – collected form data
 * @param {Object} tiers   – { reach, match, safety } from tierSchools()
 * @returns {Promise<Object>} dashboard JSON
 */
async function generateAIContent(student, tiers) {
  if (!OLLAMA_ENABLED) {
    console.info('[ai.js] Ollama disabled — using fallback content.');
    return buildFallback(student, tiers);
  }

  const allSchools = [
    ...tiers.reach .map(x => ({ ...x.school, tier: 'reach'  })),
    ...tiers.match .map(x => ({ ...x.school, tier: 'match'  })),
    ...tiers.safety.map(x => ({ ...x.school, tier: 'safety' }))
  ];

  if (allSchools.length === 0) return buildFallback(student, tiers);

  const prompt   = buildPrompt(student, allSchools);
  const endpoint = `${OLLAMA_URL}/api/generate`;

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        prompt,
        stream: false,
        options: {
          num_predict: AI_MAX_TOKENS,
          temperature: 0.4
        }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Ollama API ${resp.status}: ${errText}`);
    }

    const data    = await resp.json();
    const rawText = data.response ?? '';

    // Robustly extract the JSON block from the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in API response');

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;

  } catch (err) {
    console.error('[ai.js] Ollama call failed — falling back:', err.message);
    return buildFallback(student, tiers);
  }
}

/**
 * buildPrompt() — constructs the Ollama prompt.
 * Returns a string requesting a specific JSON shape.
 */
function buildPrompt(student, schools) {
  const schoolList = schools
    .map(s => {
      const gpaGap = (parseFloat(student.gpa || 0) - s.minGPA).toFixed(2);
      return [
        `  [${s.tier.toUpperCase()}] ${s.name} (${s.type}, ${s.loc})`,
        `    - School min GPA: ${s.minGPA}`,
        `    - Student GPA gap vs school min: ${gpaGap}`,
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

  return `You are an expert college transfer counselor at Irvine Valley College (IVC) in Irvine, CA. Generate a highly personalized transfer plan for this specific student.

STUDENT PROFILE:
${studentFacts}

THEIR TIERED SCHOOLS:
${schoolList}

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

Return ONLY a valid JSON object with NO markdown fencing, NO explanation — just the raw JSON:

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
function buildFallback(student, tiers) {
  const allSchools = [
    ...tiers.reach .map(x => x.school),
    ...tiers.match .map(x => x.school),
    ...tiers.safety.map(x => x.school)
  ];

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
            student.honors === 'Yes — actively enrolled'
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
