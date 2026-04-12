/**
 * match.js
 * "You Matched!" overlay + school chat modal.
 * All AI via callOllama() (defined in ai.js).
 */

const SCHOOL_SHORT_LABELS = {
  uci: 'UCI', ucb: 'Berkeley', ucla: 'UCLA', ucsd: 'UCSD', ucsb: 'UCSB',
  ucd: 'UC Davis', ucsc: 'UCSC', ucr: 'UCR', ucm: 'UC Merced',
  csuf: 'CSUF', csulb: 'CSULB', cpslo: 'Cal Poly SLO', cpp: 'Cal Poly Pomona',
  sdsu: 'SDSU', sjsu: 'SJSU', usc: 'USC', lmu: 'LMU', oc: 'Occidental', chapman: 'Chapman'
};

const SCHOOL_PERSONALITIES = {
  uci:     'Warm, locally connected, research-focused, proud of the IVC-to-UCI pipeline. Knows IVC students well. Zot!',
  ucla:    'Prestigious, exciting, slightly selective-sounding. Passionate about campus life and research. Fight On!',
  ucb:     'Intellectual, rigorous, socially conscious, loves ambitious students. Go Bears!',
  ucsd:    'Research-heavy, collaborative, mentions the beach and the La Jolla biotech scene.',
  ucsb:    'Laid-back but serious about academics, beautiful campus proud, strong transfer culture. Go Gauchos!',
  ucd:     'Friendly farm-town energy, health-sciences and agriculture oriented, very accessible, collaborative.',
  ucsc:    'Chill redwood-forest energy, creative and quirky, strong in CS and marine biology.',
  ucr:     'Welcoming, accessible, genuinely excited to have transfer students, emphasizes support resources.',
  ucm:     "Newest UC, underdog energy, tight-knit community, easier transfer path.",
  csuf:    'Career-focused, practical, commuter-friendly, strong business and accounting, Orange County hub.',
  csulb:   'Coastal CSU vibes, diverse, well-known for nursing and engineering, affordable.',
  cpslo:   'Polytechnic pride, Learn by Doing ethos, project-based, selective but worth it.',
  cpp:     'Polytechnic, career-focused, SoCal commuter, engineering and agriculture strength.',
  sdsu:    'Spirited, business-heavy, San Diego beach life, Aztec pride.',
  sjsu:    'Silicon Valley adjacent, practical, CS pipeline into Bay Area tech, very transfer-friendly.',
  usc:     'Trojan-family network-obsessed, ambitious, LA energy, mentions the Trojan network constantly.',
  lmu:     'Personal, tight-knit, Jesuit values, bluff campus with LA views, strong film and business.',
  oc:      'Small liberal-arts intensity, discussion-heavy, tiny classes, close faculty-student relationships.',
  chapman: 'Creative private, top film school, boutique Orange County campus, small-community feel.'
};

/**
 * buildSchoolSystemPrompt()
 * Builds the system prompt for the school's chatbot persona using real student data.
 */
function buildSchoolSystemPrompt(schoolId, schoolName, schoolItem) {
  const personality = SCHOOL_PERSONALITIES[schoolId] || 'Friendly and welcoming university.';
  const s = (typeof student !== 'undefined' && student) ? student : {};
  const scoreVal = schoolItem && schoolItem.score ? schoolItem.score : '?';
  const gpa = parseFloat(s.gpa || 0);
  const majorMinGpa = (schoolItem && schoolItem.school)
    ? ((schoolItem.school.majorMinGpa || {})[s.major] ?? (schoolItem.school.majorMinGpa || {})['default'] ?? schoolItem.school.minGPA ?? 3.0)
    : 3.0;

  return `You are ${schoolName}, a university speaking directly and personally to ${s.name || 'a student'}, a transfer applicant from Irvine Valley College (IVC).

Your university's personality: ${personality}

The student's profile:
- Name: ${s.name || 'not given'}
- Major: ${s.major || 'undecided'}
- GPA: ${gpa} (your competitive minimum for this major: ${majorMinGpa})
- Honors status: ${s.honors || 'not specified'}
- IGETC status: ${s.igetc || 'not specified'}
- Extracurriculars: ${(s.extracurriculars || []).join(', ') || 'none listed'}
- Career goals: ${s.career || 'not specified'}
- Priorities: ${(s.priorities || []).join(', ') || 'not specified'}
- Fit score with you: ${scoreVal}/100

RULES:
- Speak in first-person as the university, not as an AI.
- Be honest: if the student's GPA is below your competitive range, acknowledge it warmly but truthfully.
- Reference the student's actual data (name, major, GPA, honors) naturally in your replies.
- Keep replies to 3-5 sentences max.
- Do NOT say "as an AI" or "I'm a language model."
- Do NOT use markdown, bullet points, or emojis.`;
}

/**
 * showMatchAnimation()
 */
function showMatchAnimation(schoolItem, onStartChat) {
  const overlay = document.getElementById('match-overlay');
  if (!overlay || !schoolItem) return;

  const schoolName  = schoolItem.school ? schoolItem.school.name  : schoolItem.name;
  const schoolEmoji = schoolItem.school ? schoolItem.school.emoji : (schoolItem.emoji || '🏛');
  const schoolId    = schoolItem.school ? schoolItem.school.id    : schoolItem.id;

  document.getElementById('match-school-name').textContent  = schoolName;
  document.getElementById('match-school-emoji').textContent = schoolEmoji;
  document.getElementById('match-school-short').textContent = SCHOOL_SHORT_LABELS[schoolId] || schoolName;

  const studentName = (typeof student !== 'undefined' && student && student.name) ? student.name : 'You';
  document.getElementById('match-you-name').textContent = studentName;

  overlay.classList.remove('hidden');

  const chatBtn = document.getElementById('btn-match-chat');
  chatBtn.classList.remove('hidden');

  const newBtn = chatBtn.cloneNode(true);
  chatBtn.parentNode.replaceChild(newBtn, chatBtn);
  newBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    openSchoolChat(schoolItem);
    if (typeof onStartChat === 'function') onStartChat();
  });

  const skipBtn = document.getElementById('btn-match-skip');
  const newSkip = skipBtn.cloneNode(true);
  skipBtn.parentNode.replaceChild(newSkip, skipBtn);
  newSkip.addEventListener('click', () => overlay.classList.add('hidden'));
}

/**
 * openSchoolChat()
 * Opens the modal, loads saved history or fires the opening AI message.
 */
async function openSchoolChat(schoolItem) {
  const modal = document.getElementById('school-chat-modal');
  if (!modal || !schoolItem) return;

  const schoolName  = schoolItem.school ? schoolItem.school.name  : schoolItem.name;
  const schoolEmoji = schoolItem.school ? schoolItem.school.emoji : (schoolItem.emoji || '🏛');
  const schoolId    = schoolItem.school ? schoolItem.school.id    : schoolItem.id;

  document.getElementById('school-chat-name').textContent  = schoolName;
  document.getElementById('school-chat-emoji').textContent = schoolEmoji;

  const messagesEl = document.getElementById('school-chat-messages');
  messagesEl.innerHTML = '';
  modal.classList.remove('hidden');

  // Per-modal state
  modal._schoolId       = schoolId;
  modal._schoolName     = schoolName;
  modal._schoolItem     = schoolItem;
  modal._systemPrompt   = buildSchoolSystemPrompt(schoolId, schoolName, schoolItem);
  modal._history        = [];   // [{role:'user'|'assistant', content}]

  // Wire close
  document.getElementById('btn-school-chat-close').onclick = closeSchoolChat;

  // Wire send (replace to avoid double-binding)
  const sendBtn = document.getElementById('btn-school-chat-send');
  const inputEl = document.getElementById('school-chat-input');
  const newSend = sendBtn.cloneNode(true);
  sendBtn.parentNode.replaceChild(newSend, sendBtn);
  newSend.addEventListener('click', () => handleSchoolChatSend());
  inputEl.onkeydown = (e) => { if (e.key === 'Enter') handleSchoolChatSend(); };
  inputEl.value = '';

  // Load saved conversation or fire opening message
  let existing = null;
  if (typeof getSchoolChat === 'function' && typeof currentUserId !== 'undefined' && currentUserId) {
    existing = await getSchoolChat(currentUserId, schoolId);
  }

  if (existing && Array.isArray(existing.messages) && existing.messages.length > 0) {
    // Restore history: saved messages are [{role, content}]
    modal._history = existing.messages.slice();
    modal._history.forEach(m => renderChatBubble(m.role, m.content));
    scrollChatToBottom();
  } else {
    // First open — fire opening message from school
    const typing = appendTypingDots();
    const s = (typeof student !== 'undefined' && student) ? student : {};
    const openingUserMsg = 'Hello';
    modal._history.push({ role: 'user', content: openingUserMsg });

    const reply = await callOllama(
      modal._systemPrompt,
      // Special opener instruction injected as user turn
      `Start your message with exactly: "You matched with me because..."
Then explain specifically using the student's actual data: their GPA ${s.gpa}, their major ${s.major}, their honors status (${s.honors || 'none'}), their priorities (${(s.priorities || []).join(', ') || 'none listed'}), and their extracurriculars (${(s.extracurriculars || []).join(', ') || 'none listed'}).
Be honest about their GPA vs your competitive range. Then ask one specific question about what they want to know.`,
      []
    );
    typing.remove();

    if (!reply) console.warn('[Ollama] Got null response, showing fallback');
    const text = reply || offlineMessage(schoolName);
    modal._history = [{ role: 'assistant', content: text }];
    renderChatBubble('assistant', text);
    scrollChatToBottom();
    persistSchoolChat(modal);
  }

  // Subtle guest prompt — chat works but won't be saved
  const isGuest = typeof currentUserId !== 'undefined' && currentUserId &&
    String(currentUserId).startsWith('guest_');
  if (isGuest) {
    const notice = document.createElement('div');
    notice.style.cssText =
      'font-size:0.75rem;color:var(--muted);text-align:center;padding:6px 12px;' +
      'border-top:1px solid var(--border);background:var(--surface2)';
    notice.textContent = 'Create an account to save your chat history.';
    const chatBox = document.querySelector('.school-chat-box');
    if (chatBox) chatBox.appendChild(notice);
  }

  inputEl.focus();
}

function closeSchoolChat() {
  const modal = document.getElementById('school-chat-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleSchoolChatSend() {
  const modal   = document.getElementById('school-chat-modal');
  const inputEl = document.getElementById('school-chat-input');
  if (!modal || !inputEl) return;

  const content = (inputEl.value || '').trim();
  if (!content) return;
  inputEl.value = '';
  inputEl.disabled = true;

  // Add user message to history + render
  modal._history.push({ role: 'user', content });
  renderChatBubble('user', content);
  scrollChatToBottom();

  const typing = appendTypingDots();

  const reply = await callOllama(
    modal._systemPrompt,
    content,
    modal._history.slice(-12)   // keep last 12 turns for context
  );
  typing.remove();
  inputEl.disabled = false;
  inputEl.focus();

  if (!reply) console.warn('[Ollama] Got null response, showing fallback');
  const text = reply || offlineMessage(modal._schoolName);
  modal._history.push({ role: 'assistant', content: text });
  renderChatBubble('assistant', text);
  scrollChatToBottom();
  persistSchoolChat(modal);
}

/* ─── helpers ────────────────────────────────────────────────── */

function renderChatBubble(role, content) {
  const messagesEl = document.getElementById('school-chat-messages');
  if (!messagesEl) return;
  const div = document.createElement('div');
  div.className = role === 'user' ? 'chat-msg chat-msg-user' : 'chat-msg chat-msg-school';
  div.textContent = content;
  messagesEl.appendChild(div);
}

function appendTypingDots() {
  const messagesEl = document.getElementById('school-chat-messages');
  const el = document.createElement('div');
  el.className = 'chat-msg chat-msg-school chat-msg-typing';
  el.innerHTML = '<span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';
  messagesEl.appendChild(el);
  scrollChatToBottom();
  return el;
}

function scrollChatToBottom() {
  const el = document.getElementById('school-chat-messages');
  if (el) el.scrollTop = el.scrollHeight;
}

function persistSchoolChat(modal) {
  if (typeof saveSchoolChat !== 'function') return;
  if (typeof currentUserId === 'undefined' || !currentUserId) return;
  saveSchoolChat(currentUserId, modal._schoolId, modal._schoolName, modal._history);
}

function offlineMessage(schoolName) {
  return `Ollama is offline right now. Run "OLLAMA_ORIGINS=* ollama serve" in Terminal to enable AI chat with ${schoolName}.`;
}
