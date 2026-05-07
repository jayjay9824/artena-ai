"use client";
import React from "react";
import { Flame, TrendingUp, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LeadStrength } from "../../lib/types";
import type { LeadCard, StrengthFilter } from "../../services/galleryConsole/leadSignalService";

interface LeadSignalsPanelProps {
  leads:    LeadCard[];
  loading:  boolean;
  strength: StrengthFilter;
  onStrength: (s: StrengthFilter) => void;
}

const STRENGTH_TONE: Record<LeadStrength, { fg: string; bg: string; label: string; Icon: LucideIcon }> = {
  high:   { fg: "#8A6A3F", bg: "#F4EFE5", label: "High Intent",   Icon: Flame      },
  medium: { fg: "#7C6A46", bg: "#F1ECE0", label: "Medium Intent", Icon: TrendingUp },
  low:    { fg: "#6F6F6F", bg: "#F4F4F2", label: "Low Intent",    Icon: Eye        },
};

const FILTER_OPTIONS: { value: StrengthFilter; label: string }[] = [
  { value: "all",    label: "전체"    },
  { value: "high",   label: "High"   },
  { value: "medium", label: "Medium" },
  { value: "low",    label: "Low"    },
];

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.round(ms / 60000);
  if (m < 1)  return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export function LeadSignalsPanel({ leads, loading, strength, onStrength }: LeadSignalsPanelProps) {
  return (
    <section>
      {/* Header + filter pills */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{
          fontSize: 14, fontWeight: 700, color: "#1C1A17",
          margin: 0, letterSpacing: "-.005em",
          fontFamily: "'KakaoBigSans', system-ui, sans-serif",
        }}>
          Lead Signals
        </h3>
        <div style={{ display: "flex", gap: 6 }}>
          {FILTER_OPTIONS.map(o => {
            const active = strength === o.value;
            return (
              <button
                key={o.value}
                onClick={() => onStrength(o.value)}
                style={{
                  padding: "5px 11px",
                  background: active ? "#1C1A17" : "#FFFFFF",
                  border: `0.5px solid ${active ? "#1C1A17" : "#E7E2D8"}`,
                  borderRadius: 16,
                  color: active ? "#FFFFFF" : "#6F6F6F",
                  fontSize: 11, fontWeight: 600, letterSpacing: ".04em",
                  fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                  cursor: "pointer", transition: "background .15s, color .15s, border-color .15s",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lead cards */}
      {loading ? (
        <div style={{
          padding: "40px 16px", background: "#FFFFFF",
          border: "0.5px solid #E7E2D8", borderRadius: 14,
          textAlign: "center", color: "#9A9A9A", fontSize: 12,
        }}>
          Loading leads…
        </div>
      ) : leads.length === 0 ? (
        <div style={{
          padding: "40px 16px", background: "#FFFFFF",
          border: "0.5px solid #E7E2D8", borderRadius: 14,
          textAlign: "center", color: "#9A9A9A", fontSize: 12,
        }}>
          No leads at this strength yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {leads.slice(0, 12).map(l => {
            const tone = STRENGTH_TONE[l.strength];
            return (
              <div key={l.id} style={{
                display: "flex", alignItems: "center", gap: 16,
                background: "#FFFFFF",
                border: "0.5px solid #E7E2D8",
                borderRadius: 14,
                padding: "14px 16px",
              }}>
                {/* Strength badge */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center",
                  width: 60, padding: "10px 0",
                  background: tone.bg, borderRadius: 10,
                  flexShrink: 0,
                }}>
                  <tone.Icon size={14} strokeWidth={1.5} color={tone.fg} />
                  <span style={{
                    fontSize: 9, color: tone.fg, marginTop: 4,
                    letterSpacing: ".08em", fontWeight: 600,
                    textTransform: "uppercase",
                  }}>
                    {l.strength}
                  </span>
                </div>

                {/* Lead body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: "#1C1A17",
                      fontFamily: "'KakaoBigSans', system-ui, sans-serif",
                      letterSpacing: "-.005em",
                    }}>
                      {l.displayName}
                    </span>
                    <span style={{
                      fontSize: 10, color: tone.fg, letterSpacing: ".06em",
                      fontWeight: 600, textTransform: "uppercase",
                    }}>
                      {tone.label}
                    </span>
                  </div>
                  <p style={{
                    margin: "0 0 4px", fontSize: 12, color: "#1C1A17",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {l.reason}
                  </p>
                  <p style={{
                    margin: 0, fontSize: 11, color: "#6F6F6F",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {l.artistName} — <span style={{ fontStyle: "italic" }}>{l.artworkTitle}</span> · {relativeTime(l.lastActiveAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
