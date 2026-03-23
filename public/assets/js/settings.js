/* ============================================================
   STUDYAI — SETTINGS
   File: public/assets/js/settings.js
   ============================================================ */
'use strict';

const ACCENT_VARS = {
  purple: { a:'#667eea', a2:'#764ba2', a3:'#43e97b', a4:'#fb923c', a5:'#f5576c' },
  pink  : { a:'#f093fb', a2:'#f5576c', a3:'#43e97b', a4:'#fb923c', a5:'#f5576c' },
  blue  : { a:'#4facfe', a2:'#00f2fe', a3:'#43e97b', a4:'#fb923c', a5:'#f5576c' },
  green : { a:'#43e97b', a2:'#38f9d7', a3:'#4facfe', a4:'#fb923c', a5:'#f5576c' },
  orange: { a:'#fa709a', a2:'#fee140', a3:'#43e97b', a4:'#4facfe', a5:'#f5576c' },
};

async function initSettings(user) {
  _loadProfile(user);
  await _loadStoredPrefs();
  _renderSubjectChips();
}

/* ── Profile ── */
function _loadProfile(user) {
  if (!user) return;
  const nEl = document.getElementById('s-name');
  const eEl = document.getElementById('s-email');
  const cEl = document.getElementById('s-course');
  const aEl = document.getElementById('account-email');
  if (nEl) nEl.value = user.name   || '';
  if (eEl) eEl.value = user.email  || '';
  if (cEl) cEl.value = user.course || '';
  if (aEl) aEl.textContent = user.email || '';
}

function saveProfile() {
  const name   = document.getElementById('s-name')?.value.trim();
  const email  = document.getElementById('s-email')?.value.trim();
  const course = document.getElementById('s-course')?.value.trim();
  if (!name) return showToast('Name cannot be empty.','error');

  const user = { ...getUser(), name, email, course };
  setUser(user);
  updateSidebarUser();
  showToast('Profile saved! ✓','success');
}

/* ── Load prefs from server ── */
async function _loadStoredPrefs() {
  try {
    const data = await apiGet('/data');
    const s    = data.settings || {};

    // Theme
    const dt = document.getElementById('tog-dark');
    if (dt) dt.checked = s.theme !== 'light';
    if (s.theme === 'light') document.documentElement.setAttribute('data-theme','light');

    // Goal + pomo
    const gEl = document.getElementById('s-goal');
    const pEl = document.getElementById('s-pomo');
    if (gEl) gEl.value = s.dailyGoal || 6;
    if (pEl) pEl.value = s.pomodoro  || 25;

    // Notifications
    const notify = s.notifications || {};
    ['study','exam','revision','achieve'].forEach(k=>{
      const el = document.getElementById('n-'+k);
      if (el) el.checked = notify[k] !== false;
    });

    // Accent
    if (s.accent) {
      document.querySelectorAll('.accent-dot').forEach(d=>d.classList.remove('active'));
      const dot = document.querySelector(`.accent-dot[onclick*="${s.accent}"]`);
      if (dot) dot.classList.add('active');
      _applyAccent(s.accent);
    }
  } catch (_) {}
}

/* ── Subject chips (display only) ── */
function _renderSubjectChips() {
  const el = document.getElementById('subject-chips');
  if (!el) return;
  const subjects = ['OS','DBMS','DSA','CN','AI','Math','General'];
  el.innerHTML = subjects.map(s=>
    `<span class="badge badge-purple" style="font-size:.72rem;padding:4px 10px">${s}</span>`
  ).join('');
}

/* ── Theme ── */
function toggleTheme(checkbox) {
  const dark = checkbox.checked;
  document.documentElement.setAttribute('data-theme', dark?'dark':'light');
  _saveSettings({theme: dark?'dark':'light'});
  showToast(`${dark?'Dark 🌙':'Light ☀️'} mode active`,'success');
}

/* ── Accent ── */
function setAccent(name, dotEl) {
  document.querySelectorAll('.accent-dot').forEach(d=>d.classList.remove('active'));
  if (dotEl) dotEl.classList.add('active');
  _applyAccent(name);
  _saveSettings({accent: name});
  showToast('Accent updated!','success');
}

function _applyAccent(name) {
  const vars = ACCENT_VARS[name];
  if (!vars) return;
  const root = document.documentElement;
  root.style.setProperty('--purple', vars.a);
  root.style.setProperty('--a',      vars.a);
}

/* ── Preferences ── */
async function savePreferences() {
  const goal = parseFloat(document.getElementById('s-goal')?.value)||6;
  const pomo = parseInt(document.getElementById('s-pomo')?.value)||25;
  if (goal<=0||goal>24) return showToast('Enter a valid goal (0.5–24h).','error');
  if (pomo<5||pomo>120) return showToast('Pomodoro must be 5–120 min.','error');
  await _saveSettings({dailyGoal:goal, pomodoro:pomo});
  showToast('Preferences saved! ✓','success');
}

/* ── Notifications ── */
async function saveNotifications() {
  const notify = {
    study   : document.getElementById('n-study')?.checked    !== false,
    exam    : document.getElementById('n-exam')?.checked     !== false,
    revision: document.getElementById('n-revision')?.checked !== false,
    achieve : document.getElementById('n-achieve')?.checked  !== false,
  };
  await _saveSettings({notifications: notify});
  showToast('Notification preferences saved!','success');
}

/* ── Save helper ── */
async function _saveSettings(patch) {
  try {
    const data = await apiGet('/data');
    const s    = { ...(data.settings||{}), ...patch };
    await apiPost('/data/settings',{value:s});
  } catch (e) {
    showToast('Could not save settings: '+e.message,'error');
  }
}

/* ── Data export ── */
async function exportAllData() {
  try {
    const data = await apiGet('/data');
    const user = getUser();
    downloadJSON({ user, data, exported: new Date().toISOString() }, 'studyai-backup-'+today()+'.json');
    showToast('Data exported!','success');
  } catch (e) {
    showToast('Export failed: '+e.message,'error');
  }
}

/* ── Data import ── */
async function importBackup(inp) {
  const file = inp.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const parsed = JSON.parse(e.target.result);
      const data   = parsed.data || parsed;
      if (typeof data !== 'object') throw new Error('Invalid backup format.');
      await apiPost('/data', data);
      showToast('Data imported! Reloading…','success');
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      showToast('Import failed: '+err.message,'error');
    }
  };
  reader.readAsText(file);
  inp.value = '';
}

/* ── Reset ── */
async function resetAllData() {
  if (!confirm('⚠️ Delete ALL your notes, quizzes, flashcards and history? This cannot be undone.')) return;
  const typed = prompt('Type RESET to confirm permanent deletion:');
  if (typed?.trim().toUpperCase() !== 'RESET') return showToast('Reset cancelled.','info');
  try {
    await apiDel('/data');
    showToast('All data deleted. Reloading…','info');
    setTimeout(() => location.reload(), 1500);
  } catch (e) {
    showToast('Reset failed: '+e.message,'error');
  }
}

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  if (tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;
  if ((e.ctrlKey||e.metaKey) && e.key==='n') { e.preventDefault(); window.location.href='/notes.html'; }
  if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); window.location.href='/chat.html'; }
});