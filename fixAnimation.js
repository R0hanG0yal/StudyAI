const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// The culprit is @keyframes fadeUp {from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
// Using translate(-50%) on generic centered grid-columns breaks the boundary box and shifts everything backward into outer space!

// Rebuild fadeUp without the -50% shift to standard absolute coordinates
html = html.replace(/@keyframes fadeUp\{from\{opacity:0;transform:translate\(-50%,10px\)\}to\{opacity:1;transform:translate\(-50%,0\)\}\}/g, 
  '@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}');

// Fix the typo just in case there are spacing differences
html = html.replace(/translate\(-50%,10px\)/g, 'translateY(20px)');
html = html.replace(/translate\(-50%,0\)/g, 'translateY(0)');

// Also fix the floating cards from covering the subtitle
html = html.replace(/\.fc1\{[^\}]*\}/g, '.fc1{top:15vh;left:2vw;animation:fl1 8s ease-in-out infinite}');
html = html.replace(/\.fc2\{[^\}]*\}/g, '.fc2{top:70vh;left:2vw;animation:fl2 10s ease-in-out infinite}');
html = html.replace(/\.fc3\{[^\}]*\}/g, '.fc3{top:75vh;right:12vw;animation:fl3 7s ease-in-out infinite}');
html = html.replace(/\.fc4\{[^\}]*\}/g, '.fc4{top:15vh;right:10vw;animation:fl4 9s ease-in-out infinite}');

fs.writeFileSync('public/index.html', html);
console.log('Fixed overlapping animation translations successfully!');
