"use client";
import React from "react";

export interface MarketReportData {
  artworkOverview: { artist: string; title: string; year: string; medium: string; size: string; series: string; };
  interpretationLayer: { emotionVector: { label: string; score: number }[]; insight: string; structuralAnalysis: string[]; };
  marketIntelligence: { category: string; careerStage: string; priceRange: string; demandSegment: string; marketTrend: string; trendNote: string; };
  riskAnalysis: string[];
  collectorInsight: { shortTerm: string; midTerm: string; longTerm: string; investmentType: string; notes: string; };
  artenaSummary: string;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
      <span style={{ fontSize: 12, color: "#888", minWidth: 56 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#EFEFEF", position: "relative" as const }}>
        <div style={{ position: "absolute" as const, left: 0, top: "-1px", height: "3px", width: `${score}%`, background: "#8A6A3F", transition: "width 0.8s ease" }} />
      </div>
      <span style={{ fontSize: 11, color: "#8A6A3F", minWidth: 24, textAlign: "right" as const }}>{score}</span>
    </div>
  );
}

function SectionBlock({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #F5F5F5" }}>
        <span style={{ fontSize: 10, color: "#8A6A3F", fontWeight: 600, letterSpacing: ".14em" }}>{number}</span>
        <span style={{ fontSize: 10, color: "#000", letterSpacing: ".16em", textTransform: "uppercase" as const, fontWeight: 700, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "148px 1fr", gap: 8, marginBottom: 11 }}>
      <span style={{ fontSize: 12, color: "#AAA" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#111" }}>{value || "Data not available"}</span>
    </div>
  );
}

function RiskSquares({ level }: { level: string }) {
  const filled = level === "Low" ? 2 : level === "High" ? 5 : 3;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ display: "inline-block", width: 8, height: 8, background: i < filled ? "#8A6A3F" : "#EBEBEB" }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: "#555" }}>{level} Risk</span>
    </div>
  );
}

const TREND = { up: { icon: "↑", color: "#2E7D32", label: "Upward" }, stable: { icon: "→", color: "#888", label: "Stable" }, down: { icon: "↓", color: "#C62828", label: "Declining" } };

export function MarketReport({ data }: { data: MarketReportData }) {
  const trend = TREND[data.marketIntelligence.marketTrend as keyof typeof TREND] || TREND.stable;

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8", padding: "40px 36px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid #F0F0F0" }}>
        <div>
          <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>ARTENA Intelligence Layer</span>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#000", letterSpacing: ".01em", margin: 0, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>Market Intelligence Report</h2>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <span style={{ fontSize: 9, color: "#CCC", letterSpacing: ".12em", display: "block", marginBottom: 4 }}>GENERATED</span>
          <span style={{ fontSize: 11, color: "#AAA" }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {/* 01 */}
      <SectionBlock number="01" title="Artwork Overview">
        <DataRow label="Artist" value={data.artworkOverview.artist} />
        <DataRow label="Title" value={data.artworkOverview.title} />
        <DataRow label="Year" value={data.artworkOverview.year} />
        <DataRow label="Medium" value={data.artworkOverview.medium} />
        <DataRow label="Size" value={data.artworkOverview.size} />
        <DataRow label="Series" value={data.artworkOverview.series} />
      </SectionBlock>

      {/* 02 */}
      <SectionBlock number="02" title="Interpretation Layer">
        <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", textTransform: "uppercase" as const, marginBottom: 16 }}>Emotion Vector</p>
        {data.interpretationLayer.emotionVector.map((e) => (
          <ScoreBar key={e.label} label={e.label} score={e.score} />
        ))}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #F5F5F5" }}>
          <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", textTransform: "uppercase" as const, marginBottom: 12 }}>Insight</p>
          <p style={{ fontSize: 13, color: "#222", lineHeight: 1.85, fontStyle: "italic" }}>"{data.interpretationLayer.insight}"</p>
        </div>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #F5F5F5" }}>
          <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", textTransform: "uppercase" as const, marginBottom: 12 }}>Structural Analysis</p>
          {data.interpretationLayer.structuralAnalysis.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <span style={{ color: "#8A6A3F", fontSize: 11, flexShrink: 0, marginTop: 2 }}>○</span>
              <span style={{ fontSize: 12, color: "#444", lineHeight: 1.75 }}>{s}</span>
            </div>
          ))}
        </div>
      </SectionBlock>

      {/* 03 */}
      <SectionBlock number="03" title="Market Intelligence">
        <DataRow label="Category" value={data.marketIntelligence.category} />
        <DataRow label="Career Stage" value={data.marketIntelligence.careerStage} />
        <DataRow label="Price Range" value={data.marketIntelligence.priceRange} />
        <DataRow label="Demand Segment" value={data.marketIntelligence.demandSegment} />
        <div style={{ display: "grid", gridTemplateColumns: "148px 1fr", gap: 8, marginBottom: 11 }}>
          <span style={{ fontSize: 12, color: "#AAA" }}>Market Trend</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 14, color: trend.color, fontWeight: 500 }}>{trend.icon} {trend.label}</span>
            <span style={{ fontSize: 11, color: "#999" }}>— {data.marketIntelligence.trendNote}</span>
          </div>
        </div>
      </SectionBlock>

      {/* 04 */}
      <SectionBlock number="04" title="Risk Analysis">
        {data.riskAnalysis.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 14 }}>
            <span style={{ fontSize: 10, color: "#CCC", minWidth: 20, paddingTop: 2 }}>0{i + 1}</span>
            <span style={{ fontSize: 12, color: "#444", lineHeight: 1.8 }}>{r}</span>
          </div>
        ))}
      </SectionBlock>

      {/* 05 */}
      <SectionBlock number="05" title="Collector Insight">
        <DataRow label="Short Term" value={data.collectorInsight.shortTerm} />
        <DataRow label="Mid Term" value={data.collectorInsight.midTerm} />
        <DataRow label="Long Term" value={data.collectorInsight.longTerm} />
        <div style={{ display: "grid", gridTemplateColumns: "148px 1fr", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "#AAA" }}>Risk Profile</span>
          <RiskSquares level={data.collectorInsight.investmentType} />
        </div>
        <div style={{ borderLeft: "2px solid #EBEBEB", paddingLeft: 14 }}>
          <p style={{ fontSize: 12, color: "#777", fontStyle: "italic", lineHeight: 1.8, margin: 0 }}>{data.collectorInsight.notes}</p>
        </div>
      </SectionBlock>

      {/* 06 */}
      <SectionBlock number="06" title="ARTENA Insight Summary">
        <div style={{ background: "#FAFAFA", border: "1px solid #F0F0F0", padding: "22px 24px" }}>
          <p style={{ fontSize: 13, color: "#111", lineHeight: 1.95, margin: 0 }}>{data.artenaSummary}</p>
        </div>
      </SectionBlock>

      <div style={{ paddingTop: 20, borderTop: "1px solid #F2F2F2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#CCC", letterSpacing: ".12em" }}>ARTENA · Cultural Intelligence Engine</span>
        <span style={{ fontSize: 9, color: "#CCC" }}>For informational purposes only</span>
      </div>
    </div>
  );
}
