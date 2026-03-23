const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\chat.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Swap beige chat-sidebar panel backdrop 
content = content.replace(
`    .chat-sidebar {
      background: rgba(232,228,217,.7);
      border-right: 1px solid rgba(107,124,94,.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      backdrop-filter: blur(12px);
    }`,
`    .chat-sidebar {
      background: rgba(255, 255, 255, .18);
      border-right: 1px solid rgba(180, 160, 210, .15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }`
);

// 2. Adjust Active session-item highlights
content = content.replace(
`    .session-item.active {
      background: linear-gradient(135deg,rgba(107,124,94,.12),rgba(163,177,138,.1));
      border-color: rgba(107,124,94,.2);
    }`,
`    .session-item.active {
      background: linear-gradient(135deg, rgba(124, 58, 237, .13), rgba(249, 168, 212, .15));
      border-color: rgba(192, 132, 252, .3);
    }`
);

// 3. Adjust hover effect
content = content.replace(
`    .session-item:hover { background: rgba(107,124,94,.06); }`,
`    .session-item:hover { background: rgba(124, 58, 237, .06); }`
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Chat style settings updated.');
