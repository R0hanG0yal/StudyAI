/* ============================================================
   STUDYAI — NODE.JS BACKEND
   File: server.js

   Features:
   - Proxies Groq API (avoids browser CORS)
   - Serves the frontend static files
   - User session management (in-memory)
   - Per-user data persistence (MongoDB Atlas)
   - All AI endpoints: chat, summary, quiz, flashcards etc.

   Run:  node server.js
   Open: http://localhost:3000
   ============================================================ */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const Groq     = require('groq-sdk');
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');
const mongoose = require('mongoose');
const { execFile } = require('child_process');

// ── MongoDB connection ────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || '';
if (!MONGO_URI) {
  console.error('\n  ❌  MONGO_URI is not set in .env!  Data will NOT be saved.');
  console.error('     Create a free cluster at https://cloud.mongodb.com and add MONGO_URI to .env\n');
}

// ── Mongoose Schemas ─────────────────────────────────────────
const userSchema = new mongoose.Schema({
  id      : { type: String, required: true, unique: true },
  name    : String,
  email   : { type: String, required: true, unique: true },
  password: String,   // base64 encoded (same as before)
  course  : String,
  created : Number,
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const userDataSchema = new mongoose.Schema({
  userId : { type: String, required: true, unique: true },
  data   : { type: mongoose.Schema.Types.Mixed, default: {} },
});
const UserData = mongoose.models.UserData || mongoose.model('UserData', userDataSchema);

// ── Per-user data helpers (async) ────────────────────────────
async function loadUserData(userId) {
  if (!MONGO_URI) return {};
  try {
    const doc = await UserData.findOne({ userId });
    return doc ? doc.data : {};
  } catch { return {}; }
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
      notes: [
        {
          id: 'note_seed_1',
          title: 'Welcome to StudyAI',
          content: 'This is a starter note! You can paste your study material here and use the AI tools.',
          folder: 'General',
          created: Date.now(),
        },
      ],
    });
  }
}

// ── Users registry helpers (async) ───────────────────────────
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

// ── Multer — universal file upload (images, PDFs, DOCX), 25MB max ──
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg','image/jpg','image/png','image/webp','image/gif','image/bmp','image/tiff',
]);

const upload = require('multer')({
  storage   : require('multer').memoryStorage(),
  limits    : { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED_TYPES.has(file.mimetype) ||
               file.originalname.match(/\.(pdf|docx|doc|jpg|jpeg|png|webp|gif|bmp|tiff)$/i);
    ok ? cb(null, true) : cb(new Error('Unsupported file type.'), false);
  },
});


const app  = express();
const PORT = process.env.PORT || 3000;

// ── Groq client ─────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend from /public folder
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory sessions ───────────────────────────────────────
// key: sessionToken → { userId, name, email, course }
const sessions = {};
function makeToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ════════════════════════════════════════════════════════════
//  AUTH ENDPOINTS
// ════════════════════════════════════════════════════════════

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  // Demo account
  if (email === 'demo@studyai.com' && password === 'demo1234') {
    const token = makeToken();
    const user  = { userId: 'demo-user', name: 'Alex Johnson', email, course: 'Computer Science' };
    sessions[token] = user;
    await seedUserData('demo-user');   // auto-seed notes if first time
    return res.json({ token, user });
  }

  try {
    const users = await loadUsers();
    const u     = users.find(x => x.email === email);
    if (!u) return res.status(401).json({ error: 'No account found. Sign up first.' });
    if (u.password !== Buffer.from(password).toString('base64'))
      return res.status(401).json({ error: 'Incorrect password.' });

    const token = makeToken();
    const user  = { userId: u.id, name: u.name, email: u.email, course: u.course };
    sessions[token] = user;
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// POST /api/signup
app.post('/api/signup', async (req, res) => {
  const { name, email, password, course } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Fill all required fields.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const users = await loadUsers();
    if (users.find(u => u.email === email))
      return res.status(409).json({ error: 'Email already registered.' });

    const newUser = {
      id      : 'u_' + Date.now(),
      name,
      email,
      password: Buffer.from(password).toString('base64'),
      course  : course || 'General',
      created : Date.now(),
    };
    await saveUser(newUser);

    const token = makeToken();
    const user  = { userId: newUser.id, name, email, course: newUser.course };
    sessions[token] = user;
    await seedUserData(newUser.id);   // seed starter notes for new users
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed: ' + err.message });
  }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) delete sessions[token];
  res.json({ ok: true });
});

// ── Auth middleware for protected routes ─────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions[token])
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  req.user = sessions[token];
  next();
}

// ════════════════════════════════════════════════════════════
//  DATA ENDPOINTS  (per-user CRUD)
// ════════════════════════════════════════════════════════════

// GET /api/data  → returns all user data
app.get('/api/data', auth, async (req, res) => {
  try {
    const data = await loadUserData(req.user.userId);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/data  → save/merge user data
app.post('/api/data', auth, async (req, res) => {
  try {
    const current = await loadUserData(req.user.userId);
    const updated = { ...current, ...req.body };
    await saveUserData(req.user.userId, updated);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/data/:key  → get one key
app.get('/api/data/:key', auth, async (req, res) => {
  try {
    const data = await loadUserData(req.user.userId);
    res.json({ value: data[req.params.key] ?? null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/data/:key  → set one key
app.post('/api/data/:key', auth, async (req, res) => {
  try {
    const data = await loadUserData(req.user.userId);
    data[req.params.key] = req.body.value;
    await saveUserData(req.user.userId, data);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/data  → clear all user data
app.delete('/api/data', auth, async (req, res) => {
  try {
    await saveUserData(req.user.userId, {});
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
//  AI ENDPOINTS  (all use real Claude API)
// ════════════════════════════════════════════════════════════

// Helper: call Gemini with a system + user prompt
async function callGemini(system, userMsg) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set in .env file. Get free key at https://console.groq.com');
  }
  const completion = await groq.chat.completions.create({
    model   : 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: system  },
      { role: 'user',   content: userMsg },
    ],
    max_tokens: 2048,
  });
  return completion.choices[0].message.content;
}

// ── POST /api/ai/chat ────────────────────────────────────────
app.post('/api/ai/chat', auth, async (req, res) => {
  const { message, notesContext, mode = 'general', history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const modeInstructions = {
    general: 'Answer clearly and helpfully.',
    exam   : 'Focus on exam-relevant content. Be concise and highlight key points.',
    simple : 'Explain in very simple language, as if to a beginner. Use analogies.',
    deep   : 'Give a thorough, technical, in-depth explanation with examples.',
    memory : 'Help with memorisation. Create mnemonics, memory tricks, and visual associations.',
  };

  const system = `You are StudyAI, an intelligent academic assistant helping students study more effectively.
${modeInstructions[mode] || modeInstructions.general}

The student's notes context:
---
${notesContext || 'No notes provided. Answer generally.'}
---

Always answer from the student's notes when relevant. If the question is not covered in their notes, say so and answer from general knowledge.
Format responses with markdown where helpful (bold key terms, bullet lists for steps/lists).
Keep responses focused and educational.`;

  try {
    // Build conversation history for multi-turn
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not set in .env file. Get free key at https://console.groq.com');
    }
    const completion = await groq.chat.completions.create({
      model   : 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
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
app.post('/api/ai/summarise', auth, async (req, res) => {
  const { text, type = 'general', noteTitle = 'Notes' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  const instructions = {
    general: 'Write a clear, concise summary of the key points.',
    bullet : 'Summarise as 7-10 bullet points. Each bullet should be one clear fact or concept.',
    chapter: 'Identify main sections/chapters and write a short summary for each. Use ## headings.',
    exam   : 'Write an exam-focused summary: start with key terms, then important definitions, then core concepts to memorise.',
    simple : 'Rewrite this in very simple language (Grade 8 level). Use short sentences and plain words.',
  };

  try {
    const response = await callGemini(
      `You are an expert academic summariser. ${instructions[type] || instructions.general} Be thorough but concise.`,
      `Please summarise the following study notes titled "${noteTitle}":\n\n${text}`);
    res.json({ summary: response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/quiz ────────────────────────────────────────
app.post('/api/ai/quiz', auth, async (req, res) => {
  const { text, count = 10, difficulty = 'medium' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  const diffDesc = {
    easy  : 'straightforward factual questions',
    medium: 'questions requiring understanding and application',
    hard  : 'challenging analytical and evaluative questions',
  };

  try {
    const raw = await callGemini(
      `You are an expert quiz generator. Generate exactly ${count} multiple choice questions from the provided study material.
Difficulty: ${diffDesc[difficulty] || diffDesc.medium}.

Return ONLY a valid JSON array, no other text. Format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Why this answer is correct."
  }
]
"correct" is the 0-based index of the correct option in the "options" array.
Make sure all 4 options are plausible but only one is clearly correct.`,
      `Generate ${count} ${difficulty} MCQ questions from these study notes:\n\n${text}`);

    // Parse JSON response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid JSON response from AI');
    const questions = JSON.parse(jsonMatch[0]);
    res.json({ questions });
  } catch (err) {
    console.error('Quiz error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/flashcards ──────────────────────────────────
app.post('/api/ai/flashcards', auth, async (req, res) => {
  const { text, deck = 'General', count = 15 } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  try {
    const raw = await callGemini(
      `You are an expert flashcard creator. Generate exactly ${count} flashcards from the provided study material.
Return ONLY a valid JSON array, no other text. Format:
[
  {
    "front": "Question or term (keep concise)",
    "back": "Answer or definition (clear and complete)"
  }
]
Focus on: key definitions, important concepts, formulas, algorithms, and relationships.`,
      `Create ${count} flashcards from these notes for the deck "${deck}":\n\n${text}`);

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid JSON response from AI');
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
app.post('/api/ai/extract-topics', auth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text' });

  try {
    const raw = await callGemini(
      'Extract the main topics from the study notes. Return ONLY a JSON array of objects: [{"topic":"Name","subtopics":["sub1","sub2"],"relevance":8}]. Relevance is 1-10.',
      text,
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
app.post('/api/ai/roadmap', auth, async (req, res) => {
  const { subject, examDate, level = 'intermediate' } = req.body;
  if (!subject || !examDate) return res.status(400).json({ error: 'Missing subject or examDate' });

  const daysLeft = Math.max(1, Math.ceil((new Date(examDate) - new Date()) / 86400000));

  try {
    const response = await callGemini(
      `You are an expert study coach. Create a detailed exam preparation roadmap.`,
      `Create a ${daysLeft}-day exam roadmap for "${subject}" at ${level} level.
Exam date: ${examDate}

Format your response as structured markdown with:
1. A brief overview
2. Four phases (Foundation, Deep Study, Revision, Mock Tests) with:
   - Duration in days
   - Key focus areas
   - Specific daily tasks
   - Tips for that phase
3. Final tips for exam day

Be specific and practical.`);
    res.json({ roadmap: response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/compare ─────────────────────────────────────
app.post('/api/ai/compare', auth, async (req, res) => {
  const { topicA, topicB, context = '' } = req.body;
  if (!topicA || !topicB) return res.status(400).json({ error: 'Missing topics' });

  try {
    const raw = await callGemini(
      `You are an expert educator. Compare two topics clearly and accurately.
Return ONLY valid JSON in this format:
{
  "aboutA": "2-3 sentence description of topic A",
  "aboutB": "2-3 sentence description of topic B",
  "similarities": ["similarity 1", "similarity 2", "similarity 3"],
  "differences": ["key difference 1", "key difference 2", "key difference 3"],
  "tableRows": [
    {"aspect": "Definition", "a": "...", "b": "..."},
    {"aspect": "Use Case", "a": "...", "b": "..."},
    {"aspect": "Complexity", "a": "...", "b": "..."},
    {"aspect": "When to use", "a": "...", "b": "..."}
  ]
}`,
      `Compare "${topicA}" vs "${topicB}".${context ? `\n\nContext from student notes:\n${context.slice(0)}` : ''}`,
      1200
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON');
    const result = JSON.parse(jsonMatch[0]);
    res.json({ comparison: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/onenight ────────────────────────────────────
app.post('/api/ai/onenight', auth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text' });

  try {
    const raw = await callGemini(
      `You are a last-minute exam coach. Create an emergency revision pack.
Return ONLY valid JSON:
{
  "mustKnow": ["most critical fact 1", "fact 2", "fact 3", "fact 4", "fact 5", "fact 6", "fact 7", "fact 8"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"],
  "definitions": [{"term": "term", "definition": "definition"}],
  "formulas": [{"formula": "formula or equation", "context": "what it is used for"}],
  "examTips": ["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"]
}`,
      `Create a one-night-before-exam revision pack from these notes:\n\n${text.slice(0, 4000)}`);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON');
    const pack = JSON.parse(jsonMatch[0]);
    res.json({ pack });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/questions ───────────────────────────────────
app.post('/api/ai/questions', auth, async (req, res) => {
  const { text, count = 10, difficulty = 'medium' } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text' });

  try {
    const raw = await callGemini(
      `Generate ${count} important study questions with answers. Return ONLY JSON array:
[{"q": "question text", "a": "detailed answer", "type": "short-answer"}]
Difficulty: ${difficulty}. Mix question types: define, explain, compare, analyse, list.`,
      text.slice(0),
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
app.post('/api/ai/extract-formulas', auth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text' });

  try {
    const raw = await callGemini(
      'Extract all mathematical formulas, equations, and algorithmic complexity notations from the text. Return ONLY JSON array: [{"formula":"formula text","context":"what it calculates or represents","type":"equation|complexity|expression"}]',
      text.slice(0, 4000),
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
//  PDF UPLOAD & TEXT EXTRACTION
// ════════════════════════════════════════════════════════════

// POST /api/upload/pdf
// Accepts: multipart/form-data with field name "pdf"
// Returns: { text, title, pages, wordCount, charCount }
app.post('/api/upload/pdf', auth, upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  try {
    const pdfData = await pdfParse(req.file.buffer, {
      // Normalise whitespace aggressively
      normalizeWhitespace: true,
    });

    // Clean up the extracted text
    let text = pdfData.text || '';

    // Remove excessive blank lines (more than 2 consecutive)
    text = text.replace(/\n{3,}/g, '\n\n');

    // Remove null bytes and other control chars except newlines/tabs
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Trim
    text = text.trim();

    if (!text || text.length < 10) {
      return res.status(422).json({
        error: 'Could not extract text from this PDF. It may be a scanned image PDF. Try a text-based PDF.',
      });
    }

    const words     = text.split(/\s+/).filter(Boolean).length;
    const pages     = pdfData.numpages || 1;

    // Generate a title from the filename (strip .pdf, replace _ and - with spaces)
    const rawName   = req.file.originalname || 'Uploaded PDF';
    const title     = rawName
      .replace(/\.pdf$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    res.json({
      text,
      title,
      pages,
      wordCount: words,
      charCount: text.length,
    });

  } catch (err) {
    console.error('PDF parse error:', err.message);

    // Handle encrypted / password-protected PDFs
    if (err.message?.toLowerCase().includes('password')) {
      return res.status(422).json({ error: 'This PDF is password-protected. Please unlock it first.' });
    }

    res.status(500).json({ error: 'Failed to parse PDF: ' + err.message });
  }
});


// ════════════════════════════════════════════════════════════
//  SMART UNIVERSAL FILE UPLOAD  (images, PDFs, DOCX)
// ════════════════════════════════════════════════════════════

// Helper: call Groq Vision to analyse an image buffer
async function analyzeImageWithGroq(imageBuffer, mimeType, prompt) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set in .env file.');
  }
  const base64Image = imageBuffer.toString('base64');
  const completion = await groq.chat.completions.create({
    model   : 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{
      role   : 'user',
      content: [
        {
          type     : 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64Image}` },
        },
        { type: 'text', text: prompt },
      ],
    }],
    max_tokens: 4096,
  });
  return completion.choices[0].message.content;
}

// Helper: clean extracted text
function cleanText(text) {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/\n{3,}/g, '\n\n')                          // max 2 blank lines
    .trim();
}

// Helper: derive title from filename
function titleFromFilename(filename) {
  return (filename || 'Uploaded File')
    .replace(/\.(pdf|docx|doc|jpg|jpeg|png|webp|gif|bmp|tiff)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// POST /api/upload/smart
// Accepts: multipart/form-data with field "file"
// Returns: { text, title, type, pages, wordCount, charCount, hasImage, aiAnalysis }
app.post('/api/upload/smart', auth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { buffer, mimetype, originalname, size } = req.file;
  const title = titleFromFilename(originalname);
  const isImage = mimetype.startsWith('image/');
  const isPDF   = mimetype === 'application/pdf';
  const isDOCX  = mimetype.includes('wordprocessingml') || mimetype === 'application/msword' ||
                  originalname.toLowerCase().endsWith('.docx') || originalname.toLowerCase().endsWith('.doc');

  try {
    // ─── IMAGE FILES ─────────────────────────────────────────
    if (isImage) {
      const aiPrompt = `You are an expert at reading and analysing images for students.

Please do ALL of the following for this image:

1. **Extract ALL text** — Extract every single word, sentence, formula, equation, table, and list visible in the image. Preserve the exact formatting as much as possible. If it is a handwritten note, transcribe it completely.

2. **Describe the image** — If there are diagrams, charts, graphs, or visual elements, describe them clearly in text so a student can understand without seeing the image.

3. **Summarise the content** — Write a brief summary of what this image is about and what a student should learn from it.

Format your response as:
---EXTRACTED TEXT---
[all text from the image here]

---IMAGE DESCRIPTION---
[description of visual elements]

---SUMMARY---
[brief summary]`;

      const aiResult = await analyzeImageWithGroq(buffer, mimetype, aiPrompt);

      // Parse sections
      const textMatch    = aiResult.match(/---EXTRACTED TEXT---([\s\S]*?)(?:---IMAGE DESCRIPTION---|$)/);
      const descMatch    = aiResult.match(/---IMAGE DESCRIPTION---([\s\S]*?)(?:---SUMMARY---|$)/);
      const summaryMatch = aiResult.match(/---SUMMARY---([\s\S]*?)$/);

      const extractedText = cleanText(textMatch?.[1] || aiResult);
      const description   = cleanText(descMatch?.[1] || '');
      const summary       = cleanText(summaryMatch?.[1] || '');

      const fullContent = [
        extractedText,
        description ? `\n\n## Image Description\n${description}` : '',
        summary     ? `\n\n## Summary\n${summary}`               : '',
      ].join('').trim();

      const wordCount = fullContent.split(/\s+/).filter(Boolean).length;

      return res.json({
        text      : fullContent,
        title,
        type      : 'image',
        pages     : 1,
        wordCount,
        charCount : fullContent.length,
        hasImage  : true,
        aiAnalysis: summary || description,
      });
    }

    // ─── PDF FILES ───────────────────────────────────────────
    if (isPDF) {
      let pdfText = '';
      let pages   = 1;
      let isScanned = false;

      // Try text extraction first
      try {
        const pdfData = await pdfParse(buffer, { normalizeWhitespace: true });
        pdfText = cleanText(pdfData.text || '');
        pages   = pdfData.numpages || 1;
      } catch (e) {
        // pdf-parse failed — likely scanned
        isScanned = true;
      }

      // If text extraction yielded too little, treat as scanned PDF
      const wordsFound = pdfText.split(/\s+/).filter(Boolean).length;
      if (!isScanned && wordsFound < 30) isScanned = true;

      if (isScanned) {
        // Scanned PDF — send raw buffer to Groq vision as image
        // Groq vision can read PDF files directly as base64
        const aiPrompt = `This is a scanned PDF document. Please:
1. Extract ALL text visible in this document completely and accurately
2. Describe any diagrams, charts, or figures
3. Preserve the document structure (headings, lists, tables)

Return the complete extracted content, well-formatted.`;

        try {
          // Try sending PDF directly to vision
          const aiResult = await analyzeImageWithGroq(buffer, 'application/pdf', aiPrompt);
          const cleanedResult = cleanText(aiResult);
          const wordCount = cleanedResult.split(/\s+/).filter(Boolean).length;

          return res.json({
            text      : cleanedResult,
            title,
            type      : 'scanned-pdf',
            pages,
            wordCount,
            charCount : cleanedResult.length,
            hasImage  : true,
            aiAnalysis: `Extracted from scanned PDF (${pages} page${pages!==1?'s':''}) using AI vision.`,
          });
        } catch (visionErr) {
          // Vision failed — return partial text with warning
          if (pdfText.length > 10) {
            const wordCount = pdfText.split(/\s+/).filter(Boolean).length;
            return res.json({
              text      : pdfText,
              title,
              type      : 'pdf',
              pages,
              wordCount,
              charCount : pdfText.length,
              hasImage  : false,
              aiAnalysis: `Note: This appears to be a scanned PDF. Text extraction may be incomplete.`,
            });
          }
          return res.status(422).json({
            error: 'This is a scanned/image PDF and could not be read. Try converting a page to JPG/PNG and uploading that instead.',
          });
        }
      }

      // Regular text PDF — success
      const wordCount = pdfText.split(/\s+/).filter(Boolean).length;
      return res.json({
        text      : pdfText,
        title,
        type      : 'pdf',
        pages,
        wordCount,
        charCount : pdfText.length,
        hasImage  : false,
        aiAnalysis: null,
      });
    }

    // ─── DOCX / DOC FILES ────────────────────────────────────
    if (isDOCX) {
      const result  = await mammoth.extractRawText({ buffer });
      const rawText = cleanText(result.value || '');

      if (!rawText || rawText.length < 10) {
        return res.status(422).json({ error: 'Could not extract text from this Word document.' });
      }

      const wordCount = rawText.split(/\s+/).filter(Boolean).length;
      return res.json({
        text      : rawText,
        title,
        type      : 'docx',
        pages     : Math.ceil(wordCount / 300), // estimate
        wordCount,
        charCount : rawText.length,
        hasImage  : false,
        aiAnalysis: null,
      });
    }

    // Unknown type
    return res.status(400).json({ error: 'Unsupported file type.' });

  } catch (err) {
    console.error('Smart upload error:', err.message);
    if (err.message?.toLowerCase().includes('password')) {
      return res.status(422).json({ error: 'This file is password-protected. Please unlock it first.' });
    }
    res.status(500).json({ error: 'Failed to process file: ' + err.message });
  }
});



// ════════════════════════════════════════════════════════════
//  YOUTUBE SUMMARISER  (zero dependencies — uses built-in fetch)
// ════════════════════════════════════════════════════════════

function extractYouTubeId(url) {
  if (!url) return null;
  // Handle ?v= parameter first (most reliable)
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    if (u.searchParams.get('v')) {
      const v = u.searchParams.get('v');
      if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    }
  } catch(_) {}
  // Fallback patterns
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function fetchYouTubeTranscript(videoId) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'get_transcript.py');
    
    // Try python3 first, then python
    const tryPython = (cmd) => new Promise((res, rej) => {
      execFile(cmd, [scriptPath, videoId], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err && err.code === 'ENOENT') { rej(new Error('not_found')); return; }
        res({ stdout, stderr, err });
      });
    });

    (async () => {
      let result;
      // Try python first (Windows), then python3 (Linux/Mac)
      try { result = await tryPython('python'); }
      catch(e) {
        try { result = await tryPython('python3'); }
        catch(e2) {
          reject(new Error(
            'Python not found. Please install Python 3 from python.org, ' +
            'then run: pip install youtube-transcript-api'
          ));
          return;
        }
      }

      const { stdout, stderr, err } = result;

      if (!stdout || !stdout.trim()) {
        console.error('Python stderr:', stderr);
        reject(new Error(err ? err.message : 'No output from transcript script.'));
        return;
      }

      try {
        const data = JSON.parse(stdout.trim());
        if (data.error) {
          reject(new Error(data.error));
        } else {
          console.log('✅ Transcript fetched via Python:', data.segments, 'segments,', data.wordCount, 'words, lang:', data.language);
          resolve(data.text);
        }
      } catch(parseErr) {
        console.error('Python output:', stdout.substring(0, 200));
        reject(new Error('Could not parse transcript output.'));
      }
    })();
  });
}



app.post('/api/ai/youtube', auth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided.' });

  const videoId = extractYouTubeId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL.' });

  try {
    let transcript;
    try {
      transcript = await fetchYouTubeTranscript(videoId);
    } catch (e) {
      return res.status(422).json({ error: e.message });
    }

    if (!transcript || transcript.length < 30) {
      return res.status(422).json({ error: 'Transcript too short. Try a video with proper captions (CC).' });
    }

    const truncated = transcript.length > 8000
      ? transcript.substring(0, 8000) + '... [transcript truncated]'
      : transcript;

    const summary = await callGemini(
      'You are an expert academic note-taker. Convert this YouTube video transcript into comprehensive study notes.\n\nFormat as:\n## Video Summary\n[overview]\n\n## Key Concepts\n[bullets]\n\n## Detailed Notes\n[structured notes]\n\n## Key Takeaways\n[5-7 points]\n\n## Likely Exam Questions\n[3-5 questions]',
      'Convert this transcript into study notes:\n\n' + truncated
    );

    res.json({ summary, videoId, transcriptLength: transcript.length, wordCount: transcript.split(/\s+/).length });
  } catch (err) {
    console.error('YouTube error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  AI DOUBT SOLVER
// ════════════════════════════════════════════════════════════

// POST /api/ai/solve-doubt
app.post('/api/ai/solve-doubt', auth, upload.single('image'), async (req, res) => {
  const { subject = 'General', extraContext = '' } = req.body;

  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });

  const { buffer, mimetype } = req.file;

  if (!mimetype.startsWith('image/')) {
    return res.status(400).json({ error: 'Please upload an image file (JPG, PNG, etc.)' });
  }

  try {
    const base64Image = buffer.toString('base64');

    const prompt = `You are an expert tutor and problem solver. A student has uploaded an image of a question or problem.

${extraContext ? `Additional context from student: "${extraContext}"` : ''}
Subject hint: ${subject}

Please:
1. **Read the question/problem** from the image carefully
2. **Identify what type of problem** it is (e.g. algebra, physics, programming, history, etc.)
3. **Solve it step by step** — show every step clearly
4. **Explain the concept** behind the solution so the student understands
5. **Give tips** to solve similar problems faster

Format your response as:
## ❓ Question Identified
[state the question you read from the image]

## 🔍 Problem Type
[subject + type of problem]

## ✏️ Step-by-Step Solution
[numbered steps, show all working]

## 💡 Concept Explanation
[explain the underlying concept]

## 🚀 Tips for Similar Problems
[2-3 quick tips]`;

    const completion = await groq.chat.completions.create({
      model   : 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role   : 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimetype};base64,${base64Image}` } },
          { type: 'text', text: prompt },
        ],
      }],
      max_tokens: 2000,
    });

    const solution = completion.choices[0].message.content;
    res.json({ solution });

  } catch (err) {
    console.error('Doubt solver error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/ai/youtube-from-transcript
// Client sends the transcript text, server AI-summarises it
app.post('/api/ai/youtube-from-transcript', auth, async (req, res) => {
  const { transcript, videoId } = req.body;
  if (!transcript || transcript.trim().length < 30) {
    return res.status(400).json({ error: 'No transcript provided.' });
  }
  try {
    const truncated = transcript.length > 8000
      ? transcript.substring(0, 8000) + '... [truncated]'
      : transcript;

    const summary = await callGemini(
      'You are an expert academic note-taker. Convert this YouTube video transcript into comprehensive study notes.\n\nFormat as:\n## Video Summary\n[2-3 sentence overview]\n\n## Key Concepts\n[bullet list]\n\n## Detailed Notes\n[structured notes with headings]\n\n## Key Takeaways\n[5-7 points]\n\n## Likely Exam Questions\n[3-5 questions]',
      'Convert this transcript into study notes:\n\n' + truncated
    );
    res.json({ summary, videoId, wordCount: transcript.split(/\s+/).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  CATCH-ALL — serve index.html for SPA routing
// ════════════════════════════════════════════════════════════
app.get('*splat', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not found. Put your index.html in the /public folder.');
  }
});

// ════════════════════════════════════════════════════════════
//  KEEP-ALIVE PING  — prevents Render free-tier sleep
// ════════════════════════════════════════════════════════════

// Simple health-check endpoint (also used by self-ping)
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ════════════════════════════════════════════════════════════
//  START SERVER  (connects MongoDB first, then HTTP)
// ════════════════════════════════════════════════════════════
async function startServer() {
  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('  ✅ MongoDB connected');
    } catch (err) {
      console.error('  ❌ MongoDB connection failed:', err.message);
      console.error('     Check your MONGO_URI in .env  — app will start but data will NOT persist.\n');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log('  ║   🧠  StudyAI Backend Running!       ║');
    console.log(`  ║   http://localhost:${PORT}              ║`);
    console.log('  ║                                      ║');
    console.log('  ║   Demo: demo@studyai.com             ║');
    console.log('  ║         demo1234                     ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');

    if (!process.env.GROQ_API_KEY) {
      console.warn('  ⚠️  WARNING: GROQ_API_KEY not set in .env');
      console.warn('     AI features will not work until you add it.');
      console.warn('     Create a .env file with: GROQ_API_KEY=your_key_here\n');
    } else {
      console.log('  ✅ Groq API key loaded\n');
    }

    if (!MONGO_URI) {
      console.warn('  ⚠️  WARNING: MONGO_URI not set — user data will NOT be saved!');
      console.warn('     Get a free MongoDB Atlas cluster at https://cloud.mongodb.com\n');
    }

    // ── Self-ping every 14 minutes to keep Render free-tier awake ──
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || '';
    if (RENDER_URL) {
      const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes
      setInterval(async () => {
        try {
          const pingUrl = `${RENDER_URL}/api/ping`;
          const res = await fetch(pingUrl);
          console.log(`  💓 Self-ping OK [${new Date().toLocaleTimeString()}] → ${res.status}`);
        } catch (err) {
          console.warn(`  ⚠️  Self-ping failed: ${err.message}`);
        }
      }, PING_INTERVAL);
      console.log(`  💓 Keep-alive self-ping enabled → ${RENDER_URL}/api/ping (every 14 min)\n`);
    } else {
      console.log('  ℹ️  Self-ping disabled (RENDER_EXTERNAL_URL not set — OK for local dev)\n');
    }
  });
}

startServer();