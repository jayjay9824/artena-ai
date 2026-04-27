"use client";
import React from "react";
import { useTasteProfile } from "./hooks/useTasteProfile";
import { TasteStatement } from "./components/TasteStatement";
import { TasteDimensions } from "./components/TasteDimensions";
import { VisualPatterns } from "./components/VisualPatterns";
import { TasteInsight } from "./components/TasteInsight";
import { BottomNav } from "../components/BottomNav";

function TasteProfilePage() {
  const { profile, isDemo } = useTasteProfile();

  return (
    <div style={{
      maxWidth: 640, margin: "0 auto", background: "#FFFFFF",
      minHeight: "100vh", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      boxSizing: "border-box" as const, overflowX: "hidden", paddingBottom: 88,
    }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ padding: "58px 22px 22px", borderBottom: "0.5px solid #F2F2F2" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <a
              href="/"
              style={{
                display: "inline-block",
                fontSize: 8, color: "#8A6A3F", letterSpacing: ".18em", textTransform: "uppercase",
                margin: "0 0 8px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                textDecoration: "none",
              }}
            >
              ARTENA AI · Cultural Intelligence
            </a>
            <h1 style={{
              fontSize: 26, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px",
              fontFamily: "'KakaoBigSans', system-ui, sans-serif", letterSpacing: "-.025em", lineHeight: 1,
            }}>
              Taste Profile
            </h1>
            <p style={{ fontSize: 12, color: "#ABABAB", margin: 0, letterSpacing: ".01em" }}>
              Your cultural intelligence signature
            </p>
          </div>

          {/* Profile monogram */}
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #8A6A3F18, #8A6A3F08)",
            border: "0.5px solid #E8E8E8",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 2,
          }}>
            <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".06em", fontFamily: "'KakaoSmallSans', system-ui" }}>
              {profile.dominantStyle.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </div>

        {isDemo && (
          <p style={{ fontSize: 9, color: "#C8B87C", margin: "14px 0 0", letterSpacing: ".06em" }}>
            DEMO — save artworks from /analyze to build your real profile
          </p>
        )}
      </div>

      {/* ── Core Taste Statement ───────────────────────────────── */}
      <TasteStatement profile={profile} isDemo={isDemo} />

      {/* ── Taste Dimensions ──────────────────────────────────── */}
      <TasteDimensions dimensions={profile.dimensions} />

      {/* ── Visual Patterns ───────────────────────────────────── */}
      <VisualPatterns patterns={profile.patterns} summary={profile.patternSummary} />

      {/* ── Taste Insight + CTAs ──────────────────────────────── */}
      <TasteInsight profile={profile} />

      <BottomNav currentTab="taste" />

    </div>
  );
}

export { TasteProfilePage as TastePageContent };
export default TasteProfilePage;
