"use client";
import React from "react";
import { ChevronRight } from "lucide-react";
import type { Artwork } from "../../lib/types";
import type { PerformanceRow } from "../../services/galleryConsole/artworkPerformanceService";

interface TableProps {
  rows:        PerformanceRow[];
  loading:     boolean;
  onSelect:    (artworkId: string) => void;
  selectedId?: string;
}

const STATUS_STYLE: Record<Artwork["availabilityStatus"], { bg: string; color: string; label: string }> = {
  available:    { bg: "#F4EFE5", color: "#8A6A3F", label: "Available" },
  reserved:     { bg: "#F7F1E0", color: "#8A6A3F", label: "Reserved"  },
  sold:         { bg: "#EEEEE9", color: "#5C5A56", label: "Sold"      },
  not_for_sale: { bg: "#F4F4F2", color: "#9A9A9A", label: "NFS"       },
};

function LeadScoreBar({ score }: { score: number }) {
  // 0-39 muted, 40-69 medium, 70+ accent.
  const tone = score >= 70 ? "#8A6A3F" : score >= 40 ? "#B89765" : "#C8C2B5";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 86 }}>
      <div style={{
        flex: 1, height: 4, background: "#F4F1EA",
        borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          width: `${Math.max(2, score)}%`, height: "100%",
          background: tone, transition: "width .3s ease",
        }} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, color: "#1C1A17",
        fontFamily: "'KakaoBigSans', system-ui, sans-serif",
        fontVariantNumeric: "tabular-nums",
        minWidth: 22, textAlign: "right",
      }}>{score}</span>
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "14px 12px", textAlign: "left",
  fontSize: 11.5, color: "#1C1A17",
  fontVariantNumeric: "tabular-nums",
  fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
};
const headStyle: React.CSSProperties = {
  ...cellStyle,
  fontSize: 9, color: "#9A9A9A",
  letterSpacing: ".12em", textTransform: "uppercase",
  fontWeight: 500, padding: "12px 12px",
  borderBottom: "0.5px solid #E7E2D8",
};

export function ArtworkPerformanceTable({ rows, loading, onSelect, selectedId }: TableProps) {
  if (loading) {
    return (
      <div style={{
        padding: "60px 20px", textAlign: "center",
        color: "#9A9A9A", fontSize: 12,
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        Loading…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div style={{
        padding: "60px 20px", textAlign: "center",
        color: "#9A9A9A", fontSize: 12,
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        No artworks match the current filters.
      </div>
    );
  }

  return (
    <div style={{
      background: "#FFFFFF",
      border: "0.5px solid #E7E2D8",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Mobile-first label */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>
              <th style={{ ...headStyle, width: "30%" }}>Artwork</th>
              <th style={headStyle}>Status</th>
              <th style={{ ...headStyle, textAlign: "right" }}>Views</th>
              <th style={{ ...headStyle, textAlign: "right" }}>Saves</th>
              <th style={{ ...headStyle, textAlign: "right" }}>AI Q</th>
              <th style={{ ...headStyle, textAlign: "right" }}>Price Q</th>
              <th style={{ ...headStyle, width: 130 }}>Lead Score</th>
              <th style={{ ...headStyle, width: 28 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isSelected = row.artwork.id === selectedId;
              const status = STATUS_STYLE[row.artwork.availabilityStatus];
              return (
                <tr
                  key={row.artwork.id}
                  onClick={() => onSelect(row.artwork.id)}
                  style={{
                    cursor: "pointer",
                    background: isSelected ? "#FAF8F2" : "transparent",
                    borderTop: "0.5px solid #F1ECE0",
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "#FBFAF6"; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                >
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{
                        width: 38, height: 38, flexShrink: 0,
                        background: "#F4EFE5",
                        border: "0.5px solid #E7E2D8",
                        borderRadius: 6,
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          margin: "0 0 2px", fontWeight: 600, fontSize: 12.5,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {row.artwork.title}
                        </p>
                        <p style={{
                          margin: 0, fontSize: 11, color: "#6F6F6F",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {row.artistName}{row.artwork.year ? ` · ${row.artwork.year}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <span style={{
                      fontSize: 10, color: status.color, background: status.bg,
                      padding: "3px 9px", borderRadius: 12,
                      letterSpacing: ".04em", fontWeight: 600,
                    }}>
                      {status.label}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{row.analytics.views}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{row.analytics.saves}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{row.analytics.aiQuestions}</td>
                  <td style={{ ...cellStyle, textAlign: "right", color: row.analytics.priceQuestions > 0 ? "#8A6A3F" : "#1C1A17", fontWeight: row.analytics.priceQuestions > 0 ? 600 : 400 }}>
                    {row.analytics.priceQuestions}
                  </td>
                  <td style={cellStyle}>
                    <LeadScoreBar score={row.analytics.leadScore} />
                  </td>
                  <td style={cellStyle}>
                    <ChevronRight size={14} strokeWidth={1.5} color="#C0BCB0" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
