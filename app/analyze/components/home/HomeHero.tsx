"use client";
import React from "react";

export function HomeHero() {
  return (
    <div style={{ paddingBottom: 28 }}>
      {/* Brand line */}
      <div style={{
        display: "flex", alignItems: "center", gap: 9, marginBottom: 22,
      }}>
        <span style={{
          fontSize: 18, letterSpacing: ".06em", fontStyle: "italic",
          fontFamily: "'KakaoBigSans', system-ui, sans-serif", color: "#111",
          fontWeight: 800,
        }}>
          ARTENA
        </span>
        <span style={{
          fontSize: 8.5, letterSpacing: ".18em", textTransform: "uppercase" as const,
          color: "#AAAAAA", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          paddingTop: 1,
        }}>
          Cultural Intelligence AI
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: 29, fontWeight: 800, color: "#111111", lineHeight: 1.16,
        margin: "0 0 13px",
        fontFamily: "'KakaoBigSans', system-ui, sans-serif",
        letterSpacing: "-.025em",
      }}>
        Scan the artwork.<br />
        Understand<br />the market.
      </h1>

      {/* Sub */}
      <p style={{
        fontSize: 13.5, color: "#666666", lineHeight: 1.68,
        margin: "0 0 4px",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        작품, 작품 설명, QR을 스캔하면<br />
        ARTENA가 맥락과 시장 데이터를 함께 분석합니다.
      </p>
    </div>
  );
}
