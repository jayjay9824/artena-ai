"use client";
import React from "react";
import { ConfidenceScores } from "../types";

const DIMENSIONS: { key: keyof ConfidenceScores; label: string; desc: string }[] = [
  { key: "dataDepth", label: "Data Depth", desc: "Volume of comparable sales" },
  { key: "comparableMatch", label: "Comparable Match", desc: "Similarity of matched sales" },
  { key: "metadataCompleteness", label: "Metadata", desc: "Completeness of artwork details" },
  { key: "marketStability", label: "Market Stability", desc: "Price consistency over time" },
  { key: "geographicCoverage", label: "Geographic Coverage", desc: "Market breadth" },
  { key: "localMarketFit", label: "Local Market Fit", desc: "Korean market data presence" },
  { key: "channelCoverage", label: "Channel Coverage", desc: "Sale venue diversity" },
];

function ScoreBar({ value, accent = false }: { value: number; accent?: boolean }) {
  const color = value >= 70 ? "#4CAF86" : value >= 50 ? "#8A6A3F" : "#E0954A";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 4, background: "#F0F0F0" }}>
        <div style={{ width: `${value}%`, height: "100%", background: accent ? "#8A6A3F" : color, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: accent ? "#8A6A3F" : color, fontWeight: 600, minWidth: 28, textAlign: "right" as const }}>{value}</span>
    </div>
  );
}

export function ConfidencePanel({ scores }: { scores: ConfidenceScores }) {
  const tier = scores.overall >= 70 ? { label: "HIGH", color: "#4CAF86" } : scores.overall >= 50 ? { label: "MEDIUM", color: "#8A6A3F" } : { label: "LOW", color: "#E0954A" };

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8", padding: "32px 36px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #F5F5F5" }}>
        <div>
          <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em", textTransform: "uppercase" as const, display: "block", marginBottom: 6 }}>8-Dimension Analysis</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#000", margin: 0, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>Valuation Confidence</h3>
        </div>
        <div style={{ textAlign: "center" as const }}>
          <div style={{
            width: 72, height: 72,
            border: `3px solid ${tier.color}`,
            borderRadius: "50%",
            display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: tier.color, fontFamily: "'KakaoBigSans', system-ui, sans-serif", lineHeight: 1 }}>{scores.overall}</span>
            <span style={{ fontSize: 8, color: tier.color, letterSpacing: ".1em" }}>{tier.label}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
        {DIMENSIONS.map(({ key, label, desc }) => (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "#333", fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 10, color: "#BBB" }}>{desc}</span>
            </div>
            <ScoreBar value={scores[key]} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, padding: "12px 16px", background: "#FAFAFA", border: "1px solid #F0F0F0" }}>
        <p style={{ fontSize: 11, color: "#888", lineHeight: 1.6, margin: 0 }}>
          Confidence reflects data availability and comparability, not market certainty. Scores above 70 indicate robust comparable sales data.
        </p>
      </div>
    </div>
  );
}
