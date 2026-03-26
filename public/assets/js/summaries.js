/* ============================================================
   STUDYAI — SUMMARIES & AI TOOLS
   File: public/assets/js/summaries.js
   Tabs: Summaries | Topics | Questions | Formulas |
         Roadmap | Compare | One-Night | YouTube
   ============================================================ */
'use strict';

const SM = { data: {} };

/* ── ENTRY ── */
async function initSummaries() {
  SM.data = await apiGet('/data').catch(() => ({}));
  _populateSources();
  renderSumGrid();
  _wireTabs();
}

/* ── Populate all source dropdowns ── */
function _populateSources() {
  const notes = SM.data.notes || [];
  const opts  = '<option value="all">All Notes</option>' +
    notes.map(n => '<option value="' + n.id + '">' + escHtml(n.title || 'Untitled') + '</option>').join('');
  ['sum-src','topic-src','q-src','formula-src','on-src'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
}

/* ── Tab wiring ── */
function _wireTabs() {
  document.querySelectorAll('#sum-tabs .tab').forEach(function(tab) {
    tab.onclick = function() {
      document.querySelectorAll('#sum-tabs .tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var v = tab.dataset.sv;
      ['list','topics','questions','formulas','roadmap','compare','onenight','youtube'].forEach(function(x) {
        var el = document.getElementById('sv-' + x);
        if (el) el.style.display = (x === v) ? 'block' : 'none';
      });
      _populateSources();
    };
  });
}

/* ── Resolve source text from note id ── */
function _srcText(srcId) {
  var notes = SM.data.notes || [];
  if (!srcId || srcId === 'all') return notes.map(function(n) { return n.content || ''; }).join('\n\n');
  var note = notes.find(function(n) { return n.id === srcId; });
  return note ? (note.content || '') : '';
}

/* ════════════════════════════════════════════════════════════
   SUMMARIES LIST
   ════════════════════════════════════════════════════════════ */
function renderSumGrid() {
  var sums = (SM.data.summaries || []).slice().sort(function(a, b) { return b.created - a.created; });
  var el   = document.getElementById('sum-grid');
  if (!el) return;

  if (!sums.length) {
    el.innerHTML = '<div style="grid-column:1/-1">' + emptyState('📄', 'No summaries yet', 'Generate one using the button above.') + '</div>';
    return;
  }

  var typeMap = {
    general : ['badge-purple', 'General'],
    bullet  : ['badge-green',  'Bullet Points'],
    chapter : ['badge-cyan',   'Chapter-wise'],
    exam    : ['badge-red',    'Exam Focus'],
    simple  : ['badge-orange', 'Simple'],
  };

  el.innerHTML = sums.map(function(s) {
    var pair    = typeMap[s.type] || ['badge-purple', 'General'];
    var bc      = pair[0], tl = pair[1];
    var raw     = typeof s.content === 'string' ? s.content : JSON.stringify(s.content || '');
    var preview = raw.replace(/[#*`_]/g, '').substring(0, 140);
    return '<div class="sum-card ' + (s.type || 'general') + '">' +
      '<div class="flex items-center between mb-3">' +
        '<div class="font-bold text-sm">' + escHtml(s.noteTitle || 'Summary') + '</div>' +
        '<span class="badge ' + bc + '">' + tl + '</span>' +
      '</div>' +
      '<div class="text-xs text-muted clamp-3 mb-3" style="line-height:1.6">' + escHtml(preview) + '</div>' +
      '<div class="flex items-center between mt-2">' +
        '<span class="text-xs text-muted">' + timeAgo(s.created) + '</span>' +
        '<div class="flex gap-2">' +
          '<button class="btn btn-secondary btn-sm" onclick="viewSummary(\'' + s.id + '\')">View</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="exportSummary(\'' + s.id + '\')">📤</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="deleteSummary(\'' + s.id + '\')">🗑️</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function viewSummary(id) {
  var s = (SM.data.summaries || []).find(function(x) { return x.id === id; });
  if (!s) return;
  var content = typeof s.content === 'string'
    ? s.content
    : (s.content || []).map(function(c) { return '## ' + c.title + '\n\n' + c.summary; }).join('\n\n');
  document.getElementById('view-sum-title').textContent = s.noteTitle || 'Summary';
  document.getElementById('view-sum-body').innerHTML    = mdToHtml(content);
  openModal('modal-view-sum');
}

function exportSummary(id) {
  var s = (SM.data.summaries || []).find(function(x) { return x.id === id; });
  if (!s) return;
  var content = typeof s.content === 'string' ? s.content : JSON.stringify(s.content, null, 2);
  downloadMD('# ' + (s.noteTitle || 'Summary') + '\nType: ' + s.type + '\n\n---\n\n' + content,
    (s.noteTitle || 'summary').replace(/\s+/g, '_') + '.md');
  showToast('Summary exported!', 'success');
}

async function deleteSummary(id) {
  if (!confirm('Delete this summary?')) return;
  SM.data.summaries = (SM.data.summaries || []).filter(function(x) { return x.id !== id; });
  await apiPost('/data/summaries', { value: SM.data.summaries });
  renderSumGrid();
  showToast('Deleted.', 'info');
}

function exportViewedSummary() {
  var title = document.getElementById('view-sum-title') ? document.getElementById('view-sum-title').textContent : 'Summary';
  var body  = document.getElementById('view-sum-body')  ? document.getElementById('view-sum-body').innerText    : '';
  if (!body.trim()) return;
  downloadMD('# ' + title + '\n\n' + body, title.replace(/\s+/g, '_') + '.md');
  showToast('Exported!', 'success');
}

/* ════════════════════════════════════════════════════════════
   GENERATE SUMMARY
   ════════════════════════════════════════════════════════════ */
async function doGenSummary() {
  var srcId = document.getElementById('sum-src')  ? document.getElementById('sum-src').value  : 'all';
  var type  = document.getElementById('sum-type') ? document.getElementById('sum-type').value : 'general';
  var text  = _srcText(srcId);
  if (!text.trim()) return showToast('No content found. Add notes first!', 'error');

  var btn = document.getElementById('btn-gen-sum');
  if (btn) { btn.textContent = '⏳ Generating…'; btn.disabled = true; }

  try {
    var noteTitle = srcId === 'all'
      ? 'All Notes'
      : ((SM.data.notes || []).find(function(n) { return n.id === srcId; }) || {}).title || 'Notes';
    var data = await apiPost('/ai/summarise', { text: text, type: type, noteTitle: noteTitle });

    var s = { id: genId(), noteId: srcId, noteTitle: noteTitle, type: type, content: data.summary, created: Date.now() };
    SM.data.summaries = [s].concat(SM.data.summaries || []);
    await apiPost('/data/summaries', { value: SM.data.summaries });

    closeModal('modal-gen-sum');
    renderSumGrid();
    showToast('Summary generated!', 'success');
    viewSummary(s.id);
  } catch (e) {
    showToast('AI Error: ' + e.message, 'error');
  } finally {
    if (btn) { btn.textContent = 'Generate Summary'; btn.disabled = false; }
  }
}

/* ════════════════════════════════════════════════════════════
   TOPIC EXTRACTION
   ════════════════════════════════════════════════════════════ */
async function doExtractTopics() {
  var srcEl = document.getElementById('topic-src');
  var text  = _srcText(srcEl ? srcEl.value : 'all');
  if (!text.trim()) return showToast('No content.', 'error');
  var el = document.getElementById('topics-result');
  if (el) el.innerHTML = spinnerHTML('Extracting topics with AI…');

  try {
    var data   = await apiPost('/ai/extract-topics', { text: text });
    var topics = data.topics || [];
    if (!topics.length) { el.innerHTML = emptyState('🏷️', 'No topics found', 'Add more content.'); return; }

    var html = '<div class="grid-2" style="gap:10px;margin-top:4px">';
    topics.forEach(function(t) {
      html += '<div class="card" style="padding:14px">';
      html += '<div class="font-bold text-sm mb-1" style="color:var(--purple)">' + escHtml(t.topic) + '</div>';
      html += '<div class="text-xs text-muted mb-2">Relevance: ' + t.relevance + '/10</div>';
      html += '<div class="flex flex-wrap gap-2">';
      (t.subtopics || []).forEach(function(sub) {
        html += '<span class="badge badge-cyan" style="font-size:.62rem">' + escHtml(sub) + '</span>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = emptyState('❌', 'Error', e.message);
  }
}

/* ════════════════════════════════════════════════════════════
   QUESTIONS GENERATOR
   ════════════════════════════════════════════════════════════ */
async function doGenQuestions() {
  var srcEl  = document.getElementById('q-src');
  var diffEl = document.getElementById('q-diff');
  var text   = _srcText(srcEl ? srcEl.value : 'all');
  var diff   = diffEl ? diffEl.value : 'medium';
  if (!text.trim()) return showToast('No content.', 'error');
  var el = document.getElementById('questions-result');
  if (el) el.innerHTML = spinnerHTML('Generating questions with AI…');

  try {
    var data = await apiPost('/ai/questions', { text: text, count: 12, difficulty: diff });
    var qs   = data.questions || [];
    if (!qs.length) { el.innerHTML = emptyState('❓', 'No questions generated', 'Add more notes.'); return; }

    var html = '<div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">' +
      '<span class="text-sm font-bold">' + qs.length + ' questions generated</span>' +
      '<button class="btn btn-secondary btn-sm" onclick="_exportQuestions()">📤 Export</button>' +
    '</div><div style="display:flex;flex-direction:column;gap:10px">';

    qs.forEach(function(q, i) {
      html += '<div class="card" style="padding:14px">';
      html += '<div class="flex gap-2 mb-2 items-center">';
      html += '<span class="badge badge-purple" style="font-size:.62rem;flex-shrink:0">Q' + (i + 1) + '</span>';
      html += '<div class="font-bold text-sm">' + escHtml(q.q) + '</div>';
      html += '</div>';
      html += '<div id="qa-' + i + '" style="display:none;padding:9px 12px;background:rgba(67,233,123,.07);border:1px solid rgba(67,233,123,.18);border-radius:9px;font-size:.8rem;color:var(--green);margin-bottom:7px;line-height:1.6">';
      html += '<strong>Answer:</strong> ' + escHtml(q.a);
      html += '</div>';
      html += '<button class="btn btn-secondary btn-sm" onclick="toggleQA(' + i + ', this)">Show Answer ▾</button>';
      html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
    window._lastQs = qs;
  } catch (e) {
    el.innerHTML = emptyState('❌', 'Error', e.message);
  }
}

function toggleQA(i, btn) {
  var el = document.getElementById('qa-' + i);
  if (!el) return;
  var showing = el.style.display === 'block';
  el.style.display  = showing ? 'none' : 'block';
  btn.textContent   = showing ? 'Show Answer ▾' : 'Hide Answer ▴';
}

function _exportQuestions() {
  var qs = window._lastQs;
  if (!qs || !qs.length) return;
  var text = '# Study Questions\n\n' + qs.map(function(q, i) {
    return '**Q' + (i + 1) + '.** ' + q.q + '\n\n*Answer:* ' + q.a + '\n';
  }).join('\n');
  downloadMD(text, 'questions.md');
  showToast('Exported!', 'success');
}

/* ════════════════════════════════════════════════════════════
   FORMULA EXTRACTOR
   ════════════════════════════════════════════════════════════ */
async function doExtractFormulas() {
  var srcEl = document.getElementById('formula-src');
  var text  = _srcText(srcEl ? srcEl.value : 'all');
  if (!text.trim()) return showToast('No content.', 'error');
  var el = document.getElementById('formulas-result');
  if (el) el.innerHTML = spinnerHTML('Extracting formulas…');

  try {
    var data = await apiPost('/ai/extract-formulas', { text: text });
    var fs   = data.formulas || [];
    if (!fs.length) { el.innerHTML = emptyState('📐', 'No formulas found', 'Write equations like "T = O(n log n)" in notes.'); return; }

    var html = '<div class="text-sm font-bold mb-3">' + fs.length + ' formula' + (fs.length !== 1 ? 's' : '') + ' found</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    fs.forEach(function(f) {
      html += '<div class="card" style="padding:12px">';
      html += '<code style="display:block;background:rgba(255,255,255,.05);padding:6px 12px;border-radius:7px;font-size:.84rem;color:var(--cyan);margin-bottom:6px;font-family:var(--font-mono)">' + escHtml(f.formula) + '</code>';
      if (f.context && f.context !== f.formula) {
        html += '<div class="text-xs text-muted">' + escHtml(f.context.substring(0, 120)) + '</div>';
      }
      html += '<span class="badge badge-purple" style="font-size:.6rem;margin-top:6px">' + escHtml(f.type || 'formula') + '</span>';
      html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = emptyState('❌', 'Error', e.message);
  }
}

/* ════════════════════════════════════════════════════════════
   ROADMAP GENERATOR
   ════════════════════════════════════════════════════════════ */
async function doGenRoadmap() {
  var subjectEl = document.getElementById('rm-subject');
  var dateEl    = document.getElementById('rm-date');
  var levelEl   = document.getElementById('rm-level');
  var subject   = subjectEl ? subjectEl.value.trim() : '';
  var date      = dateEl    ? dateEl.value            : '';
  var level     = levelEl   ? levelEl.value           : 'intermediate';

  if (!subject) return showToast('Enter a subject.', 'error');
  if (!date)    return showToast('Select an exam date.', 'error');
  if (new Date(date) < new Date()) return showToast('Exam date must be in the future.', 'error');

  var el = document.getElementById('roadmap-result');
  if (el) el.innerHTML = spinnerHTML('Building your personalised roadmap…');

  try {
    var data    = await apiPost('/ai/roadmap', { subject: subject, examDate: date, level: level });
    var daysLeft= Math.max(1, Math.ceil((new Date(date) - new Date()) / 86400000));

    el.innerHTML =
      '<div class="card card-gradient mb-3">' +
        '<div class="font-bold mb-1">' + escHtml(subject) + ' — Exam Preparation Roadmap</div>' +
        '<div class="text-xs text-muted">' + daysLeft + ' days remaining · Level: ' + level + '</div>' +
      '</div>' +
      '<div class="card" style="line-height:1.85">' + mdToHtml(data.roadmap) + '</div>' +
      '<button class="btn btn-secondary btn-sm mt-3" onclick="_exportRoadmap()">📤 Export Roadmap</button>';

    window._lastRoadmap = { subject: subject, roadmap: data.roadmap };
  } catch (e) {
    el.innerHTML = emptyState('❌', 'Error', e.message);
  }
}

function _exportRoadmap() {
  var r = window._lastRoadmap;
  if (!r) return;
  downloadMD('# ' + r.subject + ' — Exam Roadmap\n\n' + r.roadmap, 'roadmap.md');
  showToast('Exported!', 'success');
}

/* ════════════════════════════════════════════════════════════
   COMPARE TOPICS
   ════════════════════════════════════════════════════════════ */
async function doCompare() {
  var aEl    = document.getElementById('cmp-a');
  var bEl    = document.getElementById('cmp-b');
  var topicA = aEl ? aEl.value.trim() : '';
  var topicB = bEl ? bEl.value.trim() : '';
  if (!topicA || !topicB) return showToast('Enter both topics.', 'error');

  var el = document.getElementById('compare-result');
  if (el) el.innerHTML = spinnerHTML('Comparing "' + topicA + '" vs "' + topicB + '"…');

  try {
    var ctx  = (SM.data.notes || []).map(function(n) { return n.content || ''; }).join('\n\n').substring(0, 3000);
    var data = await apiPost('/ai/compare', { topicA: topicA, topicB: topicB, context: ctx });
    var cmp  = data.comparison || {};

    var html =
      '<div class="grid-2 mb-3">' +
        '<div class="card" style="border-left:3px solid var(--purple)">' +
          '<div class="font-bold mb-2" style="color:var(--purple)">' + escHtml(topicA) + '</div>' +
          '<div class="text-sm text-dim" style="line-height:1.6">' + escHtml(cmp.aboutA || '') + '</div>' +
        '</div>' +
        '<div class="card" style="border-left:3px solid var(--cyan)">' +
          '<div class="font-bold mb-2" style="color:var(--cyan)">' + escHtml(topicB) + '</div>' +
          '<div class="text-sm text-dim" style="line-height:1.6">' + escHtml(cmp.aboutB || '') + '</div>' +
        '</div>' +
      '</div>';

    if (cmp.tableRows && cmp.tableRows.length) {
      html += '<div class="card mb-3" style="padding:0;overflow:hidden"><table class="cmp-table">';
      html += '<thead><tr><th style="width:20%">Aspect</th>';
      html += '<th style="color:var(--purple)">' + escHtml(topicA) + '</th>';
      html += '<th style="color:var(--cyan)">'   + escHtml(topicB) + '</th></tr></thead><tbody>';
      cmp.tableRows.forEach(function(r) {
        html += '<tr>';
        html += '<td class="font-bold text-sm" style="color:var(--text-muted)">' + escHtml(r.aspect) + '</td>';
        html += '<td class="text-sm">' + escHtml(r.a) + '</td>';
        html += '<td class="text-sm">' + escHtml(r.b) + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }

    html += '<div class="grid-2">';
    html += '<div class="card"><div class="font-bold mb-2" style="color:var(--green)">✅ Similarities</div>';
    (cmp.similarities || []).forEach(function(s) {
      html += '<div class="text-sm text-dim mb-2">• ' + escHtml(s) + '</div>';
    });
    html += '</div>';
    html += '<div class="card"><div class="font-bold mb-2" style="color:var(--red)">⚡ Key Differences</div>';
    (cmp.differences || []).forEach(function(d) {
      html += '<div class="text-sm text-dim mb-2">• ' + escHtml(d) + '</div>';
    });
    html += '</div></div>';

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = emptyState('❌', 'Error', e.message);
  }
}

/* ════════════════════════════════════════════════════════════
   ONE-NIGHT MODE
   ════════════════════════════════════════════════════════════ */
async function doOneNight() {
  var srcEl = document.getElementById('on-src');
  var text  = _srcText(srcEl ? srcEl.value : 'all');
  if (!text.trim()) return showToast('No notes found.', 'error');

  var btn = document.getElementById('btn-onenight');
  var el  = document.getElementById('onenight-result');
  if (btn) { btn.textContent = '⏳ Building pack…'; btn.disabled = true; }
  if (el)  el.innerHTML = spinnerHTML('Building emergency revision pack with AI…');

  try {
    var data = await apiPost('/ai/onenight', { text: text });
    var p    = data.pack || {};

    var html =
      '<div class="card mb-3" style="background:rgba(167,139,250,.07);border-color:rgba(167,139,250,.2)">' +
        '<div class="flex items-center gap-3 mb-1">' +
          '<span style="font-size:1.4rem">🌙</span>' +
          '<div><div class="font-bold">One-Night Revision Pack</div>' +
          '<div class="text-xs text-dim">Read this — nothing else tonight.</div></div>' +
        '</div>' +
      '</div>';

    // Must Know
    html += '<div class="card mb-3"><div class="font-bold mb-3">📌 Must-Know (' + (p.mustKnow || []).length + ')</div>';
    (p.mustKnow || []).forEach(function(s, i) {
      html += '<div class="flex gap-2 mb-2 text-sm"><span class="badge badge-purple" style="flex-shrink:0">' + (i + 1) + '</span><span class="text-dim">' + escHtml(s) + '</span></div>';
    });
    html += '</div>';

    // Keywords
    html += '<div class="card mb-3"><div class="font-bold mb-2">🏷️ Keywords</div><div class="flex flex-wrap gap-2">';
    (p.keywords || []).forEach(function(k) {
      html += '<span class="badge badge-purple">' + escHtml(k) + '</span>';
    });
    html += '</div></div>';

    // Definitions
    if ((p.definitions || []).length) {
      html += '<div class="card mb-3"><div class="font-bold mb-2">📖 Definitions (' + p.definitions.length + ')</div>';
      p.definitions.forEach(function(d) {
        html += '<div class="mb-2 text-sm"><strong style="color:var(--purple)">' + escHtml(d.term) + ':</strong> <span class="text-dim">' + escHtml(d.definition) + '</span></div>';
      });
      html += '</div>';
    }

    // Formulas
    if ((p.formulas || []).length) {
      html += '<div class="card mb-3"><div class="font-bold mb-2">📐 Formulas</div>';
      p.formulas.forEach(function(f) {
        html += '<code style="display:block;background:rgba(255,255,255,.05);padding:5px 10px;border-radius:6px;font-size:.8rem;color:var(--cyan);margin-bottom:5px;font-family:var(--font-mono)">' + escHtml(f.formula) + '</code>';
      });
      html += '</div>';
    }

    // Tips
    html += '<div class="card mb-3"><div class="font-bold mb-2">✅ Tonight\'s Rules</div>';
    (p.examTips || []).forEach(function(t) {
      html += '<div class="text-sm text-dim mb-1">' + escHtml(t) + '</div>';
    });
    html += '</div>';

    html += '<button class="btn btn-secondary btn-sm" onclick="_exportON()">📤 Export Pack</button>';

    el.innerHTML = html;
    window._lastON = p;
    showToast('One-Night Pack ready! 🌙', 'success');
  } catch (e) {
    el.innerHTML = emptyState('❌', 'Error', e.message);
  } finally {
    if (btn) { btn.textContent = '🌙 Generate Pack'; btn.disabled = false; }
  }
}

function _exportON() {
  var p = window._lastON;
  if (!p) return;
  var lines = ['# One-Night Revision Pack\n'];
  lines.push('## Must-Know');
  (p.mustKnow || []).forEach(function(s, i) { lines.push((i + 1) + '. ' + s); });
  lines.push('');
  lines.push('## Keywords');
  lines.push((p.keywords || []).join(', '));
  lines.push('');
  lines.push('## Definitions');
  (p.definitions || []).forEach(function(d) { lines.push('**' + d.term + ':** ' + d.definition); });
  lines.push('');
  lines.push('## Formulas');
  (p.formulas || []).forEach(function(f) { lines.push('- ' + f.formula); });
  lines.push('');
  lines.push("## Tonight's Rules");
  (p.examTips || []).forEach(function(t) { lines.push(t); });
  downloadMD(lines.join('\n'), 'one-night-pack.md');
  showToast('Exported!', 'success');
}

/* ════════════════════════════════════════════════════════════
   SMART FILE UPLOAD (replaces old PDF uploader)
   ════════════════════════════════════════════════════════════ */
function openSumSmartUpload() {
  openSmartUpload({
    pageHint : 'summaries',
    onSuccess: function(result) {
      apiGet('/data').then(function(d) {
        SM.data = d || SM.data;
        _populateSources();
        var el = document.getElementById('sum-src');
        if (el && result.noteId) el.value = result.noteId;
      }).catch(function() {});
      showToast('"' + result.title + '" uploaded! Now generate a summary.', 'success', 4000);
      setTimeout(function() { openModal('modal-gen-sum'); }, 700);
    },
  });
}

/* ════════════════════════════════════════════════════════════
   YOUTUBE SUMMARISER
   ════════════════════════════════════════════════════════════ */
// Transcript fetched server-side via /api/ai/youtube

function _extractVideoId(url) {
  try {
    var u = new URL(url.includes('://') ? url : 'https://' + url);
    var v = u.searchParams.get('v');
    if (v && v.length >= 11) return v.substring(0, 11);
  } catch(_) {}
  var patterns = [/[?&]v=([a-zA-Z0-9_-]{11})/, /youtu\.be\/([a-zA-Z0-9_-]{11})/, /shorts\/([a-zA-Z0-9_-]{11})/];
  for (var i = 0; i < patterns.length; i++) {
    var m = url.match(patterns[i]);
    if (m) return m[1];
  }
  return null;
}

async function doYoutubeSummarise() {
  var urlEl = document.getElementById('yt-url');
  var url   = urlEl ? urlEl.value.trim() : '';
  if (!url) return showToast('Please paste a YouTube URL first.', 'warning');
  if (!url.includes('youtube.com') && !url.includes('youtu.be'))
    return showToast('Please enter a valid YouTube URL.', 'error');

  var videoId = _extractVideoId(url);
  if (!videoId) return showToast('Could not extract video ID from URL. Please paste the full YouTube URL.', 'error');

  var btn = document.getElementById('btn-yt');
  var el  = document.getElementById('yt-result');
  if (btn) { btn.textContent = '⏳ Step 1: Fetching captions…'; btn.disabled = true; }
  if (el)  el.innerHTML = spinnerHTML('Step 1: Fetching video captions from YouTube…');

  try {
    // Send to server - server fetches transcript AND summarises
    if (btn) btn.textContent = '⏳ Fetching & summarising…';
    if (el)  el.innerHTML = spinnerHTML('Fetching captions and summarising with AI… (~20 seconds)');

    var data = await apiPost('/ai/youtube', { url: url });

    // Save as a note
    var existing = await apiGet('/data').catch(function() { return {}; });
    var notes    = existing.notes || [];
    var now      = Date.now();

    // Build a readable title from URL
    var videoId  = (url.split('v=').pop() || '').split('&')[0] || url.split('/').pop().split('?')[0];
    var newNote  = {
      id        : now.toString(36) + Math.random().toString(36).slice(2, 7),
      title     : 'YouTube: ' + videoId,
      content   : data.summary,
      folder    : 'General',
      tags      : ['youtube', 'lecture', 'video'],
      pinned    : false,
      bookmarked: false,
      created   : now,
      updated   : now,
    };
    notes.unshift(newNote);
    if (typeof setData === 'function') {
      setData('notes', notes);
      if (typeof flushSync === 'function') await flushSync();
    } else {
      await apiPost('/data/notes', { value: notes });
    }
    SM.data.notes = notes;
    _populateSources();

    var wc   = data.wordCount ? data.wordCount.toLocaleString() : '?';
    var html =
      '<div style="background:rgba(67,233,123,.07);border:1px solid rgba(67,233,123,.18);border-radius:10px;padding:11px 14px;margin-bottom:14px">' +
        '<div style="font-weight:700;color:#43e97b;margin-bottom:4px">✅ Transcript summarised!</div>' +
        '<div style="font-size:.78rem;color:#9ca3c0">' +
          '~' + wc + ' words &nbsp;·&nbsp; Saved as note &nbsp;·&nbsp; ' +
          '<a style="color:#667eea;cursor:pointer" onclick="window.location.href=\'/notes.html\'">Open in Notes →</a>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="line-height:1.85">' + mdToHtml(data.summary) + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:12px">' +
        '<button class="btn btn-primary btn-sm" onclick="ytGenQuiz()">🎯 Generate Quiz</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="ytGenFlash()">🃏 Flashcards</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="exportYT()">📤 Export</button>' +
      '</div>';

    el.innerHTML = html;
    window._lastYTNote = newNote;
    showToast('YouTube lecture summarised!', 'success');
  } catch (e) {
    if (el) el.innerHTML = '<div style="color:var(--red);padding:10px">❌ ' + escHtml(e.message) + '</div>';
    showToast('Error: ' + e.message, 'error');
  } finally {
    if (btn) { btn.textContent = '📺 Summarise'; btn.disabled = false; }
  }
}

function ytGenQuiz() {
  if (!window._lastYTNote) return;
  window.location.href = '/quiz.html?noteId=' + window._lastYTNote.id;
}
function ytGenFlash() {
  if (!window._lastYTNote) return;
  window.location.href = '/flashcards.html?noteId=' + window._lastYTNote.id;
}
function exportYT() {
  if (!window._lastYTNote) return;
  downloadMD('# ' + window._lastYTNote.title + '\n\n' + window._lastYTNote.content, 'youtube-notes.md');
  showToast('Exported!', 'success');
}