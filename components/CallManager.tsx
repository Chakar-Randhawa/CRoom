"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import OutgoingCallScreen from "./OutgoingCallScreen";
import IncomingCallOverlay from "./IncomingCallOverlay";
import NotificationPermissionPrompt from "./NotificationPermissionPrompt";

// Mounted once, globally, as a SIBLING of PageTransition (not nested
// inside it) — this matters. PageTransition's wrapper carries Framer
// Motion's animation styles, and nesting a "position: fixed" overlay
// inside a transform-animated ancestor is exactly the bug we just fixed
// in the boot screen (an animated ancestor can silently collapse a fixed
// child to zero height). Keeping CallManager outside that wrapper avoids
// reintroducing the same class of bug here.
export default function CallManager() {
  const { user } = useAuth();
  const { outgoingCall, clearOutgoingCall } = useCall();
  const pathname = usePathname();

  // No call UI while signed out, or while already inside an active call
  // (the room page has its own controls — showing a second call overlay
  // on top of a live call would be confusing).
  if (!user || pathname === "/room") return null;

  return (
    <>
      <IncomingCallOverlay />
      <NotificationPermissionPrompt />
      {outgoingCall && (
        <OutgoingCallScreen
          inviteId={outgoingCall.inviteId}
          roomId={outgoingCall.roomId}
          targetUid={outgoingCall.targetUid}
          targetName={outgoingCall.targetName}
          onClose={clearOutgoingCall}
        />
      )}
    </>
  );
}
