/**
 * community.js
 * Community tab — per-major chat + anonymous profile sidebar.
 * Realtime through subscribeToChat(); AI coach via Ollama when @coach/@ai mention.
 */

let _communityChannel = null;
let _communityMajor   = null;
let _communityNickname = null;

/**
 * renderCommunityTab(pane)
 * Builds the community tab UI. Called when the user clicks the Community tab.
 */
async function renderCommunityTab(pane) {
  if (!pane) return;
  const major = (typeof student !== 'undefined' && student && student.major) ? student.major : 'General';

  pane.innerHTML = `
    <h2 class="section-title">◎ Community — ${escapeHtml(major)}</h2>
    <p class="section-sub">
      Anonymous chat with other IVC students in your major. Type <strong>@coach</strong> to get AI advice.
    </p>

    <div class="community-wrap">
      <div class="community-chat-panel">
        <div class="community-chat-header">
          <h3>${escapeHtml(major)} chat</h3>
          <div class="muted">Realtime · anonymous nicknames</div>
        </div>
        <div class="community-chat-feed" id="community-chat-feed">
          <div class="community-msg"><div class="community-msg-body muted">Loading messages…</div></div>
        </div>
        <div class="community-mentions-hint">Tip: mention <strong>@coach</strong> or <strong>@ai</strong> to ask for help.</div>
        <div class="community-chat-input-row">
          <input type="text" id="community-chat-input" placeholder="Share a tip or ask a question…" autocomplete="off" />
          <button class="btn-primary" id="community-chat-send">Send</button>
        </div>
      </div>

      <aside class="community-profiles-panel" id="community-profiles-panel">
        <h4>Students in ${escapeHtml(major)}</h4>
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
  const sendBtn = document.getElementById('community-chat-send');
  sendBtn.onclick = () => {
    const v = (inputEl.value || '').trim();
    if (!v) return;
    inputEl.value = '';
    sendChatMessage(v);
  };
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') sendBtn.click();
  };

  // Load chat for current major
  await loadChatForMajor(major);

  // Load profiles sidebar
  loadProfilesSidebar(major);
}

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
    feed.innerHTML = `<div class="community-msg"><div class="community-msg-body muted">No messages yet. Be the first to say hi — or type <strong>@coach</strong> for AI advice.</div></div>`;
  } else {
    messages.forEach(appendMessage);
    scrollCommunityToBottom();
  }

  // Subscribe to realtime INSERTs
  if (typeof subscribeToChat === 'function') {
    _communityChannel = subscribeToChat(major, (row) => {
      appendMessage(row);
      scrollCommunityToBottom();
    });
  }
}

function appendMessage(msg) {
  const feed = document.getElementById('community-chat-feed');
  if (!feed) return;

  // Clear the "no messages" placeholder if present
  if (feed.children.length === 1 && feed.children[0].querySelector('.muted')) {
    feed.innerHTML = '';
  }

  const div = document.createElement('div');
  div.className = 'community-msg';

  const head = document.createElement('div');
  head.className = 'community-msg-head';
  const name = document.createElement('span');
  name.className = 'community-msg-name' + (msg.is_ai ? ' ai' : '');
  name.textContent = msg.is_ai ? '🤖 AI Coach' : (msg.display_name || 'anonymous');
  const time = document.createElement('span');
  time.className = 'community-msg-time';
  time.textContent = formatChatTime(msg.sent_at);
  head.appendChild(name);
  head.appendChild(time);

  const body = document.createElement('div');
  body.className = 'community-msg-body';
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
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

async function sendChatMessage(content) {
  if (!_communityMajor || !content) return;

  const name = _communityNickname || 'anonymous';
  const userId = (typeof currentUserId !== 'undefined') ? currentUserId : null;

  if (typeof saveChatMessage === 'function') {
    await saveChatMessage(userId, _communityMajor, name, content, false);
  } else {
    // No backend — append locally
    appendMessage({ display_name: name, content, sent_at: new Date().toISOString() });
    scrollCommunityToBottom();
  }

  // AI coach trigger
  const lower = content.toLowerCase();
  if (lower.includes('@coach') || lower.includes('@ai')) {
    await handleAICoachMessage(content, _communityMajor);
  }
}

async function handleAICoachMessage(userMessage, major) {
  // Build context from global outcomes feed / student profile
  let outcomesContext = '';
  try {
    if (typeof getRecentOutcomes === 'function') {
      const rows = await getRecentOutcomes(12);
      if (rows && rows.length) {
        outcomesContext = '\nRecent IVC acceptances:\n' + rows.slice(0, 8)
          .map(r => `- ${r.student_major} student (GPA ${r.student_gpa}) → ${r.school_name}`)
          .join('\n');
      }
    }
  } catch (_) {}

  const studentContext = (typeof student !== 'undefined' && student)
    ? `The asking student: major ${student.major || 'unknown'}, GPA ${student.gpa || 'unknown'}, ${student.honors || 'no honors info'}.`
    : '';

  const prompt =
`You are an AI transfer-admissions coach for IVC (Irvine Valley College) students. Be SPECIFIC, honest, and concise.
${studentContext}
Major context: ${major}
${outcomesContext}

Student message (addressed to you):
"${userMessage}"

Write a direct, useful reply in 2-4 sentences. Mention specific UCs/CSUs when relevant. No fluff, no markdown.`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3.1', prompt, stream: false }),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (!res.ok) throw new Error('ollama');
    const data = await res.json();
    const reply = (data.response || '').trim();
    if (!reply) throw new Error('empty');

    if (typeof saveChatMessage === 'function') {
      const userId = (typeof currentUserId !== 'undefined') ? currentUserId : null;
      await saveChatMessage(userId, major, 'AI Coach', reply, true);
    } else {
      appendMessage({ display_name: 'AI Coach', content: reply, is_ai: true, sent_at: new Date().toISOString() });
      scrollCommunityToBottom();
    }
  } catch (_) {
    const fallback = 'AI coach is offline right now — try checking assist.org for articulation, and make sure your GPA and Cal-GETC are locked in before the April 1 TAG window.';
    if (typeof saveChatMessage === 'function') {
      const userId = (typeof currentUserId !== 'undefined') ? currentUserId : null;
      await saveChatMessage(userId, major, 'AI Coach', fallback, true);
    } else {
      appendMessage({ display_name: 'AI Coach', content: fallback, is_ai: true, sent_at: new Date().toISOString() });
      scrollCommunityToBottom();
    }
  }
}

/**
 * loadProfilesSidebar()
 * Fetches anonymous public profiles for this major.
 */
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

/**
 * renderProfileCard()
 * Anonymous card with nickname + rounded GPA range (0.5 buckets).
 */
function renderProfileCard(profile) {
  const div = document.createElement('div');
  div.className = 'profile-card';

  const name = document.createElement('div');
  name.className = 'profile-card-name';
  name.textContent = '🎭 ' + (profile.nickname || 'anonymous');
  div.appendChild(name);

  const gpaRange = roundGpaRange(profile.gpa);
  const rows = [];
  if (profile.major)      rows.push(['Major', profile.major]);
  if (gpaRange)           rows.push(['GPA', gpaRange]);
  if (profile.honors)     rows.push(['Honors', profile.honors]);
  if (Array.isArray(profile.accepted_schools) && profile.accepted_schools.length) {
    rows.push(['Accepted to', profile.accepted_schools.slice(0, 3).join(', ')]);
  }

  rows.forEach(([k, v]) => {
    const row = document.createElement('div');
    row.className = 'profile-card-row';
    row.innerHTML = `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}`;
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

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
