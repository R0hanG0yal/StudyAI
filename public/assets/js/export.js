/* ============================================================
   STUDYAI — export.js  (Part 9)
   Export notes to Markdown, PDF (print), JSON, clipboard.
   Uses browser's print API for PDF (no external library needed).
   ============================================================ */

const Exporter = (function() {

  // ── Export single note as Markdown ────────────────────
  function noteToMarkdown(note) {
    const lines = [
      `# ${note.title || 'Untitled'}`,
      ``,
      `> **Folder:** ${note.folder || 'General'}  `,
      note.tags?.length ? `> **Tags:** ${note.tags.join(', ')}  ` : '',
      `> **Last updated:** ${note.updated ? new Date(note.updated).toLocaleString() : 'Unknown'}`,
      ``,
      `---`,
      ``,
      note.content || '',
    ];
    return lines.filter(l => l !== null).join('\n');
  }

  // ── Download as file ──────────────────────────────────
  function download(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ── Export note as Markdown file ──────────────────────
  function exportNoteMarkdown(note) {
    const md = noteToMarkdown(note);
    const filename = (note.title || 'note').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.md';
    download(md, filename, 'text/markdown');
  }

  // ── Export note as PDF (print dialog) ─────────────────
  function exportNotePDF(note) {
    const content = noteToMarkdown(note);
    const html = _markdownToSimpleHTML(content);

    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      showToast && showToast('Pop-up blocked. Allow pop-ups and try again.', 'warning');
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${_esc(note.title || 'Note')} — StudyAI</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.8;color:#1a1d2e;padding:48px;max-width:780px;margin:0 auto}
    h1{font-size:1.8rem;font-weight:800;margin-bottom:8px;color:#1a1d2e}
    h2{font-size:1.2rem;font-weight:700;margin:20px 0 8px;color:#3d4166;border-bottom:1px solid #e8eaf0;padding-bottom:5px}
    h3{font-size:1rem;font-weight:700;margin:16px 0 6px}
    p{margin-bottom:10px}
    ul,ol{padding-left:20px;margin-bottom:10px}
    li{margin-bottom:4px}
    code{background:#f3f4f7;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:.88em}
    pre{background:#f3f4f7;padding:14px;border-radius:8px;overflow-x:auto;margin:10px 0}
    pre code{background:none;padding:0}
    blockquote{border-left:3px solid #667eea;padding:8px 14px;margin:10px 0;background:#f0f2ff;border-radius:0 8px 8px 0;color:#5b4d7a}
    strong{font-weight:700}
    em{font-style:italic}
    hr{border:none;border-top:1px solid #e8eaf0;margin:20px 0}
    .meta{color:#8b90b3;font-size:.82rem;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e8eaf0}
    .footer{margin-top:32px;padding-top:14px;border-top:1px solid #e8eaf0;text-align:center;font-size:.74rem;color:#b8bacc}
    @media print{body{padding:24px}@page{margin:1cm}}
  </style>
</head>
<body>
  <h1>${_esc(note.title || 'Untitled')}</h1>
  <div class="meta">
    <strong>Folder:</strong> ${_esc(note.folder || 'General')}
    ${note.tags?.length ? `&nbsp;&middot;&nbsp; <strong>Tags:</strong> ${note.tags.map(_esc).join(', ')}` : ''}
    &nbsp;&middot;&nbsp; <strong>Updated:</strong> ${note.updated ? new Date(note.updated).toLocaleString() : 'Unknown'}
  </div>
  ${html}
  <div class="footer">Exported from StudyAI &middot; ${new Date().toLocaleDateString()}</div>
  <script>window.onload=()=>{ window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  }

  // ── Export all notes as JSON ───────────────────────────
  async function exportAllNotes() {
    const data  = await getData();
    const notes = data.notes || [];
    if (!notes.length) { showToast && showToast('No notes to export', 'warning'); return; }
    const json  = JSON.stringify({ version:'studyai-1.0', exported: new Date().toISOString(), notes }, null, 2);
    download(json, `studyai-notes-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    showToast && showToast(`${notes.length} notes exported!`, 'success');
  }

  // ── Export all notes as Markdown bundle ───────────────
  async function exportAllMarkdown() {
    const data  = await getData();
    const notes = data.notes || [];
    if (!notes.length) { showToast && showToast('No notes to export', 'warning'); return; }
    const combined = notes.map(n => noteToMarkdown(n)).join('\n\n---\n\n');
    download(combined, `studyai-notes-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
    showToast && showToast(`${notes.length} notes exported as Markdown!`, 'success');
  }

  // ── Export quiz results ────────────────────────────────
  async function exportQuizResults() {
    const data    = await getData();
    const quizzes = data.quizzes || [];
    if (!quizzes.length) { showToast && showToast('No quiz results to export', 'warning'); return; }
    const csv = [
      ['Title','Subject','Score','Questions','Difficulty','Date'].join(','),
      ...quizzes.map(q => [
        `"${(q.title||'Quiz').replace(/"/g,'""')}"`,
        q.subject || 'General',
        q.score || 0,
        q.total || 0,
        q.difficulty || 'medium',
        q.created ? new Date(q.created).toLocaleDateString() : '',
      ].join(','))
    ].join('\n');
    download(csv, `studyai-quiz-results-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showToast && showToast('Quiz results exported as CSV!', 'success');
  }

  // ── Share note via Web Share API ──────────────────────
  async function shareNote(note) {
    const md = noteToMarkdown(note);
    if (navigator.share) {
      try {
        await navigator.share({ title: note.title || 'Study Note', text: md.slice(0, 2000) });
        return;
      } catch (e) {
        if (e.name !== 'AbortError') throw e;
      }
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(md);
    showToast && showToast('Note copied to clipboard!', 'success');
  }

  // ── Simple Markdown → HTML (for print) ───────────────
  function _markdownToSimpleHTML(md) {
    let html = md
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^# (.+)$/gm,  '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm,'<h3>$1</h3>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,   '<em>$1</em>')
      .replace(/^[-*] (.+)$/gm,  '<li>$1</li>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^---+$/gm, '<hr>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>');
    return `<p>${html}</p>`.replace(/<p>(<h[123]>)/g,'$1').replace(/(<\/h[123]>)<\/p>/g,'$1').replace(/<p><\/p>/g,'');
  }

  function _esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    noteToMarkdown,
    exportNoteMarkdown,
    exportNotePDF,
    exportAllNotes,
    exportAllMarkdown,
    exportQuizResults,
    shareNote,
    download,
  };

})();

// Make globally available
window.Exporter = Exporter;