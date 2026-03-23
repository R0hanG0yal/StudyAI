const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

const newScript = `    // ═══════════════════════════════════════════
    // 🏔️ MESH MOUNTAINS (Super-Dense Ink Haze Dots)
    // ═══════════════════════════════════════════
    (function initLayeredMountains() {
      const canvas = document.getElementById('particles');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let w, h, time = 0;
      
      function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        initPeaks(); 
      }
      window.addEventListener('resize', resize);

      let mouseX = 0, mouseY = 0;
      window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / w) - 0.5;
        mouseY = ((e.clientY - rect.top) / h) - 0.5;
      });

      let backPeaks = [], midPeaks = [], frontPeaks = [];

      function initPeaks() {
         backPeaks = []; midPeaks = []; frontPeaks = [];
         for(let i=0; i<5; i++) backPeaks.push({ cx: Math.random()*w, h: Math.random()*100+130, w: Math.random()*200+180 });
         for(let i=0; i<7; i++) midPeaks.push({ cx: Math.random()*w, h: Math.random()*80+90, w: Math.random()*130+110 });
         for(let i=0; i<9; i++) frontPeaks.push({ cx: Math.random()*w, h: Math.random()*60+60, w: Math.random()*80+70 });
      }

      function getMountainY(x, rangeList, horizon) {
         let maxH = 0;
         for(let i = 0; i < rangeList.length; i++) {
             const p = rangeList[i];
             const dist = Math.abs(x - p.cx);
             if (dist < p.w) {
                 const h = p.h * Math.cos((dist / p.w) * (Math.PI / 2)); 
                 if (h > maxH) maxH = h;
             }
         }
         return horizon - maxH;
      }

      function loop() {
        ctx.clearRect(0, 0, w, h);
        time += 0.002;

        const horizon = h * 0.55;
        const totalDots = 280; // extremely high density width-span columns

        // ── 1. BACKGROUND MOUNTAINS ──
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)'; // Black mist back
        for (let c = 0; c <= totalDots; c++) {
           const x = (w / totalDots) * c;
           const px = x + (mouseX * 8);
           const staticCurve = horizon - getMountainY(x, backPeaks, horizon); 
           
           for(let d=0; d<4; d++) {
              const py = horizon - staticCurve + (d * 8) + Math.sin(time + c * 0.04) * 4 + (mouseY * 4);
              ctx.beginPath(); ctx.arc(px, py, 1.1, 0, Math.PI*2); ctx.fill();
           }
        }

        // ── 🌫️ DEPTH HAZED ATMOSPHERE FOG 1 ──
        ctx.fillStyle = 'rgba(255, 229, 236, 0.12)'; 
        ctx.fillRect(0, 0, w, h);

        // ── 2. GLOWING SUN (Drawn behind middle layers) ──
        ctx.save();
        const sunX = w * 0.6;
        const sunY = (h * 0.48) - Math.sin(time * 0.4) * 15; 
        
        let sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 150);
        sunGrad.addColorStop(0, '#ffffcc'); 
        sunGrad.addColorStop(0.3, '#fbc02d'); 
        sunGrad.addColorStop(0.6, 'rgba(240, 98, 146, 0.6)'); 
        sunGrad.addColorStop(1, 'rgba(240, 98, 146, 0)');
        
        ctx.shadowColor = 'rgba(251, 192, 45, 0.3)'; ctx.shadowBlur = 50;
        ctx.fillStyle = sunGrad;
        ctx.beginPath(); ctx.arc(sunX, sunY, 150, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // ── 🌫️ DEPTH HAZED ATMOSPHERE FOG 2 (Smooth light spill) ──
        ctx.fillStyle = 'rgba(255, 240, 219, 0.1)'; 
        ctx.fillRect(0, 0, w, h);

        // ── 3. MIDDLE MOUNTAINS ──
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'; // Black mid
        for (let c = 0; c <= totalDots; c++) {
           const x = (w / totalDots) * c;
           const px = x + (mouseX * 22);
           const staticCurve = horizon - getMountainY(x, midPeaks, horizon); 
           
           for(let d=0; d<6; d++) {
              const py = horizon - staticCurve + (d * 6) + Math.sin(time + c * 0.05) * 3 + (mouseY * 10) + 20;
              ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI*2); ctx.fill();
           }
        }

        // ── 🌫️ FOG 3 ──
        ctx.fillStyle = 'rgba(255, 240, 219, 0.08)';
        ctx.fillRect(0, 0, w, h);

        // ── 4. FOREGROUND MOUNTAINS ──
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Black front
        for (let c = 0; c <= totalDots; c++) {
           const x = (w / totalDots) * c;
           const px = x + (mouseX * 40);
           const staticCurve = horizon - getMountainY(x, frontPeaks, horizon); 
           
           for(let d=0; d<8; d++) {
              const py = horizon - staticCurve + (d * 6) + Math.sin(time + c * 0.06) * 2 + (mouseY * 16) + 45;
              ctx.beginPath(); ctx.arc(px, py, 2.1, 0, Math.PI*2); ctx.fill();
           }
        }

        requestAnimationFrame(loop);
      }

      resize();
      loop();
    })();`;

const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('function initLayeredMountains()'));

if(startIdx >= 0) {
   let endIdx = startIdx;
   while (endIdx < lines.length && !lines[endIdx].includes('})();')) {
      endIdx++;
   }
   lines.splice(startIdx - 3, (endIdx - (startIdx - 3) + 1), newScript);
   fs.writeFileSync(file, lines.join('\n'), 'utf-8');
   console.log('Ink Wave Mountain Script updated.');
} else {
   console.log('initLayeredMountains not found.');
}
