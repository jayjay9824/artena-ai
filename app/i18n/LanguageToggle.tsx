"use client";
import React from "react";
import { useLanguage } from "./useLanguage";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

/**
 * Global language toggle — fixed top-right pill that flips ko ↔ en.
 *
 * Visual: premium minimal pill, semi-opaque white with backdrop blur
 * so it reads on both light pages and the dark SmartScanner overlay.
 * Active language sits in charcoal, the other in muted gray; tapping
 * flips them. No emoji, no blue accent — keeps the museum palette.
 *
 * Position: top:14 right:14, z-index 9999 so it sits above the
 * scanner overlay (z-index 200) without overlapping the scanner's
 * flash button (top:52, right:20).
 */
export function LanguageToggle() {
  const { lang, toggleLanguage } = useLanguage();
  const isKo = lang === "ko";

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={`Switch language to ${isKo ? "English" : "Korean"}`}
      style={{
        position: "fixed",
        top: 14, right: 14,
        zIndex: 9999,
        display: "inline-flex", alignItems: "center",
        padding: "6px 12px",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "0.5px solid rgba(231,226,216,0.7)",
        borderRadius: 14,
        cursor: "pointer",
        fontFamily: FONT,
        fontSize: 11, letterSpacing: ".14em",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        transition: "background .15s, transform .15s, box-shadow .15s",
      }}
      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
      onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      onMouseLeave={e=> { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
    >
      <span style={{
        color:    isKo ? "#1C1A17" : "rgba(28,26,23,0.32)",
        fontWeight: isKo ? 700 : 500,
      }}>
        KO
      </span>
      <span style={{ color: "rgba(28,26,23,0.26)", margin: "0 6px" }}>/</span>
      <span style={{
        color:    !isKo ? "#1C1A17" : "rgba(28,26,23,0.32)",
        fontWeight: !isKo ? 700 : 500,
      }}>
        EN
      </span>
    </button>
  );
}
