/**
 * supabase.js
 * Supabase client + database helpers for Laser2Uni.
 * Owner: backend person
 *
 * ── SETUP ──────────────────────────────────────────────────────────
 * 1. Create a Supabase project at supabase.com
 * 2. Run the SQL from README.md in the SQL editor
 * 3. Paste your project URL and anon key below
 * ──────────────────────────────────────────────────────────────────
 */

const SUPABASE_URL      = ''; // ← e.g. 'https://abcdefgh.supabase.co'
const SUPABASE_ANON_KEY = ''; // ← long eyJ... string from project settings

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let _client = null;

/**
 * initSupabase()
 * Call once on app load. Skips gracefully if keys aren't set.
 * Returns the client (or null if unconfigured).
 */
function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.info('[supabase.js] Not configured — DB features disabled.');
    return null;
  }

  try {
    // supabase global is loaded from the CDN script tag
    _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.info('[supabase.js] Client ready.');
    return _client;
  } catch (err) {
    console.error('[supabase.js] Init failed:', err);
    return null;
  }
}

/**
 * getClient()
 * Returns the initialized client or null.
 * Lazy-initializes if initSupabase() hasn't been called yet.
 */
function getClient() {
  if (!_client && SUPABASE_URL && SUPABASE_ANON_KEY) initSupabase();
  return _client;
}

/* ═══════════════════════════════════════════════════════════════
   STUDENTS TABLE
   Saves each new student profile that completes onboarding.
═══════════════════════════════════════════════════════════════ */

/**
 * saveStudent()
 * Inserts a student record after onboarding completes.
 *
 * @param {Object} student – collected form data
 * @returns {Promise<Object|null>}
 */
async function saveStudent(student) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client.from('students').insert([{
    name:       student.name,
    major:      student.major,
    gpa:        parseFloat(student.gpa),
    igetc:      student.igetc      || null,
    honors:     student.honors     || null,
    career:     student.career     || null,
    industries: student.industries || [],
    grad:       student.grad       || null,
    size:       student.size       || null,
    regions:    student.regions    || [],
    priorities: student.priorities || [],
    extra:      student.extra      || null
  }]);

  if (error) console.error('[supabase.js] saveStudent error:', error.message);
  return data;
}

/* ═══════════════════════════════════════════════════════════════
   OUTCOMES TABLE
   Past IVC students log where they got accepted.
   Powers the live toast feed during the demo.
═══════════════════════════════════════════════════════════════ */

/**
 * saveOutcome()
 * Records an IVC student acceptance.
 *
 * @param {{studentName, studentMajor, studentGpa, schoolId, schoolName, accepted?, year?}} outcome
 * @returns {Promise<Object|null>}
 */
async function saveOutcome(outcome) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client.from('outcomes').insert([{
    student_name:  outcome.studentName,
    student_major: outcome.studentMajor,
    student_gpa:   parseFloat(outcome.studentGpa),
    school_id:     outcome.schoolId,
    school_name:   outcome.schoolName,
    accepted:      outcome.accepted !== false, // default true
    year:          outcome.year || new Date().getFullYear()
  }]);

  if (error) console.error('[supabase.js] saveOutcome error:', error.message);
  return data;
}

/**
 * subscribeToOutcomes()
 * Realtime subscription — fires callback whenever a new outcome is inserted.
 * Used to show live toast notifications during the demo.
 *
 * @param {Function} callback – called with the new row object
 * @returns {Object|null} Supabase Realtime channel (call .unsubscribe() to clean up)
 */
function subscribeToOutcomes(callback) {
  const client = getClient();
  if (!client) return null;

  const channel = client
    .channel('outcomes-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'outcomes' },
      payload => {
        if (typeof callback === 'function') callback(payload.new);
      }
    )
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        console.info('[supabase.js] Realtime: subscribed to outcomes.');
      }
    });

  return channel;
}

/**
 * getRecentOutcomes()
 * Fetches the most recent accepted outcomes for display.
 *
 * @param {number} limit – default 10
 * @returns {Promise<Array>}
 */
async function getRecentOutcomes(limit = 10) {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('outcomes')
    .select('*')
    .eq('accepted', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) console.error('[supabase.js] getRecentOutcomes error:', error.message);
  return data || [];
}

/**
 * populateOutcomeSchoolSelect()
 * Fills the school dropdown in the outcomes modal from the SCHOOLS array.
 * Called by ui.js when the modal opens.
 */
function populateOutcomeSchoolSelect() {
  const select = document.getElementById('outcome-school');
  if (!select || typeof SCHOOLS === 'undefined') return;

  // Clear existing options except the placeholder
  while (select.options.length > 1) select.remove(1);

  SCHOOLS.forEach(school => {
    const opt   = document.createElement('option');
    opt.value   = school.id;
    opt.textContent = school.name;
    select.appendChild(opt);
  });
}
