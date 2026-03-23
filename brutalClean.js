const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// The "blur" around the edges could be a leftover overlay or a box-shadow.
// Let's add a brutal final cleanup to ensure absolute minimalism on the wrapper.
const brutalClean = `
<style id="brutal-clean">
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important; /* PREVENT SCROLLING ENTIRELY */
    box-shadow: none !important;
    background: #fdfbf7 !important;
  }
  
  /* Kill all pseudo-elements creating glows globally, except for standard UI elements */
  body::before, body::after, .wrap::before, .wrap::after, .hero::before, .hero::after {
    display: none !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  
  /* Shrink text and paddings heavily so it fits 100vh on a standard laptop screen */
  .top-header { display: none !important; } /* Hide the top header to save space entirely. We have title on the left anyway */
  
  .wrap {
    padding: 20px !important;
    gap: 20px !important;
    height: 100vh !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-sizing: border-box !important;
  }
  
  .hero {
    margin-top: 0 !important;
    padding: 0 40px !important;
  }
  
  .panel {
    margin-top: 0 !important;
    padding: 30px !important;
    transform: scale(0.95) !important; /* Scale it down slightly so it fits inside standard viewports perfectly */
  }
  
  .h1 { font-size: clamp(2rem, 3.5vw, 3rem) !important; margin-bottom: 5px !important; }
  .sub { font-size: 1rem !important; margin-bottom: 15px !important; max-width: 500px !important; }
  
  .pills { margin-bottom: 10px !important; gap: 6px !important; }
  .pill { font-size: 0.75rem !important; padding: 4px 10px !important; }
  
  .ctas { margin-top: 15px !important; }
  .btn-p, .btn-s { padding: 10px 20px !important; font-size: 0.9rem !important; }
</style>
`;

if (!html.includes('id="brutal-clean"')) {
  html = html.replace('</head>', brutalClean + '\n</head>');
} else {
  html = html.replace(/<style id="brutal-clean">[\s\S]*?<\/style>/, brutalClean);
}

fs.writeFileSync('public/index.html', html);
console.log("Brutally cleaned layout to force it entirely inside 100vh!");
