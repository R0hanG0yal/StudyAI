const fs = require('fs');

const premiumHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>StudyAI — Intelligence for Learning</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet"/>
  <style>
    :root {
      --bg-dark: #05050A;
      --bg-card: rgba(255, 255, 255, 0.03);
      --bg-card-hover: rgba(255, 255, 255, 0.06);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent-1: #6366f1; /* Indigo */
      --accent-2: #8b5cf6; /* Purple */
      --accent-3: #ec4899; /* Pink */
      --accent-4: #10b981; /* Emerald */
      
      --glass-border: rgba(255, 255, 255, 0.08);
      --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      overflow-x: hidden;
      scroll-behavior: smooth;
      line-height: 1.6;
    }

    /* Background Orbs & Glows */
    .bg-orbs {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.4;
      animation: float 20s ease-in-out infinite alternate;
    }
    .orb-1 {
      top: -10%; left: -10%;
      width: 50vw; height: 50vw;
      background: radial-gradient(circle, var(--accent-1), transparent 70%);
      animation-delay: 0s;
    }
    .orb-2 {
      bottom: -20%; right: -10%;
      width: 60vw; height: 60vw;
      background: radial-gradient(circle, var(--accent-2), transparent 70%);
      animation-delay: -5s;
    }
    .orb-3 {
      top: 40%; left: 50%;
      width: 40vw; height: 40vw;
      background: radial-gradient(circle, var(--accent-3), transparent 70%);
      opacity: 0.2;
      animation-delay: -10s;
    }

    @keyframes float {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(5%, 5%) scale(1.1); }
      100% { transform: translate(-5%, -5%) scale(0.95); }
    }

    /* Grid Overlay */
    .grid-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background-image: 
        linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 50px 50px;
      pointer-events: none;
      z-index: -1;
      mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 40%, transparent 80%);
    }

    /* Header */
    header {
      position: fixed;
      top: 0; left: 0; width: 100%;
      padding: 24px 5%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 100;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      font-size: 1.5rem;
      letter-spacing: -0.03em;
    }
    .logo span.badge {
      font-size: 0.65rem;
      padding: 4px 10px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 100px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    /* Hero Section */
    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      padding: 100px 5% 40px;
      max-width: 1600px;
      margin: 0 auto;
      z-index: 10;
    }

    .hero-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
      width: 100%;
    }

    .hero-content {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .h1 {
      font-size: clamp(3rem, 5vw, 5rem);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.03em;
    }
    
    .gradient-text {
      background: linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      position: relative;
      display: inline-block;
    }

    .hero-subtitle {
      font-size: 1.25rem;
      color: var(--text-muted);
      max-width: 600px;
      line-height: 1.7;
    }

    /* Features / Pills */
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--glass-border);
      padding: 8px 16px;
      border-radius: 100px;
      font-size: 0.85rem;
      font-weight: 500;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }
    .pill:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
    
    /* Stats */
    .stats {
      display: flex;
      gap: 40px;
      padding-top: 10px;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stat-num {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    /* Buttons */
    .ctas {
      display: flex;
      gap: 16px;
      margin-top: 10px;
    }

    .btn {
      padding: 16px 32px;
      border-radius: 16px;
      font-family: inherit;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      color: white;
      box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.5);
      position: relative;
      overflow: hidden;
    }
    .btn-primary::before {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: all 0.5s ease;
    }
    .btn-primary:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 15px 35px -5px rgba(99, 102, 241, 0.6);
    }
    .btn-primary:hover::before {
      left: 100%;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      color: var(--text-main);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-3px);
    }

    /* Hero Visual Right Side */
    .hero-visual {
      position: relative;
      width: 100%;
      height: 600px;
      display: flex;
      align-items: center;
      justify-content: center;
      perspective: 1000px;
    }
    
    .glass-preview {
      width: 100%;
      max-width: 500px;
      height: 400px;
      background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      box-shadow: var(--glass-shadow);
      padding: 30px;
      transform: rotateY(-15deg) rotateX(5deg);
      transition: transform 0.5s ease;
      position: relative;
      overflow: hidden;
    }
    
    .glass-preview::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    }

    .hero-visual:hover .glass-preview {
      transform: rotateY(-5deg) rotateX(2deg);
    }

    /* Mock UI inside glass preview */
    .mock-header {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .mock-dot {
      width: 12px; height: 12px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
    }
    .mock-dot:nth-child(1) { background: #ef4444; }
    .mock-dot:nth-child(2) { background: #f59e0b; }
    .mock-dot:nth-child(3) { background: #10b981; }
    
    .mock-bar {
      height: 20px;
      background: rgba(255,255,255,0.05);
      border-radius: 10px;
      margin-bottom: 15px;
      width: 100%;
    }
    .mock-bar.short { width: 60%; }
    .mock-bar.shorter { width: 40%; }
    
    .mock-card {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 20px;
      margin-top: 30px;
      display: flex;
      gap: 15px;
      align-items: center;
    }
    .mock-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
    }
    
    /* Scroll down indicator */
    .scroll-indicator {
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.3s;
    }
    .scroll-indicator:hover { opacity: 1; }
    .mouse {
      width: 24px; height: 36px;
      border: 2px solid white;
      border-radius: 12px;
      position: relative;
    }
    .wheel {
      width: 4px; height: 8px;
      background: white;
      border-radius: 2px;
      position: absolute;
      top: 6px; left: 50%;
      transform: translateX(-50%);
      animation: scroll 1.5s infinite;
    }
    @keyframes scroll {
      0% { top: 6px; opacity: 1; }
      100% { top: 18px; opacity: 0; }
    }

    /* Auth Section */
    .auth-section {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 100px 5%;
      position: relative;
      z-index: 10;
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      background: var(--bg-card);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--glass-border);
      border-radius: 24px;
      padding: 40px;
      box-shadow: var(--glass-shadow);
      position: relative;
      overflow: hidden;
    }
    .auth-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    }

    /* Tabs */
    .tabs {
      display: flex;
      background: rgba(0,0,0,0.2);
      border-radius: 12px;
      padding: 6px;
      margin-bottom: 30px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .tab {
      flex: 1;
      padding: 12px;
      text-align: center;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      color: var(--text-muted);
    }
    .tab.active {
      background: rgba(255,255,255,0.1);
      color: var(--text-main);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 30px;
    }
    .auth-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .auth-subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    /* Form Fields */
    .form-group {
      margin-bottom: 20px;
      position: relative;
    }
    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .input-wrapper {
      position: relative;
    }
    .input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.2rem;
      color: rgba(255,255,255,0.4);
      pointer-events: none;
      transition: color 0.3s;
    }
    .form-control {
      width: 100%;
      padding: 16px 16px 16px 48px;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      color: var(--text-main);
      font-family: inherit;
      font-size: 1rem;
      transition: all 0.3s ease;
    }
    .form-control:focus {
      outline: none;
      border-color: var(--accent-1);
      background: rgba(0,0,0,0.3);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
    }
    .form-control:focus + .input-icon {
      color: var(--accent-1);
    }
    .form-control::placeholder {
      color: rgba(255,255,255,0.2);
    }

    .auth-btn {
      width: 100%;
      padding: 16px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
      color: white;
      border: none;
      font-family: inherit;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 10px;
    }
    .auth-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
      filter: brightness(1.1);
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 24px 0;
      color: var(--text-muted);
      font-size: 0.85rem;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.1);
    }
    .divider span {
      padding: 0 16px;
    }

    .guest-btn {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      background: transparent;
      color: var(--text-main);
      border: 1px solid rgba(255,255,255,0.15);
      font-family: inherit;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .guest-btn:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(255,255,255,0.3);
    }

    .error-msg {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
      padding: 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 20px;
      display: none;
      font-weight: 500;
    }
    
    .demo-creds {
      margin-top: 20px;
      padding: 16px;
      background: rgba(99, 102, 241, 0.05);
      border: 1px dashed rgba(99, 102, 241, 0.2);
      border-radius: 12px;
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .demo-creds span {
      color: var(--accent-1);
      font-weight: 600;
    }

    /* Word Rotate Animation */
    .word-rotate {
      display: inline-block;
      min-width: 180px;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .hero-container {
        grid-template-columns: 1fr;
        text-align: center;
        gap: 40px;
      }
      .hero-content {
        align-items: center;
      }
      .h1 { text-align: center; }
      .hero-subtitle { text-align: center; }
      .pills { justify-content: center; }
      .stats { justify-content: center; }
      .glass-preview { transform: none; max-width: 100%; height: 350px; }
      .hero-visual:hover .glass-preview { transform: none; }
    }
    
    /* Fade In Animation For Auth Section */
    .fade-up {
      opacity: 0;
      transform: translateY(40px);
      transition: opacity 0.8s ease, transform 0.8s ease;
    }
    .fade-up.visible {
      opacity: 1;
      transform: translateY(0);
    }

  </style>
</head>
<body>

  <!-- Background Elements -->
  <div class="grid-overlay"></div>
  <div class="bg-orbs">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>

  <!-- Header -->
  <header>
    <div class="logo">🧠 StudyAI <span class="badge">BETA</span></div>
  </header>

  <!-- Hero Section -->
  <section id="hero" class="hero">
    <div class="hero-container">
      <div class="hero-content">
        <h1 class="h1">Study <span class="gradient-text word-rotate" id="morphWord">Deeper</span><br/>with Real <span class="gradient-text">AI Intelligence</span></h1>
        
        <p class="hero-subtitle">Your all-in-one academic companion powered by Claude AI. Generate custom quizzes, beautiful flashcards, and personalized roadmaps instantly from your own notes.</p>
        
        <!-- Stats -->
        <div class="stats">
          <div class="stat-item">
            <span class="stat-num" id="cnt-features">60+</span>
            <span class="stat-label">AI Features</span>
          </div>
          <div class="stat-item">
            <span class="stat-num" id="cnt-subjects">6</span>
            <span class="stat-label">Subjects</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">100%</span>
            <span class="stat-label">Free to start</span>
          </div>
        </div>

        <!-- Pills -->
        <div class="pills">
          <div class="pill">🤖 Real Claude AI</div>
          <div class="pill">🎯 Smart Quizzes</div>
          <div class="pill">🃏 Spaced Repetition</div>
          <div class="pill">📄 PDF Support</div>
          <div class="pill">⚡ Focus Mode</div>
        </div>

        <!-- CTAs -->
        <div class="ctas">
          <button class="btn btn-primary" onclick="scrollToAuth()">🚀 Get Started Free</button>
          <button class="btn btn-secondary" onclick="quickGuest()">👁️ Live Demo</button>
        </div>
      </div>

      <!-- Right Side Visual -->
      <div class="hero-visual">
        <div class="glass-preview">
          <div class="mock-header">
            <div class="mock-dot"></div>
            <div class="mock-dot"></div>
            <div class="mock-dot"></div>
          </div>
          <div class="mock-bar"></div>
          <div class="mock-bar short"></div>
          <div class="mock-bar shorter"></div>
          <div class="mock-card">
            <div class="mock-icon"></div>
            <div style="flex:1">
              <div class="mock-bar style="margin-bottom:8px; height:12px;"></div>
              <div class="mock-bar short" style="margin-bottom:0; height:8px; opacity:0.5;"></div>
            </div>
          </div>
          <div class="mock-card" style="margin-top:15px; opacity:0.7">
            <div class="mock-icon" style="background:var(--accent-3)"></div>
            <div style="flex:1">
              <div class="mock-bar style="margin-bottom:8px; height:12px;"></div>
              <div class="mock-bar shorter" style="margin-bottom:0; height:8px; opacity:0.5;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="scroll-indicator" onclick="scrollToAuth()">
      <div class="mouse"><div class="wheel"></div></div>
      <span style="font-size:0.75rem; letter-spacing:1px; text-transform:uppercase; font-weight:600">Scroll</span>
    </div>
  </section>

  <!-- Auth Section -->
  <section id="auth" class="auth-section">
    <div class="auth-card fade-up" id="auth-box">
      
      <div class="tabs">
        <div class="tab active" id="tab-login" onclick="switchMode('login')">Sign In</div>
        <div class="tab" id="tab-signup" onclick="switchMode('signup')">Sign Up</div>
      </div>

      <!-- LOGIN FORM -->
      <div id="vLogin">
        <div class="auth-header">
          <h2 class="auth-title">Welcome back 👋</h2>
          <p class="auth-subtitle">Sign in to continue your study journey</p>
        </div>
        
        <div class="error-msg" id="loginErr"></div>

        <div class="form-group">
          <label>Email Address</label>
          <div class="input-wrapper">
            <span class="input-icon">✉️</span>
            <input type="email" id="loginEmail" class="form-control" placeholder="demo@studyai.com" autocomplete="email">
          </div>
        </div>

        <div class="form-group">
          <label>Password</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input type="password" id="loginPass" class="form-control" placeholder="••••••••" autocomplete="current-password">
          </div>
        </div>

        <button class="auth-btn" id="loginBtn" onclick="doLogin()">Sign In →</button>
        
        <div class="divider"><span>OR</span></div>
        
        <button class="guest-btn" onclick="doGuest()">🚀 Continue as Guest (Demo)</button>
        
        <div class="demo-creds">
          Demo Credentials:<br>
          Email: <span>demo@studyai.com</span> &nbsp;|&nbsp; Password: <span>demo1234</span>
        </div>
      </div>

      <!-- SIGNUP FORM -->
      <div id="vSignup" style="display: none;">
        <div class="auth-header">
          <h2 class="auth-title">Create Account ✨</h2>
          <p class="auth-subtitle">Join thousands studying smarter with AI</p>
        </div>
        
        <div class="error-msg" id="signupErr"></div>

        <div class="form-group">
          <label>Full Name</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input type="text" id="suName" class="form-control" placeholder="Alex Johnson" autocomplete="name">
          </div>
        </div>

        <div class="form-group">
          <label>Email Address</label>
          <div class="input-wrapper">
            <span class="input-icon">✉️</span>
            <input type="email" id="suEmail" class="form-control" placeholder="you@university.edu" autocomplete="email">
          </div>
        </div>
        
        <div class="form-group">
          <label>Course / Stream</label>
          <div class="input-wrapper">
            <span class="input-icon">🎓</span>
            <input type="text" id="suCourse" class="form-control" placeholder="e.g. Computer Science">
          </div>
        </div>

        <div class="form-group">
          <label>Password</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input type="password" id="suPass" class="form-control" placeholder="Min 8 characters" autocomplete="new-password">
          </div>
        </div>

        <button class="auth-btn" id="signupBtn" onclick="doSignup()">Create Account →</button>
      </div>

    </div>
  </section>

  <!-- Auth Script dependencies -->
  <script src="assets/js/auth.js"></script>
  
  <script>
    // ── Smooth Scroll ──
    function scrollToAuth() {
      document.getElementById('auth').scrollIntoView({ behavior: 'smooth' });
    }

    // ── Word Morph Animation ──
    const words = ['Deeper', 'Faster', 'Better', 'Smarter', 'Together'];
    let wordIdx = 0;
    const wordEl = document.getElementById('morphWord');
    if (wordEl) {
      setInterval(() => {
        wordEl.style.opacity = '0';
        setTimeout(() => {
          wordIdx = (wordIdx + 1) % words.length;
          wordEl.textContent = words[wordIdx];
          wordEl.style.opacity = '1';
        }, 500); // Wait half a second while invis
      }, 3000);
    }
    wordEl.style.transition = "opacity 0.5s ease";

    // ── Tab Switching ──
    function switchMode(mode) {
      const isLogin = mode === 'login';
      document.getElementById('vLogin').style.display = isLogin ? 'block' : 'none';
      document.getElementById('vSignup').style.display = isLogin ? 'none' : 'block';
      
      document.getElementById('tab-login').classList.toggle('active', isLogin);
      document.getElementById('tab-signup').classList.toggle('active', !isLogin);

      // Clear errors
      document.getElementById('loginErr').style.display = 'none';
      document.getElementById('signupErr').style.display = 'none';
    }

    // ── Scroll Reveal for Auth Panel ──
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    
    observer.observe(document.getElementById('auth-box'));

    // ── Authentication Wrappers ──
    // Because auth.js expects doLogin, doSignup, doGuest, quickGuest globally
    // We recreate the bridge functionality matching the elements

    function _showErr(el, msg) {
      if(el) {
        el.textContent = msg;
        el.style.display = 'block';
      }
    }
    function _hideErr(el) {
      if(el) el.style.display = 'none';
    }
    function _btnLoad(btn, txt, disable=true) {
      if(!btn) return;
      if(disable) {
        btn.dataset.og = btn.textContent;
        btn.textContent = txt;
        btn.disabled = true;
        btn.style.opacity = '0.7';
      } else {
        btn.textContent = btn.dataset.og || txt;
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }

    function doLogin() {
      const email = document.getElementById('loginEmail').value.trim();
      const pass  = document.getElementById('loginPass').value;
      const errEl = document.getElementById('loginErr');
      const btn   = document.getElementById('loginBtn');
      _hideErr(errEl);

      if (!email || !pass) return _showErr(errEl, 'Please fill in both fields.');
      _btnLoad(btn, 'Signing in...');

      // Note: apiPost comes from assets/js/auth.js
      if(typeof apiPost === 'function') {
        apiPost('/login', { email, password: pass })
          .then(data => { 
            if(typeof setToken === 'function') setToken(data.token); 
            if(typeof setUser === 'function') setUser(data.user); 
            window.location.href = '/dashboard.html'; 
          })
          .catch(e => { 
            _showErr(errEl, e.message || 'Login failed. Check credentials.'); 
            _btnLoad(btn, 'Sign In →', false); 
          });
      } else {
        // Fallback for visual testing if api fails
        setTimeout(() => { _btnLoad(btn, 'Sign In →', false); _showErr(errEl, 'API /auth.js not loaded.'); }, 1000);
      }
    }

    function doSignup() {
      const name   = document.getElementById('suName').value.trim();
      const email  = document.getElementById('suEmail').value.trim();
      const course = document.getElementById('suCourse').value.trim() || 'General';
      const pass   = document.getElementById('suPass').value;
      const errEl  = document.getElementById('signupErr');
      const btn    = document.getElementById('signupBtn');
      _hideErr(errEl);

      if (!name || !email || !pass) return _showErr(errEl, 'Please fill all required fields.');
      if (pass.length < 8) return _showErr(errEl, 'Password must be at least 8 chars.');
      _btnLoad(btn, 'Creating Account...');

      if(typeof apiPost === 'function') {
         apiPost('/signup', { name, email, password: pass, course })
          .then(data => { 
            if(typeof setToken === 'function') setToken(data.token); 
            if(typeof setUser === 'function') setUser(data.user); 
            window.location.href = '/dashboard.html'; 
          })
          .catch(e => { 
            _showErr(errEl, e.message || 'Signup failed.'); 
            _btnLoad(btn, 'Create Account →', false); 
          });
      } else {
        setTimeout(() => { _btnLoad(btn, 'Create Account →', false); _showErr(errEl, 'API /auth.js not loaded.'); }, 1000);
      }
    }

    function doGuest() {
      const errEl = document.getElementById('loginErr');
      _hideErr(errEl);
      if(typeof showToast === 'function') showToast('Logging in as guest...', 'info');
      
      if(typeof apiPost === 'function') {
        apiPost('/login', { email: 'demo@studyai.com', password: 'demo1234' })
          .then(data => { 
            if(typeof setToken === 'function') setToken(data.token); 
            if(typeof setUser === 'function') setUser(data.user); 
            window.location.href = '/dashboard.html'; 
          })
          .catch(e => { 
             _showErr(errEl, 'Failed to connect to guest account.');
          });
      }
    }

    function quickGuest() {
      scrollToAuth();
      setTimeout(doGuest, 800);
    }

    // Auto-redirect if logged in
    if (typeof getToken === 'function' && getToken() && typeof getUser === 'function' && getUser()) {
      window.location.href = '/dashboard.html';
    }
  </script>
</body>
</html>
`;

fs.writeFileSync('public/index.html', premiumHTML);
console.log('Successfully upgraded to Premium SaaS Dark UI with Section Separation and Glassmorphism!');
