# Building Blossom for iOS

> **Read this first — iOS is not Android.** Android lets you sideload an APK with one tap.
> Apple does not allow that at all. Every real install on an iPhone **must be code-signed by
> Apple**, which requires an **Apple Developer Program membership ($99/year)**. There is no
> free path to a permanent install, period. What follows is the cheapest, most reliable route
> that works entirely from the cloud — the iOS twin of the Android APK workflow.

---

## The three paths, honestly

| Path | Cost | Install method | How permanent | Verdict |
|------|------|---------------|--------------|---------|
| **A. TestFlight (this workflow)** | $99/yr Apple Developer | TestFlight app, invite link | Until you stop the build; updates via same workflow | ✅ **Recommended** — the "rogue" path |
| **B. PWA on iPhone** | Free | Safari → Share → Add to Home Screen | Forever (it's the web app) | ✅ Do this **today** while deciding on A |
| **C. Sideloadly weekly hack** | Free | Windows tool + free Apple ID | **Expires every 7 days**, re-sign on PC | ⚠️ Only for a 1-week trial |

**Path B works right now** with the existing app — open `http://<your-PC-IP>:4174/` (or the
deployed PWA) in Safari on the iPhone, tap **Share → Add to Home Screen**. It runs fullscreen,
offline, with local storage. Not a real app, but zero cost and zero waiting.

---

## Path A: The TestFlight pipeline (one-time setup, ~45 min)

The workflow in `.github/workflows/build-ios.yml` does the heavy lifting on GitHub's free macOS
runners (free because your repo is public). You do the Apple paperwork **once**, then every
future build is one button + an invite link.

### The one-time Apple checklist

1. **Enroll** — [developer.apple.com](https://developer.apple.com) → Account → Enroll →
   Apple Developer Program ($99/yr). This is the only real money. (If you don't have a
   personal Apple ID with 2FA, create one first.)

2. **Create the App ID** — Certificates, Identifiers & Profiles → **Identifiers** → `+` →
   App ID → explicit: **`com.blossom.blossomJournal`** (must match exactly — it's already
   baked into the Xcode project). No capabilities needed yet.

3. **Create a Distribution certificate** — Certificates → `+` → *Apple Distribution* →
   follow the keychain-request wizard (any machine works, including Windows via OpenSSL, but
   easiest on a Mac). Download the `.cer`, then **export the private key + cert as a `.p12`**
   and set a password you'll remember. You need both the file and the password.

4. **Create the App Store provisioning profile** — Profiles → `+` → **App Store Connect** →
   select the App ID from step 2 → select the certificate from step 3 → name it `blossom-asc`
   → download the `.mobileprovision`. (Distribution profiles don't need device UDIDs —
   TestFlight handles device registration, which is the whole trick that makes CI work.)

5. **Create the app in App Store Connect** — [appstoreconnect.apple.com](https://appstoreconnect.apple.com) →
   My Apps → `+` → name **Blossom Journal**, primary language, bundle ID
   `com.blossom.blossomJournal`, SKU anything (e.g. `BLOSSOM001`). Done — no screenshot or
   review needed yet; TestFlight uploads work with the shell of an app.

6. **Create an App Store Connect API key** — App Store Connect → Users and Access →
   **Integrations** → App Store Connect API → `+` → access: *App Manager* → download the
   `.p8` file (shown once) and note the **Key ID** and **Issuer ID**.

### Add the 7 repository secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `APPLE_TEAM_ID` | Your 10-character team ID (Account → Membership) |
| `APPLE_DIST_CERT_BASE64` | The `.p12` file, base64-encoded |
| `APPLE_DIST_CERT_PASSWORD` | The `.p12` export password |
| `APPLE_PROFILE_BASE64` | The `.mobileprovision` file, base64-encoded |
| `APPLE_ASC_API_KEY` | Contents of the `.p8` file (the whole text) |
| `APPLE_ASC_KEY_ID` | The API key's ID (from step 6) |
| `APPLE_ASC_ISSUER_ID` | The issuer UUID (from step 6) |

Base64 in **Git Bash**: `base64 -w0 cert.p12 > cert.p12.b64` (then copy the contents).
In **PowerShell**: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.p12"))`.

### Run it

Actions → **Build iOS App (TestFlight)** → Run workflow → ~10–15 min (first run downloads
Flutter + Xcode tooling). When it goes green:

1. Open [TestFlight](https://testflight.apple.com) **on your iPhone** (or download it).
2. In App Store Connect → My Apps → Blossom Journal → **TestFlight** tab → Internal Testing →
   add yourself (and family) as a tester.
3. Apple emails the invite; accept it on the phone → **Blossom Journal installs**.
4. Future updates: re-run the same workflow, TestFlight pushes the new build over the old one.

> **First-upload gotcha:** if the upload fails with an export-compliance error
> (ITMS-90338 / encryption), go to App Store Connect → App → **App Information** → scroll to
> Export Compliance → choose **No** → save, then re-run the workflow.

---

## Going public (later)

TestFlight caps at 100 testers — perfect for family and bragging. When you want the App Store:
prepare screenshots, pass review (a journal app is low-risk), and either keep this workflow
(app-store-connect export is already correct) or swap the upload step for `fastlane deliver`.
Apple takes ~24–48h per review. The PRD's Phase 5 covers the full launch strategy.

## Troubleshooting

- **Workflow fails before signing** — missing secrets; the run log shows which step. Check
  secret names are spelled exactly as in the table.
- **"No profiles for com.blossom.blossomJournal"** — step 2/4 mismatch. The App ID and the
  profile must both use that exact bundle ID.
- **Upload rejects with "invalid team"** — `APPLE_TEAM_ID` wrong or the API key's access is
  *App Manager* or higher.
- **Unsigned warning** — expected when secrets aren't set; the artifact proves the code
  compiles but can't be installed. Do the checklist.
