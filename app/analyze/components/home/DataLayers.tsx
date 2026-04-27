"use client";
import React from "react";

/**
 * Minimal "what ARTENA reads" row — replaces the verbose ArtenaGraph
 * SVG that was on the home screen. Spec wants a simple data
 * description (Artwork / Artist / Gallery / Market) with a premium,
 * museum-like restraint.
 */

const LAYERS: { en: string; ko: string }[] = [
  { en: "Artwork",  ko: "작품"   },
  { en: "Artist",   ko: "작가"   },
  { en: "Gallery",  ko: "갤러리" },
  { en: "Market",   ko: "시장"   },
];

export function DataLayers() {
  return (
    <div style={{ marginTop: 4, marginBottom: 8 }}>
      {/* Section label */}
      <p style={{
        fontSize: 9, color: "#AAAAAA", letterSpacing: ".2em",
        textTransform: "uppercase" as const,
        margin: "0 0 14px",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        ARTENA reads
      </p>

      {/* Layers row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0,
        borderTop:    "0.5px solid #E7E2D8",
        borderBottom: "0.5px solid #E7E2D8",
        padding: "16px 0",
      }}>
        {LAYERS.map((l, i) => (
          <div
            key={l.en}
            style={{
              borderRight: i < LAYERS.length - 1 ? "0.5px solid #E7E2D8" : "none",
              padding: "0 4px",
              textAlign: "center" as const,
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            }}
          >
            <p style={{
              fontSize: 12, fontWeight: 600, color: "#1C1A17",
              letterSpacing: "-.005em",
              margin: "0 0 3px",
            }}>
              {l.en}
            </p>
            <p style={{ fontSize: 9.5, color: "#8A6A3F", letterSpacing: ".06em", margin: 0 }}>
              {l.ko}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
