const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Swap the background and text colors to match the clean aesthetic
html = html.replace(/background:#04060f;/g, 'background:#fdfbf7;');
html = html.replace(/color:#f0f2ff;/g, 'color:#2c3e50;');
html = html.replace(/color:#ffffff;/g, 'color:#2c3e50;');

// 2. Hide bg canvas & orbs using CSS instead of risky DOM deletion
let cleanStyles = `
<style id="clean-dashboard">
  #bg { display: none !important; }
  .orb { display: none !important; }
  .hero::before { display: none !important; }
  
  /* Make text clean */
  .g { 
    background: none !important;
    color: #5b9279 !important;
    text-shadow: none !important;
    -webkit-text-fill-color: #5b9279 !important;
  }
  .word {
    background: none !important;
    color: #5b9279 !important;
    text-shadow: none !important;
    -webkit-text-fill-color: #5b9279 !important;
    filter: none !important;
  }
  .stat-n {
    background: none !important;
    color: #4facfe !important;
    -webkit-text-fill-color: #4facfe !important;
  }
  
  /* Change layout so it's all visible */
  .wrap {
    display: flex !important;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 40px;
    padding: 60px 5% !important;
    min-height: 100vh !important;
  }
  .hero {
    flex: 1 1 500px !important;
    text-align: left !important;
    align-items: flex-start !important;
    padding: 0 !important;
    min-height: auto !important;
  }
  .sub, .ctas, .stats, .pills {
    justify-content: flex-start !important;
  }
  .panel {
    flex: 1 1 400px !important;
    min-height: auto !important;
    padding: 40px !important;
    background: #ffffff !important;
    border-radius: 20px !important;
    border: 1px solid #e5e7eb !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.05) !important;
    position: relative !important;
  }
  .panel::before, .panel::after { display: none !important; }

  .h1 {
    font-size: clamp(2.5rem, 4vw, 3.8rem) !important;
    color: #2c3e50 !important;
    text-align: left !important;
  }
  
  /* Hide noisy things */
  .fcard { display: none !important; }
  #cur, #cur-ring, .scroll-hint { display: none !important; }
  * { cursor: auto !important; }
  body { cursor: auto !important; }
  
  /* Buttons */
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
  .btn-auth { background: #5b9279 !important; box-shadow: none !important; }
  .ptab.on { background: #5b9279 !important; color: white !important; box-shadow: none !important; }
</style>
`;

if (!html.includes('id="clean-dashboard"')) {
  html = html.replace('</head>', cleanStyles + '\n</head>');
}

// Ensure the "Get Started Free" button just scrolls/focuses to email or we remove scrolling entirely
html = html.replace(/onclick="document\.getElementById\('authPanel'\)\.scrollIntoView\(\{behavior:'smooth',block:'center'\}\)"/g, 'onclick="document.getElementById(\'loginEmail\').focus()"');

fs.writeFileSync('public/index.html', html);
console.log('Safe CSS override applied successfully!');
