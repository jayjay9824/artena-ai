"use client";
import React, { useEffect, useRef, useState } from "react";
import { isKakaoInApp } from "../../utils/browserDetect";

/**
 * Intro splash gated by background readiness.
 *
 * The KakaoTalk in-app browser used to flash a white frame between
 * intro fade-out and home paint because the ocean background was
 * still decoding when the intro disappeared. The fix: hold the
 * intro until BOTH gates clear:
 *
 *   1. backgroundReady   — ocean poster has loaded (or errored)
 *   2. minIntroElapsed   — minimum dwell time for brand presence
 *
 * Whichever resolves last triggers a single rAF, then the fade-out
 * begins. A separate safety timeout caps the wait at 8s so a slow
 * network can't lock the user on the splash.
 *
 * After fade duration the overlay unmounts (introMounted = false)
 * so it never lingers in the DOM and never blocks clicks.
 *
 * Visual / brand layout intentionally unchanged — only the timing
 * gate and unmount lifecycle were touched.
 */

interface IntroSplashProps {
  /**
   * Fired the moment both gates clear and the fade-out is about to
   * begin (one rAF before phase transitions to 2). Parents use this
   * to flip the Home layer's opacity so Intro and Home cross-fade
   * over the same window — Home is fully painted (with its ocean
   * background) before Intro disappears.
   */
  onReady?:    () => void;
  onComplete:  () => void;
}

const FADE_DURATION_MS     = 800;
const LOGO_FADE_IN_DELAY_MS = 80;
const SAFETY_TIMEOUT_MS    = 8000;
const MIN_INTRO_MS_KAKAO   = 4500;
const MIN_INTRO_MS_DEFAULT = 3000;
const OCEAN_PRELOAD_SRC    = "/ocean-background.jpg";

export function IntroSplash({ onReady, onComplete }: IntroSplashProps) {
  // 0 = logo hidden, 1 = logo visible, 2 = fading out whole screen
  const [phase,           setPhase]           = useState<0 | 1 | 2>(0);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [minIntroElapsed, setMinIntroElapsed] = useState(false);
  const [introDone,       setIntroDone]       = useState(false);
  const [introMounted,    setIntroMounted]    = useState(true);
  // Mount-fade gate — initial render has the splash at opacity 0
  // so the body's dark ocean shows through. One rAF later we flip
  // to 1, letting the existing 800ms opacity transition cross-fade
  // the white intro UP from the ocean. Kills the "ocean → flash of
  // white" hard cut the user reported in KakaoTalk WebView.
  const [introFadedIn,    setIntroFadedIn]    = useState(false);

  // Stable handles so the lifecycle effects don't re-fire on
  // identity changes from the parent.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onReadyRef    = useRef(onReady);
  onReadyRef.current  = onReady;

  /* Mount fade-in — defer to next frame so the SSR/initial paint
   * has the splash at opacity 0 (ocean shows through), then
   * triggers the CSS opacity transition to 1. */
  useEffect(() => {
    const r = requestAnimationFrame(() => setIntroFadedIn(true));
    return () => cancelAnimationFrame(r);
  }, []);

  /* Phase 0 → 1 — kick off the logo fade-in. Timing unchanged. */
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), LOGO_FADE_IN_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  /* Preload ocean background. Both onload AND onerror flip the
   * gate (rule 3 — never lock the intro on a missing asset). The
   * complete-check covers the cached-image case where onload would
   * fire before the listener attached. */
  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      setBackgroundReady(true);
    };
    const img = new window.Image();
    img.onload  = finish;
    img.onerror = finish;
    img.src     = OCEAN_PRELOAD_SRC;
    if (img.complete && img.naturalWidth > 0) finish();
    return () => { img.onload = null; img.onerror = null; };
  }, []);

  /* Minimum dwell — KakaoTalk in-app gets a longer hold so its
   * paint cadence has room to settle. */
  useEffect(() => {
    const minMs = isKakaoInApp() ? MIN_INTRO_MS_KAKAO : MIN_INTRO_MS_DEFAULT;
    const t = setTimeout(() => setMinIntroElapsed(true), minMs);
    return () => clearTimeout(t);
  }, []);

  /* Safety net — force-release both gates after 8s so the user
   * can never get stuck. */
  useEffect(() => {
    const t = setTimeout(() => {
      setBackgroundReady(true);
      setMinIntroElapsed(true);
    }, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  /* Compose the gates. One rAF ensures the home tree behind the
   * splash gets a paint cycle for its ocean before we begin
   * fading the white overlay. */
  useEffect(() => {
    if (introDone) return;
    if (!backgroundReady || !minIntroElapsed) return;
    const raf = requestAnimationFrame(() => {
      // Signal the parent BEFORE we begin our own fade so the
      // Home layer opacity ramp and the Intro fade share the same
      // 800ms window — that's the cross-fade.
      onReadyRef.current?.();
      setIntroDone(true);
      setPhase(2);
    });
    return () => cancelAnimationFrame(raf);
  }, [backgroundReady, minIntroElapsed, introDone]);

  /* After fade completes — unmount the overlay and notify caller.
   * Unmount is the hard guarantee that the intro can't keep
   * blocking pointer events even if a stale opacity sticks. */
  useEffect(() => {
    if (!introDone) return;
    const t = setTimeout(() => {
      setIntroMounted(false);
      onCompleteRef.current();
    }, FADE_DURATION_MS);
    return () => clearTimeout(t);
  }, [introDone]);

  if (!introMounted) return null;

  return (
    <>
      <style>{`
        @keyframes axvela-logo-in {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .axvela-intro-screen {
          transition: opacity ${FADE_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1);
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
        // While fading out the splash is hidden from assistive tech
        // and stops intercepting pointer events, but stays in the
        // tree until its 800ms transition completes.
        aria-hidden={phase === 2}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // Three-state opacity: 0 on first paint (ocean visible),
          // 1 once mount-rAF fires (cross-fades white up), 0 again
          // on phase 2 (cross-fades back down to home).
          opacity:
            phase === 2     ? 0
            : introFadedIn  ? 1
            :                 0,
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
            Cultural Intelligence
          </p>
        </div>
      </div>
    </>
  );
}
