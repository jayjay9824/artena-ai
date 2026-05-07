"use client";
import React from "react";
import { ScoredComparable, Currency } from "../types";
import { formatPrice, convertFromUSD } from "../services/currencyService";

interface ComparableTableProps {
  comparables: ScoredComparable[];
  currency: Currency;
}

const CHANNEL_LABELS: Record<string, string> = {
  auction: "Auction", gallery: "Gallery", fair: "Art Fair", private: "Private Sale",
};

function ScoreDots({ score }: { score: number }) {
  const filled = Math.round(score * 5);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ display: "inline-block", width: 6, height: 6, background: i < filled ? "#8A6A3F" : "#EBEBEB" }} />
      ))}
    </div>
  );
}

export function ComparableTable({ comparables, currency }: ComparableTableProps) {
  if (comparables.length === 0) {
    return (
      <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8", padding: "36px", textAlign: "center" as const }}>
        <span style={{ fontSize: 13, color: "#BBB" }}>No comparable sales data available for this artist.</span>
      </div>
    );
  }

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E8E8E8" }}>
      <div style={{ padding: "28px 36px 20px", borderBottom: "1px solid #F5F5F5" }}>
        <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em", textTransform: "uppercase" as const, display: "block", marginBottom: 6 }}>Comparable Sales</span>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#000", margin: 0, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>Market Reference Transactions</h3>
      </div>

      <div style={{ overflowX: "auto" as const }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
          <thead>
            <tr style={{ background: "#FAFAFA" }}>
              {["WORK", "SIZE", "DATE", "VENUE", "CHANNEL", "PRICE", "MATCH"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left" as const, fontSize: 8, color: "#BBB", letterSpacing: ".16em", fontWeight: 600, borderBottom: "1px solid #F0F0F0", whiteSpace: "nowrap" as const }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparables.map((c, i) => {
              const displayPrice = convertFromUSD(c.normalizedPriceUSD, currency);
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #F7F7F7", background: i % 2 === 0 ? "#FFF" : "#FEFEFE" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ fontSize: 12, color: "#111", margin: 0, marginBottom: 2 }}>{c.title}</p>
                    <p style={{ fontSize: 10, color: "#BBB", margin: 0 }}>{c.year} · {c.medium}</p>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, color: "#555" }}>
                      {c.widthCm && c.heightCm ? `${c.widthCm}×${c.heightCm}` : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, color: "#555", whiteSpace: "nowrap" as const }}>{c.saleDate}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ fontSize: 11, color: "#555", margin: 0, marginBottom: 1 }}>{c.auctionHouse || c.city}</p>
                    <p style={{ fontSize: 10, color: "#BBB", margin: 0 }}>{c.country}</p>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 10, color: "#8A6A3F", background: "#F3F2FF", padding: "3px 8px", whiteSpace: "nowrap" as const }}>
                      {CHANNEL_LABELS[c.saleChannel]}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 12, color: "#111", fontWeight: 600 }}>
                      {formatPrice(displayPrice, currency)}
                    </span>
                    {currency !== "USD" && (
                      <p style={{ fontSize: 9, color: "#CCC", margin: "2px 0 0" }}>
                        ${Math.round(c.normalizedPriceUSD / 1000)}K USD
                      </p>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <ScoreDots score={c.similarityScore} />
                    <span style={{ fontSize: 9, color: "#BBB", display: "block", marginTop: 3 }}>
                      {Math.round(c.similarityScore * 100)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "12px 36px", background: "#FAFAFA", borderTop: "1px solid #F0F0F0" }}>
        <span style={{ fontSize: 10, color: "#CCC" }}>
          All prices normalized to USD. Match score reflects medium, size, and recency similarity to the subject work.
        </span>
      </div>
    </div>
  );
}
