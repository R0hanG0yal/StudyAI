/* ============================================================
   STUDYAI — QUIZ MODULE
   File: public/assets/js/quiz.js
   ============================================================ */
'use strict';

const QZ = {
  questions : [], current : 0, answers : [],
  meta      : null, startTime: 0,
  timerH    : null, secsLeft : 60,
  data      : {},
};

/* ── ENTRY ── */
async function initQuiz() {
  QZ.data = await apiGet('/data').catch(() => ({}));
  _populateSourceSelect();
  _renderStats();
  _renderQuizList();
  _renderLeaderboard();

  // Check if launched from notes page with a noteId param
  const params = new URLSearchParams(window.location.search);
  const noteId = params.get('noteId');
  if (noteId) {
    const el = document.getElementById('qg-src');
    if (el) el.value = noteId;
    openModal('modal-gen-quiz');
  }
}

/* ── Populate source select ── */
function _populateSourceSelect() {
  const notes = QZ.data.notes || [];
  const el    = document.getElementById('qg-src');
  if (!el) return;
  el.innerHTML = '<option value="all">All Notes</option>' +
    notes.map(n => `<option value="${n.id}">${escHtml(n.title||'Untitled')}</option>`).join('');
}

/* ── Stats ── */
function _renderStats() {
  const qr   = QZ.data.quizResults || [];
  const av   = qr.length ? Math.round(qr.reduce((s,r)=>s+r.pct,0)/qr.length) : 0;
  const best = qr.length ? Math.max(...qr.map(r=>r.pct)) : 0;
  const el   = document.getElementById('quiz-stats');
  if (!el) return;
  el.innerHTML = [
    {icon:'🎯', cls:'purple', val:av+'%',     label:'Average Score'  },
    {icon:'🏆', cls:'orange', val:best+'%',   label:'Best Score'     },
    {icon:'📝', cls:'blue',   val:qr.length,  label:'Quizzes Taken'  },
    {icon:'✅', cls:'green',  val:qr.filter(r=>r.pct>=70).length, label:'Passed (≥70%)'  },
  ].map(s=>`
    <div class="stat-card ${s.cls}">
      <div class="stat-icon ${s.cls}">${s.icon}</div>
      <div class="stat-value">${s.val}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');
}

/* ── Quiz list ── */
function _renderQuizList() {
  const quizzes = (QZ.data.quizzes || []).sort((a,b)=>b.created-a.created);
  const qr      = QZ.data.quizResults || [];
  const el      = document.getElementById('quiz-list');
  if (!el) return;
  if (!quizzes.length) { el.innerHTML = emptyState('🎯','No quizzes yet','Generate one to get started!'); return; }

  el.innerHTML = quizzes.map(q => {
    const results  = qr.filter(r=>r.quizId===q.id);
    const best     = results.length ? Math.max(...results.map(r=>r.pct)) : null;
    const diffCls  = {easy:'badge-green',medium:'badge-orange',hard:'badge-red'}[q.difficulty]||'badge-purple';
    return `
      <div class="quiz-list-item">
        <div style="flex:1;min-width:0">
          <div class="font-bold text-sm">${escHtml(q.title)}</div>
          <div class="flex gap-2 mt-1 flex-wrap">
            <span class="badge ${diffCls}">${q.difficulty}</span>
            <span class="text-xs text-muted">${q.questions}q · ${q.timePerQ}s/q</span>
            ${best!==null?`<span class="badge badge-cyan">Best: ${best}%</span>`:''}
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="startSavedQuiz('${q.id}')">Start →</button>
        <button class="btn btn-secondary btn-sm" onclick="deleteQuiz('${q.id}')">🗑️</button>
      </div>`;
  }).join('');
}

/* ── Leaderboard ── */
function _renderLeaderboard() {
  const qr   = QZ.data.quizResults || [];
  const el   = document.getElementById('quiz-leaderboard');
  if (!el) return;

  const subMap = {};
  qr.forEach(r => {
    const s = r.subject || 'General';
    if (!subMap[s]) subMap[s] = {c:0,t:0,n:0};
    subMap[s].c += r.score; subMap[s].t += r.total; subMap[s].n++;
  });

  const rows = Object.entries(subMap)
    .map(([s,d])=>({s, avg:Math.round((d.c/d.t)*100), quizzes:d.n}))
    .sort((a,b)=>b.avg-a.avg);

  if (!rows.length) { el.innerHTML = emptyState('🏆','No data yet','Take quizzes to build the leaderboard!'); return; }

  const medals = ['🥇','🥈','🥉'];
  el.innerHTML = rows.map((r,i)=>`
    <div style="display:flex;align-items:center;gap:12px;padding:9px 10px;border-radius:9px;transition:.15s" onmouseover="this.style.background='rgba(255,255,255,.04)'" onmouseout="this.style.background=''">
      <span style="width:24px;text-align:center">${medals[i]||'#'+(i+1)}</span>
      <div style="flex:1"><div class="font-bold text-sm">${r.s}</div><div class="text-xs text-muted">${r.quizzes} quiz${r.quizzes!==1?'zes':''}</div></div>
      <span class="font-mono font-bold" style="color:var(--purple)">${r.avg}%</span>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   GENERATE QUIZ (Real AI)
   ══════════════════════════════════════════════════════════ */
async function generateQuiz() {
  const srcId = document.getElementById('qg-src')?.value || 'all';
  const title = document.getElementById('qg-title')?.value.trim() || 'Practice Quiz';
  const count = parseInt(document.getElementById('qg-count')?.value) || 10;
  const diff  = document.getElementById('qg-diff')?.value || 'medium';
  const tpq   = parseInt(document.getElementById('qg-time')?.value) || 60;

  const notes = QZ.data.notes || [];
  const text  = srcId === 'all'
    ? notes.map(n=>n.content||'').join('\n\n')
    : (notes.find(n=>n.id===srcId)?.content||'');

  if (!text.trim()) return showToast('No note content found. Add notes first!','error');

  const btn = document.getElementById('btn-gen-quiz');
  if (btn) { btn.textContent='⏳ Generating with AI…'; btn.disabled=true; }

  try {
    const data = await apiPost('/ai/quiz', { text, count, difficulty:diff });
    if (!data.questions?.length) throw new Error('No questions returned. Try adding more notes.');

    // Save quiz metadata
    const quizzes = QZ.data.quizzes || [];
    const qz = { id:genId(), title, sourceId:srcId, questions:data.questions.length, difficulty:diff, timePerQ:tpq, created:Date.now() };
    quizzes.push(qz);
    await apiPost('/data/quizzes', { value:quizzes });
    QZ.data.quizzes = quizzes;

    closeModal('modal-gen-quiz');
    _beginQuiz(data.questions, qz);
    showToast(`${data.questions.length} questions generated!`,'success');
  } catch(e) {
    showToast('AI Error: '+e.message,'error');
  } finally {
    if (btn) { btn.textContent='✨ Generate & Start'; btn.disabled=false; }
  }
}

/* ── Start a saved quiz (regenerate questions) ── */
async function startSavedQuiz(id) {
  const qz    = (QZ.data.quizzes||[]).find(q=>q.id===id);
  if (!qz) return showToast('Quiz not found.','error');

  showToast('Generating questions…','info',6000);
  const notes = QZ.data.notes || [];
  const text  = qz.sourceId==='all'
    ? notes.map(n=>n.content||'').join('\n\n')
    : (notes.find(n=>n.id===qz.sourceId)?.content||'');

  try {
    const data = await apiPost('/ai/quiz',{text,count:qz.questions,difficulty:qz.difficulty});
    if (!data.questions?.length) throw new Error('Could not generate questions.');
    _beginQuiz(data.questions, qz);
  } catch(e) {
    showToast('Error: '+e.message,'error');
  }
}

async function deleteQuiz(id) {
  if (!confirm('Delete this quiz?')) return;
  QZ.data.quizzes = (QZ.data.quizzes||[]).filter(q=>q.id!==id);
  await apiPost('/data/quizzes',{value:QZ.data.quizzes});
  _renderQuizList();
  showToast('Deleted.','info');
}

/* ══════════════════════════════════════════════════════════
   QUIZ RUNNER
   ══════════════════════════════════════════════════════════ */
function _beginQuiz(questions, meta) {
  QZ.questions  = questions;
  QZ.current    = 0;
  QZ.answers    = new Array(questions.length).fill(null);
  QZ.meta       = meta;
  QZ.startTime  = Date.now();

  _showView('view-quiz');
  document.getElementById('quiz-active-title').textContent = meta.title;
  _renderQuestion();
  _startTimer();
}

function _renderQuestion() {
  const q = QZ.questions[QZ.current];
  const n = QZ.questions.length;
  const i = QZ.current;
  const a = QZ.answers[i];

  // Progress
  document.getElementById('quiz-progress').style.width = Math.round((i/n)*100)+'%';
  document.getElementById('quiz-counter').textContent   = `Q${i+1} of ${n}`;

  // Nav buttons
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  if (prev) prev.style.visibility = i===0 ? 'hidden' : 'visible';
  if (next) next.textContent = i===n-1 ? 'Finish ✓' : 'Next →';

  const letters = ['A','B','C','D'];
  const wrap    = document.getElementById('quiz-question-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="card" style="margin-bottom:14px">
      <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:10px">
        Question ${i+1} of ${n} · <span class="badge badge-${_diffBadge(QZ.meta?.difficulty)}">${QZ.meta?.difficulty||'medium'}</span>
      </div>
      <div style="font-size:1rem;font-weight:600;line-height:1.55;margin-bottom:18px">${escHtml(q.question)}</div>
      <div style="display:flex;flex-direction:column;gap:9px">
        ${q.options.map((opt,oi)=>{
          let cls = '';
          if (a!==null) {
            if (oi===q.correct)   cls = 'correct disabled';
            else if (oi===a.idx)  cls = a.correct?'':'wrong disabled';
            else                   cls = 'disabled';
          }
          return `
            <div class="q-option ${cls}" onclick="selectAnswer(${oi})">
              <div class="q-letter">${letters[oi]||oi+1}</div>
              <span>${escHtml(opt)}</span>
            </div>`;
        }).join('')}
      </div>
      ${a!==null && q.explanation ? `<div class="q-explanation show">📖 <strong>Explanation:</strong> ${escHtml(q.explanation)}</div>` : ''}
    </div>`;
}

function selectAnswer(oi) {
  const q = QZ.questions[QZ.current];
  if (QZ.answers[QZ.current]!==null) return;

  _stopTimer();
  QZ.answers[QZ.current] = { idx:oi, correct:oi===q.correct };
  _renderQuestion();

  // Auto-advance after brief delay
  const delay = QZ.answers[QZ.current].correct ? 1600 : 2400;
  setTimeout(()=>{ if (QZ.current < QZ.questions.length-1) nextQuestion(); }, delay);
}

function nextQuestion() {
  if (QZ.current >= QZ.questions.length-1) { _finishQuiz(); return; }
  QZ.current++;
  _renderQuestion();
  if (QZ.answers[QZ.current]===null) _startTimer();
}

function prevQuestion() {
  if (QZ.current<=0) return;
  QZ.current--;
  _stopTimer();
  _renderQuestion();
}

function exitQuiz() {
  if (!confirm('Exit quiz? Progress will be lost.')) return;
  _stopTimer();
  backToHome();
}

/* ── Timer ── */
function _startTimer() {
  _stopTimer();
  QZ.secsLeft = QZ.meta?.timePerQ || 60;
  _updateTimerDisplay();
  QZ.timerH = setInterval(()=>{
    QZ.secsLeft--;
    _updateTimerDisplay();
    if (QZ.secsLeft<=0) {
      _stopTimer();
      if (QZ.answers[QZ.current]===null) {
        QZ.answers[QZ.current] = {idx:-1,correct:false};
        _renderQuestion();
        setTimeout(()=>{ if (QZ.current<QZ.questions.length-1) nextQuestion(); else _finishQuiz(); }, 1200);
      }
    }
  },1000);
}

function _stopTimer() {
  if (QZ.timerH) { clearInterval(QZ.timerH); QZ.timerH=null; }
}

function _updateTimerDisplay() {
  const el = document.getElementById('quiz-timer');
  if (!el) return;
  el.textContent = '⏱ '+fmtTime(Math.max(0,QZ.secsLeft));
  el.classList.toggle('urgent', QZ.secsLeft<=10 && QZ.secsLeft>0);
}

/* ── Finish ── */
async function _finishQuiz() {
  _stopTimer();
  const correct = QZ.answers.filter(a=>a&&a.correct).length;
  const total   = QZ.questions.length;
  const pct     = Math.round((correct/total)*100);
  const taken   = Math.round((Date.now()-QZ.startTime)/1000);

  const mistakes = QZ.questions.map((q,i)=>{
    const a = QZ.answers[i];
    if (!a||a.correct) return null;
    return { q:q.question, wrong:a.idx>=0?q.options[a.idx]:'Time expired', correct:q.options[q.correct] };
  }).filter(Boolean);

  // Save result
  const subject = (QZ.data.notes||[]).find(n=>n.id===QZ.meta?.sourceId)?.folder || 'General';
  const result  = { id:genId(), quizId:QZ.meta?.id||'', title:QZ.meta?.title||'Quiz',
    subject, score:correct, total, pct, timeTaken:taken, timestamp:Date.now(), mistakes };

  const qr = [...(QZ.data.quizResults||[]), result];
  await apiPost('/data/quizResults',{value:qr});
  QZ.data.quizResults = qr;

  // Show results
  _showView('view-results');
  document.getElementById('quiz-review-section').style.display='none';

  // Animate score ring
  const deg = Math.round((pct/100)*360);
  document.getElementById('score-ring').style.setProperty('--deg',deg+'deg');
  document.getElementById('score-pct').textContent  = pct+'%';
  document.getElementById('score-frac').textContent = `${correct}/${total}`;

  const {verdict,msg} = _verdict(pct);
  document.getElementById('score-verdict').textContent = verdict;
  document.getElementById('score-message').textContent = msg;

  if (pct >= 75 && typeof burstConfetti === 'function') {
    burstConfetti();
  }
}

function _verdict(pct) {
  if (pct>=90) return {verdict:'🏆 Outstanding!',  msg:'Excellent work — you have mastered this topic!'};
  if (pct>=75) return {verdict:'🎉 Great Job!',     msg:'Solid score. Review the questions you missed.'};
  if (pct>=60) return {verdict:'👍 Good Effort!',   msg:'Decent score — re-read explanations for wrong answers.'};
  if (pct>=40) return {verdict:'📚 Keep Studying',  msg:'More practice needed. Review your notes first.'};
  return             {verdict:"💪 Don't Give Up!",  msg:'This topic needs more work. Retry after reviewing.'};
}

function reviewQuiz() {
  const sec = document.getElementById('quiz-review-section');
  if (!sec) return;
  if (sec.style.display==='block') { sec.style.display='none'; return; }

  sec.innerHTML = QZ.questions.map((q,i)=>{
    const a  = QZ.answers[i];
    const ok = a&&a.correct;
    return `
      <div class="review-item ${ok?'correct':'wrong'}">
        <div class="flex gap-2 mb-2"><span>${ok?'✅':'❌'}</span><div class="font-bold text-sm">${escHtml(q.question)}</div></div>
        ${!ok?`<div class="text-xs mb-1" style="color:var(--red)">✕ You: ${escHtml(a?.idx>=0?q.options[a.idx]:'Time expired')}</div>`:''}
        <div class="text-xs mb-2" style="color:var(--green)">✓ Correct: ${escHtml(q.options[q.correct])}</div>
        ${q.explanation?`<div class="text-xs" style="color:var(--text-muted);border-top:1px solid var(--border);padding-top:6px;margin-top:4px">${escHtml(q.explanation)}</div>`:''}
      </div>`;
  }).join('');

  sec.style.display='block';
  sec.scrollIntoView({behavior:'smooth',block:'start'});
}

function retryQuiz() {
  if (!QZ.questions.length) return backToHome();
  const shuffled = [...QZ.questions].sort(()=>Math.random()-.5);
  _beginQuiz(shuffled, QZ.meta);
}

function backToHome() {
  _stopTimer();
  _showView('view-home');
  _renderStats();
  _renderQuizList();
  _renderLeaderboard();
}

/* ── Helpers ── */
function _showView(id) {
  ['view-home','view-quiz','view-results'].forEach(v=>{
    const el=document.getElementById(v);
    if (el) el.style.display = v===id?'block':'none';
  });
}
function _diffBadge(d) { return {easy:'green',medium:'orange',hard:'red'}[d]||'purple'; }