import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminMessaging, adminDb } from "@/lib/firebaseAdmin";

// Runs as a Vercel serverless function on the free Hobby plan — no
// separate paid backend, no Firebase Cloud Functions (which require a
// billing account even to deploy). This IS the "server" that Phase 2
// needs, and it costs nothing.
//
// Debugging: every failure here is logged with console.error/warn, which
// shows up in Vercel Dashboard -> your project -> Deployments -> latest
// deployment -> Functions tab -> click "send-notification" -> Logs. If
// pushes are failing, that's the place to look for the real reason.
export const runtime = "nodejs";

interface FirebaseAdminError {
  code?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  if (!adminAuth || !adminMessaging || !adminDb) {
    console.warn("[send-notification] Not configured — FIREBASE_SERVICE_ACCOUNT_KEY missing or invalid.");
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
  } catch (err) {
    console.warn("[send-notification] ID token verification failed.", err);
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
  } catch (rawErr) {
    const err = rawErr as FirebaseAdminError;
    console.error("[send-notification] adminMessaging.send() failed.", {
      code: err.code,
      message: err.message,
    });

    // A stale/expired registration token isn't a server malfunction — the
    // browser that issued it may have cleared storage, uninstalled the
    // PWA, etc. Clean it up so future calls to this person don't keep
    // hitting the same dead token, and report it as a normal (non-500)
    // outcome, since the in-app overlay is unaffected either way.
    if (err.code === "messaging/registration-token-not-registered") {
      await adminDb.collection("users").doc(targetUid).update({ fcmToken: null }).catch(() => undefined);
      return NextResponse.json({ sent: false, reason: "Recipient's push token had expired and was cleared." });
    }

    // The single most common first-time setup mistake: the VAPID key
    // (NEXT_PUBLIC_FIREBASE_VAPID_KEY) and the service account
    // (FIREBASE_SERVICE_ACCOUNT_KEY) belong to different Firebase
    // projects. Surfacing this explicitly saves a lot of guessing.
    if (err.code === "messaging/mismatched-credential" || err.code === "messaging/sender-id-mismatch") {
      return NextResponse.json(
        {
          sent: false,
          error:
            "The VAPID key and the service account appear to belong to different Firebase projects. Double-check both come from the SAME project in Firebase Console.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { sent: false, error: err.message ?? String(rawErr), code: err.code },
      { status: 500 }
    );
  }
}
