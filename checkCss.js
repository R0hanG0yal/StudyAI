const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const start = html.indexOf('<style>');
const end = html.indexOf('</style>');

if (start !== -1 && end !== -1) {
  const css = html.substring(start + 7, end);
  
  let braceCount = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') braceCount++;
    if (css[i] === '}') braceCount--;
    
    if (braceCount < 0) {
      console.log('Broken CSS brace at position:', i);
      console.log('Context:', css.substring(Math.max(0, i - 40), Math.min(css.length, i + 40)));
      break;
    }
  }
  
  console.log('Final brace balance:', braceCount);
  if (braceCount !== 0) {
    console.log('Braces DO NOT MATCH!');
  }
}
