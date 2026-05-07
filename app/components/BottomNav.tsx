"use client";
import React from "react";
import { useTabNav, AppTab } from "../context/TabContext";
import { useLanguage } from "../i18n/useLanguage";

/**
 * 3-tab bottom navigation: Collection | Scan | Profile.
 *
 * Scan sits center as a black FAB-style button — visually dominant,
 * matches the Home dotted-ring CTA. Collection / Profile are
 * low-emphasis gray icons.
 *
 * Hidden routes preserved: /taste, /recommendations, /gallery still
 * render and can be reached via direct URL or programmatic goTo —
 * just not from the bottom nav (per spec: simplify access, keep
 * functionality).
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
  currentTab: AppTab;
}

const SIDE_INACTIVE = "#BBBBBB";
const SIDE_ACTIVE   = "#0D0D0D";
const FONT          = "'KakaoSmallSans', system-ui, sans-serif";

export function BottomNav({ currentTab }: BottomNavProps) {
  const { goTo, inShell } = useTabNav();
  const { t } = useLanguage();

  const navigate = (tab: AppTab) => {
    if (inShell) goTo(tab);
    else         window.location.href = ROUTES[tab];
  };

  const SideItem = ({ tab, label, children }: {
    tab:      AppTab;
    label:    string;
    children: React.ReactNode;
  }) => {
    const active = currentTab === tab;
    return (
      <button
        onClick={() => navigate(tab)}
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            4,
          background:     "none",
          border:         "none",
          cursor:         "pointer",
          color:          active ? SIDE_ACTIVE : SIDE_INACTIVE,
          flex:           1,
          padding:        0,
          fontFamily:     FONT,
          transition:     "color .15s",
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
  };

  const scanActive = currentTab === "scan";

  return (
    <div style={{
      position:        "fixed",
      bottom:          0,
      left:            "50%",
      transform:       "translateX(-50%)",
      width:           "100%",
      maxWidth:        640,
      background:      "rgba(255,255,255,0.96)",
      backdropFilter:  "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      borderTop:       "0.5px solid #EBEBEB",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "space-around",
      padding:         "10px 22px calc(20px + env(safe-area-inset-bottom, 0px))",
      boxSizing:       "border-box" as const,
      zIndex:          100,
    }}>
      {/* Collection — left */}
      <SideItem tab="collection" label={t("nav.collection")}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {currentTab === "collection" ? (
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
      </SideItem>

      {/* Scan — center, dominant FAB */}
      <button
        onClick={() => navigate("scan")}
        aria-label={t("nav.scan")}
        style={{
          width:          56,
          height:         56,
          borderRadius:   "50%",
          background:     "#0D0D0D",
          border:         "none",
          cursor:         "pointer",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flex:           "0 0 auto",
          color:          "#FFFFFF",
          boxShadow:      scanActive
            ? "0 8px 22px rgba(0,0,0,0.28)"
            : "0 6px 18px rgba(0,0,0,0.18)",
          transform:      scanActive ? "translateY(-2px)" : "translateY(0)",
          transition:     "transform .15s ease, box-shadow .15s ease",
        }}
      >
        {/* Viewfinder corners — same glyph as Home */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <path d="M3 7V5a2 2 0 0 1 2-2h2"     stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 3h2a2 2 0 0 1 2 2v2"   stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 15v2a2 2 0 0 1-2 2h-2" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 19H5a2 2 0 0 1-2-2v-2"  stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Profile — right (uses underlying "my" tab + /my route) */}
      <SideItem tab="my" label={t("nav.my")}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle
            cx="10" cy="7" r="3"
            stroke="currentColor"
            strokeWidth="1.3"
            fill={currentTab === "my" ? "currentColor" : "none"}
            fillOpacity={currentTab === "my" ? 0.2 : 0}
          />
          <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </SideItem>
    </div>
  );
}
