const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Standardizing tags
// Let's count again
let opens = [];
let closes = [];

let idx = html.indexOf('<style>');
while (idx !== -1) {
  opens.push(idx);
  idx = html.indexOf('<style>', idx + 1);
}

let c_idx = html.indexOf('</style>');
while (c_idx !== -1) {
  closes.push(c_idx);
  c_idx = html.indexOf('</style>', c_idx + 1);
}

console.log('Opens at:', opens);
console.log('Closes at:', closes);

if (opens.length > closes.length) {
  console.log('Missing closing tag somewhere!');
  // Let's print document fragments before and after </head>
  const headIdx = html.indexOf('</head>');
  console.log('</head> is at:', headIdx);
  
  // Is </head> after the last <style>?
  if (opens[opens.length - 1] < headIdx) {
      console.log('Last <style> is BEFORE </head>. Appending </style> right before </head>');
      // We must insert </style> before </head> IF there isn't one there already.
      // Wait, closes might contain a close tag that is in the middle somewhere!
      // To represent a single monolithic block properly, let's inject </style> at the very end of the head block if unmatched.
      html = html.substring(0, headIdx) + '</style>\n' + html.substring(headIdx);
      fs.writeFileSync('public/index.html', html);
      console.log('Injected Style closed tag!');
  }
}
if (opens.length < closes.length) {
  console.log('Extra close tag somewhere!');
}
if (opens.length === closes.length) {
  console.log('Tagged weights ARE MATCHED perfectly!');
}
