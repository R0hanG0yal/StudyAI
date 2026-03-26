/* ============================================================
   STUDYAI — subjects.js
   SINGLE SOURCE OF TRUTH for subjects.
   Include this on every page BEFORE other JS files.
   ============================================================ */

// ── Default subjects (fallback if user has none saved) ────
const DEFAULT_SUBJECTS = [
  'OS', 'DBMS', 'DSA', 'CN', 'AI',
  'Math', 'Physics', 'Chemistry', 'English', 'General'
];

// ── Get subjects: user custom → localStorage → default ────
function getSubjects() {
  try {
    const stored = localStorage.getItem('sa_subjects');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_SUBJECTS];
}

// ── Save subjects to localStorage + mark for sync ─────────
function saveSubjectsLocal(subjects) {
  try {
    localStorage.setItem('sa_subjects', JSON.stringify(subjects));
    // Async sync to server (non-blocking)
    const token = localStorage.getItem('sa_token');
    if (token) {
      fetch('/api/data/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: subjects }),
      }).catch(() => {}); // silent fail — local is source of truth for now
    }
  } catch {}
}

// ── Load subjects from server on login (merges with default) ─
async function syncSubjectsFromServer() {
  try {
    const token = localStorage.getItem('sa_token');
    if (!token) return;
    const res = await fetch('/api/data/subjects', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.value && Array.isArray(data.value) && data.value.length > 0) {
      localStorage.setItem('sa_subjects', JSON.stringify(data.value));
    }
  } catch {}
}

// ── Add a custom subject ──────────────────────────────────
function addSubject(name) {
  const clean = name.trim();
  if (!clean || clean.length < 1 || clean.length > 30) return false;
  const subjects = getSubjects();
  if (subjects.some(s => s.toLowerCase() === clean.toLowerCase())) return false;
  subjects.push(clean);
  saveSubjectsLocal(subjects);
  return true;
}

// ── Remove a subject ─────────────────────────────────────
function removeSubject(name) {
  const subjects = getSubjects().filter(s => s !== name);
  saveSubjectsLocal(subjects);
}

// ── Populate any <select> element with subjects ───────────
// includeAll: adds "All Subjects" as first option
// selected: pre-select a specific value
function populateSubjectSelect(selectEl, includeAll = false, selected = null) {
  if (!selectEl) return;
  const subjects = getSubjects();
  const currentVal = selected || selectEl.value;
  selectEl.innerHTML = '';
  if (includeAll) {
    const opt = document.createElement('option');
    opt.value = 'all'; opt.textContent = 'All Subjects';
    selectEl.appendChild(opt);
  }
  subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    if (s === currentVal) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// ── Render subject chips (for settings/filters) ───────────
// container: DOM element to fill
// activeSubjects: array of currently-active subjects
// onToggle: callback(subjectName, isActive)
function renderSubjectChips(container, activeSubjects = [], onToggle = null) {
  if (!container) return;
  const subjects = getSubjects();
  container.innerHTML = subjects.map(s => {
    const isActive = activeSubjects.includes(s);
    return `<span class="subject-tag ${isActive ? 'active' : ''}" data-subject="${s}"
      style="padding:5px 12px;border-radius:100px;font-size:.76rem;font-weight:600;cursor:pointer;
      border:1.5px solid var(--border);transition:all .18s;display:inline-block;margin:3px;
      ${isActive ? 'background:var(--grad-1);color:#fff;border-color:transparent' : 'color:var(--text-dim)'}"
    >${s}</span>`;
  }).join('');

  if (onToggle) {
    container.querySelectorAll('.subject-tag').forEach(chip => {
      chip.addEventListener('click', () => {
        const subj = chip.dataset.subject;
        const nowActive = !chip.classList.contains('active');
        chip.classList.toggle('active', nowActive);
        chip.style.cssText = nowActive
          ? 'padding:5px 12px;border-radius:100px;font-size:.76rem;font-weight:600;cursor:pointer;border:1.5px solid transparent;transition:all .18s;display:inline-block;margin:3px;background:var(--grad-1);color:#fff'
          : 'padding:5px 12px;border-radius:100px;font-size:.76rem;font-weight:600;cursor:pointer;border:1.5px solid var(--border);transition:all .18s;display:inline-block;margin:3px;color:var(--text-dim)';
        onToggle(subj, nowActive);
      });
    });
  }
}

// ── Auto-refresh all subject selects on the page ──────────
// Call this after adding/removing subjects
function refreshAllSubjectSelects() {
  document.querySelectorAll('[data-subject-select]').forEach(sel => {
    const includeAll = sel.dataset.subjectSelect === 'all';
    populateSubjectSelect(sel, includeAll);
  });
}

// ── Initialise: sync from server then refresh UI ──────────
(async function initSubjects() {
  await syncSubjectsFromServer();
  refreshAllSubjectSelects();
})();