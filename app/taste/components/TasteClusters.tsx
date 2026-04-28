"use client";
import React from "react";
import type { TasteProfile, VisualPattern } from "../types/taste";
import { useLanguage } from "../../i18n/useLanguage";

/**
 * Key Taste Clusters — surfaces 2–4 named clusters instead of
 * collapsing the user's profile into one average. Spec example:
 * "Quiet Minimalism", "Color-driven Abstraction".
 *
 * Clusters are derived from the existing visual-pattern weights so
 * we don't need new data — just a different way to read it.
 */

interface ClusterRule {
  name:  string;
  blurb: string;
  /** Lowercase substrings; if any keyword matches, the cluster fires. */
  match: string[];
}

const RULES: ClusterRule[] = [
  {
    name:  "Quiet Minimalism",
    blurb: "Restraint, repetition, and the interval as meaning",
    match: ["minimal", "restrain", "reduction", "silence", "고요", "단색", "여백", "mono"],
  },
  {
    name:  "Color-driven Abstraction",
    blurb: "Field, saturation, and emotional color",
    match: ["color", "chromatic", "saturat", "field", "abstract", "추상", "색"],
  },
  {
    name:  "Conceptual Sensibility",
    blurb: "Ideas as material, identity as structure",
    match: ["conceptual", "identity", "정체성", "concept", "language"],
  },
  {
    name:  "Korean Modernism",
    blurb: "Dansaekhwa lineage and post-war Korean abstraction",
    match: ["dansaek", "단색화", "korean", "한국", "wuhan"],
  },
  {
    name:  "Material Experimentation",
    blurb: "Surface, texture, and process-as-image",
    match: ["material", "texture", "process", "experimental", "재료", "물성"],
  },
  {
    name:  "Atmospheric Impressionism",
    blurb: "Light, weather, and the dissolving image",
    match: ["impression", "atmospher", "light", "weather", "monet", "water"],
  },
  {
    name:  "Pattern & Repetition",
    blurb: "Repeated form and obsessive structure",
    match: ["pattern", "repetition", "infinity", "polka", "grid", "반복"],
  },
  {
    name:  "Gestural Abstraction",
    blurb: "Mark, action, and painterly attack",
    match: ["gestural", "expressive", "action", "richter", "fluid"],
  },
];

interface DerivedCluster {
  rule:    ClusterRule;
  /** Sum of matching pattern weights — drives ordering. */
  score:   number;
}

function deriveClusters(patterns: VisualPattern[]): DerivedCluster[] {
  if (patterns.length === 0) return [];
  const out: DerivedCluster[] = [];

  for (const rule of RULES) {
    let score = 0;
    for (const p of patterns) {
      const k = p.keyword.toLowerCase();
      if (rule.match.some(m => k.includes(m))) score += p.weight;
    }
    if (score > 0) out.push({ rule, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 4);  // spec asks for 2-4 max
}

export function TasteClusters({ profile }: { profile: TasteProfile }) {
  const clusters = deriveClusters(profile.patterns);
  const { t } = useLanguage();

  if (clusters.length === 0) {
    return (
      <div style={{ padding: "26px 22px 28px", borderBottom: "0.5px solid #F2F2F2" }}>
        <p style={{
          fontSize: 9, color: "#9A9A9A", letterSpacing: ".22em",
          textTransform: "uppercase" as const, margin: "0 0 10px",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          fontWeight: 600,
        }}>
          {t("taste.key_clusters")}
        </p>
        <p style={{ fontSize: 13, color: "#9A9A9A", margin: 0, lineHeight: 1.5 }}>
          Save more works to surface your distinct directions.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "26px 22px 28px", borderBottom: "0.5px solid #F2F2F2" }}>
      <p style={{
        fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
        textTransform: "uppercase" as const, margin: "0 0 14px",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        fontWeight: 600,
      }}>
        {t("taste.key_clusters")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {clusters.map((c, i) => (
          <div
            key={c.rule.name}
            style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "12px 14px",
              background: i === 0 ? "#F4EFE5" : "#FFFFFF",
              border: `0.5px solid ${i === 0 ? "#D9C9A6" : "#E7E2D8"}`,
              borderRadius: 12,
            }}
          >
            <span style={{
              fontSize: 9, color: "#8A6A3F", marginTop: 5,
              fontFamily: "'KakaoBigSans', system-ui, sans-serif",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: "#1C1A17",
                fontFamily: "'KakaoBigSans', system-ui, sans-serif",
                letterSpacing: "-.005em",
              }}>
                {c.rule.name}
              </p>
              <p style={{
                margin: 0, fontSize: 11.5, color: "#6F6F6F", lineHeight: 1.5,
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              }}>
                {c.rule.blurb}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
