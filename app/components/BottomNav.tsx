"use client";
import React from "react";
import { useTabNav, AppTab } from "../context/TabContext";
import { useAIOverlay } from "../context/AIOverlayContext";
import { useLanguage } from "../i18n/useLanguage";
import { safeT, type TranslationFn } from "../lib/i18n/safeT";

/**
 * 3-column bottom navigation — [Collection] [AXVELA AI] [Profile].
 *
 * FIXES v3 Step 9:
 *   - Floating AxvelaAIButton (previously stacked over the bottom
 *     nav from MinimalHomeScreen) is gone; the AI entry point now
 *     lives here as the middle tab and triggers the globally-mounted
 *     AIModeOverlay via AIOverlayContext.
 *   - One stable 3-column grid; each tab's hit-area is exactly its
 *     own 1/3 column (no overlapping FAB or floating pill).
 *   - Safe-area inset preserved at the bottom.
 *   - The legacy "scan" tab is no longer surfaced here. Scan is
 *     reached via the SCAN orb on /analyze — the home page.
 *
 * Routes used:
 *   Collection → /collection (existing)
 *   Profile    → /my (existing — labelled "Profile" / "프로필")
 *   AXVELA AI  → no route; opens the global overlay
 */

const ROUTES: Record<AppTab, string> = {
  scan:            "/analyze",
  collection:      "/collection",
  taste:           "/taste",
  recommendations: "/recommendations",
  gallery:         "/gallery",
  my:              "/my",
};

interface BottomNavProps {
  /**
   * Current section. "ai" is a virtual tab that is never the
   * "active" highlighted state because the AI surface is an
   * overlay — the underlying page (Collection / Profile / Scan)
   * stays the source of truth for which side tab is active.
   */
  currentTab: AppTab;
}

const FONT          = "'KakaoSmallSans', system-ui, sans-serif";
const SIDE_INACTIVE = "#BBBBBB";
const SIDE_ACTIVE   = "#0D0D0D";
const AI_INACTIVE   = "#5C5042";
const AI_ACTIVE     = "#A855F7"; // brand violet — only when overlay open

export function BottomNav({ currentTab }: BottomNavProps) {
  const { goTo, inShell } = useTabNav();
  const { t }             = useLanguage();
  const { isAIMode, openAI, closeAI } = useAIOverlay();

  const navigate = (tab: AppTab) => {
    if (inShell) goTo(tab);
    else         window.location.href = ROUTES[tab];
  };

  const onTapAI = () => {
    // Toggle so a second tap on the active middle tab dismisses the
    // overlay — matches the rest of the bottom-nav semantics.
    if (isAIMode) closeAI(); else openAI();
  };

  const collectionLabel = safeT(t as TranslationFn, "nav.collection", "Collection");
  const profileLabel    = safeT(t as TranslationFn, "nav.profile",    "Profile");

  return (
    <nav
      aria-label="Primary"
      style={{
        position:         "fixed",
        bottom:           0,
        left:             "50%",
        transform:        "translateX(-50%)",
        width:            "100%",
        maxWidth:         640,
        background:       "rgba(255,255,255,0.96)",
        backdropFilter:   "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop:        "0.5px solid #EBEBEB",
        display:          "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        padding:          "10px 0 calc(20px + env(safe-area-inset-bottom, 0px))",
        boxSizing:        "border-box" as const,
        zIndex:           100,
        fontFamily:       FONT,
      }}
    >
      {/* ── Collection ───────────────────────────────────────── */}
      <NavCell
        active={currentTab === "collection"}
        onClick={() => navigate("collection")}
        label={collectionLabel}
        color={currentTab === "collection" ? SIDE_ACTIVE : SIDE_INACTIVE}
      >
        <CollectionIcon filled={currentTab === "collection"} />
      </NavCell>

      {/* ── AXVELA AI (middle, opens overlay) ────────────────── */}
      <NavCell
        active={isAIMode}
        onClick={onTapAI}
        label="AXVELA AI"
        color={isAIMode ? AI_ACTIVE : AI_INACTIVE}
        ariaLabel="AXVELA AI"
        ariaExpanded={isAIMode}
        ariaHasPopup="dialog"
      >
        <AIIcon filled={isAIMode} color={isAIMode ? AI_ACTIVE : AI_INACTIVE} />
      </NavCell>

      {/* ── Profile (uses underlying "my" tab + /my route) ───── */}
      <NavCell
        active={currentTab === "my"}
        onClick={() => navigate("my")}
        label={profileLabel}
        color={currentTab === "my" ? SIDE_ACTIVE : SIDE_INACTIVE}
      >
        <ProfileIcon filled={currentTab === "my"} />
      </NavCell>
    </nav>
  );
}

/* ── Cell (full-width, click-only-in-its-1/3-column) ─────────── */

function NavCell({
  active,
  onClick,
  label,
  color,
  children,
  ariaLabel,
  ariaExpanded,
  ariaHasPopup,
}: {
  active:        boolean;
  onClick:       () => void;
  label:         string;
  color:         string;
  children:      React.ReactNode;
  ariaLabel?:    string;
  ariaExpanded?: boolean;
  ariaHasPopup?: "dialog" | "menu";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      style={{
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        gap:             4,
        width:           "100%",
        minWidth:        0,
        height:          "100%",
        padding:         "4px 8px",
        background:      "transparent",
        border:          "none",
        cursor:          "pointer",
        color,
        fontFamily:      "inherit",
        transition:      "color .15s",
      }}
    >
      {children}
      <span style={{
        fontSize:      9.5,
        letterSpacing: ".10em",
        fontWeight:    active ? 600 : 400,
      }}>
        {label}
      </span>
    </button>
  );
}

/* ── Icons ───────────────────────────────────────────────────── */

function CollectionIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      {filled ? (
        <>
          <rect x="2.5"  y="2.5"  width="6.5" height="6.5" rx="1" fill="currentColor" />
          <rect x="11"   y="2.5"  width="6.5" height="6.5" rx="1" fill="currentColor" />
          <rect x="2.5"  y="11"   width="6.5" height="6.5" rx="1" fill="currentColor" />
          <rect x="11"   y="11"   width="6.5" height="6.5" rx="1" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="11"  y="2.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="2.5" y="11"  width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="11"  y="11"  width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        </>
      )}
    </svg>
  );
}

function ProfileIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle
        cx="10" cy="7" r="3"
        stroke="currentColor"
        strokeWidth="1.3"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.2 : 0}
      />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * AXVELA AI sparkle. Filled state lights up when the global overlay
 * is open so the middle tab visually mirrors the active surface.
 */
function AIIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3l1.5 4.5L16 9l-4.5 1.5L10 15l-1.5-4.5L4 9l4.5-1.5L10 3z"
        stroke={color}
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill={filled ? color : "none"}
        fillOpacity={filled ? 0.18 : 0}
      />
      <path
        d="M15 14l.6 1.7L17 16l-1.4.6L15 18l-.6-1.7L13 16l1.4-.6L15 14z"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
