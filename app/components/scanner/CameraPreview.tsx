"use client";
import React from "react";

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * STEP 1 — Full-screen camera preview surface.
 *
 * Pure presentation — the owning screen runs useCameraLifecycle and
 * binds the returned videoRef here. Object-fit:cover so the preview
 * fills the screen without letterboxing on mobile aspect ratios.
 */
export function CameraPreview({ videoRef }: Props) {
  return (
    <video
      // React 18 type bridge — useRef<HTMLVideoElement>(null) infers
      // RefObject<HTMLVideoElement | null>; <video> wants the
      // non-nullable RefObject. Same pattern as the legacy
      // analyze/components/SmartScanner.tsx.
      ref={videoRef as React.RefObject<HTMLVideoElement>}
      autoPlay
      muted
      playsInline
      style={{
        position:   "absolute",
        inset:      0,
        width:      "100%",
        height:     "100%",
        objectFit:  "cover",
        background: "#0D0D0D",
      }}
    />
  );
}
