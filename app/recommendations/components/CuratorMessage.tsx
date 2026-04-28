"use client";
import React, { useState } from "react";

interface CuratorMessageProps {
  tasteKeywords: string[];
  /** Top 3-ish Key Taste Cluster names — drives the insight copy. */
  clusters?: string[];
}

const STATIC_PREVIEW =
  "You're drawn to works that speak through restraint — where material and meaning converge in silence. These selections continue that sensibility.";

const STATIC_FULL =
  STATIC_PREVIEW +
  "\n\nYour collection reveals a consistent pull toward work that withholds as much as it reveals. A preference for the interval, the pause, the thing left unsaid. The following artists share this language: they treat reduction not as a limit but as a form of argument — and in doing so, extend precisely the territory your taste already inhabits.";

/**
 * Build a personalised insight from the user's top clusters.
 * Falls back to the static text when there's no cluster signal yet.
 *
 *   1 cluster  → "You're drawn to {A}, where ..."
 *   2 clusters → "You move between {A} and {B} — ..."
 *   3+         → "Your taste lives where {A}, {B}, and {C} converge."
 */
function deriveInsight(clusters: string[]): { preview: string; full: string } {
  const c = clusters.filter(Boolean).slice(0, 3);
  if (c.length === 0) return { preview: STATIC_PREVIEW, full: STATIC_FULL };

  const tones: Record<string, string> = {
    "Quiet Minimalism":           "where reduction becomes argument",
    "Color-driven Abstraction":   "where color is the structure",
    "Korean Modernism":           "the Dansaekhwa lineage of process and time",
    "Conceptual Sensibility":     "where ideas treat material as an instrument",
    "Material Experimentation":   "where surface, texture, and process accumulate as image",
    "Atmospheric Impressionism":  "where light and weather dissolve the picture",
    "Pattern & Repetition":       "where obsessive structure becomes meditation",
    "Gestural Abstraction":       "where the mark itself is the argument",
  };

  const toneFor = (name: string): string => tones[name] ?? "where the work earns its conviction";

  let preview: string;
  if (c.length === 1) {
    preview = `You're drawn to ${c[0]}, ${toneFor(c[0])}. These selections continue that sensibility.`;
  } else if (c.length === 2) {
    preview = `You move between ${c[0]} and ${c[1]} — ${toneFor(c[0])}, and ${toneFor(c[1])}. These selections sit on that line.`;
  } else {
    preview = `Your taste lives where ${c[0]}, ${c[1]}, and ${c[2]} converge — ${toneFor(c[0])}. These selections extend the territory.`;
  }

  const full = `${preview}\n\nYour collection reveals a consistent pull toward work that withholds as much as it reveals. The following artists share that language: they treat reduction, repetition, and material as instruments of argument — and in doing so, extend precisely the territory your taste already inhabits.`;

  return { preview, full };
}

export function CuratorMessage({ tasteKeywords, clusters = [] }: CuratorMessageProps) {
  const [expanded, setExpanded] = useState(false);
  const { preview, full } = deriveInsight(clusters);

  return (
    <div style={{ padding: "30px 22px 26px", borderBottom: "0.5px solid #F0F0F0" }}>
      {/* Section label */}
      <p style={{ fontSize: 9, color: "#BABABA", letterSpacing: ".22em", textTransform: "uppercase", margin: "0 0 16px", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
        Curator Insight
      </p>

      {/* Cluster pills (preferred) — fall back to keyword pills when clusters unavailable */}
      {clusters.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 18 }}>
          {clusters.slice(0, 3).map(c => (
            <span key={c} style={{
              fontSize: 9, color: "#8A6A3F", background: "#8A6A3F0C",
              padding: "3px 9px", letterSpacing: ".04em",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            }}>
              {c}
            </span>
          ))}
        </div>
      ) : tasteKeywords.length > 0 && (
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
        {expanded ? full : preview}
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
