const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Restore .h1 to fit-content only
content = content.replace(
`      max-width: fit-content;
      min-width: max-content;`,
`      max-width: fit-content;`
);

// 2. Reduce font size slightly for title to prevent overlap bleed
content = content.replace(
`      font-size: clamp(2.2rem, 3.6vw, 3.4rem);`,
`      font-size: clamp(2rem, 3.2vw, 2.9rem);`
);

// 3. Make .wrap Grid layout share columns better
content = content.replace(
`      grid-template-columns: 1.3fr 1fr;`,
`      grid-template-columns: 1.45fr 1fr;`
);

// 4. Reduce dashboard-card padding for compactness
content = content.replace(
`      padding: 35px;`,
`      padding: 25px;`
);

fs.writeFileSync(file, content, 'utf-8');
console.log('CSS Compact adjustments deployed.');
