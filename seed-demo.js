/* Seed a full sample journey into a running journal server.
   Wipes existing pages, sets sample settings, adds every milestone with a
   real date, and populates memories + notes with placeholder photos.
   Usage: node seed-demo.js  (server must be running) */
const { placeholder, PALETTES } = require('./placeholder');

const BASE = process.env.BASE || 'http://localhost:4173';

/* --- date helpers: build days/due-date so the journal looks coherently paced --- */
function iso(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function addDays(isoStr, n) {
  const d = new Date(isoStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
}
const TODAY = iso(new Date());
const DUE = '2026-12-01';
/* date ≈ n weeks before the due date */
function weekDate(week) {
  return addDays(DUE, -((40 - week) * 7));
}

async function api(path, options) {
  const res = await fetch(BASE + path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((options && options.method) + ' ' + path + ' -> ' + (body.error || res.status));
  return body;
}

async function makePhoto(palette, dims) {
  const buf = placeholder({ top: PALETTES[palette].top, bottom: PALETTES[palette].bottom, width: dims.width, height: dims.height });
  return new Blob([buf], { type: 'image/png' });
}

async function postEntry(fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (typeof Blob !== 'undefined' && v instanceof Blob) {
      fd.append(k, v, k + '.png');
    } else {
      fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
    }
  }
  return api('/api/entries', { method: 'POST', body: fd, status: 201 });
}

async function main() {
  // 1. wipe existing pages so the journal starts clean for the demo
  const existing = await api('/api/entries');
  for (const e of existing) await api('/api/entries/' + e.id, { method: 'DELETE' });

  // 2. settings
  await api('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      journalTitle: 'Our Journey To You',
      mamaName: 'Mummy',
      papaName: 'Daddy',
      babyNickname: 'little bean',
      dueDate: DUE,
      coverMessage: 'Every little moment of waiting for you, tucked away gently — this is our story, our real one.',
      coverEmoji: '🌼'
    })
  });

  // 3. pages, in journey order. photos=palette to attach a placeholder.
  const pages = [
    { type: 'note', date: TODAY, title: 'Welcome to our story',
      note: 'This is the first page of our little journal. Here lives every milestone, every memory and every feeling of this journey — the photos we love, the moments we never want to forget, and the letters we are writing to you.\n\nThis is also our honest proof-of-life run: every feature is switched on, every page meant to be here.\n\nIf you ever lose a page or wish to begin a certain one again, it can always be re-added.',
      icon: '💛' },

    { type: 'milestone', week: 4, title: 'The little line',
      note: 'Two lines. The start of you. We kept the test that night, hardly believing it — told no one just yet, only the two of us smiling at it in the dark.',
      icon: '🍀', photo: 'mint', caption: 'the test we kept' },

    { type: 'milestone', week: 5, title: 'Your first blood test',
      note: 'Our first beta-hCG, and a second draw a couple of days later, watching your numbers double the way they should. Our first proof you were really here.',
      icon: '🩸',
      mentions: [
        { label: 'Beta-hCG blood test #1', note: '242 mIU/mL' },
        { label: 'Beta-hCG blood test #2 (48 hr repeat)', note: '520 mIU/mL ✔ doubling' }
      ] },

    { type: 'milestone', week: 5, title: 'We saw the sac',
      note: 'On the first scan a tiny gestational sac in the right place. "Exactly where it should be" — such relief, such quiet magic.',
      icon: '🥚', photo: 'sky', pix: [420, 340] },

    { type: 'milestone', week: 6, title: 'We heard your heartbeat',
      note: 'A small, quick flicker on the screen, and then they let us listen. The most beautiful little rhythm, all your own.',
      icon: '💓', photo: 'blush' },

    { type: 'milestone', week: 8, title: 'Our booking appointment',
      note: 'The first big meeting with our midwife — how far along we are, the check-ups, the what-if list, the little formalities that made you feel officially, wonderfully expected.',
      icon: '📋',
      mentions: [
        { label: 'Booking bloods — group, FBC, anaemia & infection screen', note: 'All clear' },
        { label: 'Urine dipstick & blood pressure', note: 'Normal' }
      ] },

    { type: 'memory', week: 9, title: 'We told our families',
      note: 'The secret finally out. Tears, hugs, and a little too much excitement — and from then on you belonged to everyone.',
      icon: '🌻', photo: 'peach' },

    { type: 'milestone', week: 12, title: 'Our dating scan',
      note: 'Suddenly you looked like a tiny person, arms and legs waving. This gave us our real due date and the first proper look at who you might be.',
      icon: '🫧', photo: 'lilac', pix: 'tall',
      mentions: [
        { label: 'Combined screening blood test (10–14 wks)' },
        { label: 'Nuchal translucency measurement', note: '1.4 mm' }
      ] },

    { type: 'memory', week: 15, title: 'The bump, so far',
      note: 'A little bump at last — and I spent far too long standing in front of the mirror, hand resting on you, grinning at nobody.',
      icon: '👶', photo: 'cream', photoSize: 'small', arrow: true, caption: 'you, so far 💛' },

    { type: 'milestone', week: 19, title: 'We felt you move',
      note: 'The first flutter, so faint I almost missed it. It became the way we say goodnight — a little kick from you, a hand from us.',
      icon: '🦋' },

    { type: 'milestone', week: 20, title: 'The 20-week scan',
      note: 'Ten tiny fingers, ten toes, a perfect little heart. And somewhere in those measurements, everything is exactly as it should be.',
      icon: '🏵️', photo: 'rose', pix: 'tall',
      mentions: [{ label: 'Quad screening blood test (if not done at 12 wks)', note: 'Skipped — did combined at 12 wks' }] },

    { type: 'memory', week: 22, title: 'Name brainstorming',
      note: 'Three notebooks, two arguments over one lovely name, and at least forty that made us laugh. The shortlist is now embarrassingly long and we love it.',
      icon: '✨' },

    { type: 'note', week: 25, title: 'A nephew letter to you',
      note: 'Little one, we have not met you yet and we already know you will be so bossed. Here is the whole truth of how we went from two to three — one page at a time, just for you.',
      icon: '💌' },

    { type: 'milestone', week: 26, title: 'The sugar-check appointment',
      note: 'A too-sweet drink, an hour of waiting, then two little vials that told the midwife everything she needed to know. All clear.',
      icon: '🧪',
      mentions: [{ label: 'Oral glucose tolerance test (GTT)', note: 'Within range' }] },

    { type: 'memory', week: 28, title: 'Our first shopping trip',
      note: 'We spent an entire afternoon in the baby shop and walked out with nothing but hope and one tiny, perfect sleepsuit. The trolley was not ready for us.',
      icon: '🧸', photo: 'sage', photoSize: 'small', arrow: false, caption: 'for our little bean' },

    { type: 'milestone', week: 32, title: 'A growth check',
      note: 'Measuring, measuring — how long, how heavy, how proportioned. You are on track and we are so proud of you.',
      icon: '📏',
      mentions: [
        { label: 'Repeat full blood count (anaemia check)', note: 'Fine' },
        { label: 'Anti-D (if Rhesus negative)', note: 'Not needed' }
      ] }
  ];

  const created = [];
  for (const p of pages) {
    const fields = {
      type: p.type,
      date: p.week ? weekDate(p.week) : p.date,
      title: p.title || '',
      note: p.note,
      week: p.week || '',
      icon: p.icon,
      arrow: p.arrow ? '1' : '0',
      mentions: p.mentions || [],
      photoSize: p.photoSize ? 'small' : 'large',
      photoCaption: p.caption || ''
    };
    if (p.photo) {
      fields.photo = await makePhoto(p.photo, p.pix === 'tall' ? { width: 460, height: 620 }
        : p.pix ? { width: p.pix[0], height: p.pix[1] }
        : { width: 560, height: 420 });
    }
    const entry = await postEntry(fields);
    created.push(entry);
  }

  console.log(`Seeded ${created.length} pages:`);
  created.forEach((e) => console.log('  -', e.title, '|', e.type, e.photo ? '| photo: ' + e.photo : ''));
}

main().then(() => console.log('\nDone — open http://localhost:4173 to see the journal.')).catch((e) => { console.error('FAIL:', e.message); process.exit(1); });