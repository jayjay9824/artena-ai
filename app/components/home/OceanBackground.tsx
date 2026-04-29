"use client";
import React from "react";

/**
 * Aerial Pacific drone-shot ocean as a calm motion backdrop for the
 * Home surface. Plays muted on loop. Sits behind every other home
 * block at z-index 0; UI content layers on top at z-index 1+.
 *
 * Asset path:  public/videos/ocean.mp4
 *   - 1920×1080, h.264, ~10 s loop is plenty
 *   - Keep file < 8 MB so first paint isn't blocked
 *   - Drone shot looking straight down (top-down) for the spec feel
 *
 * If the video file is missing, the deep-ocean gradient + animated
 * caustic shimmer renders instead — the screen never looks broken.
 */
export function OceanBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset:    0,
        zIndex:   0,
        overflow: "hidden",
        // Fallback gradient — visible when the .mp4 is missing or
        // still loading. Pacific deep-blue with a soft sun-glint
        // toward the upper-left to mimic an aerial drone framing.
        background:
          "radial-gradient(ellipse at 30% 18%, rgba(255,255,255,0.18), rgba(255,255,255,0) 55%), " +
          "linear-gradient(180deg, #0E3E5F 0%, #114E73 35%, #0A3953 100%)",
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src="/videos/ocean.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        // poster keeps the gradient as the LCP frame on slow networks
        poster=""
        style={{
          position:   "absolute",
          inset:      0,
          width:      "100%",
          height:     "100%",
          objectFit:  "cover",
          // Slightly desaturated + soft brightness so the UI on top
          // (orb, brand mark, dock) stays clearly legible.
          filter:     "saturate(0.9) brightness(0.92)",
          // Mobile Safari sometimes flickers without this hint.
          transform:  "translateZ(0)",
        }}
      />

      {/* CSS-only shimmer that animates over the gradient when no
          video plays. Cheap, GPU-only, and harmless when the video
          covers it. */}
      <div
        style={{
          position: "absolute",
          inset:    0,
          background:
            "radial-gradient(ellipse 90% 30% at 50% 30%, rgba(255,255,255,0.10), rgba(255,255,255,0) 70%)",
          mixBlendMode: "screen",
          animation:    "ocean-shimmer 7s ease-in-out infinite",
        }}
      />

      {/* Soft white veil + vertical fade so black brand text + dock
          stay readable on the deep-blue surface. Keeps the ocean
          subtle, not theatrical. */}
      <div
        style={{
          position: "absolute",
          inset:    0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.10) 60%, rgba(255,255,255,0.45) 100%)",
        }}
      />

      <style>{`
        @keyframes ocean-shimmer {
          0%, 100% { transform: translate3d(0, 0, 0)    scale(1);    opacity: 0.55; }
          50%      { transform: translate3d(0, -1.2%, 0) scale(1.04); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
