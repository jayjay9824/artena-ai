"use client";
import React from "react";
import { Recommendation } from "../types/recommendation";

interface FeedItemProps {
  rec: Recommendation;
  imageUrl: string | null;
  variant: "large" | "small";
  flip?: boolean;
  onTap: () => void;
  onLike: () => void;
  onSave: () => void;
}

function Placeholder({ accentColor, initials }: { accentColor: string; initials: string }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: `linear-gradient(135deg, ${accentColor}1C 0%, #121212 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{
        fontSize: 30, color: accentColor, opacity: 0.12,
        fontFamily: "Georgia, serif", letterSpacing: 2, userSelect: "none",
      }}>
        {initials}
      </span>
    </div>
  );
}

function MiniActionBtn({ active, activeColor, icon, label, onClick }: {
  active: boolean; activeColor: string; icon: string; label: string; onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
    >
      <span style={{ fontSize: 14, color: active ? activeColor : "#D8D8D8", transition: "color .15s, transform .2s", transform: active ? "scale(1.22)" : "scale(1)", display: "block", lineHeight: 1 }}>
        {icon}
      </span>
      <span style={{ fontSize: 8, color: active ? activeColor : "#C8C8C8", letterSpacing: ".04em" }}>{label}</span>
    </button>
  );
}

export function FeedItem({ rec, imageUrl, variant, flip = false, onTap, onLike, onSave }: FeedItemProps) {
  const initials = rec.artist.split(" ").map(w => w[0]).slice(0, 2).join("");

  if (variant === "large") {
    return (
      <div style={{ display: "flex", flexDirection: flip ? "row-reverse" : "row", borderTop: "0.5px solid #F2F2F2" }}>
        {/* Image */}
        <div
          onClick={onTap}
          style={{ width: "44%", flexShrink: 0, position: "relative", cursor: "pointer", overflow: "hidden", background: "#111" }}
        >
          <div style={{ paddingBottom: "133%" }} />
          <div style={{ position: "absolute", inset: 0 }}>
            {imageUrl
              ? <img src={imageUrl} alt={rec.artist} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : <Placeholder accentColor={rec.accentColor} initials={initials} />
            }
          </div>
        </div>

        {/* Text */}
        <div style={{ flex: 1, padding: "24px 20px 24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            {/* Tier + Style tags */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ fontSize: 8, letterSpacing: ".12em", color: "#1856FF", background: "#1856FF0D", padding: "3px 7px" }}>
                {rec.marketTier}
              </span>
              <span style={{ fontSize: 8, letterSpacing: ".1em", color: "#AAA", background: "#F4F4F4", padding: "3px 7px" }}>
                {rec.style}
              </span>
            </div>

            <h3
              onClick={onTap}
              style={{ fontSize: 17, fontWeight: 700, color: "#0E0E0E", margin: "0 0 4px", lineHeight: 1.2, fontFamily: "'KakaoBigSans', system-ui, sans-serif", cursor: "pointer" }}
            >
              {rec.artist}
            </h3>
            <p style={{ fontSize: 12, color: "#999", margin: "0 0 18px", fontStyle: "italic", fontFamily: "Georgia, serif" }}>
              {rec.title}, {rec.year}
            </p>

            {/* Reason */}
            <p style={{
              fontSize: 11, color: "#555", lineHeight: 1.78, margin: 0,
              paddingLeft: 10, borderLeft: "2px solid #EBEBEB",
              fontStyle: "italic",
            }}>
              {rec.reason}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 14, marginTop: 20, alignItems: "center" }}>
            <MiniActionBtn active={rec.liked} activeColor="#E04848" icon={rec.liked ? "♥" : "♡"} label="좋아요" onClick={(e) => { e.stopPropagation(); onLike(); }} />
            <MiniActionBtn active={rec.saved} activeColor="#1856FF" icon={rec.saved ? "◆" : "◇"} label="저장" onClick={(e) => { e.stopPropagation(); onSave(); }} />
            <button
              onClick={onTap}
              style={{ marginLeft: "auto", background: "none", border: "0.5px solid #E4E4E4", cursor: "pointer", padding: "5px 11px", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}
            >
              <span style={{ fontSize: 9, color: "#777", letterSpacing: ".06em" }}>Report</span>
              <span style={{ fontSize: 9, color: "#C4C4C4" }}>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Small variant (used in 2-col pairs)
  return (
    <div style={{ display: "flex", flexDirection: "column", cursor: "pointer" }} onClick={onTap}>
      {/* Image */}
      <div style={{ position: "relative", width: "100%", background: "#111", overflow: "hidden" }}>
        <div style={{ paddingBottom: "100%" }} />
        <div style={{ position: "absolute", inset: 0 }}>
          {imageUrl
            ? <img src={imageUrl} alt={rec.artist} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <Placeholder accentColor={rec.accentColor} initials={initials} />
          }
        </div>
        {/* Like overlay button */}
        <button
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          style={{
            position: "absolute", top: 7, right: 7,
            width: 26, height: 26, borderRadius: "50%",
            background: "rgba(0,0,0,0.32)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <span style={{ fontSize: 11, color: rec.liked ? "#E04848" : "rgba(255,255,255,0.8)", lineHeight: 1 }}>
            {rec.liked ? "♥" : "♡"}
          </span>
        </button>
      </div>

      {/* Text */}
      <div style={{ padding: "10px 0 4px" }}>
        <p style={{ fontSize: 8, color: "#C4C4C4", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 5px" }}>
          {rec.marketTier}
        </p>
        <h4 style={{ fontSize: 12, fontWeight: 700, color: "#111", margin: "0 0 2px", lineHeight: 1.2, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
          {rec.artist}
        </h4>
        <p style={{ fontSize: 10, color: "#A0A0A0", margin: "0 0 7px", fontStyle: "italic", fontFamily: "Georgia, serif", lineHeight: 1.3 }}>
          {rec.title}
        </p>
        <p style={{ fontSize: 9, color: "#888", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
          {rec.reason}
        </p>
      </div>
    </div>
  );
}
