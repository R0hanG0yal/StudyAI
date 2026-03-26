/* ============================================================
   STUDYAI — settings.js  (Part 4 + Part 7)
   Settings persistence: theme, accent, subjects, preferences
   ============================================================ */

async function initSettings(user) {
  // ── Populate profile fields ──────────────────────────────
  document.getElementById('s-name').value   = user.name   || '';
  document.getElementById('s-email').value  = user.email  || '';
  document.getElementById('s-course').value = user.course || '';
  const accEl = document.getElementById('account-email');
  if (accEl) accEl.textContent = user.email || '';

  // ── Load saved preferences from server ───────────────────
  const settings = await getSettings();

  // Study prefs
  if (settings.dailyGoal)    document.getElementById('s-goal').value = settings.dailyGoal;
  if (settings.pomoDuration) document.getElementById('s-pomo').value = settings.pomoDuration;

  // Notifications
  if (settings.notifications) {
    const n = settings.notifications;
    if (document.getElementById('n-study'))    document.getElementById('n-study').checked    = n.study    !== false;
    if (document.getElementById('n-exam'))     document.getElementById('n-exam').checked     = n.exam     !== false;
    if (document.getElementById('n-revision')) document.getElementById('n-revision').checked = n.revision !== false;
    if (document.getElementById('n-achieve'))  document.getElementById('n-achieve').checked  = n.achieve  !== false;
  }

  // ── Part 7: Theme persistence ─────────────────────────────
  const savedTheme = localStorage.getItem('sa_theme') || settings.theme || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const togDark = document.getElementById('tog-dark');
  if (togDark) togDark.checked = (savedTheme === 'dark');

  // ── Part 7: Accent colour persistence ────────────────────
  const savedAccent = localStorage.getItem('sa_accent') || settings.accent || 'purple';
  _applyAccent(savedAccent);
  document.querySelectorAll('[data-accent]').forEach(dot => {
    dot.classList.toggle('active', dot.dataset.accent === savedAccent);
  });

  // ── Part 4: Subjects display ──────────────────────────────
  _renderSubjectList();
}

// ── Profile ───────────────────────────────────────────────
async function saveProfile() {
  const name   = document.getElementById('s-name')?.value.trim();
  const course = document.getElementById('s-course')?.value.trim();
  if (!name) { showToast('Name cannot be empty', 'warning'); return; }

  const user = getUser();
  if (user) {
    user.name   = name;
    user.course = course || user.course;
    localStorage.setItem('sa_user', JSON.stringify(user));
  }

  const settings = await getSettings();
  settings.profileName   = name;
  settings.profileCourse = course;
  await saveSettings(settings);
  showToast('Profile saved!', 'success');
}

// ── Preferences ───────────────────────────────────────────
async function savePreferences() {
  const goal = parseFloat(document.getElementById('s-goal')?.value) || 6;
  const pomo = parseInt(document.getElementById('s-pomo')?.value) || 25;

  const settings = await getSettings();
  settings.dailyGoal    = goal;
  settings.pomoDuration = pomo;
  await saveSettings(settings);

  // Persist goal to localStorage for quick access
  localStorage.setItem('sa_daily_goal', goal);
  showToast('Preferences saved!', 'success');
}

// ── Notifications ─────────────────────────────────────────
async function saveNotifications() {
  const settings = await getSettings();
  settings.notifications = {
    study   : document.getElementById('n-study')?.checked    !== false,
    exam    : document.getElementById('n-exam')?.checked     !== false,
    revision: document.getElementById('n-revision')?.checked !== false,
    achieve : document.getElementById('n-achieve')?.checked  !== false,
  };
  await saveSettings(settings);
  showToast('Notification preferences saved!', 'success');
}

// ── Part 7: Theme toggle (persists to both localStorage + server) ──
function toggleTheme(checkbox) {
  const theme = checkbox.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sa_theme', theme);

  // Persist to server settings async
  getSettings().then(s => {
    s.theme = theme;
    saveSettings(s);
  });
}

// ── Part 7: Accent colour (persists to both localStorage + server) ─
function setAccent(name, dotEl) {
  _applyAccent(name);
  localStorage.setItem('sa_accent', name);

  // Update UI
  document.querySelectorAll('[data-accent]').forEach(d => d.classList.remove('active'));
  if (dotEl) dotEl.classList.add('active');

  // Persist to server async
  getSettings().then(s => {
    s.accent = name;
    saveSettings(s);
  });
  showToast('Accent colour updated!', 'success', 1500);
}

// Internal: apply accent CSS variables
function _applyAccent(name) {
  const accents = {
    purple : ['#667eea', '#764ba2', 'rgba(102,126,234,.45)'],
    pink   : ['#f093fb', '#f5576c', 'rgba(240,147,251,.45)'],
    blue   : ['#4facfe', '#00f2fe', 'rgba(79,172,254,.45)'],
    green  : ['#43e97b', '#38f9d7', 'rgba(67,233,123,.45)'],
    orange : ['#fa709a', '#fee140', 'rgba(250,112,154,.45)'],
  };
  const [c1, c2, shadow] = accents[name] || accents.purple;
  const root = document.documentElement;
  root.style.setProperty('--grad-1', `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`);
  root.style.setProperty('--purple', c1);
  root.style.setProperty('--border-focus', `${c1}88`);
}

// ── Part 4: Subject management ────────────────────────────
function addCustomSubject() {
  const inp = document.getElementById('s-new-subject');
  if (!inp) return;
  const name = inp.value.trim();
  if (!name) { showToast('Enter a subject name', 'warning'); return; }
  if (addSubject(name)) {
    inp.value = '';
    _renderSubjectList();
    showToast(`"${name}" added!`, 'success', 2000);
  } else {
    showToast('Subject already exists or name is invalid', 'warning');
  }
}

function _renderSubjectList() {
  const container = document.getElementById('subject-chips-display');
  if (!container) return;
  const subjects = getSubjects();
  container.innerHTML = subjects.map(s => `
    <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(102,126,234,.1);border:1px solid rgba(102,126,234,.2);border-radius:100px;font-size:.76rem;font-weight:600;color:var(--purple)">
      ${s}
      <button data-remove-subject="${s}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.8rem;line-height:1;padding:0 2px" title="Remove">✕</button>
    </span>`).join('');

  // Wire remove buttons
  container.querySelectorAll('[data-remove-subject]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.removeSubject;
      if (DEFAULT_SUBJECTS.includes(name)) {
        showToast(`Cannot remove default subject "${name}"`, 'warning'); return;
      }
      removeSubject(name);
      _renderSubjectList();
      showToast(`"${name}" removed`, 'info', 2000);
    });
  });
}

// ── Data Management ───────────────────────────────────────
async function exportAllData() {
  try {
    const data = await getData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `studyai-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Data exported successfully!', 'success');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
}

async function importBackup(input) {
  const file = input?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!confirm('This will overwrite all your current data. Are you sure?')) return;
    await saveData(data);
    invalidateCache();
    showToast('Data imported successfully! Refreshing…', 'success', 3000);
    setTimeout(() => window.location.reload(), 2000);
  } catch (err) {
    showToast('Import failed: invalid backup file', 'error');
  }
}

async function resetAllData() {
  if (!confirm('⚠️ This will permanently delete ALL your notes, quizzes, flashcards and progress. This cannot be undone. Are you sure?')) return;
  if (!confirm('Last warning: delete everything?')) return;
  try {
    await apiDelete('/api/data');
    invalidateCache();
    showToast('All data deleted. Redirecting…', 'success', 2500);
    setTimeout(() => window.location.href = '/dashboard.html', 2000);
  } catch (err) {
    showToast('Reset failed: ' + err.message, 'error');
  }
}