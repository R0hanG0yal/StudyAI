const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The Get Started Free text went missing maybe because of a string replace error!
html = html.replace(/<button class="btn-p"[^>]*>.*?<\/button>/, `<button class="btn-p" onclick="document.getElementById('loginEmail').focus()" style="color: white !important;">🚀 Get Started Free</button>`);

// Kill the blue vignette by specifically adding a nuclear override
const nuclearGlowKill = `
  html { box-shadow: none !important; }
  body { box-shadow: none !important; background-image: none !important; }
  * { box-shadow: none !important; } /* Kill ALL box shadows just in case, but keep panel border */
  .panel, .pf input, .btn-auth, .btn-guest { box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important; } /* Restore essential UI shadows */
`;

if (html.includes('id="brutal-clean"')) {
  html = html.replace('</style>', nuclearGlowKill + '\\n</style>');
}

fs.writeFileSync('public/index.html', html);
console.log('Fixed Get Started text and removed all glow rings!');
