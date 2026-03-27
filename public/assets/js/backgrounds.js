/* ============================================================
   STUDYAI — backgrounds.js  (Task 9)
   Background customisation: particles, mesh, patterns, solid.
   Canvas-based, GPU-accelerated, respects prefers-reduced-motion.
   ============================================================ */

const Backgrounds = (function() {
  const KEY = 'sa_bg_style';

  const OPTIONS = {
    orbs      : { name:'Orbs (Default)',  icon:'🔮', desc:'Floating gradient orbs' },
    particles : { name:'Particles',       icon:'✨', desc:'Animated floating dots' },
    mesh      : { name:'Mesh Gradient',   icon:'🌈', desc:'Animated colour mesh' },
    grid      : { name:'Subtle Grid',     icon:'⊞',  desc:'Minimal dotted grid' },
    waves     : { name:'Waves',           icon:'〰️', desc:'Flowing animated waves' },
    solid     : { name:'Solid',           icon:'⬛', desc:'Clean flat background' },
  };

  let _canvas = null;
  let _animFrame = null;
  let _particles = [];
  const _prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function load() {
    return localStorage.getItem(KEY) || 'orbs';
  }

  function save(style) {
    localStorage.setItem(KEY, style);
    if (typeof getSettings === 'function') {
      getSettings().then(s => { s.bgStyle = style; saveSettings && saveSettings(s); }).catch(() => {});
    }
  }

  function apply(style = null) {
    const s = style || load();
    _stopAnimation();

    // Remove existing custom background
    document.getElementById('custom-bg-canvas')?.remove();
    document.getElementById('custom-bg-style')?.remove();

    const orbContainer = document.querySelector('.bg-orbs');
    if (orbContainer) orbContainer.style.display = s === 'orbs' ? '' : 'none';

    if (_prefersReduced && s !== 'orbs' && s !== 'solid' && s !== 'grid') {
      _applyGrid(); return; // Fallback for reduced motion
    }

    switch (s) {
      case 'orbs':      /* default — already shown above */ break;
      case 'particles': _applyParticles(); break;
      case 'mesh':      _applyMesh();      break;
      case 'grid':      _applyGrid();      break;
      case 'waves':     _applyWaves();     break;
      case 'solid':     /* just hide orbs */ break;
    }
  }

  function _stopAnimation() {
    if (_animFrame) { cancelAnimationFrame(_animFrame); _animFrame = null; }
    if (_canvas)    { _canvas.remove(); _canvas = null; }
    _particles = [];
  }

  function _makeCanvas() {
    const c = document.createElement('canvas');
    c.id = 'custom-bg-canvas';
    c.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;width:100%;height:100%';
    document.body.prepend(c);
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
    window.addEventListener('resize', () => { if (c.parentNode) { c.width=window.innerWidth; c.height=window.innerHeight; } });
    return c;
  }

  // ── Particles ─────────────────────────────────────────
  function _applyParticles() {
    _canvas = _makeCanvas();
    const ctx = _canvas.getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const count = Math.min(60, Math.floor(window.innerWidth * window.innerHeight / 18000));

    _particles = Array.from({ length: count }, () => ({
      x   : Math.random() * _canvas.width,
      y   : Math.random() * _canvas.height,
      r   : Math.random() * 2 + 0.5,
      vx  : (Math.random() - 0.5) * 0.4,
      vy  : (Math.random() - 0.5) * 0.4,
      life: Math.random(),
    }));

    const colors = isDark
      ? ['rgba(102,126,234,0.5)','rgba(240,147,251,0.4)','rgba(79,172,254,0.4)']
      : ['rgba(102,126,234,0.3)','rgba(240,147,251,0.25)','rgba(79,172,254,0.25)'];

    function draw() {
      ctx.clearRect(0, 0, _canvas.width, _canvas.height);
      _particles.forEach((p, i) => {
        p.x  += p.vx; p.y += p.vy;
        p.life += 0.003;
        if (p.x < 0) p.x = _canvas.width;
        if (p.x > _canvas.width) p.x = 0;
        if (p.y < 0) p.y = _canvas.height;
        if (p.y > _canvas.height) p.y = 0;

        // Draw particle
        const alpha = 0.3 + Math.sin(p.life) * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = colors[i % colors.length].replace('0.5', alpha.toString());
        ctx.fill();

        // Draw connections
        _particles.forEach((p2, j) => {
          if (j <= i) return;
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(102,126,234,${(1-dist/120) * (isDark ? 0.08 : 0.05)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  }

  // ── Mesh gradient ──────────────────────────────────────
  function _applyMesh() {
    _canvas = _makeCanvas();
    const ctx = _canvas.getContext('2d');
    let t = 0;

    function draw() {
      t += 0.003;
      const W = _canvas.width, H = _canvas.height;
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const alpha  = isDark ? 0.08 : 0.05;

      ctx.clearRect(0, 0, W, H);

      // Animated gradient blobs
      const blobs = [
        { x: W*(0.5+Math.sin(t)*0.3),      y: H*(0.3+Math.cos(t*0.7)*0.2),   r: W*0.4, c:[102,126,234] },
        { x: W*(0.3+Math.cos(t*1.3)*0.25), y: H*(0.6+Math.sin(t*1.1)*0.2),   r: W*0.35,c:[240,147,251] },
        { x: W*(0.7+Math.sin(t*0.9)*0.2),  y: H*(0.7+Math.cos(t*0.8)*0.25),  r: W*0.3, c:[79,172,254] },
      ];

      blobs.forEach(b => {
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, `rgba(${b.c.join(',')},${alpha})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  }

  // ── Grid ──────────────────────────────────────────────
  function _applyGrid() {
    const s = document.createElement('style');
    s.id = 'custom-bg-style';
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const dotColor = isDark ? 'rgba(140,150,220,0.12)' : 'rgba(100,110,160,0.1)';
    s.textContent = `
      body::before {
        content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
        background-image:radial-gradient(${dotColor} 1px,transparent 1px);
        background-size:28px 28px;
      }`;
    document.head.appendChild(s);
  }

  // ── Waves ─────────────────────────────────────────────
  function _applyWaves() {
    _canvas = _makeCanvas();
    const ctx = _canvas.getContext('2d');
    let t = 0;

    function draw() {
      t += 0.008;
      const W = _canvas.width, H = _canvas.height;
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.clearRect(0, 0, W, H);

      [0, 1, 2].forEach(i => {
        const offset = i * (Math.PI * 2 / 3);
        const amp    = H * 0.04;
        const yBase  = H * (0.3 + i * 0.2);
        const alpha  = isDark ? 0.06 - i * 0.015 : 0.04 - i * 0.01;
        ctx.beginPath();
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= W; x += 4) {
          const y = yBase + Math.sin(x * 0.005 + t + offset) * amp + Math.sin(x * 0.003 + t * 0.7 + offset) * amp * 0.5;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
        const colors = [[102,126,234],[240,147,251],[79,172,254]];
        const [r,g,b] = colors[i];
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      });

      _animFrame = requestAnimationFrame(draw);
    }
    draw();
  }

  // ── Init ──────────────────────────────────────────────
  function init() { apply(); }

  function showModal() {
    const current = load();
    const existing = document.getElementById('bg-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'bg-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <span class="modal-title">🌌 Background Style</span>
          <button class="modal-close" id="bgm-close">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
          ${Object.entries(OPTIONS).map(([id, opt]) => `
            <div class="bg-opt ${current===id?'active':''}" data-bg="${id}" style="
              padding:14px 10px;border-radius:12px;text-align:center;cursor:pointer;transition:all .15s;
              border:2px solid ${current===id?'rgba(102,126,234,.5)':'var(--border)'};
              background:${current===id?'rgba(102,126,234,.1)':'rgba(255,255,255,.03)'};
            ">
              <div style="font-size:1.5rem;margin-bottom:6px">${opt.icon}</div>
              <div style="font-size:.76rem;font-weight:700;color:${current===id?'var(--purple)':'var(--text-dim)'}">${opt.name}</div>
              <div style="font-size:.66rem;color:var(--text-muted);margin-top:2px">${opt.desc}</div>
            </div>`).join('')}
        </div>
        <div id="bg-preview-label" class="text-sm text-muted text-center mb-4">Click a style to preview instantly</div>
        <button class="btn btn-primary btn-full" id="bgm-save" style="justify-content:center">Apply Background</button>
      </div>`;
    document.body.appendChild(modal);

    let preview = current;
    modal.querySelectorAll('.bg-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        modal.querySelectorAll('.bg-opt').forEach(o => {
          o.style.borderColor='var(--border)'; o.style.background='rgba(255,255,255,.03)';
          o.querySelector('div:nth-child(2)').style.color='var(--text-dim)';
        });
        opt.style.borderColor='rgba(102,126,234,.5)'; opt.style.background='rgba(102,126,234,.1)';
        opt.querySelector('div:nth-child(2)').style.color='var(--purple)';
        preview = opt.dataset.bg;
        apply(preview); // Live preview
        document.getElementById('bg-preview-label').textContent = `Previewing: ${OPTIONS[preview]?.name}`;
      });
    });

    document.getElementById('bgm-close')?.addEventListener('click', () => { apply(load()); modal.remove(); });
    modal.addEventListener('click', e => { if (e.target === modal) { apply(load()); modal.remove(); } });
    document.getElementById('bgm-save')?.addEventListener('click', () => {
      save(preview);
      modal.remove();
      showToast && showToast('Background saved!', 'success', 2000);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { OPTIONS, load, save, apply, showModal, init };
})();

window.Backgrounds = Backgrounds;