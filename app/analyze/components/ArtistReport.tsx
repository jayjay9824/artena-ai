"use client";
import React from "react";

export interface ArtistReportData {
  artistProfile: { name: string; birthYear: string; nationality: string; education: string; };
  artisticIdentity: { coreThemes: string[]; mediums: string[]; conceptualKeywords: string[]; };
  marketPositioning: { popularityScore: number; institutionalScore: number; positionLabel: string; description: string; };
  careerHighlights: { exhibitions: { title: string; venue: string; year: string }[]; institutions: string[]; };
  marketData: { auctionTrend: string; demandTrend: string; priceRange: string; };
  investmentInsight: { holdingPeriod: string; riskLevel: string; growthPotential: string; note: string; };
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

function PositioningMap({ popularityScore, institutionalScore, positionLabel }: { popularityScore: number; institutionalScore: number; positionLabel: string }) {
  return (
    <div>
      <div style={{ position: "relative" as const, width: "100%", height: 120, border: "1px solid #EBEBEB", background: "#FAFAFA", marginBottom: 12 }}>
        {/* Axis labels */}
        <span style={{ position: "absolute" as const, top: 6, left: 10, fontSize: 9, color: "#CCC", letterSpacing: ".1em" }}>INSTITUTIONAL →</span>
        <span style={{ position: "absolute" as const, bottom: 6, right: 10, fontSize: 9, color: "#CCC", letterSpacing: ".1em" }}>← POPULAR</span>
        {/* Grid lines */}
        <div style={{ position: "absolute" as const, left: "50%", top: 0, bottom: 0, borderLeft: "1px dashed #EBEBEB" }} />
        <div style={{ position: "absolute" as const, top: "50%", left: 0, right: 0, borderTop: "1px dashed #EBEBEB" }} />
        {/* Dot */}
        <div style={{
          position: "absolute" as const,
          left: `${institutionalScore}%`,
          top: `${100 - popularityScore}%`,
          transform: "translate(-50%, -50%)",
          width: 10, height: 10,
          background: "#8A6A3F",
          borderRadius: "50%",
        }} />
      </div>
      <p style={{ fontSize: 11, color: "#666", textAlign: "center" as const }}>{positionLabel}</p>
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

export function ArtistReport({ data }: { data: ArtistReportData }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8", padding: "40px 36px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid #F0F0F0" }}>
        <div>
          <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>AXVELA Intelligence Layer</span>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#000", letterSpacing: ".01em", margin: 0, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>Artist Intelligence Report</h2>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <span style={{ fontSize: 9, color: "#CCC", letterSpacing: ".12em", display: "block", marginBottom: 4 }}>GENERATED</span>
          <span style={{ fontSize: 11, color: "#AAA" }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {/* 01 */}
      <SectionBlock number="01" title="Artist Profile">
        <DataRow label="Name" value={data.artistProfile.name} />
        <DataRow label="Birth Year" value={data.artistProfile.birthYear} />
        <DataRow label="Nationality" value={data.artistProfile.nationality} />
        <DataRow label="Education" value={data.artistProfile.education} />
      </SectionBlock>

      {/* 02 */}
      <SectionBlock number="02" title="Artistic Identity">
        <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", textTransform: "uppercase" as const, marginBottom: 12 }}>Core Themes</p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 20 }}>
          {data.artisticIdentity.coreThemes.map((t, i) => (
            <span key={i} style={{ fontSize: 11, color: "#444", background: "#F7F7F7", border: "1px solid #EBEBEB", padding: "4px 12px" }}>{t}</span>
          ))}
        </div>
        <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", textTransform: "uppercase" as const, marginBottom: 12 }}>Medium</p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 20 }}>
          {data.artisticIdentity.mediums.map((m, i) => (
            <span key={i} style={{ fontSize: 11, color: "#444", background: "#F7F7F7", border: "1px solid #EBEBEB", padding: "4px 12px" }}>{m}</span>
          ))}
        </div>
        <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", textTransform: "uppercase" as const, marginBottom: 12 }}>Conceptual Keywords</p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          {data.artisticIdentity.conceptualKeywords.map((k, i) => (
            <span key={i} style={{ fontSize: 11, color: "#8A6A3F", background: "#F3F2FF", border: "1px solid #E8E6FF", padding: "4px 12px" }}>{k}</span>
          ))}
        </div>
      </SectionBlock>

      {/* 03 */}
      <SectionBlock number="03" title="Market Positioning Map">
        <PositioningMap
          popularityScore={data.marketPositioning.popularityScore}
          institutionalScore={data.marketPositioning.institutionalScore}
          positionLabel={data.marketPositioning.positionLabel}
        />
        <p style={{ fontSize: 12, color: "#555", lineHeight: 1.75, marginTop: 14 }}>{data.marketPositioning.description}</p>
      </SectionBlock>

      {/* 04 */}
      <SectionBlock number="04" title="Career Highlights">
        <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", textTransform: "uppercase" as const, marginBottom: 12 }}>Exhibitions</p>
        {data.careerHighlights.exhibitions.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #F7F7F7" }}>
            <span style={{ fontSize: 11, color: "#CCC", minWidth: 36 }}>{e.year}</span>
            <div>
              <p style={{ fontSize: 12, color: "#111", marginBottom: 2 }}>{e.title}</p>
              <p style={{ fontSize: 11, color: "#AAA" }}>{e.venue}</p>
            </div>
          </div>
        ))}
        <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", textTransform: "uppercase" as const, margin: "20px 0 12px" }}>Institutional Collection</p>
        {data.careerHighlights.institutions.map((inst, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <span style={{ color: "#8A6A3F", fontSize: 11, flexShrink: 0, marginTop: 2 }}>○</span>
            <span style={{ fontSize: 12, color: "#444" }}>{inst}</span>
          </div>
        ))}
      </SectionBlock>

      {/* 05 */}
      <SectionBlock number="05" title="Market Data">
        <DataRow label="Auction Trend" value={data.marketData.auctionTrend} />
        <DataRow label="Demand Trend" value={data.marketData.demandTrend} />
        <DataRow label="Price Range" value={data.marketData.priceRange} />
      </SectionBlock>

      {/* 06 */}
      <SectionBlock number="06" title="Investment Insight">
        <DataRow label="Holding Period" value={data.investmentInsight.holdingPeriod} />
        <DataRow label="Growth Potential" value={data.investmentInsight.growthPotential} />
        <div style={{ display: "grid", gridTemplateColumns: "148px 1fr", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "#AAA" }}>Risk Level</span>
          <RiskSquares level={data.investmentInsight.riskLevel} />
        </div>
        <div style={{ background: "#FAFAFA", border: "1px solid #F0F0F0", padding: "22px 24px" }}>
          <p style={{ fontSize: 13, color: "#111", lineHeight: 1.95, margin: 0 }}>{data.investmentInsight.note}</p>
        </div>
      </SectionBlock>

      <div style={{ paddingTop: 20, borderTop: "1px solid #F2F2F2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#CCC", letterSpacing: ".12em" }}>AXVELA · Cultural Intelligence</span>
        <span style={{ fontSize: 9, color: "#CCC" }}>For informational purposes only</span>
      </div>
    </div>
  );
}
