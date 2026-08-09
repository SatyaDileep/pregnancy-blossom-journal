# 👶 Blossom Baby — native chat setup

The chat is the **same companion backend** the web app and PWA already use:
one Express server (`node server.js`, port 51889) that proxies to Google
Gemini, enforces red-line safety before any model call, and applies the daily
caps. The native app is just another client — it calls `GET /api/chat/config`
and `POST /api/chat` with the identical payloads.

## Point the app at the server

Tap the **⚙️ icon in the chat header** and paste the server URL. Sensible
defaults are pre-filled per platform:

| Where you run the app | Default server URL | Notes |
|---|---|---|
| Android emulator | `http://10.0.2.2:51889` | `10.0.2.2` is the emulator's name for the host PC |
| iOS simulator | `http://localhost:51889` | Simulators share the host network |
| **Real phone** | *(none)* | Use your PC's **LAN IP**: `http://192.168.x.x:51889` — same Wi-Fi as the PC |
| Flutter web / desktop | `http://localhost:51889` | — |

The address is remembered on the device (same `blossom.chatApi` storage key
as the web/PWA), so it's configured **once**.

### Getting the LAN IP (real phone)

```bash
ipconfig        # Windows — find "IPv4 Address" on your Wi-Fi adapter
# or
ifconfig        # macOS/Linux
```

Then run the server so it listens on the LAN too (it already binds all
interfaces by default) and make sure the phone is on the **same network**.

### Cleartext notes

The Android manifest already allows plain `http://` traffic
(`usesCleartextTraffic="true"`), and iOS allows local-network http via
`NSAppTransportSecurity → NSAllowsLocalNetworking` in `Info.plist` — both so
a dev/QA build can reach a LAN server. When you ship against a public
`https://` backend, both allowances can be removed.

## Demo voice vs real AI

- **No key configured on the server** → the app shows the warm **demo voice**
  (week-grounded canned replies). Everything works end-to-end for testing.
- **`GEMINI_API_KEY` set on the server** → the header flips to **✨ real AI**.
  Same key the web/PWA use — nothing app-specific to configure.
- **Server unreachable** → header shows **💤 sleeping**; messages show a
  friendly hint to check the ⚙️ address.

## Privacy + safety (identical to web/PWA)

- **Consent first** — the chat stays locked behind "a cheerleader, not a
  doctor" until mama taps *Sounds good*.
- **Nothing is stored server-side** — only anonymous daily counters for the
  founder dashboard (`/admin`).
- **Red-lines checked before any model call** — bleeding, severe pain,
  reduced movement, waters breaking, pre-eclampsia signs → a warm "call your
  doctor now" with no speculation. A server-side output filter also softens
  any off-script clinical claims.
- **Caps** — 20 messages/day per device, 30 per IP, 1000/day global
  (tunable in `.env`).

## Testing the client alone

The Dart client is covered by live integration tests that need the server
running on `:51889`:

```bash
cd app
node ../server.js &        # start the companion backend (or your deployed one)
flutter test test/blossom_api_test.dart
```

The three tests verify config detection, a real reply, and the red-line path.
They **skip cleanly** when the server is offline so CI stays green.

## Roadmap hooks

- **BYOK** (bring-your-own Gemini key, chats go straight from the phone to
  Google) — planned, same as the web widget's escape hatch.
- **AI artwork** (`POST /api/art-generate`) lands with the **storage
  milestone**, because a generated picture needs a page (and its local photo
  store) to attach to.
- **Journal digest grounding** — once native entries exist, the chat will
  include the same non-photo digest the web/PWA send, so replies can reference
  the family's own pages.
