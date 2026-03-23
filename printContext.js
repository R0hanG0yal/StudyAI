const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

let match = html.substring(Math.max(0, html.indexOf('style.transition') - 1000), html.indexOf('style.transition') + 400);

console.log('--- CONTENT AROUND LINE 1521 ---');
console.log(match);
console.log('--- END ---');
