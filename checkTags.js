const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The HTML parser says there is an unclosed <style> tag or similar.
// Let's count <style> and </style> and replace duplicate fragments cleanly.

let openCount = (html.match(/<style>/g) || []).length;
let closeCount = (html.match(/<\/style>/g) || []).length;

console.log('Original <style> count:', openCount);
console.log('Original </style> count:', closeCount);

if (openCount !== closeCount) {
  console.log('UNMATCHED TAGS DETECTED!');
  
  // Let's re-read and replace specifically any broken closing sequences 
  // Introduced during previous script updates
  
  // Find if some scripts injected tags like `<style>` without matching `</style>` 
  // inside string replace.
  
  // Actually, I can just rebuild all the core style components safely.
  // Let me output the exact locations inside <style> for manual verification
}

// Clean up: 
// Sometimes multiple scripts over-injected <style> blocks or broke standard DOM structure.
// I will output a small parser block to reconstruct the file flawlessly.
const startStyle = html.indexOf('<style>');
const endStyle = html.lastIndexOf('</style>');

console.log('Indices:', startStyle, endStyle);
if (startStyle > -1 && endStyle > -1) {
    console.log('Styling text span exists.');
}
