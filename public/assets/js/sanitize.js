/* ============================================================
   STUDYAI — sanitize.js  (Part 4)
   Frontend XSS protection + input sanitisation.
   Must be loaded FIRST, before any other JS.
   ============================================================ */

// ── HTML escape (safe text insertion) ─────────────────────
// Use this whenever inserting user content as innerHTML
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
// Alias used throughout app
const escapeHtml = escHtml;

// ── Sanitize HTML (safe rich content) ─────────────────────
// Strips all dangerous tags/attrs, keeps safe formatting
function sanitizeHtml(dirty) {
  if (!dirty) return '';

  // Allowed tags
  const ALLOWED_TAGS = new Set([
    'b','strong','i','em','u','s','del','ins',
    'h1','h2','h3','h4','p','br','hr',
    'ul','ol','li',
    'blockquote','code','pre',
    'table','thead','tbody','tr','th','td',
    'span','div','a',
  ]);

  // Allowed attributes per tag
  const ALLOWED_ATTRS = {
    a    : ['href', 'title', 'target', 'rel'],
    td   : ['colspan', 'rowspan'],
    th   : ['colspan', 'rowspan', 'scope'],
    '*'  : ['class', 'id'],
  };

  // Dangerous URL schemes
  const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data|blob):/i;

  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  _walkDOM(doc.body);

  function _walkDOM(node) {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove(); continue;
      }
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Replace with its children (unwrap, don't delete content)
        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
        child.remove();
        continue;
      }
      // Clean attributes
      const allowedForTag = [...(ALLOWED_ATTRS[tag] || []), ...(ALLOWED_ATTRS['*'] || [])];
      [...child.attributes].forEach(attr => {
        if (!allowedForTag.includes(attr.name)) { child.removeAttribute(attr.name); return; }
        // Sanitize href/src
        if (attr.name === 'href' && DANGEROUS_PROTOCOLS.test(attr.value.trim())) {
          child.removeAttribute('href');
        }
        // Force safe links
        if (attr.name === 'target' && attr.value === '_blank') {
          child.setAttribute('rel', 'noopener noreferrer');
        }
      });
      _walkDOM(child);
    }
  }

  return doc.body.innerHTML;
}

// ── Sanitize plain text (strip all HTML) ─────────────────
function sanitizeText(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.innerHTML = String(str);
  return div.textContent || div.innerText || '';
}

// ── Sanitize URL ──────────────────────────────────────────
function sanitizeUrl(url) {
  if (!url) return '#';
  const str = String(url).trim();
  if (/^(javascript|vbscript|data):/i.test(str)) return '#';
  return str;
}

// ── Sanitize form inputs in a container ──────────────────
function sanitizeFormInputs(container = document) {
  container.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('paste', e => {
      // Strip HTML from paste events — only allow plain text
      const paste = (e.clipboardData || window.clipboardData).getData('text/plain');
      if (e.target.type !== 'password') {
        e.preventDefault();
        const cleaned = sanitizeText(paste);
        document.execCommand('insertText', false, cleaned);
      }
    });
  });
}

// ── Safe innerHTML setter ─────────────────────────────────
// Replace all el.innerHTML = userContent with safeHTML(el, content)
function safeHTML(element, html) {
  if (!element) return;
  element.innerHTML = sanitizeHtml(html);
}

// ── Safe innerText setter (even safer) ───────────────────
function safeText(element, text) {
  if (!element) return;
  element.textContent = sanitizeText(text);
}

// ── Validate common fields ────────────────────────────────
const Validate = {
  email(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(str || '').trim());
  },
  password(str) {
    const s = String(str || '');
    return s.length >= 8 && s.length <= 128;
  },
  name(str) {
    const s = String(str || '').trim();
    return s.length >= 1 && s.length <= 80 && !/[<>'";&]/.test(s);
  },
  url(str) {
    try { const u = new URL(String(str || '')); return ['http:','https:'].includes(u.protocol); }
    catch { return false; }
  },
  youtubeUrl(str) {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[A-Za-z0-9_-]{11}/.test(String(str || ''));
  },
  positiveInt(val, max = 1000) {
    const n = parseInt(val, 10);
    return !isNaN(n) && n > 0 && n <= max;
  },
  notEmpty(str) {
    return String(str || '').trim().length > 0;
  },
};

// ── Rate limiter for client-side actions ─────────────────
// Prevents button-spam flooding the server
const ActionRateLimiter = (function() {
  const _counts = {};
  const _timestamps = {};

  return {
    // Returns true if action is allowed, false if rate-limited
    check(actionKey, maxPerMinute = 10) {
      const now = Date.now();
      const windowStart = now - 60000;
      if (!_timestamps[actionKey]) _timestamps[actionKey] = [];
      // Remove old timestamps
      _timestamps[actionKey] = _timestamps[actionKey].filter(t => t > windowStart);
      if (_timestamps[actionKey].length >= maxPerMinute) return false;
      _timestamps[actionKey].push(now);
      return true;
    },
    reset(actionKey) {
      delete _timestamps[actionKey];
    },
  };
})();

// ── Auto-sanitize all dynamically-set innerHTML ──────────
// Override innerHTML setter to auto-sanitize (optional strict mode)
// DISABLED by default — enable with window.STUDYAI_STRICT_SANITIZE = true
if (window.STUDYAI_STRICT_SANITIZE) {
  const _desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', {
    set(value) {
      _desc.set.call(this, sanitizeHtml(String(value || '')));
    },
    get() { return _desc.get.call(this); },
  });
}

// ── Input length enforcer ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auto-enforce maxlength on all text inputs that don't have one
  document.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach(el => {
    if (!el.maxLength || el.maxLength === -1) {
      el.maxLength = el.tagName === 'TEXTAREA' ? 50000 : 500;
    }
  });
  sanitizeFormInputs();
});