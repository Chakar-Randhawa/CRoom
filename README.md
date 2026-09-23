# CRoom

Privacy-first, browser-based video calling. Next.js 14 (App Router) + Firebase
Auth (email/password only) + Firestore (used purely as an ephemeral WebRTC
signaling channel) + Realtime Database (online/offline presence) + native
WebRTC for the actual call media.

## Phase 1: Calling Experience Overhaul (NEW)

This build adds a WhatsApp-style calling flow on top of the redesign from
before:

- **Caller side**: full-screen "Calling… / Ringing…" screen instead of being
  dropped straight into the room. Shows the target's name, an "offline"
  hint if they're not currently online, and a Cancel button. Auto-cancels
  with "No answer" after 35 seconds if nobody responds.
- **Callee side**: full-screen incoming-call overlay (not a small banner) —
  caller's name, big Accept/Decline buttons — visible from ANY page in the
  app (Dashboard, About, Why Choose Us), not just Dashboard.
- **Real ringtones**: synthesized with the Web Audio API (no external sound
  files, no licensing, works offline once the page has loaded) — a calmer
  ring-back tone for the caller, a more urgent two-tone ring for the callee.
- **Online/offline presence**: via Firebase Realtime Database — a SEPARATE
  Firebase product from Firestore, with its own required setup step below.

**New required setup step** — presence needs Realtime Database enabled:
1. Firebase Console → your project → Build → Realtime Database → Create
   Database (any region, start in locked mode).
2. Copy the URL shown (looks like `https://your-project-default-rtdb.firebaseio.com`)
   into `.env.local` as `NEXT_PUBLIC_FIREBASE_DATABASE_URL`.
3. Realtime Database → Rules tab → paste in `database.rules.json` → Publish.
4. Add the same `NEXT_PUBLIC_FIREBASE_DATABASE_URL` to Vercel's Environment
   Variables (Vercel Dashboard → your project → Settings → Environment
   Variables), otherwise presence won't work on the live site even though
   it works locally.

If this step is skipped, nothing breaks — presence just reports "unknown"
instead of online/offline, and calling/ringing/timeout all work normally.

## Phase 2: Background Push Notifications (NEW)

Adds a second layer of "you got a call" alerting on top of Phase 1's
in-app ringing, for when the CRoom tab isn't open at all:

- **When the tab is open (foreground or backgrounded, not closed)**:
  Phase 1's Firestore listener + full ringtone + full-screen overlay
  already handles everything — Phase 2 doesn't duplicate any of that.
- **When the tab/browser is fully closed**: a native OS notification
  appears (title, "tap to answer", Accept happens by tapping it) via a
  service worker running independently of the page. Clicking it opens/
  focuses CRoom, which then shows the real incoming-call screen with
  ringtone once the app is actually running.

**An honest platform limitation, not a shortcoming of this build**: no
browser (Chrome, Firefox, Safari — free or paid) lets a website play a
continuous custom ringtone loop while completely closed. That's a
deliberate browser security restriction (otherwise any site could blast
audio in the background). The native notification is the correct,
standard way every web app handles this — it's what you'll see from
things like Gmail's web push, too.

**Architecture — all genuinely free, no credit card anywhere**:
- **Sending the push** needs a small server piece (a mobile/web push
  message has to be signed and sent by something with admin credentials
  — it can't be done straight from the browser). Firebase Cloud Functions
  would normally do this, but Firebase requires a Blaze (pay-as-you-go)
  plan — meaning a card on file — just to deploy a Cloud Function at all,
  regardless of usage. So instead, `/api/send-notification` is a plain
  Next.js API route, which runs as a Vercel serverless function on the
  free Hobby plan (already what CRoom is deployed on) — no card needed.
- **Firebase Cloud Messaging (FCM)** itself is entirely free, unlimited,
  on Firebase's free Spark plan — this hasn't changed.

**New required setup steps**:
1. Firebase Console → Project settings → Cloud Messaging → Web
   configuration → "Generate key pair" → copy the value into
   `.env.local` as `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
2. Firebase Console → Project settings → Service accounts → "Generate new
   private key" → downloads a JSON file. Paste its entire contents as one
   value into `.env.local` as `FIREBASE_SERVICE_ACCOUNT_KEY`. **Never**
   commit this file or value anywhere public — it has full admin rights
   to your Firebase project.
3. Open `public/firebase-messaging-sw.js` and paste in the same 6
   `NEXT_PUBLIC_FIREBASE_*` values you already have in `.env.local`.
   Service workers can't read Next.js environment variables, so this one
   file needs them hardcoded directly — this is standard practice for
   every Firebase project's messaging service worker, and these values
   are public identifiers, not secrets.
4. Add all of the above (`NEXT_PUBLIC_FIREBASE_VAPID_KEY` and
   `FIREBASE_SERVICE_ACCOUNT_KEY`) to Vercel's Environment Variables too,
   the same way you did for the Realtime Database URL in Phase 1.

If any of this is skipped, nothing breaks — the API route detects the
missing config and returns a clean "not configured" response instead of
crashing, and everything from Phase 1 (in-app ringing) keeps working
exactly as before.



I can't push to your repo directly from here — I don't have write access to
your GitHub account. To bring your repo up to date with this version,
from inside this unzipped folder:

```bash
git init
git remote add origin https://github.com/Chakar-Randhawa/CRoom.git
git fetch origin
git checkout -b main --track origin/main   # or whatever your default branch is called
git add -A
git commit -m "Redesign: Nomu-inspired theme, real motion system, fix call-screen viewport bug, camera clarity filter"
git push origin main
```

If that conflicts because your remote history and this folder don't share a
common base, force-pushing will overwrite the remote with this version:
```bash
git push origin main --force
```
Only do that if you're fine replacing everything currently in the repo —
double-check first if there's anything on GitHub you haven't backed up
locally. After pushing, Vercel will redeploy automatically if it's connected
to that repo/branch.

## What changed in this pass (from the previous version)

- **Theme**: rebuilt to match nomu.store — warm cream background, faint
  graph-paper grid, coral/orange accent, Baloo 2 bubble wordmark, floating
  pill navbar with a sliding active-tab indicator.
- **Motion**: every route change now transitions; the boot sequence is a
  real ~3.5s paced sequence (letter-reveal, progress bar, ambient glow)
  instead of a 1-2s flash; primary buttons are magnetic (cursor-attracted)
  with spring hover/tap; page sections and the comparison table reveal on
  scroll.
- **Fixed: call screen requiring scroll.** The old layout used
  `min-height`, which lets content grow past the viewport. The call screen
  now locks to `height: 100dvh` (the browser's real, current visible area),
  so it fits exactly on laptop, tablet, or phone with no scrolling, and the
  local video preview and control bar scale/reposition responsively
  (including safe-area padding for phones with a home indicator).
- **Fixed: a stale-closure bug** in the adaptive bitrate monitor that could
  silently prevent the low-bandwidth step-down from ever applying (it was
  reading a `null` stream reference captured before the camera stream was
  ready). Now reads from a ref that's always current.
- **Fixed: an ICE-candidate race condition** that could intermittently
  break connection setup if a candidate arrived before the remote SDP was
  set. Candidates now queue and flush safely.
- **New: a real-time camera clarity filter** — a canvas pipeline that
  auto-adjusts contrast/saturation/brightness and does a temporal blend
  against the previous frame to reduce visible sensor grain/scratches from
  cheap webcams, then swaps the actual track sent over WebRTC via
  `replaceTrack` (so the other person sees the improvement, not just your
  own preview). Toggle it with the sparkle button in the call controls.

## What's real here vs. what you need to configure

Every file in this project is complete, working code — there are no stubs or
`// TODO` placeholders. The one thing that can't be done for you is creating
*your own* Firebase project, since that requires an account only you control.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Firebase project** at https://console.firebase.google.com
   - Authentication → Sign-in method → enable **Email/Password**.
   - Firestore Database → create in **production mode**.
   - Firestore → Rules → paste in the contents of `firestore.rules` and publish.
   - Project settings → General → "Your apps" → add a **Web app** → copy the config.

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in the six `NEXT_PUBLIC_FIREBASE_*` values from step 2.

4. **(Strongly recommended for real-world use) Add a TURN server**
   STUN alone (which is free and included) fails to connect roughly 10-20% of
   real-world network pairs — anyone behind a symmetric NAT or a strict
   corporate firewall. Get TURN credentials (e.g. via Twilio, Cloudflare
   Calls, or your own coturn instance) and add them to `.env.local`. Without
   this, most calls will still work, but some will not connect.

5. **Run it**
   ```bash
   npm run dev
   ```
   Open two different browsers (or one normal + one incognito window),
   sign up two separate accounts, and call one from the other.

## How each calling method works

- **Call by email (Method A)** — resolves the target's email to their Firebase
  `uid` via a `users` collection lookup, writes a short-lived `invites` doc,
  and the recipient's open tab picks it up via a live Firestore listener
  (`IncomingCallBanner`). The invite doc is deleted the instant it's answered
  or declined.
- **1-click room (Method B)** and **QR/link invite (Method C)** share the same
  code path (`CreateRoomModal`): a random room ID is generated client-side and
  placed in the URL **hash fragment** (`/room#<id>:callee`), which browsers
  never send to a server — so no server-side log ever contains a room ID.
- **Signaling** for all three methods uses a `rooms/{roomId}` Firestore
  document to exchange the SDP offer/answer and ICE candidates only. No
  video, audio, or chat content ever touches Firestore — chat rides a WebRTC
  `RTCDataChannel` directly between the two browsers. The room document and
  its candidate subcollections are deleted the moment either side hangs up.
- **Low-bandwidth mode** — `lib/webrtc.ts` polls `RTCPeerConnection.getStats()`
  every few seconds; on sustained packet loss or high RTT it steps the video
  sender's `maxBitrate` and resolution down (720p → 360p → audio-only) and
  steps back up once the network recovers, without ever tearing down the call.
- **Camera clarity filter** — `startEnhancement()`/`stopEnhancement()` in
  `lib/webrtc.ts` run the local camera track through an off-screen canvas,
  apply an auto contrast/saturation lift plus a low-opacity temporal blend
  against the prior frame (reduces flickering sensor noise while motion
  stays sharp), then send the canvas's `captureStream()` track over the
  peer connection in place of the raw camera track.

## Known scope boundaries (worth knowing before you ship this)

- The contact form on the About page opens a `mailto:` link rather than
  sending through a backend — genuinely zero-storage, but you'll want a real
  mail relay (e.g. a small serverless function) if you want submissions
  without relying on the visitor's own email client.
- There's no user directory/search UI — Method A requires knowing the exact
  email someone signed up with, matching the spec's "email target lookup."
- The camera clarity filter is a real-time canvas/CSS-filter pipeline, not a
  machine-learning denoiser — it meaningfully reduces flickery sensor grain
  and gives a cleaner, more contrasty image, but it won't fix a genuinely
  broken or very low-light camera the way a dedicated ML noise-reduction
  model (e.g. Nvidia Broadcast) would.

