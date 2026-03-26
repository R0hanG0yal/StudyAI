/* ============================================================
   STUDYAI — AUTH + SESSION GUARD  (FIXED)
   File: public/assets/js/auth.js

   KEY FIX: Route paths match server.js exactly:
     Server:   POST /api/login   POST /api/signup   POST /api/logout
     auth.js:  apiPost('/login') apiPost('/signup') apiPost('/logout')
   ============================================================ */
'use strict';

const API_BASE = '/api';

/* ── Token / User ── */
function getToken() { return localStorage.getItem('sa_token') || null; }
function setToken(t){ if(t) localStorage.setItem('sa_token',t); else localStorage.removeItem('sa_token'); }
function clearToken(){ localStorage.removeItem('sa_token'); localStorage.removeItem('sa_user'); }
function getUser()  { try{ return JSON.parse(localStorage.getItem('sa_user')||'null'); }catch{ return null; } }
function setUser(u) { localStorage.setItem('sa_user', JSON.stringify(u)); }

/* ── HTTP helpers ── */
async function apiPost(path, body={}) {
  const r = await fetch(API_BASE + path, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+(getToken()||'') },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || r.statusText || 'Request failed');
  return data;
}

async function apiGet(path) {
  const r = await fetch(API_BASE + path, {
    headers:{ 'Authorization':'Bearer '+(getToken()||'') },
  });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || r.statusText || 'Request failed');
  return data;
}

async function apiDel(path) {
  const r = await fetch(API_BASE + path, {
    method:'DELETE',
    headers:{ 'Authorization':'Bearer '+(getToken()||'') },
  });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || r.statusText || 'Request failed');
  return data;
}

/* ════════════════════════════════════════════════════════════
   SESSION GUARD — call on every protected page
   ════════════════════════════════════════════════════════════ */
async function requireAuth() {
  const token = getToken();
  const user  = getUser();
  if (!token || !user) { window.location.href = '/index.html'; return null; }
  return user;
}

/**
 * Global Page Initializer
 * Call this on every protected page: initPage('Page Name').then(user => ...)
 */
async function initPage(title) {
  console.log(`🚀 Initializing page: ${title}`);
  const user = await requireAuth();
  if (!user) return null;

  // Build sidebar + topbar
  if (typeof buildSidebar === 'function') {
    buildSidebar(user, title);
  }

  // Initialize storage layer if present
  if (typeof loadAllData === 'function') {
    await loadAllData();
  }

  // Hide loader if any
  if (typeof hidePageLoader === 'function') hidePageLoader();
  
  return user;
}

/* ════════════════════════════════════════════════════════════
   AUTH ACTIONS
   ════════════════════════════════════════════════════════════ */
function showForm(name) {
  document.getElementById('form-login') ?.classList.toggle('hidden', name!=='login');
  document.getElementById('form-signup')?.classList.toggle('hidden', name!=='signup');
  ['login-err','signup-err'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.textContent=''; el.classList.remove('show'); }
  });
}

async function doLogin() {
  const email = document.getElementById('login-email')?.value.trim();
  const pass  = document.getElementById('login-pass')?.value;
  const errEl = document.getElementById('login-err');
  const btn   = document.getElementById('login-btn');

  if (!email || !pass) return _err(errEl,'Please fill in both fields.');
  if (!_validEmail(email)) return _err(errEl,'Please enter a valid email address.');

  _loading(btn,'Signing in…',true);
  try {
    const data = await apiPost('/login', { email, password:pass });
    setToken(data.token);
    setUser(data.user);
    window.location.href = '/dashboard.html';
  } catch(e) {
    _err(errEl, e.message || 'Login failed. Please check your credentials.');
    _loading(btn,'Sign In',false);
  }
}

async function doSignup() {
  const name   = document.getElementById('su-name')?.value.trim();
  const email  = document.getElementById('su-email')?.value.trim();
  const pass   = document.getElementById('su-pass')?.value;
  const course = document.getElementById('su-course')?.value.trim() || 'General';
  const errEl  = document.getElementById('signup-err');
  const btn    = document.getElementById('signup-btn');

  if (!name)               return _err(errEl,'Please enter your full name.');
  if (!email)              return _err(errEl,'Please enter your email address.');
  if (!_validEmail(email)) return _err(errEl,'Please enter a valid email address.');
  if (!pass)               return _err(errEl,'Please enter a password.');
  if (pass.length < 8)     return _err(errEl,'Password must be at least 8 characters.');

  _loading(btn,'Creating account…',true);
  try {
    const data = await apiPost('/signup', { name, email, password:pass, course });
    setToken(data.token);
    setUser(data.user);
    window.location.href = '/dashboard.html';
  } catch(e) {
    _err(errEl, e.message || 'Signup failed. Please try again.');
    _loading(btn,'Create Account',false);
  }
}

async function doGuest() {
  const btn = document.getElementById('guest-btn') || document.querySelector('.auth-btn-guest');
  if(btn){ btn.textContent='Loading…'; btn.disabled=true; }
  try {
    const data = await apiPost('/login', { email:'demo@studyai.com', password:'demo1234' });
    setToken(data.token);
    setUser(data.user);
    window.location.href = '/dashboard.html';
  } catch(e) {
    showToast('Could not connect. Make sure the server is running: node server.js','error',6000);
    if(btn){ btn.textContent='Continue as Guest'; btn.disabled=false; }
  }
}

async function doLogout() {
  try { await apiPost('/logout', {}); } catch(_) {}
  clearToken();
  window.location.href = '/index.html';
}

/* ════════════════════════════════════════════════════════════
   TOAST  (shared by all pages)
   ════════════════════════════════════════════════════════════ */
function showToast(msg, type='info', duration=3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success:'✓', error:'✕', info:'ℹ', warning:'⚠' };
  const el    = document.createElement('div');
  el.className = 'toast toast-'+type;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ'}</span><span class="toast-msg">${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
  container.appendChild(el);
  setTimeout(()=>{ el.style.animation='toastOut .28s ease forwards'; setTimeout(()=>el.remove(),280); }, duration);
}

/* ════════════════════════════════════════════════════════════
   SIDEBAR HELPERS
   ════════════════════════════════════════════════════════════ */
function updateSidebarUser() {
  const u = getUser();
  if (!u) return;
  const init = (u.name||'U').split(' ').map(p=>p[0]).join('').substring(0,2).toUpperCase();
  const avEl   = document.getElementById('sb-avatar');
  const nameEl = document.getElementById('sb-name');
  const roleEl = document.getElementById('sb-role');
  if(avEl)   avEl.textContent   = init;
  if(nameEl) nameEl.textContent = u.name   || 'Student';
  if(roleEl) roleEl.textContent = u.course || 'Student';
}

function updateTopbarStreak(n=0) {
  const el = document.getElementById('tb-streak-num');
  if(el) el.textContent = n;
}

/* ── Private ── */
function _err(el, msg) {
  if(!el){ showToast(msg,'error'); return; }
  el.textContent = msg;
  el.style.display = 'block';
  el.classList.add('show');
}
function _loading(btn, text, on) {
  if(!btn) return;
  if(on){ btn._orig=btn.textContent; btn.textContent=text; btn.disabled=true; }
  else  { btn.textContent=btn._orig||text; btn.disabled=false; }
}
function _validEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

/* ── Auto-redirect if already logged in on index page ── */
(function(){
  const path = window.location.pathname;
  if(path==='/'||path.endsWith('index.html')){
    if(getToken()&&getUser()) window.location.href='/dashboard.html';
  }
})();