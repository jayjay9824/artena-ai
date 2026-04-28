"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseCameraLifecycleReturn {
  videoRef:       React.RefObject<HTMLVideoElement | null>;
  startCamera:    () => Promise<void>;
  stopCamera:     () => void;
  isCameraActive: boolean;
}

/**
 * STEP 1 — Camera stream lifecycle owner.
 *
 *   startCamera()    Acquire the rear camera and bind to videoRef.
 *   stopCamera()     Stop tracks, clear srcObject, mark inactive.
 *
 * Spec rules enforced here:
 *   • Stop tracks on unmount.
 *   • Pause when the page/tab is hidden (stop tracks, remember intent).
 *   • Resume when visible again iff the screen had requested it.
 *   • Never leave the camera running in the background.
 *
 * The internal `wantsActiveRef` carries intent across visibility
 * transitions: explicit stopCamera() clears intent so an accidental
 * tab swap can't auto-resume after the user navigated away.
 */
export function useCameraLifecycle(): UseCameraLifecycleReturn {
  const videoRef       = useRef<HTMLVideoElement>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const wantsActiveRef = useRef(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  /** Internal pause — stops tracks but preserves "wants active" intent. */
  const pauseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null; } catch { /* noop */ }
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    if (streamRef.current) return; // already running
    wantsActiveRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width:      { ideal: 1920 },
          height:     { ideal: 1080 },
          frameRate:  { ideal: 30 },
        },
        audio: false,
      });
      // The user might have toggled visibility / unmounted while gUM
      // was in flight. Honor that intent rather than racing in.
      if (!wantsActiveRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch {
      // Permission / hardware error — leave stream null, screen layer
      // surfaces the soft prompt or fallback row.
      wantsActiveRef.current = false;
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    wantsActiveRef.current = false;
    pauseStream();
  }, [pauseStream]);

  // Visibility — pause when hidden, resume when visible (intent-aware).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      if (document.hidden) {
        if (streamRef.current) pauseStream();
      } else if (wantsActiveRef.current && !streamRef.current) {
        void startCamera();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [pauseStream, startCamera]);

  // Always stop on unmount — spec: "Do not keep camera running in background."
  useEffect(() => () => {
    wantsActiveRef.current = false;
    pauseStream();
  }, [pauseStream]);

  return { videoRef, startCamera, stopCamera, isCameraActive };
}
