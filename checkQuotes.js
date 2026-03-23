const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const s_start = html.indexOf('<script>');
const s_end = html.lastIndexOf('</script>');

if (s_start !== -1 && s_end !== -1) {
    const js = html.substring(s_start+8, s_end);
    let quoteCount = 0;
    let s_quoteCount = 0;
    
    for (let i = 0; i < js.length; i++) {
        if (js[i] === '"' && js[i-1] !== '\\') quoteCount++;
        if (js[i] === "'" && js[i-1] !== '\\') s_quoteCount++;
    }
    
    console.log('Double quotes count:', quoteCount);
    console.log('Single quotes count:', s_quoteCount);
    
    if (quoteCount % 2 !== 0) {
        console.log('DOUBLE QUOTES ARE NOT BALANCED!');
    }
    if (s_quoteCount % 2 !== 0) {
        console.log('SINGLE QUOTES ARE NOT BALANCED!');
    }
} else {
    console.log('No <script> structure');
}
