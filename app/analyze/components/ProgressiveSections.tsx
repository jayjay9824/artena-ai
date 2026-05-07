"use client";
import React from "react";
import type { AnalysisStages, StageKey, StageStatus } from "../types/staged";
import { useLanguage } from "../../i18n/useLanguage";
import { safeT, type TranslationFn } from "../../lib/i18n/safeT";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

interface SectionRow {
  key:       StageKey;
  /** Translation key for the row label. */
  labelKey:  string;
  fallback:  string;
}

const ROWS: SectionRow[] = [
  { key: "basic",       labelKey: "stage.label.basic",       fallback: "Basic info"      },
  { key: "market",      labelKey: "stage.label.market",      fallback: "Market analysis" },
  { key: "price",       labelKey: "stage.label.price",       fallback: "Price estimate"  },
  { key: "comparables", labelKey: "stage.label.comparables", fallback: "Comparables"     },
];

/**
 * STEP 1 — Progressive section list that replaces the loading spinner.
 *
 * Each row fades from skeleton (pending) → spinner (loading) → check
 * (ready) as its stage advances in the staged-analysis state machine.
 * Reveals are spaced out so the check animation reads as a sequence
 * of distinct events rather than "all at once".
 */
export function ProgressiveSections({ stages }: { stages: AnalysisStages }) {
  const { t } = useLanguage();
  return (
    <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`
        @keyframes ps-pulse  { 0%,100% { opacity: .35 } 50% { opacity: .9 } }
        @keyframes ps-pop    { 0%   { transform: scale(.4);  opacity: 0 }
                                60% { transform: scale(1.15); opacity: 1 }
                                100%{ transform: scale(1);    opacity: 1 } }
        @keyframes ps-spin   { to { transform: rotate(360deg) } }
        @keyframes ps-row-in { from { opacity: 0; transform: translateY(4px) }
                               to   { opacity: 1; transform: translateY(0)   } }
      `}</style>
      {ROWS.map((row, i) => {
        const status = stages[row.key];
        return (
          <div
            key={row.key}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px",
              background: "#FFFFFF",
              border: `0.5px solid ${status === "ready" ? "#D9C9A6" : "#EFEAE0"}`,
              borderRadius: 12,
              opacity: status === "pending" ? 0.62 : 1,
              transition: "opacity .25s, border-color .3s",
              animation: `ps-row-in .3s ease ${i * 60}ms both`,
            }}
          >
            <StageIcon status={status} />
            <span style={{
              fontSize: 12.5,
              color: status === "ready" ? "#0D0D0D" : "#888",
              fontFamily: FONT,
              fontWeight: status === "ready" ? 600 : 400,
              letterSpacing: ".02em",
            }}>
              {safeT(t as TranslationFn, row.labelKey, row.fallback)}
            </span>
            <StatusTag status={status} />
          </div>
        );
      })}
    </div>
  );
}

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "ready") {
    return (
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        background: "#8A6A3F",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        animation: "ps-pop .35s ease",
        flexShrink: 0,
      }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.2L5 8.6L9.5 3.5" stroke="#FFFFFF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "loading") {
    return (
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        border: "1.5px solid #E7E2D8",
        borderTopColor: "#8A6A3F",
        animation: "ps-spin .8s linear infinite",
        flexShrink: 0,
      }} />
    );
  }
  if (status === "error") {
    return (
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        background: "#E04848",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ color: "#FFFFFF", fontSize: 11, lineHeight: 1, fontWeight: 700 }}>!</span>
      </span>
    );
  }
  // pending — skeleton dot
  return (
    <span style={{
      width: 18, height: 18, borderRadius: "50%",
      background: "#F4F4F2",
      animation: "ps-pulse 1.6s ease infinite",
      flexShrink: 0,
    }} />
  );
}

function StatusTag({ status }: { status: StageStatus }) {
  if (status === "ready") {
    return (
      <span style={{
        marginLeft: "auto", fontSize: 9, color: "#8A6A3F",
        letterSpacing: ".18em", textTransform: "uppercase" as const,
        fontFamily: FONT, fontWeight: 600,
      }}>
        Ready
      </span>
    );
  }
  if (status === "loading") {
    return (
      <span style={{
        marginLeft: "auto", fontSize: 9, color: "#B0A180",
        letterSpacing: ".18em", textTransform: "uppercase" as const,
        fontFamily: FONT,
      }}>
        Analyzing
      </span>
    );
  }
  return null;
}
