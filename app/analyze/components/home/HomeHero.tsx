"use client";
import React from "react";
import Link from "next/link";
import { useLanguage } from "../../../i18n/useLanguage";

export function HomeHero() {
  const { t } = useLanguage();
  // Sub copy may carry "\n" from translations — render as <br /> rather
  // than display literal escape characters.
  const subLines = t("home.sub").split("\n");

  return (
    <div style={{ paddingBottom: 28 }}>
      {/* Brand line — logo navigates to marketing landing per spec */}
      <Link
        href="/"
        style={{
          display: "flex", alignItems: "center", gap: 9, marginBottom: 22,
          textDecoration: "none", color: "inherit",
        }}
      >
        <span style={{
          fontSize: 18, letterSpacing: ".06em", fontStyle: "italic",
          fontFamily: "'KakaoBigSans', system-ui, sans-serif", color: "#111",
          fontWeight: 800,
        }}>
          {t("common.app_name")}
        </span>
        <span style={{
          fontSize: 8.5, letterSpacing: ".18em", textTransform: "uppercase" as const,
          color: "#AAAAAA", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          paddingTop: 1,
        }}>
          {t("common.tagline")}
        </span>
      </Link>

      {/* Headline */}
      <h1 style={{
        fontSize: 38, fontWeight: 800, color: "#111111", lineHeight: 1.04,
        margin: "0 0 14px",
        fontFamily: "'KakaoBigSans', system-ui, sans-serif",
        letterSpacing: "-.03em",
        fontStyle: "italic",
      }}>
        {t("home.headline")}
      </h1>

      {/* Sub */}
      <p style={{
        fontSize: 13.5, color: "#6F6F6F", lineHeight: 1.68,
        margin: "0 0 4px",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      }}>
        {subLines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}
