const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The blue vignette effect is caused by CSS. Let's find any inset shadows or background gradients on body/html
html = html.replace(/box-shadow:inset.*?;/gi, 'box-shadow:none;');
html = html.replace(/background:radial-gradient.*?;/gi, 'background:none;');

// Fix the corrupted CSS inputs styling. I might have replaced "color:#ffffff;" globally and damaged an input class!
// Wait! In stripNativeCss.js I did:
// html = html.replace(/color:#ffffff;/g, 'color:#2c3e50;');
// And I replaced text-shadow using: html = html.replace(/text-shadow:.*?;/g, 'text-shadow: none;');
// Did I break a CSS rule?
// If html had "text-shadow: 0 2px 4px rgba(0,0,0,.3); }", replacing "text-shadow:.*?" would eat until the NEXT semicolon, which could be lines later!
// YES! .replace(/text-shadow:.*?;/g) is very dangerous if there are no semicolons or if it crosses newlines!
// ACTUALLY .*? does not match newlines in JS unless the "s" flag is used. So it only matches on the same line.

// Just to be absolutely safe, let's inject a strong override for the inputs and buttons to ensure they look beautiful.
const fixPanelCss = `
<style id="auth-panel-fix">
  /* Auth Panel UI fixes */
  .pf input {
    width: 100% !important;
    padding: 12px 14px 12px 40px !important;
    background: #fdfbf7 !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 12px !important;
    color: #2c3e50 !important;
    font-size: 0.95rem !important;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02) !important;
    transition: all 0.2s !important;
  }
  .pf input:focus {
    border-color: #5b9279 !important;
    box-shadow: 0 0 0 3px rgba(91, 146, 121, 0.15), inset 0 2px 4px rgba(0,0,0,0.02) !important;
    outline: none !important;
  }
  .btn-auth {
    width: 100% !important;
    padding: 14px !important;
    background: #5b9279 !important;
    color: white !important;
    border: none !important;
    border-radius: 12px !important;
    font-size: 1rem !important;
    font-weight: 700 !important;
    margin-top: 10px !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
    box-shadow: 0 4px 12px rgba(91, 146, 121, 0.2) !important;
  }
  .btn-auth:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 16px rgba(91, 146, 121, 0.3) !important;
  }
  .btn-guest {
    width: 100% !important;
    padding: 12px !important;
    background: #ffffff !important;
    border: 1px solid #e2e8f0 !important;
    color: #475569 !important;
    border-radius: 12px !important;
    font-size: 0.95rem !important;
    font-weight: 600 !important;
    cursor: pointer !important;
  }
  .ptabs {
    display: flex !important;
    background: #f1f5f9 !important;
    border-radius: 12px !important;
    padding: 4px !important;
    margin-bottom: 24px !important;
  }
  .ptab {
    flex: 1 !important;
    padding: 10px !important;
    border: none !important;
    border-radius: 8px !important;
    background: transparent !important;
    color: #64748b !important;
    font-weight: 600 !important;
    cursor: pointer !important;
  }
  .ptab.on {
    background: #ffffff !important;
    color: #5b9279 !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
  }
  
  /* Remove blue vignette */
  html, body {
    box-shadow: none !important;
  }
  .features-section, .hero::after, .wrap::after {
    box-shadow: none !important;
    background: none !important;
  }
  
  /* Make header compact */
  .top-header {
    position: absolute !important;
    padding: 20px 40px !important;
  }
  .wrap {
    padding-top: 80px !important;
  }
</style>
`;

if (!html.includes('id="auth-panel-fix"')) {
  html = html.replace('</head>', fixPanelCss + '\n</head>');
}

// Remove any remaining shadow/glow on body
html = html.replace(/box-shadow:.*?;/gi, 'box-shadow:none;');

fs.writeFileSync('public/index.html', html);
console.log('Fixed auth inputs and removed vignette');
