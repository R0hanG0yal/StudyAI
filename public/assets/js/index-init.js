/* ============================================================
   STUDYAI — INDEX-INIT.js (v4)
   Handles landing page specific UI (tabs, scroll, preview).
   Auth logic is provided by auth.js.
   ============================================================ */

/**
 * Switch between Login and Signup tabs
 */
function switchTab(name) {
    console.log('🔄 Switching tab to:', name);
    const isLogin = name === 'login';
    const vLogin = document.getElementById('vLogin');
    const vSignup = document.getElementById('vSignup');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    
    if (vLogin) vLogin.style.display = isLogin ? 'block' : 'none';
    if (vSignup) vSignup.style.display = isLogin ? 'none' : 'block';
    
    // UI states
    if (tabLogin) tabLogin.classList.toggle('active', isLogin);
    if (tabSignup) tabSignup.classList.toggle('active', !isLogin);

    // Clear previous errors
    [ 'login-err', 'signup-err' ].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
}

// ── Event Binders ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Landing page UI initialized.');

    // 1. Tab buttons
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 2. Switch links
    document.getElementById('switch-to-signup')?.addEventListener('click', () => switchTab('signup'));
    document.getElementById('switch-to-login')?.addEventListener('click', () => switchTab('login'));

    // 3. Auth Actions (from auth.js)
    document.getElementById('login-btn')?.addEventListener('click', () => {
        if (typeof doLogin === 'function') doLogin();
    });
    document.getElementById('signup-btn')?.addEventListener('click', () => {
        if (typeof doSignup === 'function') doSignup();
    });
    document.getElementById('guest-btn')?.addEventListener('click', () => {
        if (typeof doGuest === 'function') doGuest();
    });
    
    // Hero demo button
    document.getElementById('btn-live-demo')?.addEventListener('click', () => {
        if (typeof doGuest === 'function') doGuest();
    });

    // 4. Scroll to Auth Section
    const scrollTarget = document.getElementById('authSection');
    const scrollToAuth = () => scrollTarget?.scrollIntoView({ behavior: 'smooth' });
    
    document.getElementById('btn-get-started')?.addEventListener('click', scrollToAuth);
    // Bind all "Get Started" style buttons
    document.querySelectorAll('a[href="#authSection"].btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            scrollToAuth();
        });
    });

    // 5. Enter key handling
    document.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const vLogin = document.getElementById('vLogin');
            if (vLogin && vLogin.style.display !== 'none') {
                if (typeof doLogin === 'function') doLogin();
            } else if (document.getElementById('vSignup')?.style.display !== 'none') {
                if (typeof doSignup === 'function') doSignup();
            }
        }
    });

    // 6. Navbar scroll effect
    const nav = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) nav?.classList.add('scrolled');
        else nav?.classList.remove('scrolled');
    });

    // 7. Auto-redirect if logged in
    if (typeof getToken === 'function' && typeof getUser === 'function') {
        if (getToken() && getUser()) {
            window.location.href = '/dashboard.html';
        }
    }
});