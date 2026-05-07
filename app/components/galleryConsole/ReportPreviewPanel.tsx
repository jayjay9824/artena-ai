"use client";
import React from "react";
import { ExternalLink } from "lucide-react";
import type { PerformanceRow } from "../../services/galleryConsole/artworkPerformanceService";

/**
 * Read-only preview of how the artwork looks inside the AXVELA user
 * app's Quick Report — gives the gallery side a feel for what the
 * collector sees. Today this is a minimal stub; a future version can
 * pull the actual saved Report by reportId once Gallery Console
 * starts seeding artworks with linked reports.
 */
interface PreviewProps {
  row: PerformanceRow | null;
}

export function ReportPreviewPanel({ row }: PreviewProps) {
  if (!row) return null;

  return (
    <section>
      <h3 style={{
        fontSize: 14, fontWeight: 700, color: "#1C1A17",
        margin: "0 0 14px", letterSpacing: "-.005em",
        fontFamily: "'KakaoBigSans', system-ui, sans-serif",
      }}>
        Quick Report Preview
      </h3>

      <div style={{
        background: "#FFFFFF",
        border: "0.5px solid #E7E2D8",
        borderRadius: 14,
        overflow: "hidden",
      }}>
        {/* Hero band — placeholder image */}
        <div style={{
          aspectRatio: "16 / 9",
          background: "linear-gradient(160deg, #F4EFE5, #F8F4EB 60%, #F4EFE5)",
          position: "relative" as const,
        }}>
          <div style={{
            position: "absolute" as const,
            left: 16, bottom: 14, right: 16,
          }}>
            <p style={{
              fontSize: 9, color: "#8A6A3F",
              letterSpacing: ".22em", textTransform: "uppercase" as const,
              margin: "0 0 6px",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            }}>
              AXVELA AI
            </p>
            <p style={{
              fontSize: 18, fontWeight: 700, color: "#1C1A17",
              margin: "0 0 2px",
              fontFamily: "'KakaoBigSans', system-ui, sans-serif",
              letterSpacing: "-.015em",
            }}>
              {row.artistName}
            </p>
            <p style={{
              fontSize: 12, color: "#6F6F6F",
              fontStyle: "italic",
              margin: 0,
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            }}>
              {row.artwork.title}{row.artwork.year ? ` · ${row.artwork.year}` : ""}
            </p>
          </div>
        </div>

        {/* Preview meta */}
        <div style={{ padding: "16px 18px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 11.5, color: "#6F6F6F", lineHeight: 1.6 }}>
            This is the surface AXVELA collectors see when they scan or search this artwork.
            Question chips and Ask AXVELA route through the same analysis you see here.
          </p>

          {row.artwork.publicShareSlug && (
            <a
              href={`/report/${row.artwork.publicShareSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 11, color: "#8A6A3F", fontWeight: 600,
                letterSpacing: ".04em", textDecoration: "none",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              }}
            >
              View as collector
              <ExternalLink size={12} strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
