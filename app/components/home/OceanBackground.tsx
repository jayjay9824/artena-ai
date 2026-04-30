"use client";
import React, { useEffect, useRef } from "react";

/**
 * Aerial Pacific drone-shot ocean as a calm motion backdrop for the
 * Home surface. Plays muted on loop. Sits behind every other home
 * block at z-index 0; UI content layers on top at z-index 1+.
 *
 * Asset path:  public/videos/ocean.mp4
 *   - 1920×1080, h.264 / mp4 (browser-safe)
 *   - Top-down drone framing, calm wave motion
 *
 * Why this needs an explicit play() call: muted+playsInline lets the
 * browser autoplay, but iOS Safari and some Android Chrome builds
 * still block the first frame until a user interaction happens.
 * Force-playing on mount + on first touch gives the most reliable
 * cold start across mobile browsers.
 *
 * If the video file is missing, the deep-ocean gradient fallback
 * paints in its place so the screen never looks broken.
 */
export function OceanBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    // First attempt — most browsers honor this.
    tryPlay();

    // Safety net: attempt again on the first user gesture for
    // browsers that block muted autoplay until interaction.
    const onGesture = () => {
      tryPlay();
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("click",      onGesture);
    };
    document.addEventListener("touchstart", onGesture, { once: true, passive: true });
    document.addEventListener("click",      onGesture, { once: true });

    return () => {
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("click",      onGesture);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset:    0,
        zIndex:   1,
        overflow: "hidden",
        // Decorative — never captures taps. Inner gradient veil
        // already opts out, but the outer wrapper hosts the <video>
        // element which is pointer-active by default; explicit
        // pointer-events:none guarantees the ocean can't intercept
        // a button tap above it.
        pointerEvents: "none",
        // Fallback only — visible while the video buffers or if the
        // file is missing. Pacific deep-blue with a soft sun glint.
        background:
          "radial-gradient(ellipse at 30% 18%, rgba(255,255,255,0.18), rgba(255,255,255,0) 55%), " +
          "linear-gradient(180deg, #0E3E5F 0%, #114E73 35%, #0A3953 100%)",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        // Browser support quirks — order matters: source > src attr.
        // Some Android builds prefer an explicit <source>.
        style={{
          position:   "absolute",
          inset:      0,
          width:      "100%",
          height:     "100%",
          objectFit:  "cover",
          // Light desaturation; readability comes from the gradient
          // veils above, not from dimming the video itself.
          filter:     "saturate(0.95)",
          transform:  "translateZ(0)",
        }}
      >
        <source src="/videos/ocean.mp4" type="video/mp4" />
      </video>

      {/* Top + bottom veils only. The middle band — where the scan
          orb sits — stays fully open so the ocean motion reads
          clearly behind the CTA. */}
      <div
        style={{
          position: "absolute",
          inset:    0,
          pointerEvents: "none" as const,
          background:
            "linear-gradient(180deg, " +
              "rgba(255,255,255,0.35) 0%, " +
              "rgba(255,255,255,0) 22%, " +
              "rgba(255,255,255,0) 78%, " +
              "rgba(255,255,255,0.30) 100%)",
        }}
      />
    </div>
  );
}
