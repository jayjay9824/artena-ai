"use client";
import React from "react";
import { VisualPattern } from "../types/taste";
import { useLanguage } from "../../i18n/useLanguage";

interface VisualPatternsProps {
  patterns: VisualPattern[];
  summary: string;
}

export function VisualPatterns({ patterns, summary }: VisualPatternsProps) {
  const { t } = useLanguage();
  return (
    <div style={{ padding: "30px 22px 30px", borderBottom: "0.5px solid #F2F2F2" }}>
      <p style={{
        fontSize: 9, color: "#BBBBBB", letterSpacing: ".22em", textTransform: "uppercase",
        margin: "0 0 24px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        {t("taste.visual_patterns_title")}
      </p>

      {/* Organic tag cloud */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "10px 14px",
        lineHeight: 1.5, marginBottom: 22,
        alignItems: "baseline",
      }}>
        {patterns.map((p, i) => {
          const fontSize = Math.round(10 + p.weight * 9);        // 10–19px
          const opacity  = 0.28 + p.weight * 0.72;               // 0.28–1.0
          const isBold   = p.weight > 0.72;
          const isItalic = p.category === "emotion";

          return (
            <span
              key={p.keyword}
              style={{
                fontSize,
                color: `rgba(12,12,12,${opacity})`,
                fontWeight: isBold ? 600 : 400,
                fontStyle: isItalic ? "italic" : "normal",
                letterSpacing: p.weight > 0.7 ? "-.01em" : ".01em",
                fontFamily: p.weight > 0.7 ? "'KakaoBigSans', system-ui, sans-serif" : "'KakaoSmallSans', system-ui, sans-serif",
                transition: "opacity .2s",
                lineHeight: 1,
                // Slight vertical offset to break grid feel
                position: "relative",
                top: i % 3 === 0 ? 2 : i % 3 === 1 ? -1 : 1,
              }}
            >
              {p.keyword}
            </span>
          );
        })}
      </div>

      {/* Summary sentence */}
      <p style={{
        fontSize: 12, color: "#777", lineHeight: 1.8, margin: 0,
        fontStyle: "italic", fontFamily: "Georgia, serif",
      }}>
        {summary}
      </p>
    </div>
  );
}
