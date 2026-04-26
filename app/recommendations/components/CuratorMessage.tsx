"use client";
import React, { useState } from "react";

interface CuratorMessageProps {
  tasteKeywords: string[];
}

const PREVIEW = "You're drawn to works that speak through restraint — where material and meaning converge in silence. These selections continue that sensibility.";

const FULL = `You're drawn to works that speak through restraint — where material and meaning converge in silence. These selections continue that sensibility.

Your collection reveals a consistent pull toward work that withholds as much as it reveals. A preference for the interval, the pause, the thing left unsaid. The following artists share this language: they treat reduction not as a limit but as a form of argument — and in doing so, extend precisely the territory your taste already inhabits.`;

export function CuratorMessage({ tasteKeywords }: CuratorMessageProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ padding: "30px 22px 26px", borderBottom: "0.5px solid #F0F0F0" }}>
      {/* Section label */}
      <p style={{ fontSize: 9, color: "#BABABA", letterSpacing: ".22em", textTransform: "uppercase", margin: "0 0 16px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
        Curator Insight
      </p>

      {/* Taste keyword tags */}
      {tasteKeywords.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18 }}>
          {tasteKeywords.slice(0, 5).map(k => (
            <span key={k} style={{
              fontSize: 9, color: "#8A6A3F", background: "#8A6A3F0C",
              padding: "3px 9px", letterSpacing: ".04em",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            }}>
              {k}
            </span>
          ))}
        </div>
      )}

      {/* Curator text */}
      <p style={{
        fontSize: 13, color: "#2A2A2A", lineHeight: 1.84, margin: "0 0 14px",
        fontStyle: "italic", fontFamily: "Georgia, serif",
        whiteSpace: "pre-line",
      }}>
        {expanded ? FULL : PREVIEW}
      </p>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontSize: 10, color: "#C0C0C0", letterSpacing: ".06em",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          transition: "color .15s",
        }}
      >
        {expanded ? "less ↑" : "more →"}
      </button>
    </div>
  );
}
