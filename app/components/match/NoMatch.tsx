"use client";
import React from "react";
import { ImageOff, Camera, Search, Pencil } from "lucide-react";

/**
 * NoMatch — shown when the matcher returns kind: "no_match" OR when
 * the user clicks "I don't see the correct artwork" on
 * CandidateSelection. The trust-first message is non-negotiable: we
 * do not fabricate an analysis to fill the screen.
 */

interface Props {
  onTryAnotherImage: () => void;
  onSearchByText:    () => void;
  onEnterManually:   () => void;
}

export function NoMatch({ onTryAnotherImage, onSearchByText, onEnterManually }: Props) {
  return (
    <div style={{
      minHeight: "calc(var(--vh, 1vh) * 100)",
      background: "#F8F7F4",
      padding: "60px 22px 80px",
      maxWidth: 480, margin: "0 auto",
      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* Brand */}
      <a
        href="/"
        style={{
          display: "inline-block",
          fontSize: 9, color: "#8A6A3F",
          letterSpacing: ".22em", textTransform: "uppercase",
          textDecoration: "none", marginBottom: 32,
        }}
      >
        AXVELA AI
      </a>

      {/* Icon */}
      <div style={{
        width: 56, height: 56,
        background: "#FFFFFF",
        border: "0.5px solid #E7E2D8",
        borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 22,
      }}>
        <ImageOff size={22} strokeWidth={1.5} color="#8A6A3F" />
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: 22, fontWeight: 700, color: "#111111",
        margin: "0 0 10px",
        fontFamily: "'KakaoBigSans', system-ui, sans-serif",
        letterSpacing: "-.02em", lineHeight: 1.25,
      }}>
        We couldn&apos;t match this artwork with high confidence.
      </h1>
      <p style={{
        fontSize: 13, color: "#6F6F6F", lineHeight: 1.65,
        margin: "0 0 32px",
      }}>
        AXVELA only shows results when the artwork can be matched to a reliable record.
      </p>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ActionRow
          Icon={Camera}
          label="Try another image"
          onClick={onTryAnotherImage}
          primary
        />
        <ActionRow
          Icon={Search}
          label="Search by artist or title"
          onClick={onSearchByText}
        />
        <ActionRow
          Icon={Pencil}
          label="Enter artwork details manually"
          onClick={onEnterManually}
        />
      </div>
    </div>
  );
}

interface ActionRowProps {
  Icon:    typeof Camera;
  label:   string;
  onClick: () => void;
  primary?: boolean;
}

function ActionRow({ Icon, label, onClick, primary = false }: ActionRowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        width: "100%", padding: "14px 16px",
        background: primary ? "#111111" : "#FFFFFF",
        border: primary ? "none" : "0.5px solid #E7E2D8",
        borderRadius: 12, cursor: "pointer",
        textAlign: "left" as const,
        color: primary ? "#FFFFFF" : "#1C1A17",
        fontSize: 13, fontWeight: 600,
        letterSpacing: ".005em",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        transition: "background .15s, border-color .15s, opacity .15s",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        if (primary) el.style.opacity = "0.88";
        else         el.style.background = "#F1ECE0";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        if (primary) el.style.opacity = "1";
        else         el.style.background = "#FFFFFF";
      }}
    >
      <Icon size={16} strokeWidth={1.5} color={primary ? "#FFFFFF" : "#8A6A3F"} />
      <span>{label}</span>
    </button>
  );
}
