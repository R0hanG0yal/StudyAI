const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Remove Three.js script and bg canvas
html = html.replace(/<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js"><\/script>/, '');
html = html.replace(/<canvas id="bg"><\/canvas>/, '');
html = html.replace(/\/\* ════════════════════════════════════════════════════════════\s*THREE\.JS[\s\S]*?\}\)\(\);/g, '');

// 2. Remove ORBS and other background noise
html = html.replace(/<!-- CSS orbs -->[\s\S]*?<div class="orb orb3"><\/div>/, '');
html = html.replace(/\.orb\{[\s\S]*?\}\)/g, ''); // just in case

// 3. Update override CSS to create a clean, side-by-side layout (or very compact column)
const newOverride = `
<style id="clean-dashboard-layout">
  body {
    background: #fdfbf7 !important; /* Dashboard cream background */
    color: #2c3e50 !important;
    overflow-x: hidden;
  }
  
  /* Remove noise overlay */
  .hero::before { display: none !important; }

  /* 2-Column Desktop Layout */
  .wrap {
    display: flex !important;
    flex-direction: row !important;
    justify-content: center !important;
    align-items: center !important;
    min-height: 100vh !important;
    padding: 40px 5% !important;
    gap: 40px !important;
    max-width: 1400px !important;
    margin: 0 auto !important;
  }
  
  @media(max-width: 900px) {
    .wrap {
      flex-direction: column !important;
      padding-top: 100px !important;
    }
  }

  .hero {
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    text-align: left !important;
    min-height: auto !important;
    padding: 0 !important;
    max-width: 600px !important;
  }

  /* No Glowing Highlighting Effects */
  .h1 {
    font-size: clamp(2.5rem, 4vw, 3.8rem) !important;
    color: #2c3e50 !important;
    background: none !important;
    text-shadow: none !important;
    text-align: left !important;
    margin: 0 0 20px 0 !important;
    padding: 0 !important;
    line-height: 1.2 !important;
  }
  
  .h1 .g {
    background: none !important;
    color: #5b9279 !important; /* Dashboard calm green */
    -webkit-text-fill-color: #5b9279 !important;
    text-shadow: none !important;
    filter: none !important;
  }
  .h1 .word {
    background: none !important;
    color: #5b9279 !important;
    -webkit-text-fill-color: #5b9279 !important;
    text-shadow: none !important;
    filter: none !important;
  }

  .sub {
    text-align: left !important;
    margin: 0 0 30px 0 !important;
    font-size: 1.15rem !important;
    color: #6b7280 !important;
  }

  .stats, .pills, .ctas {
    justify-content: flex-start !important;
    margin-bottom: 24px !important;
  }
  
  .stat-n {
    background: none !important;
    color: #4facfe !important;
    -webkit-text-fill-color: #2c3e50 !important;
  }
  
  .pill {
    background: #fff !important;
    border: 1px solid #e5e7eb !important;
    color: #4b5563 !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important;
  }

  .btn-p {
    background: #5b9279 !important;
    box-shadow: 0 4px 12px rgba(91, 146, 121, 0.3) !important;
    color: white !important;
  }
  .btn-s {
    background: #fff !important;
    border: 1px solid #e5e7eb !important;
    color: #4b5563 !important;
  }

  /* Auth Panel directly visible, no 100vh gap */
  .panel {
    flex: 1 !important;
    min-height: auto !important;
    width: 100% !important;
    max-width: 480px !important;
    padding: 40px !important;
    background: #ffffff !important;
    border-radius: 24px !important;
    border: 1px solid #e5e7eb !important;
    box-shadow: 0 20px 40px rgba(0,0,0,0.04) !important;
    margin: 0 !important;
  }
  .panel::before, .panel::after { display: none !important; }
  .panel-inner {
    max-width: 100% !important;
  }

  /* Hide scroll hints and cursors to match a clean app feel */
  .scroll-hint, #cur, #cur-ring { display: none !important; }
  * { cursor: auto !important; } /* Restore native cursor */
  
  .fcard { display: none !important; } /* Hide floating cards to reduce clutter completely */
</style>
`;

if (html.includes('id="clean-dashboard-layout"')) {
  html = html.replace(/<style id="clean-dashboard-layout">[\s\S]*?<\/style>/, newOverride);
} else {
  html = html.replace('</head>', newOverride + '\n</head>');
}

// Ensure the "Get Started" button doesn't scroll anymore, since auth panel is right there.
html = html.replace(/onclick="document\.getElementById\('authPanel'\)\.scrollIntoView\(\{behavior:'smooth',block:'center'\}\)"/g, 
  'onclick="document.getElementById(\'loginEmail\').focus()"');

// Fix text changes for Get Started
html = html.replace(/🚀 Get Started Free/,"Get Started Free");

fs.writeFileSync('public/index.html', html);
console.log("Successfully cleaned index layout.");
