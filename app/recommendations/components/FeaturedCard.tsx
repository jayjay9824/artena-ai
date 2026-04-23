"use client";
import React from "react";
import { Recommendation } from "../types/recommendation";

interface FeaturedCardProps {
  rec: Recommendation;
  imageUrl: string | null;
  onTap: () => void;
}

export function FeaturedCard({ rec, imageUrl, onTap }: FeaturedCardProps) {
  const initials = rec.artist.split(" ").map(w => w[0]).slice(0, 2).join("");

  return (
    <div
      onClick={onTap}
      style={{
        position: "relative", width: "100%", height: 460,
        overflow: "hidden", cursor: "pointer", background: "#0F0F0F",
        userSelect: "none",
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl} alt={rec.artist}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.07)", transformOrigin: "center top", display: "block" }}
        />
      ) : (
        <div style={{
          width: "100%", height: "100%",
          background: `linear-gradient(160deg, ${rec.accentColor}18 0%, #0d0d0d 42%, #181818 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 100, color: rec.accentColor, opacity: 0.06,
            fontFamily: "'KakaoBigSans', Georgia, serif", letterSpacing: "-.03em",
            userSelect: "none",
          }}>
            {initials}
          </span>
        </div>
      )}

      {/* Gradient overlay — heavy at bottom */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, transparent 22%, rgba(0,0,0,0.72) 68%, rgba(0,0,0,0.94) 100%)",
      }} />

      {/* "Curated for you" pill — top right */}
      <div style={{ position: "absolute", top: 52, right: 18 }}>
        <span style={{
          fontSize: 8, letterSpacing: ".18em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          padding: "5px 11px", borderRadius: 20,
        }}>
          Curated for you
        </span>
      </div>

      {/* Bottom text block */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 22px 36px" }}>
        <p style={{
          fontSize: 8, letterSpacing: ".24em", textTransform: "uppercase",
          color: rec.accentColor, margin: "0 0 12px", opacity: 0.75,
        }}>
          Featured Recommendation
        </p>
        <h2 style={{
          fontSize: 30, fontWeight: 700, color: "#FFFFFF",
          margin: "0 0 5px", lineHeight: 1.08,
          fontFamily: "'KakaoBigSans', system-ui, sans-serif",
          letterSpacing: "-.02em",
        }}>
          {rec.artist}
        </h2>
        <p style={{
          fontSize: 14, color: "rgba(255,255,255,0.58)", margin: "0 0 18px",
          fontStyle: "italic", fontFamily: "Georgia, serif",
        }}>
          {rec.title}, {rec.year}
        </p>

        {/* Reason with accent left border */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          <div style={{ width: 2, background: rec.accentColor, opacity: 0.6, flexShrink: 0, borderRadius: 1, marginRight: 12 }} />
          <p style={{
            fontSize: 12, color: "rgba(255,255,255,0.46)", margin: 0,
            lineHeight: 1.7, fontStyle: "italic",
          }}>
            {rec.reason}
          </p>
        </div>
      </div>
    </div>
  );
}
