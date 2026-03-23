const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

const newScript = `    // ═══════════════════════════════════════════
    // 🏔️ MESH MOUNTAINS (Explicit Silhouette Peaks)
    // ═══════════════════════════════════════════
    (function initLayeredMountains() {
      const canvas = document.getElementById('particles');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      let w, h, time = 0;
      
      function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        initPeaks(); // regenerate on resize for proper spreads
      }
      window.addEventListener('resize', resize);

      let mouseX = 0, mouseY = 0;
      window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / w) - 0.5;
        mouseY = ((e.clientY - rect.top) / h) - 0.5;
      });

      // Explicit Discrete Mountain Peak Lists
      let backPeaks = [], midPeaks = [], frontPeaks = [];

      function initPeaks() {
         backPeaks = []; midPeaks = []; frontPeaks = [];
         // Generate 4 continuous peaks for background (smooth wide)
         for(let i=0; i<5; i++) backPeaks.push({ cx: Math.random()*w, h: Math.random()*80+110, w: Math.random()*160+140 });
         // Generate 6 slightly sharper peaks for mid
         for(let i=0; i<6; i++) midPeaks.push({ cx: Math.random()*w, h: Math.random()*70+80, w: Math.random()*110+90 });
         // Generate 8 sharper peaks for front
         for(let i=0; i<8; i++) frontPeaks.push({ cx: Math.random()*w, h: Math.random()*50+50, w: Math.random()*60+60 });
      }

      function getMountainY(x, rangeList, horizon) {
         let maxH = 0;
         for(let i = 0; i < rangeList.length; i++) {
             const p = rangeList[i];
             const dist = Math.abs(x - p.cx);
             if (dist < p.w) {
                 const h = p.h * Math.cos((dist / p.w) * (Math.PI / 2)); // Smooth cosine peak curves
                 if (h > maxH) maxH = h;
             }
         }
         return horizon - maxH;
      }

      function loop() {
        ctx.clearRect(0, 0, w, h);
        time += 0.003;

        const horizon = h * 0.62;
        const totalDots = 90; // explicit densities count

        // ── 1. BACKGROUND MOUNTAINS range ──
        ctx.fillStyle = 'rgba(129, 140, 248, 0.16)'; 
        for (let c = 0; c <= totalDots; c++) {
           const x = (w / totalDots) * c;
           const px = x + (mouseX * 12);
           const staticCurve = horizon - getMountainY(x, backPeaks, horizon); 
           
           for(let d=0; d<4; d++) {
              const py = horizon - staticCurve + (d * 8) + Math.sin(time + c * 0.08) * 4 + (mouseY * 6);
              ctx.beginPath(); ctx.arc(px, py, 1.1, 0, Math.PI*2); ctx.fill();
           }
        }

        // ── 2. GLOWING SUN (Partially Hidden) ──
        ctx.save();
        const sunX = w * 0.55;
        const sunY = (h * 0.5) - Math.sin(time * 0.5) * 20; 
        
        let sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 130);
        sunGrad.addColorStop(0, '#ffffcc'); 
        sunGrad.addColorStop(0.3, '#ffb86c'); 
        sunGrad.addColorStop(0.6, '#ff79c6'); 
        sunGrad.addColorStop(1, 'rgba(255, 121, 198, 0)');
        
        ctx.shadowColor = 'rgba(255, 184, 108, 0.4)'; ctx.shadowBlur = 50;
        ctx.fillStyle = sunGrad;
        ctx.beginPath(); ctx.arc(sunX, sunY, 130, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // ── 3. MIDDLE MOUNTAINS ──
        ctx.fillStyle = 'rgba(219, 39, 119, 0.22)'; 
        for (let c = 0; c <= totalDots; c++) {
           const x = (w / totalDots) * c;
           const px = x + (mouseX * 25);
           const staticCurve = horizon - getMountainY(x, midPeaks, horizon); 
           
           for(let d=0; d<5; d++) {
              const py = horizon - staticCurve + (d * 7) + Math.sin(time + c * 0.07) * 3 + (mouseY * 12) + 15;
              ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI*2); ctx.fill();
           }
        }

        // ── 4. FOREGROUND MOUNTAINS ──
        ctx.fillStyle = 'rgba(56, 189, 248, 0.3)'; 
        for (let c = 0; c <= totalDots; c++) {
           const x = (w / totalDots) * c;
           const px = x + (mouseX * 45);
           const staticCurve = horizon - getMountainY(x, frontPeaks, horizon); 
           
           for(let d=0; d<6; d++) {
              const py = horizon - staticCurve + (d * 8) + Math.sin(time + c * 0.09) * 2 + (mouseY * 18) + 40;
              ctx.beginPath(); ctx.arc(px, py, 2.3, 0, Math.PI*2); ctx.fill();
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
   console.log('Peak Mountain Script layout updated.');
} else {
   console.log('initLayeredMountains not found.');
}
