"use client";
import React from "react";
import { UserCircle2, Lock } from "lucide-react";
import type { LeadStrength } from "../../lib/types";
import type { InterestedUser } from "../../services/galleryConsole/leadSignalService";

interface PanelProps {
  users:   InterestedUser[];
  loading: boolean;
}

const STRENGTH_LABEL: Record<LeadStrength, string> = {
  high: "High", medium: "Medium", low: "Low",
};
const STRENGTH_DOT: Record<LeadStrength, string> = {
  high: "#8A6A3F", medium: "#B89765", low: "#C8C2B5",
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.round(ms / 60000);
  if (m < 60)  return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function InterestedUsersPanel({ users, loading }: PanelProps) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{
          fontSize: 14, fontWeight: 700, color: "#1C1A17",
          margin: 0, letterSpacing: "-.005em",
          fontFamily: "'KakaoBigSans', system-ui, sans-serif",
        }}>
          Interested Users
        </h3>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 10, color: "#9A9A9A", letterSpacing: ".05em",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        }}>
          <Lock size={11} strokeWidth={1.5} />
          Anonymous by default
        </span>
      </div>

      {loading ? (
        <div style={{
          padding: "32px 16px", background: "#FFFFFF",
          border: "0.5px solid #E7E2D8", borderRadius: 14,
          textAlign: "center", color: "#9A9A9A", fontSize: 12,
        }}>
          Loading…
        </div>
      ) : users.length === 0 ? (
        <div style={{
          padding: "32px 16px", background: "#FFFFFF",
          border: "0.5px solid #E7E2D8", borderRadius: 14,
          textAlign: "center", color: "#9A9A9A", fontSize: 12,
        }}>
          No interested users yet.
        </div>
      ) : (
        <div style={{
          background: "#FFFFFF",
          border: "0.5px solid #E7E2D8",
          borderRadius: 14,
          overflow: "hidden",
        }}>
          {users.slice(0, 8).map((u, i) => (
            <div
              key={u.userId}
              style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 16px",
                borderTop: i === 0 ? "none" : "0.5px solid #F1ECE0",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "#F4EFE5",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <UserCircle2 size={18} strokeWidth={1.4} color="#8A6A3F" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: "#1C1A17",
                    fontFamily: "'KakaoBigSans', system-ui, sans-serif",
                  }}>
                    {u.displayName}
                  </span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 10, color: "#6F6F6F",
                    letterSpacing: ".06em", textTransform: "uppercase",
                    fontWeight: 600,
                  }}>
                    <span style={{
                      display: "inline-block", width: 6, height: 6,
                      borderRadius: "50%", background: STRENGTH_DOT[u.topStrength],
                    }} />
                    {STRENGTH_LABEL[u.topStrength]}
                  </span>
                  <span style={{ fontSize: 10, color: "#9A9A9A", marginLeft: "auto" }}>
                    {relativeTime(u.lastInteractionAt)}
                  </span>
                </div>

                {u.tasteSummary && (
                  <p style={{
                    margin: "0 0 6px", fontSize: 11, color: "#6F6F6F",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {u.tasteSummary}
                  </p>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {u.artworks.slice(0, 3).map(a => (
                    <span key={a.id} style={{
                      fontSize: 10, color: "#6F6F6F",
                      background: "#F8F7F4",
                      border: "0.5px solid #E7E2D8",
                      padding: "2px 8px", borderRadius: 10,
                    }}>
                      {a.title}
                    </span>
                  ))}
                  {u.artworks.length > 3 && (
                    <span style={{ fontSize: 10, color: "#9A9A9A", padding: "2px 4px" }}>
                      +{u.artworks.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
