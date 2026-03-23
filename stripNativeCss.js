const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Strip all shadows and glowing neon effects
html = html.replace(/text-shadow:.*?;/g, 'text-shadow: none;');
html = html.replace(/filter:.*?;/g, 'filter: none;');
html = html.replace(/box-shadow:.*?;/g, 'box-shadow: none;');

// Change the gradient background of .g and .word to a solid clean color
html = html.replace(/background:linear-gradient[\s\S]*?-webkit-text-fill-color:transparent;/g, 'color: #5b9279; -webkit-text-fill-color: #5b9279;');

// Change body to solid dashboard cream
html = html.replace(/background:#fdfbf7;/, 'background:#fdfbf7;');

// Ensure .wrap creates a side-by-side flex layout securely
html = html.replace(/\.wrap\{[\s\S]*?\}/, '.wrap { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 40px; padding: 40px 5%; min-height: 100vh; }');

// Ensure .hero doesn't have ridiculous padding pushing it down or creating glows
html = html.replace(/\.hero\{[\s\S]*?\}/, '.hero { flex: 1 1 500px; text-align: left; margin-top: 50px; }');

// Ensure .panel is side-by-side and static
html = html.replace(/\.panel\{[\s\S]*?\}/, '.panel { flex: 1 1 400px; padding: 40px; background: #ffffff; border-radius: 20px; border: 1px solid #e5e7eb; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-top: 50px; }');

// Remove orbs cleanly
html = html.replace(/<div class="orb orb1"><\/div>/, '');
html = html.replace(/<div class="orb orb2"><\/div>/, '');
html = html.replace(/<div class="orb orb3"><\/div>/, '');
html = html.replace(/\.orb\{[\s\S]*?\}/, '.orb { display: none; }');

// Make the buttons match
html = html.replace(/background:linear-gradient\(135deg,#667eea,#764ba2\)/g, 'background: #5b9279');
html = html.replace(/background:linear-gradient\(135deg,#667eea,#f093fb\)/g, 'background: #5b9279');
html = html.replace(/color:#f0f2ff;/g, 'color:#2c3e50;');
html = html.replace(/color:#ffffff;/g, 'color:#2c3e50;');

// Make .h1 pure clean
html = html.replace(/\.h1\{[\s\S]*?\}/, '.h1 { font-family:"Syne",sans-serif; font-size:clamp(2.5rem,4vw,3.8rem); font-weight:800; line-height:1.2; margin-bottom:20px; color:#2c3e50; transition:none; }');

fs.writeFileSync('public/index.html', html);
console.log('Static strip applied!');
