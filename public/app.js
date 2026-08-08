/* Our Journey To You — journal app logic */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const BABY_ICONS = ['💛', '💖', '👶', '🍼', '🧸', '🦋', '🌙', '⭐', '🌈', '🌷', '👣', '🐣', '🕊️', '💫', '🎀', '🍉', '☁️', '🌼', '🍼', '💌', '🌻', '🧿', '✨', '🫧'];

const TYPE_INFO = {
  milestone: { label: 'Milestone', cls: 'milestone', icon: '⭐' },
  memory: { label: 'Memory', cls: 'memory', icon: '📷' },
  note: { label: 'Note', cls: 'note', icon: '✍️' }
};

/* Theme list — id, friendly name, two swatch colours */
const THEMES = [
  { id: 'blush', label: 'Blush', sw: ['#e8a7ab', '#cfe0ca'] },
  { id: 'lavender', label: 'Lavender', sw: ['#d3bfe6', '#b7a8d6'] },
  { id: 'sage', label: 'Sage', sw: ['#b3d1b4', '#8fb3a0'] },
  { id: 'ocean', label: 'Ocean', sw: ['#b4d3e4', '#7ea8c4'] },
  { id: 'peach', label: 'Peach', sw: ['#f0c3a8', '#e0a68f'] },
  { id: 'midnight', label: 'Midnight', sw: ['#2c2735', '#c9a0d6'] }
];

let settings = {};
let entries = [];

/* ---------------- view mode: carousel (default) vs stacked pages ---------------- */
let viewMode = 'carousel';
try { viewMode = localStorage.getItem('pj-view') || 'carousel'; } catch (e) {}
let carouselIndex = 0;

/* ---------------- helpers ---------------- */
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Add n days to an ISO date, returning a fresh ISO date (timezone-safe).
   Returns '' for empty or unparseable input so invalid dates can never
   ripple into NaN week math. */
function addDays(iso, n) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* The effective due date: an explicit due date wins; otherwise it's derived
   from the last period date (LMP + 280 days) so every week fills in
   automatically the moment the LMP is known. */
function effectiveDueDate() {
  return settings.dueDate || (settings.lmpDate ? addDays(settings.lmpDate, 280) : '');
}

function weeksAt(dateISO) {
  const dueISO = effectiveDueDate();
  if (!dueISO || !dateISO) return null;
  const due = new Date(dueISO + 'T00:00:00');
  const at = new Date(dateISO + 'T00:00:00');
  if (isNaN(due.getTime()) || isNaN(at.getTime())) return null;
  const ageDays = Math.round((due - at) / 86400000);
  const age = 280 - ageDays;
  if (age < 0) return null;
  const week = Math.min(42, Math.floor(age / 7) + 1);
  const trimester = week <= 13 ? 1 : week <= 26 ? 2 : 3;
  return { week, trimester };
}

function currentWeek() {
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return weeksAt(iso);
}

/* The exact calendar range of a pregnancy week. Week 1 starts on the LMP;
   week W spans LMP + (W-1)*7 days through LMP + W*7 - 1 days. Falls back to
   the due date (due - 280 days = LMP) when only the due date is known, so
   every card can show precise "8 Aug – 15 Aug" dates the moment either date
   is set. Returns null when no date is known. */
function weekRange(week) {
  const dueISO = effectiveDueDate();
  const lmp = dueISO ? addDays(dueISO, -280) : (settings.lmpDate || '');
  if (!lmp) return null;
  const n = Number(week);
  if (!n || n < 1) return null;
  const start = addDays(lmp, (n - 1) * 7);
  const end = addDays(start, 6);
  return start && end ? { start, end } : null;
}

/* Format a week range as "17 Mar – 23 Mar" (always day-first and locale
   independent; adds the year when the range crosses into a new year). */
function fmtRange(r) {
  if (!r) return '';
  const s = new Date(r.start + 'T00:00:00');
  const e = new Date(r.end + 'T00:00:00');
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = (x) => `${x.getDate()} ${mo[x.getMonth()]}`;
  return s.getFullYear() === e.getFullYear()
    ? `${d(s)} – ${d(e)}`
    : `${d(s)} ${s.getFullYear()} – ${d(e)} ${e.getFullYear()}`;
}

function trimesterName(t) {
  return t === 1 ? '1st Trimester' : t === 2 ? '2nd Trimester' : '3rd Trimester';
}

/* ---------------- API ---------------- */
async function api(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) {
    let msg = 'Something went wrong.';
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function loadAll() {
  settings = await api('/api/settings');
  entries = await api('/api/entries');
}

function applyTheme(themeId) {
  const id = (settings.theme || 'blush');
  document.documentElement.setAttribute('data-theme', id);
}

/* ---------------- theme picker ---------------- */
let chosenTheme = 'blush';
function buildThemePicker() {
  const picker = $('#s-theme');
  picker.innerHTML = '';
  THEMES.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-opt' + (t.id === chosenTheme ? ' active' : '');
    b.dataset.theme = t.id;
    b.style.setProperty('--sw-a', t.sw[0]);
    b.style.setProperty('--sw-b', t.sw[1]);
    b.innerHTML = `<span class="theme-swatch"></span><span>${escapeHtml(t.label)}</span>`;
    b.addEventListener('click', () => {
      chosenTheme = t.id;
      $$('#s-theme .theme-opt').forEach((x) => x.classList.toggle('active', x.dataset.theme === t.id));
      settings.theme = t.id;
      applyTheme();
    });
    picker.appendChild(b);
  });
}

/* ---------------- render: cover ---------------- */
function renderCover() {
  $('#cover-title').textContent = settings.journalTitle;
  $('#cover-emoji').textContent = settings.coverEmoji || '🌼';
  $('#cover-names').textContent = `${settings.mamaName} & ${settings.papaName}`;
  $('#cover-nickname').textContent = `for our ${settings.babyNickname}`;
  $('#cover-message').textContent = settings.coverMessage || '';
  $('#brand-title').textContent = settings.journalTitle;
  $('#brand-sub').textContent = `${settings.mamaName} & ${settings.papaName}`;
  const dueISO = effectiveDueDate();
  $('#cover-start').textContent = dueISO
    ? fmtDate(dueISO).replace(/,.*/, '')
    : 'we began our story';
  const datesNudge = $('#cover-dates');
  if (datesNudge) datesNudge.hidden = !!dueISO;
  document.title = settings.journalTitle;

  const cur = currentWeek();
  const coverWeek = $('#cover-week');
  const coverTrim = $('#cover-trim');
  if (cur) {
    coverWeek.hidden = false;
    coverWeek.textContent = `Week ${cur.week}`;
    coverTrim.hidden = false;
    coverTrim.textContent = trimesterName(cur.trimester);
  } else {
    coverWeek.hidden = true;
    coverTrim.hidden = true;
  }
}

/* ---------------- render: progress ---------------- */
function renderProgress() {
  const section = $('#progress-section');
  const cur = currentWeek();
  if (!cur) { section.hidden = true; return; }
  section.hidden = false;

  const chip = $('#current-week-chip');
  chip.hidden = false;
  chip.textContent = `Week ${cur.week} · ${trimesterName(cur.trimester)}`;

  const pct = Math.max(2.5, Math.min(100, (cur.week / 40) * 100));
  $('#progress-label').textContent = `Week ${cur.week} of 40 · ${trimesterName(cur.trimester)} — you're doing beautifully, ${settings.mamaName}`;

  const track = $('#progress-track');
  track.innerHTML = '';
  const fill = document.createElement('div');
  fill.className = 'progress-fill';
  fill.style.width = pct + '%';
  track.appendChild(fill);

  const markers = [1, 10, 20, 30, 40];
  markers.forEach((w) => {
    const dot = document.createElement('span');
    dot.className = 'dot' + (w <= cur.week ? ' filled' : '') + (w === cur.week ? ' now' : '');
    dot.style.left = (w / 40) * 100 + '%';
    dot.title = `Week ${w}`;
    track.appendChild(dot);
  });
}

/* ---------------- render: pages ---------------- */
function arrowSVG() {
  return `
  <svg viewBox="0 0 100 80" width="100%" height="100%" aria-hidden="true">
    <path d="M12 66 C 45 62, 72 44, 84 18" fill="none" stroke="#c96f75" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M84 18 L 74 16 M84 18 L 81 28" fill="none" stroke="#c96f75" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`;
}

function polaroidHTML(entry) {
  const big = entry.photoSize !== 'small';
  const tape = big
    ? `<span class="tape tl"></span><span class="tape br"></span>`
    : `<span class="tape tl"></span>`;
  return `
    <figure class="polaroid">
      ${tape}
      <img src="${escapeHtml(entry.photo)}" alt="${escapeHtml(entry.title || entry.photoCaption || 'A memory')}" loading="lazy" />
      ${entry.photoCaption ? `<figcaption>${escapeHtml(entry.photoCaption)}</figcaption>` : ''}
    </figure>`;
}

function pageHTML(entry) {
  const info = TYPE_INFO[entry.type] || TYPE_INFO.note;
  const w = weeksAt(entry.date) || (entry.week ? { week: entry.week, trimester: entry.trimester } : null);
  const hasPhoto = !!entry.photo;

  let body = '';
  if (hasPhoto && entry.photoSize === 'small') {
    body += `<div class="photo-small">${polaroidHTML(entry)}</div>`;
  }
  if (hasPhoto && entry.photoSize === 'large') {
    body += `<div class="photo-large">${polaroidHTML(entry)}</div>`;
  }
  if (entry.arrow && hasPhoto && entry.note) {
    const cls = entry.photoSize === 'small' ? 'to-photo-small' : 'to-photo';
    body += `<div class="arrow-deco ${cls}">${arrowSVG()}</div>`;
  }
  if (entry.note) {
    body += `<p class="note">${escapeHtml(entry.note)}</p>`;
  }

  let metaDate = fmtDate(entry.date);
  let weekLabel = w ? `Week ${w.week}` : '';
  if (entry.type === 'milestone' && !entry.date) {
    // no exact date was entered — show the precise calendar range of the week
    // itself (computed from the due date / LMP), e.g. "8 Aug – 15 Aug".
    const range = w ? weekRange(w.week) : null;
    if (range) {
      metaDate = fmtRange(range);
      weekLabel = `Week ${w.week}`;
    } else {
      metaDate = w ? `around week ${w.week}` : 'someday';
      weekLabel = '';
    }
  }
  const trimesterTag = w && w.trimester ? `<span class="page-trim">${trimesterName(w.trimester)}</span>` : '';

  let mentionsHtml = '';
  if (entry.mentions && entry.mentions.length) {
    const rows = entry.mentions
      .map((m) => {
        const lab = escapeHtml(m.label);
        const nt = m.note ? ` <span class="mt-note">${escapeHtml(m.note)}</span>` : '';
        return `<li class="mt">${lab}${nt}</li>`;
      })
      .join('');
    mentionsHtml = `<div class="mentions"><div class="mentions-head"><span>${TYPE_INFO.milestone.icon}</span> mentions in this milestone</div><ul>${rows}</ul></div>`;
  }

  return `
  <article class="page ${info.cls}-page" data-id="${escapeHtml(entry.id)}">
    <div class="page-actions">
      <button class="edit" title="Edit this page" aria-label="Edit">✏️</button>
      <button class="del" title="Remove this page" aria-label="Delete">🗑️</button>
    </div>
    <div class="page-meta">
      <span class="page-date">${[metaDate, weekLabel].filter(Boolean).join(' · ')}</span>
      ${trimesterTag}
      <span class="page-type pt-${info.cls}">${info.icon} ${info.label}</span>
      ${artMiniHTML(entry)}
    </div>
    ${entry.title ? `<h2 class="page-title"><span class="p-icon">${escapeHtml(entry.icon || info.icon)}</span>${escapeHtml(entry.title)}</h2>` : ''}
    <div class="page-body">${body || `<p class="note">${escapeHtml(entry.note || '…')}</p>`}</div>
    ${mentionsHtml}
    ${peekRowHTML(entry)}
  </article>`;
}

/* Peek row — the "Peek inside this week" guide button, centered under the
   card. The art prompt now lives as a tiny icon in the page meta row. */
function peekRowHTML(entry) {
  const buttons = [guidePeekHTML(entry)].filter(Boolean);
  if (!buttons.length) return '';
  return `<div class="page-peeks">${buttons.join('')}</div>`;
}

function trimesterOf(entry) {
  const w = weeksAt(entry.date);
  if (w && w.trimester) return w.trimester;
  return entry.trimester || null;
}

/* ---------------- week-by-week guidance ---------------- */
/* Guide content is keyed by week number (4–40). The data lives in
   guide-data.js (window.PREGNANCY_GUIDE) so both apps share it and the
   guidance works even with an empty journal. */
function guideForWeek(week) {
  const g = window.PREGNANCY_GUIDE;
  if (!g || !g.weeks) return null;
  const w = Number(week);
  return g.weeks[w] ? { week: w, ...g.weeks[w], trimester: g.trimesters.find((t) => w >= (t.t === 1 ? 4 : t.t === 2 ? 14 : 28) && w <= (t.t === 1 ? 13 : t.t === 2 ? 27 : 40)) } : null;
}

function entryGuideWeek(entry) {
  // exact date → its week (when due date is known); otherwise fall back to the
  // milestone's template week so dated pages still get a peek without a due
  // date; the cover note (week 0) never gets one.
  if (entry.date) {
    const w = weeksAt(entry.date);
    if (w && guideForWeek(w.week)) return w.week;
  }
  const wk = Number(entry.week);
  return guideForWeek(wk) ? wk : null;
}

function guidePeekHTML(entry) {
  const week = entryGuideWeek(entry);
  if (!week) return '';
  return `
  <button type="button" class="guide-peek" data-week="${week}" title="Peek at what's happening for you and little one this week">
    <span class="gp-orb">💡</span>
    <span class="gp-label">Peek inside this week</span>
  </button>`;
}

/* One week's guidance rendered into HTML — shared by the page peek modal
   and the full week-by-week journey view on the cover. */
function guideWeekHTML(week) {
  const d = guideForWeek(week);
  if (!d) return '';
  const tri = d.trimester;
  return `
  <div class="guide-week" data-week="${week}">
    <div class="gw-head">
      <span class="gw-week">Week ${week}</span>
      <span class="gw-size">little one is the size of ${d.size}</span>
    </div>
    <div class="gw-trim">${tri ? escapeHtml(tri.emoji + ' ' + tri.name + ' · ' + tri.tag) : ''}</div>
    <div class="gw-block">
      <div class="gw-title">🤱 You might feel</div>
      <ul class="gw-list">${d.mom.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
    </div>
    <div class="gw-block">
      <div class="gw-title">👶 Little one inside</div>
      <p class="gw-text">${escapeHtml(d.baby)}</p>
    </div>
    <div class="gw-block">
      <div class="gw-title">💛 How you might feel</div>
      <p class="gw-text">${escapeHtml(d.feel)}</p>
    </div>
    <div class="gw-block gw-analogy">
      <div class="gw-title">🎈 A little analogy</div>
      <p class="gw-text">${escapeHtml(d.analogy)}</p>
    </div>
  </div>`;
}

function guideWeeksForTrimester(t) {
  const g = window.PREGNANCY_GUIDE;
  if (!g || !g.weeks) return [];
  return Object.keys(g.weeks)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((w) => (t === 1 ? w <= 13 : t === 2 ? w >= 14 && w <= 27 : w >= 28));
}

let guideOpenWeek = null;

function openGuidePeek(week) {
  if (!guideForWeek(week)) return;
  guideOpenWeek = Number(week);
  renderGuidePeek();
  $('#guide-overlay').hidden = false;
}

function renderGuidePeek() {
  const d = guideForWeek(guideOpenWeek);
  if (!d) return;
  $('#guide-title').textContent = `Week ${guideOpenWeek} — little one is the size of ${d.size}`;
  $('#guide-body').innerHTML = guideWeekHTML(guideOpenWeek);
  const prev = $('#guide-prev');
  const next = $('#guide-next');
  if (prev) prev.disabled = !guideForWeek(guideOpenWeek - 1);
  if (next) next.disabled = !guideForWeek(guideOpenWeek + 1);
}

function closeGuidePeek() {
  $('#guide-overlay').hidden = true;
}

/* ---------------- art prompts (image-generation hints) ---------------- */
/* Builds a ready-to-copy image prompt for a milestone page. The scene and
   importance come from the static art-prompts.js templates; everything else
   (the family's own note, the week, baby's size & development, the mentions)
   is filled in from the live entry so each prompt is grounded in that page. */
function cleanExcerpt(text, max) {
  const clean = String(text || '')
    .replace(/[*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? clean.slice(0, max).trim().replace(/[,;:]+$/, '') + '\u2026' : clean;
}

function artPromptFor(entry) {
  const week = entryGuideWeek(entry);
  const P = window.ART_PROMPTS;
  if (!week || !P) return '';
  const d = guideForWeek(week) || {};
  const keyMatch = /^milestone-([a-z0-9-]+)-/.exec(entry.id || '');
  const byTitle = (P.byTitle && entry.title && Object.prototype.hasOwnProperty.call(P.byTitle, entry.title) && P.byTitle[entry.title]) || null;
  const meta =
    (keyMatch && P.byKey && Object.prototype.hasOwnProperty.call(P.byKey, keyMatch[1]) && P.byKey[keyMatch[1]]) ||
    (byTitle && P.byKey && Object.prototype.hasOwnProperty.call(P.byKey, byTitle) && P.byKey[byTitle]) ||
    null;
  const tri = d.trimester ? d.trimester.name : trimesterName(entry.trimester || (week <= 13 ? 1 : week <= 26 ? 2 : 3));
  const scene = meta ? meta.scene : P.generic.scene;
  const importance = meta ? meta.importance : P.generic.importance;

  const note = cleanExcerpt(entry.note, 130);
  const baby = cleanExcerpt(d.baby, 110);
  const mentions = (entry.mentions || []).map((m) => m.label).filter(Boolean).slice(0, 2);
  const title = entry.title || 'this milestone';

  const parts = [
    P.style + '.',
    scene,
    `This is the ${title} milestone at week ${week} (${tri}) \u2014 ${importance}.`,
    d.size ? `Little one is the size of ${d.size}.` : '',
    baby ? `${baby.replace(/\.+$/, '')}.` : '',
    note ? `The parents wrote on this page: "${note}".` : '',
    mentions.length ? `Also on this page: ${mentions.join(' and ')}.` : '',
    P.closing + '.'
  ];
  return parts.filter(Boolean).join(' ');
}

/* A tiny, subtle art-prompt icon sitting beside the type pill — occupies
   almost no space but stays discoverable on hover. */
function artMiniHTML(entry) {
  if (entry.type !== 'milestone' || !entryGuideWeek(entry) || !window.ART_PROMPTS) return '';
  return `<button type="button" class="art-mini" data-id="${escapeHtml(entry.id)}" title="Art prompt \u2014 copy a prompt to make a picture for this milestone" aria-label="Art prompt">🎨</button>`;
}

let artEntry = null;

function openArtPrompt(entry) {
  artEntry = entry;
  renderArtPrompt();
  $('#art-overlay').hidden = false;
}

function renderArtPrompt() {
  if (!artEntry) return;
  const title = artEntry.title || 'This milestone';
  $('#art-title').textContent = `${title} \u2014 a picture for this page`;
  $('#art-text').value = artPromptFor(artEntry);
}

function closeArtPrompt() {
  $('#art-overlay').hidden = true;
}

function copyArtPrompt() {
  const text = $('#art-text').value;
  const done = () => toast('Prompt copied \u2014 happy making! 🎨');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => legacyCopyPrompt(done));
  } else {
    legacyCopyPrompt(done);
  }
}

function legacyCopyPrompt(done) {
  const ta = $('#art-text');
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    done();
  } catch {
    toast('Select the text and copy it yourself.');
  }
}

/* ---------------- standalone week-by-week journey (cover hook) ---------------- */
let journeyTrim = 1;
let journeyWeek = null;

function openJourneyGuide() {
  const cur = currentWeek();
  journeyTrim = cur ? cur.trimester : 1;
  journeyWeek = cur && guideForWeek(cur.week) ? cur.week : null;
  renderJourneyGuide();
  $('#journey-overlay').hidden = false;
}

function renderJourneyGuide() {
  const g = window.PREGNANCY_GUIDE;
  if (!g) return;
  $('#journey-title').textContent = 'Week-by-week guide';

  // trimester tabs
  $('#journey-trims').innerHTML = g.trimesters
    .map(
      (t) =>
        `<button type="button" class="journey-trim${t.t === journeyTrim ? ' active' : ''}" data-trim="${t.t}" title="${escapeHtml(t.summary)}"><span class="jt-emoji">${t.emoji}</span><span class="jt-name">${t.name}</span><span class="jt-tag">${t.tag}</span></button>`
    )
    .join('');

  // summary strip for the active trimester
  const active = g.trimesters.find((t) => t.t === journeyTrim);
  $('#journey-summary').innerHTML = active ? `<span class="js-emoji">${active.emoji}</span><span>${escapeHtml(active.summary)}</span>` : '';

  // week chips
  const weeks = guideWeeksForTrimester(journeyTrim);
  const cur = currentWeek();
  $('#journey-weeks').innerHTML = weeks
    .map(
      (w) =>
        `<button type="button" class="journey-week${w === journeyWeek ? ' active' : ''}${cur && w === cur.week ? ' now' : ''}" data-week="${w}" ${w === journeyWeek ? 'aria-current="true"' : ''}>${w}</button>`
    )
    .join('');

  // detail pane
  const wk = journeyWeek || weeks[0];
  $('#journey-detail').innerHTML = guideWeekHTML(wk);
  if (wk) journeyWeek = wk;
}

function closeJourneyGuide() {
  $('#journey-overlay').hidden = true;
}

/* ---------------- timeline navigation ---------------- */
/* Group the sorted pages by trimester so both the stacked left rail and the
   carousel bottom nav can offer quick, meaningful jumps. Pages without a
   trimester fall into an "Anytime" group at the end. */
function timelineGroups() {
  const groups = [];
  const byTrim = {};
  entries.forEach((entry) => {
    const trim = trimesterOf(entry) || 0;
    if (!byTrim[trim]) {
      byTrim[trim] = { trim, label: trim ? trimesterName(trim) : 'Anytime', items: [] };
      groups.push(byTrim[trim]);
    }
    byTrim[trim].items.push(entry);
  });
  return groups;
}

/* Left rail for the stacked view: trimester sections, each with its child
   pages as little dots + titles. Clicking one scrolls to that page. */
function timelineRailHTML() {
  const groups = timelineGroups();
  return `
    <nav class="timeline-rail" aria-label="Journal timeline">
      <div class="rail-head">Our journey</div>
      ${groups
        .map(
          (g) => `
        <div class="rail-group" data-trim="${g.trim}">
          <button type="button" class="rail-trim" data-trim="${g.trim}" title="Jump to ${escapeHtml(g.label)}">${escapeHtml(g.label)}</button>
          <ul class="rail-items">
            ${g.items
              .map(
                (e) => `
              <li><button type="button" class="rail-item" data-id="${escapeHtml(e.id)}" title="${escapeHtml(e.title || '')}">
                <span class="rail-dot"></span><span class="rail-title">${escapeHtml(e.title || '…')}</span>
              </button></li>`
              )
              .join('')}
          </ul>
        </div>`
        )
        .join('')}
    </nav>`;
}

let railSpy = null;

/* rAF-driven smooth scroll — works even where native smooth scrollIntoView
   is unavailable, with a gentle ease-in-out. */
function smoothScrollTo(el) {
  const startY = window.scrollY;
  // read the offset from CSS (scroll-margin-top) so it can never drift apart
  const offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 96;
  const targetY = Math.max(0, el.getBoundingClientRect().top + startY - offset);
  const dist = targetY - startY;
  if (Math.abs(dist) < 2) return;
  const dur = Math.min(700, Math.max(350, Math.abs(dist) * 0.12));
  const t0 = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    window.scrollTo(0, startY + dist * ease(p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function setActiveRailItem(id) {
  const layout = $('#stacked-layout');
  if (!layout) return;
  layout.querySelectorAll('.rail-item').forEach((it) => it.classList.toggle('active', it.dataset.id === id));
}

function wireTimelineRail() {
  const layout = $('#stacked-layout');
  if (!layout) return;

  // click a page in the rail → scroll it into view
  layout.querySelectorAll('.rail-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = layout.querySelector(`.page[data-id="${CSS.escape(btn.dataset.id)}"]`);
      if (page) smoothScrollTo(page);
      layout.classList.remove('rail-open');
    });
  });

  // click a trimester label → jump to its first page
  layout.querySelectorAll('.rail-trim').forEach((btn) => {
    btn.addEventListener('click', () => {
      const first = layout.querySelector(`.rail-group[data-trim="${btn.dataset.trim}"] .rail-item`);
      if (first) first.click();
    });
  });

  // mobile drawer open/close
  const toggle = $('#rail-toggle');
  const backdrop = $('#rail-backdrop');
  if (toggle) toggle.addEventListener('click', () => layout.classList.toggle('rail-open'));
  if (backdrop) backdrop.addEventListener('click', () => layout.classList.remove('rail-open'));

  // scroll-spy: highlight the page sitting at the top of the reading area
  if (railSpy) railSpy.disconnect();
  const pages = Array.from(layout.querySelectorAll('.stacked-pages .page'));
  if (!pages.length) return;
  railSpy = new IntersectionObserver(
    (hits) => {
      // when scrolled to the very bottom, a short final page may never reach
      // the observation band — highlight it explicitly
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        const items = layout.querySelectorAll('.rail-item');
        if (items.length) setActiveRailItem(items[items.length - 1].dataset.id);
        return;
      }
      const visible = hits.filter((h) => h.isIntersecting);
      if (!visible.length) return;
      const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0].target;
      setActiveRailItem(top.dataset.id);
    },
    { rootMargin: '-15% 0px -55% 0px', threshold: 0 }
  );
  pages.forEach((p) => railSpy.observe(p));
}

function renderPages() {
  const container = $('#pages');
  if (!entries.length) {
    container.innerHTML = `<div class="empty-state"><span class="big">🌸</span>Your journal is waiting for its first page.<br>Tap "＋ New page" whenever you're ready.</div>`;
    return;
  }
  if (viewMode === 'carousel') renderCarousel(container);
  else renderStacked(container);
}

function renderStacked(container) {
  let lastTrim = null;
  let html = '';
  entries.forEach((entry) => {
    const trim = trimesterOf(entry);
    if (trim && trim !== lastTrim && lastTrim !== null) {
      html += `<div class="trimester-divider"><span class="td-orn">✦</span><span class="td-label">${trimesterName(trim)}</span></div>`;
    }
    if (trim && lastTrim === null) {
      html += `<div class="trimester-divider first"><span class="td-label">${trimesterName(trim)}</span></div>`;
    }
    if (trim) lastTrim = trim;
    html += pageHTML(entry);
  });
  container.innerHTML = `
    <div class="stacked-layout" id="stacked-layout">
      <button type="button" class="rail-toggle" id="rail-toggle" aria-label="Open the timeline" title="Timeline">☰</button>
      <div class="rail-backdrop" id="rail-backdrop"></div>
      ${timelineRailHTML()}
      <div class="stacked-pages" id="stacked-pages">${html}</div>
    </div>`;
  wireTimelineRail();
}

function setView(mode) {
  viewMode = mode === 'stacked' ? 'stacked' : 'carousel';
  try { localStorage.setItem('pj-view', viewMode); } catch (e) {}
  $$('.view-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === viewMode));
  renderPages();
}

/* ---------------- drag-to-rearrange ---------------- */
/* Reorder mode lets the family drag any page to a new spot — in the carousel
   (drag sideways) or the stacked view (drag up/down). Pointer events make it
   work with a mouse AND a touch on a phone. The new order is locked into each
   page's sortOrder, so it sticks until they rearrange again. */
let reorderMode = false;
let drag = null;

function setReorderMode(on) {
  // if the toggle is tapped mid-drag (or a drag is somehow still active),
  // clean up the ghost/indicator before the view re-renders
  if (!on && drag) cancelReorderDrag();
  reorderMode = on;
  document.body.classList.toggle('reorder-mode', on);
  const btn = $('#btn-reorder');
  if (btn) {
    btn.classList.toggle('active', on);
    btn.textContent = on ? '✓ Done' : '⇅ Reorder';
  }
  const hint = $('#reorder-hint');
  if (hint) hint.hidden = !on;
  renderPages();
  if (on) toast('Drag pages to rearrange them — tap Done when finished.');
}

function cancelReorderDrag() {
  if (!drag) return;
  const d = drag;
  drag = null;
  document.body.classList.remove('reorder-dragging');
  if (d.ghost) d.ghost.remove();
  d.el.classList.remove('dragging');
  const line = $('#reorder-drop-line');
  if (line) line.hidden = true;
}

function moveEntryInPlace(arr, from, to) {
  const a = arr.slice();
  const [item] = a.splice(from, 1);
  a.splice(to, 0, item);
  return a;
}

function reorderStartDrag(e, card) {
  if (!reorderMode || drag) return;
  const from = entries.findIndex((x) => x.id === card.dataset.id);
  if (from < 0) return;
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.remove('dragging');
  ghost.classList.add('drag-ghost');
  ghost.style.width = rect.width + 'px';
  ghost.style.minHeight = rect.height + 'px';
  document.body.appendChild(ghost);
  card.classList.add('dragging');
  // read the real track gap (like positionCarousel) so drag math can never
  // drift if the CSS column gap changes
  const trackEl = $('#carousel-track');
  const gap = trackEl ? parseFloat(getComputedStyle(trackEl).columnGap) || 28 : 28;
  drag = {
    el: card,
    ghost,
    from,
    startX: e.clientX,
    startY: e.clientY,
    grabX: e.clientX - rect.left,
    grabY: e.clientY - rect.top,
    step: viewMode === 'carousel' ? rect.width + gap : 0,
    moved: false,
    to: from,
    pointerId: e.pointerId
  };
  positionDragGhost(e);
  try { card.setPointerCapture(e.pointerId); } catch {}
  document.body.classList.add('reorder-dragging');
}

function positionDragGhost(e) {
  if (!drag) return;
  drag.ghost.style.transform = `translate(${e.clientX - drag.grabX}px, ${e.clientY - drag.grabY}px)`;
}

function reorderMove(e) {
  if (!drag) return;
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
  drag.moved = true;
  positionDragGhost(e);
  if (viewMode === 'carousel') {
    drag.to = Math.max(0, Math.min(entries.length - 1, drag.from + Math.round(dx / drag.step)));
  } else {
    // stacked: count non-dragged cards whose midpoint sits above the pointer
    const cards = Array.from(document.querySelectorAll('#stacked-pages .page')).filter((c) => c !== drag.el);
    let to = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { to = i; break; }
    }
    drag.to = to;
  }
  paintDropLine();
}

function paintDropLine() {
  const line = getDropLine();
  const preview = moveEntryInPlace(entries, drag.from, drag.to);
  const afterIdx = preview.findIndex((x) => x.id === drag.el.dataset.id);
  const nextId = preview[afterIdx + 1] ? preview[afterIdx + 1].id : null;
  const els = Array.from(document.querySelectorAll('.page')).filter((c) => c !== drag.el);
  const nextEl = nextId ? els.find((c) => c.dataset.id === nextId) : null;
  if (viewMode === 'carousel') {
    const lastEl = els[els.length - 1];
    const anchor = nextEl || lastEl;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const stage = $('#carousel-stage').getBoundingClientRect();
    line.classList.add('v');
    line.classList.remove('h');
    line.style.left = (nextEl ? r.left : r.right) + 'px';
    line.style.top = stage.top + 10 + 'px';
    line.style.height = Math.max(40, stage.height - 20) + 'px';
  } else {
    const lastEl = els[els.length - 1];
    const anchor = nextEl || lastEl;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    line.classList.add('h');
    line.classList.remove('v');
    line.style.left = r.left + 16 + 'px';
    line.style.width = Math.max(80, r.width - 32) + 'px';
    line.style.top = (nextEl ? r.top : r.bottom) - 2 + 'px';
  }
}

function getDropLine() {
  let line = $('#reorder-drop-line');
  if (!line) {
    line = document.createElement('div');
    line.id = 'reorder-drop-line';
    document.body.appendChild(line);
  }
  line.hidden = false;
  return line;
}

async function reorderEnd(e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  document.body.classList.remove('reorder-dragging');
  if (d.ghost) d.ghost.remove();
  d.el.classList.remove('dragging');
  const line = $('#reorder-drop-line');
  if (line) line.hidden = true;
  try { d.el.releasePointerCapture(e.pointerId); } catch {}
  if (!d.moved || d.to === d.from) return; // nothing changed — no re-render needed
  const [moved] = entries.splice(d.from, 1);
  entries.splice(d.to, 0, moved);
  entries.forEach((x, i) => { x.sortOrder = (i + 1) * 1000; });
  try {
    // the server re-locks the same order and returns the authoritative list
    const sorted = await api('/api/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: entries.map((x) => x.id) })
    });
    entries = Array.isArray(sorted) ? sorted : entries;
    carouselIndex = entries.findIndex((x) => x.id === moved.id);
    renderPages();
    toast('Order saved 💛');
  } catch (err) {
    toast(err.message);
    await loadAll();
    renderPages();
  }
}

function wireReorderDrag() {
  const pages = $('#pages');
  if (!pages) return;
  pages.addEventListener('pointerdown', (e) => {
    if (!reorderMode) return;
    if (e.target.closest('button, a, input, textarea, .guide-peek, .art-mini')) return;
    const card = e.target.closest('.page');
    if (card) reorderStartDrag(e, card);
  });
  pages.addEventListener('pointermove', reorderMove);
  pages.addEventListener('pointerup', reorderEnd);
  pages.addEventListener('pointercancel', reorderEnd);
}

/* ---------------- carousel view ---------------- */
function renderCarousel(container) {
  if (railSpy) { railSpy.disconnect(); railSpy = null; }
  carouselIndex = Math.min(carouselIndex, Math.max(entries.length - 1, 0));
  container.innerHTML = `
    <div class="carousel">
      <button type="button" class="car-arrow prev" aria-label="Previous page" title="Previous page">‹</button>
      <div class="carousel-stage" id="carousel-stage">
        <div class="carousel-track" id="carousel-track">${entries.map(pageHTML).join('')}</div>
      </div>
      <button type="button" class="car-arrow next" aria-label="Next page" title="Next page">›</button>
      <div class="carousel-footer">
        <span class="carousel-count" aria-live="polite"></span>
        <div class="carousel-dots"></div>
      </div>
    </div>`;
  Array.from(container.querySelectorAll('#carousel-track .page')).forEach((c, i) => {
    c.classList.add('carousel-card');
    c.dataset.idx = String(i);
  });
  buildCarouselDots();
  sizeCarouselCards();
  positionCarousel();
}

function buildCarouselDots() {
  const wrap = document.querySelector('.carousel-dots');
  if (!wrap) return;
  const groups = timelineGroups();
  let offset = 0;
  wrap.innerHTML = groups
    .map((g) => {
      const dots = g.items
        .map((e, j) => {
          const i = offset + j;
          return `<button type="button" class="car-dot" data-i="${i}" aria-label="Go to ${escapeHtml(e.title || 'page ' + (i + 1))}"></button>`;
        })
        .join('');
      const html = `
        <div class="ct-group" data-trim="${g.trim}">
          <button type="button" class="ct-label" data-trim="${g.trim}" title="Jump to ${escapeHtml(g.label)}">${escapeHtml(g.label)}</button>
          <div class="ct-dots">${dots}</div>
        </div>`;
      offset += g.items.length;
      return html;
    })
    .join('');
}

function sizeCarouselCards() {
  const cards = $$('#carousel-track .carousel-card');
  if (!cards.length) return;
  cards.forEach((c) => (c.style.height = ''));
  const h = Math.max(...cards.map((c) => c.scrollHeight));
  cards.forEach((c) => (c.style.height = h + 'px'));
}

function positionCarousel() {
  const track = $('#carousel-track');
  const stage = $('#carousel-stage');
  if (!track || !stage) return;
  const card = track.children[carouselIndex];
  if (!card) return;
  // offsetWidth is the flex layout width (unaffected by the scale transform,
  // so centering stays exact even mid-transition); gap mirrors the CSS.
  const w = card.offsetWidth;
  const gap = parseFloat(getComputedStyle(track).columnGap) || 28;
  const offset = (stage.clientWidth - w) / 2 - carouselIndex * (w + gap);
  track.style.transform = `translateX(${offset}px)`;
  track.querySelectorAll('.carousel-card').forEach((c, i) => {
    c.classList.toggle('is-prev', i < carouselIndex);
    c.classList.toggle('is-active', i === carouselIndex);
    c.classList.toggle('is-next', i > carouselIndex);
  });
  const prev = document.querySelector('.car-arrow.prev');
  const next = document.querySelector('.car-arrow.next');
  if (prev) prev.disabled = carouselIndex === 0;
  if (next) next.disabled = carouselIndex === entries.length - 1;
  const count = document.querySelector('.carousel-count');
  if (count) count.textContent = `${carouselIndex + 1} / ${entries.length}`;
  document.querySelectorAll('.car-dot').forEach((d, i) => d.classList.toggle('active', i === carouselIndex));
  const curTrim = trimesterOf(entries[carouselIndex]) || 0;
  document.querySelectorAll('.ct-group').forEach((g) => g.classList.toggle('active', Number(g.dataset.trim) === curTrim));
}

function carouselStep(dir) {
  const next = carouselIndex + dir;
  if (next < 0 || next >= entries.length) return;
  carouselIndex = next;
  positionCarousel();
}

function renderAll() {
  renderCover();
  renderProgress();
  renderPages();
}

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => (t.hidden = true), 300);
  }, 2600);
}

/* ---------------- editor ---------------- */
let editingId = null;
let pendingPhoto = null;
let removePhotoFlag = false;

function buildIconPicker(containerId, value, onChange) {
  const picker = $(containerId);
  picker.innerHTML = '';
  const opt = (icon, active) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn-opt' + (active ? ' active' : '');
    b.textContent = icon;
    b.dataset.icon = icon;
    b.addEventListener('click', () => {
      $$(`${containerId} .icon-btn-opt`).forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      onChange(b.dataset.icon);
    });
    picker.appendChild(b);
  };
  opt('none', !value || value === 'none');
  BABY_ICONS.forEach((icon) => opt(icon, icon === value));
}

function setSeg(containerId, activeValue, onSelect) {
  $$(`${containerId} .seg-btn`).forEach((b) => {
    b.classList.toggle('active', b.dataset.type === activeValue || b.dataset.size === activeValue);
    b.addEventListener('click', () => {
      $$(`${containerId} .seg-btn`).forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      onSelect(b.dataset.type || b.dataset.size);
    });
  });
}

let chosenType = 'memory';
let chosenSize = 'large';
let chosenIcon = '';
let activeMentions = [];

function openEditor(entry) {
  chosenType = entry ? entry.type : 'memory';
  chosenSize = entry ? entry.photoSize : 'large';
  chosenIcon = entry ? entry.icon : TYPE_INFO[chosenType].icon;
  pendingPhoto = null;
  removePhotoFlag = false;
  editingId = entry ? entry.id : null;
  activeMentions = entry && entry.mentions ? entry.mentions.map((m) => ({ label: m.label || '', note: m.note || '' })) : [];

  $('#editor-title').textContent = entry ? 'Edit this page' : 'A new page';
  $('#f-id').value = entry ? entry.id : '';
  $('#f-date').value = entry ? entry.date : new Date().toISOString().slice(0, 10);
  $('#f-title').value = entry ? entry.title : '';
  $('#f-week').value = entry && entry.week && !entry.date ? entry.week : '';
  $('#f-note').value = entry ? entry.note : '';
  $('#f-photocaption').value = entry ? entry.photoCaption : '';
  $('#f-arrow').checked = entry ? !!entry.arrow : false;

  const syncType = (v) => {
    const isMile = v === 'milestone';
    $('#f-title-field').style.display = v === 'note' ? 'none' : 'block';
    $('#week-field').hidden = !isMile;
    $('#mentions-field').hidden = !isMile;
    if (isMile) renderMentions();
    if (chosenIcon === '') chosenIcon = TYPE_INFO[v].icon;
    updateIconPicker();
  };

  setSeg('#f-type', chosenType, (v) => {
    chosenType = v;
    syncType(v);
  });
  setSeg('#f-photosize', chosenSize, (v) => (chosenSize = v));
  buildIconPicker('#f-icon', chosenIcon, (v) => (chosenIcon = v === 'none' ? '' : v));

  if (entry && entry.photo) {
    $('#dz-img').src = entry.photo;
    $('#dz-empty').hidden = true;
    $('#dz-preview').hidden = false;
  } else if (pendingPhoto) {
    $('#dz-img').src = pendingPhoto.preview;
    $('#dz-empty').hidden = true;
    $('#dz-preview').hidden = false;
  } else {
    $('#dz-preview').hidden = true;
    $('#dz-empty').hidden = false;
  }

  syncType(chosenType);
  $('#arrow-row').hidden = !($('#dz-preview').hidden === false);
  updateIconPicker();

  $('#editor-overlay').hidden = false;
  setTimeout(() => $('#f-date').focus(), 50);
}

function updateIconPicker() {
  $$('#f-icon .icon-btn-opt').forEach((b) => {
    b.classList.toggle('active', b.dataset.icon === (chosenIcon || 'none'));
  });
}

function renderMentions() {
  const list = $('#mentions-list');
  list.innerHTML = activeMentions
    .map(
      (m, i) => `
    <div class="mention-row">
      <input class="mt-label" data-i="${i}" placeholder="e.g. Beta-hCG blood test · booking panel · anti-D" value="${escapeHtml(m.label)}" />
      <input class="mt-note" data-i="${i}" placeholder="result / note (optional)" value="${escapeHtml(m.note)}" />
      <button type="button" class="mt-del" data-i="${i}" aria-label="Remove mention">✕</button>
    </div>`
    )
    .join('');
}

function addMentionRow() {
  activeMentions.push({ label: '', note: '' });
  renderMentions();
  const rows = $$('#mentions-list .mention-row');
  if (rows.length) rows[rows.length - 1].querySelector('.mt-label').focus();
}

function collectMentions() {
  return $$('#mentions-list .mention-row')
    .map((r) => ({
      label: r.querySelector('.mt-label').value.trim(),
      note: r.querySelector('.mt-note').value.trim()
    }))
    .filter((m) => m.label || m.note);
}

function closeEditor() {
  $('#editor-overlay').hidden = true;
}

function showPhotoPreview(file) {
  const reader = new FileReader();
  reader.onload = () => {
    pendingPhoto = { file, preview: reader.result };
    $('#dz-img').src = reader.result;
    $('#dz-empty').hidden = true;
    $('#dz-preview').hidden = false;
    $('#arrow-row').hidden = false;
  };
  reader.readAsDataURL(file);
}

function editorPhotoInput() {
  const input = $('#f-photo');
  const file = input.files && input.files[0];
  if (file) {
    if (!file.type.startsWith('image/')) return toast('That file is not a picture.');
    if (file.size > 20 * 1024 * 1024) return toast('That photo is too big (max 20 MB).');
    showPhotoPreview(file);
  }
}

function clearPhoto() {
  pendingPhoto = null;
  removePhotoFlag = true;
  $('#f-photo').value = '';
  $('#dz-img').src = '';
  $('#dz-preview').hidden = true;
  $('#dz-empty').hidden = false;
  $('#arrow-row').hidden = true;
}

async function saveEditor() {
  const fd = new FormData();
  fd.append('type', chosenType);
  fd.append('date', $('#f-date').value);
  fd.append('title', $('#f-title').value.trim());
  fd.append('note', $('#f-note').value.trim());
  fd.append('photoSize', chosenSize);
  fd.append('photoCaption', $('#f-photocaption').value.trim());
  fd.append('week', $('#f-week').value || '');
  fd.append('mentions', JSON.stringify(collectMentions()));
  fd.append('icon', chosenIcon);
  fd.append('arrow', $('#f-arrow').checked ? '1' : '0');
  if (pendingPhoto) fd.append('photo', pendingPhoto.file);
  if (removePhotoFlag) fd.append('removePhoto', '1');

  try {
    if (editingId) {
      await api('/api/entries/' + editingId, { method: 'PUT', body: fd });
      toast('This page is saved. 💛');
    } else {
      await api('/api/entries', { method: 'POST', body: fd });
      toast('A new page is in your journal. ✨');
    }
    closeEditor();
    await loadAll();
    renderAll();
  } catch (err) {
    toast(err.message);
  }
}

async function deleteEntry(id) {
  const el = document.querySelector(`.page[data-id="${CSS.escape(id)}"]`);
  const title = el && el.querySelector('.page-title') ? el.querySelector('.page-title').textContent.trim() : 'this page';
  if (!confirm(`Remove "${title}" from your journal? This cannot be undone.`)) return;
  try {
    await api('/api/entries/' + id, { method: 'DELETE' });
    toast('That page has been tucked away. 💭');
    await loadAll();
    renderAll();
  } catch (err) {
    toast(err.message);
  }
}

/* ---------------- settings ---------------- */
function openSettings() {
  chosenTheme = settings.theme || 'blush';
  $('#s-title').value = settings.journalTitle;
  $('#s-mama').value = settings.mamaName;
  $('#s-papa').value = settings.papaName;
  $('#s-nick').value = settings.babyNickname;
  $('#s-lmp').value = settings.lmpDate || '';
  $('#s-due').value = settings.dueDate || (settings.lmpDate ? addDays(settings.lmpDate, 280) : '');
  // the period date stays editable so a mistake can be fixed and everything
  // recalculates; the due date auto-fills from it (see the #s-lmp listener)
  $('#lmp-field').hidden = false;
  $('#s-msg').value = settings.coverMessage || '';
  buildIconPicker('#s-emoji', settings.coverEmoji, (v) => {
    settings.coverEmoji = v === 'none' ? '🌼' : v;
  });
  buildThemePicker();
  $('#settings-overlay').hidden = false;
}

async function saveSettings() {
  const lmp = $('#s-lmp').value;
  const payload = {
    journalTitle: $('#s-title').value.trim(),
    mamaName: $('#s-mama').value.trim(),
    papaName: $('#s-papa').value.trim(),
    babyNickname: $('#s-nick').value.trim(),
    lmpDate: lmp,
    dueDate: $('#s-due').value || (lmp ? addDays(lmp, 280) : ''),
    coverMessage: $('#s-msg').value.trim(),
    coverEmoji: settings.coverEmoji || '🌼',
    theme: chosenTheme
  };
  try {
    settings = await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    $('#settings-overlay').hidden = true;
    toast('Your journal details are set. 💛');
    await loadAll();
    applyTheme();
    renderAll();
  } catch (err) {
    toast(err.message);
  }
}

/* ---------------- print & export (a memorable printed journal) ---------------- */
/* Builds a fully self-contained, print-ready HTML document of the whole
   journal: a cover page, one page per entry (photos embedded as data URLs so
   the file works anywhere), and a closing page. The print CSS is tuned for
   A4 with spine-friendly margins, exact colours and clean page breaks —
   print it double-sided (flip on long edge) for a spiral-bound keepsake. */
function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => resolve(null);
    r.readAsDataURL(blob);
  });
}

async function exportPhotoDataURL(entry) {
  try {
    if (entry.photo) {
      const res = await fetch(entry.photo);
      if (!res.ok) return null;
      return await blobToDataURL(await res.blob());
    }
    if (entry.photoId && typeof idbGet === 'function') {
      const row = await idbGet('photos', entry.photoId);
      if (row && row.blob) return await blobToDataURL(row.blob);
    }
  } catch {}
  return null;
}

/* The keepsake export is a self-contained HTML book with BOTH views inside:
   a carousel (⟷) and a stacked list (≡), switchable from the toolbar. On
   screen it is a beautiful, browsable preview; when printed, the stacked
   pages become the keepsake book (one page per sheet, spine-friendly). */
const PRINT_CSS = `
  @page { size: A4 portrait; margin: 20mm 16mm 22mm 20mm; }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: #f3ead9;
    font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    color: #5d4b3f;
    -webkit-font-smoothing: antialiased;
  }
  /* toolbar — screen only */
  .kt-toolbar {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center; gap: 10px 16px; flex-wrap: wrap;
    padding: 10px 18px;
    background: rgba(255, 253, 247, 0.92);
    -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(200, 176, 150, 0.4);
    font-family: 'Patrick Hand', cursive;
  }
  .kt-brand { display: flex; align-items: center; gap: 8px; font-size: 16pt; color: #c96f75; font-weight: 700; }
  .kt-brand .be { font-size: 13pt; }
  .kt-tabs { display: flex; gap: 4px; margin-left: auto; background: rgba(201, 111, 117, 0.14); border-radius: 999px; padding: 4px; }
  .kt-tab {
    border: 0; background: transparent; font-family: 'Patrick Hand', cursive; font-size: 12.5pt;
    color: #8a7566; padding: 6px 18px; border-radius: 999px; cursor: pointer;
    transition: all 0.25s ease;
  }
  .kt-tab:hover { color: #5d4b3f; }
  .kt-tab.active { background: #fff; color: #c96f75; box-shadow: 0 2px 8px rgba(120, 90, 70, 0.18); }
  .kt-hint { width: 100%; font-size: 10.5pt; color: #8a7566; text-align: center; margin: 0; }
  /* cover */
  .cover {
    text-align: center;
    padding: 72px 20px 54px;
    background:
      radial-gradient(1100px 460px at 50% -90px, rgba(255, 255, 255, 0.9), transparent 62%),
      linear-gradient(180deg, #f9f0e3, #f3ead9);
  }
  .cover-emoji { font-size: 34pt; line-height: 1; }
  .cover h1 {
    font-family: 'Great Vibes', 'Segoe Script', cursive;
    font-size: clamp(34pt, 7vw, 52pt);
    font-weight: 400; color: #c96f75;
    margin: 18px 0 8px; line-height: 1.08;
  }
  .cover-names { font-family: 'Caveat', cursive; font-size: 20pt; color: #5d4b3f; }
  .cover-nick { font-family: 'Caveat', cursive; font-size: 15pt; color: #8a7566; margin-top: 2px; }
  .cover-msg { font-style: italic; font-size: 12.5pt; color: #8a7566; max-width: 560px; margin: 26px auto 0; line-height: 1.7; }
  .cover-due { font-family: 'Patrick Hand', cursive; font-size: 11.5pt; color: #8a7566; margin-top: 22px; }
  .cover-counts { font-family: 'Patrick Hand', cursive; font-size: 10.5pt; color: #a08b78; margin-top: 6px; letter-spacing: 0.02em; }
  .cover-rule { display: flex; align-items: center; gap: 14px; justify-content: center; margin-top: 26px; color: #c96f75; }
  .cover-rule::before, .cover-rule::after { content: ""; height: 1px; width: 130px; background: linear-gradient(90deg, transparent, rgba(200, 176, 150, 0.55)); }
  /* views */
  .view-pane { display: none; }
  .view-pane.active { display: block; }
  /* carousel */
  .carousel-shell { position: relative; padding: 46px 0 36px; }
  .carousel-viewport { overflow: hidden; padding: 8px 0; touch-action: pan-y; }
  .carousel-track {
    display: flex; align-items: stretch; gap: 28px;
    transform: translateX(0);
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }
  .card {
    flex: 0 0 350px; max-width: 86vw;
    background: #fff; border-radius: 20px;
    box-shadow: 0 14px 40px rgba(120, 90, 70, 0.16);
    padding: 26px 28px 30px;
    display: flex; flex-direction: column;
  }
  .car-arrow {
    position: absolute; top: 50%; transform: translateY(-50%); z-index: 5;
    width: 46px; height: 46px; border-radius: 50%;
    border: 1px solid rgba(200, 176, 150, 0.45); background: #fff;
    color: #c96f75; font-size: 22pt; line-height: 1; padding: 0;
    cursor: pointer; box-shadow: 0 6px 16px rgba(120, 90, 70, 0.14);
    transition: all 0.2s ease; font-family: Georgia, serif;
  }
  .car-arrow:hover { background: #c96f75; color: #fff; transform: translateY(-50%) scale(1.06); }
  .car-arrow:disabled { opacity: 0.35; pointer-events: none; }
  .car-arrow.prev { left: 12px; }
  .car-arrow.next { right: 12px; }
  .car-footer { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 26px; }
  .car-count { font-family: 'Patrick Hand', cursive; font-size: 12pt; color: #8a7566; }
  .car-dots { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; max-width: 900px; padding: 0 20px; }
  .car-dot {
    width: 9px; height: 9px; border-radius: 50%; border: 0;
    background: rgba(201, 111, 117, 0.28); cursor: pointer; padding: 0;
    transition: all 0.25s ease;
  }
  .car-dot:hover { background: rgba(201, 111, 117, 0.6); }
  .car-dot.active { background: #c96f75; transform: scale(1.35); }
  /* stacked */
  .stacked-pane { padding: 42px 18px 24px; }
  .trim-divider {
    max-width: 760px; margin: 0 auto 26px;
    display: flex; align-items: center; gap: 12px;
    font-family: 'Great Vibes', cursive; font-size: 22pt; color: #c96f75;
  }
  .trim-divider::after { content: ""; flex: 1; height: 1px; background: rgba(200, 176, 150, 0.5); }
  .trim-divider .tdn { white-space: nowrap; }
  .spage {
    max-width: 760px; margin: 0 auto 42px;
    background: #fff; border-radius: 14px;
    box-shadow: 0 10px 34px rgba(120, 90, 70, 0.12);
    padding: 44px 52px 48px;
  }
  /* shared page internals */
  .meta {
    font-family: 'Patrick Hand', cursive; font-size: 10.5pt; color: #8a7566;
    border-bottom: 1.5px dashed rgba(200, 176, 150, 0.55);
    padding-bottom: 8px; margin-bottom: 20px;
    display: flex; flex-wrap: wrap; gap: 3px 10px;
  }
  .meta .tr { color: #c96f75; }
  .page h2 { font-size: 21pt; font-weight: 600; margin: 0 0 18px; display: flex; align-items: baseline; gap: 8px; line-height: 1.2; }
  .page h2 .ic { font-size: 17pt; }
  .photo { text-align: center; margin: 16px 0 20px; }
  .photo img {
    max-width: 100%; max-height: 70vh; object-fit: contain;
    border: 6px solid #fff; box-shadow: 0 6px 22px rgba(120, 90, 70, 0.3);
    transform: rotate(-1.2deg); border-radius: 2px;
  }
  .caption { font-family: 'Caveat', cursive; font-size: 12.5pt; color: #8a7566; margin-top: 6px; }
  .note {
    font-family: 'Caveat', 'Segoe Script', cursive;
    font-size: 15.5pt; line-height: 1.7; color: #54453b;
    white-space: pre-line; margin: 0;
    background: repeating-linear-gradient(to bottom, transparent 0 27px, rgba(170, 140, 110, 0.12) 27px 27.5px);
    padding: 2px 4px 8px;
  }
  .mentions {
    margin-top: 18px; padding: 10px 14px;
    border-left: 4px solid rgba(201, 111, 117, 0.45);
    font-family: 'Patrick Hand', cursive; font-size: 11pt; color: #8a7566;
  }
  .mentions strong { color: #c96f75; font-weight: 600; }
  .mentions ul { margin: 6px 0 2px; padding-left: 18px; }
  .mentions li { margin: 3px 0; }
  .week-guide {
    margin-top: 18px; border: 1px solid rgba(200, 176, 150, 0.5); border-radius: 12px;
    background: #fdf9f1; overflow: hidden;
  }
  .week-guide summary {
    cursor: pointer; padding: 11px 16px;
    font-family: 'Patrick Hand', cursive; font-size: 11.5pt; color: #c96f75;
    list-style: none; -webkit-user-select: none; user-select: none;
  }
  .week-guide summary::-webkit-details-marker { display: none; }
  .week-guide summary::before { content: "✦  "; }
  .week-guide[open] summary { border-bottom: 1px dashed rgba(200, 176, 150, 0.55); }
  .guide-week { padding: 14px 18px; font-family: 'Cormorant Garamond', serif; color: #5d4b3f; }
  .gw-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
  .gw-week { font-weight: 700; color: #c96f75; }
  .gw-size { font-style: italic; color: #8a7566; }
  .gw-trim { font-family: 'Patrick Hand', cursive; font-size: 10.5pt; color: #8a7566; margin-bottom: 8px; }
  .gw-block { margin: 10px 0; }
  .gw-title { font-weight: 700; font-size: 12pt; margin-bottom: 3px; }
  .gw-list { margin: 4px 0 0; padding-left: 18px; }
  .gw-list li { margin: 2.5px 0; line-height: 1.5; }
  .gw-text { margin: 4px 0 0; line-height: 1.55; }
  .gw-analogy { background: rgba(201, 111, 117, 0.07); border-radius: 10px; padding: 10px 14px; }
  .closing {
    text-align: center; padding: 60px 20px 90px;
    font-family: 'Caveat', cursive; font-size: 19pt; color: #b3a28c;
  }
  /* small screens */
  @media (max-width: 680px) {
    .kt-brand { font-size: 12.5pt; }
    .kt-hint { display: none; }
    .card { flex-basis: 86vw; }
    .spage { padding: 28px 20px 32px; }
    .car-arrow { width: 38px; height: 38px; font-size: 18pt; }
  }
  /* print — the stacked pages become the keepsake book */
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { background: #fff; }
    .kt-toolbar { display: none !important; }
    #view-carousel { display: none !important; }
    .view-pane { display: block !important; }
    .stacked-pane { padding: 0; }
    .spage {
      max-width: none; margin: 0; padding: 0 2mm 10mm;
      box-shadow: none; border-radius: 0;
      page-break-after: always;
    }
    .spage.last { page-break-after: auto; }
    .trim-divider { max-width: none; margin: 0 0 8mm; page-break-before: always; page-break-after: avoid; }
    .trim-divider.first { page-break-before: auto; }
    .cover { page-break-after: always; padding: 46mm 8mm 20mm; background: none; }
    .photo img { max-height: 110mm; }
    .closing { padding-top: 70mm; page-break-before: always; }
  }
`;

async function buildPrintHTML() {
  const esc = escapeHtml;
  const due = effectiveDueDate();
  const templates = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const info = TYPE_INFO[entry.type] || TYPE_INFO.note;
    const w = weeksAt(entry.date) || (entry.week ? { week: entry.week, trimester: entry.trimester } : null);
    const trim = (w && w.trimester) ? w.trimester : (entry.trimester || 0);
    const img = (entry.photo || entry.photoId) ? await exportPhotoDataURL(entry) : null;
    const metaBits = [];
    if (entry.date) metaBits.push(esc(fmtDate(entry.date)));
    if (entry.type === 'milestone' && !entry.date) {
      const range = w ? weekRange(w.week) : null;
      if (range) metaBits.push(esc(fmtRange(range)));
    }
    if (w) metaBits.push(`Week ${w.week}`);
    if (w && w.trimester) metaBits.push(`<span class="tr">${esc(trimesterName(w.trimester))}</span>`);
    metaBits.push(`${info.icon} ${info.label}`);
    const mentions = entry.mentions && entry.mentions.length
      ? `<div class="mentions"><strong>mentions in this milestone</strong><ul>${entry.mentions.map((m) => `<li>${esc(m.label)}${m.note ? ` — ${esc(m.note)}` : ''}</li>`).join('')}</ul></div>`
      : '';
    const gweek = entryGuideWeek(entry);
    const gsize = gweek ? (guideForWeek(gweek) || {}).size : '';
    const guide = gweek
      ? `<details class="week-guide"><summary>Peek inside week ${gweek} ✦ little one is the size of ${esc(gsize || '…')}</summary>${guideWeekHTML(gweek)}</details>`
      : '';
    templates.push(`<template data-trim="${trim}"><article class="page">
  <div class="meta">${metaBits.join(' · ')}</div>
  ${entry.title ? `<h2><span class="ic">${esc(entry.icon || info.icon)}</span>${esc(entry.title)}</h2>` : ''}
  ${img ? `<div class="photo"><img src="${img}" alt="${esc(entry.title || entry.photoCaption || 'A memory')}" />${entry.photoCaption ? `<div class="caption">${esc(entry.photoCaption)}</div>` : ''}</div>` : ''}
  ${entry.note ? `<div class="note">${esc(entry.note)}</div>` : ''}
  ${mentions}
  ${guide}
</article></template>`);
  }

  const title = `${settings.journalTitle} — a keepsake`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Caveat:wght@500;700&family=Great+Vibes&family=Patrick+Hand&display=swap" rel="stylesheet" />
<style>${PRINT_CSS}</style>
</head>
<body>
<div class="kt-toolbar">
  <div class="kt-brand"><span class="be">${esc(settings.coverEmoji || '🌼')}</span>${esc(settings.journalTitle)}</div>
  <div class="kt-tabs">
    <button type="button" class="kt-tab active" data-view="carousel">⟷ Carousel</button>
    <button type="button" class="kt-tab" data-view="stacked">≡ Stacked</button>
  </div>
  <p class="kt-hint">Browse both views in this file · when you print, the stacked pages become your keepsake book ✨</p>
</div>

<header class="cover">
  <div class="cover-emoji">${esc(settings.coverEmoji || '🌼')}</div>
  <h1>${esc(settings.journalTitle)}</h1>
  <div class="cover-names">${esc(settings.mamaName)} &amp; ${esc(settings.papaName)}</div>
  <div class="cover-nick">for our ${esc(settings.babyNickname)}</div>
  ${settings.coverMessage ? `<p class="cover-msg">${esc(settings.coverMessage)}</p>` : ''}
  <div class="cover-rule"></div>
  ${due ? `<div class="cover-due">our little one is due ${esc(fmtDate(due))}</div>` : ''}
  <div class="cover-counts">${entries.length} pages · every week of our journey</div>
</header>

<main>
  <section id="view-carousel" class="view-pane carousel-pane active">
    <div class="carousel-shell">
      <button type="button" class="car-arrow prev" aria-label="Previous page">‹</button>
      <div class="carousel-viewport" id="carousel-viewport">
        <div class="carousel-track" id="carousel-track"></div>
      </div>
      <button type="button" class="car-arrow next" aria-label="Next page">›</button>
      <div class="car-footer">
        <span class="car-count" id="car-count">1 / ${entries.length}</span>
        <div class="car-dots" id="car-dots"></div>
      </div>
    </div>
  </section>

  <section id="view-stacked" class="view-pane stacked-pane">
    <div id="stacked-pages"></div>
  </section>
</main>

<footer class="closing">— every page is ours —</footer>

${templates.join('\n')}

<script>
(function () {
  var track = document.getElementById('carousel-track');
  var stack = document.getElementById('stacked-pages');
  var tpls = Array.prototype.slice.call(document.querySelectorAll('template'));
  var n = tpls.length;
  var firstDivider = true;
  var lastTrim = 0;
  for (var i = 0; i < n; i++) {
    var base = tpls[i].content.firstElementChild;
    if (!base) continue;
    var card = base.cloneNode(true);
    card.classList.add('card');
    track.appendChild(card);
    var sp = base.cloneNode(true);
    sp.classList.add('spage');
    if (i === n - 1) sp.classList.add('last');
    var trims = parseInt(tpls[i].getAttribute('data-trim') || '0', 10);
    if (trims && trims !== lastTrim) {
      var lab = trims === 1 ? '1st Trimester' : trims === 2 ? '2nd Trimester' : '3rd Trimester';
      var dv = document.createElement('div');
      dv.className = 'trim-divider' + (firstDivider ? ' first' : '');
      dv.innerHTML = '<span class="tdn">' + lab + '</span>';
      stack.appendChild(dv);
      firstDivider = false;
    }
    if (trims) lastTrim = trims;
    var dets = sp.querySelectorAll('details.week-guide');
    for (var j = 0; j < dets.length; j++) { dets[j].open = true; }
    stack.appendChild(sp);
  }

  var dotsWrap = document.getElementById('car-dots');
  var count = document.getElementById('car-count');
  var dots = [];
  for (var d = 0; d < n; d++) {
    (function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'car-dot';
      b.setAttribute('aria-label', 'Go to page ' + (k + 1));
      b.addEventListener('click', function () { go(k); });
      dotsWrap.appendChild(b);
      dots.push(b);
    })(d);
  }

  var idx = 0;
  var gap = 28;
  function cardWidth() {
    var el = track.children[idx];
    return el ? el.offsetWidth : 350;
  }
  function go(k) {
    if (n === 0) {
      if (count) count.textContent = 'no pages yet';
      return;
    }
    if (k < 0) k = 0;
    if (k > n - 1) k = n - 1;
    idx = k;
    var vp = document.getElementById('carousel-viewport');
    var cw = cardWidth();
    var off = (vp.clientWidth - cw) / 2 - idx * (cw + gap);
    track.style.transform = 'translateX(' + off + 'px)';
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('active', i === idx);
    }
    var p = document.querySelector('.car-arrow.prev');
    var nx = document.querySelector('.car-arrow.next');
    if (p) p.disabled = (idx === 0);
    if (nx) nx.disabled = (idx === n - 1);
    if (count) count.textContent = (idx + 1) + ' / ' + n;
  }

  function bind(sel, fn) {
    var el = document.querySelector(sel);
    if (el) el.addEventListener('click', function () { fn(); });
  }
  bind('.car-arrow.prev', function () { go(idx - 1); });
  bind('.car-arrow.next', function () { go(idx + 1); });

  document.addEventListener('keydown', function (e) {
    var pane = document.getElementById('view-carousel');
    if (!pane || !pane.classList.contains('active')) return;
    if (e.key === 'ArrowRight') go(idx + 1);
    if (e.key === 'ArrowLeft') go(idx - 1);
  });

  var vp = document.getElementById('carousel-viewport');
  var sx = null;
  vp.addEventListener('pointerdown', function (e) { sx = e.clientX; });
  vp.addEventListener('pointerup', function (e) {
    if (sx === null) return;
    var dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 40) { if (dx < 0) go(idx + 1); else go(idx - 1); }
  });

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.kt-tab'));
  var panes = Array.prototype.slice.call(document.querySelectorAll('.view-pane'));
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      var v = t.getAttribute('data-view');
      tabs.forEach(function (x) { x.classList.toggle('active', x === t); });
      panes.forEach(function (p2) { p2.classList.toggle('active', p2.id === 'view-' + v); });
      if (v === 'carousel') { go(idx); }
      window.scrollTo(0, 0);
    });
  });

  window.addEventListener('resize', function () { go(idx); });
  go(0);
})();
</script>
</body>
</html>`;
}

/* hidden-iframe printing doesn't work on iOS Safari (it prints the parent page
   or nothing, silently). On Apple phones/tablets we open the built document in
   a new tab instead, where the browser's own Share → Print works reliably. */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

async function printJournal() {
  const html = await buildPrintHTML();
  if (isIOS()) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 300000);
    if (!win) toast('Use “Save as HTML” below, then open it and print.');
    else toast('The journal opened in a new tab — print it from there 🖨');
    return;
  }
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  let done = false;
  const doPrint = () => {
    if (done) return;
    done = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      toast('Print from the exported HTML file instead.');
    }
    setTimeout(() => iframe.remove(), 120000);
  };
  iframe.onload = () => setTimeout(doPrint, 250);
  doc.open();
  doc.write(html);
  doc.close();
  if (doc.readyState === 'complete') setTimeout(doPrint, 250);
  setTimeout(doPrint, 1500); // safety net in case the load event raced past us
}

async function exportJournalHTML() {
  const html = await buildPrintHTML();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'our-journey-to-you.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Print-ready HTML saved 📄');
}

/* ---------------- wiring ---------------- */
function wire() {
  $('#btn-new').addEventListener('click', () => openEditor(null));
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-reorder').addEventListener('click', () => setReorderMode(!reorderMode));
  wireReorderDrag();
  $('#editor-close').addEventListener('click', closeEditor);
  $('#editor-cancel').addEventListener('click', closeEditor);
  $('#editor-save').addEventListener('click', saveEditor);
  $('#settings-close').addEventListener('click', () => ($('#settings-overlay').hidden = true));
  $('#settings-cancel').addEventListener('click', () => ($('#settings-overlay').hidden = true));
  $('#settings-save').addEventListener('click', saveSettings);
  $('#settings-print').addEventListener('click', () => {
    printJournal().catch((err) => toast(err.message));
  });
  $('#settings-export-html').addEventListener('click', () => {
    exportJournalHTML().catch((err) => toast(err.message));
  });

  $('#mentions-add').addEventListener('click', addMentionRow);
  $('#mentions-list').addEventListener('input', (e) => {
    if (!e.target.classList.contains('mt-label') && !e.target.classList.contains('mt-note')) return;
    activeMentions[Number(e.target.dataset.i)][e.target.classList.contains('mt-label') ? 'label' : 'note'] = e.target.value;
  });
  $('#mentions-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.mt-del');
    if (!btn) return;
    const i = Number(btn.dataset.i);
    activeMentions.splice(i, 1);
    renderMentions();
  });

  const dz = $('#dropzone');
  dz.addEventListener('click', () => $('#f-photo').click());
  $('#f-photo').addEventListener('change', editorPhotoInput);
  $('#dz-remove').addEventListener('click', (e) => {
    e.stopPropagation();
    clearPhoto();
  });
  ['dragenter', 'dragover'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
    })
  );
  dz.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) return toast('That file is not a picture.');
      if (file.size > 20 * 1024 * 1024) return toast('That photo is too big (max 20 MB).');
      showPhotoPreview(file);
    }
  });

  $('#pages').addEventListener('click', (e) => {
    const arrow = e.target.closest('.car-arrow');
    if (arrow) {
      carouselStep(arrow.classList.contains('prev') ? -1 : 1);
      return;
    }
    const dot = e.target.closest('.car-dot');
    if (dot) {
      carouselIndex = Number(dot.dataset.i);
      positionCarousel();
      return;
    }
    const ctLabel = e.target.closest('.ct-label');
    if (ctLabel) {
      const trim = Number(ctLabel.dataset.trim);
      const idx = entries.findIndex((x) => (trimesterOf(x) || 0) === trim);
      if (idx >= 0) { carouselIndex = idx; positionCarousel(); }
      return;
    }
    const peek = e.target.closest('.guide-peek');
    if (peek) {
      openGuidePeek(Number(peek.dataset.week));
      return;
    }
    const artBtn = e.target.closest('.art-mini');
    if (artBtn) {
      const entry = entries.find((x) => x.id === artBtn.dataset.id);
      if (entry) openArtPrompt(entry);
      return;
    }
    const btn = e.target.closest('button.edit') || e.target.closest('button.del');
    if (!btn) return;
    const pageEl = btn.closest('.page');
    const id = pageEl.dataset.id;
    if (btn.classList.contains('edit')) {
      const entry = entries.find((x) => x.id === id);
      if (entry) openEditor(entry);
    } else {
      deleteEntry(id);
    }
  });

  $('#guide-close').addEventListener('click', closeGuidePeek);
  $('#guide-prev').addEventListener('click', () => {
    if (guideForWeek(guideOpenWeek - 1)) { guideOpenWeek -= 1; renderGuidePeek(); }
  });
  $('#guide-next').addEventListener('click', () => {
    if (guideForWeek(guideOpenWeek + 1)) { guideOpenWeek += 1; renderGuidePeek(); }
  });
  $('#guide-overlay').addEventListener('click', (e) => {
    if (e.target === $('#guide-overlay')) closeGuidePeek();
  });

  $('#art-close').addEventListener('click', closeArtPrompt);
  $('#art-cancel').addEventListener('click', closeArtPrompt);
  $('#art-copy').addEventListener('click', copyArtPrompt);
  $('#art-overlay').addEventListener('click', (e) => {
    if (e.target === $('#art-overlay')) closeArtPrompt();
  });

  const coverDates = $('#cover-dates');
  if (coverDates) coverDates.addEventListener('click', openSettings);
  $('#s-lmp').addEventListener('change', () => {
    const lmp = $('#s-lmp').value;
    if (lmp) $('#s-due').value = addDays(lmp, 280);
  });

  $('#btn-guide').addEventListener('click', openJourneyGuide);
  $('#journey-close').addEventListener('click', closeJourneyGuide);
  $('#journey-overlay').addEventListener('click', (e) => {
    if (e.target === $('#journey-overlay')) closeJourneyGuide();
  });
  $('#journey-trims').addEventListener('click', (e) => {
    const btn = e.target.closest('.journey-trim');
    if (!btn) return;
    journeyTrim = Number(btn.dataset.trim);
    journeyWeek = null;
    renderJourneyGuide();
  });
  $('#journey-weeks').addEventListener('click', (e) => {
    const chip = e.target.closest('.journey-week');
    if (!chip) return;
    journeyWeek = Number(chip.dataset.week);
    renderJourneyGuide();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('#editor-overlay').hidden = true;
      $('#settings-overlay').hidden = true;
      $('#guide-overlay').hidden = true;
      $('#journey-overlay').hidden = true;
      $('#art-overlay').hidden = true;
      const layout = $('#stacked-layout');
      if (layout) layout.classList.remove('rail-open');
    }
  });

  $$('.view-btn').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

  // keyboard navigation for the carousel (left/right arrows)
  document.addEventListener('keydown', (e) => {
    if (viewMode !== 'carousel') return;
    if (!$('#editor-overlay').hidden || !$('#settings-overlay').hidden || !$('#guide-overlay').hidden || !$('#journey-overlay').hidden || !$('#art-overlay').hidden) return;
    if (e.target && typeof e.target.matches === 'function' && (e.target.matches('input, textarea, select') || e.target.isContentEditable)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); carouselStep(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); carouselStep(-1); }
  });

  let resizeRaf = null;
  const relayoutCarousel = () => {
    if (viewMode !== 'carousel') return;
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      sizeCarouselCards();
      positionCarousel();
    });
  };
  window.addEventListener('resize', relayoutCarousel);
  window.addEventListener('load', relayoutCarousel);
}

/* ---------------- init ---------------- */
(async function init() {
  wire();
  $$('.view-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === viewMode));
  try {
    await loadAll();
  } catch (err) {
    toast('Could not reach your journal. Is the server running?');
  }
  applyTheme();
  renderAll();
})();
