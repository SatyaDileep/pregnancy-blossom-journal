# 🌱 Contributing to pregnancy-blossom-journal

Thank you for caring about this little journal. It was built with heart, and
it's meant to be grown — like the journey it holds. Every contribution, code
or kindness, makes it gentler.

## Code of conduct

Be warm. This project's whole point is empathy — treat others the way the
journal treats its readers. Be respectful, patient, and kind in issues, PRs,
and conversations.

## Getting started

```bash
npm install
npm start
# → http://localhost:4173  (server-backed web app)

cd pwa
node serve.js
# → http://localhost:4174  (serverless, fully-offline PWA)
```

## Where things live

| Path | What it is |
| ---- | ---------- |
| `server.js` | Express server, REST API, photo uploads |
| `public/` | The web app served by the server |
| `pwa/` | The self-contained, offline-first PWA (IndexedDB) |
| `pwa/guide-data.js` | Week-by-week guidance content (weeks 4–40) |
| `pwa/art-prompts.js` | Image prompts for milestone pages |
| `data/` | **Local, git-ignored** journal data — never commit anything here |

## Finding your way in

- **UI copy and wording** — lives in `pwa/app.js`, `public/app.js`, and
  `guide-data.js`. The tone matters as much as the code: gentle, personal,
  never clinical.
- **Theming** — six warm palettes, applied globally.
- **Offline & install** — `pwa/sw.js` (bump `CACHE` when you change the app
  shell so phones pick up the new version).

## Proposing changes

1. Fork the repo and create a branch from `main`.
2. Make your change — keep it small and focused.
3. Test it (run both apps locally; the PWA especially).
4. Open a pull request with a short, human description of *why* the change
   helps someone using the journal.

## What would help most

- Refining words and copy so they feel even warmer
- Polishing themes, spacing, and layout details
- Accessibility and small-screen polish
- Fixing bugs, big or small
- Ideas for the roadmap (App Store / Google Play, the "baby bot" empathetic
  layer) — open an issue to talk it through

## A note on privacy

This project's soul is **your data stays yours**. Please never introduce
telemetry, analytics, or anything that phones user data home. The
`data/` folder is git-ignored for a reason.

Made with 💛 — and thanks for helping it blossom.
