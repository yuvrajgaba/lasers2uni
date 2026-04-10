/**
 * ai.js
 * Claude API integration for Laser2Uni.
 * Owner: AI person
 *
 * ── CORS NOTE ─────────────────────────────────────────────────────
 * The Anthropic API blocks direct browser-to-API calls.
 * For demo day, pick one of:
 *   A) Launch Chrome with --disable-web-security (see README)
 *   B) Run the 10-line Node proxy in README and set PROXY_URL below
 *   C) Leave ANTHROPIC_API_KEY empty → buildFallback() runs instead
 * ─────────────────────────────────────────────────────────────────
 */

const ANTHROPIC_API_KEY = ''; // ← paste your key here
const PROXY_URL         = ''; // ← e.g. 'http://localhost:4000' if using proxy

const AI_MODEL      = 'claude-sonnet-4-6';
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
  if (!ANTHROPIC_API_KEY) {
    console.info('[ai.js] No API key — using fallback content.');
    return buildFallback(tiers);
  }

  const allSchools = [
    ...tiers.reach .map(x => ({ ...x.school, tier: 'reach'  })),
    ...tiers.match .map(x => ({ ...x.school, tier: 'match'  })),
    ...tiers.safety.map(x => ({ ...x.school, tier: 'safety' }))
  ];

  if (allSchools.length === 0) return buildFallback(tiers);

  const prompt   = buildPrompt(student, allSchools);
  const endpoint = PROXY_URL
    ? `${PROXY_URL}/v1/messages`
    : 'https://api.anthropic.com/v1/messages';

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-api-key':        ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      AI_MODEL,
        max_tokens: AI_MAX_TOKENS,
        messages: [{
          role:    'user',
          content: prompt
        }]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Anthropic API ${resp.status}: ${errText}`);
    }

    const data    = await resp.json();
    const rawText = data.content?.[0]?.text ?? '';

    // Robustly extract the JSON block from the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in API response');

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;

  } catch (err) {
    console.error('[ai.js] API call failed — falling back:', err.message);
    return buildFallback(tiers);
  }
}

/**
 * buildPrompt() — constructs the Claude prompt.
 * Returns a string requesting a specific JSON shape.
 */
function buildPrompt(student, schools) {
  const schoolList = schools
    .map(s => `  [${s.tier.toUpperCase()}] ${s.name} (${s.type}, minGPA ${s.minGPA}) — strengths: ${(s.strengths || []).join(', ')}`)
    .join('\n');

  const schoolJsonKeys = schools
    .map(s => `    "${s.id}"`)
    .join(',\n');

  return `You are an expert college transfer counselor at Irvine Valley College (IVC) in Irvine, CA. Generate a highly personalized transfer plan for this specific student.

STUDENT PROFILE:
- Name: ${student.name}
- Major: ${student.major}
- GPA: ${student.gpa}
- Units Completed: ${student.units || 'Not specified'}
- IGETC Status: ${student.igetc || 'Not specified'}
- IVC Honors: ${student.honors || 'Not specified'}
- Career Goals: ${student.career || 'Not specified'}
- Target Industries: ${(student.industries || []).join(', ') || 'Not specified'}
- Grad School Plans: ${student.grad || 'Not specified'}
- Campus Priorities: ${(student.priorities || []).join(', ') || 'Not specified'}
- Extra Notes: ${student.extra || 'None'}

THEIR TIERED SCHOOLS:
${schoolList}

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
    "summary": "2-3 sentence career narrative personalized to ${student.name}'s goals in ${student.major}",
    "timeline": [
      {"phase": "Now at IVC", "actions": ["action 1", "action 2", "action 3"]},
      {"phase": "First Year at Transfer School", "actions": ["action 1", "action 2"]},
      {"phase": "Junior & Senior Year", "actions": ["action 1", "action 2"]},
      {"phase": "Post-Graduation", "actions": ["action 1", "action 2"]},
      {"phase": "5-Year Goal", "actions": ["action 1"]}
    ],
    "grad_school_advice": "1-2 sentences on grad school given their stated interest: ${student.grad}",
    "job_strategy": "2-3 sentences on job strategy for ${(student.industries || []).join(' / ') || 'their field'}"
  }
}`;
}

/**
 * buildFallback()
 * Generates polished static content so the dashboard never breaks
 * when the API is unavailable. Uses the tiered schools as input.
 *
 * @param {Object} tiers – { reach, match, safety }
 * @returns {Object} same shape as the API response
 */
function buildFallback(tiers) {
  const allSchools = [
    ...tiers.reach .map(x => x.school),
    ...tiers.match .map(x => x.school),
    ...tiers.safety.map(x => x.school)
  ];

  const schoolsData = {};

  for (const school of allSchools) {
    const isTagEligible = school.tags && school.tags.some(t => t.includes('TAG'));
    const hasHonors     = school.tags && school.tags.some(t => t.includes('Honors'));

    let admissionTip = `${school.name} values transfer students with strong academic preparation and clear major preparation. `;
    if (isTagEligible) {
      admissionTip += `IVC students can apply for the Transfer Admission Guarantee (TAG) — complete your application by November 1 to lock in your spot. `;
    } else if (hasHonors) {
      admissionTip += `The IVC Honors-to-Honors pathway strengthens your application significantly. `;
    } else if (school.ivcPerks) {
      admissionTip += school.ivcPerks + ' ';
    } else {
      admissionTip += `IVC students transfer successfully here each year — focus on completing your major prep and IGETC. `;
    }
    admissionTip += `Write a personal insight essay that ties your IVC journey directly to your goals at ${school.short || school.name}.`;

    schoolsData[school.id] = {
      admission_tips: admissionTip,
      projects: [
        'Build a personal project portfolio hosted on GitHub that showcases technical depth in your major',
        'Complete a relevant internship, research position, or volunteer experience before transferring',
        'Lead or contribute to a club/team project at IVC that demonstrates collaboration and initiative'
      ],
      transfer_requirements: {
        gpa_required: `${school.minGPA} minimum (competitive applicants often exceed this)`,
        required_courses: [
          'English Composition — English 1A at IVC',
          'Calculus I & II — Math 3A, 3B at IVC (if STEM major)',
          'Introduction to your major field (check assist.org)',
          'Critical Thinking / Research Writing',
          'IGETC completion strongly recommended'
        ],
        ivc_notes: isTagEligible
          ? `${school.name} is TAG eligible from IVC. Submit your TAG application to UC admissions by November 1 of your transfer year. Maintain the required GPA for your specific major.`
          : `Review IVC's articulation agreement with ${school.name} at assist.org to confirm which IVC courses satisfy ${school.name}'s major requirements.`
      }
    };
  }

  return {
    schools: schoolsData,
    life_plan: {
      summary: 'Your time at IVC is building a foundation that will set you apart as a transfer student. By completing IGETC, maintaining a strong GPA, and gaining real-world experience, you\'ll arrive at your transfer school ready to hit the ground running and make the most of every opportunity.',
      timeline: [
        {
          phase: 'Now at IVC',
          actions: [
            'Complete IGETC and all major prerequisite courses — aim for A\'s in your major classes',
            'Join IVC Honors if eligible; apply for TAG by November 1 for your target UC',
            'Start building a GitHub portfolio, personal projects, and/or research experience'
          ]
        },
        {
          phase: 'First Year at Transfer School',
          actions: [
            'Connect with career services, join major-related clubs, and attend networking events',
            'Apply for internships early — freshman pipelines exist at many top companies'
          ]
        },
        {
          phase: 'Junior & Senior Year',
          actions: [
            'Complete at least one internship in your target industry to build real-world credibility',
            'Build your LinkedIn and alumni network; most jobs come through referrals',
            'If considering grad school, identify research labs or professors to work with'
          ]
        },
        {
          phase: 'Post-Graduation',
          actions: [
            'Leverage your internship network and school alumni connections for your first role',
            'Consider graduate school applications if aligned with your long-term goals'
          ]
        },
        {
          phase: '5-Year Goal',
          actions: [
            'Establish yourself as a mid-level professional in your field and begin mentoring junior colleagues'
          ]
        }
      ],
      grad_school_advice: 'If grad school is part of your plan, start building research experience and faculty relationships in your junior year — a strong research statement and recommendations make the difference.',
      job_strategy: 'The most effective job search strategy combines early internships, a strong online presence, and consistent networking through alumni events and industry meetups. Don\'t wait until senior year — start building relationships in your first semester at your transfer school.'
    }
  };
}
