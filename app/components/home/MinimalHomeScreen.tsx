"use client";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ScanOrb } from "./ScanOrb";
import { HomeDock } from "./HomeDock";
import { OceanBackground } from "./OceanBackground";
import { AxvelaAIButton } from "../axvela-ai/AxvelaAIButton";
import { AxvelaAIChatModal } from "../axvela-ai/AxvelaAIChatModal";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";

/* Text constants — kept here so an i18n pass can lift them without
   chasing magic strings. The wordmark + tagline have moved to the
   logo asset (axvela-mark.png) so the home reads as a single mark
   over the ocean rather than competing layers of text. */
const TEXT = {
  scanLabel:  "SCAN",
  collection: "Collection",
  profile:    "Profile",
} as const;

/* Phase 2 activation choreography — single duration drives every
   surface so the home reads as one coordinated mode shift. */
const ACTIVATE_MS  = 600;
const ORB_RIPPLE_MS = 800;

interface Props {
  onOpenScanner:  () => void;
  onCollection:   () => void;
  onProfile:      () => void;
  /** Invisible power-user feature: clipboard paste of an image still
   *  routes through the analyze pipeline. Surface stays unchanged. */
  onFileSelected?: (file: File) => void;
}

/**
 * AXVELA AI — minimal home with Phase 2 activation transition.
 *
 *   1. Top brand mark
 *   2. ScanOrb + AXVELA AI pill stack
 *   3. Bottom dock (Collection · Profile)
 *
 * AI mode state machine (Phase 2):
 *
 *   idle           — default; aiMaterialBreath on the pill
 *   isActivating   — 600ms transition window; ripple fires, ocean
 *                    blurs/dims, orb scales up + fades, purple haze
 *                    overlays the surface
 *   isAIMode       — terminal "mode is on" flag; today we use it to
 *                    hand off to the existing chat modal. The home
 *                    stays in the dimmed/blurred state behind the
 *                    modal so reopening reads as a continuation.
 *                    Reset on modal close.
 *
 * The chat modal is the current "AI Overlay" — Phase 3 will replace
 * this with the dedicated overlay surface.
 */
export function MinimalHomeScreen({
  onOpenScanner,
  onCollection,
  onProfile,
  onFileSelected,
}: Props) {
  /* Modal mount state (existing). */
  const [axvelaOpen,   setAxvelaOpen]   = useState(false);

  /* Phase 2 activation state machine. */
  const [isActivating, setIsActivating] = useState(false);
  const [isAIMode,     setIsAIMode]     = useState(false);
  const [rippleKey,    setRippleKey]    = useState(0);

  /* Track the activation timer so unmount tears it down cleanly. */
  const activateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (activateTimerRef.current) clearTimeout(activateTimerRef.current);
  }, []);

  /* Invisible clipboard-paste path. Power users still get instant
     analyze when pasting a screenshot anywhere on the home surface. */
  useEffect(() => {
    if (!onFileSelected) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { onFileSelected(file); return; }
        }
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [onFileSelected]);

  const handleActivate = () => {
    if (isActivating || isAIMode) return;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
    } catch { /* unsupported — silent */ }

    setRippleKey(k => k + 1);
    setIsActivating(true);
    activateTimerRef.current = setTimeout(() => {
      setIsActivating(false);
      setIsAIMode(true);
      setAxvelaOpen(true);  // hands off to existing chat overlay
      activateTimerRef.current = null;
    }, ACTIVATE_MS);
  };

  const handleModalClose = () => {
    setAxvelaOpen(false);
    // Drop AI mode so the button reactivates and the home returns
    // to its idle state. Phase 3 may keep AI mode "on" longer.
    setIsAIMode(false);
  };

  // Drive every surface from one boolean — keeps the choreography
  // synced even if state transitions race.
  const isModeOn = isActivating || isAIMode;

  /* Animation knob bundles per surface. Centralizing them here
     keeps the JSX legible and makes the choreography easy to tune. */
  const oceanAnim = isModeOn
    ? { scale: 1.05, filter: "blur(12px)", opacity: 0.40 }
    : { scale: 1,    filter: "blur(0px)",  opacity: 1.00 };

  const orbAnim = isModeOn
    ? { scale: 1.10, opacity: 0.65 }
    : { scale: 1,    opacity: 1    };

  const dimAnim = isModeOn
    ? { opacity: 0.35 }
    : { opacity: 1    };

  const transition = { duration: ACTIVATE_MS / 1000, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div style={{
      width:        "100%",
      maxWidth:     430,
      margin:       "0 auto",
      minHeight:    "100dvh",
      background:   "#0E3E5F",
      position:     "relative",
      overflow:     "hidden",
      fontFamily:   FONT,
      display:      "flex",
      flexDirection: "column",
      alignItems:   "center",
      paddingBottom: "calc(140px + env(safe-area-inset-bottom, 0px))",
    }}>
      {/* ── 0. Aerial ocean background — wrapped so activation can
              scale + blur + dim it as one unit. ────────────────── */}
      <motion.div
        animate={oceanAnim}
        transition={transition}
        style={{
          position: "absolute",
          inset:    0,
          zIndex:   0,
          willChange: "transform, filter, opacity",
        }}
      >
        <OceanBackground />
      </motion.div>

      {/* ── 1. Top brand mark (logo, no wordmark text) ──────────── */}
      <motion.a
        href="/"
        aria-label="AXVELA AI"
        animate={dimAnim}
        transition={transition}
        style={{
          display:        "block",
          textDecoration: "none",
          marginTop:      "calc(56px + env(safe-area-inset-top, 0px))",
          position:       "relative" as const,
          zIndex:         1,
          lineHeight:     0,
          willChange:     "opacity",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/axvela-mark.png"
          alt="AXVELA AI"
          width={140}
          height={140}
          style={{
            display:   "block",
            width:     140,
            height:    140,
            objectFit: "contain",
            filter:    "drop-shadow(0 2px 12px rgba(0,0,0,0.18))",
          }}
        />
      </motion.a>

      {/* ── 2. Center stack — ScanOrb + AXVELA AI pill ──────────────
              z-index 100 so the pill remains the still center of
              the activation transition, sitting above the
              fixed-position purple haze (z 50) and the dock
              (also z 50). The orb fades to 0.65 opacity but
              still paints above the haze, letting the haze
              tint read through it. ─────────────────────────── */}
      <div style={{
        flex:           1,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "flex-start",
        width:          "100%",
        paddingTop:     16,
        gap:            6,
        position:       "relative" as const,
        zIndex:         100,
      }}>
        {/* Orb wrapper — animates scale/opacity, hosts a one-shot
            ripple ring keyed off rippleKey. */}
        <motion.div
          animate={orbAnim}
          transition={transition}
          style={{
            position:  "relative",
            willChange: "transform, opacity",
          }}
        >
          <ScanOrb onClick={onOpenScanner} label={TEXT.scanLabel} />

          <AnimatePresence>
            {rippleKey > 0 && (
              <motion.span
                key={`orb-ripple-${rippleKey}`}
                initial={{ scale: 0.9, opacity: 0.25 }}
                animate={{ scale: 1.6, opacity: 0    }}
                exit={{    opacity: 0 }}
                transition={{ duration: ORB_RIPPLE_MS / 1000, ease: "easeOut" }}
                aria-hidden
                style={{
                  position:      "absolute",
                  inset:         0,
                  borderRadius:  "50%",
                  border:        "1px solid rgba(168, 85, 247, 0.45)",
                  pointerEvents: "none",
                  willChange:    "transform, opacity",
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Pill — Phase 2 wires onActivate (state machine) instead
            of opening the modal directly. The button stays at full
            opacity / its idle scale so it reads as the focal
            point during the dim shift. */}
        <AxvelaAIButton
          onActivate={handleActivate}
          disabled={isModeOn}
          rippleKey={rippleKey}
        />
      </div>

      {/* ── 3. Bottom dock — Collection · Profile ───────────────── */}
      <motion.div
        animate={dimAnim}
        transition={transition}
        style={{
          position: "relative",
          zIndex:   1,
          willChange: "opacity",
        }}
      >
        <HomeDock
          onCollection={onCollection}
          onProfile={onProfile}
          collectionLabel={TEXT.collection}
          profileLabel={TEXT.profile}
        />
      </motion.div>

      {/* ── 4. Purple haze overlay — sits above the dimmed home
              + dock, but below the still-bright center stack
              (z-100). Renders as the activation light bath that
              the pill is the source of. ────────────────────── */}
      <AnimatePresence>
        {isModeOn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.30 }}
            exit={{    opacity: 0 }}
            transition={{ duration: ACTIVATE_MS / 1000, ease: "easeOut" }}
            aria-hidden
            style={{
              position:      "fixed",
              inset:         0,
              zIndex:        50,
              pointerEvents: "none",
              background:
                "radial-gradient(circle at 50% 55%, rgba(168, 85, 247, 0.55) 0%, rgba(168, 85, 247, 0) 70%)",
              willChange:    "opacity",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── 5. AXVELA AI chat modal (current AI Overlay stand-in) */}
      <AxvelaAIChatModal open={axvelaOpen} onClose={handleModalClose} />
    </div>
  );
}
