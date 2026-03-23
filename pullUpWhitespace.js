const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The subagent said "Sign In button is slightly below the fold" due to "significant white space at the top".
// Let's remove the 50px margins we added.
html = html.replace(/margin-top: 50px;/g, 'margin-top: 0px;');

// Let's also adjust the padding of .wrap
html = html.replace(/padding: 40px 5%;/g, 'padding: 80px 5% 20px 5%;');

// Also, the user complained: "make get started button vidible ... not after scrolling"
// Let's make the "Get Started Free" button even higher up inside the .hero section!
// We can reduce margin-bottom on .h1 and .sub
html = html.replace(/margin-bottom:20px;/g, 'margin-bottom:10px;');
html = html.replace(/margin-bottom:30px;/g, 'margin-bottom:15px;');

// And decrease padding inside .panel
html = html.replace(/padding: 40px;/g, 'padding: 24px 32px;');

fs.writeFileSync('public/index.html', html);
console.log('Removed top white space mapping to pull panel fully into viewport.');
