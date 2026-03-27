/* ============================================================
   STUDYAI — sidebar.js (v2.1)
   Builds and injects sidebar + topbar. Handles mobile drawer.
   ============================================================ */
'use strict';

// Uses escHtml() from sanitize.js (loaded first) for XSS safety

const NAV_ITEMS = [
  { section: 'Main' },
  { href:'/dashboard.html',  icon:'🏠', label:'Dashboard',    page:'Dashboard' },
  { href:'/notes.html',      icon:'📝', label:'My Notes',     page:'My Notes' },
  { href:'/chat.html',       icon:'🤖', label:'AI Chat',      page:'AI Chat' },
  { href:'/summaries.html',  icon:'📄', label:'Summaries',    page:'Summaries' },
  { href:'/customise.html',  icon:'🎨', label:'Customise',    page:'Customise' },
  { section: 'Practice' },
  { href:'/quiz.html',       icon:'🎯', label:'Quiz Zone',    page:'Quiz Zone' },
  { href:'/flashcards.html', icon:'🃏', label:'Flashcards',   page:'Flashcards' },
  { href:'/doubt.html',      icon:'🔍', label:'Doubt Solver', page:'AI Doubt Solver' },
  { href:'/revision.html',   icon:'🔄', label:'Revision',     page:'Revision Center' },
  { section: 'Planning' },
  { href:'/planner.html',    icon:'📅', label:'Planner',      page:'Study Planner' },
  { href:'/focus.html',      icon:'⚡', label:'Focus Mode',   page:'Focus Mode' },
  { href:'/groups.html',     icon:'👥', label:'Study Groups', page:'Study Groups' },
  { section: 'Insights' },
  { href:'/analytics.html',  icon:'📊', label:'Analytics',    page:'Analytics' },
  { href:'/achievements.html',icon:'🏆',label:'Achievements', page:'Achievements' },
  { href:'/settings.html',   icon:'⚙️', label:'Settings',     page:'Settings' },
];

function buildSidebar(user, activePage) {
  const layout = document.getElementById('app-layout');
  if (!layout || document.getElementById('sidebar')) return;

  let navHtml = '';
  NAV_ITEMS.forEach(item => {
    if (item.section) {
      navHtml += `<div class="nav-section-label">${item.section}</div>`;
    } else {
      const active = item.page === activePage ? 'active' : '';
      navHtml += `<a class="nav-item ${active}" href="${item.href}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>`;
    }
  });

  const initials = (user.name || 'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const displayName = user.name || 'Student';
  const displayCourse = user.course || 'General';

  const sidebarHtml = `
    <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
      <div class="sidebar-logo">
        <div class="sidebar-logo-text">🧠 StudyAI</div>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <a class="sidebar-user" href="/settings.html" title="Settings">
          <div class="user-avatar" aria-hidden="true">${initials}</div>
          <div class="user-info">
            <div class="user-name">${escHtml(displayName)}</div>
            <div class="user-course">${escHtml(displayCourse)}</div>
          </div>
        </a>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay" role="presentation"></div>`;

  const topbarHtml = `
    <div class="topbar" id="topbar" role="banner">
      <button id="menu-btn" aria-label="Open menu" aria-expanded="false"
        style="display:none;background:none;border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:1.1rem;color:var(--text-dim)">☰</button>
      
      <div style="display:flex;align-items:center;gap:12px;flex:1">
        <div style="font-family:var(--font-display);font-weight:700;font-size:.95rem;display:none;@media(min-width:768px){display:block}">${activePage}</div>
        
        <!-- Global Quick Search -->
        <div class="search-container" style="position:relative;flex:1;max-width:320px;margin-left:14px">
          <input type="text" id="global-search" placeholder="Quick find... (Ctrl+K)" 
            style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:10px;padding:7px 12px 7px 32px;font-size:.8rem;color:var(--text);outline:none;transition:all .2s">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:.9rem;opacity:.5">🔍</span>
        </div>
      </div>

      <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
        <!-- Streak & Level Badges -->
        <div id="topbar-streak" class="badge badge-orange" style="font-size:.7rem;padding:4px 10px;display:none">🔥 0</div>
        <div id="topbar-level" class="badge badge-purple" style="font-size:.7rem;padding:4px 10px;display:none">Lv. 1</div>
        
        <div class="flex" style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:3px">
          <button id="reading-toggle-btn" aria-label="Toggle reading mode" title="Reading Mode"
            style="background:none;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s;font-size:1rem">📖</button>
          <button id="theme-toggle-btn" aria-label="Toggle theme" 
            style="background:none;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s">🌙</button>
           <button id="topbar-logout" aria-label="Sign out"
            style="background:none;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s;color:var(--red)">🚪</button>
        </div>
      </div>
    </div>`;

  // Injection
  const main = layout.querySelector('.main-content');
  if (main) {
    const sbContainer = document.createElement('div');
    sbContainer.innerHTML = sidebarHtml;
    // Prepend sidebar before main-content
    layout.insertBefore(sbContainer.firstElementChild, main);
    layout.insertBefore(sbContainer.lastElementChild, main);

    const tbContainer = document.createElement('div');
    tbContainer.innerHTML = topbarHtml;
    // Prepend topbar into main-content
    main.insertBefore(tbContainer.firstElementChild, main.firstChild);
  }

  // ── Theme toggle ──────────────────────────────────────────
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    themeBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    themeBtn.addEventListener('click', () => {
      const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('sa_theme', t);
      themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
      getSettings().then(s => { s.theme = t; saveSettings(s); }).catch(()=>{});
    });
  }

  // ── Reading Mode toggle ───────────────────────────────────
  const readBtn = document.getElementById('reading-toggle-btn');
  if (readBtn) {
    const isRead = localStorage.getItem('sa_reading_mode') === 'true';
    if (isRead) {
      document.documentElement.setAttribute('data-reading-mode', 'true');
      readBtn.style.background = 'rgba(124, 58, 237, 0.15)';
    }
    readBtn.addEventListener('click', () => {
      const active = document.documentElement.getAttribute('data-reading-mode') === 'true';
      const newVal = !active;
      document.documentElement.setAttribute('data-reading-mode', newVal ? 'true' : 'false');
      localStorage.setItem('sa_reading_mode', newVal);
      readBtn.style.background = newVal ? 'rgba(124, 58, 237, 0.15)' : 'none';
    });
  }

  // ── Logout ────────────────────────────────────────────────
  document.getElementById('topbar-logout')?.addEventListener('click', doLogout);

  // ── Mobile hamburger ──────────────────────────────────────
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  function openDrawer() {
    sidebar?.classList.add('open');
    overlay?.classList.add('show');
    menuBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
    menuBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (menuBtn) {
    // Show on mobile
    if (window.innerWidth <= 768) menuBtn.style.display = 'flex';
    menuBtn.addEventListener('click', () =>
      sidebar?.classList.contains('open') ? closeDrawer() : openDrawer()
    );
    window.addEventListener('resize', () => {
      menuBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
      if (window.innerWidth > 768) closeDrawer();
    });
  }

  overlay?.addEventListener('click', closeDrawer);

  // Close drawer on nav item click (mobile)
  sidebar?.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => { if (window.innerWidth <= 768) closeDrawer(); });
  });

  // ── Global Search & Shortcuts ─────────────────────────────
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) return;
      // Simple page search logic
      const match = NAV_ITEMS.find(i => i.label?.toLowerCase().includes(q));
      if (match && e.inputType === 'insertLineBreak' || e.key === 'Enter') {
        window.location.href = match.href;
      }
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.toLowerCase().trim();
        const match = NAV_ITEMS.find(i => i.label?.toLowerCase().includes(q));
        if (match) window.location.href = match.href;
      }
    });
  }

  // ── Apply saved accent ────────────────────────────────────
  const accent = localStorage.getItem('sa_accent');
  if (accent && typeof _applyAccent === 'function') _applyAccent(accent);

  // Initialize stats from localStorage cache (if any)
  try {
    const s = parseInt(localStorage.getItem('sa_cached_streak') || 0);
    const l = parseInt(localStorage.getItem('sa_cached_level') || 1);
    updateTopbarStats(s, l);
  } catch(e){}
}

function updateTopbarStats(streak, level) {
  const ts = document.getElementById('topbar-streak');
  const tl = document.getElementById('topbar-level');
  if (ts) { 
    ts.textContent = `🔥 ${streak}`; 
    ts.style.display = streak > 0 ? 'inline-flex' : 'none';
    localStorage.setItem('sa_cached_streak', streak);
  }
  if (tl) { 
    tl.textContent = `Lv. ${level}`; 
    tl.style.display = 'inline-flex';
    localStorage.setItem('sa_cached_level', level);
  }
}

// escHtml / escapeHtml provided by sanitize.js — no duplicate declaration needed