"use client";
import React from "react";
import { useTasteProfile } from "./hooks/useTasteProfile";
import { TasteStatement } from "./components/TasteStatement";
import { TasteDimensions } from "./components/TasteDimensions";
import { VisualPatterns } from "./components/VisualPatterns";
import { TasteInsight } from "./components/TasteInsight";

function NavIcon({ href, active, children, label }: {
  href: string; active?: boolean; children: React.ReactNode; label: string;
}) {
  return (
    <a href={href} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      textDecoration: "none", color: active ? "#1856FF" : "#BBBBBB", flex: 1,
    }}>
      {children}
      <span style={{ fontSize: 9, letterSpacing: ".07em", fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontWeight: active ? 600 : 400 }}>
        {label}
      </span>
    </a>
  );
}

export default function TasteProfilePage() {
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
            <p style={{
              fontSize: 8, color: "#D0D0D0", letterSpacing: ".18em", textTransform: "uppercase",
              margin: "0 0 8px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            }}>
              ARTENA AI · Cultural Intelligence
            </p>
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
            background: "linear-gradient(135deg, #1856FF18, #1856FF08)",
            border: "0.5px solid #E8E8E8",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 2,
          }}>
            <span style={{ fontSize: 9, color: "#1856FF", letterSpacing: ".06em", fontFamily: "'KakaoSmallSans', system-ui" }}>
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

      {/* ── Bottom Nav ─────────────────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 640,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        borderTop: "0.5px solid #EBEBEB",
        display: "flex", alignItems: "center", justifyContent: "space-around",
        padding: "10px 22px 22px",
        boxSizing: "border-box" as const,
        zIndex: 100,
      }}>
        <NavIcon href="/analyze" label="스캔">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8.2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 10h6M10 7v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </NavIcon>

        <NavIcon href="/collection" label="컬렉션">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="11" y="2.5" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="2.5" y="11" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
            <rect x="11" y="11" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </NavIcon>

        <NavIcon href="/taste" label="취향" active>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3.5" fill="currentColor" />
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2.5" />
          </svg>
        </NavIcon>

        <NavIcon href="/recommendations" label="추천">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2.5L12.2 8H18L13.4 11.5L15.2 17L10 13.8L4.8 17L6.6 11.5L2 8H7.8L10 2.5Z"
              stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
              fill="currentColor" fillOpacity="0.12"
            />
          </svg>
        </NavIcon>
      </div>

    </div>
  );
}
