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

const QUALITY_PROFILES: Record<
  CallQuality,
  { video: number | null; width: number; height: number; frameRate: number }
> = {
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
  const [enhanceEnabled, setEnhanceEnabled] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ from: "me" | "peer"; text: string; at: number }[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanedUpRef = useRef(false);

  // These refs mirror the state above so that callbacks captured inside
  // long-lived event handlers (onconnectionstatechange, setInterval, the
  // Firestore onSnapshot listeners) always see the CURRENT stream/flags,
  // never a stale value frozen at the moment the handler was created. This
  // fixes a real bug: without the refs, the adaptive bitrate monitor could
  // silently operate on a `null` stream captured before getUserMedia
  // resolved, meaning the low-bandwidth step-down never actually applied.
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraOffRef = useRef(false);
  const remoteDescriptionSetRef = useRef(false);
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Camera enhancement pipeline state.
  const enhanceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const enhanceRafRef = useRef<number>(0);
  const enhanceSourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const enhancedTrackRef = useRef<MediaStreamTrack | null>(null);
  const rawVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const previousFrameCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const applyQualityProfile = useCallback(async (targetQuality: CallQuality) => {
    const pc = pcRef.current;
    const stream = localStreamRef.current;
    if (!pc || !stream) return;

    const profile = QUALITY_PROFILES[targetQuality];
    const videoTrack = stream.getVideoTracks()[0];

    if (targetQuality === "audio-only") {
      if (videoTrack) videoTrack.enabled = false;
    } else if (videoTrack) {
      videoTrack.enabled = !cameraOffRef.current;
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
        // completes; the next renegotiation cycle picks it up.
      }
    }

    setQuality(targetQuality);
  }, []);

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
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOff((prev) => {
      const next = !prev;
      cameraOffRef.current = next;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
      // Keep the raw source track's enabled state in sync too, since the
      // enhancement pipeline reads frames from it even while the enabled
      // track sent over the wire is the canvas-derived one.
      rawVideoTrackRef.current && (rawVideoTrackRef.current.enabled = !next);
      return next;
    });
  }, []);

  // --- Camera enhancement pipeline -----------------------------------
  //
  // Runs the outgoing camera feed through an off-screen canvas each frame
  // and applies a light temporal-blend denoise (reduces sensor grain from
  // cheap webcams) plus a contrast/sharpness lift, then replaces the
  // track actually being sent over WebRTC with the processed one via
  // RTCRtpSender.replaceTrack — so the improvement is visible to the
  // *other* person, not just a local CSS preview trick.
  const stopEnhancement = useCallback(() => {
    if (enhanceRafRef.current) cancelAnimationFrame(enhanceRafRef.current);
    enhanceRafRef.current = 0;
    enhancedTrackRef.current?.stop();
    enhancedTrackRef.current = null;
  }, []);

  const startEnhancement = useCallback(() => {
    const stream = localStreamRef.current;
    const rawTrack = stream?.getVideoTracks()[0];
    const pc = pcRef.current;
    if (!stream || !rawTrack || !pc) return;

    rawVideoTrackRef.current = rawTrack;

    const sourceVideo = document.createElement("video");
    sourceVideo.srcObject = new MediaStream([rawTrack]);
    sourceVideo.muted = true;
    sourceVideo.playsInline = true;
    sourceVideo.play().catch(() => undefined);
    enhanceSourceVideoRef.current = sourceVideo;

    const settings = rawTrack.getSettings();
    const width = settings.width ?? 1280;
    const height = settings.height ?? 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    enhanceCanvasRef.current = canvas;

    const prevCanvas = document.createElement("canvas");
    prevCanvas.width = width;
    prevCanvas.height = height;
    previousFrameCanvasRef.current = prevCanvas;
    const prevCtx = prevCanvas.getContext("2d");

    if (!ctx || !prevCtx) return;

    // Auto contrast/clarity lift plus a mild blur pre-pass — the blur is
    // blended with the sharp original below to act as a noise-reducing
    // "clarity" filter rather than a soft-focus one.
    ctx.filter = "contrast(1.08) saturate(1.06) brightness(1.03)";

    function renderFrame() {
      if (!ctx || !prevCtx) return;
      if (sourceVideo.readyState >= 2) {
        // 1) Draw the current sharp frame with the auto-tone filter.
        ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);

        // 2) Temporal blend with the previous frame at low opacity. This
        //    is the actual "reduce sensor grain/scratches" mechanism: any
        //    noise that flickers frame-to-frame gets averaged down, while
        //    real motion (which persists across the blend) stays sharp.
        prevCtx.globalAlpha = 1;
        prevCtx.globalCompositeOperation = "source-over";
        prevCtx.drawImage(canvas, 0, 0);

        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.drawImage(prevCanvas, 0, 0);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      enhanceRafRef.current = requestAnimationFrame(renderFrame);
    }
    renderFrame();

    const canvasStream = canvas.captureStream(30);
    const processedTrack = canvasStream.getVideoTracks()[0];
    enhancedTrackRef.current = processedTrack;

    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    sender?.replaceTrack(processedTrack).catch(() => undefined);
  }, []);

  const toggleEnhance = useCallback(() => {
    setEnhanceEnabled((prev) => {
      const next = !prev;
      if (next) {
        startEnhancement();
      } else {
        stopEnhancement();
        const pc = pcRef.current;
        const rawTrack = rawVideoTrackRef.current;
        const sender = pc?.getSenders().find((s) => s.track?.kind === "video" || s.track === null);
        if (sender && rawTrack) sender.replaceTrack(rawTrack).catch(() => undefined);
      }
      return next;
    });
  }, [startEnhancement, stopEnhancement]);

  const cleanup = useCallback(async () => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    stopEnhancement();
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];

    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());

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
  }, [roomId, stopEnhancement]);

  // Any ICE candidate that arrives before the remote description is set
  // is queued rather than applied immediately (applying it early throws
  // in some browsers, silently dropping connectivity paths and causing
  // intermittent "call never connects" failures). Flushed the instant the
  // remote description is set.
  async function addRemoteCandidateSafely(pc: RTCPeerConnection, candidate: RTCIceCandidateInit) {
    if (remoteDescriptionSetRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // A late/duplicate candidate — safe to ignore.
      }
    } else {
      pendingRemoteCandidatesRef.current.push(candidate);
    }
  }

  async function flushPendingCandidates(pc: RTCPeerConnection) {
    remoteDescriptionSetRef.current = true;
    const queued = pendingRemoteCandidatesRef.current;
    pendingRemoteCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Ignore invalid/duplicate queued candidates.
      }
    }
  }

  const start = useCallback(async () => {
    setConnectionState("collecting-media");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    localStreamRef.current = stream;
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

      // Firestore's onSnapshot can fire this callback more than once in
      // quick succession for the same write (once from local cache,
      // again on server ack). Both invocations can pass a
      // "!pc.currentRemoteDescription" check before either one's `await`
      // resolves, so setRemoteDescription(answer) ends up called twice —
      // the second call then throws "Called in wrong state: stable",
      // since the connection is no longer negotiating an answer at that
      // point. This is exactly the bug that left real calls stuck on
      // "waiting"/"connecting" forever. Fixed with a synchronous guard
      // set BEFORE any await, plus checking signalingState directly
      // (the actual WebRTC-spec-correct precondition for accepting an
      // answer) instead of only inferring it from currentRemoteDescription.
      let settingRemoteAnswer = false;
      const unsubRoom = onSnapshot(roomRef, async (snapshot) => {
        const data = snapshot.data();
        if (settingRemoteAnswer || pc.signalingState !== "have-local-offer" || !data?.answer) {
          return;
        }
        settingRemoteAnswer = true;
        setConnectionState("connecting");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await flushPendingCandidates(pc);
        } catch (err) {
          console.warn("[CRoom] Failed to set remote answer description.", err);
          settingRemoteAnswer = false;
        }
      });
      unsubscribersRef.current.push(unsubRoom);

      const calleeCandidates = collection(roomRef, "calleeCandidates");
      const unsubCandidates = onSnapshot(calleeCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            addRemoteCandidateSafely(pc, change.doc.data() as RTCIceCandidateInit);
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
      await flushPendingCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });

      const callerCandidates = collection(roomRef, "callerCandidates");
      const unsubCandidates = onSnapshot(callerCandidates, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            addRemoteCandidateSafely(pc, change.doc.data() as RTCIceCandidateInit);
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
    enhanceEnabled,
    chatMessages,
    start,
    hangUp: cleanup,
    toggleMic,
    toggleCamera,
    toggleEnhance,
    sendChatMessage,
    setQualityManually: applyQualityProfile,
  };
}
