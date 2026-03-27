/* ============================================================
   STUDYAI — ai-persona.js  (Task 6)
   Customise AI response tone, verbosity, style.
   Injected into every AI API call as system-prompt additions.
   ============================================================ */

const AIPersona = (function() {
  const KEY = 'sa_ai_persona';

  const PERSONAS = {
    tutor    : { name:'Friendly Tutor',  icon:'👨‍🏫', desc:'Encouraging, clear, uses examples',        tone:'friendly, encouraging, patient' },
    professor: { name:'Strict Professor',icon:'🎓',  desc:'Formal, precise, academically rigorous',   tone:'formal, precise, academically rigorous' },
    buddy    : { name:'Study Buddy',     icon:'👋',  desc:'Casual, fun, relatable',                   tone:'casual, relatable, uses humor where appropriate' },
    socratic : { name:'Socratic',        icon:'🤔',  desc:'Asks questions to guide understanding',    tone:'questioning, thought-provoking, Socratic method' },
    concise  : { name:'Flash Cards',     icon:'⚡',  desc:'Ultra-short bullet-point answers only',    tone:'extremely concise, bullet points only, no filler' },
  };

  const DEFAULTS = {
    persona    : 'tutor',
    verbosity  : 'medium',    // 'brief'|'medium'|'detailed'
    useEmojis  : true,
    useBold    : true,
    language   : 'en',
    customNote : '',           // free-text instruction appended to every system prompt
  };

  function load() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
  }

  function save(prefs) {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    if (typeof getSettings === 'function') {
      getSettings().then(s => { s.aiPersona = prefs; saveSettings && saveSettings(s); }).catch(() => {});
    }
  }

  // Build system prompt suffix injected into all AI calls
  function getSystemSuffix() {
    const p = load();
    const persona = PERSONAS[p.persona] || PERSONAS.tutor;
    const verbMap = { brief:'Be very concise — 3-5 sentences max.', medium:'Aim for moderate length.', detailed:'Be thorough and comprehensive.' };
    const parts = [
      `Tone: ${persona.tone}.`,
      verbMap[p.verbosity] || verbMap.medium,
      p.useEmojis ? 'You may use relevant emojis to enhance clarity.' : 'Do NOT use emojis.',
      p.useBold ? 'Bold key terms using **asterisks**.' : 'Do not use bold formatting.',
      p.customNote ? `Additional instruction: ${p.customNote}` : '',
    ].filter(Boolean);
    return '\n\n' + parts.join(' ');
  }

  function update(changes) {
    const current = load();
    const updated = { ...current, ...changes };
    save(updated);
    return updated;
  }

  function showModal() {
    const p = load();
    const existing = document.getElementById('ai-persona-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'ai-persona-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="modal-header">
          <span class="modal-title">🤖 AI Persona</span>
          <button class="modal-close" id="apm-close">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">AI Personality</label>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${Object.entries(PERSONAS).map(([id, per]) => `
              <label style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;cursor:pointer;
                border:1.5px solid ${p.persona===id?'rgba(102,126,234,.4)':'var(--border)'};
                background:${p.persona===id?'rgba(102,126,234,.08)':'rgba(255,255,255,.03)'};
                transition:all .15s">
                <input type="radio" name="ap-persona" value="${id}" ${p.persona===id?'checked':''} style="accent-color:var(--purple)"/>
                <span style="font-size:1.1rem">${per.icon}</span>
                <div style="flex:1">
                  <div style="font-size:.86rem;font-weight:600">${per.name}</div>
                  <div style="font-size:.72rem;color:var(--text-muted)">${per.desc}</div>
                </div>
              </label>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Response Length</label>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            ${[['brief','⚡ Brief'],['medium','📝 Medium'],['detailed','📖 Detailed']].map(([v,l]) => `
              <button class="ap-verb-btn ${p.verbosity===v?'active':''}" data-val="${v}"
                style="padding:9px 6px;border-radius:10px;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .15s;
                border:1.5px solid ${p.verbosity===v?'rgba(102,126,234,.4)':'var(--border)'};
                background:${p.verbosity===v?'rgba(102,126,234,.08)':'transparent'};
                color:${p.verbosity===v?'var(--purple)':'var(--text-dim)'}">${l}</button>`).join('')}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0">
            <div><div class="text-sm font-bold">Use Emojis</div><div class="text-xs text-muted">AI adds emojis to responses</div></div>
            <label class="toggle"><input type="checkbox" id="ap-emojis" ${p.useEmojis?'checked':''}><div class="toggle-track"></div></label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0">
            <div><div class="text-sm font-bold">Bold Key Terms</div><div class="text-xs text-muted">Highlights important words</div></div>
            <label class="toggle"><input type="checkbox" id="ap-bold" ${p.useBold?'checked':''}><div class="toggle-track"></div></label>
          </div>
        </div>

        <div class="form-group mb-4">
          <label class="form-label">Custom AI Instruction (optional)</label>
          <textarea id="ap-custom" class="form-input" rows="2" maxlength="200"
            placeholder="e.g. Always give examples from Computer Science…">${p.customNote||''}</textarea>
          <div class="text-xs text-muted mt-1">Added to every AI request. Max 200 chars.</div>
        </div>

        <button class="btn btn-primary btn-full" id="apm-save" style="justify-content:center">Save Persona</button>
      </div>`;
    document.body.appendChild(modal);

    // Verbosity buttons
    modal.querySelectorAll('.ap-verb-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.ap-verb-btn').forEach(b => {
          b.style.borderColor='var(--border)'; b.style.background='transparent'; b.style.color='var(--text-dim)'; b.classList.remove('active');
        });
        btn.style.borderColor='rgba(102,126,234,.4)'; btn.style.background='rgba(102,126,234,.08)'; btn.style.color='var(--purple)'; btn.classList.add('active');
      });
    });

    // Persona radio styling
    modal.querySelectorAll('input[name="ap-persona"]').forEach(radio => {
      radio.addEventListener('change', () => {
        modal.querySelectorAll('label').forEach(lbl => {
          const r = lbl.querySelector('input[type="radio"]');
          if (!r) return;
          const sel = r.checked;
          lbl.style.borderColor  = sel ? 'rgba(102,126,234,.4)' : 'var(--border)';
          lbl.style.background   = sel ? 'rgba(102,126,234,.08)' : 'rgba(255,255,255,.03)';
        });
      });
    });

    document.getElementById('apm-close')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('apm-save')?.addEventListener('click', () => {
      const personaVal = modal.querySelector('input[name="ap-persona"]:checked')?.value || p.persona;
      const verbVal    = modal.querySelector('.ap-verb-btn.active')?.dataset.val || p.verbosity;
      update({
        persona  : personaVal,
        verbosity: verbVal,
        useEmojis: document.getElementById('ap-emojis')?.checked,
        useBold  : document.getElementById('ap-bold')?.checked,
        customNote: (document.getElementById('ap-custom')?.value || '').slice(0,200),
      });
      modal.remove();
      showToast && showToast('AI persona updated!', 'success', 2000);
    });
  }

  return { PERSONAS, DEFAULTS, load, save, update, getSystemSuffix, showModal };
})();

window.AIPersona = AIPersona;