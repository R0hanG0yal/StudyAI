const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

const newMultiCanvasScript = `    // ═══════════════════════════════════════════
    // 🏔️ LAYERED CANVAS MOUNTAINS DRAWING
    // ═══════════════════════════════════════════
    (function initMultiCanvasMountains() {
      const cBack = document.getElementById('canvas-back');
      const cMid = document.getElementById('canvas-mid');
      const cFront = document.getElementById('canvas-front');
      if (!cBack || !cMid || !cFront) return;

      const ctxBack = cBack.getContext('2d');
      const ctxMid = cMid.getContext('2d');
      const ctxFront = cFront.getContext('2d');
      let w, h, time = 0;
      
      function resize() {
        w = cBack.width = cMid.width = cFront.width = window.innerWidth;
        h = cBack.height = cMid.height = cFront.height = window.innerHeight;
        initPeaks(); 
      }
      window.addEventListener('resize', resize);

      let backPeaks = [], midPeaks = [], frontPeaks = [];

      function initPeaks() {
         backPeaks = []; midPeaks = []; frontPeaks = [];
         for(let i=0; i<5; i++) backPeaks.push({ cx: Math.random()*w, h: Math.random()*120+130, w: Math.random()*200+180 });
         for(let i=0; i<7; i++) midPeaks.push({ cx: Math.random()*w, h: Math.random()*90+100, w: Math.random()*150+120 });
         for(let i=0; i<9; i++) frontPeaks.push({ cx: Math.random()*w, h: Math.random()*70+70, w: Math.random()*100+80 });
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
        ctxBack.clearRect(0, 0, w, h);
        ctxMid.clearRect(0, 0, w, h);
        ctxFront.clearRect(0, 0, w, h);
        time += 0.003;

        const horizon = h * 0.58;
        const totalDots = 280;

        // ── 1. DRAW BACK ──
        ctxBack.fillStyle = 'rgba(0, 0, 0, 0.12)';
        for (let c = 0; c <= totalDots; c++) {
           const x = (w / totalDots) * c;
           const staticCurve = horizon - getMountainY(x, backPeaks, horizon); 
           for(let d=0; d<4; d++) {
              const py = horizon - staticCurve + (d * 8) + Math.sin(time + c * 0.04) * 4;
              ctxBack.beginPath(); ctxBack.arc(x, py, 1.3, 0, Math.PI*2); ctxBack.fill();
           }
        }

        // ── 2. DRAW MID ──
        ctxMid.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let c = 0; c <= totalDots; c++) {
           const x = (w / totalDots) * c;
           const staticCurve = horizon - getMountainY(x, midPeaks, horizon); 
           for(let d=0; d<6; d++) {
              const py = horizon - staticCurve + (d * 6) + Math.sin(time + c * 0.05) * 3 + 15;
              ctxMid.beginPath(); ctxMid.arc(x, py, 1.7, 0, Math.PI*2); ctxMid.fill();
           }
        }

        // ── 3. DRAW FRONT ──
        ctxFront.fillStyle = 'rgba(0, 0, 0, 0.28)';
        for (let c = 0; c <= totalDots; c++) {
           const x = (w / totalDots) * c;
           const staticCurve = horizon - getMountainY(x, frontPeaks, horizon); 
           for(let d=0; d<7; d++) {
              const py = horizon - staticCurve + (d * 6) + Math.sin(time + c * 0.06) * 2 + 40;
              ctxFront.beginPath(); ctxFront.arc(x, py, 2.3, 0, Math.PI*2); ctxFront.fill();
           }
        }

        requestAnimationFrame(loop);
      }

      resize();
      loop();
    })();`;

content = content.replace(/\(function initLayeredMountains\(\) \{[\s\S]*?\}\)\(\);/, newMultiCanvasScript);

fs.writeFileSync(file, content, 'utf-8');
console.log('Canvas drawings updated into layered divs framework specifications.');
