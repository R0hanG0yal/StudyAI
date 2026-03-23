const fs = require('fs');
const file = 'c:\\Users\\pc\\OneDrive\\Desktop\\studyai - Copy\\public\\index.html';
let content = fs.readFileSync(file, 'utf-8');

// Isolate .stats and .pills
const statsStart = content.indexOf('<div class="stats');
const pillsEnd = content.indexOf('</div>', content.indexOf('<div class="pills') + 10) + 6; 
const ctasStart = content.indexOf('<div class="ctas');

if (statsStart !== -1 && ctasStart !== -1) {
    const statsAndPills = content.substring(statsStart, ctasStart);
    
    // Remove from hero
    content = content.replace(statsAndPills, '');
    
    // Create Dashboard Card outer wrap
    const dashboardCard = `
      <div class="dashboard-card ai d3">
        <div class="card-dots">
          <div class="dot dot-r"></div>
          <div class="dot dot-y"></div>
          <div class="dot dot-g"></div>
        </div>
        ` + statsAndPills + `
      </div>
    `;

    // Insert dashboard card just after `.hero` container closes (line 1525 closing </div>)
    // Let's find exactly `</div>\r\n\r\n  </div>` which closes .hero then closes .wrap
    const heroEndIdx = content.indexOf('</div>\n\n  </div>'); // Wait, check newline variation
    const heroEndIdxFallback = content.indexOf('</div>\r\n\r\n  </div>');

    if (heroEndIdx !== -1) {
        content = content.replace('</div>\n\n  </div>', '</div>\n\n' + dashboardCard + '\n  </div>');
    } else if (heroEndIdxFallback !== -1) {
        content = content.replace('</div>\r\n\r\n  </div>', '</div>\r\n\r\n' + dashboardCard + '\r\n  </div>');
    } else {
        // Just insert right before `<!-- ══ AUTH SECTION ══ -->` if wrap closes there
        content = content.replace('<!-- ══ AUTH SECTION ══ -->', dashboardCard + '\n\n  <!-- ══ AUTH SECTION ══ -->');
    }
}

fs.writeFileSync(file, content, 'utf-8');
console.log('HTML columns isolated successfully.');
