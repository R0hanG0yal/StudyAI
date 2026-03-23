const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const sIdx = html.indexOf('<div class="hero');
const eIdx = html.indexOf('<!-- ════════════════ AUTH', sIdx + 1);

if (sIdx > -1 && eIdx > -1) {
    console.log('Hero block found!');
    console.log(html.substring(sIdx, eIdx).substring(0, 2000)); // Printing the first chunk to inspect
} else {
    console.log('Block not found');
}
