const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The main error is the .h1 background container!
// It was: background:linear-gradient(135deg,rgba(10,15,50,.7),rgba(20,25,60,.7));
// Which creates a large dark box overlapping the page!

// 1. Strip the .h1 background & border completely to make it floating clean text!
html = html.replace(/background:linear-gradient\(135deg,\s*rgba\(10,15,50,\.7\),\s*rgba\(20,25,60,\.7\)\);/g, 'background:transparent;');
html = html.replace(/border:1px solid rgba\(102,126,234,\.2\);/g, 'border:none;');
html = html.replace(/backdrop-filter:blur\(10px\);/g, 'backdrop-filter:none;');
html = html.replace(/box-shadow:0 8px 32px rgba\(102,126,234,\.15\);/g, 'box-shadow:none;');

// 2. Fix inner text color so it's readable on light bg (Dark Charcoal gradient instead of glowing White)
// Pre-glowing was using linear-gradient(#667eea down to #4facfe)
html = html.replace(/linear-gradient\(135deg,#667eea 0%,#f093fb 45%,#4facfe 100%\)/g, 'linear-gradient(135deg,#2c3e50 0%,#8c3b4a 100%)'); // Dark to Burgundy gradient
html = html.replace(/linear-gradient\(135deg,#a78bfa,#f093fb,#4facfe\)/g, 'linear-gradient(135deg,#2c3e50,#8c3b4a)'); // Brand gradient

html = html.replace(/color:#ffffff;/g, 'color:#2c3e50;'); // base h1 color

// 3. Center the layout elements natively using explicit override class just to guarantee it Centered
// To avoid conflicts, append an override inside head
let override = `
<style id="floating-text-cleanse">
  .h1 {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    text-align: center !important;
    margin: 30px auto !important;
    color: #2c3e50 !important;
    max-width: 900px !important;
    display: block !important;
    float: none !important;
  }
  .h1:hover {
    background: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
  }
  .fcard {
    display: none !important; /* Temporarily hide floating cards if they still cover contents */
  }
</style>
`;

if (html.indexOf('id="floating-text-cleanse"') > -1) {
  html = html.replace(/<style id="floating-text-cleanse">[\s\S]*?<\/style>/, override);
} else {
  html = html.replace('</head>', override + '</head>');
}

fs.writeFileSync('public/index.html', html);
console.log('Stripped H1 background node and confirmed floating text!');
