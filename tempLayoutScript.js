const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Wrap the hero content into hero-left and hero-right
// Find the h1 and sub
html = html.replace(/(<h1 class="h1 ai d2">[\s\S]*?<\/p>)/, '<div class="hero-left">\n      $1\n    </div>');

// Find stats, pills, ctas and wrap them in hero-right
html = html.replace(/(<div class="stats ai d3">[\s\S]*?<\/div>\s*<\/div>)\s*<\/div>/, '<div class="hero-right">\n      $1\n    </div>\n  </div>');

// Wait! Custom regex logic to safely wrap left and right:
html = html.replace(/<div class="hero">/, '<div class="hero">');
// Re-read indexHtml properly to avoid regex bugs:
// Actually, it's safer to just inject CSS and modify the `.hero` layout if I can match it cleanly.
// Let's reset the `index.html` structure:
// <div class="hero">
//    <h1 ...>
//    <p ...>
//    <div class="stats...
// I'll just use a targeted string replacement.
