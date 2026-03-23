const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const s_start = html.indexOf('<style>');
const s_end = html.indexOf('</style>');

if (s_start !== -1 && s_end !== -1) {
    const css = html.substring(s_start + 7, s_end);
    
    let openCommentCount = (css.match(/\/\*/g) || []).length;
    let closeCommentCount = (css.match(/\*\//g) || []).length;
    
    console.log('Open Comment counts:', openCommentCount);
    console.log('Close comment counts:', closeCommentCount);
    
    if (openCommentCount !== closeCommentCount) {
        console.log('UNMATCHED CSS COMMENTS!');
    } else {
        console.log('CSS Comments are BALANCED!');
    }
} else {
    console.log('Missing opening style nodes.');
}
