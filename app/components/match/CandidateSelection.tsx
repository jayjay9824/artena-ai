"use client";
import React from "react";
import type { Artwork, MatchedArtwork } from "../../lib/types";

/**
 * Candidate selection — shown when text/image matching surfaces
 * 2+ artworks in the 0.6–0.85 confidence band. Spec calls for the
 * "We found similar artworks" screen with up to 3 candidates and a
 * graceful escape into NoMatch.
 *
 * QR / NFC / AXID never reach this screen — those paths return
 * confident matches directly.
 */

export interface CandidateRow {
  match:   MatchedArtwork;
  artwork: Artwork;          // full record so we can render thumbnail / artist / title / year
  artistName: string;
}

interface Props {
  candidates: CandidateRow[];
  onSelect:   (artworkId: string) => void;
  onNoMatch:  () => void;
}

function badgeFor(confidence: number): { label: string; tone: "best" | "possible" } {
  // ≥ 0.8 of the confident threshold (0.85 × 0.94 ≈ 0.80) → Best match.
  return confidence >= 0.8
    ? { label: "Best match",     tone: "best"     }
    : { label: "Possible match", tone: "possible" };
}

export function CandidateSelection({ candidates, onSelect, onNoMatch }: Props) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8F7F4",
      padding: "60px 22px 80px",
      maxWidth: 480, margin: "0 auto",
      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
    }}>
      {/* Brand */}
      <a
        href="/"
        style={{
          display: "inline-block",
          fontSize: 9, color: "#8A6A3F",
          letterSpacing: ".22em", textTransform: "uppercase",
          textDecoration: "none", marginBottom: 14,
        }}
      >
        AXVELA AI
      </a>

      {/* Title */}
      <h1 style={{
        fontSize: 22, fontWeight: 700, color: "#111111",
        margin: "0 0 8px",
        fontFamily: "'KakaoBigSans', system-ui, sans-serif",
        letterSpacing: "-.02em", lineHeight: 1.2,
      }}>
        We found similar artworks
      </h1>
      <p style={{
        fontSize: 13, color: "#6F6F6F", lineHeight: 1.6,
        margin: "0 0 28px",
      }}>
        Select the correct artwork to continue.
      </p>

      {/* Candidates */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {candidates.slice(0, 3).map(c => {
          const badge = badgeFor(c.match.confidence);
          return (
            <button
              key={c.match.artworkId}
              onClick={() => onSelect(c.match.artworkId)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", padding: "14px 16px",
                background: "#FFFFFF",
                border: "0.5px solid #E7E2D8",
                borderRadius: 14, cursor: "pointer",
                textAlign: "left" as const,
                transition: "border-color .15s, transform .15s, box-shadow .15s",
                fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "#D9C9A6";
                el.style.boxShadow   = "0 4px 18px rgba(138,106,63,0.06)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "#E7E2D8";
                el.style.boxShadow   = "none";
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: 56, height: 56, flexShrink: 0,
                borderRadius: 8, overflow: "hidden",
                background: "#F4EFE5",
                border: "0.5px solid #E7E2D8",
              }}>
                {c.artwork.primaryImageUrl || c.artwork.imageUrl ? (
                  <img
                    src={c.artwork.primaryImageUrl ?? c.artwork.imageUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : null}
              </div>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 600, letterSpacing: ".10em",
                    textTransform: "uppercase",
                    color:      badge.tone === "best" ? "#8A6A3F" : "#6F6F6F",
                    background: badge.tone === "best" ? "#F4EFE5" : "#F1F0EC",
                    padding: "3px 8px", borderRadius: 10,
                  }}>
                    {badge.label}
                  </span>
                </div>
                <p style={{
                  margin: "0 0 2px", fontSize: 13.5, fontWeight: 700, color: "#111111",
                  fontFamily: "'KakaoBigSans', system-ui, sans-serif",
                  letterSpacing: "-.005em",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {c.artistName}
                </p>
                <p style={{
                  margin: 0, fontSize: 12, color: "#6F6F6F",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  <span style={{ fontStyle: "italic" }}>{c.artwork.title}</span>
                  {c.artwork.year ? ` · ${c.artwork.year}` : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Escape hatch */}
      <button
        onClick={onNoMatch}
        style={{
          display: "block",
          width: "100%", padding: "14px 0", marginTop: 22,
          background: "transparent",
          border: "0.5px solid #E7E2D8",
          borderRadius: 12, cursor: "pointer",
          fontSize: 12.5, color: "#6F6F6F", letterSpacing: ".02em",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          transition: "background .15s, border-color .15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F1ECE0"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        I don&apos;t see the correct artwork
      </button>
    </div>
  );
}
