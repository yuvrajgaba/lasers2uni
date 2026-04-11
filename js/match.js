/**
 * match.js
 * Tinder-style "You Matched!" overlay animation + school chat modal.
 * Triggered from dashboard.js after the Balanced tab renders.
 */

/** Short labels for the match card */
const SCHOOL_SHORT_LABELS = {
  uci: 'UCI', ucb: 'Berkeley', ucla: 'UCLA', ucsd: 'UCSD', ucsb: 'UCSB',
  ucd: 'UC Davis', ucsc: 'UCSC', ucr: 'UCR', ucm: 'UC Merced',
  csuf: 'CSUF', csulb: 'CSULB', cpslo: 'Cal Poly SLO', cpp: 'Cal Poly Pomona',
  sdsu: 'SDSU', sjsu: 'SJSU', usc: 'USC', lmu: 'LMU', oc: 'Occidental', chapman: 'Chapman'
};

/** School "personalities" used as the system prompt when chatting */
const SCHOOL_PERSONALITIES = {
  uci: {
    vibe: 'warm, supportive, community-first, loves transfer students',
    highlights: 'Zot! Honors-to-Honors pathway, top CS + Biology, anteater pride, beach-close Irvine campus'
  },
  ucla: {
    vibe: 'prestigious but friendly, LA energy, high-achieving and proud of it',
    highlights: 'world-class research, Hollywood proximity, Bruin network, competitive transfer admissions'
  },
  ucb: {
    vibe: 'intellectually intense, activist-minded, rigorous, free-thinking',
    highlights: 'top-ranked CS/engineering, rigorous academics, Bay Area tech access, Nobel laureates'
  },
  ucsd: {
    vibe: 'laid-back STEM powerhouse, ocean-view campus, research-heavy',
    highlights: 'strong CS/Bio, La Jolla beaches, college system, biotech industry access'
  },
  ucsb: {
    vibe: 'beachy, happy, quietly excellent at research',
    highlights: 'coastal campus, strong physics/engineering, Gauchos, relaxed vibe'
  },
  ucd: {
    vibe: 'friendly farm-town energy, health-sciences oriented',
    highlights: 'strong pre-med/pre-vet, bike-friendly, collaborative culture'
  },
  ucsc: {
    vibe: 'redwood-forest chill, creative, slightly quirky',
    highlights: 'forest campus, strong CS and marine biology, laid-back learning'
  },
  ucr: {
    vibe: 'welcoming, diverse, accessible UC',
    highlights: 'high admit rate for transfers, great financial aid, engineering growing fast'
  },
  ucm: {
    vibe: 'newest UC, underdog energy, tight-knit',
    highlights: 'easier transfer path, small-UC feel, growing research portfolio'
  },
  csuf: {
    vibe: 'practical, career-focused, commuter-friendly',
    highlights: 'strong business/accounting, huge transfer pipeline, Orange County location'
  },
  csulb: {
    vibe: 'coastal CSU, diverse, well-known for nursing and engineering',
    highlights: 'Long Beach location, nursing program, affordable, strong alumni network'
  },
  cpslo: {
    vibe: 'hands-on Learn by Doing, polytechnic pride',
    highlights: 'engineering powerhouse, project-based, selective admissions'
  },
  cpp: {
    vibe: 'polytechnic, career-focused, SoCal commuter',
    highlights: 'engineering and agriculture, project-based, affordable CSU'
  },
  sdsu: {
    vibe: 'spirited, business-heavy, San Diego life',
    highlights: 'strong business programs, Aztec pride, beach proximity'
  },
  sjsu: {
    vibe: 'tech-adjacent, practical, Silicon Valley connected',
    highlights: 'CS pipeline into Bay Area tech, huge transfer acceptance, career-focused'
  },
  usc: {
    vibe: 'Trojan-family proud, private, networking-obsessed',
    highlights: 'huge alumni network, film/business/CS excellence, LA campus, high cost'
  },
  lmu: {
    vibe: 'small-private warmth, Jesuit values, LA-based',
    highlights: 'small classes, strong film/business, bluff campus overlooking LA'
  },
  oc: {
    vibe: 'small liberal-arts intensity, discussion-heavy',
    highlights: 'tiny classes, close faculty, strong in politics/economics'
  },
  chapman: {
    vibe: 'creative private, film-heavy, boutique',
    highlights: 'top film school, small-class vibe, Orange County campus'
  }
};

/**
 * showMatchAnimation()
 * Shows the "You Matched!" overlay for the given school.
 * Timed animations: cards at 200ms, text at 1000ms, button at 1500ms.
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

  // Reset animation state by re-triggering
  overlay.classList.remove('hidden');
  const chatBtn = document.getElementById('btn-match-chat');
  chatBtn.classList.remove('hidden');

  // Wire up buttons (replace listeners by cloning)
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
  newSkip.addEventListener('click', () => {
    overlay.classList.add('hidden');
  });
}

/**
 * openSchoolChat()
 * Opens the school chat modal, loads existing conversation, or sends opening message.
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

  // State: messages live on the modal element
  modal._schoolId   = schoolId;
  modal._schoolName = schoolName;
  modal._messages   = [];

  // Close button
  const closeBtn = document.getElementById('btn-school-chat-close');
  closeBtn.onclick = closeSchoolChat;

  // Send button + enter key
  const sendBtn  = document.getElementById('btn-school-chat-send');
  const inputEl  = document.getElementById('school-chat-input');
  sendBtn.onclick = () => handleSchoolChatSend();
  inputEl.onkeydown = (e) => { if (e.key === 'Enter') handleSchoolChatSend(); };
  inputEl.value = '';
  inputEl.focus();

  // Load existing conversation or generate opener
  let existing = null;
  if (typeof getSchoolChat === 'function' && typeof currentUserId !== 'undefined' && currentUserId) {
    existing = await getSchoolChat(currentUserId, schoolId);
  }

  if (existing && Array.isArray(existing.messages) && existing.messages.length > 0) {
    modal._messages = existing.messages.slice();
    modal._messages.forEach(renderChatMessage);
    scrollChatToBottom();
  } else {
    // Send opening AI message
    const typingEl = appendTypingIndicator();
    const opener = await generateSchoolOpeningMessage(schoolItem);
    typingEl.remove();
    pushSchoolMessage('school', opener);
  }
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

  pushSchoolMessage('user', content);

  const typingEl = appendTypingIndicator();
  const reply = await generateSchoolReply(modal._schoolId, modal._schoolName, modal._messages);
  typingEl.remove();
  pushSchoolMessage('school', reply);
}

function pushSchoolMessage(role, content) {
  const modal = document.getElementById('school-chat-modal');
  if (!modal) return;
  const msg = { role, content, at: Date.now() };
  modal._messages.push(msg);
  renderChatMessage(msg);
  scrollChatToBottom();

  // Persist (fire-and-forget)
  if (typeof saveSchoolChat === 'function' && typeof currentUserId !== 'undefined' && currentUserId) {
    saveSchoolChat(currentUserId, modal._schoolId, modal._schoolName, modal._messages);
  }
}

function renderChatMessage(msg) {
  const messagesEl = document.getElementById('school-chat-messages');
  if (!messagesEl) return;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-school');
  div.textContent = msg.content;
  messagesEl.appendChild(div);
}

function appendTypingIndicator() {
  const messagesEl = document.getElementById('school-chat-messages');
  const el = document.createElement('div');
  el.className = 'chat-msg chat-msg-typing';
  el.textContent = 'typing…';
  messagesEl.appendChild(el);
  scrollChatToBottom();
  return el;
}

function scrollChatToBottom() {
  const messagesEl = document.getElementById('school-chat-messages');
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**
 * generateSchoolOpeningMessage()
 * Uses Ollama to produce a short first message in the school's voice.
 * Falls back to a static opener if Ollama is offline.
 */
async function generateSchoolOpeningMessage(schoolItem) {
  const schoolName = schoolItem.school ? schoolItem.school.name : schoolItem.name;
  const schoolId   = schoolItem.school ? schoolItem.school.id   : schoolItem.id;
  const personality = SCHOOL_PERSONALITIES[schoolId] || { vibe: 'friendly and welcoming', highlights: 'strong academics' };

  const studentName = (typeof student !== 'undefined' && student && student.name) ? student.name : 'there';
  const studentMajor = (typeof student !== 'undefined' && student && student.major) ? student.major : 'your major';

  const prompt =
`You are speaking AS the university "${schoolName}" to a prospective transfer student named ${studentName} (intended major: ${studentMajor}).
Your personality: ${personality.vibe}.
Your highlights: ${personality.highlights}.

Write one SHORT opening message (2-3 sentences max) greeting them warmly, mentioning one thing that makes your school great for ${studentMajor}, and inviting them to ask questions. Speak in first-person as the school. No hashtags. No emojis. No markdown.`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3.1', prompt, stream: false }),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (!res.ok) throw new Error('ollama');
    const data = await res.json();
    const text = (data.response || '').trim();
    if (text) return text;
  } catch (_) {}

  // Fallback
  return `Hey ${studentName}! I'm ${schoolName}, and I'd love to have a ${studentMajor} student like you. Ask me anything about transferring here.`;
}

/**
 * generateSchoolReply()
 * Continuation replies using the same school personality + running transcript.
 */
async function generateSchoolReply(schoolId, schoolName, history) {
  const personality = SCHOOL_PERSONALITIES[schoolId] || { vibe: 'friendly', highlights: 'strong academics' };
  const transcript = history.slice(-10).map(m => (m.role === 'user' ? 'Student: ' : 'School: ') + m.content).join('\n');

  const prompt =
`You are "${schoolName}" speaking directly to a prospective transfer student.
Personality: ${personality.vibe}. Highlights: ${personality.highlights}.

Recent transcript:
${transcript}

Reply in 2-4 sentences as the school, in first-person, warm and specific. Do not say "as an AI". No markdown.`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3.1', prompt, stream: false }),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (!res.ok) throw new Error('ollama');
    const data = await res.json();
    const text = (data.response || '').trim();
    if (text) return text;
  } catch (_) {}

  return `Great question! Honestly, transfer students thrive here — we'd love to support you through the application. What part of the process feels most uncertain right now?`;
}
