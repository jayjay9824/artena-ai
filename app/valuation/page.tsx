"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ValuationInput, ValuationResult } from "./types";
import { ValuationForm } from "./components/ValuationForm";
import { PriceRangeDisplay } from "./components/PriceRangeDisplay";
import { ConfidencePanel } from "./components/ConfidencePanel";
import { ComparableTable } from "./components/ComparableTable";

function InsightBlock({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div style={{ background: "#FFF", border: "1px solid #E8E8E8", padding: "28px 32px" }}>
      <span style={{ fontSize: 9, color, letterSpacing: ".18em", textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>{title}</span>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color, fontSize: 10, marginTop: 2, flexShrink: 0 }}>◆</span>
            <span style={{ fontSize: 12, color: "#444", lineHeight: 1.6 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProseBlock({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ background: "#FFF", border: "1px solid #E8E8E8", padding: "28px 32px" }}>
      <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".18em", textTransform: "uppercase" as const, display: "block", marginBottom: 10 }}>{title}</span>
      <p style={{ fontSize: 13, color: "#333", lineHeight: 1.85, margin: 0 }}>{text}</p>
    </div>
  );
}

function ValuationPageInner() {
  const searchParams = useSearchParams();
  const initialArtist = searchParams.get("artist") || "";
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (input: ValuationInput) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Valuation request failed");
      const data: ValuationResult = await res.json();
      setResult(data);
      setTimeout(() => {
        document.getElementById("valuation-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setError("An error occurred while generating the estimate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8F8F8", fontFamily: "'KakaoSmallSans', system-ui, sans-serif" }}>
      {/* Nav */}
      <div style={{ background: "#FFF", borderBottom: "1px solid #EBEBEB", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#000", letterSpacing: ".04em", fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>ARTENA</span>
        </a>
        <div style={{ display: "flex", gap: 28 }}>
          <a href="/analyze" style={{ fontSize: 11, color: "#888", textDecoration: "none", letterSpacing: ".06em" }}>ANALYZE</a>
          <a href="/valuation" style={{ fontSize: 11, color: "#8A6A3F", textDecoration: "none", letterSpacing: ".06em", fontWeight: 600 }}>VALUATION</a>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-block", background: "#8A6A3F", padding: "4px 14px", marginBottom: 14 }}>
            <span style={{ fontSize: 9, color: "#FFF", letterSpacing: ".22em" }}>INTELLIGENCE LAYER · BETA</span>
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: "#000", margin: "0 0 12px", fontFamily: "'KakaoBigSans', system-ui, sans-serif", lineHeight: 1.2 }}>
            Market Value Estimator
          </h1>
          <p style={{ fontSize: 14, color: "#888", margin: 0, lineHeight: 1.7, maxWidth: 560 }}>
            Powered by ARTENA's Explainable Market Intelligence Engine — combining 40+ comparable sales across Seoul, New York, London, and Hong Kong with AI-driven analysis.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          <ValuationForm onSubmit={handleSubmit} loading={loading} initialArtist={initialArtist} />

          {error && (
            <div style={{ padding: "16px 20px", background: "#FFF5F5", border: "1px solid #FFCDD2" }}>
              <span style={{ fontSize: 13, color: "#D32F2F" }}>{error}</span>
            </div>
          )}

          {loading && (
            <div style={{ background: "#FFF", border: "1px solid #E8E8E8", padding: "60px 36px", textAlign: "center" as const }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "inline-flex", gap: 6 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      width: 8, height: 8, background: "#8A6A3F", borderRadius: "50%",
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Scanning comparable sales database and generating market analysis...</p>
              <style>{`@keyframes pulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
            </div>
          )}

          {result && (
            <div id="valuation-results" style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
              {/* Price range — full width */}
              <PriceRangeDisplay
                {...result.priceRange}
                basisLabel={result.basisLabel}
                comparablesCount={result.comparablesCount}
                dateRange={result.dateRange}
                dataQualityWarning={result.dataQualityWarning}
              />

              {/* Confidence + Key Drivers side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
                <ConfidencePanel scores={result.confidence} />
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
                  {result.keyDrivers?.length > 0 && (
                    <InsightBlock title="Key Value Drivers" items={result.keyDrivers} color="#8A6A3F" />
                  )}
                  {result.riskFactors?.length > 0 && (
                    <InsightBlock title="Risk Considerations" items={result.riskFactors} color="#E0954A" />
                  )}
                </div>
              </div>

              {/* Market Context + Methodology */}
              {result.marketContext && <ProseBlock title="Market Context" text={result.marketContext} />}
              {result.explanation && <ProseBlock title="Valuation Methodology" text={result.explanation} />}

              {/* Comparables table */}
              <ComparableTable comparables={result.topComparables} currency={result.priceRange.currency} />

              <div style={{ paddingTop: 8, display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 10, color: "#CCC", letterSpacing: ".08em" }}>
                  ARTENA Intelligence Layer · For informational purposes only · Not financial advice
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ValuationPage() {
  return (
    <Suspense fallback={null}>
      <ValuationPageInner />
    </Suspense>
  );
}
