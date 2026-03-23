const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Update .wrap Grid to Flex Centered
content = content.replace(
`    .wrap {
      position: relative;
      z-index: 10;
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      align-items: center;
      grid-template-areas: "center right";
      padding-top: 80px;
    }`,
`    .wrap {
      position: relative;
      z-index: 10;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-top: 80px;
    }`
);

// 2. Update .hero to fully centered flex
content = content.replace(
`    .hero {
      grid-area: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      padding: 60px 50px 60px 80px;
      position: relative;
      overflow: visible;
      max-width: 100%;
    }`,
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
    }`
);

// 3. Update stats, pills, ctas to justify-content: center
content = content.replace(
`    .stats {
      display: flex;
      gap: 28px;
      margin-bottom: 32px
    }`,
`    .stats {
      display: flex;
      gap: 28px;
      margin-bottom: 32px;
      justify-content: center;
    }`
);

content = content.replace(
`    .pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 36px
    }`,
`    .pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 36px;
      justify-content: center;
    }`
);

content = content.replace(
`    .ctas {
      display: flex;
      gap: 12px;
      flex-wrap: wrap
    }`,
`    .ctas {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }`
);

// 4. Update .panel block so it becomes section card
content = content.replace(
`    .panel {
      grid-area: right;
      width: 100%;
      height: 100vh;
      background: rgba(255, 255, 255, .45);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border-left: 1px solid rgba(255, 255, 255, .6);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 44px;
      position: relative;
      transition: transform .08s ease;
      transform-style: preserve-3d;
    }`,
`    .panel {
      width: 100%;
      max-width: 440px;
      margin: 60px auto;
      background: rgba(255, 255, 255, .45);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border: 1px solid rgba(255, 255, 255, .6);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 44px;
      position: relative;
      border-radius: 24px;
      box-shadow: 0 12px 36px rgba(180, 160, 210, .15);
      transition: transform .08s ease;
      transform-style: preserve-3d;
    }`
);

fs.writeFileSync(file, content, 'utf-8');
console.log('CSS centers adjusted cleanly.');
