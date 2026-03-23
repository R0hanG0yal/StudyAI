const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

let match = html.substring(Math.max(0, 28600 - 200), Math.min(html.length, 28600 + 200));

console.log('--- CONTENT AROUND INDEX 28600 ---');
console.log(match);
console.log('--- END ---');
