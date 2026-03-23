const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

// 1. Isolate full Panel Block
const startIdx = content.indexOf('<!-- ══ AUTH PANEL ══ -->');
const endIdx = content.indexOf('</div>', content.indexOf('<div class="pswitch" id="pswitch">'));

if (startIdx !== -1 && endIdx !== -1) {
    const fullPanel = content.substring(startIdx, endIdx + 6) + '\n    </div>\n  </div>'; 
    // Wait, let's verify exact div count
    const panelBlockLength = content.substring(startIdx).indexOf('<!-- Testimonials Section -->');
    let panelBlock = content.substring(startIdx, startIdx + panelBlockLength);
    
    // Trim back to fit before Testimonials
    content = content.replace(panelBlock, '');
    
    // Smooth insertion outside wrap and inside body flow correctly above Testimonials, above Footer
    content = content.replace('<!-- Testimonials Section -->', 
    `<!-- ══ AUTH SECTION ══ -->\n  <div id="authSection" style="width:100%; display:flex; justify-content:center; padding: 0 20px;">\n  ` + panelBlock + `\n  </div>\n\n  <!-- Testimonials Section -->`);

}

fs.writeFileSync(file, content, 'utf-8');
console.log('HTML panels extract executed cleanly.');
