"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  cameraEnabled: boolean;
  onCameraEnabledChange: (v: boolean) => void;
  micEnabled: boolean;
  onMicEnabledChange: (v: boolean) => void;
  noiseSuppression: boolean;
  onNoiseSuppressionChange: (v: boolean) => void;
  micGain: number;
  onMicGainChange: (v: number) => void;
}

export default function DeviceSettings({
  cameraEnabled,
  onCameraEnabledChange,
  micEnabled,
  onMicEnabledChange,
  noiseSuppression,
  onNoiseSuppressionChange,
  micGain,
  onMicGainChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let raf = 0;

    async function requestDevices() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraEnabled,
          audio: micEnabled ? { noiseSuppression } : false,
        });
        setPreviewStream(stream);
        setPermissionError(null);
        if (videoRef.current) videoRef.current.srcObject = stream;

        if (micEnabled && stream.getAudioTracks().length) {
          audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);

          const tick = () => {
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setLevel(Math.min(1, avg / 90));
            raf = requestAnimationFrame(tick);
          };
          tick();
        }
      } catch (err) {
        setPermissionError(
          "Camera or microphone access was blocked. Allow access in your browser's site settings to continue."
        );
      }
    }

    requestDevices();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      audioContext?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEnabled, micEnabled, noiseSuppression]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="relative aspect-video overflow-hidden rounded-tile bg-ink shadow-tile sm:col-span-2">
        {cameraEnabled && previewStream ? (
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-paper/50">
            Camera preview off
          </div>
        )}
        {permissionError && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/95 px-6 text-center text-sm text-paper/80">
            {permissionError}
          </div>
        )}
      </div>

      <ToggleTile
        label="Camera"
        description={cameraEnabled ? "Your video will be visible to callers" : "Camera is off for this session"}
        active={cameraEnabled}
        onToggle={() => onCameraEnabledChange(!cameraEnabled)}
      />
      <ToggleTile
        label="Microphone"
        description={micEnabled ? "Your audio will be shared" : "You'll join muted"}
        active={micEnabled}
        onToggle={() => onMicEnabledChange(!micEnabled)}
      />

      <div className="rounded-tile border border-hairline bg-white p-4 shadow-tile">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Microphone input gain</span>
          <span className="text-sm text-sage">{Math.round(micGain * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={micGain}
          onChange={(e) => onMicGainChange(parseFloat(e.target.value))}
          className="mt-3 w-full accent-coral"
          disabled={!micEnabled}
        />
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-hairline">
          <div
            className="h-full bg-coral transition-[width] duration-100"
            style={{ width: `${level * 100}%` }}
          />
        </div>
      </div>

      <ToggleTile
        label="Noise suppression"
        description="Reduces background noise from your microphone"
        active={noiseSuppression}
        onToggle={() => onNoiseSuppressionChange(!noiseSuppression)}
        disabled={!micEnabled}
      />
    </div>
  );
}

function ToggleTile({
  label,
  description,
  active,
  onToggle,
  disabled,
}: {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="tactile flex flex-col items-start rounded-tile border border-hairline bg-white p-4 text-left shadow-tile disabled:opacity-50"
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span
          className={`relative h-5 w-9 rounded-pill transition-colors ${active ? "bg-coral" : "bg-hairline"}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              active ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </div>
      <p className="mt-1 text-xs text-sage">{description}</p>
    </button>
  );
}
