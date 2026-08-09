# 🌼 Blossom Journal — the native app (Flutter)

Phase 5 of the [PRD](../PRD.md): **one sexy codebase for iOS + Android** (and a
web build for instant preview), sharing the same soul as the web app and the
PWA — the six warm themes, the week-by-week guidance, and (coming) the journal
itself with carousel + stacked views.

```
app/
  lib/
    main.dart                  app entry — ThemeScope + MaterialApp
    theme/app_themes.dart      the six palettes, ported verbatim from styles.css
    models/entry.dart          JournalEntry + Mention (mirror of the web data shape)
    models/journal_settings.dart  settings + LMP/due-date math (Naegele's rule)
    data/guide_data.dart       guide loader with graceful fallback
    screens/home_screen.dart   cover, live theme picker, guidance preview
  assets/guide_data.json       GENERATED — never hand-edit
  test/widget_test.dart        smoke tests (boot + theme switch)
  tools/...                    (see root tools/sync_guide.mjs)
```

## The content bridge (single source of truth)

The web app, the PWA and the native app all read the *same* week-by-week
guidance. Never hand-edit `app/assets/guide_data.json` — regenerate it:

```bash
node tools/sync_guide.mjs   # public/guide-data.js → app/assets/guide_data.json
```

## Run it

```bash
cd app
flutter run                # your connected device / emulator
flutter run -d chrome      # quick web preview
flutter test               # smoke tests (live-server chat tests skip if offline)
flutter analyze            # lint gate — keep this clean
```

> **Blossom Baby chat needs the companion server** (`node server.js` in the
> repo root, or your deployed backend). Point the app at it once via the ⚙️
> button in the chat header — full guide: **[docs/BABY_BOT.md](docs/BABY_BOT.md)**.

## Installing on a phone

- **Android** — no SDK needed: GitHub Actions builds the APK in the cloud
  (`.github/workflows/build-apk.yml`). Actions → *Build Android APK* → Run
  workflow → download `pregnancy-journal-apk`. Any machine can do this.
- **iOS** — Apple requires real signing, so there's a one-time $99/yr Developer
  Program step. Everything else is cloud too (`.github/workflows/build-ios.yml`
  → TestFlight invite link). Full checklist + secrets table:
  **[docs/IOS_BUILD.md](docs/IOS_BUILD.md)**. Free trial today: add the PWA to
  your iPhone home screen (Share → Add to Home Screen).

## What's in place (foundation)

- **Six themes** — `BlossomPalette` + `ThemeScope` (InheritedNotifier): switch
  live from the home screen, exactly like the web app's global theming.
- **Models** — `JournalEntry`, `Mention`, `JournalSettings` mirror the
  web/PWA data shape 1:1, so the **PWA backup JSON is the universal import
  bridge** into the native app (per PRD decision D7).
- **LMP math** — `addDays` / `effectiveDueDate` / `weekFromDate` ported from
  `server.js` (Naegele +280, guarded against NaN).
- **Guide content** — loaded from the shared JSON asset with a graceful
  fallback so the app never crashes on a stale asset.
- **Blossom Baby chat** — the full consent-first companion (real AI / demo
  voice / sleeping status, week badge, markdown-lite replies, suggestion
  chips + 💡 modal, typing indicator, ⚙️ server URL settings) talking to the
  **same backend** as the web/PWA. Live integration tests in
  `test/blossom_api_test.dart`. See **[docs/BABY_BOT.md](docs/BABY_BOT.md)**.

## Next milestones (in order)

1. **Storage** — local persistence (Isar/Hive), settings + entries + photos.
2. **Backup import** — read the PWA export JSON (pages + photos + settings).
3. **Journal UI** — the carousel + stacked views, drag-reorder, the editor.
4. **AI artwork** — wire `POST /api/art-generate` to pages once photos land
   locally (the endpoint already exists and is CORS-ready).
5. **Keepsake** — export/print the book from the phone.
6. **Companion depth** — BYOK, care team, learning hub (shared backend proxy,
   per the PRD).
