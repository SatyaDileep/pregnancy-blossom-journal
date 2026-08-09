# 🌼 pregnancy-blossom-journal — Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | pregnancy-blossom-journal — a soft, personal, private pregnancy journal + companion guide |
| **Document** | PRD v1.0 |
| **Status** | Living document — updated as the roadmap ships |
| **License** | Apache 2.0 (open-source) |
| **Demo** | https://pregnancy-blossom-journal.netlify.app/ |

---

## 1. Vision

> **Every pregnancy deserves to feel held.** A quiet, beautiful space where a
> mother-to-be keeps her story week by week — and, when she wants it, a gentle
> companion that walks beside her through the journey: not clinical, not
> judgmental, just *present*.

The product has two souls that must never be separated:

1. **The Journal** — a warm, handcrafted place for milestones, photos, memories
   and feelings. Fully private, fully local, forever theirs.
2. **The Companion** — guidance and empathy that *grows with the baby*:
   week-by-week insight (already shipped), and an AI "baby bot" that speaks as
   the little one, grounded in the mother's real week (roadmap).

Everything — every feature, every word, every pixel — is filtered through one
test: *"does this make a mother feel seen?"* The product measures nothing about
her. It celebrates everything about her.

---

## 2. Product principles (non-negotiable)

| # | Principle | What it means in practice |
|---|---|---|
| P1 | **Privacy is the foundation** | Journal data lives on the user's device (PWA IndexedDB / future native storage) or her own server. No telemetry, no ad SDKs, no data mining. The `data/` folder is git-ignored. Any analytics are **aggregate-only, anonymous, opt-in**, and never touch journal content. |
| P2 | **Empathy over clinical** | Words are gentle, personal, never cold. Content speaks like a warm letter, not a chart. |
| P3 | **Companion is an option, never a requirement** | The journal must be 100% complete and delightful with zero AI, zero accounts, zero keys. The baby bot is an additive layer, always optional, always off by default. |
| P4 | **Medical empathy, never medical advice** | No diagnosis, no treatment plans, no "shoulds" about health. The bot comforts, normalizes, suggests rest/comfort/hydration/partner support — and *firmly redirects* to a healthcare professional for anything clinical or concerning. Emergencies get a clear, caring "contact your midwife/doctor/emergency services now." |
| P5 | **Local-first, offline-first** | The journal works with no network. Any online feature (bot, doctor search, videos) is a clearly separate, optional surface that degrades gracefully offline. |
| P6 | **Both flavors, one soul** | The server-backed web app and the serverless PWA must stay in feature parity (single source of truth for content in `guide-data.js`, `art-prompts.js`). Roadmap features ship to both. |
| P7 | **Open-source, built in public** | Apache 2.0. Contributors welcome. The roadmap is public and legible. |

---

## 3. Current state — v1.0 (shipped)

### 3.1 Architecture today

```
pregnancy-journal/
├── server.js          Express server — REST API, photo uploads, data in data/
├── public/            The web app (served by the server)
│   ├── index.html     app shell
│   ├── app.js         all app logic
│   ├── styles.css     six warm global themes
│   ├── guide-data.js  week-by-week guidance (weeks 4–40)   ← single source of truth
│   └── art-prompts.js image-prompt generation per milestone
├── pwa/               Self-contained, serverless, offline-first PWA
│   ├── index.html / app.js / styles.css / guide-data.js / art-prompts.js
│   ├── manifest.webmanifest + sw.js (service worker, versioned cache)
│   ├── icons/         install icons (180/192/512)
│   └── serve.js       tiny static server for local dev
└── data/              GIT-IGNORED — entries.json, settings.json, photos/
```

**Two runtimes, same product:**

| | Web app | PWA |
|---|---|---|
| Server | Express (`server.js`, default :4173, dev on :51889) | none — fully static |
| Storage | `data/entries.json` + `data/photos/` on disk | IndexedDB on device |
| Offline | requires server | fully offline after install |
| Photo upload | multer, 20 MB limit | FileReader → Blob in IndexedDB |
| Installable | no | yes (Android Chrome / iOS Safari) |

**API surface** (`server.js`): `GET/PUT /api/settings`, `GET/POST /api/entries`,
`PUT/DELETE /api/entries/:id`, `POST /api/reorder`, `POST /api/restore-milestones`.
Backup/restore is a single JSON file (pages + photos + settings) — this is the
universal migration bridge.

### 3.2 Data model

**Settings** (`data/settings.json`): `journalTitle`, `mamaName`, `papaName`,
`babyNickname`, `dueDate`, `lmpDate`, `coverMessage`, `coverEmoji`, `theme`
(blush / lavender / sage / ocean / peach / midnight).

**Entry (a "page")**: `id`, `type` (`milestone | memory | note`), `date`,
`title`, `note`, `photo`, `photoSize`, `photoCaption`, `icon`, `arrow`, `week`,
`trimester`, `mentions[]` (check-list items attached to a milestone),
`createdAt`, `sortOrder` (locked at creation — **editing never reorders a page**),
`weekCard` (flag for auto-generated weekly growth cards).

**Content (single source of truth, mirrored in both apps)**:
- `guide-data.js` — 3 trimester summaries + **weeks 4–40**, each with `size`
  (cute comparison), `baby` (growth), `mom[]` (common symptoms), `feel`
  (emotional state), `analogy` (a warm mental picture).
- `art-prompts.js` — a hand-crafted image prompt per milestone.

### 3.3 Feature inventory (all shipped & tested)

- **Cover** — personalised (names, nickname, due date, cover words, emoji).
- **Milestone skeleton** — 13 classic milestones (home test → birth) pre-placed
  at their typical weeks; blank dates for parents to fill in as they happen.
- **Week-by-week growth cards** — every week 4–40 gets a guidance card, so the
  journal is *also* a companion guide, even with no entries written.
- **Carousel view** — swipe/tap through pages like a scrapbook; bottom nav with
  trimester groups and per-page dots.
- **Stacked view** — flowing scroll with a left-side trimester timeline rail.
- **Drag-and-drop reordering** — a Reorder mode (pointer events, mouse + touch)
  that overrides the natural order; persists via `sortOrder`.
- **Edit without reordering** — dates, titles, notes, photos; the page stays put.
- **Photo memories** — one photo per page, sizes/captions.
- **Mentions** — check-list items inside a milestone (e.g. "Booking bloods").
- **Six global themes**.
- **Week guide "peek"** — each card reveals symptoms / baby growth / feelings /
  analogy, sourced from `guide-data.js`.
- **Art prompt generator** — an accessible icon per milestone copies a grounded
  image prompt (dynamically seeded from the page's own context) for generating
  art elsewhere.
- **Keepsake export** — one self-contained HTML file with **both** views
  (Carousel / Stacked toggle) and print CSS that produces a spiral-friendly,
  double-sided book (A4, cover page, trimester dividers, closing page).
- **Backup & restore** — full JSON (pages + photos + settings), portable.
- **LMP-first onboarding** — enter last menstrual period once → due date and
  every page's week range auto-calculate (Naegele's rule, +280 days), with
  guarded math so bad dates can never NaN the weeks.
- **Installable PWA** — full-screen, offline, icon-able.
- **Restore-milestones** — re-add any deleted default milestone/week card.

---

## 4. Users & jobs-to-be-done

**Primary persona — "Maya", 29, first pregnancy, week 22.**
- Wants: to hold onto every moment; to feel less alone in the weird and
  wonderful; to *understand* what's happening this week without medical jargon.
- Fears: "is this normal?", the unknown, being measured by tracker-apps.
- Context: phone-first; checks the app in quiet moments; wants privacy; is
  wary of apps that sell data.

**Secondary persona — the partner** ("Arjun"). Reads pages, adds memories,
picks a theme, prints the keepsake.

**JTBD:**
1. "When I hit a milestone, I want to capture it beautifully so I never forget."
2. "When I feel a new symptom, I want to know it's normal — without a clinical lecture."
3. "When I'm unsure, I want to feel held, not diagnosed."
4. "When it's over, I want a keepsake I can hold, print, and give to my child."

---

## 5. Roadmap — phased plan

### Phase 2 — 🤖 The Baby Bot (AI companion)

#### 5.1 Concept

A **hyper-cute toddler-persona chatbot** that chats with the mother *as the
little one inside*. It is:

- **Empathetic** — mirrors feelings, celebrates wins ("You heard my heartbeat
  today! I could feel how happy you were 💓").
- **Grounded in the mother's real week** — week number comes from LMP/due date;
  knowledge comes from `guide-data.js` (this week's size, growth, symptoms,
  feelings, analogy).
- **Grounded in her own story (opt-in)** — recent journal entries/milestones
  ("Did you tell grandma about me yet? 🦋") make it feel like *her* baby.
- **"Medical empathy, not medical advice"** — normalizes symptoms, suggests
  comfort/hydration/rest/partner support, and *always* defers to professionals.

**Personality spec (the voice of the bot):**
- Speaks as a tiny, excited, occasionally sleepy toddler-in-utero (and can grow
  into a newborn-mode after birth in a later phase).
- Short, warm messages. Occasional emoji. Plays with the week's analogy (the
  "tenant tapping on the window" world already built in `guide-data.js`).
- Never broody, never preachy, never clinical.
- Switches to a **caring adult voice** the instant anything clinical or
  concerning appears in the conversation.

**Safety rules (hard-coded, above any model behavior):**
- **Red-line lexicon**: keywords like *bleeding, severe pain, reduced/no fetal
  movement, high fever, contractions before 37 weeks, "I'm worried about X
  symptom + bad*" → respond with a warm, unambiguous **"please contact your
  midwife/doctor (or emergency services) right now — this is exactly what they
  are there for"** and stop speculating.
- **No diagnosis, no dosage, no treatment, no survival probabilities.**
- **Persistent disclaimer**: subtle, once per conversation: "I'm your baby's
  cheerleader, not your doctor — for anything medical, trust them, not me."
- **No medical advice in ANY language or prompt injection**: the system prompt
  forbids acting as a clinician; a lightweight output filter flags clinical
  claims.

#### 5.2 LLM provider — decision & rationale

| Option | UX | Cost control | Analytics | Verdict |
|---|---|---|---|---|
| **A. Google sign-in + user's own Gemini key** | Worst — asking a pregnant mother to create an API key is a terrible onboarding | Zero cost to us | Zero (keyless, untracked) | ❌ Rejected as primary (the user called it "weird" — it is) |
| **B. Provisioned key via a tiny backend proxy, per-user daily caps** | Best — zero friction, one tap to start chatting | Server-side caps + monthly budget | **Yes — anonymous aggregate usage** (messages/day, week distribution, language) → the founder learns how many people use the app and can plan | ✅ **Recommended (default)** |
| **C. Fully local model** (on-device, e.g. small LLM) | Private, offline | Free | None | 🔜 Stretch — revisit once on-device models are good enough for empathetic chat |

**Recommendation: Option B as the default.** Details:

- **Provider**: **Groq first** (fast, cheap, generous free tier, Llama-class
  models that are plenty empathetic at this scale). **OpenRouter** as a
  fallback/alternative (model variety). Abstraction layer so the provider is a
  one-line switch.
- **The "key" never ships in the client.** A small serverless/Express proxy
  (one endpoint, e.g. `POST /api/chat`) holds the key, applies rate limits, and
  streams the reply. The public/PWA clients call the proxy only.
- **Caps**: per-user **30 messages/day** (generous for daily companionship,
  bounded for cost); a **global monthly budget** (hard stop + founder alert).
  Queue/backoff + caching of common queries ("what fruit is baby this week?")
  to cut cost further.
- **Model + cost math (planning figure)**: ~2k tokens in / 500 out per message.
  Groq Llama-3.3-70B ≈ $0.59/M in, $0.79/M out → ≈ **$0.002/message**. 30 msgs
  × 30 days ≈ **$1.60/user/month worst-case**, realistically far less
  (cache + caps + most users chat a few times a week). With a $50/mo budget
  you can comfortably serve a few hundred active users in the early phase.
- **BYOK later**: Phase 2.5 adds an advanced "bring your own key" toggle for
  privacy purists/power users (Gemini/OpenRouter/Groq keys stored locally,
  calls go direct from the device) — as an *option*, never the default.
- **Analytics (P2-compliant)**: aggregate counters only — messages served,
  active users/day (anonymized device hash), week distribution, language,
  feature usage. **No message content, no journal content, no PII.** Opt-in
  and clearly disclosed.

#### 5.3 Architecture

```
User (web app / PWA / future native)
        │  POST /api/chat  { week, trimester, language,
        │                   optIn: {useJournal: true, messages:[...]} }
        ▼
[ Backend proxy (hosted — new small component) ]
   ├─ Auth/lite (anonymous device id — no account needed)
   ├─ Rate limiter (30 msgs/day/user, monthly budget, cache)
   ├─ Context builder (pulls week guide from shared content)
   └─ LLM call (Groq/OpenRouter, provider-agnostic adapter)
        ▼
   Aggregate-only counters → founder dashboard (week/msg counts)
```

**Grounding — the context builder** (the heart of "smart"):
- Always injects: current week (from LMP/due date), trimester, this week's
  `guide-data` block (size/baby/mom/feel/analogy), baby nickname, parents'
  names, theme.
- With consent (`optIn.useJournal`): a *summarised, non-photo* digest of recent
  milestones/dates ("heard heartbeat at week 6", "told families week 9") so the
  bot can reference the family's real story. Raw notes are never sent — only a
  compact, derived summary.
- A short rolling message history (last ~10 turns) kept in the client; nothing
  persisted server-side after the reply streams.

**Entry points** (must exist in both apps, both layouts):
1. **Floating chat bubble** (bottom-right, all screens) — always discoverable.
2. **Home-page hook** — the cover already hosts a "Week-by-week guide" surface;
   a "Talk to your little one 💬" card sits beside it, so **guidance can be
   experienced without any journal** (P2: companion ≠ journal).
3. **Per-card "Ask about this week"** — from any week card, jump into chat
   pre-seeded with that week's context.

**Chat UX**: soft pill bubbles, typing indicator that "wiggles", quick-reply
chips ("What fruit is baby this week?", "Tell me a bedtime story", "I'm tired —
cheer me up"), emoji-only reactions, one-tap copy/share of a sweet message.

#### 5.4 Compliance & disclosure
- Clear one-time opt-in screen: *what it is, what's sent (week + optional
  journal summary), what's never sent (photos, names — names only as labels),
  "AI can be wrong — your doctor knows better", "off anytime, journal
  unaffected".*
- COPPA-safe (no under-13), GDPR-friendly (no PII retained), App-Store-friendly
  (disclosed AI, no health-data claims — we deliberately do NOT file under
  health tracking; we're a journal).

---

### Phase 3 — 🩺 Care team & doctor finder

Two halves, deliberately split by privacy:

**3.1 "My care team" (fully local)**
- A page where the family stores their **own** doctor/midwife/hospital details:
  name, role, phone, address, notes, next-appointment date (which then shows as
  a gentle reminder chip on the relevant week card).
- 100% local (same storage as the journal). No API, no network.

**3.2 "Find a doctor near me" (opt-in, online)**
- A finder that helps locate **popular, nearby gynecologists/obstetricians**:
  tap → (location permission, optional) → cards with name, rating, reviews,
  address, distance, hours, "Open in Google Maps".
- **Provider: Google Places API (Places API / Places API New)** via a
  server-side proxy (key never in the client), with **domain-restricted key** +
  daily query cap + caching. Cost is negligible at early scale
  (~$32/1k Place Searches, ~$17/1k Details; a few cents for hundreds of users
  per month).
- Privacy: location is sent to Google *only when the user actively searches*
  (never stored, never tracked); searches are ephemeral.
- UX note: this is a *finder*, not a booking engine — we hand them to Google
  Maps for actual navigation/booking. Keeps scope tight and liability low.

---

### Phase 4 — 🎬 The Learning Hub (video browser)

- A "Watch & learn" tab: **curated, localised videos for the exact week /
  trimester / topic** — expert explanations of this week's symptoms, breathing
  and birth-prep classes, nutrition tips, partner advice.
- **Provider: YouTube Data API v3** (search + player). Query = week/topic +
  **user language** (browser/OS language, or a manual language picker):
  e.g. *"week 20 pregnancy symptoms [language]"*. Results render as thumbnail
  cards (title, channel, duration); tap → in-app player or "open in YouTube".
- **Instagram is deferred** — it has *no public video-search API*; shipping a
  scraping path would violate its ToS and our privacy principles. Instead:
  Phase 4.5 "creator embeds" — a small, hand-curated list of trusted
  pregnancy educators (their public embeds/playlists) in popular languages,
  refreshed quarterly. Honest scope > fake scope.
- **Curated starter set**: every trimester ships with ~5 hand-picked,
  language-safe evergreen videos (breathing, nutrition, what-to-pack), so the
  hub is useful even before search.
- **YouTube key strategy**: server-side proxy + referer/domain restriction +
  daily cap (same pattern as the bot). Thumbnails cached locally.
- Offline behavior: hub hides gracefully with a "no connection" whisper; the
  journal is untouched.

---

### Phase 5 — 📱 Native apps (iOS + Android) — "going rogue"

#### 5.1 Decision: **Flutter** (architect's recommendation)

| Framework | Why | Why not |
|---|---|---|
| **Flutter (recommended)** | Single Dart codebase for iOS+Android; *exceptional* custom-UI fidelity (perfect for this design-heavy, animation-rich product — carousel, drag-reorder, themes); first-class offline (Isar/Hive/SQLite); hot reload for fast iteration; strong community | New language (Dart) — the current code is vanilla JS but is *not* React, so no JS reuse either way |
| React Native | JS reuse with web code | This project has **no React** — zero code reuse; UI fidelity for custom animations is harder; still two store paths |
| Kotlin Multiplatform | Shared logic, native UI | Younger toolchain; UI written twice (SwiftUI + Compose) — doubles design work for a design-centric product |
| Native (Swift + Kotlin) | Best platform fit | Two full codebases for a solo/small team — kills velocity |

**Verdict: Flutter.** One sexy codebase, pixel-perfect recreations of the
carousel + stacked + themes, and a clear offline story (the journal's soul).

#### 5.2 Approach
- **New repo/module** (e.g. `app/` alongside `public/` + `pwa/`), Flutter ≥ 3.x.
- **Reuse, not rewrite**:
  - `guide-data.js` content → generated/checked-in **`guide_data.json`** asset
    (same single source of truth; a tiny script keeps it in sync).
  - Theme palettes → Dart `ThemeData` from the same six palettes.
  - The **PWA backup JSON becomes the universal import bridge** — native app
    first-run offers "Import from your journal backup" (Settings → Export
    backup on any flavor → same file imports anywhere). This solves migration
    elegantly.
  - Keepsake print: Flutter's PDF generation (or a shared HTML-print path via
    webview) reproduces the book.
- **Storage**: Isar or Hive (fast, local, no cloud). Photos as local files.
- **Feature parity checklist**: cover, milestones, week cards, carousel +
  stacked, drag-reorder, mentions, themes, art prompts, backup/restore,
  keepsake export, **baby bot (Phase 2), care team (Phase 3), learning hub
  (Phase 4)** — the backend proxy is shared with the web/PWA, so AI/Places/
  YouTube features work identically.
- **Release plan**:
  1. Android: Play Store **closed/internal track** → friends & family
  2. iOS: TestFlight → App Review (disclose AI features in `App Privacy`
     answers; journal = local data, no health-claim)
  3. Public launch on both stores ("go rogue" 🚀)
- **Monetization**: stays **free** (brand promise). Later option: a one-time
  "keepsake unlock" (premium print templates / custom cover art) or a
  voluntary tip jar — never subscriptions, never ads, never data sales.
- **Bragging rights**: the LinkedIn story writes itself — "from a 6-hour
  prototype to the App Store, still free, still private."

---

### Phase 6 — stretch (ordered by founder excitement)
- **"After the baby" mode** — the bot becomes a newborn; the journal gains a
  "first year" chapter. Retention beyond week 40.
- **Multi-language content** — translate `guide-data.js` (community-driven);
  the bot + videos already adapt to language first.
- **AI keepsake captions** — "write a caption for this photo like the baby
  would" (uses the same bot, same caps).
- **Partner/shared mode** — two-device sync via the family's own private
  bridge (still P1-friendly: end-to-end encrypted, opt-in).
- **Birth-day celebration card** — a designed, printable announcement page.

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| **Privacy** | Zero journal-content collection. Aggregate, anonymous, opt-in counters only. Keys server-side. `data/` git-ignored. |
| **Security** | Server proxy validates, rate-limits, and sanitizes; no secrets in client; CORS restricted; OWASP basics; no PII retained by the proxy. |
| **Offline** | Journal fully functional offline (PWA/native). Online features degrade with a warm whisper, never an error wall. |
| **Parity** | `public/` and `pwa/` must ship identical features/content; `guide-data.js` and `art-prompts.js` are the single source of truth (a parity check script keeps them honest). |
| **Performance** | Carousel/stacked stay 60fps (transform-based); export file stays lean (template cloning, embedded photos once). |
| **Accessibility** | Keyboard nav (already in carousel), readable contrast in all six themes, touch targets ≥ 44px. |
| **i18n** | Language detection for bot/videos first; UI strings externalized (later phase). |
| **Content accuracy** | Every `guide-data.js` fact is reviewed against reputable sources before release; the bot's claims are constrained to that content + gentle generalities. |
| **Failure modes** | LLM outage → friendly "baby is napping" retry; API over-quota → clear, kind messaging; import always backed up first. |

---

## 7. Success metrics

| Metric | Why | Target (year 1) |
|---|---|---|
| Installs (web PWA + stores) | Reach | 5k+ |
| Weekly active users | Real usage, not downloads | 30% of installs |
| Median journal pages written | Core value delivered | ≥ 8 |
| Keepsake exports / prints | The emotional payoff | 15% of actives |
| Bot messages / active user / week | Companion stickiness | ≥ 7 |
| Bot opt-in rate | Companion acceptance | ≥ 40% of actives |
| Aggregate-only "how many people use this" | **Founder planning data** (the founder's stated need) | dashboard live |
| Store rating | Public love | ≥ 4.7 |

---

## 8. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| AI gives medical advice despite guardrails | Low–Med | Red-line lexicon + output filter + persistent disclaimer + "AI can be wrong" UI; no health claims filed |
| LLM/API costs spiral | Med | Per-user caps + global budget + caching + provider switch; cost model in §5.2 |
| Feature drift between web & PWA | Med | Single content source + parity script + both apps tested together |
| Store rejection (health/AI disclosure) | Low | Journal ≠ health tracking; disclose AI clearly; no medical claims |
| Privacy backlash (trust is the brand) | Low | Opt-in everything; aggregate-only; open-source; PRD's P1 enshrined |
| Native rebuild scope creep | Med | Strict parity checklist; reuse backup JSON + shared proxy; Flutter's template reuse |

---

## 9. Decision log

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Bot key strategy | **Provisioned key (Groq) behind a proxy with caps** | Best UX + cost control + anonymous usage analytics; Google-sign-in is rejected as primary UX |
| D2 | Bot identity | Toddler persona speaking as the baby, grounded in `guide-data` + LMP + (opt-in) journal digest | Feels like *her* baby, not another generic assistant |
| D3 | Bot medical stance | "Medical empathy, never medical advice" + red-line escalation | Keeps the brand warm, the liability low, and mothers safe |
| D4 | Doctor finder | Google Places via proxy; "My care team" fully local | Splits utility from privacy cleanly |
| D5 | Video hub | YouTube first; **Instagram deferred** (no public API); curated embeds later | Honest scope; no ToS-violating scraping |
| D6 | Native framework | **Flutter** | One codebase, design fidelity, offline story |
| D7 | Data migration | PWA backup JSON as the universal import bridge | One elegant path: any flavor → any flavor |
| D8 | Monetization | Free; optional one-time keepsake unlock / tip jar later | Brand promise is "free & private"; no ads, no data sales |
| D9 | Analytics | Aggregate-only, anonymous, opt-in counters | Founder gets planning data without violating P1 |

---

## 10. One-line roadmap (for the README & LinkedIn)

> **v1** — the private journal (done) → **v2** — your baby's voice in your
> pocket (AI companion, doctor finder, learning hub) → **v3** — the App Store,
> still free, still yours.
