const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Inject CSS for Tutorial Guidelines Step 2, 3, 4, 5
const cssInjected = `
    /* ── DIRECT TUTORIAL STYLES INJECTED ── */
    .layer {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      z-index: 2;
    }
    .sun {
      position: absolute;
      width: 200px; height: 200px;
      background: radial-gradient(circle, #ffd6a5, #ff8fab, transparent);
      border-radius: 50%;
      filter: blur(20px);
      bottom: 250px; right: 25%;
      animation: rise 12s ease-out forwards;
      z-index: 1 !important;
    }
    @keyframes rise {
      from { transform: translateY(80px); opacity: 0.6; }
      to { transform: translateY(0px); opacity: 1; }
    }
    .mountain.back { opacity: 0.4; filter: blur(2px); }
    .mountain.mid { opacity: 0.7; }
    .mountain.front { opacity: 1; }
    
    .mountain canvas { 
      width: 100%; height: 100%; 
      animation: float 6s ease-in-out infinite; 
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
    }
    
    button { transition: all 0.3s ease !important; }
    button:hover { 
      transform: scale(1.05) !important; 
      box-shadow: 0 10px 30px rgba(255, 120, 150, 0.3) !important; 
    }
    .hero::after {
      content: "";
      position: absolute; inset: 0;
      background: radial-gradient(circle at center, rgba(255,255,255,0.3), transparent);
      pointer-events: none;
    }
`;

// Inject before </style>
content = content.replace('</style>', cssInjected + '\n  </style>');

// 2. Inject HTML nodes from Step 1
const htmlInjected = `
  <!-- Layered Mountain Framework -->
  <div class="sun layer"></div>
  <div class="mountain back layer"><canvas id="canvas-back"></canvas></div>
  <div class="mountain mid layer"><canvas id="canvas-mid"></canvas></div>
  <div class="mountain front layer"><canvas id="canvas-front"></canvas></div>
`;

// Inject after particles canvas
content = content.replace('<canvas id="particles"></canvas>', htmlInjected);

// 3. Inject JS Script for Parallax Parallax
const jsInjected = `
    document.addEventListener("mousemove", (e) => {
      const x = (window.innerWidth / 2 - e.clientX) / 40;
      const y = (window.innerHeight / 2 - e.clientY) / 40;
      document.querySelectorAll(".layer").forEach((layer, index) => {
        const depth = (index + 1) * 0.4;
        layer.style.transform = \`translate(\${x * depth}px, \${y * depth}px)\`;
      });
    });
`;

content = content.replace('// Orbs and shapes are static', jsInjected + '\n    // Orbs and shapes are static');

fs.writeFileSync(file, content, 'utf-8');
console.log('Provided tutorial changes applied.');
