const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

let match = html.substring(Math.max(0, html.indexOf('</style>') - 200), html.indexOf('</style>') + 200);

console.log('--- CONTENT AROUND </style> ---');
console.log(match);
console.log('--- END ---');
