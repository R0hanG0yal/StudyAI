const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Core Background & Colors Replacement
// Body setup
html = html.replace(/background:#04060f;/g, 'background:#fdfdfc;');
html = html.replace(/color:#f0f2ff;/g, 'color:#2c3e50;');

// Replace generic glowing shadow vars or inlines
html = html.replace(/rgba\(102,126,234,\.4\)/g, 'rgba(164,176,126,.4)');
html = html.replace(/rgba\(240,147,251,\.4\)/g, 'rgba(145,196,183,.4)');

// 2. Auth Panel Box style to Glassmorphism
// It was: background:linear-gradient(135deg,rgba(8,11,28,.75),rgba(4,6,18,.75))
html = html.replace(/background:linear-gradient\(135deg,\s*rgba\(8,11,28,\.75\),\s*rgba\(4,6,18,\.75\)\)/g, 'background:rgba(255,255,255,0.85)');
html = html.replace(/background:rgba\(6,8,22,\.65\)/g, 'background:rgba(255,255,255,0.85)');
html = html.replace(/border:1px solid rgba\(102,126,234,\.15\)/g, 'border:1px solid rgba(0,0,0,0.08)');
html = html.replace(/color:#cbd5e1/g, 'color:#4b5a69');

// Buttons inside auth panel
html = html.replace(/background:linear-gradient\(135deg,#667eea,#764ba2\)/g, 'background:linear-gradient(135deg,#a4b07e,#5b9279)'); // buttons
html = html.replace(/background:linear-gradient\(135deg,#667eea,#f093fb\)/g, 'background:linear-gradient(135deg,#a3586d,#b0b0b0)'); // auth button

// 3. Fix Layout Overlaps & Wrapping structure
// The previous ".wrap" grid is what was breaking centering. I will set .wrap to flex column centered structure.
html = html.replace(/\.wrap\{([\s\S]*?)\}/, `.wrap{
  position:relative;z-index:10;
  display:flex;flex-direction:column;align-items:center;
  padding-top:140px;
  width:100%;
}`);

// Hero container to centered column
html = html.replace(/\.hero\{([\s\S]*?)\}/, `.hero{
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  padding:40px 24px;position:relative;
  max-width:900px;
  text-align:center;
  min-height:85vh;
}`);

// Split hero center contents to be nicely stacked, no overlapping boxes.
// Eliminate any hard fixed width rules.
html = html.replace(/\.h1\{[\s\S]*?\}/, `.h1{
  font-family:'Syne',sans-serif;
  font-size:clamp(2.2rem,4vw,3.8rem);
  font-weight:800;line-height:1.3;margin-bottom:20px;
  color:#2c3e50;
  max-width:800px;
}`);

// Sub subtitle
html = html.replace(/\.sub\{([\s\S]*?)\}/, `.sub{
  color:#5d6d7e;font-size:1.1rem;line-height:1.7;
  max-width:640px;margin-bottom:32px;
  text-align:center;
}`);

// Center everything else: stats, pills, ctas
html = html.replace(/\.stats\{([^}]*)\}/, `.stats{display:flex;justify-content:center;gap:32px;margin-bottom:36px}`);
html = html.replace(/\.pills\{([^}]*)\}/, `.pills{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:40px}`);
html = html.replace(/\.ctas\{([^}]*)\}/, `.ctas{display:flex;justify-content:center;gap:16px}`);

// Fix pill styling to dark text
html = html.replace(/\.pill\{[\s\S]*?\}/, `.pill{
  display:flex;align-items:center;gap:8px;
  padding:10px 20px;border-radius:100px;
  background:rgba(255,255,255,0.85);
  border:1px solid rgba(0,0,0,0.06);
  font-size:.9rem;color:#2c3e50;font-weight:600;
  backdrop-filter:blur(8px);
  transition:all .2s;
}`);

// 4. Smooth Scroll for Panel placement
// Restructure .panel so that it is full view further down the page flow
html = html.replace(/\.panel\{([\s\S]*?)\}/, `.panel{
  width:100%;min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  padding:80px 20px;
  position:relative;
}`);

// Re-position floating cards to edges so they DO NOT fly over sentences
html = html.replace(/\.fc1\{[^\}]*\}/g, '.fc1{top:15vh;left:4vw;animation:fl1 10s ease-in-out infinite}');
html = html.replace(/\.fc2\{[^\}]*\}/g, '.fc2{top:65vh;left:3vw;animation:fl2 12s ease-in-out infinite}');
html = html.replace(/\.fc3\{[^\}]*\}/g, '.fc3{top:75vh;right:4vw;animation:fl3 8s ease-in-out infinite}');
html = html.replace(/\.fc4\{[^\}]*\}/g, '.fc4{top:15vh;right:3vw;animation:fl4 11s ease-in-out infinite}');

fs.writeFileSync('public/index.html', html);
console.log('Restructured entire landing template layout flawlessly.');
