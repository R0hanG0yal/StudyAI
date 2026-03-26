/* ============================================================
   STUDYAI — STORAGE LAYER  v2
   File: public/assets/js/storage.js

   WHAT CHANGED FROM v1:
   - All data stored on server (per user), not localStorage
   - localStorage only used for auth token + offline cache
   - syncToServer() batches saves to avoid hammering API
   - Data is namespaced by userId automatically (server-side)
   ============================================================ */

'use strict';

// ── CONFIG ───────────────────────────────────────────────────
const API = '/api';
let _cache   = {};          // in-memory data cache
let _dirty   = new Set();   // keys that need syncing to server
let _syncTimer = null;

// Use global getToken() from auth.js directly

// ── HTTP HELPERS ─────────────────────────────────────────────
async function apiGet(path) {
  const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('sa_token');
  const r = await fetch(API + path, {
    headers: { 'Authorization': 'Bearer ' + (token || '') },
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

async function apiPost(path, body) {
  const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('sa_token');
  const r = await fetch(API + path, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token || '') },
    body   : JSON.stringify(body),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}

async function apiDel(path) {
  const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('sa_token');
  const r = await fetch(API + path, {
    method : 'DELETE',
    headers: { 'Authorization': 'Bearer ' + (token || '') },
  });
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

// ── LOAD ALL DATA FROM SERVER ────────────────────────────────
async function loadAllData() {
  const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('sa_token');
  if (!token) return;
  try {
    _cache = await apiGet('/data');
  } catch (e) {
    console.warn('Could not load data from server:', e.message);
    _cache = {};
  }
}

// ── SYNC DIRTY KEYS TO SERVER  (debounced 1 second) ─────────
function schedulSync() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(syncDirty, 1000);
}

async function syncDirty() {
  const token = typeof getToken === 'function' ? getToken() : localStorage.getItem('sa_token');
  if (!token || _dirty.size === 0) return;
  const payload = {};
  _dirty.forEach(k => { payload[k] = _cache[k]; });
  _dirty.clear();
  try {
    await apiPost('/data', payload);
  } catch (e) {
    console.warn('Sync failed:', e.message);
  }
}

// Force immediate sync (e.g. before page unload)
async function flushSync() {
  if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
  await syncDirty();
}

window.addEventListener('beforeunload', () => { syncDirty(); });

// ── DATA ACCESS ──────────────────────────────────────────────
function getData(key) {
  return _cache[key] ?? null;
}

function setData(key, value) {
  _cache[key] = value;
  _dirty.add(key);
  schedulSync();
  return true;
}

function getOrDefault(key, defaultVal) {
  const v = getData(key);
  return v !== null ? v : defaultVal;
}

function removeData(key) {
  delete _cache[key];
  _dirty.add(key);
  schedulSync();
}

// ── COLLECTION HELPERS ───────────────────────────────────────
function pushItem(key, item) {
  const arr = getOrDefault(key, []);
  arr.push(item);
  setData(key, arr);
  return arr;
}

function updateItem(key, item) {
  const arr  = getOrDefault(key, []);
  const idx  = arr.findIndex(x => x.id === item.id);
  if (idx < 0) return false;
  arr[idx] = { ...arr[idx], ...item };
  setData(key, arr);
  return true;
}

function removeItem(key, id) {
  const arr = getOrDefault(key, []).filter(x => x.id !== id);
  setData(key, arr);
  return arr;
}

// ── STORAGE KEYS CONSTANTS ───────────────────────────────────
const KEYS = {
  NOTES       : 'notes',
  SUMMARIES   : 'summaries',
  FLASHCARDS  : 'flashcards',
  QUIZZES     : 'quizzes',
  QUIZ_RESULTS: 'quizResults',
  TASKS       : 'tasks',
  EXAMS       : 'exams',
  REVISIONS   : 'revisions',
  SESSIONS    : 'sessions',
  STREAK      : 'streak',
  GROUPS      : 'groups',
  DISCUSSIONS : 'discussions',
  ACHIEVEMENTS: 'achievements',
  CHAT_HIST   : 'chatHistory',
  SETTINGS    : 'settings',
  SEEDED      : 'seeded',
};

// ── ENTITY STORES ────────────────────────────────────────────

const Notes = {
  getAll  : ()        => getOrDefault(KEYS.NOTES, []),
  find    : id        => Notes.getAll().find(n => n.id === id) || null,
  add     : note      => pushItem(KEYS.NOTES, note),
  update  : note      => updateItem(KEYS.NOTES, note),
  remove  : id        => removeItem(KEYS.NOTES, id),
  count   : ()        => Notes.getAll().length,
  byFolder: folder    => Notes.getAll().filter(n => (n.folder || 'General') === folder),
};

const Summaries = {
  getAll: ()   => getOrDefault(KEYS.SUMMARIES, []),
  find  : id   => Summaries.getAll().find(s => s.id === id) || null,
  add   : s    => pushItem(KEYS.SUMMARIES, s),
  remove: id   => removeItem(KEYS.SUMMARIES, id),
};

const Flashcards = {
  getAll     : ()     => getOrDefault(KEYS.FLASHCARDS, []),
  find       : id     => Flashcards.getAll().find(c => c.id === id) || null,
  add        : card   => pushItem(KEYS.FLASHCARDS, card),
  addMany    : cards  => { const all = [...Flashcards.getAll(), ...cards]; setData(KEYS.FLASHCARDS, all); },
  update     : card   => updateItem(KEYS.FLASHCARDS, card),
  remove     : id     => removeItem(KEYS.FLASHCARDS, id),
  getDecks   : ()     => [...new Set(Flashcards.getAll().map(c => c.deck || 'General'))],
  byDeck     : deck   => deck === 'all' ? Flashcards.getAll() : Flashcards.getAll().filter(c => (c.deck || 'General') === deck),
  getDueToday: ()     => { const t = today(); return Flashcards.getAll().filter(c => !c.nextReview || c.nextReview <= t); },
  getFavorites: ()    => Flashcards.getAll().filter(c => c.favorite),
};

const Quizzes = {
  getAll: ()   => getOrDefault(KEYS.QUIZZES, []),
  find  : id   => Quizzes.getAll().find(q => q.id === id) || null,
  add   : q    => pushItem(KEYS.QUIZZES, q),
  remove: id   => removeItem(KEYS.QUIZZES, id),
};

const QuizResults = {
  getAll   : ()  => getOrDefault(KEYS.QUIZ_RESULTS, []),
  add      : r   => pushItem(KEYS.QUIZ_RESULTS, r),
  avgScore : ()  => {
    const r = QuizResults.getAll();
    return r.length ? Math.round(r.reduce((s, x) => s + x.pct, 0) / r.length) : 0;
  },
  bySubject: sub => QuizResults.getAll().filter(r => r.subject === sub),
  weakTopics: () => {
    const map = {};
    QuizResults.getAll().forEach(r => {
      const s = r.subject || 'General';
      if (!map[s]) map[s] = { c: 0, t: 0, attempts: 0 };
      map[s].c += r.score; map[s].t += r.total; map[s].attempts++;
    });
    return Object.entries(map)
      .map(([topic, d]) => ({ topic, accuracy: Math.round((d.c / d.t) * 100), attempts: d.attempts }))
      .sort((a, b) => a.accuracy - b.accuracy);
  },
  allMistakes: () => QuizResults.getAll().flatMap(r =>
    (r.mistakes || []).map(m => ({ ...m, quizTitle: r.title, subject: r.subject }))
  ),
};

const Tasks = {
  getAll : ()  => getOrDefault(KEYS.TASKS, []),
  find   : id  => Tasks.getAll().find(t => t.id === id) || null,
  add    : t   => pushItem(KEYS.TASKS, t),
  update : t   => updateItem(KEYS.TASKS, t),
  remove : id  => removeItem(KEYS.TASKS, id),
  today  : ()  => Tasks.getAll().filter(t => t.date === today()),
  pending: ()  => Tasks.getAll().filter(t => !t.done),
  toggle : id  => {
    const tasks = Tasks.getAll();
    const idx   = tasks.findIndex(t => t.id === id);
    if (idx < 0) return;
    tasks[idx].done = !tasks[idx].done;
    if (tasks[idx].done) tasks[idx].completedAt = Date.now();
    setData(KEYS.TASKS, tasks);
  },
};

const Exams = {
  getAll  : ()  => getOrDefault(KEYS.EXAMS, []),
  add     : e   => pushItem(KEYS.EXAMS, e),
  remove  : id  => removeItem(KEYS.EXAMS, id),
  upcoming: ()  => Exams.getAll()
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date)),
};

const Revisions = {
  getAll  : ()   => getOrDefault(KEYS.REVISIONS, []),
  add     : r    => pushItem(KEYS.REVISIONS, r),
  update  : r    => updateItem(KEYS.REVISIONS, r),
  remove  : id   => removeItem(KEYS.REVISIONS, id),
  dueToday: ()   => Revisions.getAll().filter(r => !r.done && r.date <= today()),
  upcoming: ()   => Revisions.getAll().filter(r => !r.done && r.date > today())
                      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8),
  markDone: id   => {
    const all = Revisions.getAll();
    const idx = all.findIndex(r => r.id === id);
    if (idx < 0) return;
    all[idx].done = true; all[idx].completedAt = Date.now();
    setData(KEYS.REVISIONS, all);
  },
};

const Sessions = {
  getAll   : ()    => getOrDefault(KEYS.SESSIONS, []),
  add      : s     => pushItem(KEYS.SESSIONS, s),
  perDay   : (n)   => {
    const sess = Sessions.getAll();
    return Array.from({ length: n }, (_, i) => {
      const d  = new Date(); d.setDate(d.getDate() - (n - 1 - i));
      const ds = dateStr(d);
      const mins = sess.filter(s => s.date === ds).reduce((sum, s) => sum + s.duration, 0);
      return { label: d.toLocaleDateString('en', { weekday: 'short' }), hours: Math.round(mins / 60 * 10) / 10 };
    });
  },
  totalMins: days  => {
    const cutoff = Date.now() - days * 86400000;
    return Sessions.getAll().filter(s => s.created >= cutoff).reduce((s, r) => s + r.duration, 0);
  },
};

const Streak = {
  get : ()  => getOrDefault(KEYS.STREAK, { current: 0, longest: 0, lastDate: '' }),
  bump: ()  => {
    const s = Streak.get();
    const t = today();
    if (s.lastDate === t) return;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = s.lastDate === dateStr(yesterday);
    s.current  = wasYesterday ? s.current + 1 : 1;
    s.longest  = Math.max(s.longest, s.current);
    s.lastDate = t;
    setData(KEYS.STREAK, s);
  },
};

const Groups = {
  getAll: ()   => getOrDefault(KEYS.GROUPS, []),
  add   : g    => pushItem(KEYS.GROUPS, g),
  update: g    => updateItem(KEYS.GROUPS, g),
  remove: id   => removeItem(KEYS.GROUPS, id),
};

const Discussions = {
  getAll: ()   => getOrDefault(KEYS.DISCUSSIONS, []),
  add   : d    => pushItem(KEYS.DISCUSSIONS, d),
  remove: id   => removeItem(KEYS.DISCUSSIONS, id),
};

const Achievements = {
  getAll: ()   => getOrDefault(KEYS.ACHIEVEMENTS, []),
  unlock: id   => {
    const all = Achievements.getAll();
    const idx = all.findIndex(a => a.id === id);
    if (idx >= 0 && !all[idx].unlocked) {
      all[idx].unlocked = true;
      all[idx].unlockedAt = Date.now();
      setData(KEYS.ACHIEVEMENTS, all);
      return true; // newly unlocked
    }
    return false;
  },
};

const ChatHistory = {
  getAll        : ()   => getOrDefault(KEYS.CHAT_HIST, []),
  currentSession: ()   => {
    const all = ChatHistory.getAll();
    return all.length ? all[all.length - 1] : null;
  },
  newSession    : ()   => {
    const sess = { id: genId(), title: 'New Chat', messages: [], createdAt: Date.now() };
    pushItem(KEYS.CHAT_HIST, sess);
    return sess;
  },
  addMessage    : msg  => {
    const all  = ChatHistory.getAll();
    if (!all.length) ChatHistory.newSession();
    const last = all[all.length - 1];
    last.messages.push(msg);
    if (last.title === 'New Chat' && msg.role === 'user') {
      last.title = msg.text.slice(0, 40);
    }
    setData(KEYS.CHAT_HIST, all);
  },
  clearCurrent  : ()   => {
    const all = ChatHistory.getAll();
    if (all.length) { all[all.length - 1].messages = []; setData(KEYS.CHAT_HIST, all); }
  },
};

const SettingsStore = {
  get  : ()     => getOrDefault(KEYS.SETTINGS, { theme: 'dark', accentColor: '#60a5fa', dailyGoal: 6, pomodoro: 25 }),
  save : s      => setData(KEYS.SETTINGS, s),
  patch: patch  => { const s = SettingsStore.get(); setData(KEYS.SETTINGS, { ...s, ...patch }); },
};

// Alias for UserStore (user profile stored in session, not per-data)
const UserStore = {
  get        : ()   => { 
    if (typeof getUser === 'function') return getUser();
    try { return JSON.parse(localStorage.getItem('sa_user') || 'null'); } catch { return null; } 
  },
  set        : u    => { 
    if (typeof setUser === 'function') return setUser(u);
    localStorage.setItem('sa_user', JSON.stringify(u)); 
  },
  clear      : ()   => { 
    if (typeof clearToken === 'function') return clearToken();
    localStorage.removeItem('sa_token'); localStorage.removeItem('sa_user'); 
  },
  findByEmail: ()   => null, // handled by server
  addUser    : ()   => null, // handled by server
};

// ── EXPORT / IMPORT ──────────────────────────────────────────
function exportAllData() {
  const data   = JSON.stringify({ user: UserStore.get(), data: _cache }, null, 2);
  const blob   = new Blob([data], { type: 'application/json' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = 'studyai-backup-' + today() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importAllData(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    const data   = parsed.data || parsed;
    Object.entries(data).forEach(([k, v]) => setData(k, v));
    return { ok: true, count: Object.keys(data).length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── GLOBAL UTILITIES ─────────────────────────────────────────
function genId()   { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function today()   { return new Date().toISOString().split('T')[0]; }
function dateStr(d){ return d.toISOString().split('T')[0]; }
function addDays(n){ const d = new Date(); d.setDate(d.getDate() + n); return dateStr(d); }
function daysUntil(s) { return Math.ceil((new Date(s) - new Date()) / 86400000); }
function formatDate(s){ return s ? new Date(s + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
function fmtTime(s)   { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function fmtMins(m)   { return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h' + (m % 60 ? m % 60 + 'm' : ''); }
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)    return 'Just now';
  if (d < 3600000)  return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  return Math.floor(d / 86400000) + 'd ago';
}
function offsetDate(n) { return addDays(n); }

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type = 'info', dur = 3000) {
  const c   = document.getElementById('toast-container') || document.getElementById('toasts');
  if (!c) return;
  const el  = document.createElement('div');
  const cls = { success: 'ts', error: 'te', info: 'ti', warning: 'tw' }[type] || 'ti';
  const ico = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }[type] || 'ℹ';
  el.className = `toast ${cls}`;
  el.innerHTML = `<span>${ico}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'tsi .22s ease reverse';
    setTimeout(() => el.remove(), 220);
  }, dur);
}

// ── MODAL HELPERS ────────────────────────────────────────────
function openModal(id)  { const el = document.getElementById(id); if (el) el.classList.add('open'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

// Alias
const openM  = openModal;
const closeM = closeModal;

// ── AUTO-RESIZE TEXTAREA ─────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// Keyboard Escape closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});