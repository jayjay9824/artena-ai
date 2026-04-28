"use client";
import React from "react";
import { TasteProfile } from "../types/taste";
import { useLanguage } from "../../i18n/useLanguage";

const STRENGTH_CONFIG = {
  forming:  { label: "Profile Forming",  color: "#BBBBBB", bg: "#F6F6F6"    },
  emerging: { label: "Profile Emerging", color: "#C09040", bg: "#FFF9F0"    },
  defined:  { label: "Profile Defined",  color: "#8A6A3F", bg: "#F4EFE5"    },
};

interface TasteStatementProps {
  profile: TasteProfile;
  isDemo: boolean;
}

export function TasteStatement({ profile, isDemo }: TasteStatementProps) {
  const cfg   = STRENGTH_CONFIG[profile.signalStrength];
  const { t } = useLanguage();

  return (
    <div style={{ padding: "32px 22px 36px", borderBottom: "0.5px solid #F2F2F2" }}>
      {/* Signal strength row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <span style={{
          fontSize: 8, letterSpacing: ".18em", color: cfg.color,
          background: cfg.bg, padding: "4px 10px",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        }}>
          {cfg.label.toUpperCase()}
        </span>
        <span style={{ fontSize: 9, color: "#D0D0D0", letterSpacing: ".04em" }}>
          {isDemo
            ? `DEMO · ${t("taste.based_on", { n: 4 })}`
            : t("taste.based_on", { n: profile.collectionSize })}
        </span>
      </div>

      {/* Main statement */}
      <blockquote style={{ margin: "0 0 20px", padding: 0 }}>
        <p style={{
          fontSize: 22, fontWeight: 400, color: "#0D0D0D",
          lineHeight: 1.42, margin: 0,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          letterSpacing: "-.01em",
        }}>
          "{profile.statement}"
        </p>
      </blockquote>

      {/* Sub-statement */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
        <div style={{ width: 2, background: "#8A6A3F", opacity: 0.35, flexShrink: 0, borderRadius: 1, marginRight: 14 }} />
        <p style={{
          fontSize: 13, color: "#666", lineHeight: 1.76, margin: 0,
          fontStyle: "italic", fontFamily: "Georgia, serif",
        }}>
          {profile.subStatement}
        </p>
      </div>
    </div>
  );
}
