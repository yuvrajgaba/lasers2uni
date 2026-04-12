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

const SUPABASE_URL      = 'https://xwfpmsduypjuslmiuuue.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZnBtc2R1eXBqdXNsbWl1dXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NjAxNTMsImV4cCI6MjA5MTQzNjE1M30.I4xsgewjoe3BZeNwU_tC1GE85HhTprgB-EnNSJ3BZS0';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let _client = null;

/**
 * initSupabase()
 * Call once on app load. Skips gracefully if keys aren't set.
 * Returns the client (or null if unconfigured).
 */
function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.info('[supabase.js] Not configured  -  DB features disabled.');
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

  const row = {
    student_name:  outcome.studentName,
    student_major: outcome.studentMajor,
    student_gpa:   parseFloat(outcome.studentGpa),
    school_id:     outcome.schoolId,
    school_name:   outcome.schoolName,
    accepted:      outcome.accepted !== false,
    year:          outcome.year || new Date().getFullYear()
  };
  if (outcome.advice) row.advice = outcome.advice;

  const { data, error } = await client.from('outcomes').insert([row]);

  if (error) console.error('[supabase.js] saveOutcome error:', error.message);
  return data;
}

/**
 * subscribeToOutcomes()
 * Realtime subscription  -  fires callback whenever a new outcome is inserted.
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
 * Fills the school checkbox list in the outcomes modal from the SCHOOLS array.
 * Called by outcomes.js when the modal opens.
 */
function populateOutcomeSchoolSelect() {
  const list = document.getElementById('outcome-school-list');
  if (!list || typeof SCHOOLS === 'undefined') return;

  list.innerHTML = '';

  SCHOOLS.forEach(school => {
    const item = document.createElement('div');
    item.className = 'school-checkbox-item';

    const cb = document.createElement('input');
    cb.type  = 'checkbox';
    cb.id    = `oc-school-${school.id}`;
    cb.value = school.id;
    cb.name  = 'outcome-school';

    const lbl = document.createElement('label');
    lbl.htmlFor     = cb.id;
    lbl.textContent = `${school.emoji} ${school.name}`;

    item.appendChild(cb);
    item.appendChild(lbl);
    list.appendChild(item);
  });
}

/* ═══════════════════════════════════════════════════════════════
   AUTH  -  Users & Sessions
═══════════════════════════════════════════════════════════════ */

/**
 * upsertUser()
 * Looks up a user by username.
 * - If found: verifies password and returns { user } or { error: 'wrong_password' }
 * - If not found: creates a new user and returns { user }
 * - Fails silently offline: returns a local guest-like user object
 *
 * @param {string} username
 * @param {string} password  plain-text (demo app)
 * @returns {Promise<{user?: Object, error?: string}>}
 */
async function upsertUser(username, password) {
  const client = getClient();
  if (!client) {
    // Offline / unconfigured  -  return a local pseudo-user so the app still works
    return { user: { id: 'local_' + Date.now(), username } };
  }

  try {
    const { data: existing, error: fetchErr } = await client
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (fetchErr) return { error: fetchErr.message };

    if (existing) {
      if (existing.password !== password) return { error: 'wrong_password' };
      return { user: existing };
    }

    // New user
    const { data, error } = await client
      .from('users')
      .insert([{ username, password }])
      .select()
      .single();

    if (error) return { error: error.message };
    return { user: data };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * saveSession()
 * Logs a new session row. Fire-and-forget.
 *
 * @param {string} userId
 */
async function saveSession(userId) {
  const client = getClient();
  if (!client || !userId || userId.startsWith('guest_') || userId.startsWith('local_')) return;
  try {
    await client.from('sessions').insert([{ user_id: userId }]);
  } catch (_) {}
}

/**
 * getLatestOnboarding()
 * Returns the most recent onboarding row for a user, or null.
 *
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function getLatestOnboarding(userId) {
  const client = getClient();
  if (!client || !userId || userId.startsWith('guest_') || userId.startsWith('local_')) return null;
  try {
    const { data, error } = await client
      .from('onboarding')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch (_) { return null; }
}

/**
 * saveOnboarding()
 * Saves completed onboarding form data for a user. Fire-and-forget.
 *
 * @param {string} userId
 * @param {Object} studentObj
 */
async function saveOnboarding(userId, studentObj) {
  const client = getClient();
  if (!client || !userId) return;
  try {
    await client.from('onboarding').insert([{
      user_id:          userId,
      name:             studentObj.name             || null,
      major:            studentObj.major            || null,
      gpa:              parseFloat(studentObj.gpa)  || null,
      units:            studentObj.units            || null,
      igetc:            studentObj.igetc            || null,
      igetc_completed:  studentObj.igetcCompleted   || [],
      honors:           studentObj.honors           || null,
      career:           studentObj.career           || null,
      industries:       studentObj.industries       || [],
      grad:             studentObj.grad             || null,
      size:             studentObj.size             || null,
      regions:          studentObj.regions          || [],
      priorities:       studentObj.priorities       || [],
      extracurriculars: studentObj.extracurriculars || [],
      extra:            studentObj.extra            || null
    }]);
  } catch (_) {}
}

/**
 * getUserOnboarding()
 * Returns the most recent onboarding row for a user, or null.
 * Alias for getLatestOnboarding  -  used in auth.js.
 */
async function getUserOnboarding(userId) {
  return getLatestOnboarding(userId);
}

/* ═══════════════════════════════════════════════════════════════
   COURSE PROGRESS
═══════════════════════════════════════════════════════════════ */

/**
 * saveCourseProgress()
 * Upserts a course completion state for a user. Fire-and-forget.
 */
async function saveCourseProgress(userId, schoolId, major, courseKey, completed) {
  const client = getClient();
  if (!client || !userId || userId.startsWith('guest_') || userId.startsWith('local_')) return;
  try {
    await client.from('course_progress').upsert([{
      user_id:      userId,
      school_id:    schoolId,
      major,
      course_key:   courseKey,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at:   new Date().toISOString()
    }], { onConflict: 'user_id,school_id,major,course_key' });
  } catch (_) {}
}

/**
 * getCourseProgress()
 * Returns all course progress rows for a user + school + major.
 */
async function getCourseProgress(userId, schoolId, major) {
  const client = getClient();
  if (!client || !userId) return [];
  try {
    const { data, error } = await client
      .from('course_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('school_id', schoolId)
      .eq('major', major);
    if (error) return [];
    return data || [];
  } catch (_) { return []; }
}

/**
 * getAllCourseProgress()
 * Returns all course progress rows for a user across all schools.
 * Used when a returning user loads the dashboard to restore state.
 */
async function getAllCourseProgress(userId) {
  const client = getClient();
  if (!client || !userId) return [];
  try {
    const { data, error } = await client
      .from('course_progress')
      .select('*')
      .eq('user_id', userId);
    if (error) return [];
    return data || [];
  } catch (_) { return []; }
}

/**
 * saveSwipe()
 * Records a single card swipe. Fire-and-forget.
 *
 * @param {string} userId
 * @param {string} schoolId
 * @param {string} direction  'right' | 'left' | 'up'
 */
async function saveSwipe(userId, schoolId, direction) {
  const client = getClient();
  if (!client || !userId || !schoolId) return;
  try {
    await client.from('swipes').insert([{ user_id: userId, school_id: schoolId, direction }]);
  } catch (_) {}
}

/**
 * getOutcomesForSchool()
 * Fetches all accepted outcomes for a given school.
 *
 * @param {string} schoolId
 * @returns {Promise<Array>}
 */
async function getOutcomesForSchool(schoolId) {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('outcomes')
      .select('*')
      .eq('school_id', schoolId)
      .eq('accepted', true);
    if (error) return [];
    return data || [];
  } catch (_) { return []; }
}

/**
 * getSimilarStudentOutcomes()
 * Fetches accepted outcomes for a school where the student's GPA
 * is within ±0.3 of the given GPA.
 *
 * @param {number} studentGpa
 * @param {string} schoolId
 * @returns {Promise<Array>}
 */
async function getSimilarStudentOutcomes(studentGpa, schoolId) {
  const client = getClient();
  if (!client) return [];
  try {
    const lo = studentGpa - 0.3;
    const hi = studentGpa + 0.3;
    const { data, error } = await client
      .from('outcomes')
      .select('*')
      .eq('school_id', schoolId)
      .eq('accepted', true)
      .gte('student_gpa', lo)
      .lte('student_gpa', hi);
    if (error) return [];
    return data || [];
  } catch (_) { return []; }
}

/* ═══════════════════════════════════════════════════════════════
   ANONYMOUS NICKNAMES
   Adjective + animal pair assigned once per user.
═══════════════════════════════════════════════════════════════ */

const NICKNAME_ADJECTIVES = [
  'silent','brave','calm','swift','bold','quiet','clever','gentle',
  'curious','fierce','kind','lucky','mellow','noble','proud','sly',
  'stellar','witty','zesty','daring','eager','humble','jolly','keen',
  'lively','merry','peppy','quirky','radiant','snappy','tidy','vivid'
];

const NICKNAME_ANIMALS = [
  'fox','owl','wolf','hawk','lion','otter','panda','tiger','bear','lynx',
  'eagle','falcon','koala','heron','raven','dolphin','seal','crane','moose','swan',
  'badger','beaver','cobra','dingo','elk','gecko','ibex','jaguar','kiwi','llama'
];

function randomNickname() {
  const a = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const b = NICKNAME_ANIMALS[Math.floor(Math.random() * NICKNAME_ANIMALS.length)];
  return `${a}_${b}`;
}

/**
 * getOrCreateNickname()
 * Returns the user's stored nickname or creates one on first call.
 *
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getOrCreateNickname(userId) {
  if (!userId) return randomNickname();
  const client = getClient();
  if (!client || userId.startsWith('guest_') || userId.startsWith('local_')) {
    return randomNickname();
  }
  try {
    const { data: existing } = await client
      .from('user_nicknames')
      .select('nickname')
      .eq('user_id', userId)
      .maybeSingle();
    if (existing && existing.nickname) return existing.nickname;

    // Try a few times in case of collision (nickname is unique)
    for (let attempt = 0; attempt < 6; attempt++) {
      const nickname = randomNickname();
      const { data, error } = await client
        .from('user_nicknames')
        .insert([{ user_id: userId, nickname }])
        .select()
        .single();
      if (!error && data) return data.nickname;
    }
    // Fallback: append a numeric suffix
    const fallback = randomNickname() + '_' + Math.floor(Math.random() * 9999);
    await client.from('user_nicknames').insert([{ user_id: userId, nickname: fallback }]);
    return fallback;
  } catch (_) {
    return randomNickname();
  }
}

/* ═══════════════════════════════════════════════════════════════
   COMMUNITY CHAT (per-major)
═══════════════════════════════════════════════════════════════ */

/**
 * getChatMessages()
 * Returns the most recent messages for a given major, oldest-first.
 */
async function getChatMessages(major, limit = 50) {
  const client = getClient();
  if (!client || !major) return [];
  try {
    const { data, error } = await client
      .from('chat_messages')
      .select('*')
      .eq('major', major)
      .order('sent_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data || []).reverse();
  } catch (_) { return []; }
}

/**
 * saveChatMessage()
 * Inserts a single community chat message.
 */
async function saveChatMessage(userId, major, displayName, content, isAi = false) {
  const client = getClient();
  if (!client || !major || !content) return null;
  try {
    const row = {
      major,
      display_name: displayName || 'anonymous',
      content,
      is_ai: !!isAi
    };
    if (userId && !userId.startsWith('guest_') && !userId.startsWith('local_')) {
      row.user_id = userId;
    }
    const { data, error } = await client
      .from('chat_messages')
      .insert([row])
      .select()
      .single();
    if (error) return null;
    return data;
  } catch (_) { return null; }
}

/**
 * subscribeToChat()
 * Realtime subscription to new chat_messages rows for a given major.
 */
function subscribeToChat(major, callback) {
  const client = getClient();
  if (!client || !major) return null;
  const channelName = 'chat-' + major.toLowerCase().replace(/\s+/g, '-');
  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `major=eq.${major}` },
      payload => {
        if (typeof callback === 'function') callback(payload.new);
      }
    )
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        console.info(`[supabase.js] Chat realtime subscribed: ${channelName}`);
      }
    });
  return channel;
}

/* ═══════════════════════════════════════════════════════════════
   SCHOOL CHAT (one conversation per user+school)
═══════════════════════════════════════════════════════════════ */

/**
 * getSchoolChat()
 * Returns the saved conversation for a user+school, or null.
 */
async function getSchoolChat(userId, schoolId) {
  const client = getClient();
  if (!client || !userId || !schoolId) return null;
  if (userId.startsWith('guest_') || userId.startsWith('local_')) return null;
  try {
    const { data, error } = await client
      .from('school_chats')
      .select('*')
      .eq('user_id', userId)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch (_) { return null; }
}

/**
 * saveSchoolChat()
 * Upserts the full message array for a user+school pair.
 */
async function saveSchoolChat(userId, schoolId, schoolName, messages) {
  const client = getClient();
  if (!client || !userId || !schoolId) return null;
  if (userId.startsWith('guest_') || userId.startsWith('local_')) return null;
  try {
    const { data, error } = await client
      .from('school_chats')
      .upsert([{
        user_id:     userId,
        school_id:   schoolId,
        school_name: schoolName,
        messages:    messages || [],
        updated_at:  new Date().toISOString()
      }], { onConflict: 'user_id,school_id' })
      .select()
      .single();
    if (error) return null;
    return data;
  } catch (_) { return null; }
}

/* ═══════════════════════════════════════════════════════════════
   STUDENT PROFILES (public anonymous cards)
═══════════════════════════════════════════════════════════════ */

/**
 * getStudentProfile()
 * Returns a single user's student_profiles row, or null.
 */
async function getStudentProfile(userId) {
  const client = getClient();
  if (!client || !userId) return null;
  if (userId.startsWith('guest_') || userId.startsWith('local_')) return null;
  try {
    const { data, error } = await client
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch (_) { return null; }
}

/**
 * upsertStudentProfile()
 * Creates or updates the public profile card for a user.
 *
 * @param {string} userId
 * @param {Object} profileData – { nickname, major, gpa, honors, extracurriculars, accepted_schools, advice, is_public }
 */
async function upsertStudentProfile(userId, profileData) {
  const client = getClient();
  if (!client || !userId || !profileData) return null;
  if (userId.startsWith('guest_') || userId.startsWith('local_')) return null;
  try {
    const row = {
      user_id:          userId,
      nickname:         profileData.nickname         || 'anonymous',
      major:            profileData.major            || null,
      gpa:              profileData.gpa != null ? parseFloat(profileData.gpa) : null,
      honors:           profileData.honors           || null,
      extracurriculars: profileData.extracurriculars || [],
      accepted_schools: profileData.accepted_schools || [],
      advice:           profileData.advice           || null,
      is_public:        profileData.is_public !== false,
      updated_at:       new Date().toISOString()
    };
    const { data, error } = await client
      .from('student_profiles')
      .upsert([row], { onConflict: 'user_id' })
      .select()
      .single();
    if (error) return null;
    return data;
  } catch (_) { return null; }
}

/**
 * getProfilesByMajor()
 * Returns public profile cards for a given major (anonymous community feed).
 */
async function getProfilesByMajor(major) {
  const client = getClient();
  if (!client || !major) return [];
  try {
    const { data, error } = await client
      .from('student_profiles')
      .select('*')
      .eq('major', major)
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (error) return [];
    return data || [];
  } catch (_) { return []; }
}
