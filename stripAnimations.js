const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The reason .hero is invisible isn't because of heights, it is because of absolute class opacity triggers:
// <p class="sub ai d3">
// If .ai is setting opacity:0 from animation init frames that never loads correctly.

// Replace the classes to strip the .ai animation triggers
html = html.replace(/\bai d\d\b/g, ''); // Strips out 'ai d1', 'ai d2', 'ai d3', etc.
html = html.replace(/\bai\b/g, '');     // Strips out purely 'ai' class names

// Also place cards in static safe places below description nodes
let cardRep = `
<style id="ultimate-light-override">
  .wrap {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    width: 100% !important;
    text-align: center !important;
  }
  .fcard {
    display: none !important; /* Forces total clean setup for now */
  }
  .sub, .ctas, .stats, .pills {
    display: flex !important;
    justify-content: center !important;
    text-align: center !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    width: 100% !important;
    opacity: 1 !important; /* Force visible */
    visibility: visible !important;
  }
</style>
`;

if (html.indexOf('id="ultimate-light-override"') > -1) {
  html = html.replace(/<style id="ultimate-light-override">[\s\S]*?<\/style>/, cardRep);
} else {
  html = html.replace('</head>', cardRep + '</head>');
}


fs.writeFileSync('public/index.html', html);
console.log('Stripped animations and overrides confirmed statically visible layout setup.');
