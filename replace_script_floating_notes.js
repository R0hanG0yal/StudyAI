const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Swap fcard HTML elements to fnote (decorative)
const targetBlock = `  <!-- Floating stat cards -->
  <div class="fcard fc1">
    <div class="fcard-icon">🎯</div>
    <div class="fcard-lbl">Quiz Score</div>
    <div class="fcard-val">94%</div>
  </div>
  <div class="fcard fc2">
    <div class="fcard-icon">🔥</div>
    <div class="fcard-lbl">Study Streak</div>
    <div class="fcard-val">14 Days</div>
  </div>
  <div class="fcard fc3">
    <div class="fcard-icon">🃏</div>
    <div class="fcard-lbl">Cards Reviewed</div>
    <div class="fcard-val">248 Today</div>
  </div>
  <div class="fcard fc4">
    <div class="fcard-icon">⚡</div>
    <div class="fcard-lbl">Focus Time</div>
    <div class="fcard-val">4.2h</div>
  </div>`;

const replacementBlock = `  <!-- Floating Notes/Books -->
  <div class="fnote fn1">📖</div>
  <div class="fnote fn2">📝</div>
  <div class="fnote fn3">💡</div>
  <div class="fnote fn4">🧠</div>`;

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacementBlock);
} else {
  // Fallback replace per-element
  content = content.replace(/<div class="fcard[\s\S]*?<\/div>/g, (match) => {
    if (match.includes('fc1')) return '<div class="fnote fn1">📖</div>';
    if (match.includes('fc2')) return '<div class="fnote fn2">📝</div>';
    if (match.includes('fc3')) return '<div class="fnote fn3">💡</div>';
    if (match.includes('fc4')) return '<div class="fnote fn4">🧠</div>';
    return '';
  });
}

// 2. Add .fnote style definitions in CSS
if (!content.includes('.fnote')) {
  content = content.replace(
`    .fcard {
      position: absolute;
      padding: 14px 12px;
      pointer-events: none;
      border-radius: 16px;
      width: 105px;
      height: 120px;
      background: rgba(255, 255, 255, .65);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, .8);
      box-shadow: 0 8px 32px rgba(180, 160, 210, .2), 0 2px 8px rgba(0, 0, 0, .04);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      transform-style: preserve-3d;
      transition: all .3s ease;
    }`,
`    .fnote {
      position: absolute;
      width: 45px;
      height: 55px;
      background: rgba(255, 255, 255, .4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, .6);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 4px 16px rgba(180, 160, 210, .08);
      transform-style: preserve-3d;
      transition: all .3s ease;
      z-index: 1;
      pointer-events: none;
    }`
  );

  // Apply animations to .fnote instead of .fcard
  content = content.replace(`.fc1 {`, `.fn1 {`);
  content = content.replace(`.fc2 {`, `.fn2 {`);
  content = content.replace(`.fc3 {`, `.fn3 {`);
  content = content.replace(`.fc4 {`, `.fn4 {`);
}

fs.writeFileSync(file, content, 'utf-8');
console.log('Floating notes updated successfully.');
