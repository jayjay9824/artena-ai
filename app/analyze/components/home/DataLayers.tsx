"use client";
import React from "react";

/**
 * "AXVELA가 읽는 데이터" — minimal data-layer row.
 * Spec lists 6 layers and one descriptive sentence; no SVG graph,
 * no decorative chrome.
 */

const LAYERS: { en: string; ko: string }[] = [
  { en: "Artwork",        ko: "작품"     },
  { en: "Artist",         ko: "작가"     },
  { en: "Gallery",        ko: "갤러리"   },
  { en: "Exhibition",     ko: "전시"     },
  { en: "Market",         ko: "시장"     },
  { en: "Cultural Place", ko: "문화 공간" },
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
        AXVELA가 읽는 데이터
      </p>

      {/* Layers grid — 3 columns × 2 rows */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        borderTop:    "0.5px solid #E7E2D8",
        borderBottom: "0.5px solid #E7E2D8",
      }}>
        {LAYERS.map((l, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          return (
            <div
              key={l.en}
              style={{
                borderRight:  col < 2 ? "0.5px solid #E7E2D8" : "none",
                borderBottom: row < 1 ? "0.5px solid #E7E2D8" : "none",
                padding: "16px 4px",
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
              <p style={{
                fontSize: 9.5, color: "#8A6A3F",
                letterSpacing: ".06em", margin: 0,
              }}>
                {l.ko}
              </p>
            </div>
          );
        })}
      </div>

      {/* Description — single sentence per spec */}
      <p style={{
        fontSize: 12, color: "#6F6F6F", lineHeight: 1.65,
        margin: "16px 4px 0",
        textAlign: "center" as const,
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        회화뿐 아니라 건축물·유적지·문화공간까지 분석합니다.
      </p>
    </div>
  );
}
