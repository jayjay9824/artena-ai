"use client";
import React from "react";
import type { QuickView as QuickViewData } from "../types/staged";
import { TranslatableText } from "./TranslatableText";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

/**
 * STEP 1 — Quick View card.
 *
 * Renders the seven spec-mandated fields (title, artist, year,
 * 1-line interpretation, 3 keywords, exhibition/gallery info) and
 * nothing else — minimal layout, instant render, no heavy data
 * tables. The card paints once and stays visible across the entire
 * loading window per spec ("Quick View must remain visible").
 */
export function QuickView({
  data,
  imagePreview,
}: {
  data:         QuickViewData;
  imagePreview: string | null;
}) {
  const keywords = (data.keywords ?? []).slice(0, 3);
  const exhibition = data.exhibitionVenue && data.exhibitionVenue.trim()
    ? data.exhibitionVenue.trim()
    : null;

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: 18,
      border: "0.5px solid #EFEAE0",
      padding: imagePreview ? 0 : "22px 22px 24px",
      boxShadow: "0 6px 28px rgba(0,0,0,0.05)",
      animation: "qv-fade-in .35s ease",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes qv-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {imagePreview && (
        <div style={{ aspectRatio: "16/10", background: "#0D0D0D", overflow: "hidden" }}>
          <img
            src={imagePreview}
            alt={data.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      <div style={{ padding: imagePreview ? "20px 22px 22px" : 0 }}>
        <p style={{
          fontSize: 8.5, color: "#8A6A3F", letterSpacing: ".22em",
          textTransform: "uppercase" as const, margin: "0 0 10px",
          fontFamily: FONT, fontWeight: 600,
        }}>
          ◆ Quick View
        </p>

        <h2 style={{
          fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#0D0D0D",
          fontFamily: FONT_HEAD, letterSpacing: "-.02em", lineHeight: 1.2,
        }}>
          {data.title}
        </h2>

        <p style={{ fontSize: 13, color: "#555", margin: "0 0 2px", fontFamily: FONT }}>
          {data.artist}
        </p>

        {data.year && (
          <p style={{
            fontSize: 12, color: "#9A9A9A", margin: "0 0 14px",
            fontFamily: FONT, fontStyle: "italic",
          }}>
            {data.year}
          </p>
        )}

        {data.oneLineInterpretation && (
          <div style={{
            margin: "0 0 14px",
            paddingLeft: 12, borderLeft: "2px solid #8A6A3F",
          }}>
            <TranslatableText
              text={data.oneLineInterpretation}
              style={{
                fontSize: 13, color: "#2A2A2A", lineHeight: 1.7,
                fontStyle: "italic", fontFamily: "Georgia, serif",
              }}
            />
          </div>
        )}

        {keywords.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: exhibition ? 14 : 0 }}>
            {keywords.map(k => (
              <span key={k} style={{
                fontSize: 10, color: "#8A6A3F", background: "#8A6A3F0D",
                padding: "4px 10px", letterSpacing: ".04em",
                fontFamily: FONT,
              }}>
                {k}
              </span>
            ))}
          </div>
        )}

        {exhibition && (
          <p style={{
            fontSize: 11, color: "#888", margin: 0,
            paddingTop: 12, borderTop: "0.5px solid #F2F2F2",
            fontFamily: FONT,
          }}>
            {exhibition}
          </p>
        )}
      </div>
    </div>
  );
}
