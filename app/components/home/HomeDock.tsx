"use client";
import React from "react";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";

interface Props {
  onCollection: () => void;
  onCamera:     () => void;
  onProfile:    () => void;
  collectionLabel?: string;
  profileLabel?:    string;
}

/**
 * Home-only bottom dock — Collection (left) / Camera FAB (center,
 * floating slightly above the dock) / Profile (right). Replaces the
 * 5-tab BottomNav on the first screen per spec; other surfaces keep
 * the standard nav.
 */
export function HomeDock({
  onCollection, onCamera, onProfile,
  collectionLabel = "Collection",
  profileLabel    = "Profile",
}: Props) {
  return (
    <div style={{
      position:   "fixed",
      left:       "50%",
      bottom:     0,
      transform:  "translateX(-50%)",
      width:      "100%",
      maxWidth:   430,
      height:     "calc(120px + env(safe-area-inset-bottom, 0px))",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      borderTopLeftRadius:  28,
      borderTopRightRadius: 28,
      boxShadow:  "0 -8px 28px rgba(0,0,0,0.05)",
      display:    "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingTop:    20,
      paddingLeft:   24,
      paddingRight:  24,
      zIndex:     50,
      fontFamily: FONT,
    }}>
      {/* Left — Collection */}
      <DockItem onClick={onCollection} label={collectionLabel}>
        <CollectionIcon />
      </DockItem>

      {/* Center — Camera FAB, lifted above the dock */}
      <button
        onClick={onCamera}
        aria-label="Camera"
        style={{
          position:        "absolute",
          left:            "50%",
          top:             -28,
          transform:       "translateX(-50%)",
          width:           60,
          height:          60,
          borderRadius:    "50%",
          background:      "#0F0F0F",
          border:          "3px solid #FFFFFF",
          cursor:          "pointer",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          boxShadow:       "0 10px 26px rgba(0,0,0,0.20)",
          transition:      "transform .15s ease",
        }}
      >
        <CameraIcon />
      </button>

      {/* Right — Profile */}
      <DockItem onClick={onProfile} label={profileLabel}>
        <ProfileIcon />
      </DockItem>
    </div>
  );
}

function DockItem({ onClick, label, children }: {
  onClick:  () => void;
  label:    string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background:      "none",
        border:          "none",
        cursor:          "pointer",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        gap:             5,
        padding:         "4px 8px",
        width:           96,
        color:           "#111111",
        fontFamily:      FONT,
      }}
    >
      {children}
      <span style={{
        fontSize:      11,
        fontWeight:    500,
        letterSpacing: "0.04em",
        color:         "#777777",
      }}>
        {label}
      </span>
    </button>
  );
}

function CollectionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="3"  y="3"  width="7" height="7" rx="1.2" stroke="#111111" strokeWidth="1.4" />
      <rect x="12" y="3"  width="7" height="7" rx="1.2" stroke="#111111" strokeWidth="1.4" />
      <rect x="3"  y="12" width="7" height="7" rx="1.2" stroke="#111111" strokeWidth="1.4" />
      <rect x="12" y="12" width="7" height="7" rx="1.2" stroke="#111111" strokeWidth="1.4" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect   x="2.5" y="6"  width="17" height="12" rx="2" stroke="#FFFFFF" strokeWidth="1.4" />
      <circle cx="11" cy="12" r="3.4"                     stroke="#FFFFFF" strokeWidth="1.4" />
      <path   d="M7 6V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1"   stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="8" r="3.2"                                stroke="#111111" strokeWidth="1.4" />
      <path   d="M4.5 18.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"     stroke="#111111" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
