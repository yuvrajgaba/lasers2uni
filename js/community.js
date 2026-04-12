/**
 * community.js
 * Community tab — Transfer Wall + per-major chat + profile modal.
 * AI coach via callOllama() (defined in ai.js).
 *
 * NOTE: Run this in Supabase SQL Editor before deploying:
 *   ALTER TABLE outcomes ADD COLUMN IF NOT EXISTS advice text;
 */

let _communityChannel  = null;
let _communityMajor    = null;
let _communityNickname = null;

/* ══════════════════════════════════════════════════════════════════
   RENDER COMMUNITY TAB
══════════════════════════════════════════════════════════════════ */

async function renderCommunityTab(pane) {
  if (!pane) return;
  const major = (typeof student !== 'undefined' && student && student.major) ? student.major : 'General';

  // Clear any existing badge when this tab is opened
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
        <div class="community-chat-feed" id="community-chat-feed">
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
  inputEl.onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('community-chat-send')?.click(); };

  // Load Transfer Wall
  loadTransferWall();

  // Load major chat
  await loadChatForMajor(major);

  // Load profiles sidebar
  loadProfilesSidebar(major);
}

/* ══════════════════════════════════════════════════════════════════
   TRANSFER WALL
══════════════════════════════════════════════════════════════════ */

async function loadTransferWall() {
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
    feed.innerHTML = '<div class="community-msg"><div class="community-msg-body muted">No acceptances reported yet — be the first! Click "🎉 Report Your Acceptance".</div></div>';
    return;
  }

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

  // Realtime: prepend new accepted outcomes as they arrive
  if (typeof subscribeToOutcomes === 'function') {
    subscribeToOutcomes(newRow => {
      if (!newRow.accepted) return;

      const feed2 = document.getElementById('wall-feed');
      if (feed2) {
        const card = buildWallCard({
          name: newRow.student_name,
          major: newRow.student_major,
          gpa: newRow.student_gpa,
          schools: [newRow.school_name],
          year: newRow.year,
          advice: newRow.advice || null
        });
        feed2.prepend(card);
      }

      const c = document.getElementById('wall-count');
      if (c) c.textContent = (parseInt(c.textContent) || 0) + 1;

      // Badge on Community tab instead of toast
      const tabBtn = document.querySelector('[data-tab="community"]');
      if (tabBtn) {
        let badge = tabBtn.querySelector('.tab-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'tab-badge';
          tabBtn.appendChild(badge);
        }
        badge.textContent = (parseInt(badge.textContent) || 0) + 1;
      }
    });
  }
}

function buildWallCard(s) {
  const card = document.createElement('div');
  card.className = 'wall-card';

  const anonName = anonymizeName(s.name);
  const gpaRange = getGpaRange(s.gpa);

  const schoolPills = (s.schools || []).map(schoolName => {
    const schoolData = (typeof SCHOOLS !== 'undefined')
      ? SCHOOLS.find(sc => sc.name === schoolName) : null;
    return `<span style="background:rgba(61,232,160,0.12);color:var(--accent3);border-radius:99px;padding:2px 10px;font-size:0.75rem;font-weight:600;border:1px solid rgba(61,232,160,0.25)">
      ${schoolData ? schoolData.emoji : '🎓'} ${_esc(schoolName)}
    </span>`;
  }).join('');

  card.innerHTML = `
    <div class="wall-card-header">
      <div>
        <span class="wall-card-name">${_esc(anonName)}</span>
        <span class="wall-card-meta"> · ${_esc(s.major || 'Unknown major')} · GPA ${_esc(gpaRange)}</span>
      </div>
      <button class="wall-react-btn" data-count="0">🤍 0</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${schoolPills}</div>
    ${s.advice ? `<div class="wall-card-advice">${_esc(s.advice)}</div>` : ''}
  `;

  const reactBtn = card.querySelector('.wall-react-btn');
  reactBtn.addEventListener('click', () => {
    const isReacted = reactBtn.classList.toggle('reacted');
    const count = parseInt(reactBtn.dataset.count) || 0;
    const newCount = isReacted ? count + 1 : Math.max(0, count - 1);
    reactBtn.dataset.count = newCount;
    reactBtn.textContent = isReacted ? `❤️ ${newCount}` : `🤍 ${newCount}`;
  });

  return card;
}

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
   COMMUNITY CHAT
══════════════════════════════════════════════════════════════════ */

async function loadChatForMajor(major) {
  if (_communityChannel) {
    try { _communityChannel.unsubscribe && _communityChannel.unsubscribe(); } catch (_) {}
    _communityChannel = null;
  }
  _communityMajor = major;

  const feed = document.getElementById('community-chat-feed');
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
    messages.forEach(m => appendMessage(m));
    scrollCommunityToBottom();
  }

  if (typeof subscribeToChat === 'function') {
    _communityChannel = subscribeToChat(major, row => {
      appendMessage(row);
      scrollCommunityToBottom();
    });
  }
}

function appendMessage(msg) {
  const feed = document.getElementById('community-chat-feed');
  if (!feed) return;

  // Clear placeholder
  if (feed.children.length === 1 && feed.children[0].querySelector('.muted')) {
    feed.innerHTML = '';
  }

  const div  = document.createElement('div');
  div.className = 'community-msg';

  const head = document.createElement('div');
  head.className = 'community-msg-head';

  const name = document.createElement('span');
  name.className = 'community-msg-name' + (msg.is_ai ? ' ai' : '');
  name.textContent = msg.is_ai ? '🤖 Transfer Coach' : (msg.display_name || 'anonymous');

  // Non-AI names are clickable → profile modal
  if (!msg.is_ai && msg.display_name) {
    name.classList.add('clickable-name');
    name.addEventListener('click', () => showProfileModal(msg.display_name));
  }

  const time = document.createElement('span');
  time.className = 'community-msg-time';
  time.textContent = formatChatTime(msg.sent_at);

  head.appendChild(name);
  head.appendChild(time);

  const body = document.createElement('div');
  body.className = 'community-msg-body' + (msg.is_ai ? ' coach-msg' : '');
  body.textContent = msg.content;

  div.appendChild(head);
  div.appendChild(body);
  feed.appendChild(div);
}

function scrollCommunityToBottom() {
  const feed = document.getElementById('community-chat-feed');
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

  if (typeof saveChatMessage === 'function') {
    await saveChatMessage(userId, _communityMajor, name, content, false);
  } else {
    appendMessage({ display_name: name, content, sent_at: new Date().toISOString() });
    scrollCommunityToBottom();
  }

  // AI coach triggers
  if (/@coach|@ai|@bot|@transfer/i.test(content)) {
    await handleAICoachMessage(content, _communityMajor);
  }
}

async function handleAICoachMessage(userMessage, major) {
  const userId = (typeof currentUserId !== 'undefined') ? currentUserId : null;

  // Show typing indicator in chat feed
  const feed = document.getElementById('community-chat-feed');
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
    scrollCommunityToBottom();
  }

  // Build outcomes context
  let outcomesContext = '';
  try {
    if (typeof getRecentOutcomes === 'function') {
      const rows = await getRecentOutcomes(20);
      if (rows && rows.length) {
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

  const reply = await callOllama(systemPrompt, userMessage, [], 45000);

  if (typingEl) typingEl.remove();

  const text = reply
    || 'Ollama is offline right now. Run "OLLAMA_ORIGINS=* ollama serve" in Terminal to enable the AI coach.';

  if (typeof saveChatMessage === 'function') {
    await saveChatMessage(userId, major, 'Transfer Coach', text, true);
  } else {
    appendMessage({ display_name: 'Transfer Coach', content: text, is_ai: true, sent_at: new Date().toISOString() });
    scrollCommunityToBottom();
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

  profiles.forEach(p => {
    const card = renderProfileCard(p);
    list.appendChild(card);
  });
}

function renderProfileCard(profile) {
  const div = document.createElement('div');
  div.className = 'profile-card';

  const name = document.createElement('div');
  name.className = 'profile-card-name clickable-name';
  name.textContent = '🎭 ' + (profile.nickname || 'anonymous');
  name.addEventListener('click', () => showProfileModal(profile.nickname));
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
   PROFILE MODAL  (click on a name in the chat or profile sidebar)
══════════════════════════════════════════════════════════════════ */

async function showProfileModal(nickname) {
  const modal = document.getElementById('community-profile-modal');
  if (!modal) return;

  document.getElementById('profile-modal-nickname').textContent = '🎭 ' + (nickname || 'anonymous');
  document.getElementById('profile-modal-major').textContent   = '';
  document.getElementById('profile-modal-gpa').textContent     = '';
  document.getElementById('profile-modal-honors').textContent  = '';
  document.getElementById('profile-modal-schools').innerHTML   = '';
  document.getElementById('profile-modal-advice').classList.add('hidden');
  document.getElementById('profile-modal-advice').textContent  = '';

  modal.classList.remove('hidden');

  // Look up student_profiles by nickname
  let profile = null;
  if (typeof getClient === 'function') {
    const client = getClient();
    if (client) {
      try {
        const { data } = await client
          .from('student_profiles')
          .select('*')
          .eq('nickname', nickname)
          .maybeSingle();
        profile = data;
      } catch (_) {}
    }
  }

  if (!profile) {
    document.getElementById('profile-modal-gpa').textContent = 'Current IVC Student — results not yet reported';
    return;
  }

  if (profile.major) {
    const pill = document.getElementById('profile-modal-major');
    pill.textContent = profile.major;
    pill.style.cssText = 'display:inline-block;background:rgba(30,144,255,0.15);color:var(--accent);border-radius:99px;padding:3px 12px;font-size:0.82rem;font-weight:600;margin-bottom:8px';
  }
  if (profile.gpa) {
    document.getElementById('profile-modal-gpa').textContent = 'GPA Range: ' + roundGpaRange(profile.gpa);
  }
  if (profile.honors) {
    document.getElementById('profile-modal-honors').textContent = '🏅 ' + profile.honors;
  }

  const schoolsEl = document.getElementById('profile-modal-schools');
  const schools = profile.accepted_schools || [];
  if (schools.length) {
    schools.forEach(sn => {
      const pill = document.createElement('span');
      const schoolData = (typeof SCHOOLS !== 'undefined') ? SCHOOLS.find(s => s.name === sn) : null;
      pill.textContent = (schoolData ? schoolData.emoji + ' ' : '🎓 ') + sn;
      pill.style.cssText = 'background:rgba(61,232,160,0.12);color:var(--accent3);border-radius:99px;padding:3px 12px;font-size:0.8rem;font-weight:600;border:1px solid rgba(61,232,160,0.25)';
      schoolsEl.appendChild(pill);
    });
  } else {
    schoolsEl.innerHTML = '<span style="color:var(--muted);font-size:0.85rem">Current IVC Student — results not yet reported</span>';
  }

  if (profile.advice) {
    const advEl = document.getElementById('profile-modal-advice');
    advEl.textContent = '"' + profile.advice + '"';
    advEl.classList.remove('hidden');
  }
}

function closeProfileModal() {
  const modal = document.getElementById('community-profile-modal');
  if (modal) modal.classList.add('hidden');
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
