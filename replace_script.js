const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Remove .rising-sun div
content = content.replace('<div class="rising-sun"></div>', '');

// 2. Remove .rising-sun CSS block
content = content.replace(/\/\* Abstract Sunrise Glow Element \*\/[\s\S]*?@keyframes rise \{[\s\S]*?\}/, '');

// 3. Find and replace script accurately
const startAnchor = `// ═══════════════════════════════════════════\n    // 🏔️ MESH MOUNTAINS (Abstract Wave Dots)\n    // ═══════════════════════════════════════════\n    (function initMeshCanvas() {`;

const newScript = `    // ═══════════════════════════════════════════
    // 🏔️ MESH MOUNTAINS (Layered Silhouette Dots)
    // ═══════════════════════════════════════════
    (function initLayeredMountains() {
      const canvas = document.getElementById('particles');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let w, h, time = 0;
      
      function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
      }
      window.addEventListener('resize', resize);
      resize();

      let mouseX = 0, mouseY = 0;
      window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / w) - 0.5;
        mouseY = ((e.clientY - rect.top) / h) - 0.5;
      });

      function loop() {
        ctx.clearRect(0, 0, w, h);
        time += 0.003;

        const horizon = h * 0.55;

        // ── 1. BACKGROUND MOUNTAINS ──
        ctx.fillStyle = 'rgba(79, 70, 229, 0.1)'; 
        for (let c = 0; c <= 80; c++) {
           const x = (w / 80) * c;
           const px = x + (mouseX * 15);
           const staticCurve = Math.sin(c * 0.05) * 110 + Math.sin(c * 0.12) * 20; 
           const py = horizon - staticCurve + Math.sin(time + c * 0.1)*5 + (mouseY * 8);
           for(let d=0; d<15; d++) { 
              ctx.beginPath(); ctx.arc(px, py + d*6, 1.2, 0, Math.PI*2); ctx.fill();
           }
        }

        // ── 2. GLOWING SUN (Partially Hidden) ──
        ctx.save();
        const sunX = w * 0.6;
        const sunY = (h * 0.55) - (time * 8); 
        let gradient = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 120);
        gradient.addColorStop(0, '#fffdf1');
        gradient.addColorStop(0.2, '#ffcc80');
        gradient.addColorStop(0.6, 'rgba(255, 138, 101, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 138, 101, 0)');
        ctx.shadowColor = 'rgba(255, 183, 77, 0.4)'; ctx.shadowBlur = 40;
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(sunX, sunY, 120, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // ── 3. MIDDLE MOUNTAINS ──
        ctx.fillStyle = 'rgba(219, 39, 119, 0.16)'; 
        for (let c = 0; c <= 80; c++) {
           const x = (w / 80) * c;
           const px = x + (mouseX * 25);
           const staticCurve = Math.cos(c * 0.07 + 10) * 80 + Math.sin(c * 0.16) * 15; 
           const py = horizon - staticCurve + Math.sin(time + c * 0.1)*4 + (mouseY * 12) + 20;
           for(let d=0; d<20; d++) {
              ctx.beginPath(); ctx.arc(px, py + d*5, 1.6, 0, Math.PI*2); ctx.fill();
           }
        }

        // ── 4. FOREGROUND MOUNTAINS ──
        ctx.fillStyle = 'rgba(14, 165, 233, 0.22)'; 
        for (let c = 0; c <= 80; c++) {
           const x = (w / 80) * c;
           const px = x + (mouseX * 40);
           const staticCurve = Math.sin(c * 0.03) * 20 + Math.abs(Math.cos(c * 0.09 + 5)) * 45; 
           const py = horizon - staticCurve + Math.sin(time + c * 0.1)*3 + (mouseY * 18) + 50;
           for(let d=0; d<25; d++) {
              ctx.beginPath(); ctx.arc(px, py + d*5, 2.2, 0, Math.PI*2); ctx.fill();
           }
        }

        requestAnimationFrame(loop);
      }
      loop();
    })();`;

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('function initMeshCanvas()'));

if(startIdx >= 0) {
   let endIdx = startIdx;
   while (endIdx < lines.length && !lines[endIdx].includes('})();')) {
      endIdx++;
   }
   // replace range
   // subtract 3 for comments start
   lines.splice(startIdx - 3, (endIdx - (startIdx - 3) + 1), newScript);
   fs.writeFileSync(file, lines.join('\n'), 'utf-8');
   console.log('Script replaced dynamically.');
} else {
   console.log('initMeshCanvas not found.');
}
