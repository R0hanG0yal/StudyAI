const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

let o_script = (html.match(/<script>/g) || []).length;
let c_script = (html.match(/<\/script>/g) || []).length;

console.log('Open <script>:', o_script);
console.log('Close </script>:', c_script);

let o_style = (html.match(/<style>/g) || []).length;
let c_style = (html.match(/<\/style>/g) || []).length;

console.log('Open <style>:', o_style);
console.log('Close </style>:', c_style);

let o_div = (html.match(/<div/g) || []).length;
let c_div = (html.match(/<\/div>/g) || []).length;

console.log('Open <div>:', o_div);
console.log('Close </div>:', c_div);
