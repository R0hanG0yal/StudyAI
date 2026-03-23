const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The "Get Started" button text isn't showing up because of a previous formatting error.
// We explicitly reconstruct the container using backticks safely.
const newBtn = `<button class="btn-p" onclick="document.getElementById('loginEmail').focus()" style="color: #ffffff !important; display: inline-flex; align-items: center; justify-content: center;">🚀 Get Started Free</button>`;
html = html.replace(/<button class="btn-p"[\s\S]*?<\/button>/, newBtn);

// Clear any possibility of outer margin glows or inset shadows
const finalNuclear = `
<style id="final-override">
  body, html, #bg, .wrap {
    box-shadow: none !important;
    background-image: none !important;
    border: none !important;
    outline: none !important;
  }
  .features-section, .faq-section, .testimonials-section {
    box-shadow: none !important;
    background: transparent !important;
  }
</style>
`;

if (html.includes('id="final-override"')) {
  html = html.replace(/<style id="final-override">[\s\S]*?<\/style>/, finalNuclear);
} else {
  html = html.replace('</head>', finalNuclear + '\\n</head>');
}

fs.writeFileSync('public/index.html', html);
console.log('Fixed btn-p text and flushed entire pseudo glows');
