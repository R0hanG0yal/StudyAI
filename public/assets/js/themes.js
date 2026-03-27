/* ============================================================
   STUDYAI — themes.js  (Task 1)
   8 complete themes, each with full CSS variable overrides.
   Persisted to localStorage + server settings.
   ============================================================ */

const THEMES = {
  dark: {
    name: 'Dark',
    icon: '🌑',
    desc: 'Classic dark mode',
    vars: {
      '--bg-primary':    '#080b14',
      '--bg-secondary':  '#0d1120',
      '--bg-card':       'rgba(18,22,40,.85)',
      '--bg-card-hover': 'rgba(24,30,52,.9)',
      '--bg-sidebar':    'rgba(10,13,24,.95)',
      '--border':        'rgba(140,150,220,.1)',
      '--border-focus':  'rgba(102,126,234,.45)',
      '--text':          '#e8eaf6',
      '--text-dim':      '#a8aacc',
      '--text-muted':    '#5c6088',
      '--grad-1':        'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
      '--grad-main':     'linear-gradient(135deg,#667eea,#f093fb,#4facfe)',
      '--purple':        '#667eea',
      '--orb-opacity':   '0.12',
    }
  },
  light: {
    name: 'Light',
    icon: '☀️',
    desc: 'Clean light mode',
    vars: {
      '--bg-primary':    '#f7f8fc',
      '--bg-secondary':  '#eef0f8',
      '--bg-card':       '#ffffff',
      '--bg-card-hover': '#f4f6ff',
      '--bg-sidebar':    '#ffffff',
      '--border':        'rgba(100,110,160,.15)',
      '--border-focus':  'rgba(102,126,234,.5)',
      '--text':          '#1a1d2e',
      '--text-dim':      '#3d4166',
      '--text-muted':    '#8b90b3',
      '--grad-1':        'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
      '--grad-main':     'linear-gradient(135deg,#667eea,#f093fb,#4facfe)',
      '--purple':        '#6b4ef6',
      '--orb-opacity':   '0.06',
    }
  },
  midnight: {
    name: 'Midnight',
    icon: '🌌',
    desc: 'Deep space blue',
    vars: {
      '--bg-primary':    '#020510',
      '--bg-secondary':  '#050a1c',
      '--bg-card':       'rgba(8,15,40,.9)',
      '--bg-card-hover': 'rgba(12,22,56,.95)',
      '--bg-sidebar':    'rgba(4,8,28,.98)',
      '--border':        'rgba(60,100,220,.12)',
      '--border-focus':  'rgba(80,140,255,.5)',
      '--text':          '#ccd6f6',
      '--text-dim':      '#8892b0',
      '--text-muted':    '#4a5580',
      '--grad-1':        'linear-gradient(135deg,#0f3460 0%,#533483 100%)',
      '--grad-main':     'linear-gradient(135deg,#0f3460,#533483,#00d4ff)',
      '--purple':        '#4a90e2',
      '--orb-opacity':   '0.08',
    }
  },
  forest: {
    name: 'Forest',
    icon: '🌲',
    desc: 'Calm earthy greens',
    vars: {
      '--bg-primary':    '#0a110d',
      '--bg-secondary':  '#0f1a12',
      '--bg-card':       'rgba(15,28,18,.88)',
      '--bg-card-hover': 'rgba(20,38,24,.92)',
      '--bg-sidebar':    'rgba(8,16,11,.97)',
      '--border':        'rgba(60,140,80,.12)',
      '--border-focus':  'rgba(80,180,100,.45)',
      '--text':          '#d4e8d4',
      '--text-dim':      '#8ab894',
      '--text-muted':    '#4a7050',
      '--grad-1':        'linear-gradient(135deg,#2d6a4f 0%,#40916c 100%)',
      '--grad-main':     'linear-gradient(135deg,#2d6a4f,#40916c,#74c69d)',
      '--purple':        '#52b788',
      '--orb-opacity':   '0.1',
    }
  },
  ocean: {
    name: 'Ocean',
    icon: '🌊',
    desc: 'Deep sea teal',
    vars: {
      '--bg-primary':    '#020d14',
      '--bg-secondary':  '#041520',
      '--bg-card':       'rgba(5,24,38,.88)',
      '--bg-card-hover': 'rgba(8,34,52,.92)',
      '--bg-sidebar':    'rgba(3,14,26,.97)',
      '--border':        'rgba(0,150,180,.12)',
      '--border-focus':  'rgba(0,200,220,.45)',
      '--text':          '#caf0f8',
      '--text-dim':      '#90e0ef',
      '--text-muted':    '#3a7d8a',
      '--grad-1':        'linear-gradient(135deg,#0077b6 0%,#00b4d8 100%)',
      '--grad-main':     'linear-gradient(135deg,#0077b6,#00b4d8,#90e0ef)',
      '--purple':        '#00b4d8',
      '--orb-opacity':   '0.1',
    }
  },
  sunset: {
    name: 'Sunset',
    icon: '🌅',
    desc: 'Warm oranges and reds',
    vars: {
      '--bg-primary':    '#0f0806',
      '--bg-secondary':  '#1a100a',
      '--bg-card':       'rgba(30,16,10,.88)',
      '--bg-card-hover': 'rgba(42,22,14,.92)',
      '--bg-sidebar':    'rgba(18,10,6,.97)',
      '--border':        'rgba(200,80,30,.12)',
      '--border-focus':  'rgba(240,120,50,.45)',
      '--text':          '#fde8d8',
      '--text-dim':      '#e8b89a',
      '--text-muted':    '#8a5040',
      '--grad-1':        'linear-gradient(135deg,#e85d04 0%,#f48c06 100%)',
      '--grad-main':     'linear-gradient(135deg,#e85d04,#f48c06,#fdc500)',
      '--purple':        '#f48c06',
      '--orb-opacity':   '0.1',
    }
  },
  rose: {
    name: 'Rose',
    icon: '🌸',
    desc: 'Soft pinks and purples',
    vars: {
      '--bg-primary':    '#0f080e',
      '--bg-secondary':  '#180c16',
      '--bg-card':       'rgba(28,14,26,.88)',
      '--bg-card-hover': 'rgba(40,18,36,.92)',
      '--bg-sidebar':    'rgba(16,8,15,.97)',
      '--border':        'rgba(200,80,150,.12)',
      '--border-focus':  'rgba(230,100,180,.45)',
      '--text':          '#f8d7ea',
      '--text-dim':      '#e0a0c8',
      '--text-muted':    '#7a4060',
      '--grad-1':        'linear-gradient(135deg,#c9184a 0%,#ff4d6d 100%)',
      '--grad-main':     'linear-gradient(135deg,#c9184a,#ff4d6d,#ff85a1)',
      '--purple':        '#ff4d6d',
      '--orb-opacity':   '0.1',
    }
  },
  mono: {
    name: 'Mono',
    icon: '⬛',
    desc: 'Pure black and white',
    vars: {
      '--bg-primary':    '#000000',
      '--bg-secondary':  '#0a0a0a',
      '--bg-card':       'rgba(18,18,18,.9)',
      '--bg-card-hover': 'rgba(26,26,26,.95)',
      '--bg-sidebar':    'rgba(8,8,8,.98)',
      '--border':        'rgba(255,255,255,.1)',
      '--border-focus':  'rgba(255,255,255,.4)',
      '--text':          '#f5f5f5',
      '--text-dim':      '#b0b0b0',
      '--text-muted':    '#555555',
      '--grad-1':        'linear-gradient(135deg,#444 0%,#888 100%)',
      '--grad-main':     'linear-gradient(135deg,#444,#888,#ccc)',
      '--purple':        '#aaaaaa',
      '--orb-opacity':   '0.04',
    }
  },
};

// ── Apply theme ────────────────────────────────────────────
function applyTheme(themeId, save = true) {
  const theme = THEMES[themeId];
  if (!theme) return;

  const root = document.documentElement;

  // Set data-theme for dark/light mode context
  root.setAttribute('data-theme', themeId === 'light' ? 'light' : 'dark');
  root.setAttribute('data-theme-id', themeId);

  // Apply all CSS variables
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  // Update orb opacity
  document.querySelectorAll('.orb').forEach(o => {
    o.style.opacity = theme.vars['--orb-opacity'] || '0.1';
  });

  if (save) {
    localStorage.setItem('sa_theme_id', themeId);
    // Persist to server async
    if (typeof getSettings === 'function') {
      getSettings().then(s => { s.themeId = themeId; saveSettings && saveSettings(s); }).catch(() => {});
    }
  }
}

// ── Get current theme ID ───────────────────────────────────
function getCurrentThemeId() {
  return localStorage.getItem('sa_theme_id') || 'dark';
}

// ── Init: apply saved theme on page load ──────────────────
(function initTheme() {
  const saved = getCurrentThemeId();
  applyTheme(saved, false);
})();

window.ThemeSystem = { THEMES, applyTheme, getCurrentThemeId };