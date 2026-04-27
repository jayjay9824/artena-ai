"use client";
import React from "react";
import Link from "next/link";

export function HomeHero() {
  return (
    <div style={{ paddingBottom: 28 }}>
      {/* Brand line — logo navigates to marketing landing per spec */}
      <Link
        href="/"
        style={{
          display: "flex", alignItems: "center", gap: 9, marginBottom: 22,
          textDecoration: "none", color: "inherit",
        }}
      >
        <span style={{
          fontSize: 18, letterSpacing: ".06em", fontStyle: "italic",
          fontFamily: "'KakaoBigSans', system-ui, sans-serif", color: "#111",
          fontWeight: 800,
        }}>
          ARTENA AI
        </span>
        <span style={{
          fontSize: 8.5, letterSpacing: ".18em", textTransform: "uppercase" as const,
          color: "#AAAAAA", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          paddingTop: 1,
        }}>
          Cultural Intelligence AI
        </span>
      </Link>

      {/* Headline */}
      <h1 style={{
        fontSize: 38, fontWeight: 800, color: "#111111", lineHeight: 1.04,
        margin: "0 0 14px",
        fontFamily: "'KakaoBigSans', system-ui, sans-serif",
        letterSpacing: "-.03em",
        fontStyle: "italic",
      }}>
        Just Show It.
      </h1>

      {/* Sub */}
      <p style={{
        fontSize: 13.5, color: "#6F6F6F", lineHeight: 1.68,
        margin: "0 0 4px",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        작품, 라벨, QR을 보여주면<br />
        ARTENA가 맥락과 시장을 읽습니다.
      </p>
    </div>
  );
}
