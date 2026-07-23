"use client";

import { useEffect, useRef, useState } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

export type ScanFeedback = { type: "success" | "error"; message: string };

// Full-screen phone-camera barcode scanner. Scans continuously (does not
// close itself after one hit) so a cashier can ring up a whole basket by
// scanning items back-to-back without reopening this modal each time.
export default function BarcodeScanModal({
  feedback,
  onDetect,
  onClose,
}: {
  feedback: ScanFeedback | null;
  onDetect: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result, _err, controls) => {
        controlsRef.current = controls;
        if (cancelled || !result) return;
        const code = result.getText();
        const now = Date.now();
        // ZXing re-fires this callback every frame the code is in view — debounce
        // repeats of the same code so one scan doesn't add the item many times.
        const last = lastCodeRef.current;
        if (last && last.code === code && now - last.at < 2000) return;
        lastCodeRef.current = { code, at: now };
        onDetect(code);
      })
      .catch((err) => {
        if (!cancelled) setCameraError(err instanceof Error ? err.message : "Camera unavailable");
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    onDetect(code);
    setManualCode("");
  }

  return (
    <div className="fixed inset-0 z-70 flex flex-col" style={{ background: "#000" }}>
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />

      <div
        className="relative z-10 flex items-center justify-between px-4 h-14"
        style={{ background: "rgba(0,0,0,0.55)" }}
      >
        <span className="text-sm font-semibold text-white">Scan barcode</span>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <X size={16} className="text-white" />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center">
        <div
          className="h-56 w-72 max-w-[80%] rounded-2xl"
          style={{ border: "3px solid rgba(255,255,255,0.85)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }}
        />
      </div>

      {feedback && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ background: feedback.type === "success" ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)" }}
        >
          <div className="flex flex-col items-center gap-2 text-white">
            {feedback.type === "success" ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
            <span className="text-sm font-semibold">{feedback.message}</span>
          </div>
        </div>
      )}

      {cameraError && (
        <div className="relative z-10 px-4 py-2 text-xs text-center" style={{ color: "#fca5a5", background: "rgba(0,0,0,0.6)" }}>
          Camera unavailable ({cameraError}). Type the barcode below instead.
        </div>
      )}

      <form onSubmit={handleManualSubmit} className="relative z-10 flex gap-2 p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Or type barcode…"
          inputMode="numeric"
          className="flex-1 rounded-xl px-4 h-11 text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
        />
        <button
          type="submit"
          className="rounded-xl px-4 h-11 text-sm font-semibold text-white"
          style={{ background: "var(--brand)" }}
        >
          Add
        </button>
      </form>
    </div>
  );
}
