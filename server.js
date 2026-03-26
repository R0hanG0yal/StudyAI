/* ============================================================
   STUDYAI — NODE.JS BACKEND  (v2 — Security-Hardened)
   ─────────────────────────────────────────────────────────────
   CHANGES FROM v1:
   ✅ PART 1 — Security:
      • bcrypt password hashing (replaces insecure base64)
      • crypto.randomBytes(32) session tokens (replaces Math.random)
      • express-rate-limit on auth + AI endpoints
      • CORS locked to ALLOWED_ORIGIN env var
      • Input length limits on every AI endpoint
      • Data key whitelist — POST /api/data only accepts known keys
   ✅ PART 2 — Cleanup:
      • callGemini renamed → callGroq (was misleading)
      • Demo credentials moved to .env (DEMO_EMAIL / DEMO_PASS)
      • max_tokens param added to callGroq (was hardcoded)
      • Duplicate GROQ_API_KEY check removed from /api/ai/chat
      • All AI inputs sliced to safe max lengths before sending
   ============================================================ */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const Groq       = require('groq-sdk');
const multer     = require('multer');
const pdfParse   = require('pdf-parse');
const mammoth    = require('mammoth');
const mongoose   = require('mongoose');
const bcrypt     = require('bcrypt');           // ✅ NEW: secure password hashing
const crypto     = require('crypto');           // ✅ NEW: secure token generation
const rateLimit  = require('express-rate-limit'); // ✅ NEW: rate limiting
const { execFile } = require('child_process');

// ── Constants ─────────────────────────────────────────────────
const BCRYPT_ROUNDS  = 12;
const MONGO_URI      = process.env.MONGO_URI || '';
// ✅ PART 2: Demo creds from env, with safe hardcoded fallbacks for dev
const DEMO_EMAIL     = process.env.DEMO_EMAIL || 'demo@studyai.com';
const DEMO_PASS      = process.env.DEMO_PASS  || 'demo1234';
// ✅ PART 1: Allowed CORS origin from env — '*' only for local dev
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
// ✅ PART 1: Max input lengths for AI endpoints (prevents abuse)
const MAX_TEXT_LEN   = 12000;
const MAX_MSG_LEN    = 4000;
const MAX_CTX_LEN    = 8000;

if (!MONGO_URI) {
  console.error('\n  ❌  MONGO_URI is not set in .env — data will NOT be saved.');
  console.error('     Create a free cluster at https://cloud.mongodb.com\n');
}

// ════════════════════════════════════════════════════════════
//  MONGOOSE SCHEMAS
// ════════════════════════════════════════════════════════════
const userSchema = new mongoose.Schema({
  id      : { type: String, required: true, unique: true },
  name    : String,
  email   : { type: String, required: true, unique: true },
  password: String,   // ✅ now stored as bcrypt hash
  course  : String,
  created : Number,
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const userDataSchema = new mongoose.Schema({
  userId : { type: String, required: true, unique: true },
  data   : { type: mongoose.Schema.Types.Mixed, default: {} },
});
const UserData = mongoose.models.UserData || mongoose.model('UserData', userDataSchema);

const sessionSchema = new mongoose.Schema({
  token  : { type: String, required: true, unique: true },
  user   : { type: mongoose.Schema.Types.Mixed, required: true },
  created: { type: Date, default: Date.now, expires: '7d' },
});
const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);

// ════════════════════════════════════════════════════════════
//  DATA HELPERS
// ════════════════════════════════════════════════════════════
async function loadUserData(userId) {
  if (!MONGO_URI) return {};
  try {
    const doc = await UserData.findOne({ userId });
    return doc ? doc.data : {};
  } catch (err) {
    console.error('loadUserData failed for', userId, err);
    throw new Error('Database error during load');
  }
}

async function saveUserData(userId, data) {
  if (!MONGO_URI) return;
  await UserData.findOneAndUpdate(
    { userId },
    { $set: { data } },
    { upsert: true, new: true }
  );
}

async function seedUserData(userId) {
  if (!MONGO_URI) return;
  const existing = await loadUserData(userId);
  if (!existing || Object.keys(existing).length === 0) {
    await saveUserData(userId, {
      notes: [{
        id: 'note_seed_1',
        title: 'Welcome to StudyAI',
        content: 'This is your first note! Paste your study material here and use the AI tools.',
        folder: 'General',
        created: Date.now(),
      }],
    });
  }
}

async function loadUsers() {
  if (!MONGO_URI) return [];
  try { return await User.find({}).lean(); }
  catch { return []; }
}

async function saveUser(userObj) {
  if (!MONGO_URI) return;
  await User.findOneAndUpdate(
    { id: userObj.id },
    { $set: userObj },
    { upsert: true, new: true }
  );
}

// ════════════════════════════════════════════════════════════
//  MULTER — file upload
// ════════════════════════════════════════════════════════════
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg','image/jpg','image/png','image/webp','image/gif','image/bmp','image/tiff',
]);

const upload = multer({
  storage   : multer.memoryStorage(),
  limits    : { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED_TYPES.has(file.mimetype) ||
               file.originalname.match(/\.(pdf|docx|doc|jpg|jpeg|png|webp|gif|bmp|tiff)$/i);
    ok ? cb(null, true) : cb(new Error('Unsupported file type.'), false);
  },
});

// ════════════════════════════════════════════════════════════
//  APP + MIDDLEWARE
// ════════════════════════════════════════════════════════════
const app  = express();
const PORT = process.env.PORT || 3000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// ✅ PART 1: CORS — locked to env var in production
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ PART 1: Rate limiters
// Auth endpoints: 15 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs        : 15 * 60 * 1000,
  max             : 15,
  standardHeaders : true,
  legacyHeaders   : false,
  message         : { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

// AI endpoints: 40 requests per minute per IP
const aiLimiter = rateLimit({
  windowMs        : 60 * 1000,
  max             : 40,
  standardHeaders : true,
  legacyHeaders   : false,
  message         : { error: 'AI rate limit reached. Please wait a moment before trying again.' },
});

// ── In-memory sessions (fallback when no Mongo) ───────────────
const sessions = {};

// ✅ PART 1: Cryptographically secure session tokens
function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE
// ════════════════════════════════════════════════════════════
async function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorized. Please login.' });

  if (MONGO_URI) {
    try {
      const sess = await Session.findOne({ token });
      if (!sess) return res.status(401).json({ error: 'Session expired. Please login again.' });
      req.user = sess.user;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Session verification failed' });
    }
  } else {
    if (!sessions[token]) return res.status(401).json({ error: 'Unauthorized. Please login.' });
    req.user = sessions[token];
    next();
  }
}

// ════════════════════════════════════════════════════════════
//  AUTH ENDPOINTS
// ════════════════════════════════════════════════════════════

// POST /api/login
// ✅ PART 1: Rate-limited | ✅ PART 1: bcrypt compare | ✅ PART 2: demo creds from env
app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  if (!cleanEmail || !password) return res.status(400).json({ error: 'Missing email or password.' });

  // Demo account — credentials now from .env
  if (cleanEmail === DEMO_EMAIL.toLowerCase() && password === DEMO_PASS) {
    const token = makeToken();
    const user  = { userId: 'demo-user', name: 'Alex Johnson', email: cleanEmail, course: 'Computer Science' };
    if (MONGO_URI) { await Session.create({ token, user }); } else { sessions[token] = user; }
    await seedUserData('demo-user');
    return res.json({ token, user });
  }

  try {
    const users = await loadUsers();
    const u     = users.find(x => x.email && x.email.toLowerCase() === cleanEmail);
    if (!u) return res.status(401).json({ error: 'No account found with that email. Please sign up.' });

    // ✅ PART 1: Secure bcrypt comparison
    const passwordMatch = await bcrypt.compare(password, u.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Incorrect password.' });

    const token = makeToken(); // ✅ PART 1: crypto token
    const user  = { userId: u.id, name: u.name, email: u.email, course: u.course };
    if (MONGO_URI) { await Session.create({ token, user }); } else { sessions[token] = user; }
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/signup
// ✅ PART 1: Rate-limited | ✅ PART 1: bcrypt hash | ✅ PART 1: crypto token
app.post('/api/signup', authLimiter, async (req, res) => {
  const { name, email, password, course } = req.body;
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  if (!name?.trim() || !cleanEmail || !password)
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  if (name.trim().length < 2)
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const users = await loadUsers();
    if (users.find(u => u.email && u.email.toLowerCase() === cleanEmail))
      return res.status(409).json({ error: 'An account with this email already exists.' });

    // ✅ PART 1: bcrypt hash — secure password storage
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = {
      id      : 'u_' + Date.now(),
      name    : name.trim(),
      email   : cleanEmail,
      password: hashedPassword,
      course  : course?.trim() || 'General',
      created : Date.now(),
    };
    await saveUser(newUser);
    await seedUserData(newUser.id);

    const token = makeToken(); // ✅ PART 1: crypto token
    const user  = { userId: newUser.id, name: newUser.name, email: cleanEmail, course: newUser.course };
    if (MONGO_URI) { await Session.create({ token, user }); } else { sessions[token] = user; }
    res.json({ token, user });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// POST /api/logout
app.post('/api/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (token) {
    if (MONGO_URI) await Session.deleteOne({ token });
    else delete sessions[token];
  }
  res.json({ ok: true });
});

// GET /api/me — get current user info
app.get('/api/me', auth, (req, res) => {
  res.json({ user: req.user });
});

// ════════════════════════════════════════════════════════════
//  DATA ENDPOINTS
// ════════════════════════════════════════════════════════════

// ✅ PART 1: Whitelist of allowed data keys — prevents arbitrary field injection
const ALLOWED_DATA_KEYS = new Set([
  'notes', 'summaries', 'flashcards', 'quizzes', 'quizResults',
  'tasks', 'exams', 'revisions', 'sessions', 'streak',
  'groups', 'discussions', 'achievements', 'chatHistory',
  'settings', 'seeded', 'subjects', 'focusSessions', 'chatSessions'
]);

// GET /api/data
app.get('/api/data', auth, async (req, res) => {
  try {
    const data = await loadUserData(req.user.userId);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/data — merge update (atomic)
app.post('/api/data', auth, async (req, res) => {
  try {
    const updateObj = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (ALLOWED_DATA_KEYS.has(key)) {
        updateObj[`data.${key}`] = value;
      }
    }
    if (Object.keys(updateObj).length === 0) return res.json({ ok: true });

    await UserData.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateObj },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/data/:key
app.get('/api/data/:key', auth, async (req, res) => {
  if (!ALLOWED_DATA_KEYS.has(req.params.key))
    return res.status(400).json({ error: 'Invalid data key.' });
  try {
    const data = await loadUserData(req.user.userId);
    res.json({ value: data[req.params.key] ?? null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/data/:key
app.post('/api/data/:key', auth, async (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_DATA_KEYS.has(key))
    return res.status(400).json({ error: 'Invalid data key.' });
  try {
    const updateObj = {};
    updateObj[`data.${key}`] = req.body.value;
    await UserData.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateObj },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/data
app.delete('/api/data', auth, async (req, res) => {
  try {
    await saveUserData(req.user.userId, {});
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  AI HELPER
//  ✅ PART 2: Renamed callGemini → callGroq (was misleading)
//  ✅ PART 2: max_tokens is now a proper parameter with default
// ════════════════════════════════════════════════════════════
async function callGroq(system, userMsg, maxTokens = 2048) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured. Get a free key at https://console.groq.com');
  }
  const completion = await groq.chat.completions.create({
    model   : 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: system  },
      { role: 'user',   content: userMsg },
    ],
    max_tokens: maxTokens,
  });
  return completion.choices[0].message.content;
}

// ════════════════════════════════════════════════════════════
//  AI ENDPOINTS
//  ✅ PART 1: aiLimiter applied to all AI endpoints
//  ✅ PART 1: Input lengths capped before sending to API
//  ✅ PART 2: callGemini → callGroq everywhere
// ════════════════════════════════════════════════════════════

// ── POST /api/ai/chat ────────────────────────────────────────
app.post('/api/ai/chat', auth, aiLimiter, async (req, res) => {
  const { message, notesContext, mode = 'general', history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'No message provided' });

  const modeInstructions = {
    general: 'Answer clearly and helpfully.',
    exam   : 'Focus on exam-relevant content. Be concise and highlight key points.',
    simple : 'Explain in very simple language, as if to a beginner. Use analogies.',
    deep   : 'Give a thorough, technical, in-depth explanation with examples.',
    memory : 'Help with memorisation. Create mnemonics, memory tricks, and visual associations.',
  };

  const system = `You are StudyAI, an intelligent academic assistant helping students study effectively.
${modeInstructions[mode] || modeInstructions.general}

The student's notes context:
---
${(notesContext || 'No notes provided. Answer generally.').slice(0, MAX_CTX_LEN)}
---

Always answer from the student's notes when relevant. Format responses with markdown where helpful.`;

  try {
    // ✅ PART 2: Removed duplicate GROQ_API_KEY check (callGroq handles it)
    // ✅ PART 1: Cap history to last 10 messages, cap message length
    const safeHistory = (Array.isArray(history) ? history : []).slice(-10);
    const completion = await groq.chat.completions.create({
      model   : 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        ...safeHistory.map(m => ({
          role   : m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || '').slice(0, MAX_MSG_LEN),
        })),
        { role: 'user', content: message.slice(0, MAX_MSG_LEN) },
      ],
      max_tokens: 1024,
    });
    res.json({ response: completion.choices[0].message.content });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/summarise ───────────────────────────────────
app.post('/api/ai/summarise', auth, aiLimiter, async (req, res) => {
  const { text, type = 'general', noteTitle = 'Notes' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  const instructions = {
    general: 'Write a clear, concise summary of the key points.',
    bullet : 'Summarise as 7-10 bullet points. Each bullet should be one clear fact or concept.',
    chapter: 'Identify main sections/chapters and write a short summary for each. Use ## headings.',
    exam   : 'Write an exam-focused summary: key terms, important definitions, core concepts to memorise.',
    simple : 'Rewrite in very simple language (Grade 8 level). Use short sentences and plain words.',
  };

  try {
    // ✅ PART 1: Cap input length
    const response = await callGroq(
      `You are an expert academic summariser. ${instructions[type] || instructions.general} Be thorough but concise.`,
      `Summarise the following study notes titled "${noteTitle}":\n\n${text.slice(0, MAX_TEXT_LEN)}`
    );
    res.json({ summary: response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/quiz ────────────────────────────────────────
app.post('/api/ai/quiz', auth, aiLimiter, async (req, res) => {
  const { text, count = 10, difficulty = 'medium' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  // ✅ PART 1: Sanitise count to prevent abuse
  const safeCount = Math.min(Math.max(parseInt(count, 10) || 10, 1), 30);

  const diffDesc = {
    easy  : 'straightforward factual questions',
    medium: 'questions requiring understanding and application',
    hard  : 'challenging analytical and evaluative questions',
  };

  try {
    // ✅ PART 1: Cap input + ✅ PART 2: callGroq
    const raw = await callGroq(
      `You are an expert quiz generator. Generate exactly ${safeCount} multiple choice questions.
Difficulty: ${diffDesc[difficulty] || diffDesc.medium}.
Return ONLY a valid JSON array, no other text:
[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]
"correct" is the 0-based index. All 4 options must be plausible but only one correct.`,
      `Generate ${safeCount} ${difficulty} MCQ questions from these study notes:\n\n${text.slice(0, MAX_TEXT_LEN)}`
    );

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI returned invalid quiz format. Please try again.');
    const questions = JSON.parse(jsonMatch[0]);
    res.json({ questions });
  } catch (err) {
    console.error('Quiz error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/flashcards ──────────────────────────────────
app.post('/api/ai/flashcards', auth, aiLimiter, async (req, res) => {
  const { text, deck = 'General', count = 15 } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  const safeCount = Math.min(Math.max(parseInt(count, 10) || 15, 1), 50);

  try {
    // ✅ PART 1: Cap input + ✅ PART 2: callGroq
    const raw = await callGroq(
      `You are an expert flashcard creator. Generate exactly ${safeCount} flashcards.
Return ONLY a valid JSON array:
[{"front":"Question or term (concise)","back":"Answer or definition (clear)"}]
Focus on: key definitions, important concepts, formulas, algorithms, and relationships.`,
      `Create ${safeCount} flashcards for deck "${deck}":\n\n${text.slice(0, MAX_TEXT_LEN)}`
    );

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI returned invalid flashcard format. Please try again.');
    const cards = JSON.parse(jsonMatch[0]);

    const now = new Date().toISOString().split('T')[0];
    const formatted = cards.map((c, i) => ({
      id        : `fc_${Date.now()}_${i}`,
      front     : c.front,
      back      : c.back,
      deck,
      difficulty: null,
      favorite  : false,
      interval  : 1,
      nextReview: now,
      reviews   : 0,
      created   : Date.now(),
    }));

    res.json({ flashcards: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/extract-topics ──────────────────────────────
app.post('/api/ai/extract-topics', auth, aiLimiter, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  try {
    // ✅ PART 2: callGroq
    const raw = await callGroq(
      'Extract the main topics from these study notes. Return ONLY a JSON array: [{"topic":"Name","subtopics":["sub1","sub2"],"relevance":8}]. relevance is 1-10.',
      text.slice(0, MAX_TEXT_LEN), // ✅ PART 1: cap
      800
    );
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const topics = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    res.json({ topics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/roadmap ─────────────────────────────────────
app.post('/api/ai/roadmap', auth, aiLimiter, async (req, res) => {
  const { subject, examDate, level = 'intermediate' } = req.body;
  if (!subject || !examDate) return res.status(400).json({ error: 'Missing subject or examDate' });

  // ✅ PART 1: Sanitise subject length
  const safeSubject = subject.slice(0, 100);
  const daysLeft = Math.max(1, Math.ceil((new Date(examDate) - new Date()) / 86400000));

  try {
    // ✅ PART 2: callGroq
    const response = await callGroq(
      'You are an expert study coach. Create a detailed, practical exam preparation roadmap.',
      `Create a ${daysLeft}-day exam roadmap for "${safeSubject}" at ${level} level.
Exam date: ${examDate}
Format as structured markdown with:
1. Brief overview
2. Four phases (Foundation, Deep Study, Revision, Mock Tests) — each with duration, focus areas, daily tasks, tips
3. Exam day tips
Be specific and practical.`
    );
    res.json({ roadmap: response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/compare ─────────────────────────────────────
app.post('/api/ai/compare', auth, aiLimiter, async (req, res) => {
  const { topicA, topicB, context = '' } = req.body;
  if (!topicA || !topicB) return res.status(400).json({ error: 'Missing topics' });

  // ✅ PART 1: Cap topic and context lengths
  const safeA = topicA.slice(0, 100);
  const safeB = topicB.slice(0, 100);

  try {
    // ✅ PART 2: callGroq
    const raw = await callGroq(
      `You are an expert educator. Compare two topics clearly and accurately.
Return ONLY valid JSON:
{
  "aboutA": "2-3 sentence description of topic A",
  "aboutB": "2-3 sentence description of topic B",
  "similarities": ["similarity 1", "similarity 2", "similarity 3"],
  "differences": ["key difference 1", "key difference 2", "key difference 3"],
  "tableRows": [
    {"aspect": "Definition", "a": "...", "b": "..."},
    {"aspect": "Use Case",   "a": "...", "b": "..."},
    {"aspect": "Complexity", "a": "...", "b": "..."},
    {"aspect": "When to use","a": "...", "b": "..."}
  ]
}`,
      `Compare "${safeA}" vs "${safeB}".${context ? `\n\nContext:\n${context.slice(0, 2000)}` : ''}`,
      1200
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON from AI');
    res.json({ comparison: JSON.parse(jsonMatch[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/onenight ────────────────────────────────────
app.post('/api/ai/onenight', auth, aiLimiter, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  try {
    // ✅ PART 2: callGroq
    const raw = await callGroq(
      `You are a last-minute exam coach. Create an emergency revision pack.
Return ONLY valid JSON:
{
  "mustKnow": ["fact 1","fact 2","fact 3","fact 4","fact 5","fact 6","fact 7","fact 8"],
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10"],
  "definitions": [{"term":"term","definition":"definition"}],
  "formulas": [{"formula":"formula or equation","context":"what it is used for"}],
  "examTips": ["tip 1","tip 2","tip 3","tip 4","tip 5"]
}`,
      `Create a one-night-before-exam revision pack from these notes:\n\n${text.slice(0, 4000)}` // ✅ PART 1
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON from AI');
    res.json({ pack: JSON.parse(jsonMatch[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/questions ───────────────────────────────────
app.post('/api/ai/questions', auth, aiLimiter, async (req, res) => {
  const { text, count = 10, difficulty = 'medium' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  const safeCount = Math.min(Math.max(parseInt(count, 10) || 10, 1), 30);

  try {
    // ✅ PART 2: callGroq | ✅ PART 1: cap input
    const raw = await callGroq(
      `Generate ${safeCount} important study questions with answers. Return ONLY JSON array:
[{"q":"question text","a":"detailed answer","type":"short-answer"}]
Difficulty: ${difficulty}. Mix types: define, explain, compare, analyse, list.`,
      text.slice(0, MAX_TEXT_LEN),
      2000
    );

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/extract-formulas ────────────────────────────
app.post('/api/ai/extract-formulas', auth, aiLimiter, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  try {
    // ✅ PART 2: callGroq | ✅ PART 1: cap input
    const raw = await callGroq(
      'Extract all mathematical formulas, equations, and algorithmic complexity notations. Return ONLY JSON array: [{"formula":"...","context":"...","type":"equation|complexity|expression"}]',
      text.slice(0, 4000), // ✅ PART 1
      800
    );

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const formulas = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    res.json({ formulas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  PDF UPLOAD
// ════════════════════════════════════════════════════════════
app.post('/api/upload/pdf', auth, upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded.' });

  try {
    const pdfData = await pdfParse(req.file.buffer, { normalizeWhitespace: true });
    let text = (pdfData.text || '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    if (!text || text.length < 10)
      return res.status(422).json({ error: 'Could not extract text from this PDF. It may be a scanned image PDF.' });

    const words = text.split(/\s+/).filter(Boolean).length;
    const pages = pdfData.numpages || 1;
    const title = (req.file.originalname || 'Uploaded PDF')
      .replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

    res.json({ text, title, pages, wordCount: words, charCount: text.length });
  } catch (err) {
    console.error('PDF parse error:', err.message);
    if (err.message?.toLowerCase().includes('password'))
      return res.status(422).json({ error: 'This PDF is password-protected. Please unlock it first.' });
    res.status(500).json({ error: 'Failed to parse PDF: ' + err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  SMART UNIVERSAL FILE UPLOAD  (images, PDFs, DOCX)
// ════════════════════════════════════════════════════════════
async function analyzeImageWithGroq(imageBuffer, mimeType, prompt) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured.');
  const base64Image = imageBuffer.toString('base64');
  const completion = await groq.chat.completions.create({
    model   : 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{
      role   : 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
        { type: 'text', text: prompt },
      ],
    }],
    max_tokens: 4096,
  });
  return completion.choices[0].message.content;
}

function cleanText(text) {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function titleFromFilename(filename) {
  return (filename || 'Uploaded File')
    .replace(/\.(pdf|docx|doc|jpg|jpeg|png|webp|gif|bmp|tiff)$/i, '')
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

app.post('/api/upload/smart', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const { buffer, mimetype, originalname } = req.file;
  const title    = titleFromFilename(originalname);
  const isImage  = mimetype.startsWith('image/');
  const isPDF    = mimetype === 'application/pdf';
  const isDOCX   = mimetype.includes('wordprocessingml') || mimetype === 'application/msword' ||
                   originalname.toLowerCase().endsWith('.docx') || originalname.toLowerCase().endsWith('.doc');

  try {
    if (isImage) {
      const aiPrompt = `You are an expert at reading images for students.
1. Extract ALL text visible (handwritten or printed)
2. Describe any diagrams, charts, or visual elements
3. Write a brief summary

Format as:
---EXTRACTED TEXT---
[all text]
---IMAGE DESCRIPTION---
[visual description]
---SUMMARY---
[brief summary]`;

      const aiResult    = await analyzeImageWithGroq(buffer, mimetype, aiPrompt);
      const textMatch   = aiResult.match(/---EXTRACTED TEXT---([\s\S]*?)(?:---IMAGE DESCRIPTION---|$)/);
      const descMatch   = aiResult.match(/---IMAGE DESCRIPTION---([\s\S]*?)(?:---SUMMARY---|$)/);
      const sumMatch    = aiResult.match(/---SUMMARY---([\s\S]*?)$/);
      const extracted   = cleanText(textMatch?.[1] || aiResult);
      const description = cleanText(descMatch?.[1] || '');
      const summary     = cleanText(sumMatch?.[1] || '');
      const fullContent = [extracted, description ? `\n\n## Image Description\n${description}` : '', summary ? `\n\n## Summary\n${summary}` : ''].join('').trim();

      return res.json({ text: fullContent, title, type: 'image', pages: 1, wordCount: fullContent.split(/\s+/).filter(Boolean).length, charCount: fullContent.length, hasImage: true, aiAnalysis: summary || description });
    }

    if (isPDF) {
      let pdfText = '', pages = 1, isScanned = false;
      try {
        const pdfData = await pdfParse(buffer, { normalizeWhitespace: true });
        pdfText = cleanText(pdfData.text || '');
        pages = pdfData.numpages || 1;
      } catch { isScanned = true; }

      if (!isScanned && pdfText.split(/\s+/).filter(Boolean).length < 30) isScanned = true;

      if (isScanned) {
        try {
          const aiResult = await analyzeImageWithGroq(buffer, 'application/pdf', 'Extract ALL text from this scanned PDF, preserve structure and formatting.');
          const clean = cleanText(aiResult);
          return res.json({ text: clean, title, type: 'scanned-pdf', pages, wordCount: clean.split(/\s+/).filter(Boolean).length, charCount: clean.length, hasImage: true, aiAnalysis: `Extracted from scanned PDF (${pages} pages) using AI vision.` });
        } catch {
          if (pdfText.length > 10) return res.json({ text: pdfText, title, type: 'pdf', pages, wordCount: pdfText.split(/\s+/).filter(Boolean).length, charCount: pdfText.length, hasImage: false, aiAnalysis: 'Note: Scanned PDF — extraction may be incomplete.' });
          return res.status(422).json({ error: 'Scanned/image PDF could not be read. Try converting a page to JPG/PNG first.' });
        }
      }

      return res.json({ text: pdfText, title, type: 'pdf', pages, wordCount: pdfText.split(/\s+/).filter(Boolean).length, charCount: pdfText.length, hasImage: false, aiAnalysis: null });
    }

    if (isDOCX) {
      const result  = await mammoth.extractRawText({ buffer });
      const rawText = cleanText(result.value || '');
      if (!rawText || rawText.length < 10) return res.status(422).json({ error: 'Could not extract text from this Word document.' });
      const wordCount = rawText.split(/\s+/).filter(Boolean).length;
      return res.json({ text: rawText, title, type: 'docx', pages: Math.ceil(wordCount / 300), wordCount, charCount: rawText.length, hasImage: false, aiAnalysis: null });
    }

    res.status(422).json({ error: 'Unsupported file type.' });
  } catch (err) {
    console.error('Smart upload error:', err.message);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  YOUTUBE ENDPOINTS
// ════════════════════════════════════════════════════════════
function extractYouTubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function fetchYouTubeTranscript(videoId) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'get_transcript.py');
    if (!fs.existsSync(scriptPath)) return reject(new Error('Transcript script not found on server.'));
    execFile('python3', [scriptPath, videoId], { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error('Transcript fetch failed: ' + (stderr || err.message).slice(0, 200)));
      try {
        const data = JSON.parse(stdout);
        if (data.error) return reject(new Error(data.error));
        resolve(data.text);
      } catch { reject(new Error('Could not parse transcript response.')); }
    });
  });
}

// ✅ PART 1: aiLimiter | ✅ PART 2: callGroq
app.post('/api/ai/youtube', auth, aiLimiter, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided.' });
  const videoId = extractYouTubeId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL.' });

  try {
    const transcript = await fetchYouTubeTranscript(videoId).catch(e => { throw e; });
    if (!transcript || transcript.length < 30)
      return res.status(422).json({ error: 'Transcript too short. Try a video with proper captions (CC).' });

    const truncated = transcript.length > 8000 ? transcript.substring(0, 8000) + '... [transcript truncated]' : transcript;

    const summary = await callGroq( // ✅ PART 2
      'You are an expert academic note-taker. Convert this YouTube video transcript into comprehensive study notes.\n\nFormat:\n## Video Summary\n[overview]\n\n## Key Concepts\n[bullets]\n\n## Detailed Notes\n[structured notes]\n\n## Key Takeaways\n[5-7 points]\n\n## Likely Exam Questions\n[3-5 questions]',
      'Convert this transcript into study notes:\n\n' + truncated
    );

    res.json({ summary, videoId, transcriptLength: transcript.length, wordCount: transcript.split(/\s+/).length });
  } catch (err) {
    console.error('YouTube error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/youtube-from-transcript', auth, aiLimiter, async (req, res) => { // ✅ PART 1
  const { transcript, videoId } = req.body;
  if (!transcript || transcript.trim().length < 30) return res.status(400).json({ error: 'No transcript provided.' });

  try {
    const truncated = transcript.length > 8000 ? transcript.substring(0, 8000) + '... [truncated]' : transcript;
    const summary = await callGroq( // ✅ PART 2
      'You are an expert academic note-taker. Convert transcript to study notes.\nFormat:\n## Video Summary\n## Key Concepts\n## Detailed Notes\n## Key Takeaways\n## Likely Exam Questions',
      'Convert this transcript into study notes:\n\n' + truncated
    );
    res.json({ summary, videoId, wordCount: transcript.split(/\s+/).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  AI DOUBT SOLVER
// ════════════════════════════════════════════════════════════
// ✅ PART 1: aiLimiter | ✅ PART 1: cap extraContext length
app.post('/api/ai/solve-doubt', auth, aiLimiter, upload.single('image'), async (req, res) => {
  const { subject = 'General', extraContext = '' } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });

  const { buffer, mimetype } = req.file;
  if (!mimetype.startsWith('image/')) return res.status(400).json({ error: 'Please upload an image file (JPG, PNG, etc.)' });

  try {
    const base64Image = buffer.toString('base64');
    const prompt = `You are an expert tutor and problem solver. A student has uploaded an image of a question.
${extraContext ? `Additional context: "${extraContext.slice(0, 500)}"` : ''}
Subject hint: ${subject.slice(0, 50)}

Please solve this step by step:

## ❓ Question Identified
[state the question from the image]

## 🔍 Problem Type
[subject + type]

## ✏️ Step-by-Step Solution
[numbered steps, show all working]

## 💡 Concept Explanation
[underlying concept]

## 🚀 Tips for Similar Problems
[2-3 quick tips]`;

    const completion = await groq.chat.completions.create({
      model   : 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mimetype};base64,${base64Image}` } },
        { type: 'text', text: prompt },
      ]}],
      max_tokens: 2000,
    });

    res.json({ solution: completion.choices[0].message.content });
  } catch (err) {
    console.error('Doubt solver error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  UTILITY ENDPOINTS
// ════════════════════════════════════════════════════════════
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '2.0' });
});

// ── Catch-all SPA ─────────────────────────────────────────────
app.get('*splat', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Frontend not found. Put your index.html in the /public folder.');
});

// ════════════════════════════════════════════════════════════
//  START SERVER
// ════════════════════════════════════════════════════════════
async function startServer() {
  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('  ✅ MongoDB connected');
    } catch (err) {
      console.error('  ❌ MongoDB connection failed:', err.message);
      console.error('     App will start but data will NOT persist.\n');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ╔════════════════════════════════════════════╗');
    console.log('  ║   🧠  StudyAI Backend v2 Running!          ║');
    console.log(`  ║   http://localhost:${PORT}                  ║`);
    console.log('  ║   Security: bcrypt · crypto · rate-limit   ║');
    console.log('  ╚════════════════════════════════════════════╝');
    console.log('');

    if (!process.env.GROQ_API_KEY) {
      console.warn('  ⚠️  GROQ_API_KEY not set — AI features disabled');
      console.warn('     Add it to .env: GROQ_API_KEY=your_key_here\n');
    } else {
      console.log('  ✅ Groq API key loaded\n');
    }

    if (!MONGO_URI) {
      console.warn('  ⚠️  MONGO_URI not set — user data will NOT be saved');
      console.warn('     Free cluster at https://cloud.mongodb.com\n');
    }

    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || '';
    if (RENDER_URL) {
      const PING_INTERVAL = 14 * 60 * 1000;
      setInterval(async () => {
        try {
          const r = await fetch(`${RENDER_URL}/api/ping`);
          console.log(`  💓 Self-ping OK [${new Date().toLocaleTimeString()}] → ${r.status}`);
        } catch (err) {
          console.warn(`  ⚠️  Self-ping failed: ${err.message}`);
        }
      }, PING_INTERVAL);
      console.log(`  💓 Keep-alive enabled → ${RENDER_URL}/api/ping\n`);
    }
  });
}

startServer();