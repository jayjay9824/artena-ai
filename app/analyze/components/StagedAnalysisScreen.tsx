"use client";
import React from "react";
import type { AnalysisStages, QuickView as QuickViewData } from "../types/staged";
import { QuickView } from "./QuickView";
import { ProgressiveSections } from "./ProgressiveSections";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

/**
 * STEP 1 — Loading-screen replacement.
 *
 * Composes Quick View on top + Progressive Sections below. Replaces
 * the legacy LoadingSpinner so users see staged progress instead of
 * a generic spinner. Quick View is rendered the moment quickView
 * data arrives and never disappears for the duration of the loading
 * window.
 *
 * Pure presentation — the staged state machine lives in
 * useStagedAnalysis; this component is fed `quickView`, `stages`,
 * and `imagePreview` as props.
 */
export function StagedAnalysisScreen({
  quickView,
  stages,
  imagePreview,
}: {
  quickView:    QuickViewData | null;
  stages:       AnalysisStages;
  imagePreview: string | null;
}) {
  return (
    <div style={{
      maxWidth: 430, margin: "0 auto", minHeight: "100vh",
      background: "#F8F7F4",
      padding: "52px 18px 40px",
      boxSizing: "border-box" as const,
      position: "relative" as const,
      overflow: "hidden" as const,
    }}>
      {/* Soft blurred-image backdrop — preserves the existing
          scanner→loading visual continuity until QuickView lands. */}
      {imagePreview && !quickView && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${imagePreview})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(20px) brightness(0.7)",
          transform: "scale(1.08)",
          opacity: 0.55,
          zIndex: 0,
        }} />
      )}

      <div style={{ position: "relative" as const, zIndex: 1 }}>
        {/* Brand line */}
        <a
          href="/"
          style={{
            display: "inline-block",
            fontSize: 8.5, color: "#8A6A3F",
            letterSpacing: ".22em", textTransform: "uppercase" as const,
            margin: "0 0 18px",
            fontFamily: FONT, fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ARTENA AI · Cultural Intelligence
        </a>

        {/* Quick View — appears when basic stage resolves */}
        {quickView && (
          <QuickView data={quickView} imagePreview={imagePreview} />
        )}

        {/* While waiting for quick view, show a thin status caption so
            the screen never feels frozen even before any stage ticks. */}
        {!quickView && (
          <div style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "0.5px solid #EFEAE0",
            borderRadius: 18,
            padding: "22px 22px 24px",
            marginBottom: 6,
          }}>
            <p style={{
              fontSize: 8.5, color: "#8A6A3F", letterSpacing: ".22em",
              textTransform: "uppercase" as const, margin: "0 0 10px",
              fontFamily: FONT, fontWeight: 600,
            }}>
              ◆ Reading Image
            </p>
            <p style={{
              fontSize: 14, color: "#2A2A2A", margin: 0,
              lineHeight: 1.5, fontFamily: FONT,
            }}>
              ARTENA가 작품을 분석하고 있습니다.
            </p>
            <p style={{
              fontSize: 12, color: "#9A9A9A", margin: "6px 0 0",
              lineHeight: 1.5, fontFamily: FONT,
            }}>
              곧 Quick View가 표시됩니다 — 시장 분석은 백그라운드에서 계속됩니다.
            </p>
          </div>
        )}

        {/* Staged section list — always rendered so users see what's
            happening. Spec: "replace spinner with staged UI". */}
        <ProgressiveSections stages={stages} />
      </div>
    </div>
  );
}
