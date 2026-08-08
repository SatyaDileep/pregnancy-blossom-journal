# 🌼 pregnancy-blossom-journal

A soft, personal digital journal for your pregnancy journey — milestones, photos, and memories, gently captured week by week as your little one blossoms.

## ✨ Features

- **Milestone pages** — the classic moments of pregnancy, ready to fill in
- **Week-by-week guidance** — notes for every week (weeks 4–40)
- **Photo memories** — attach a photo to each page
- **Six themes** — make it feel like yours
- **Carousel + stacked views** — browse the journey however you like
- **Backup & restore** — export one JSON file, import it anywhere
- **Installable PWA** — works fully offline on your phone

## 🗂 Two ways to run

### 1. Web app (server-backed)

Node + Express with an HTTP API and photo uploads.

```bash
npm install
npm start
# → http://localhost:4173
```

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| GET | `/api/settings` | Read journal settings |
| PUT | `/api/settings` | Update journal settings |
| GET | `/api/entries` | List all pages |
| POST | `/api/entries` | Create a page (photo upload) |
| PUT | `/api/entries/:id` | Update a page (photo upload) |
| DELETE | `/api/entries/:id` | Delete a page |
| POST | `/api/reorder` | Reorder pages |
| POST | `/api/restore-milestones` | Restore the default milestone skeleton |

### 2. PWA (serverless, fully offline)

Everything lives in the phone's own storage (IndexedDB) — no server, no cloud.

```bash
cd pwa
node serve.js
# → http://localhost:4174
```

Serve it over `localhost` (or any HTTPS host) and **Add to Home Screen** from the browser. It then runs full-screen, offline, forever. See [`pwa/README.md`](pwa/README.md) for install and data-migration details.

## 🧪 Helper scripts

- `seed-demo.js` — seed demo pages for testing
- `make-sample.js` — generate sample content
- `placeholder.js` — placeholder helpers
- `test-api.js` — smoke-test the API

## 🔒 Privacy

Your journal is yours. The server's real entries and photos live in `data/`
(entries.json, settings.json, photos/), which is git-ignored and never published.
The PWA keeps everything locally on your device. Back up regularly from
**Settings → ⬇ Export backup**.

## 📄 License

Private / personal project.
