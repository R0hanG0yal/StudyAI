const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

let wrapIdx = html.indexOf('<div class="wrap">');
if (wrapIdx === -1) wrapIdx = html.indexOf('<div class="wrap');

if (wrapIdx > -1) {
    console.log('Wrap found! Printing next 3000 chars...');
    console.log(html.substring(wrapIdx, wrapIdx + 3000));
} else {
    console.log('Wrap NOT found!');
}
