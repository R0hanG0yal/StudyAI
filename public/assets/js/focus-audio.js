/* ============================================================
   STUDYAI — focus-audio.js  (Part 8)
   Focus session sounds (Web Audio API — no files needed)
   + Desktop notification permission + alerts
   ============================================================ */

const FocusAudio = (function() {

  let _ctx = null;
  let _enabled = localStorage.getItem('sa_sound_enabled') !== 'false'; // default on

  function _getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // ── Synthesize sounds with Web Audio API ──────────────

  // Session start: bright ascending chime
  function playStart() {
    if (!_enabled) return;
    try {
      const ctx = _getCtx();
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t); osc.stop(t + 0.4);
      });
    } catch {}
  }

  // Session end: melodic completion sound
  function playComplete() {
    if (!_enabled) return;
    try {
      const ctx = _getCtx();
      const melody = [784, 880, 1047, 1319, 1047, 880, 1047];
      melody.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, i < melody.length-1 ? t + 0.2 : t + 0.8);
        osc.start(t); osc.stop(t + 0.8);
      });
    } catch {}
  }

  // Break start: softer lower tone
  function playBreak() {
    if (!_enabled) return;
    try {
      const ctx = _getCtx();
      [523, 440, 392].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.2;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.start(t); osc.stop(t + 0.5);
      });
    } catch {}
  }

  // Tick: subtle click for ambient mode
  function playTick() {
    if (!_enabled) return;
    try {
      const ctx = _getCtx();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.005));
      const src  = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = buf;
      src.connect(gain); gain.connect(ctx.destination);
      gain.gain.value = 0.08;
      src.start();
    } catch {}
  }

  // Warning beep: last 60 seconds
  function playWarning() {
    if (!_enabled) return;
    try {
      const ctx = _getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }

  // ── Desktop Notifications ──────────────────────────────
  let _notifPermission = 'default';

  async function requestNotifPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') { _notifPermission = 'granted'; return true; }
    if (Notification.permission === 'denied')  { _notifPermission = 'denied';  return false; }
    const result = await Notification.requestPermission();
    _notifPermission = result;
    return result === 'granted';
  }

  function sendNotification(title, body, icon = '/assets/icons/icon-192.png') {
    if (_notifPermission !== 'granted') return;
    if (document.visibilityState === 'visible') return; // Don't notify when tab is focused
    try {
      const n = new Notification(title, { body, icon, badge: icon, tag: 'studyai-timer' });
      n.onclick = () => { window.focus(); n.close(); };
      setTimeout(() => n.close(), 8000);
    } catch {}
  }

  // ── Toggle sounds ──────────────────────────────────────
  function toggle() {
    _enabled = !_enabled;
    localStorage.setItem('sa_sound_enabled', _enabled);
    return _enabled;
  }

  function isEnabled() { return _enabled; }

  // ── Ambient white noise (optional study mode) ──────────
  let _noiseNode = null;
  let _noiseGain = null;
  let _noiseActive = false;

  function startNoise(type = 'white') {
    if (!_enabled) return;
    try {
      const ctx  = _getCtx();
      stopNoise();
      const bufSize = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);

      if (type === 'white') {
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      } else if (type === 'brown') {
        let last = 0;
        for (let i = 0; i < bufSize; i++) {
          const w = Math.random() * 2 - 1;
          data[i] = (last + 0.02 * w) / 1.02;
          last = data[i]; data[i] *= 3.5;
        }
      } else if (type === 'pink') {
        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for (let i = 0; i < bufSize; i++) {
          const w = Math.random() * 2 - 1;
          b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
          b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
          b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
          data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      }

      _noiseNode = ctx.createBufferSource();
      _noiseGain = ctx.createGain();
      _noiseNode.buffer = buf;
      _noiseNode.loop   = true;
      _noiseNode.connect(_noiseGain);
      _noiseGain.connect(ctx.destination);
      _noiseGain.gain.value = 0.04;
      _noiseNode.start();
      _noiseActive = true;
    } catch {}
  }

  function stopNoise() {
    try { if (_noiseNode) { _noiseNode.stop(); _noiseNode = null; } } catch {}
    _noiseActive = false;
  }

  function isNoiseActive() { return _noiseActive; }

  return {
    playStart, playComplete, playBreak, playTick, playWarning,
    requestNotifPermission, sendNotification,
    toggle, isEnabled,
    startNoise, stopNoise, isNoiseActive,
  };

})();

// ── Inject sound toggle button into focus page ────────────
document.addEventListener('DOMContentLoaded', () => {
  const timerCard = document.querySelector('.timer-card');
  if (!timerCard) return;

  const soundRow = document.createElement('div');
  soundRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap';
  soundRow.innerHTML = `
    <button id="btn-sound-toggle"
      style="padding:5px 13px;border-radius:100px;font-size:.74rem;font-weight:600;cursor:pointer;transition:all .18s;
      background:rgba(67,233,123,.1);border:1px solid rgba(67,233,123,.2);color:#43e97b">
      🔊 Sound On
    </button>
    <button id="btn-notif-toggle"
      style="padding:5px 13px;border-radius:100px;font-size:.74rem;font-weight:600;cursor:pointer;transition:all .18s;
      background:rgba(102,126,234,.1);border:1px solid rgba(102,126,234,.2);color:var(--purple)">
      🔔 Notify Off
    </button>
    <select id="noise-select"
      style="padding:5px 10px;border-radius:100px;font-size:.74rem;font-weight:600;border:1px solid var(--border);
      background:rgba(255,255,255,.06);color:var(--text-dim);cursor:pointer;outline:none">
      <option value="">🌿 No Noise</option>
      <option value="white">⬜ White</option>
      <option value="pink">🩷 Pink</option>
      <option value="brown">🟫 Brown</option>
    </select>`;
  timerCard.appendChild(soundRow);

  // Sound toggle
  document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
    const on = FocusAudio.toggle();
    const btn = document.getElementById('btn-sound-toggle');
    btn.textContent = on ? '🔊 Sound On' : '🔇 Sound Off';
    btn.style.background = on ? 'rgba(67,233,123,.1)' : 'rgba(100,110,160,.08)';
    btn.style.color = on ? '#43e97b' : 'var(--text-muted)';
  });
  if (!FocusAudio.isEnabled()) {
    const btn = document.getElementById('btn-sound-toggle');
    if (btn) { btn.textContent = '🔇 Sound Off'; btn.style.background='rgba(100,110,160,.08)'; btn.style.color='var(--text-muted)'; }
  }

  // Notification toggle
  let notifEnabled = false;
  document.getElementById('btn-notif-toggle')?.addEventListener('click', async () => {
    notifEnabled = !notifEnabled;
    const btn = document.getElementById('btn-notif-toggle');
    if (notifEnabled) {
      const granted = await FocusAudio.requestNotifPermission();
      if (!granted) { notifEnabled = false; if(typeof showToast==='function') showToast('Notification permission denied', 'warning'); return; }
      btn.textContent = '🔔 Notify On';
      btn.style.background = 'rgba(102,126,234,.15)';
      btn.style.color = 'var(--purple)';
    } else {
      btn.textContent = '🔔 Notify Off';
      btn.style.background = 'rgba(102,126,234,.08)';
      btn.style.color = 'var(--purple)';
    }
  });

  // Ambient noise
  document.getElementById('noise-select')?.addEventListener('change', e => {
    const val = e.target.value;
    if (val) FocusAudio.startNoise(val);
    else FocusAudio.stopNoise();
  });
});