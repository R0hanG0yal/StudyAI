/* ============================================================
   STUDYAI — FLASHCARDS MODULE
   File: public/assets/js/flashcards.js
   SM-2 spaced repetition · Real AI generation
   ============================================================ */
'use strict';

/* ── State ── */
const FC = {
  all      : [],
  deck     : [],
  idx      : 0,
  flipped  : false,
  data     : {},
  session  : { easy:0, medium:0, hard:0, total:0 },
};

/* ════════════════════════════════════════════════════════════
   ENTRY
   ════════════════════════════════════════════════════════════ */
async function initFlashcards() {
  FC.data = await apiGet('/data').catch(() => ({}));
  FC.all  = FC.data.flashcards || [];

  _populateSources();
  _populateDecks();
  _renderStats();
  loadDeck();
  _wireTabs();

  // Deep link — opened from notes page with ?noteId=xxx
  const params = new URLSearchParams(window.location.search);
  const noteId = params.get('noteId');
  if (noteId) {
    const el = document.getElementById('fcg-src');
    if (el) el.value = noteId;
    const n = (FC.data.notes||[]).find(x=>x.id===noteId);
    const di= document.getElementById('fcg-deck');
    if (di && n) di.value = n.folder || 'General';
    openModal('modal-gen-fc');
  }
}

/* ── Populate dropdowns ── */
function _populateSources() {
  const notes = FC.data.notes || [];
  const el    = document.getElementById('fcg-src');
  if (!el) return;
  el.innerHTML = '<option value="all">All Notes</option>' +
    notes.map(n=>`<option value="${n.id}">${escHtml(n.title||'Untitled')}</option>`).join('');
}

function _populateDecks() {
  const decks = [...new Set(FC.all.map(c=>c.deck||'General'))];
  const sel   = document.getElementById('fc-deck-sel');
  if (!sel) return;
  const cur   = sel.value;
  sel.innerHTML = '<option value="all">All Decks</option>' +
    decks.map(d=>`<option value="${d}" ${d===cur?'selected':''}>${escHtml(d)}</option>`).join('');
}

/* ════════════════════════════════════════════════════════════
   STAT CARDS
   ════════════════════════════════════════════════════════════ */
function _renderStats() {
  const all   = FC.all;
  const due   = all.filter(c => !c.nextReview || c.nextReview <= today());
  const favs  = all.filter(c => c.favorite);
  const decks = [...new Set(all.map(c=>c.deck||'General'))];
  const el    = document.getElementById('fc-stats');
  if (!el) return;

  el.innerHTML = [
    { icon:'🃏', cls:'purple', val:all.length,   label:'Total Cards'  },
    { icon:'🔔', cls:'orange', val:due.length,   label:'Due Today'    },
    { icon:'⭐', cls:'pink',   val:favs.length,  label:'Favourites'   },
    { icon:'📚', cls:'blue',   val:decks.length, label:'Decks'        },
  ].map(s=>`
    <div class="stat-card ${s.cls}">
      <div class="stat-icon ${s.cls}">${s.icon}</div>
      <div class="stat-value">${s.val}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   LOAD DECK
   ════════════════════════════════════════════════════════════ */
function loadDeck() {
  const deckVal = document.getElementById('fc-deck-sel')?.value || 'all';
  FC.deck   = deckVal === 'all' ? [...FC.all] : FC.all.filter(c=>(c.deck||'General')===deckVal);
  FC.idx    = 0;
  FC.flipped= false;
  FC.session= { easy:0, medium:0, hard:0, total:0 };
  _showCard();
  _updateSessionStats();
}

function shuffleDeck() {
  FC.deck = [...FC.deck].sort(() => Math.random() - .5);
  FC.idx  = 0;
  FC.flipped = false;
  _showCard();
  showToast('Deck shuffled! 🔀', 'success');
}

/* ════════════════════════════════════════════════════════════
   SHOW CARD
   ════════════════════════════════════════════════════════════ */
function _showCard() {
  const card = FC.deck[FC.idx];

  // Reset flip
  FC.flipped = false;
  document.getElementById('fc-card')?.classList.remove('flipped');

  if (!card) {
    const frontEl = document.getElementById('fc-front-text');
    const backEl  = document.getElementById('fc-back-text');
    if (frontEl) frontEl.textContent = FC.deck.length === 0
      ? 'No cards yet! Use "Generate" or "+ Manual" to create some.'
      : '🎉 All cards reviewed! Great session.';
    if (backEl) backEl.textContent = '—';
  } else {
    const frontEl = document.getElementById('fc-front-text');
    const backEl  = document.getElementById('fc-back-text');
    if (frontEl) frontEl.textContent = card.front || 'Question';
    if (backEl)  backEl.textContent  = card.back  || 'Answer';

    // Deck badge
    const scene = document.getElementById('fc-scene');
    const existingBadge = scene?.querySelector('.fc-deck-badge');
    if (existingBadge) existingBadge.remove();
    if (scene && card.deck) {
      const badge = document.createElement('div');
      badge.className = 'fc-deck-badge';
      badge.innerHTML = `<span class="badge badge-purple">${escHtml(card.deck)}</span>
        ${card.favorite ? '<span style="margin-left:4px">⭐</span>' : ''}`;
      scene.style.position = 'relative';
      scene.appendChild(badge);
    }
  }

  // Update count
  const total = FC.deck.length;
  const cnt   = total ? `${FC.idx + 1} / ${total}` : '0 / 0';
  const c1 = document.getElementById('fc-count');
  const c2 = document.getElementById('fc-nav-count');
  if (c1) c1.textContent = cnt;
  if (c2) c2.textContent = cnt;
}

/* ── Flip ── */
function flipCard() {
  FC.flipped = !FC.flipped;
  document.getElementById('fc-card')?.classList.toggle('flipped', FC.flipped);
}

/* ── Navigate ── */
function nextCard() {
  if (!FC.deck.length) return;
  FC.idx     = (FC.idx + 1) % FC.deck.length;
  FC.flipped = false;
  _showCard();
}

function prevCard() {
  if (!FC.deck.length) return;
  FC.idx     = (FC.idx - 1 + FC.deck.length) % FC.deck.length;
  FC.flipped = false;
  _showCard();
}

/* ════════════════════════════════════════════════════════════
   SM-2 SPACED REPETITION
   ════════════════════════════════════════════════════════════ */
async function markCard(difficulty) {
  const card = FC.deck[FC.idx];
  if (!card) return;

  // SM-2 interval calculation
  const mult     = { easy:2.5, medium:1.5, hard:0 }[difficulty] || 1.5;
  const interval = difficulty === 'hard'
    ? 1
    : Math.max(1, Math.round((card.interval || 1) * mult));

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  // Update card in FC.all
  const idx = FC.all.findIndex(c => c.id === card.id);
  if (idx >= 0) {
    FC.all[idx] = {
      ...FC.all[idx],
      difficulty,
      interval,
      nextReview: dateStr(nextDate),
      reviews   : (FC.all[idx].reviews || 0) + 1,
    };
    FC.deck[FC.idx] = FC.all[idx];
  }

  // Update session stats
  FC.session[difficulty]++;
  FC.session.total++;
  _updateSessionStats();

  // Brief visual flash
  const scene = document.getElementById('fc-scene');
  if (scene) {
    scene.style.opacity = '0.3';
    setTimeout(() => { scene.style.opacity = '1'; }, 200);
  }

  // Save to server
  await apiPost('/data/flashcards', { value: FC.all }).catch(() => {});
  _renderStats();

  // Auto-advance after short delay
  setTimeout(() => {
    if (FC.idx < FC.deck.length - 1) {
      nextCard();
    } else {
      // Deck complete!
      showToast(`🎉 Deck complete! ${FC.session.total} cards reviewed.`, 'success', 4000);
      const frontEl = document.getElementById('fc-front-text');
      if (frontEl) frontEl.textContent = `🎉 Session complete! You reviewed ${FC.session.total} card${FC.session.total!==1?'s':''}.`;
      const backEl = document.getElementById('fc-back-text');
      if (backEl) backEl.textContent = 'Come back tomorrow for due cards!';
    }
  }, 300);
}

function _updateSessionStats() {
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt('ss-easy',   FC.session.easy);
  setTxt('ss-medium', FC.session.medium);
  setTxt('ss-hard',   FC.session.hard);
  setTxt('ss-total',  FC.session.total);
}

/* ════════════════════════════════════════════════════════════
   GENERATE FLASHCARDS (Real AI)
   ════════════════════════════════════════════════════════════ */
async function generateFlashcards() {
  const srcId = document.getElementById('fcg-src')?.value  || 'all';
  const deck  = document.getElementById('fcg-deck')?.value.trim() || 'General';
  const count = parseInt(document.getElementById('fcg-count')?.value) || 15;

  const notes = FC.data.notes || [];
  const text  = srcId === 'all'
    ? notes.map(n => n.content || '').join('\n\n')
    : (notes.find(n => n.id === srcId)?.content || '');

  if (!text.trim()) return showToast('No note content found. Add notes first!', 'error');

  const btn = document.getElementById('btn-gen-fc');
  if (btn) { btn.textContent = '⏳ Generating with AI…'; btn.disabled = true; }

  try {
    const data = await apiPost('/ai/flashcards', { text, deck, count });
    if (!data.flashcards?.length) throw new Error('No cards generated. Add more note content.');

    // Merge with existing
    FC.all  = [...FC.all, ...data.flashcards];
    FC.data.flashcards = FC.all;

    await apiPost('/data/flashcards', { value: FC.all });

    _populateDecks();
    _renderStats();

    // Switch to the new deck
    const sel = document.getElementById('fc-deck-sel');
    if (sel) sel.value = deck;
    loadDeck();

    // Switch to study tab
    _switchFCView('study');

    closeModal('modal-gen-fc');
    showToast(`${data.flashcards.length} flashcards generated for "${deck}"! 🃏`, 'success');
  } catch (e) {
    showToast('AI Error: ' + e.message, 'error');
  } finally {
    if (btn) { btn.textContent = '🤖 Generate Cards'; btn.disabled = false; }
  }
}

/* ── Manual card creation ── */
async function createManualCard() {
  const front = document.getElementById('fc-front-inp')?.value.trim();
  const back  = document.getElementById('fc-back-inp')?.value.trim();
  const deck  = document.getElementById('fc-deck-inp')?.value.trim() || 'General';

  if (!front) return showToast('Front (question) is required.', 'error');
  if (!back)  return showToast('Back (answer) is required.', 'error');

  const card = {
    id:genId(), front, back, deck,
    difficulty:null, favorite:false,
    interval:1, nextReview:today(), reviews:0, created:Date.now(),
  };
  FC.all.push(card);
  await apiPost('/data/flashcards', { value: FC.all });

  // Reset form
  ['fc-front-inp','fc-back-inp','fc-deck-inp'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });

  closeModal('modal-manual-card');
  _populateDecks();
  _renderStats();

  // Load into current deck
  const sel = document.getElementById('fc-deck-sel');
  if (sel) sel.value = deck;
  loadDeck();
  showToast('Flashcard created!', 'success');
}

/* ════════════════════════════════════════════════════════════
   MINI CARD GRIDS (All / Due / Favs views)
   ════════════════════════════════════════════════════════════ */
function _renderMiniGrid(containerId, cards) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!cards.length) {
    el.innerHTML = emptyState('🃏', 'No cards here', '');
    return;
  }

  el.innerHTML = cards.map(c => {
    const dueToday  = !c.nextReview || c.nextReview <= today();
    const diffColor = { easy:'var(--green)', medium:'var(--orange)', hard:'var(--red)' }[c.difficulty] || 'var(--text-muted)';
    return `
      <div class="fc-mini-card" onclick="_jumpToCard('${c.id}')">
        <div class="fc-mini-front">${escHtml(c.front)}</div>
        <div class="fc-mini-back">${escHtml(c.back)}</div>
        <div class="flex gap-2 mt-2 flex-wrap items-center">
          <span class="badge badge-purple" style="font-size:.62rem">${escHtml(c.deck||'General')}</span>
          ${c.difficulty ? `<span class="text-xs" style="color:${diffColor}">● ${c.difficulty}</span>` : ''}
          ${dueToday     ? `<span class="badge badge-orange" style="font-size:.6rem">Due</span>` : ''}
          ${c.favorite   ? `<span>⭐</span>` : ''}
          <button class="btn-icon" style="width:24px;height:24px;border-radius:6px;margin-left:auto" onclick="event.stopPropagation();toggleFav('${c.id}')">
            ${c.favorite ? '⭐' : '☆'}
          </button>
        </div>
        <div class="text-xs text-muted mt-1">${c.reviews||0} review${c.reviews!==1?'s':''}</div>
      </div>`;
  }).join('');
}

async function toggleFav(id) {
  const idx = FC.all.findIndex(c => c.id === id);
  if (idx < 0) return;
  FC.all[idx].favorite = !FC.all[idx].favorite;
  await apiPost('/data/flashcards', { value: FC.all });
  _renderStats();
  // Re-render current grid view
  const activeTab = document.querySelector('#fc-tabs .tab.active');
  if (activeTab) _switchFCView(activeTab.dataset.fv);
}

function _jumpToCard(id) {
  // Switch to study view, jump to this card
  _switchFCView('study');
  const idx = FC.deck.findIndex(c => c.id === id);
  if (idx >= 0) { FC.idx = idx; }
  else {
    // Card not in current deck — load all
    const sel = document.getElementById('fc-deck-sel');
    if (sel) sel.value = 'all';
    loadDeck();
    FC.idx = FC.deck.findIndex(c => c.id === id);
    if (FC.idx < 0) FC.idx = 0;
  }
  _showCard();
}

/* ════════════════════════════════════════════════════════════
   TAB SWITCHER
   ════════════════════════════════════════════════════════════ */
function _wireTabs() {
  document.querySelectorAll('#fc-tabs .tab').forEach(tab => {
    tab.onclick = () => _switchFCView(tab.dataset.fv, tab);
  });
}

function _switchFCView(view, tabEl) {
  document.querySelectorAll('#fc-tabs .tab').forEach(t => t.classList.remove('active'));
  const active = tabEl || document.querySelector(`#fc-tabs .tab[data-fv="${view}"]`);
  if (active) active.classList.add('active');

  const views = ['study','all','due','favs'];
  views.forEach(v => {
    const el = document.getElementById('fv-'+v);
    if (el) el.style.display = v === view ? 'block' : 'none';
  });

  if (view === 'all')  _renderMiniGrid('fc-all-grid', FC.all);
  if (view === 'due')  _renderMiniGrid('fc-due-grid', FC.all.filter(c=>!c.nextReview||c.nextReview<=today()));
  if (view === 'favs') _renderMiniGrid('fc-fav-grid', FC.all.filter(c=>c.favorite));
}