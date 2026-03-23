const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Update css layout to restore two column split
content = content.replace(
`    .wrap {
      position: relative;
      z-index: 10;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-top: 80px;
    }`,
`    .wrap {
      position: relative;
      z-index: 10;
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      align-items: center;
      grid-gap: 40px;
      padding: 100px 80px 40px;
    }`
);

// 2. Adjust .hero to Left-aligned
content = content.replace(
`    .hero {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 60px 40px;
      position: relative;
      overflow: visible;
      max-width: 800px;
      margin: 0 auto;
    }`,
`    .hero {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      text-align: left;
      padding-right: 40px;
      position: relative;
      overflow: visible;
      max-width: 100%;
    }`
);

// 3. Remove centers
content = content.replace('justify-content: center;', 'justify-content: flex-start;'); // stats
content = content.replace('justify-content: center;', 'justify-content: flex-start;'); // pills
content = content.replace('justify-content: center;', 'justify-content: flex-start;'); // ctas

// 4. Add dashboard card CSS
if (!content.includes('.dashboard-card')) {
  content = content.replace('    .stats {', 
`    /* ── Dashboard card mockup right ── */
    .dashboard-card {
      background: rgba(255, 255, 255, .45);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: 1px solid rgba(255, 255, 255, .5);
      border-radius: 28px;
      padding: 35px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(180, 160, 210, .08);
      position: relative;
    }
    .card-dots {
      display: flex;
      gap: 6px;
      margin-bottom: 30px;
    }
    .dot {
      width: 9px; height: 9px; border-radius: 50%;
    }
    .dot-r { background: #ef4444; }
    .dot-y { background: #fbbf24; }
    .dot-g { background: #22c55e; }

    .stats {`);
}

fs.writeFileSync(file, content, 'utf-8');
console.log('CSS split grid adjusted.');
