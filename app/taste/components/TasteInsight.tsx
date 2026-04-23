"use client";
import React from "react";
import { TasteProfile } from "../types/taste";
import { useTabNav } from "../../context/TabContext";

interface TasteInsightProps {
  profile: TasteProfile;
}

export function TasteInsight({ profile }: TasteInsightProps) {
  const { goTo } = useTabNav();
  return (
    <div style={{ padding: "30px 22px 36px" }}>
      <p style={{
        fontSize: 9, color: "#BBBBBB", letterSpacing: ".22em", textTransform: "uppercase",
        margin: "0 0 22px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        Taste Insight
      </p>

      {/* Dominant axes summary */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
        <span style={{ fontSize: 9, color: "#1856FF", background: "#1856FF0D", padding: "4px 10px", letterSpacing: ".04em", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
          {profile.dominantStyle}
        </span>
        <span style={{ fontSize: 9, color: "#555", background: "#F4F4F4", padding: "4px 10px", letterSpacing: ".04em", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
          {profile.dominantEmotion}
        </span>
      </div>

      {/* Insight paragraph */}
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ width: 2, background: "#1856FF", opacity: 0.3, flexShrink: 0, borderRadius: 1, marginRight: 16 }} />
        <p style={{
          fontSize: 13, color: "#444", lineHeight: 1.84, margin: 0,
          fontStyle: "italic", fontFamily: "Georgia, serif",
        }}>
          {profile.insight}
        </p>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 32 }}>
        <button
          onClick={() => goTo("recommendations")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            padding: "13px 0", background: "#0F0F0F", color: "#FFFFFF",
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 11,
            letterSpacing: ".07em", border: "none", cursor: "pointer", width: "100%",
            transition: "opacity .15s",
          }}
        >
          <span style={{ fontSize: 9, color: "#7C6FF7" }}>◆</span>
          Explore Recommendations
          <span style={{ fontSize: 10, color: "#666" }}>→</span>
        </button>
        <button
          onClick={() => goTo("collection")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            padding: "12px 0", background: "transparent",
            border: "0.5px solid #E0E0E0", color: "#888",
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif", fontSize: 11,
            letterSpacing: ".06em", cursor: "pointer", width: "100%",
          }}
        >
          View Collection
        </button>
      </div>
    </div>
  );
}
