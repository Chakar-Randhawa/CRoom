# CRoom

Privacy-first, browser-based video calling. Next.js 14 (App Router) + Firebase
Auth (email/password only) + Firestore (used purely as an ephemeral WebRTC
signaling channel) + native WebRTC for the actual call media.

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

## Known scope boundaries (worth knowing before you ship this)

- The contact form on the About page opens a `mailto:` link rather than
  sending through a backend — genuinely zero-storage, but you'll want a real
  mail relay (e.g. a small serverless function) if you want submissions
  without relying on the visitor's own email client.
- There's no user directory/search UI — Method A requires knowing the exact
  email someone signed up with, matching the spec's "email target lookup."
- Boot sequence, onboarding, and tactile press mechanics are implemented with
  Framer Motion and real CSS transforms — extend `BootSequence.tsx` and the
  `.tactile` class in `globals.css` if you want to push the motion further.
