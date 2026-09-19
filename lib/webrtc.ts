"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type CallQuality = "high" | "medium" | "audio-only";
export type ConnectionState =
  | "idle"
  | "collecting-media"
  | "waiting-for-peer"
  | "connecting"
  | "connected"
  | "ended"
  | "error";

interface UseWebRTCOptions {
  roomId: string;
  isCaller: boolean;
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }
  return servers;
}

// Bitrate ceilings (bps) used by the low-bandwidth / low-RAM protocol.
const QUALITY_PROFILES: Record<CallQuality, { video: number | null; width: number; height: number; frameRate: number }> = {
  high: { video: 1_800_000, width: 1280, height: 720, frameRate: 30 },
  medium: { video: 500_000, width: 640, height: 360, frameRate: 20 },
  "audio-only": { video: null, width: 0, height: 0, frameRate: 0 },
};

export function useWebRTC({ roomId, isCaller }: UseWebRTCOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [quality, setQuality] = useState<CallQuality>("high");
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ from: "me" | "peer"; text: string; at: number }[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanedUpRef = useRef(false);

  const applyQualityProfile = useCallback(async (targetQuality: CallQuality) => {
    const pc = pcRef.current;
    const stream = localStream;
    if (!pc || !stream) return;

    const profile = QUALITY_PROFILES[targetQuality];
    const videoTrack = stream.getVideoTracks()[0];

    if (targetQuality === "audio-only") {
      if (videoTrack) videoTrack.enabled = false;
    } else if (videoTrack) {
      videoTrack.enabled = !cameraOff;
      try {
        await videoTrack.applyConstraints({
          width: { ideal: profile.width },
          height: { ideal: profile.height },
          frameRate: { ideal: profile.frameRate },
        });
      } catch {
        // Constraint application can fail on some devices/cameras; the
        // call continues at whatever resolution the camera already gives.
      }
    }

    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = profile.video ?? 1;
      try {
        await sender.setParameters(params);
      } catch {
        // Some browsers reject setParameters before the first negotiation
        // completes; the next renegotiation cycle will pick it up.
      }
    }

    setQuality(targetQuality);
  }, [localStream, cameraOff]);

  // Watches real connection stats (packet loss, RTT) and automatically
  // steps quality down/up — the "low-bandwidth mode" requirement.
  const startAdaptiveBitrateMonitor = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    let consecutiveBadSamples = 0;
    let consecutiveGoodSamples = 0;

    statsIntervalRef.current = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      const stats = await pc.getStats();
      let packetsLost = 0;
      let packetsReceived = 0;
      let roundTripTime = 0;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          packetsLost += report.packetsLost ?? 0;
          packetsReceived += report.packetsReceived ?? 0;
        }
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          roundTripTime = report.currentRoundTripTime ?? roundTripTime;
        }
      });

      const totalPackets = packetsLost + packetsReceived;
      const lossRatio = totalPackets > 0 ? packetsLost / totalPackets : 0;
      const isBad = lossRatio > 0.08 || roundTripTime > 0.4;
      const isGreat = lossRatio < 0.01 && roundTripTime < 0.15;

      if (isBad) {
        consecutiveBadSamples += 1;
        consecutiveGoodSamples = 0;
      } else if (isGreat) {
        consecutiveGoodSamples += 1;
        consecutiveBadSamples = 0;
      } else {
        consecutiveBadSamples = 0;
        consecutiveGoodSamples = 0;
      }

      // Require a few consecutive bad/good samples before switching, so a
      // single network blip doesn't cause visible quality flicker.
      if (consecutiveBadSamples >= 3) {
        setQuality((current) => {
          if (current === "high") {
            applyQualityProfile("medium");
            return "medium";
          }
          if (current === "medium") {
            applyQualityProfile("audio-only");
            return "audio-only";
          }
          return current;
        });
        consecutiveBadSamples = 0;
      } else if (consecutiveGoodSamples >= 5) {
        setQuality((current) => {
          if (current === "audio-only") {
            applyQualityProfile("medium");
            return "medium";
          }
          if (current === "medium") {
            applyQualityProfile("high");
            return "high";
          }
          return current;
        });
        consecutiveGoodSamples = 0;
      }
    }, 4000);
  }, [applyQualityProfile]);

  const setupDataChannelHandlers = useCallback((channel: RTCDataChannel) => {
    channel.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "chat") {
          setChatMessages((prev) => [...prev, { from: "peer", text: payload.text, at: Date.now() }]);
        }
      } catch {
        // Ignore malformed frames rather than crashing the call.
      }
    };
    dataChannelRef.current = channel;
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") return;
    channel.send(JSON.stringify({ type: "chat", text }));
    setChatMessages((prev) => [...prev, { from: "me", text, at: Date.now() }]);
  }, []);

  const toggleMic = useCallback(() => {
    setMicMuted((prev) => {
      const next = !prev;
      localStream?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    setCameraOff((prev) => {
      const next = !prev;
      localStream?.getVideoTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, [localStream]);

  const cleanup = useCallback(async () => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];

    pcRef.current?.close();
    pcRef.current = null;

    localStream?.getTracks().forEach((t) => t.stop());

    // Ephemeral by design: the room's signaling data is deleted from
    // Firestore the moment the call ends, so nothing about the call
    // persists server-side.
    try {
      const roomRef = doc(db, "rooms", roomId);
      const callerCandidates = await getDocs(collection(roomRef, "callerCandidates"));
      const calleeCandidates = await getDocs(collection(roomRef, "calleeCandidates"));
      await Promise.all([
        ...callerCandidates.docs.map((d) => deleteDoc(d.ref)),
        ...calleeCandidates.docs.map((d) => deleteDoc(d.ref)),
      ]);
      await deleteDoc(roomRef);
    } catch {
      // Room may already be gone if the peer hung up first — fine.
    }

    setConnectionState("ended");
  }, [localStream, roomId]);

  const start = useCallback(async () => {
    setConnectionState("collecting-media");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    setLocalStream(stream);

    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const inboundStream = new MediaStream();
    setRemoteStream(inboundStream);
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => inboundStream.addTrack(track));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionState("connected");
        startAdaptiveBitrateMonitor();
      } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setConnectionState((current) => (current === "connected" ? "error" : current));
      }
    };

    const roomRef = doc(db, "rooms", roomId);

    if (isCaller) {
      const channel = pc.createDataChannel("croom-data");
      setupDataChannelHandlers(channel);

      const callerCandidates = collection(roomRef, "callerCandidates");
      pc.onicecandidate = (event) => {
        if (event.candidate) addDoc(callerCandidates, event.candidate.toJSON());
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(roomRef, {
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: serverTimestamp(),
      });

      setConnectionState("waiting-for-peer");

      const unsubRoom = onSnapshot(roomRef, async (snapshot) => {
        const data = snapshot.data();
        if (!pc.currentRemoteDescription && data?.answer) {
          setConnectionState("connecting");
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });
      unsubscribersRef.current.push(unsubRoom);

      const calleeCandidates = collection(roomRef, "calleeCandidates");
      const unsubCandidates = onSnapshot(calleeCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          }
        });
      });
      unsubscribersRef.current.push(unsubCandidates);
    } else {
      pc.ondatachannel = (event) => setupDataChannelHandlers(event.channel);

      const calleeCandidates = collection(roomRef, "calleeCandidates");
      pc.onicecandidate = (event) => {
        if (event.candidate) addDoc(calleeCandidates, event.candidate.toJSON());
      };

      const roomSnap = await getDoc(roomRef);
      const roomData = roomSnap.data();
      if (!roomData?.offer) {
        setConnectionState("error");
        return;
      }

      setConnectionState("connecting");
      await pc.setRemoteDescription(new RTCSessionDescription(roomData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });

      const callerCandidates = collection(roomRef, "callerCandidates");
      const unsubCandidates = onSnapshot(callerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          }
        });
      });
      unsubscribersRef.current.push(unsubCandidates);
    }
  }, [isCaller, roomId, setupDataChannelHandlers, startAdaptiveBitrateMonitor]);

  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connectionState,
    localStream,
    remoteStream,
    quality,
    micMuted,
    cameraOff,
    chatMessages,
    start,
    hangUp: cleanup,
    toggleMic,
    toggleCamera,
    sendChatMessage,
    setQualityManually: applyQualityProfile,
  };
}
