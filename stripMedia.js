const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Core Background Light Theme 
html = html.replace(/background:#04060f;/g, 'background:#f4f4f0;'); // Pastel beige
html = html.replace(/color:#f0f2ff;/g, 'color:#2c3e50;');           // Dark Charcoal

// Replace glowing variables or shadows
html = html.replace(/rgba\(102,126,234,\.4\)/g, 'rgba(122,142,108,0.3)');

// 2. Wrap restructure from Grid to Flex Column
html = html.replace(/\.wrap\{[\s\S]*?\}/, `.wrap{
  position:relative;z-index:10;min-height:100vh;
  display:flex;flex-direction:column;align-items:center;
  padding-top:140px;
  width:100%;
}`);

// 3. Hero layout - centering it properly on the full width
html = html.replace(/\.hero\{[\s\S]*?\}/, `.hero{
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  padding:40px 24px;position:relative;overflow:visible;
  max-width:800px;
  width:100%;
  text-align:center;
  min-height:80vh;
}`);

// 4. Panel re-positioning (so it stacks further down)
html = html.replace(/\.panel\{[\s\S]*?\}/, `.panel{
  width:100%;max-width:100%;min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  padding:80px 24px;
  position:relative;
  background:rgba(255, 255, 255, 0.95);
  border-top:1px solid rgba(0,0,0,0.05);
}`);

// 5. Titles inside .hero to align Center instead of left
html = html.replace(/\.sub\{([\s\S]*?)\}/, `.sub{
  color:#4a5a6a;font-size:1.1rem;line-height:1.7;margin-bottom:30px;text-align:center;max-width:600px;
}`);

// Remove media overrides for .hero and .wrap so they don't break our centered layout!
html = html.replace(/\.hero\{padding:40px 26px 40px 160px;max-width:100%\}/g, '');
html = html.replace(/\.wrap\{grid-template-columns:1fr;grid-template-areas:"center" "right"}/g, '');

// Clean up any remaining .hero inside media query
html = html.replace(/\.hero\{padding:30px 20px;max-width:100%\}/g, '');

fs.writeFileSync('public/index.html', html);
console.log('Successfully stripped broken media query duplicates!');
