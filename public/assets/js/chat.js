/* ============================================================
   STUDYAI — AI CHAT MODULE
   File: public/assets/js/chat.js
   Real Claude API · Multi-turn · Session history
   ============================================================ */
'use strict';

/* ── State ── */
const CS = {
  mode       : 'general',
  typing     : false,
  sessions   : [],
  activeId   : null,
  notes      : [],
  history    : [],   // [{role,content}] for current session
};

/* ── Suggestions per mode ── */
const SUGGESTIONS = {
  general: ['Summarise my notes','What are the key topics?','Give me 5 practice questions','List all definitions','What should I focus on?'],
  exam   : ['Most important exam topics?','Hard exam questions please','What definitions to memorise?','Create a last-minute checklist'],
  simple : ['Explain in simple words','Use an analogy','Give me a basic overview'],
  deep   : ['Deep technical explanation','How does this work internally?','Connect all concepts'],
  memory : ['Memory tricks for key terms','Create a mnemonic','Build a memory chain'],
};

/* ════════════════════════════════════════════════════════════
   ENTRY
   ════════════════════════════════════════════════════════════ */
async function initChat() {
  // Load notes and sessions
  const data  = await apiGet('/data').catch(() => ({}));
  CS.notes    = data.notes || [];
  CS.sessions = data.chatHistory || [];

  // Update notes count badge
  const ncEl = document.getElementById('notes-count');
  if (ncEl) ncEl.textContent = CS.notes.length;

  // Render session list
  _renderSessions();

  // Load or create first session
  if (CS.sessions.length) {
    _loadSession(CS.sessions[CS.sessions.length - 1].id);
  } else {
    newChat();
  }

  // Suggestions
  _renderSuggestions();
}

/* ════════════════════════════════════════════════════════════
   SESSIONS
   ════════════════════════════════════════════════════════════ */
function _renderSessions() {
  const el = document.getElementById('sessions-list');
  if (!el) return;

  const sorted = [...CS.sessions].reverse();
  if (!sorted.length) {
    el.innerHTML = `<div class="text-xs text-muted" style="padding:12px">No history yet.</div>`;
    return;
  }

  el.innerHTML = sorted.map(s => `
    <div class="session-item ${s.id === CS.activeId ? 'active' : ''}"
         onclick="_loadSession('${s.id}')">
      <div class="session-title">${escHtml(s.title || 'New Chat')}</div>
      <div class="session-meta">
        ${(s.messages||[]).length} messages · ${timeAgo(s.createdAt)}
      </div>
    </div>`).join('');
}

function _loadSession(id) {
  const sess = CS.sessions.find(s => s.id === id);
  if (!sess) return;
  CS.activeId = id;
  CS.history  = (sess.messages || []).map(m => ({
    role   : m.role === 'ai' ? 'assistant' : 'user',
    content: m.text,
  }));

  _renderSessions();
  _renderAllMessages(sess.messages || []);
}

async function newChat() {
  const sess = {
    id       : genId(),
    title    : 'New Chat',
    messages : [],
    createdAt: Date.now(),
  };
  CS.sessions.push(sess);
  CS.activeId = sess.id;
  CS.history  = [];

  await _saveSessions();
  _renderSessions();
  _showWelcome();
  _renderSuggestions();
  document.getElementById('chat-input')?.focus();
}

/* ════════════════════════════════════════════════════════════
   RENDER MESSAGES
   ════════════════════════════════════════════════════════════ */
function _renderAllMessages(messages) {
  const area = document.getElementById('chat-messages');
  if (!area) return;
  area.innerHTML = '';
  _appendWelcome(area);
  messages.forEach(m => _appendBubble(m.role, m.text, m.time, false));
  _scrollBottom();
}

function _showWelcome() {
  const area = document.getElementById('chat-messages');
  if (!area) return;
  area.innerHTML = '';
  _appendWelcome(area);
}

function _appendWelcome(area) {
  const cnt = CS.notes.length;
  const row = document.createElement('div');
  row.className = 'msg-row msg-ai';
  row.innerHTML = `
    <div class="msg-avatar av-ai">🧠</div>
    <div class="msg-content">
      <div class="msg-bubble bubble-ai">
        Hi! I'm your <strong>AI Study Assistant</strong> powered by Claude 🎓<br><br>
        ${cnt > 0
          ? `I have access to <strong>${cnt} note${cnt!==1?'s':''}</strong>. I can answer questions directly from your study material, generate practice questions, explain concepts and much more.`
          : `You haven't added any notes yet. <a href="/notes.html" style="color:var(--purple)">Add some notes</a> so I can answer from your study material!`}
        <br><br>
        <span style="color:var(--text-muted);font-size:.8rem">Try one of the suggestions below ↓</span>
      </div>
      <div class="msg-time">Now</div>
    </div>`;
  area.appendChild(row);
}

/* ════════════════════════════════════════════════════════════
   SEND MESSAGE
   ════════════════════════════════════════════════════════════ */
async function sendMessage() {
  const inp  = document.getElementById('chat-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || CS.typing) return;

  // Auto-detect YouTube URLs and summarise instead of chat
  if (text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/)) {
    inp.value = '';
    inp.style.height = 'auto';
    _appendBubble('user', text, Date.now());
    _appendBubble('ai', '📺 YouTube link detected! Fetching transcript and summarising… this may take 20-30 seconds.', Date.now());
    _scrollBottom();
    try {
      const data = await apiPost('/ai/youtube', { url: text });
      // Remove the "fetching" bubble
      const msgs = document.getElementById('chat-messages');
      if (msgs) { const last = msgs.lastElementChild; if (last) last.remove(); }
      _appendBubble('ai', '## 📺 YouTube Summary\n\n' + data.summary, Date.now());
      _scrollBottom();
      showToast('YouTube video summarised! 🎉', 'success');
    } catch (e) {
      const msgs = document.getElementById('chat-messages');
      if (msgs) { const last = msgs.lastElementChild; if (last) last.remove(); }
      _appendBubble('ai', '❌ Could not summarise: ' + e.message + '\n\nTip: Go to **Summaries → YouTube tab** to summarise videos.', Date.now());
    }
    return;
  }

  inp.value          = '';
  inp.style.height   = 'auto';

  // Ensure active session
  if (!CS.activeId) await newChat();

  // User bubble
  _appendBubble('user', text, Date.now());
  _scrollBottom();

  // Save user message
  await _addMessage('user', text);
  CS.history.push({ role: 'user', content: text });

  // Show typing
  _showTyping();
  CS.typing = true;

  try {
    // Build notes context
    const notesCtx = CS.notes
      .map(n => `[Note: ${n.title}]\n${(n.content||'').substring(0,800)}`)
      .join('\n\n---\n\n')
      .substring(0, 6000);

    // Call real Claude API
    const data = await apiPost('/ai/chat', {
      message     : text,
      notesContext: notesCtx,
      mode        : CS.mode,
      history     : CS.history.slice(-10), // last 5 exchanges
    });

    _hideTyping();
    CS.typing = false;

    const reply = data.response || 'Sorry, I could not generate a response.';
    _appendBubble('ai', reply, Date.now());
    await _addMessage('ai', reply);
    CS.history.push({ role: 'assistant', content: reply });

    _renderSessions();
    _renderSuggestions();
    _scrollBottom();

  } catch (e) {
    _hideTyping();
    CS.typing = false;

    const errMsg = e.message?.includes('ANTHROPIC_API_KEY')
      ? '⚠️ **API Key not configured.** Add your Anthropic API key to the `.env` file and restart the server.'
      : `❌ **Error:** ${e.message}`;

    _appendBubble('ai', errMsg, Date.now());
    _scrollBottom();
    showToast('AI error: ' + e.message, 'error');
  }
}

function chatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/* ════════════════════════════════════════════════════════════
   BUBBLE BUILDER
   ════════════════════════════════════════════════════════════ */
function _appendBubble(role, text, time, scroll = true) {
  const area = document.getElementById('chat-messages');
  if (!area) return;

  const isAI   = role === 'ai' || role === 'assistant';
  const row    = document.createElement('div');
  row.className= `msg-row ${isAI ? 'msg-ai' : 'msg-user'}`;

  const user    = getUser();
  const avatar  = isAI ? '🧠' : (user?.name?.charAt(0).toUpperCase() || 'U');
  const avClass = isAI ? 'av-ai' : 'av-user';
  const bubCls  = isAI ? 'bubble-ai' : 'bubble-user';
  const content = isAI ? mdToHtml(text) : escHtml(text).replace(/\n/g,'<br>');

  row.innerHTML = `
    <div class="msg-avatar ${avClass}">${avatar}</div>
    <div class="msg-content">
      <div class="msg-bubble ${bubCls}">${content}</div>
      <div class="msg-time">${time ? timeAgo(time) : 'Just now'}</div>
    </div>`;

  area.appendChild(row);
  if (scroll) _scrollBottom();
}

/* ════════════════════════════════════════════════════════════
   TYPING INDICATOR
   ════════════════════════════════════════════════════════════ */
function _showTyping() {
  const area = document.getElementById('chat-messages');
  if (!area) return;
  const el   = document.createElement('div');
  el.id      = 'typing-row';
  el.className = 'msg-row msg-ai';
  el.innerHTML = `
    <div class="msg-avatar av-ai">🧠</div>
    <div class="msg-content">
      <div class="msg-bubble bubble-ai" style="padding:12px 16px">
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>`;
  area.appendChild(el);
  _scrollBottom();
}

function _hideTyping() {
  document.getElementById('typing-row')?.remove();
}

/* ════════════════════════════════════════════════════════════
   SUGGESTIONS
   ════════════════════════════════════════════════════════════ */
function _renderSuggestions() {
  const el   = document.getElementById('chat-suggestions');
  if (!el) return;
  const pool = SUGGESTIONS[CS.mode] || SUGGESTIONS.general;
  const show = [...pool].sort(() => Math.random() - .5).slice(0, 4);
  el.innerHTML = show.map(s =>
    `<div class="suggestion-chip" onclick="useSuggestion('${escAttr(s)}')">${s}</div>`
  ).join('');
}

function useSuggestion(text) {
  const inp = document.getElementById('chat-input');
  if (inp) { inp.value = text; inp.focus(); autoResize(inp); }
}

/* ════════════════════════════════════════════════════════════
   MODE
   ════════════════════════════════════════════════════════════ */
function updateMode() {
  const sel = document.getElementById('chat-mode');
  if (sel) CS.mode = sel.value;
  _renderSuggestions();
}

/* ════════════════════════════════════════════════════════════
   CLEAR / EXPORT
   ════════════════════════════════════════════════════════════ */
async function clearChat() {
  if (!confirm('Clear all messages in this session?')) return;
  const idx = CS.sessions.findIndex(s => s.id === CS.activeId);
  if (idx >= 0) { CS.sessions[idx].messages = []; CS.sessions[idx].title = 'New Chat'; }
  CS.history = [];
  await _saveSessions();
  _showWelcome();
  _renderSessions();
  showToast('Chat cleared.', 'info');
}

function exportChat() {
  const sess = CS.sessions.find(s => s.id === CS.activeId);
  if (!sess?.messages?.length) return showToast('No messages to export.', 'warning');
  const lines = [`# StudyAI Chat Export\nSession: ${sess.title}\nDate: ${new Date().toLocaleString()}\n\n---\n`];
  sess.messages.forEach(m => {
    lines.push(`**${m.role === 'user' ? 'You' : 'StudyAI'}** _(${timeAgo(m.time)})_\n${m.text}\n`);
  });
  downloadMD(lines.join('\n'), 'chat-export.md');
  showToast('Chat exported!', 'success');
}

/* ════════════════════════════════════════════════════════════
   PERSISTENCE
   ════════════════════════════════════════════════════════════ */
async function _addMessage(role, text) {
  const idx = CS.sessions.findIndex(s => s.id === CS.activeId);
  if (idx < 0) return;

  const msg = { role, text, time: Date.now() };
  CS.sessions[idx].messages.push(msg);

  // Auto-title from first user message
  if (CS.sessions[idx].title === 'New Chat' && role === 'user') {
    CS.sessions[idx].title = text.slice(0, 45) + (text.length > 45 ? '…' : '');
  }

  await _saveSessions();
}

async function _saveSessions() {
  // Keep only last 20 sessions to avoid bloat
  if (CS.sessions.length > 20) CS.sessions = CS.sessions.slice(-20);
  await apiPost('/data/chatHistory', { value: CS.sessions }).catch(() => {});
}

/* ── Scroll ── */
function _scrollBottom() {
  const area = document.getElementById('chat-messages');
  if (area) requestAnimationFrame(() => { area.scrollTop = area.scrollHeight; });
}

/* ── PDF Upload for Chat ── */
function openChatPDFUpload() {
  showPDFUploader({
    label: 'PDF text will be saved as a note and loaded as context',
    onSuccess: (result) => {
      // Update notes count badge
      CS.notes = [...(CS.notes || []), result.note];
      const el = document.getElementById('notes-count');
      if (el) el.textContent = CS.notes.length;

      // Pre-fill chat input with a suggestion
      const inp = document.getElementById('chat-input');
      if (inp) {
        inp.value = `Summarise the key points from "${result.title}"`;
        autoResize(inp);
        inp.focus();
      }

      showToast(`"${result.title}" loaded as context (${result.pages} pages)`, 'success', 4000);
    },
  });
}

/* ════════════════════════════════════════════════════════════
   VOICE CHAT — Speech-to-Text + Text-to-Speech
   Uses free Web Speech API (built into Chrome/Edge)
   ════════════════════════════════════════════════════════════ */

const VC = {
  recognition : null,
  synthesis   : window.speechSynthesis || null,
  ttsEnabled  : false,
  listening   : false,
};

/* ── Speech-to-Text (click to toggle) ── */
function startVoice() {
  if (VC.listening) { stopVoice(); return; }

  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Voice not supported. Please use Google Chrome or Microsoft Edge.', 'error', 5000);
    return;
  }

  VC.listening = true;
  var btn = document.getElementById('voice-btn');
  if (btn) { btn.classList.add('recording'); btn.textContent = '🔴'; }
  showToast('🎤 Listening… speak now', 'info', 5000);

  VC.recognition               = new SpeechRecognition();
  VC.recognition.lang          = 'en-US';
  VC.recognition.interimResults= false;
  VC.recognition.continuous    = false;
  VC.recognition.maxAlternatives = 1;

  VC.recognition.onresult = function(e) {
    var transcript = '';
    for (var i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) transcript += e.results[i][0].transcript;
    }
    if (!transcript) return;
    var inp = document.getElementById('chat-input');
    if (inp) { inp.value = transcript; if (typeof autoResize==='function') autoResize(inp); }
    showToast('🎤 "' + transcript + '"', 'success', 3000);
    stopVoice();
    setTimeout(function() { if (inp && inp.value.trim()) sendMessage(); }, 500);
  };

  VC.recognition.onerror = function(e) {
    var msg = {
      'not-allowed'  : '❌ Microphone blocked! Click the 🔒 lock icon in address bar → Microphone → Allow.',
      'no-speech'    : '🎤 No speech heard. Try again and speak clearly.',
      'audio-capture': '❌ No microphone found on this device.',
      'network'      : '❌ Network error. Check connection.',
      'aborted'      : null,
    }[e.error];
    if (msg) showToast(msg, e.error==='not-allowed' ? 'error' : 'warning', 6000);
    stopVoice();
  };

  VC.recognition.onend = function() { if (VC.listening) stopVoice(); };

  try {
    VC.recognition.start();
  } catch(e) {
    showToast('Could not start microphone: ' + e.message, 'error');
    stopVoice();
  }
}

function stopVoice() {
  VC.listening = false;
  var btn = document.getElementById('voice-btn');
  if (btn) { btn.classList.remove('recording'); btn.textContent = '🎤'; }
  try { if (VC.recognition) VC.recognition.abort(); } catch(_) {}
  VC.recognition = null;
}

/* ── Text-to-Speech toggle ── */
function toggleTTS() {
  VC.ttsEnabled = !VC.ttsEnabled;
  const btn = document.getElementById('tts-btn');
  if (btn) {
    btn.textContent = VC.ttsEnabled ? '🔊 Voice On' : '🔊 Voice Off';
    btn.style.background = VC.ttsEnabled ? 'rgba(67,233,123,.18)' : 'rgba(67,233,123,.08)';
    btn.style.borderColor = VC.ttsEnabled ? 'rgba(67,233,123,.5)' : 'rgba(67,233,123,.2)';
  }
  if (!VC.ttsEnabled && VC.synthesis) VC.synthesis.cancel();
  showToast(VC.ttsEnabled ? '🔊 AI will now speak responses' : '🔇 Voice responses turned off', 'info', 2000);
}

/* ── Speak AI response ── */
function speakText(text) {
  if (!VC.ttsEnabled || !VC.synthesis) return;
  VC.synthesis.cancel();

  // Clean markdown before speaking
  const clean = text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, '. ')
    .substring(0, 600); // max ~30 seconds

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate   = 0.95;
  utterance.pitch  = 1;
  utterance.volume = 1;

  // Prefer a natural voice
  const voices = VC.synthesis.getVoices();
  const preferred = voices.find(v =>
    v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')
  );
  if (preferred) utterance.voice = preferred;

  VC.synthesis.speak(utterance);
}

// Hook into existing sendMessage to speak AI reply
const _origSend = sendMessage;
sendMessage = async function() {
  await _origSend.apply(this, arguments);
};

// Patch _appendBubble to speak AI messages
const _origAppend = _appendBubble;
_appendBubble = function(role, text, time, scroll) {
  _origAppend.apply(this, arguments);
  if ((role === 'ai' || role === 'assistant') && VC.ttsEnabled) {
    setTimeout(() => speakText(text), 300);
  }
};

// Load voices when available
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}