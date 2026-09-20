# CRoom

Privacy-first, browser-based video calling. Next.js 14 (App Router) + Firebase
Auth (email/password only) + Firestore (used purely as an ephemeral WebRTC
signaling channel) + native WebRTC for the actual call media.

## Updating your existing GitHub repo

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

