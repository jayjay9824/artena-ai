"use client";
import React, { useEffect, useState } from "react";

interface IntroSplashProps {
  onComplete: () => void;
}

export function IntroSplash({ onComplete }: IntroSplashProps) {
  // 0 = logo hidden, 1 = logo visible, 2 = fading out whole screen
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    // Phase 0 → 1: logo fades in
    const t1 = setTimeout(() => setPhase(1), 80);
    // Phase 1 → 2: hold 1.2s after fade-in (0.8s), then fade out screen
    const t2 = setTimeout(() => setPhase(2), 80 + 800 + 1200);
    // Call onComplete after fade-out (0.8s)
    const t3 = setTimeout(() => onComplete(), 80 + 800 + 1200 + 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <>
      <style>{`
        @keyframes axvela-logo-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .axvela-intro-screen {
          transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .axvela-logo-wrap {
          animation: axvela-logo-in 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          animation-play-state: paused;
        }
        .axvela-logo-wrap.playing {
          animation-play-state: running;
        }
      `}</style>

      <div
        className="axvela-intro-screen"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: phase === 2 ? 0 : 1,
          pointerEvents: phase === 2 ? "none" : "auto",
        }}
      >
        <div
          className={`axvela-logo-wrap${phase >= 1 ? " playing" : ""}`}
          style={{
            opacity: 0, // overridden by animation
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          <img
            src="/images/axvela-logo.png"
            alt="AXVELA AI"
            style={{
              width: "100%",
              maxWidth: 240,
              height: "auto",
              display: "block",
              objectFit: "contain",
            }}
            draggable={false}
          />
          <p
            style={{
              marginTop: 18,
              fontSize: 9,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "#C8C8C8",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              fontWeight: 400,
            }}
          >
            Cultural Intelligence Engine
          </p>
        </div>
      </div>
    </>
  );
}
