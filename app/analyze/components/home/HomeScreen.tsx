"use client";
import React, { useEffect, useRef } from "react";
import { HomeHero } from "./HomeHero";
import { PrimaryQRScanCard } from "./PrimaryQRScanCard";
import { UsageGuide } from "./UsageGuide";
import { FallbackSection } from "./FallbackSection";
import { SecondaryInputGrid } from "./SecondaryInputGrid";
import { ArtenaGraph } from "./ArtenaGraph";

interface HomeScreenProps {
  /** Opens SmartScanner (QR / artwork / label) */
  onOpenScanner: () => void;
  /** Called when user selects a file via upload or paste */
  onFileSelected: (file: File) => void;
  /** Called when user submits a text search query */
  onTextSubmit: (query: string) => void;
  /** Optional: error message to show below hero */
  error?: string | null;
}

export function HomeScreen({
  onOpenScanner,
  onFileSelected,
  onTextSubmit,
  error,
}: HomeScreenProps) {
  // Clipboard paste support (Ctrl+V anywhere on home screen)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { onFileSelected(file); return; }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onFileSelected]);

  return (
    <div style={{
      padding: "52px 22px 120px",
      maxWidth: 430,
      margin: "0 auto",
      background: "#F9F9FB",
      minHeight: "100vh",
      boxSizing: "border-box" as const,
      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
    }}>
      {/* 1. Brand Hero */}
      <HomeHero />

      {/* Error display */}
      {error && (
        <div style={{
          background: "#FEF2F2", border: "0.5px solid #FECACA",
          borderRadius: 10, padding: "11px 14px", marginBottom: 20,
        }}>
          <p style={{ fontSize: 12, color: "#DC2626", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* 2. Primary QR Scan */}
      <PrimaryQRScanCard onScan={onOpenScanner} />

      {/* 3. Usage Guide */}
      <UsageGuide />

      {/* 4. Fallback UX */}
      <FallbackSection
        onCamera={onOpenScanner}
        onLabel={onOpenScanner}
        onTextSearch={onTextSubmit}
      />

      {/* 5. Secondary Inputs */}
      <SecondaryInputGrid
        onFileSelected={onFileSelected}
        onCamera={onOpenScanner}
        onTextSearch={query => {
          if (query) onTextSubmit(query);
        }}
      />

      {/* 6. Intelligence Graph */}
      <ArtenaGraph />

      {/* Paste hint */}
      <p style={{
        textAlign: "center" as const,
        fontSize: 10.5, color: "#CCCCCC",
        letterSpacing: ".04em",
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        marginTop: -8,
      }}>
        이미지를 클립보드에서 Ctrl+V로 붙여넣을 수 있습니다
      </p>
    </div>
  );
}
