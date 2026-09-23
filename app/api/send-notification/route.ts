import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminMessaging, adminDb } from "@/lib/firebaseAdmin";

// Runs as a Vercel serverless function on the free Hobby plan — no
// separate paid backend, no Firebase Cloud Functions (which require a
// billing account even to deploy). This IS the "server" that Phase 2
// needs, and it costs nothing.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!adminAuth || !adminMessaging || !adminDb) {
    return NextResponse.json(
      { error: "Push notifications aren't configured on this server yet." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.replace(/^Bearer\s+/i, "");
  if (!idToken) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  try {
    await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired auth token." }, { status: 401 });
  }

  let body: { targetUid?: string; callerName?: string; roomId?: string; inviteId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { targetUid, callerName, roomId, inviteId } = body;
  if (!targetUid || !callerName || !roomId || !inviteId) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const targetSnap = await adminDb.collection("users").doc(targetUid).get();
  const fcmToken = targetSnap.data()?.fcmToken as string | undefined;

  if (!fcmToken) {
    // Not an error — the person just hasn't enabled notifications. Anyone
    // with the CRoom tab open will still see the in-app incoming-call
    // overlay via the existing Firestore listener, independent of this.
    return NextResponse.json({ sent: false, reason: "Recipient has no push token on file." });
  }

  try {
    // Deliberately a DATA-ONLY message (no top-level "notification"
    // field). If we included one, FCM would auto-display it in BOTH the
    // foreground and background, duplicating the in-app incoming-call
    // overlay for anyone with the tab open. Sending data-only means we
    // control display ourselves — the service worker shows a native
    // notification only when the page truly isn't running.
    await adminMessaging.send({
      token: fcmToken,
      data: {
        type: "incoming_call",
        callerName,
        roomId,
        inviteId,
      },
      webpush: {
        fcmOptions: { link: "/dashboard" },
      },
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    return NextResponse.json({ sent: false, error: String(err) }, { status: 500 });
  }
}
