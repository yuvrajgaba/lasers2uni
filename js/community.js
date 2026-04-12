/**
 * community.js
 * Community tab — Transfer Wall (polaroid) + per-major chat + profile modal.
 * AI coach via callOllama() (defined in ai.js).
 *
 * NOTE: Run this SQL before deploying:
 *   ALTER TABLE outcomes ADD COLUMN IF NOT EXISTS advice text;
 */

/* ── module state ─────────────────────────────────────────────── */
let _communityChannel  = null;   // chat realtime channel
let _communityMajor    = null;
let _communityNickname = null;
let _wallChannel       = null;   // outcomes realtime channel (wall)
const _pendingSavedIds = new Set(); // dedup optimistic chat messages

/* ── school background colors for polaroid photo area ─────────── */
const SCHOOL_BG = {
  'UCLA':          '#2774AE',
  'UCSD':          '#00629B',
  'UCI':           '#0064A4',
  'UC Berkeley':   '#FDB515',
  'UCB':           '#FDB515',
  'UCSB':          '#003660',
  'UCSC':          '#003C40',
  'UCR':           '#003DA5',
  'UC Merced':     '#002856',
  'UCM':           '#002856',
  'Cal Poly SLO':  '#154734',
  'SDSU':          '#A6192E',
  'CSULB':         '#FAC817',
  'CSUN':          '#D2001E',
  'LMU':           '#00539B',
  'USC':           '#990000',
};

/* ══════════════════════════════════════════════════════════════════
   RENDER COMMUNITY TAB
══════════════════════════════════════════════════════════════════ */

async function renderCommunityTab(pane) {
  if (!pane) return;
  const major = (typeof student !== 'undefined' && student && student.major) ? student.major : 'General';

  // Clear badge when tab is opened
  const tabBtn = document.querySelector('[data-tab="community"]');
  if (tabBtn) { const b = tabBtn.querySelector('.tab-badge'); if (b) b.remove(); }

  pane.innerHTML = `
    <!-- ─── Transfer Wall ─── -->
    <div class="transfer-wall">
      <div class="wall-header">
        <div class="wall-title">
          <span class="wall-icon">🏆</span>
          <div>
            <h2 class="wall-heading">The Transfer Wall</h2>
            <p class="wall-sub">IVC students who made it</p>
          </div>
        </div>
        <div class="wall-counter" id="wall-counter">
          <span id="wall-count">0</span>
          <span class="wall-count-label">acceptances reported</span>
        </div>
      </div>
      <div class="wall-feed" id="wall-feed">
        <div class="community-msg"><div class="community-msg-body muted">Loading…</div></div>
      </div>
    </div>

    <!-- ─── Chat + profiles ─── -->
    <h2 class="section-title" style="margin-top:24px">◎ ${_esc(major)} Chat</h2>
    <p class="section-sub">
      Anonymous chat with IVC students in your major.
      Type <strong>@coach</strong>, <strong>@ai</strong>, or <strong>@transfer</strong> to get AI advice.
    </p>

    <div class="community-wrap">
      <div class="community-chat-panel">
        <div class="community-chat-header">
          <h3>${_esc(major)} chat</h3>
          <div class="muted">Realtime · anonymous nicknames</div>
        </div>
        <div class="community-chat-feed" id="chat-feed">
          <div class="community-msg"><div class="community-msg-body muted">Loading messages…</div></div>
        </div>
        <div class="community-mentions-hint">
          Tip: mention <strong>@coach</strong> to ask the AI transfer advisor.
        </div>
        <div class="community-chat-input-row">
          <input type="text" id="community-chat-input"
            placeholder="Share a tip or ask a question…" autocomplete="off" />
          <button class="btn-primary" id="community-chat-send">Send</button>
        </div>
      </div>

      <aside class="community-profiles-panel" id="community-profiles-panel">
        <h4>Students in ${_esc(major)}</h4>
        <div id="community-profiles-list">Loading profiles…</div>
      </aside>
    </div>
  `;

  // Resolve nickname
  if (typeof getOrCreateNickname === 'function' && typeof currentUserId !== 'undefined' && currentUserId) {
    _communityNickname = await getOrCreateNickname(currentUserId);
  } else {
    _communityNickname = 'guest_' + Math.floor(Math.random() * 9999);
  }

  // Wire send + enter
  const inputEl = document.getElementById('community-chat-input');
  document.getElementById('community-chat-send').onclick = () => {
    const v = (inputEl.value || '').trim();
    if (!v) return;
    inputEl.value = '';
    sendChatMessage(v);
  };
  inputEl.onkeydown = e => { if (e.key === 'Enter') document.getElementById('community-chat-send')?.click(); };

  // Subtle guest prompt at top of community pane
  const isGuest = typeof currentUserId !== 'undefined' && currentUserId &&
    String(currentUserId).startsWith('guest_');
  if (isGuest) {
    const guestBanner = document.createElement('div');
    guestBanner.style.cssText =
      'background:rgba(30,144,255,0.08);border:1px solid rgba(30,144,255,0.2);' +
      'border-radius:var(--radius-sm);padding:8px 14px;font-size:0.82rem;color:var(--muted);margin-bottom:8px;text-align:center';
    guestBanner.textContent = 'Create an account to save your progress and chat history.';
    pane.insertBefore(guestBanner, pane.firstChild);
  }

  loadTransferWall();
  await loadChatForMajor(major);
  loadProfilesSidebar(major);
}

/* ══════════════════════════════════════════════════════════════════
   TRANSFER WALL  (polaroid)
══════════════════════════════════════════════════════════════════ */

async function loadTransferWall() {
  // Tear down previous wall subscription
  if (_wallChannel) {
    try { _wallChannel.unsubscribe?.(); } catch (_) {}
    _wallChannel = null;
  }

  let outcomes = [];
  if (typeof getRecentOutcomes === 'function') {
    outcomes = await getRecentOutcomes(100) || [];
  }
  const accepted = outcomes.filter(r => r.accepted);

  const countEl = document.getElementById('wall-count');
  if (countEl) countEl.textContent = accepted.length;

  const feed = document.getElementById('wall-feed');
  if (!feed) return;
  feed.innerHTML = '';

  if (!accepted.length) {
    feed.innerHTML = '<div class="community-msg"><div class="community-msg-body muted">Be the first IVC student to report an acceptance! 🎓 Click "🎉 Report Your Acceptance" above.</div></div>';
  } else {
    // Group by student_name
    const byStudent = {};
    accepted.forEach(row => {
      if (!byStudent[row.student_name]) {
        byStudent[row.student_name] = {
          name:   row.student_name,
          major:  row.student_major,
          gpa:    row.student_gpa,
          schools: [],
          year:   row.year,
          advice: row.advice || null
        };
      }
      byStudent[row.student_name].schools.push(row.school_name);
      if (row.advice && !byStudent[row.student_name].advice) {
        byStudent[row.student_name].advice = row.advice;
      }
    });

    Object.values(byStudent)
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .forEach(s => feed.appendChild(buildWallCard(s)));

    // Draw SVG connection lines after layout settles
    setTimeout(drawWallConnections, 100);
  }

  // Direct realtime subscription (separate channel from outcomes.js)
  const client = (typeof getClient === 'function') ? getClient() : null;
  if (client) {
    _wallChannel = client
      .channel('outcomes-wall')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'outcomes' },
        payload => {
          const newRow = payload.new;
          if (!newRow.accepted) return;

          const feed2 = document.getElementById('wall-feed');
          if (!feed2) return;

          // Remove placeholder
          const ph = feed2.querySelector('.community-msg');
          if (ph) ph.remove();

          feed2.prepend(buildWallCard({
            name:    newRow.student_name,
            major:   newRow.student_major,
            gpa:     newRow.student_gpa,
            schools: [newRow.school_name],
            year:    newRow.year,
            advice:  newRow.advice || null
          }));

          setTimeout(drawWallConnections, 150);

          const c = document.getElementById('wall-count');
          if (c) c.textContent = (parseInt(c.textContent) || 0) + 1;

          // Notification badge on Community tab
          const tab = document.querySelector('[data-tab="community"]');
          if (tab) {
            let badge = tab.querySelector('.tab-badge');
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'tab-badge';
              tab.appendChild(badge);
            }
            badge.textContent = (parseInt(badge.textContent) || 0) + 1;
          }
        }
      )
      .subscribe();
  }
}

// Global so outcomes.js can call window.refreshTransferWall()
window.refreshTransferWall = loadTransferWall;

/* ─── Polaroid card builder ───────────────────────────────────── */

function buildWallCard(s) {
  const card = document.createElement('div');
  card.className = 'wall-card';

  // Deterministic tilt: −5° to +5°
  const hash = (s.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  card.style.setProperty('--rotation', ((hash % 11) - 5) + 'deg');

  const anonName   = anonymizeName(s.name);
  const gpaRange   = getGpaRange(s.gpa);
  const mainSchool = (s.schools || [])[0] || '';
  const schoolData = (typeof SCHOOLS !== 'undefined') ? SCHOOLS.find(sc => sc.name === mainSchool) : null;
  const mainEmoji  = schoolData?.emoji || '🎓';
  const photoBg    = SCHOOL_BG[mainSchool] || '#1a3a5c';

  const schoolPills = (s.schools || []).map(sn =>
    `<span class="wall-card-school-pill">${_esc(sn)}</span>`
  ).join('');

  card.innerHTML = `
    <div class="wall-card-photo" style="background:${photoBg}">
      <span>${mainEmoji}</span>
    </div>
    <div class="wall-card-name">${_esc(anonName)}</div>
    <div class="wall-card-meta">${_esc(s.major || 'Unknown major')} · GPA ${_esc(gpaRange)}</div>
    <div class="wall-card-school">${schoolPills}</div>
    ${s.advice ? `<div class="wall-card-advice">"${_esc(s.advice)}"</div>` : ''}
    <button class="wall-react-btn" data-count="0">🤍 0</button>
    <span class="wall-card-year">${s.year || ''}</span>
  `;

  const reactBtn = card.querySelector('.wall-react-btn');
  reactBtn.addEventListener('click', () => {
    const isReacted = reactBtn.classList.toggle('reacted');
    const count     = parseInt(reactBtn.dataset.count) || 0;
    const newCount  = isReacted ? count + 1 : Math.max(0, count - 1);
    reactBtn.dataset.count = newCount;
    reactBtn.textContent   = isReacted ? `❤️ ${newCount}` : `🤍 ${newCount}`;
  });

  return card;
}

/* ─── SVG connection lines ────────────────────────────────────── */

function drawWallConnections() {
  const feed = document.getElementById('wall-feed');
  if (!feed) return;

  feed.querySelectorAll('.wall-connections').forEach(el => el.remove());

  const cards = Array.from(feed.querySelectorAll('.wall-card'));
  if (cards.length < 2) return;

  const feedRect = feed.getBoundingClientRect();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('wall-connections');
  svg.setAttribute('width',  feed.offsetWidth);
  svg.setAttribute('height', feed.offsetHeight);

  const limit = Math.min(cards.length - 1, 8);
  for (let i = 0; i < limit; i++) {
    const r1 = cards[i].getBoundingClientRect();
    const r2 = cards[i + 1].getBoundingClientRect();
    const x1 = (r1.left - feedRect.left + r1.width  / 2).toFixed(1);
    const y1 = (r1.top  - feedRect.top  + r1.height / 2).toFixed(1);
    const x2 = (r2.left - feedRect.left + r2.width  / 2).toFixed(1);
    const y2 = (r2.top  - feedRect.top  + r2.height / 2).toFixed(1);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', 'rgba(255,180,50,0.22)');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '5,5');
    svg.appendChild(line);
  }

  feed.prepend(svg);
}

/* ─── helpers ─────────────────────────────────────────────────── */

function anonymizeName(realName) {
  const adjectives = ['Silent','Brave','Calm','Swift','Bold','Clever','Fierce','Gentle','Happy','Mighty','Proud','Noble','Keen','Jolly','Witty'];
  const animals    = ['Fox','Owl','Wolf','Hawk','Lion','Bear','Eagle','Tiger','Panda','Falcon','Otter','Lynx','Crane','Raven','Moose'];
  const hash = (realName || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return adjectives[hash % adjectives.length] + ' ' + animals[Math.floor(hash / 10) % animals.length];
}

function getGpaRange(gpa) {
  const g = parseFloat(gpa);
  if (isNaN(g)) return 'N/A';
  if (g >= 3.5) return '3.5–4.0';
  if (g >= 3.0) return '3.0–3.5';
  if (g >= 2.5) return '2.5–3.0';
  return '2.0–2.5';
}

/* ══════════════════════════════════════════════════════════════════
   COMMUNITY CHAT  (realtime with optimistic updates + dedup)
══════════════════════════════════════════════════════════════════ */

async function loadChatForMajor(major) {
  // Unsubscribe previous channel
  if (_communityChannel) {
    try { _communityChannel.unsubscribe?.(); } catch (_) {}
    _communityChannel = null;
  }
  _communityMajor = major;

  const feed = document.getElementById('chat-feed');
  if (!feed) return;
  feed.innerHTML = '';

  let messages = [];
  if (typeof getChatMessages === 'function') {
    messages = await getChatMessages(major, 50) || [];
  }

  if (!messages.length) {
    feed.innerHTML = `<div class="community-msg"><div class="community-msg-body muted">
      No messages yet. Be the first — or type <strong>@coach</strong> for AI advice.
    </div></div>`;
  } else {
    messages.forEach(m => appendMessageToFeed(m));
    scrollChatToBottom();
  }

  // Subscribe with dedup: skip rows already rendered via optimistic update
  if (typeof subscribeToChat === 'function') {
    _communityChannel = subscribeToChat(major, row => {
      const f = document.getElementById('chat-feed');
      if (!f) return;
      if (row.id && (f.querySelector(`[data-msg-id="${row.id}"]`) || _pendingSavedIds.has(String(row.id)))) return;
      appendMessageToFeed(row);
      scrollChatToBottom();
    });
  }
}

function appendMessageToFeed(msg) {
  const feed = document.getElementById('chat-feed');
  if (!feed) return;

  // Clear placeholder
  if (feed.children.length === 1 && feed.children[0].querySelector('.muted')) {
    feed.innerHTML = '';
  }

  const div = document.createElement('div');
  div.className = 'community-msg';
  if (msg.id) div.dataset.msgId = String(msg.id);

  const head = document.createElement('div');
  head.className = 'community-msg-head';

  const name = document.createElement('span');
  name.className = 'community-msg-name' + (msg.is_ai ? ' ai' : '');

  if (msg.is_ai) {
    name.textContent = '🤖 Transfer Coach';
  } else {
    const displayName = msg.display_name || 'anonymous';
    name.textContent = displayName;
    name.classList.add('clickable-name');
    name.dataset.userId      = msg.user_id  || '';
    name.dataset.displayName = displayName;
    name.addEventListener('click', () =>
      openUserProfile(name.dataset.userId, name.dataset.displayName)
    );
  }

  const time = document.createElement('span');
  time.className   = 'community-msg-time';
  time.textContent = formatChatTime(msg.sent_at);

  head.appendChild(name);
  head.appendChild(time);

  const body = document.createElement('div');
  body.className   = 'community-msg-body' + (msg.is_ai ? ' coach-msg' : '');
  body.textContent = msg.content;

  div.appendChild(head);
  div.appendChild(body);
  feed.appendChild(div);
}

function scrollChatToBottom() {
  const feed = document.getElementById('chat-feed');
  if (feed) feed.scrollTop = feed.scrollHeight;
}

function formatChatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

async function sendChatMessage(content) {
  if (!_communityMajor || !content) return;

  const name   = _communityNickname || 'anonymous';
  const userId = (typeof currentUserId !== 'undefined') ? currentUserId : null;

  // Optimistic update — show immediately
  const tempId = 'temp_' + Date.now();
  appendMessageToFeed({
    id:           tempId,
    display_name: name,
    content,
    sent_at:      new Date().toISOString(),
    is_ai:        false,
    user_id:      userId
  });
  scrollChatToBottom();

  // Persist
  if (typeof saveChatMessage === 'function') {
    const saved = await saveChatMessage(userId, _communityMajor, name, content, false);
    if (saved?.id) {
      const realId = String(saved.id);
      _pendingSavedIds.add(realId);
      setTimeout(() => _pendingSavedIds.delete(realId), 8000);
      // Swap temp marker → real ID so future dedup works
      const feed = document.getElementById('chat-feed');
      const tempEl = feed?.querySelector(`[data-msg-id="${tempId}"]`);
      if (tempEl) tempEl.dataset.msgId = realId;
    }
  }

  // AI coach trigger
  if (/@coach|@ai|@bot|@transfer/i.test(content)) {
    await handleAICoachMessage(content, _communityMajor);
  }
}

async function handleAICoachMessage(userMessage, major) {
  const userId = (typeof currentUserId !== 'undefined') ? currentUserId : null;

  // Typing indicator
  const feed = document.getElementById('chat-feed');
  let typingEl = null;
  if (feed) {
    typingEl = document.createElement('div');
    typingEl.className = 'community-msg';
    typingEl.innerHTML = `
      <div class="community-msg-head">
        <span class="community-msg-name ai">🤖 Transfer Coach</span>
      </div>
      <div class="community-msg-body">
        <span class="typing-dots">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </span>
      </div>`;
    feed.appendChild(typingEl);
    scrollChatToBottom();
  }

  // Build outcomes context
  let outcomesContext = '';
  try {
    if (typeof getRecentOutcomes === 'function') {
      const rows = await getRecentOutcomes(20);
      if (rows?.length) {
        const majorRows = rows.filter(r => r.student_major === major && r.accepted);
        if (majorRows.length) {
          outcomesContext = '\nRecent IVC acceptances for this major:\n' +
            majorRows.slice(0, 10).map(r =>
              `- GPA ${r.student_gpa} → ${r.school_name} (${r.year})`
            ).join('\n');
        }
      }
    }
  } catch (_) {}

  const s = (typeof student !== 'undefined' && student) ? student : {};

  const systemPrompt =
`You are the IVC Transfer Coach, an AI advisor in the Laser2Uni community chatroom for ${major} students.

You have access to real IVC transfer outcome data:
${outcomesContext || 'No outcome data available yet.'}

The current student asking: GPA ${s.gpa || 'unknown'}, Major ${s.major || major}, Honors: ${s.honors || 'unknown'}, IGETC: ${s.igetc || 'unknown'}.

Rules:
- Be direct, specific, and honest. No fluff.
- Give real percentage estimates for admission chances based on GPA ranges when asked.
- If someone mentions a GPA below 2.8, tell them clearly that grades must come first.
- Reference IVC-specific programs: TAG, Honors-to-Honors, Cal-GETC, ASSIST.org.
- Keep responses under 120 words.
- Be conversational, like a knowledgeable older student who went through this.
- Do NOT say "as an AI." Do NOT use markdown or bullet points.`;

  const reply = await callOllama(systemPrompt, userMessage, []);

  if (typingEl) typingEl.remove();

  if (!reply) console.warn('[Ollama] Got null response, showing fallback');
  const text = reply
    || 'Ollama is offline right now. Run "OLLAMA_ORIGINS=* ollama serve" in Terminal to enable the AI coach.';

  if (typeof saveChatMessage === 'function') {
    await saveChatMessage(userId, major, 'Transfer Coach', text, true);
  } else {
    appendMessageToFeed({ display_name: 'Transfer Coach', content: text, is_ai: true, sent_at: new Date().toISOString() });
    scrollChatToBottom();
  }
}

/* ══════════════════════════════════════════════════════════════════
   PROFILES SIDEBAR
══════════════════════════════════════════════════════════════════ */

async function loadProfilesSidebar(major) {
  const list = document.getElementById('community-profiles-list');
  if (!list) return;
  list.textContent = '';

  let profiles = [];
  if (typeof getProfilesByMajor === 'function') {
    profiles = await getProfilesByMajor(major) || [];
  }

  if (!profiles.length) {
    list.innerHTML = '<div class="muted" style="font-size:0.85rem">No public profiles yet for this major.</div>';
    return;
  }

  profiles.forEach(p => list.appendChild(renderProfileCard(p)));
}

function renderProfileCard(profile) {
  const div = document.createElement('div');
  div.className = 'profile-card';

  const name = document.createElement('div');
  name.className = 'profile-card-name clickable-name';
  name.textContent = '🎭 ' + (profile.nickname || 'anonymous');
  // Sidebar already has all data — show directly without extra fetch
  name.addEventListener('click', () => showProfileModal({
    nickname: profile.nickname,
    major:    profile.major,
    gpa:      profile.gpa,
    honors:   profile.honors,
    schools:  profile.accepted_schools || [],
    advice:   profile.advice
  }));
  div.appendChild(name);

  const gpaRange = roundGpaRange(profile.gpa);
  const rows = [];
  if (profile.major)  rows.push(['Major', profile.major]);
  if (gpaRange)       rows.push(['GPA', gpaRange]);
  if (profile.honors) rows.push(['Honors', profile.honors]);
  if (Array.isArray(profile.accepted_schools) && profile.accepted_schools.length) {
    rows.push(['Accepted to', profile.accepted_schools.slice(0, 3).join(', ')]);
  }

  rows.forEach(([k, v]) => {
    const row = document.createElement('div');
    row.className = 'profile-card-row';
    row.innerHTML = `<strong>${_esc(k)}:</strong> ${_esc(v)}`;
    div.appendChild(row);
  });
  return div;
}

function roundGpaRange(gpa) {
  if (gpa == null) return null;
  const n = parseFloat(gpa);
  if (isNaN(n)) return null;
  const lo = Math.floor(n * 2) / 2;
  const hi = Math.min(4.0, lo + 0.5);
  return `${lo.toFixed(1)}–${hi.toFixed(1)}`;
}

/* ══════════════════════════════════════════════════════════════════
   USER PROFILE MODAL
══════════════════════════════════════════════════════════════════ */

/**
 * openUserProfile()
 * Fetches fresh data for a user then shows the modal.
 * Accepts either a real userId or a display/nickname string.
 */
async function openUserProfile(userId, displayName) {
  // Show loading shell immediately
  showProfileModal({ nickname: displayName || 'Loading…', major: null, gpa: null, honors: null, schools: [], advice: null });

  const client = (typeof getClient === 'function') ? getClient() : null;
  if (!client) return;

  let nickname = displayName || 'anonymous';
  let major = null, gpa = null, honors = null, advice = null;
  let schools = [];

  try {
    const isRealUser = userId &&
      !String(userId).startsWith('guest_') &&
      !String(userId).startsWith('local_') &&
      !String(userId).startsWith('temp_');

    if (isRealUser) {
      // Resolve nickname
      const { data: nn } = await client
        .from('user_nicknames')
        .select('nickname')
        .eq('user_id', userId)
        .maybeSingle();
      if (nn?.nickname) nickname = nn.nickname;

      // Onboarding data
      const { data: ob } = await client
        .from('onboarding')
        .select('gpa, major, honors')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ob) { gpa = ob.gpa; major = ob.major; honors = ob.honors; }
    }

    // Accepted schools from outcomes — match on the real name portion of displayName
    const lookupName = (displayName || '').split(' · ')[0].replace(/_/g, ' ').trim();
    if (lookupName) {
      const { data: outcomeRows } = await client
        .from('outcomes')
        .select('school_name, advice')
        .eq('student_name', lookupName)
        .eq('accepted', true);
      if (outcomeRows?.length) {
        schools = [...new Set(outcomeRows.map(r => r.school_name))];
        advice  = outcomeRows.find(r => r.advice)?.advice || null;
      }
    }
  } catch (_) {}

  // Re-render with fresh data
  showProfileModal({ nickname, major, gpa, honors, schools, advice });
}

/**
 * showProfileModal()
 * Creates a dynamic modal and appends it to body.
 * data: { nickname, major, gpa, honors, schools[], advice }
 */
function showProfileModal(data) {
  document.getElementById('dynamic-profile-modal')?.remove();

  const modal = document.createElement('div');
  modal.id        = 'dynamic-profile-modal';
  modal.className = 'community-profile-modal';
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  const gpaDisplay  = data.gpa ? roundGpaRange(data.gpa) : null;
  const schoolPills = (data.schools || []).map(sn => {
    const sd = (typeof SCHOOLS !== 'undefined') ? SCHOOLS.find(s => s.name === sn) : null;
    return `<span style="background:rgba(61,232,160,0.12);color:var(--accent3);border-radius:99px;padding:3px 12px;font-size:0.8rem;font-weight:600;border:1px solid rgba(61,232,160,0.25)">${sd ? sd.emoji + ' ' : '🎓 '}${_esc(sn)}</span>`;
  }).join('');

  modal.innerHTML = `
    <div class="profile-modal-box">
      <button class="profile-modal-close"
        onclick="document.getElementById('dynamic-profile-modal')?.remove()">✕</button>
      <div class="profile-modal-nickname">🎭 ${_esc(data.nickname || 'anonymous')}</div>
      ${data.major ? `<div style="display:inline-block;background:rgba(30,144,255,0.15);color:var(--accent);border-radius:99px;padding:3px 12px;font-size:0.82rem;font-weight:600;margin-bottom:8px">${_esc(data.major)}</div>` : ''}
      ${gpaDisplay ? `<div class="profile-modal-row">GPA Range: ${_esc(gpaDisplay)}</div>` : ''}
      ${data.honors ? `<div class="profile-modal-row">🏅 ${_esc(data.honors)}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
        ${schoolPills || '<span style="color:var(--muted);font-size:0.85rem">No reported acceptances yet</span>'}
      </div>
      ${data.advice ? `<div class="profile-modal-advice">"${_esc(data.advice)}"</div>` : ''}
    </div>
  `;

  document.body.appendChild(modal);
}

function closeProfileModal() {
  document.getElementById('dynamic-profile-modal')?.remove();
  // Also close the static HTML modal if it exists
  document.getElementById('community-profile-modal')?.classList.add('hidden');
}

/* ─── utilities ──────────────────────────────────────────────── */

function _esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
