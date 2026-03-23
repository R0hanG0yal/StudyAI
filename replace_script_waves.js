const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

const newScript = `    // ═══════════════════════════════════════════
    // 🏔️ MESH MOUNTAINS (Layered Wave Silhouette)
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
        time += 0.002; // slower breathing

        const horizon = h * 0.62;
        const cols = 100; // high density columns

        // ── 1. BACK MOUNTAINS range style ──
        ctx.fillStyle = 'rgba(129, 140, 248, 0.15)'; // light lavender blue
        for (let c = 0; c <= cols; c++) {
           const x = (w / cols) * c;
           const px = x + (mouseX * 10);
           const staticCurve = Math.sin(c * 0.04) * 120 + Math.sin(c * 0.11) * 30; 
           
           for(let d=0; d<4; d++) { // 4 continuous parallel wave crests
              const py = horizon - staticCurve + (d * 8) + Math.sin(time + c * 0.08) * 5 + (mouseY * 6);
              ctx.beginPath(); ctx.arc(px, py, 1.1, 0, Math.PI*2); ctx.fill();
           }
        }

        // ── 2. GLOWING SUN (Multiple radial rings) ──
        ctx.save();
        const sunX = w * 0.55;
        const sunY = (h * 0.5) - Math.sin(time * 0.6) * 30; // smooth floating rise
        
        let sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 140);
        sunGrad.addColorStop(0, '#ffffcc'); // yellow
        sunGrad.addColorStop(0.3, '#ffb86c'); // peach
        sunGrad.addColorStop(0.6, '#ff79c6'); // soft pink
        sunGrad.addColorStop(1, 'rgba(255, 121, 198, 0)');
        
        ctx.shadowColor = 'rgba(255, 184, 108, 0.4)'; ctx.shadowBlur = 60;
        ctx.fillStyle = sunGrad;
        ctx.beginPath(); ctx.arc(sunX, sunY, 140, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // ── 3. MIDDLE MOUNTAINS ──
        ctx.fillStyle = 'rgba(244, 114, 182, 0.22)'; // rose/peach
        for (let c = 0; c <= cols; c++) {
           const x = (w / cols) * c;
           const px = x + (mouseX * 25);
           const staticCurve = Math.cos(c * 0.06 + 8) * 90 + Math.sin(c * 0.15) * 15; 
           
           for(let d=0; d<6; d++) {
              const py = horizon - staticCurve + (d * 7) + Math.sin(time + c * 0.07) * 4 + (mouseY * 12) + 15;
              ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI*2); ctx.fill();
           }
        }

        // ── 4. FOREGROUND MOUNTAINS ──
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)'; // sky blue
        for (let c = 0; c <= cols; c++) {
           const x = (w / cols) * c;
           const px = x + (mouseX * 45);
           const staticCurve = Math.sin(c * 0.025) * 40 + Math.abs(Math.cos(c * 0.08 + 5)) * 40; 
           
           for(let d=0; d<8; d++) {
              const py = horizon - staticCurve + (d * 8) + Math.sin(time + c * 0.09) * 3 + (mouseY * 18) + 50;
              ctx.beginPath(); ctx.arc(px, py, 2.3, 0, Math.PI*2); ctx.fill();
           }
        }

        requestAnimationFrame(loop);
      }
      loop();
    })();`;

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('function initLayeredMountains()') || l.includes('function initMeshCanvas()'));

if(startIdx >= 0) {
   let endIdx = startIdx;
   while (endIdx < lines.length && !lines[endIdx].includes('})();')) {
      endIdx++;
   }
   lines.splice(startIdx - 3, (endIdx - (startIdx - 3) + 1), newScript);
   fs.writeFileSync(file, lines.join('\n'), 'utf-8');
   console.log('Wave Mountain Script updated.');
} else {
   console.log('initLayeredMountains not found.');
}
