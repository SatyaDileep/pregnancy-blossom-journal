# Our Journey To You — installable app (PWA)

This folder is a **self-contained, serverless** version of the journal. Everything
(pages, photos, settings) is saved in the phone's own storage (IndexedDB), so once
installed it works **fully offline, with no server and no cloud** — the original
`server.js` project is untouched and still works as before.

```
pwa/
  index.html          the app (same UI, carousel + stacked views, themes)
  styles.css          styling (all six themes)
  app.js              app logic + local IndexedDB storage + backup
  manifest.webmanifest  makes it installable
  sw.js               service worker (offline support)
  guide-data.js       week-by-week guidance content (weeks 4–40)
  art-prompts.js      image prompts for milestone pages
  icons/              app icons (180 / 192 / 512)
  make-icons.js       regenerates the icons if you want a different look
  serve.js            tiny static server (no dependencies)
```

## Run it locally

```bash
node serve.js
# → http://localhost:4174
```

Any static host works too (e.g. `npx serve .` or `python3 -m http.server`).

## Install on your phone

The browser only allows *installation* from a secure context — `https://` or
`localhost`. The app itself then runs forever offline.

**Android (Chrome):**
1. Put this `pwa` folder on the phone (or copy it over Wi-Fi/USB).
2. On the phone, serve it over **localhost** — e.g. with Termux:
   `cd pwa && node serve.js`
3. Open `http://localhost:4174` in Chrome → menu (⋮) → **Add to Home screen /
   Install app**. It then launches full-screen from your home screen, offline.

**iPhone / iPad (Safari):**
1. Same as above — serve the folder over localhost (e.g. Termux, or a local
   HTTP-server app) or host it on any HTTPS site temporarily.
2. Open the page in Safari → Share (⎋) → **Add to Home Screen**.
   It opens as its own app, full-screen and offline.

> If you don't mind a temporary public host, you can also drop the folder on any
> static HTTPS host once, install it from there, and delete the host — the
> installed app keeps working offline forever.

## First run & data

- First launch creates the standard milestone skeleton (blank dates for you to fill in).
- **Move your existing journal from the old app:** the old project's data lives in
  `data/entries.json` and `data/settings.json`. In the new app, open ⚙️ Settings →
  **⬆ Import backup** and pick a file in one of these shapes:
  - this app's own export (Settings → **⬇ Export backup** — includes photos), or
  - a JSON array of pages (the old `data/entries.json` — pages come across,
    photos need re-adding since the old server stored them on disk).
- **Back up regularly:** Settings → ⬇ Export backup keeps one JSON file with every
  page, photo and detail. Import replaces the current journal (it asks first).

## Updating the app after you change the code

The service worker caches the app shell. After editing `index.html` / `styles.css` /
`app.js`, bump the `CACHE` version at the top of `sw.js` so phones pick up the new
version on their next visit.
