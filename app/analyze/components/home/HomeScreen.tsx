"use client";
import React, { useEffect } from "react";
import { HomeHero } from "./HomeHero";
import { PrimaryQRScanCard } from "./PrimaryQRScanCard";
import { SecondaryInputGrid } from "./SecondaryInputGrid";
import { DataLayers } from "./DataLayers";

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
      background: "#FAF9F6",
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

      {/* 2. Smart Scan CTA (primary) */}
      <PrimaryQRScanCard onScan={onOpenScanner} />

      {/* 3. Alternative Inputs (secondary) */}
      <SecondaryInputGrid
        onFileSelected={onFileSelected}
        onCamera={onOpenScanner}
        onTextSearch={query => {
          if (query) onTextSubmit(query);
        }}
      />

      {/* 4. ARTENA reads — minimal data layers row */}
      <DataLayers />
    </div>
  );
}
