const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

// bounded Sunrise looping curve
content = content.replace('const sunY = (h * 0.55) - (time * 8);', 'const sunY = (h * 0.6) - Math.sin(time * 0.5) * 50;');

fs.writeFileSync(file, content, 'utf-8');
console.log('Sun bounds capped.');
