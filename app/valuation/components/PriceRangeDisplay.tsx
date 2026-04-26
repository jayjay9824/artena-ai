"use client";
import React from "react";
import { formatPrice } from "../services/currencyService";
import { Currency } from "../types";

interface PriceRangeDisplayProps {
  lowUSD: number;
  midUSD: number;
  highUSD: number;
  low: number;
  mid: number;
  high: number;
  currency: Currency;
  basisLabel: string;
  comparablesCount: number;
  dateRange: string;
  dataQualityWarning?: string;
}

export function PriceRangeDisplay({
  lowUSD, midUSD, highUSD, low, mid, high, currency,
  basisLabel, comparablesCount, dateRange, dataQualityWarning,
}: PriceRangeDisplayProps) {
  const total = highUSD - lowUSD || 1;
  const midPos = ((midUSD - lowUSD) / total) * 100;

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8", padding: "36px 36px 32px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em", textTransform: "uppercase" as const, display: "block", marginBottom: 6 }}>ARTENA · Market Value Engine</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#000", margin: 0, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>Estimated Market Value Range</h3>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <span style={{ fontSize: 9, color: "#CCC", letterSpacing: ".1em", display: "block", marginBottom: 2 }}>BASIS</span>
          <span style={{ fontSize: 11, color: "#8A6A3F", fontWeight: 600 }}>{basisLabel}</span>
        </div>
      </div>

      {/* Three price columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, marginBottom: 20 }}>
        {[
          { label: "CONSERVATIVE", price: low, usd: lowUSD, accent: false },
          { label: "ESTIMATE", price: mid, usd: midUSD, accent: true },
          { label: "OPTIMISTIC", price: high, usd: highUSD, accent: false },
        ].map(({ label, price, usd, accent }) => (
          <div key={label} style={{
            padding: "20px 18px",
            background: accent ? "#8A6A3F" : "#FAFAFA",
            border: `1px solid ${accent ? "#8A6A3F" : "#EBEBEB"}`,
          }}>
            <span style={{ fontSize: 8, letterSpacing: ".18em", color: accent ? "rgba(255,255,255,0.7)" : "#BBB", display: "block", marginBottom: 10 }}>{label}</span>
            <span style={{ fontSize: accent ? 22 : 18, fontWeight: 700, color: accent ? "#FFF" : "#111", fontFamily: "'KakaoBigSans', system-ui, sans-serif", display: "block", marginBottom: 4 }}>
              {formatPrice(price, currency)}
            </span>
            {currency !== "USD" && (
              <span style={{ fontSize: 10, color: accent ? "rgba(255,255,255,0.55)" : "#CCC" }}>
                ≈ ${Math.round(usd / 1000).toLocaleString()}K USD
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Visual bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: "relative" as const, height: 6, background: "#F0F0F0", borderRadius: 0 }}>
          <div style={{
            position: "absolute" as const,
            left: "0%", right: "0%",
            height: "100%",
            background: "linear-gradient(90deg, #E8E6FF 0%, #8A6A3F 50%, #4A44B5 100%)",
          }} />
          <div style={{
            position: "absolute" as const,
            left: `${midPos}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 14, height: 14,
            background: "#8A6A3F",
            border: "2px solid #FFF",
            borderRadius: "50%",
            boxShadow: "0 0 0 2px #8A6A3F",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 9, color: "#CCC" }}>Low</span>
          <span style={{ fontSize: 9, color: "#8A6A3F", fontWeight: 600 }}>Mid Estimate</span>
          <span style={{ fontSize: 9, color: "#CCC" }}>High</span>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 24, paddingTop: 16, borderTop: "1px solid #F5F5F5" }}>
        <div>
          <span style={{ fontSize: 9, color: "#CCC", letterSpacing: ".12em", display: "block", marginBottom: 3 }}>COMPARABLES</span>
          <span style={{ fontSize: 12, color: "#555" }}>{comparablesCount} sales</span>
        </div>
        <div>
          <span style={{ fontSize: 9, color: "#CCC", letterSpacing: ".12em", display: "block", marginBottom: 3 }}>DATE RANGE</span>
          <span style={{ fontSize: 12, color: "#555" }}>{dateRange}</span>
        </div>
        <div>
          <span style={{ fontSize: 9, color: "#CCC", letterSpacing: ".12em", display: "block", marginBottom: 3 }}>CURRENCY</span>
          <span style={{ fontSize: 12, color: "#555" }}>{currency}</span>
        </div>
      </div>

      {dataQualityWarning && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#FFFBF0", border: "1px solid #F5E6C8" }}>
          <span style={{ fontSize: 11, color: "#A07030" }}>{dataQualityWarning}</span>
        </div>
      )}
    </div>
  );
}
