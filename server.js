const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const vm = require('vm');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const PHOTOS_DIR = path.join(DATA_DIR, 'photos');
const ENTRIES_FILE = path.join(DATA_DIR, 'entries.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PORT = process.env.PORT || 4173;

fs.mkdirSync(PHOTOS_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data;
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

const DEFAULT_SETTINGS = {
  journalTitle: 'Our Journey To You',
  mamaName: 'Mummy',
  papaName: 'Daddy',
  babyNickname: 'Little One',
  dueDate: '',
  lmpDate: '',
  coverMessage: 'Every little moment of waiting for you, tucked away gently. This is our story.',
  coverEmoji: '🌼',
  theme: 'blush'
};

/* LMP → due date (Naegele's rule: +40 weeks, i.e. +280 days).
   Returns null for empty/unparseable input so bad dates can't NaN the weeks. */
function addDays(iso, n) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* The effective due date: an explicit due date wins; otherwise derive it
   from the last period date so weeks fill in automatically. */
function effectiveDueDate() {
  return settings.dueDate || (settings.lmpDate ? addDays(settings.lmpDate, 280) : null);
}

/* Standard milestone template — the "skeleton" every journal starts from.
   Each milestone is an event with a typical week, a warm title/note, an icon and
   optional "mentions" (routine blood tests / checks attached to that milestone,
   not separate pages). Real dates are left blank so parents fill them in as events
   actually happen; the skeleton keeps a pleasant order using `week`. */
const MILESTONES = [
  {
    key: 'home-test', type: 'milestone', week: 4,
    title: 'The little line',
    note: 'Two lines. The start of you. We kept the test that night, hardly believing it — then we told no one yet, just the two of us, smiling at it in the dark.',
    icon: '🍀',
    mentions: []
  },
  {
    key: 'beta-hcg', type: 'milestone', week: 5,
    title: 'Your first blood test',
    note: 'Our first beta-hCG came back, and then a second draw a couple of days later, watching your numbers double the way they should. Our first proof that you were really here.',
    icon: '🩸',
    mentions: [
      { key: 'hcg1', label: 'Beta-hCG blood test #1', note: '' },
      { key: 'hcg2', label: 'Beta-hCG blood test #2 (48 hr repeat)', note: '' }
    ]
  },
  {
    key: 'sac', type: 'milestone', week: 5,
    title: 'We saw the sac',
    note: 'On the first scan, there w’s a tiny gestational sac in the right place. Hearing the words "it is exactly where it should be" — such relief, such quiet magic.',
    icon: '🥚', mentions: []
  },
  {
    key: 'heartbeat', type: 'milestone', week: 6,
    title: 'We heard your heartbeat',
    note: 'A small, quick flicker appeared on the screen and they let us listen. The most beautiful little rhythm, all your own.',
    icon: '💓', mentions: []
  },
  {
    key: 'booking', type: 'milestone', week: 8,
    title: 'Our booking appointment',
    note: 'The first big meeting with our midwife — growth "always how far along we are, the check-ups, the what-if list, and all the little formalities that made you feel wonderfully, officially expected.',
    icon: '📋',
    mentions: [
      { key: 'booking-panel', label: 'Booking bloods — blood group, full blood count, anaemia & infection screen', note: '' },
      { key: 'urine', label: 'Urine dipstick & blood pressure', note: '' }
    ]
  },
  {
    key: 'dating', type: 'milestone', week: 12,
    title: 'Our dating scan',
    note: 'Suddenly you looked like a tiny person, arms and legs waving. This scan gave us a real due date and the first proper look at who you might be.',
    icon: '🫧',
    mentions: [
      { label: 'Combined screening blood test (10–14 wks)', note: '' },
      { label: 'Nuchal translucency measurement', note: '' }
    ]
  },
  {
    key: 'movements', type: 'milestone', week: 19,
    title: 'We felt you move',
    note: 'The first flutter, so faint I almost missed it. Becomes the way we say goodnight — a little kick from you, a hand from us.',
    icon: '🦋', mentions: []
  },
  {
    key: 'anatomy', type: 'milestone', week: 20,
    title: 'The 20-week scan',
    note: 'Ten tiny fingers, ten toes, a perfect little heart. And somewhere in those measurements, the doctors tell us everything is on its girl — the most wonderful report we have ever received.',
    icon: '🏵️',
    mentions: [
      { label: 'Quad screening blood test (if not done at 12 wks)', note: '' }
    ]
  },
  {
    key: 'glucose', type: 'milestone', week: 26,
    title: 'The sugar-check appointment',
    note: 'A too-sweet drink, an hour of waiting, and then the two little vials that tell the midwife everything she needs to know.',
    icon: '🧪',
    mentions: [
      { label: 'Oral glucose tolerance test (GTT)', note: '' }
    ]
  },
  {
    key: 'growth', type: 'milestone', week: 32,
    title: 'A growth check',
    note: 'Measuring, measuring — how long, how heavy, how proportioned. You are on track and we are so proud of you, and you have not even arrived yet.',
    icon: '📏',
    mentions: [
      { label: 'Repeat full blood count (anaemia check)', note: '' },
      { label: 'Anti-D (if Rhesus negative)', note: '' }
    ]
  },
  {
    key: 'turned', type: 'milestone', week: 34,
    title: 'You turned head-down',
    note: "You have decided to get ready. A little knock from the inside tells me you're settling into place for the big entrance.",
    icon: '🔄', mentions: []
  },
  {
    key: 'fullterm', type: 'milestone', week: 37,
    title: 'Full term',
    note: 'Officially "on the right side of the numbers" — you could arrive at any moment. We have been ready for you for a very long time.',
    icon: '🎈', mentions: []
  },
  {
    key: 'birth', type: 'milestone', week: 40,
    title: 'Your birth day',
    note: 'The day the story of waiting comes to its very first ending — the page where everything becomes real, soft and perfect.',
    icon: '👶', mentions: []
  }
];

function welcomeNote() {
  return {
    id: crypto.randomUUID(),
    type: 'note',
    date: '',
    title: 'Welcome to our story',
    note:
      'This is the first page of our little journal. The pages that follow are the usual milestones of a journey much like this one.\n\n*Each blank page is a moment we hope fills in, and between them you will write all the memories that are only ours.*\n\n*If you ever lose a page or wish to begin a certain one again, it can always be re-added.*',
    photo: null,
    photoSize: 'large',
    photoCaption: '',
    icon: '💛',
    arrow: false,
    week: 0,
    mentions: [],
    createdAt: Date.now(),
    sortOrder: 0
  };
}

/* The shared week-by-week guidance (guide-data.js) is loaded once at startup
   so the server can generate a growth card for EVERY week 4–40. */
let PREGNANCY_GUIDE = null;
try {
  const code = fs.readFileSync(path.join(PUBLIC_DIR, 'guide-data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  PREGNANCY_GUIDE = sandbox.window.PREGNANCY_GUIDE || null;
} catch (e) {
  console.error('Could not load guide-data.js:', e.message);
}

const TRIMESTER_EMOJI = { 1: '🌱', 2: '🌷', 3: '🌙' };

/* A warm growth card for a single week (4–40), built from the shared guide
   content: baby growth, common symptoms, feelings and a cute analogy. */
function weekCardFor(w) {
  const g = PREGNANCY_GUIDE && PREGNANCY_GUIDE.weeks && PREGNANCY_GUIDE.weeks[w];
  if (!g) return null;
  const trimester = w <= 13 ? 1 : w <= 26 ? 2 : 3;
  return {
    type: 'milestone',
    week: w,
    title: `Week ${w} · ${g.size}`,
    note: `Your baby is now the size of ${g.size}. ${g.baby}\n\nYou might notice — ${(g.mom || [])
      .map((m) => m.charAt(0).toLowerCase() + m.slice(1))
      .join(', ')}.\n\n${g.feel}\n\n${g.analogy}`,
    icon: TRIMESTER_EMOJI[trimester],
    mentions: []
  };
}

function milestoneEntry(m, n, base) {
  return {
    id: 'milestone-' + m.key + '-' + crypto.randomBytes(3).toString('hex'),
    type: m.type,
    date: '',
    title: m.title,
    note: m.note,
    photo: null,
    photoSize: 'large',
    photoCaption: '',
    icon: m.icon,
    arrow: false,
    week: m.week,
    trimester: m.week <= 13 ? 1 : m.week <= 26 ? 2 : 3,
    mentions: (m.mentions || []).map((x) => ({ id: crypto.randomUUID(), label: x.label, note: x.note || '' })),
    createdAt: base + n,
    sortOrder: n * 1000
  };
}

function weekCardEntry(w, n, base) {
  const c = weekCardFor(w);
  if (!c) return null;
  return {
    id: 'week-' + w + '-' + crypto.randomBytes(3).toString('hex'),
    type: 'milestone',
    date: '',
    title: c.title,
    note: c.note,
    photo: null,
    photoSize: 'large',
    photoCaption: '',
    icon: c.icon,
    arrow: false,
    week: w,
    trimester: w <= 13 ? 1 : w <= 26 ? 2 : 3,
    mentions: [],
    weekCard: true,
    createdAt: base + n,
    sortOrder: n * 1000
  };
}

/* The full skeleton: welcome page, then for every week 4–40 the weekly growth
   card, with the familiar milestone events woven in at their typical week. */
function templateEntries() {
  const base = Date.now();
  const notes = [welcomeNote()];
  const all = [];
  let n = 1;
  for (let w = 4; w <= 40; w++) {
    const wc = weekCardEntry(w, n, base);
    if (wc) all.push(wc);
    n++;
    MILESTONES.filter((m) => m.week === w).forEach((m) => all.push(milestoneEntry(m, n++, base)));
  }
  return notes.concat(all);
}

let entries = readJson(ENTRIES_FILE, null);
if (!Array.isArray(entries)) {
  entries = templateEntries();
  writeJson(ENTRIES_FILE, entries);
}

let settings = readJson(SETTINGS_FILE, null);
if (!settings || typeof settings !== 'object') {
  settings = { ...DEFAULT_SETTINGS };
  writeJson(SETTINGS_FILE, settings);
} else {
  settings = { ...DEFAULT_SETTINGS, ...settings };
}

// One-time: lock the current order of any pre-sortOrder pages.
migrateSortOrders();

// One-time: fill the journal with a growth card for every week 4–40 (plus any
// missing milestone), slotting each new page into its natural timeline spot.
if (!fs.existsSync(path.join(DATA_DIR, '.week-cards-v1'))) {
  const haveWeeks = new Set(entries.filter((e) => e.weekCard).map((e) => e.week));
  const haveTitles = new Set(entries.map((e) => e.title.trim()));
  const base = Date.now();
  const pool = entries.slice();
  let n = entries.length;
  let added = 0;
  for (let w = 4; w <= 40; w++) {
    if (haveWeeks.has(w)) continue;
    const wc = weekCardFor(w);
    if (!wc) continue;
    const entry = {
      id: 'week-' + w + '-' + crypto.randomBytes(3).toString('hex'),
      type: 'milestone',
      date: '',
      title: wc.title,
      note: wc.note,
      photo: null,
      photoSize: 'large',
      photoCaption: '',
      icon: wc.icon,
      arrow: false,
      week: w,
      trimester: w <= 13 ? 1 : w <= 26 ? 2 : 3,
      mentions: [],
      weekCard: true,
      createdAt: base + n++
    };
    entry.sortOrder = placeNew(entry, pool);
    pool.push(entry);
    entries.push(entry);
    added++;
  }
  for (const m of MILESTONES) {
    if (haveTitles.has(m.title)) continue;
    const entry = {
      id: 'milestone-' + m.key + '-' + crypto.randomBytes(3).toString('hex'),
      type: 'milestone',
      date: '',
      title: m.title,
      note: m.note,
      photo: null,
      photoSize: 'large',
      photoCaption: '',
      icon: m.icon,
      arrow: false,
      week: m.week,
      trimester: m.week <= 13 ? 1 : m.week <= 26 ? 2 : 3,
      mentions: m.mentions.map((x) => ({ id: crypto.randomUUID(), label: x.label, note: '' })),
      createdAt: base + n++
    };
    entry.sortOrder = placeNew(entry, pool);
    pool.push(entry);
    entries.push(entry);
    added++;
  }
  if (added) saveEntries();
  fs.writeFileSync(path.join(DATA_DIR, '.week-cards-v1'), '1');
}

// One-time repair: an older bug could exile a dated milestone to the very end
// (its date didn't map to a pregnancy week, so it ranked after every week-based
// page and got a locked sortOrder at the back). With rankKey fixed, re-lock
// every page to its natural timeline order once; the marker file makes it a
// one-time heal, so edits keep their place from then on.
if (!fs.existsSync(path.join(DATA_DIR, '.order-repair-v1'))) {
  const sorted = entries.slice().sort(compareRank);
  const pool = [];
  for (const e of sorted) {
    e.sortOrder = placeNew(e, pool);
    pool.push(e);
  }
  saveEntries();
  fs.writeFileSync(path.join(DATA_DIR, '.order-repair-v1'), '1');
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC_DIR));
app.use('/photos', express.static(PHOTOS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PHOTOS_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|webp|gif|heic|heif|avif|bmp)/i;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  }
});

/* A page's order is decided ONCE, at creation, and locked into a `sortOrder`
   number. Editing a page never changes its place — so milestones keep their
   familiar sequence even after you fill in dates or tweak text. New pages are
   placed at their natural spot on the timeline (due-date week when a date is
   known, otherwise their week number), so anything you add "in between" lands
   right between its neighbours. */
function weekFromDate(dateISO) {
  const dueISO = effectiveDueDate();
  if (!dueISO || !dateISO) return null;
  const due = new Date(dueISO + 'T00:00:00');
  const at = new Date(dateISO + 'T00:00:00');
  if (isNaN(due.getTime()) || isNaN(at.getTime())) return null;
  const ageDays = Math.round((due - at) / 86400000);
  const age = 280 - ageDays;
  if (age < 0) return null;
  return Math.min(42, Math.floor(age / 7) + 1);
}

function rankKey(e) {
  if (e.date) {
    const w = weekFromDate(e.date);
    if (w) return { t: 0, week: w, date: e.date, created: e.createdAt || 0 };
    // A date that doesn't land inside the pregnancy (e.g. before the LMP, or no
    // due date known yet) must never exile a milestone to the end of the book —
    // anchor it to its stored template week instead (defaulting to week 12, the
    // same fallback normalizeEntry uses), so the familiar order always holds.
    const wNum = Number(e.week);
    if (wNum >= 1) return { t: 0, week: wNum, date: e.date, created: e.createdAt || 0 };
    return { t: 0, week: 12, date: e.date, created: e.createdAt || 0 };
  }
  if (typeof e.week === 'number') return { t: 0, week: e.week, date: '', created: e.createdAt || 0 };
  return { t: 2, date: '', created: e.createdAt || 0 };
}

function compareRank(a, b) {
  const ka = rankKey(a);
  const kb = rankKey(b);
  if (ka.t !== kb.t) return ka.t - kb.t;
  if (ka.t === 0) {
    if (ka.week !== kb.week) return ka.week - kb.week;
  } else if (ka.t === 1) {
    if (ka.date !== kb.date) return ka.date < kb.date ? -1 : 1;
  }
  return ka.created - kb.created;
}

function sortEntries(list) {
  return list.slice().sort((a, b) => {
    const ao = typeof a.sortOrder === 'number' ? a.sortOrder : Infinity;
    const bo = typeof b.sortOrder === 'number' ? b.sortOrder : Infinity;
    if (ao !== bo) return ao - bo;
    return compareRank(a, b);
  });
}

/* New page → the sortOrder that places it at its natural timeline spot. */
function placeNew(entry, list) {
  const sorted = list
    .slice()
    .sort((a, b) => (typeof a.sortOrder === 'number' ? a.sortOrder : Infinity) - (typeof b.sortOrder === 'number' ? b.sortOrder : Infinity));
  let idx = sorted.length;
  for (let i = 0; i < sorted.length; i++) {
    if (compareRank(entry, sorted[i]) < 0) { idx = i; break; }
  }
  const before = idx > 0 ? sorted[idx - 1].sortOrder : null;
  const after = idx < sorted.length ? sorted[idx].sortOrder : null;
  if (Number.isFinite(before) && Number.isFinite(after)) return (before + after) / 2;
  if (Number.isFinite(before)) return before + 1000;
  if (Number.isFinite(after)) return after - 1000;
  return 1000;
}

/* Give legacy pages a locked order that keeps their current position:
   walk them in natural (date/week) order and slot each between its neighbours
   using the same placement rule as brand-new pages. */
function migrateSortOrders() {
  const todo = entries.filter((e) => typeof e.sortOrder !== 'number').sort(compareRank);
  if (!todo.length) return;
  const pool = entries.filter((e) => typeof e.sortOrder === 'number');
  for (const e of todo) {
    e.sortOrder = placeNew(e, pool);
    pool.push(e);
  }
  saveEntries();
}

function saveEntries() {
  writeJson(ENTRIES_FILE, entries);
}

function safeText(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function cleanupPhoto(photoPath) {
  if (!photoPath) return;
  const name = path.basename(photoPath);
  const full = path.join(PHOTOS_DIR, name);
  if (name && full.startsWith(PHOTOS_DIR) && fs.existsSync(full)) {
    fs.unlinkSync(full);
  }
}

function parseMentions(raw) {
  if (typeof raw !== 'string') return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((m) => m && (safeText(m.label) || safeText(m.note)))
      .map((m) => ({
        id: safeText(m.id) || crypto.randomUUID(),
        label: safeText(m.label),
        note: safeText(m.note)
      }));
  } catch {
    return [];
  }
}

function normalizeEntry(body, file) {
  const type = ['milestone', 'memory', 'note'].includes(body.type) ? body.type : 'note';
  const week = Number(body.week);
  const w = Number.isFinite(week) && week >= 1 && week <= 42 ? week : (type === 'milestone' && !body.date ? 12 : 0);
  return {
    type,
    date: /^\d{4}-\d{2}-\d{2}$/.test(safeText(body.date)) ? safeText(body.date) : '',
    title: safeText(body.title),
    note: typeof body.note === 'string' ? body.note.trim() : '',
    photo: file ? `/photos/${file.filename}` : null,
    photoSize: body.photoSize === 'small' ? 'small' : 'large',
    photoCaption: safeText(body.photoCaption),
    icon: safeText(body.icon) || (type === 'milestone' ? '⭐' : type === 'memory' ? '📷' : '✍️'),
    arrow: body.arrow === '1' || body.arrow === 'true',
    week: w,
    trimester: w <= 13 ? 1 : w <= 26 ? 2 : 3,
    mentions: parseMentions(body.mentions)
  };
}

app.get('/api/settings', (req, res) => {
  res.json(settings);
});

const THEMES = ['blush', 'lavender', 'sage', 'ocean', 'peach', 'midnight'];

function normalizeTheme(v) {
  return typeof v === 'string' && THEMES.includes(v) ? v : DEFAULT_SETTINGS.theme;
}

app.put('/api/settings', (req, res) => {
  const lmp = /^\d{4}-\d{2}-\d{2}$/.test(safeText(req.body.lmpDate)) ? safeText(req.body.lmpDate) : '';
  const due = /^\d{4}-\d{2}-\d{2}$/.test(safeText(req.body.dueDate)) ? safeText(req.body.dueDate) : '';
  settings = {
    journalTitle: safeText(req.body.journalTitle) || DEFAULT_SETTINGS.journalTitle,
    mamaName: safeText(req.body.mamaName) || 'Mummy',
    papaName: safeText(req.body.papaName) || 'Daddy',
    babyNickname: safeText(req.body.babyNickname) || 'Little One',
    dueDate: due || (lmp ? addDays(lmp, 280) : ''),
    lmpDate: lmp,
    coverMessage: safeText(req.body.coverMessage) || '',
    coverEmoji: safeText(req.body.coverEmoji) || '🌼',
    theme: normalizeTheme(req.body.theme)
  };
  writeJson(SETTINGS_FILE, settings);
  res.json(settings);
});

app.get('/api/entries', (req, res) => {
  res.json(sortEntries(entries));
});

app.post('/api/entries', upload.single('photo'), (req, res) => {
  try {
    const entry = normalizeEntry(req.body, req.file);
    entry.id = crypto.randomUUID();
    entry.createdAt = Date.now();
    entry.sortOrder = placeNew(entry, entries);
    entries.push(entry);
    saveEntries();
    res.status(201).json(entry);
  } catch (err) {
    if (req.file) cleanupPhoto(`/photos/${req.file.filename}`);
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/entries/:id', upload.single('photo'), (req, res) => {
  const idx = entries.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Page not found.' });

  const old = entries[idx];
  const updated = normalizeEntry(req.body, req.file);
  const remove = req.body.removePhoto === '1';

  if (req.file) {
    if (old.photo) cleanupPhoto(old.photo);
    updated.photo = `/photos/${req.file.filename}`;
  } else if (remove) {
    if (old.photo) cleanupPhoto(old.photo);
    updated.photo = null;
  } else if (old.photo) {
    updated.photo = old.photo;
  }

  updated.id = old.id;
  updated.createdAt = old.createdAt;
  updated.sortOrder = old.sortOrder; // editing never moves a page
  if (!updated.week && old.week) updated.week = old.week; // keep the week hint if a dated page was edited
  entries[idx] = updated;
  saveEntries();
  res.json(updated);
});

app.delete('/api/entries/:id', (req, res) => {
  const idx = entries.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Page not found.' });
  cleanupPhoto(entries[idx].photo);
  entries.splice(idx, 1);
  saveEntries();
  res.json({ ok: true });
});

/* Rearrange pages: the client sends the ids in their new order and the server
   re-locks each page's sortOrder to match, so the manual order sticks. */
app.post('/api/reorder', (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) return res.status(400).json({ error: 'No page order given.' });
  const byId = new Map(entries.map((e) => [e.id, e]));
  ids.forEach((id, i) => {
    const e = byId.get(id);
    if (e && typeof e.sortOrder !== 'undefined') e.sortOrder = (i + 1) * 1000;
  });
  saveEntries();
  res.json(sortEntries(entries));
});

/* Re-add any standard milestone that was deleted (plus any missing weekly
   growth cards), and any missing mentions. Never removes pages the family has
   already written. */
app.post('/api/restore-milestones', (req, res) => {
  const have = new Set(entries.map((e) => e.title.trim()));
  const haveWeeks = new Set(entries.filter((e) => e.weekCard).map((e) => e.week));
  let added = 0;
  const base = Date.now();
  const pool = entries.slice();
  for (let w = 4; w <= 40; w++) {
    if (haveWeeks.has(w)) continue;
    const wc = weekCardFor(w);
    if (!wc) continue;
    const entry = {
      id: 'week-' + w + '-' + crypto.randomBytes(3).toString('hex'),
      type: 'milestone',
      date: '',
      title: wc.title,
      note: wc.note,
      photo: null,
      photoSize: 'large',
      photoCaption: '',
      icon: wc.icon,
      arrow: false,
      week: w,
      trimester: w <= 13 ? 1 : w <= 26 ? 2 : 3,
      mentions: [],
      weekCard: true,
      createdAt: base + w
    };
    entry.sortOrder = placeNew(entry, pool);
    pool.push(entry);
    entries.push(entry);
    added++;
  }
  for (const m of MILESTONES) {
    if (have.has(m.title)) continue;
    const entry = {
      id: 'milestone-' + m.key + '-' + crypto.randomBytes(3).toString('hex'),
      type: 'milestone',
      date: '',
      title: m.title,
      note: m.note,
      photo: null,
      photoSize: 'large',
      photoCaption: '',
      icon: m.icon,
      arrow: false,
      week: m.week,
      trimester: m.week <= 13 ? 1 : m.week <= 26 ? 2 : 3,
      mentions: m.mentions.map((x) => ({ id: crypto.randomUUID(), label: x.label, note: '' })),
      createdAt: base + m.week
    };
    entry.sortOrder = placeNew(entry, pool);
    pool.push(entry);
    entries.push(entry);
    added++;
  }
  saveEntries();
  res.json({ added, milestones: MILESTONES.length });
});

/* Blossom Baby — the AI companion (privacy-first chat proxy, caps, founder
   dashboard). See chat-server.js for the full module. */
require('./chat-server')(app, PREGNANCY_GUIDE);

app.use('/api', (err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'That photo is too big (max 20 MB).' });
  }
  res.status(400).json({ error: err.message || 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ✨  Your pregnancy journal is ready!');
  console.log('');
  console.log(`     Open:  http://localhost:${PORT}`);
  console.log('');
  console.log(`     Pages: ${entries.length}  |  Photos live in  data/photos`);
  console.log('');
});
