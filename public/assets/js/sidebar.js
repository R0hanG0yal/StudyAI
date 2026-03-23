/* ============================================================
   STUDYAI — SIDEBAR  (injected on every page)
   File: public/assets/js/sidebar.js
   ============================================================ */
'use strict';

const NAV_ITEMS = [
  { group: 'Main',
    items: [
      { href: '/dashboard.html',    icon: '🏠', label: 'Dashboard'      },
      { href: '/notes.html',        icon: '📝', label: 'My Notes'       },
      { href: '/chat.html',         icon: '🤖', label: 'AI Chat'        },
      { href: '/summaries.html',    icon: '📄', label: 'Summaries'      },
      { href: '/doubt.html',         icon: '🔍', label: 'Doubt Solver'   },
    ]
  },
  { group: 'Practice',
    items: [
      { href: '/quiz.html',         icon: '🎯', label: 'Quiz Zone'      },
      { href: '/flashcards.html',   icon: '🃏', label: 'Flashcards'     },
      { href: '/revision.html',     icon: '🔄', label: 'Revision'       },
    ]
  },
  { group: 'Planning',
    items: [
      { href: '/planner.html',      icon: '📅', label: 'Study Planner'  },
      { href: '/analytics.html',    icon: '📊', label: 'Analytics'      },
      { href: '/focus.html',        icon: '⚡', label: 'Focus Mode'     },
    ]
  },
  { group: 'Community',
    items: [
      { href: '/groups.html',       icon: '👥', label: 'Study Groups'   },
      { href: '/achievements.html', icon: '🏆', label: 'Achievements'   },
    ]
  },
  { group: 'Account',
    items: [
      { href: '/settings.html',     icon: '⚙️', label: 'Settings'       },
    ]
  },
];

/* ── Build and inject sidebar ── */
function buildSidebar(pageTitle = 'StudyAI') {
  const currentPath = window.location.pathname;

  // Build nav groups HTML
  const navHTML = NAV_ITEMS.map(group => `
    <div class="nav-group">
      <div class="nav-group-label">${group.group}</div>
      ${group.items.map(item => {
        const isActive = currentPath === item.href ||
          (item.href !== '/dashboard.html' && currentPath.includes(item.href.replace('.html','')));
        return `
          <a href="${item.href}" class="nav-item ${isActive ? 'active' : ''}">
            <div class="nav-icon">${item.icon}</div>
            <span class="nav-label">${item.label}</span>
          </a>`;
      }).join('')}
    </div>`).join('');

  const sidebarHTML = `
    <div class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">🧠</div>
        <span class="sidebar-logo-text">StudyAI</span>
        <span class="sidebar-logo-beta">BETA</span>
      </div>
      <div class="nav-scroll" style="flex:1;overflow-y:auto">
        ${navHTML}
      </div>
      <div class="sidebar-user" onclick="window.location.href='/settings.html'">
        <div class="user-avatar" id="sb-avatar">A</div>
        <div class="user-info">
          <div class="user-name" id="sb-name">Loading…</div>
          <div class="user-role" id="sb-role">Student</div>
        </div>
        <span style="color:var(--text-muted);font-size:.8rem">⚙️</span>
      </div>
    </div>`;

  const topbarHTML = `
    <header class="topbar">
      <button class="menu-toggle" onclick="toggleSidebar()" title="Toggle menu">☰</button>
      <div class="topbar-title">${pageTitle}</div>
      <div class="topbar-actions">
        <div class="topbar-streak" title="Study streak">
          🔥 <span id="tb-streak-num">0</span>
        </div>
        <button class="topbar-btn" onclick="window.location.href='/focus.html'" title="Focus Mode">⚡</button>
        <button class="topbar-btn" onclick="doLogout()" title="Sign out">🚪</button>
      </div>
    </header>`;

  // Inject into .app-layout
  const layout = document.getElementById('app-layout');
  if (layout) {
    // Inject sidebar before main content
    layout.insertAdjacentHTML('afterbegin', sidebarHTML);

    // Find or create main-content
    const mc = layout.querySelector('.main-content');
    if (mc) mc.insertAdjacentHTML('afterbegin', topbarHTML);
  }

  // Update user info
  updateSidebarUser();
}

/* ── Toggle sidebar (mobile) ── */
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', e => {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  if (window.innerWidth <= 768 &&
      !sb.contains(e.target) &&
      !e.target.classList.contains('menu-toggle')) {
    sb.classList.remove('open');
  }
});

/* ── Load streak for topbar ── */
async function loadStreakForTopbar() {
  try {
    const data = await apiGet('/data/streak');
    const streak = data.value || { current: 0 };
    updateTopbarStreak(streak.current || 0);
  } catch (_) {}
}

/* ════════════════════════════════════════════════════════════
   PAGE INIT HELPER — call this on every protected page
   ════════════════════════════════════════════════════════════ */
async function initPage(pageTitle) {
  showPageLoader();

  // Auth check
  const user = await requireAuth();
  if (!user) return; // redirected to login

  // Build sidebar + topbar
  buildSidebar(pageTitle);

  // Load streak
  loadStreakForTopbar();

  hidePageLoader();
  return user;
}