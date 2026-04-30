"use client";
import React from "react";
import type { AnalysisStages, StageKey, StageStatus } from "../types/staged";
import { useLanguage } from "../../i18n/useLanguage";

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

/**
 * Horizontal motion pipeline — visualizes the four-stage analysis
 * progression (basic → market → price → comparables) in real time.
 *
 * Each stage node has four visual states:
 *
 *   pending  light gray dot (skeleton)
 *   loading  white circle with gold border, inner gold dot, and a
 *            radiating pulse ring (apf-ring-pulse) so the active
 *            stage reads as "live"
 *   ready    solid gold filled with a checkmark, with a gentle
 *            pop-in animation (apf-pop)
 *   error    red bang
 *
 * Connectors between nodes:
 *
 *   - empty (gray) until the upstream stage is ready
 *   - upon ready: filled gold; if the downstream stage is loading,
 *     the connector also runs an animated gradient flow (apf-line-flow)
 *     to imply data is moving forward
 *
 * Pipeline-wide motion:
 *
 *   - A horizontal sweep light (apf-sweep) travels left-to-right
 *     across the entire pipeline whenever ANY stage is loading.
 *     This is the "AXVELA AI is working" hint, distinct from the
 *     per-node pulses.
 *
 * Pure presentation — no state of its own. Caller passes the four
 * stage statuses; this component reflects them with motion.
 */
export function AnalysisProcessFlow({ stages }: { stages: AnalysisStages }) {
  const { t } = useLanguage();
  const isAnyLoading = STAGES.some(s => stages[s.key] === "loading");

  return (
    <div style={{
      position:   "relative",
      padding:    "20px 18px 16px",
      background: "rgba(255,255,255,0.94)",
      backdropFilter:        "blur(14px)",
      WebkitBackdropFilter:  "blur(14px)",
      border:       "0.5px solid #EFEAE0",
      borderRadius: 18,
      marginBottom: 14,
      overflow:     "hidden",
    }}>
      <style>{`
        @keyframes apf-pop {
          0%   { transform: scale(.4);  opacity: 0; }
          60%  { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes apf-ring-pulse {
          0%   { transform: scale(1);   opacity: 0.55; }
          70%  { transform: scale(2.2); opacity: 0;    }
          100% { transform: scale(2.2); opacity: 0;    }
        }
        @keyframes apf-sweep {
          0%   { transform: translateX(-30%); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(330%); opacity: 0; }
        }
        @keyframes apf-line-flow {
          0%   { background-position: 0%   50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes apf-label-fade-in {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes apf-caption-blink {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1;   }
        }
      `}</style>

      {/* Section header — small all-caps eyebrow line. */}
      <p style={{
        fontSize: 8.5, color: "#8A6A3F", letterSpacing: ".22em",
        textTransform: "uppercase" as const, margin: "0 0 14px",
        fontFamily: FONT, fontWeight: 600,
      }}>
        ◆ AXVELA AI · In Progress
      </p>

      {/* Pipeline-wide sweep — only animates while at least one
          stage is loading; carries a soft gold tint. */}
      {isAnyLoading && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top:      30,
            bottom:   30,
            left:     0,
            width:    "30%",
            background:
              "linear-gradient(90deg, transparent, rgba(138,106,63,0.06) 40%, rgba(138,106,63,0.16) 50%, rgba(138,106,63,0.06) 60%, transparent)",
            animation:     "apf-sweep 2.4s linear infinite",
            pointerEvents: "none",
            zIndex:        0,
          }}
        />
      )}

      {/* Pipeline row — nodes connected by animated lines. */}
      <div style={{
        position:       "relative",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        zIndex:         1,
      }}>
        {STAGES.map((stage, idx) => (
          <React.Fragment key={stage.key}>
            <StageNode status={stages[stage.key]} />
            {idx < STAGES.length - 1 && (
              <StageConnector
                upstreamReady={stages[stage.key] === "ready"}
                downstreamLoading={stages[STAGES[idx + 1].key] === "loading"}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Stage labels — sit directly under each node. */}
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        marginTop:      10,
      }}>
        {STAGES.map((stage, i) => {
          const status = stages[stage.key];
          const color  =
            status === "ready"   ? "#0D0D0D" :
            status === "loading" ? "#8A6A3F" :
            status === "error"   ? "#E04848" :
                                   "#B5AB97";
          return (
            <span
              key={stage.key}
              style={{
                fontSize:    10,
                color,
                fontFamily:  FONT,
                fontWeight:  status === "ready" ? 600 : 500,
                letterSpacing: ".06em",
                textAlign:   "center" as const,
                width:       64,
                animation:   `apf-label-fade-in .35s ease ${i * 80}ms both`,
              }}
            >
              {t(stage.labelKey) || stage.fallback}
            </span>
          );
        })}
      </div>

      {/* Live caption — tells the user which stage is being computed
          right now. Falls back to a neutral line when nothing is
          loading. */}
      <p style={{
        marginTop:    14,
        marginBottom: 0,
        fontSize:     11.5,
        color:        "#5C5042",
        fontFamily:   FONT,
        textAlign:    "center" as const,
        animation:    isAnyLoading ? "apf-caption-blink 1.6s ease-in-out infinite" : undefined,
      }}>
        {captionFor(stages, t)}
      </p>
    </div>
  );
}

/* ── Node ─────────────────────────────────────────────────────── */

function StageNode({ status }: { status: StageStatus }) {
  if (status === "ready") {
    return (
      <span style={{
        position:     "relative",
        width:        28,
        height:       28,
        borderRadius: "50%",
        background:   "#8A6A3F",
        display:      "inline-flex",
        alignItems:   "center",
        justifyContent: "center",
        flexShrink:   0,
        animation:    "apf-pop .4s ease",
        boxShadow:    "0 0 0 3px rgba(138,106,63,0.10)",
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 7.2L6 10L11 4"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (status === "loading") {
    return (
      <span style={{
        position:     "relative",
        width:        28,
        height:       28,
        borderRadius: "50%",
        background:   "#FFFFFF",
        border:       "2px solid #8A6A3F",
        display:      "inline-flex",
        alignItems:   "center",
        justifyContent: "center",
        flexShrink:   0,
      }}>
        <span style={{
          width:        8,
          height:       8,
          borderRadius: "50%",
          background:   "#8A6A3F",
        }}/>
        <span
          aria-hidden
          style={{
            position:      "absolute",
            inset:         -2,
            borderRadius:  "50%",
            border:        "2px solid #8A6A3F",
            animation:     "apf-ring-pulse 1.6s ease-out infinite",
            pointerEvents: "none",
          }}
        />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span style={{
        width:        28,
        height:       28,
        borderRadius: "50%",
        background:   "#E04848",
        display:      "inline-flex",
        alignItems:   "center",
        justifyContent: "center",
        flexShrink:   0,
        color:        "#FFFFFF",
        fontWeight:   700,
        fontSize:     14,
        lineHeight:   1,
      }}>
        !
      </span>
    );
  }
  // pending
  return (
    <span style={{
      width:        28,
      height:       28,
      borderRadius: "50%",
      background:   "#F4F4F2",
      border:       "1px solid #E7E2D8",
      flexShrink:   0,
    }}/>
  );
}

/* ── Connector ────────────────────────────────────────────────── */

function StageConnector({
  upstreamReady,
  downstreamLoading,
}: {
  upstreamReady:     boolean;
  downstreamLoading: boolean;
}) {
  const flowing = upstreamReady && downstreamLoading;
  return (
    <span
      aria-hidden
      style={{
        flex:         1,
        height:       2,
        margin:       "0 6px",
        borderRadius: 2,
        background: upstreamReady
          ? (flowing
              ? "linear-gradient(90deg, #8A6A3F 0%, #C9B484 50%, #E5DDC9 100%)"
              : "#8A6A3F")
          : "#E7E2D8",
        backgroundSize: "200% 100%",
        animation:      flowing ? "apf-line-flow 1.8s linear infinite" : undefined,
        transition:     "background .4s ease",
      }}
    />
  );
}

/* ── Caption resolver ─────────────────────────────────────────── */

function captionFor(stages: AnalysisStages, t: (k: string) => string): string {
  const loading = STAGES.find(s => stages[s.key] === "loading");
  if (loading) {
    const label = t(loading.captionKey) || loading.captionFallback;
    return label;
  }
  if (STAGES.every(s => stages[s.key] === "ready")) {
    return t("stage.caption.done") || "Analysis complete.";
  }
  if (STAGES.some(s => stages[s.key] === "error")) {
    return t("stage.caption.error") || "Some signals are unavailable.";
  }
  return t("stage.caption.start") || "Reading the work…";
}

/* ── Stage definitions ────────────────────────────────────────── */

interface StageDef {
  key:             StageKey;
  labelKey:        string;
  fallback:        string;
  captionKey:      string;
  captionFallback: string;
}

const STAGES: StageDef[] = [
  {
    key:             "basic",
    labelKey:        "stage.basic",
    fallback:        "Basic",
    captionKey:      "stage.caption.basic",
    captionFallback: "기본 정보를 읽고 있습니다…",
  },
  {
    key:             "market",
    labelKey:        "stage.market",
    fallback:        "Market",
    captionKey:      "stage.caption.market",
    captionFallback: "시장 신호를 분석하고 있습니다…",
  },
  {
    key:             "price",
    labelKey:        "stage.price",
    fallback:        "Price",
    captionKey:      "stage.caption.price",
    captionFallback: "가격 추정 범위를 계산하고 있습니다…",
  },
  {
    key:             "comparables",
    labelKey:        "stage.comparables",
    fallback:        "Compare",
    captionKey:      "stage.caption.comparables",
    captionFallback: "유사 작품과 비교하고 있습니다…",
  },
];
