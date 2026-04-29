"use client";
import React, { useState } from "react";
import { Upload, FileSpreadsheet, ArrowRight, Link2, Database } from "lucide-react";
import { MOCK_GALLERY } from "../../services/galleryConsole/mockData";

/**
 * Bulk Upload — Gallery-side placeholder. Real implementation will:
 *   1. accept a CSV/XLSX upload
 *   2. preview the first N rows
 *   3. let the gallery map source columns → AXVELA Artwork fields
 *   4. dry-run validation, then commit to gallery_id ↔ artwork_id pairs
 *
 * V1: a static walk-through so galleries see what's coming and the
 * IA is locked in. No write paths wired yet.
 */

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

const REQUIRED_FIELDS: { axvela: string; example: string }[] = [
  { axvela: "title",            example: "From Point" },
  { axvela: "artistName",       example: "Lee Ufan" },
  { axvela: "year",             example: "1976" },
  { axvela: "medium",           example: "Oil on canvas" },
  { axvela: "dimensions",       example: "100 × 80 cm" },
  { axvela: "primaryImageUrl",  example: "https://cdn…/lu-from-point.jpg" },
  { axvela: "axid",             example: "AX-LU-1976-014 (optional)" },
  { axvela: "priceVisibility",  example: "public | on_request | private" },
  { axvela: "availabilityStatus", example: "available | reserved | sold | not_for_sale" },
];

export default function BulkUploadPage() {
  const [step, setStep] = useState<"upload" | "mapping" | "linking">("upload");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8F7F4",
      fontFamily: FONT,
    }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 28px 60px" }}>
        {/* Header */}
        <a
          href="/console"
          style={{
            display: "inline-block",
            fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
            textTransform: "uppercase" as const, margin: "0 0 10px",
            textDecoration: "none",
          }}
        >
          ← AXVELA AI · Gallery Console
        </a>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: "#1C1A17",
          margin: "0 0 6px",
          fontFamily: FONT_HEAD, letterSpacing: "-.025em", lineHeight: 1.05,
        }}>
          Bulk Upload
        </h1>
        <p style={{ fontSize: 13, color: "#6F6F6F", margin: "0 0 28px" }}>
          Bring an entire show online — CSV or Excel, mapped to AXVELA Artwork fields.
          Each row is linked to <strong>{MOCK_GALLERY.name}</strong> on commit.
        </p>

        {/* Step indicator */}
        <Steps step={step} />

        {/* Step body */}
        <div style={{ marginTop: 24 }}>
          {step === "upload"  && <UploadStep onNext={() => setStep("mapping")} />}
          {step === "mapping" && <MappingStep onNext={() => setStep("linking")} onBack={() => setStep("upload")} />}
          {step === "linking" && <LinkingStep onBack={() => setStep("mapping")} />}
        </div>

        {/* Disclaimer */}
        <p style={{
          fontSize: 11, color: "#9A9A9A", lineHeight: 1.6,
          margin: "32px 0 0",
          padding: "12px 14px",
          background: "#FFFFFF",
          border: "0.5px solid #E7E2D8",
          borderRadius: 10,
        }}>
          Preview interface · No data is committed in V1. Real ingest will dry-run validate
          each row, return mapping errors, and then atomically link
          <code style={{ background: "#F1ECE0", padding: "1px 5px", margin: "0 4px", borderRadius: 4 }}>artwork_id</code>
          ↔
          <code style={{ background: "#F1ECE0", padding: "1px 5px", margin: "0 4px", borderRadius: 4 }}>gallery_id</code>.
        </p>
      </div>
    </div>
  );
}

/* ── Steps indicator ─────────────────────────────────────────────── */

function Steps({ step }: { step: "upload" | "mapping" | "linking" }) {
  const steps = [
    { id: "upload",  label: "1 · Upload" },
    { id: "mapping", label: "2 · Map fields" },
    { id: "linking", label: "3 · Link & commit" },
  ];
  const currentIdx = steps.findIndex(s => s.id === step);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {steps.map((s, i) => {
        const active = i === currentIdx;
        const done   = i <  currentIdx;
        return (
          <div
            key={s.id}
            style={{
              flex: 1, padding: "10px 14px",
              background: active ? "#FFFFFF" : "transparent",
              border: `0.5px solid ${active ? "#D9C9A6" : "#E7E2D8"}`,
              borderRadius: 12,
              fontSize: 11, color: done ? "#8A6A3F" : active ? "#1C1A17" : "#9A9A9A",
              fontWeight: active ? 700 : 500,
              letterSpacing: ".02em",
            }}
          >
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

/* ── Step 1: Upload ──────────────────────────────────────────────── */

function UploadStep({ onNext }: { onNext: () => void }) {
  return (
    <section style={cardStyle()}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
        <div style={iconWell()}><Upload size={18} strokeWidth={1.5} color="#8A6A3F" /></div>
        <div>
          <h2 style={h2Style()}>Drop your file</h2>
          <p style={pStyle()}>
            CSV or XLSX, one artwork per row. Up to 500 rows per upload.
          </p>
        </div>
      </div>

      {/* Drop zone */}
      <div style={{
        border: "1.5px dashed #D9C9A6",
        borderRadius: 14,
        padding: "36px 20px",
        textAlign: "center" as const,
        background: "#FFFFFF",
      }}>
        <FileSpreadsheet size={28} strokeWidth={1.4} color="#8A6A3F" />
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1A17", margin: "12px 0 4px" }}>
          Drop a CSV or XLSX here
        </p>
        <p style={{ fontSize: 11, color: "#9A9A9A", margin: "0 0 16px" }}>
          or click to browse — placeholder, no upload happens yet
        </p>
        <button
          onClick={onNext}
          disabled
          style={{
            padding: "10px 20px",
            background: "#F1ECE0",
            color: "#9A9A9A",
            border: "0.5px solid #D9C9A6",
            borderRadius: 10, cursor: "not-allowed",
            fontSize: 12, fontWeight: 600, letterSpacing: ".04em",
            fontFamily: FONT,
          }}
        >
          Browse files
        </button>
      </div>

      <button
        onClick={onNext}
        style={primaryBtnStyle()}
      >
        Continue with sample data
        <ArrowRight size={14} strokeWidth={1.6} />
      </button>
    </section>
  );
}

/* ── Step 2: Mapping ─────────────────────────────────────────────── */

function MappingStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <section style={cardStyle()}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
        <div style={iconWell()}><Database size={18} strokeWidth={1.5} color="#8A6A3F" /></div>
        <div>
          <h2 style={h2Style()}>Map source columns to AXVELA fields</h2>
          <p style={pStyle()}>
            The required fields below mirror Artwork in the AXVELA registry. AXID is optional but recommended for trust-tier upgrades.
          </p>
        </div>
      </div>

      <div style={{
        background: "#FFFFFF",
        border: "0.5px solid #E7E2D8",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={mapHeaderStyle()}>
          <span>AXVELA field</span>
          <span>Example value</span>
        </div>
        {REQUIRED_FIELDS.map((f, i) => (
          <div
            key={f.axvela}
            style={{
              display: "grid", gridTemplateColumns: "1fr 1.5fr",
              padding: "10px 16px",
              borderTop: i === 0 ? "none" : "0.5px solid #F1ECE0",
              fontSize: 12,
            }}
          >
            <code style={{ color: "#8A6A3F", fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {f.axvela}
            </code>
            <span style={{ color: "#6F6F6F" }}>{f.example}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onBack} style={secondaryBtnStyle()}>Back</button>
        <button onClick={onNext} style={{ ...primaryBtnStyle(), marginTop: 0, flex: 1 }}>
          Looks good — continue
          <ArrowRight size={14} strokeWidth={1.6} />
        </button>
      </div>
    </section>
  );
}

/* ── Step 3: Linking ─────────────────────────────────────────────── */

function LinkingStep({ onBack }: { onBack: () => void }) {
  return (
    <section style={cardStyle()}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
        <div style={iconWell()}><Link2 size={18} strokeWidth={1.5} color="#8A6A3F" /></div>
        <div>
          <h2 style={h2Style()}>Link to your gallery</h2>
          <p style={pStyle()}>
            Each Artwork row will be stamped with this gallery&apos;s id on commit. Public collectors will see the works under
            <strong> {MOCK_GALLERY.name}</strong> in the AXVELA Gallery showcase.
          </p>
        </div>
      </div>

      <div style={{
        background: "#FFFFFF",
        border: "0.5px solid #E7E2D8",
        borderRadius: 12,
        padding: "16px 18px",
        display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px",
        fontSize: 12,
      }}>
        <span style={{ color: "#9A9A9A" }}>gallery_id</span>
        <code style={{ color: "#1C1A17", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {MOCK_GALLERY.id}
        </code>
        <span style={{ color: "#9A9A9A" }}>name</span>
        <span style={{ color: "#1C1A17" }}>{MOCK_GALLERY.name}</span>
        <span style={{ color: "#9A9A9A" }}>artworks_to_link</span>
        <code style={{ color: "#1C1A17", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          12 (sample)
        </code>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onBack} style={secondaryBtnStyle()}>Back</button>
        <button
          disabled
          style={{
            ...primaryBtnStyle(), marginTop: 0, flex: 1,
            background: "#F1ECE0", color: "#9A9A9A", cursor: "not-allowed",
          }}
        >
          Commit (placeholder)
        </button>
      </div>
    </section>
  );
}

/* ── Style helpers ───────────────────────────────────────────────── */

function cardStyle(): React.CSSProperties {
  return {
    background: "#FFFFFF",
    border: "0.5px solid #E7E2D8",
    borderRadius: 16,
    padding: "22px 22px 24px",
  };
}
function iconWell(): React.CSSProperties {
  return {
    width: 36, height: 36, flexShrink: 0,
    background: "#F4EFE5",
    borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
function h2Style(): React.CSSProperties {
  return {
    fontSize: 16, fontWeight: 700, color: "#1C1A17",
    margin: "0 0 4px",
    fontFamily: FONT_HEAD, letterSpacing: "-.01em",
  };
}
function pStyle(): React.CSSProperties {
  return { fontSize: 12, color: "#6F6F6F", margin: 0, lineHeight: 1.6 };
}
function mapHeaderStyle(): React.CSSProperties {
  return {
    display: "grid", gridTemplateColumns: "1fr 1.5fr",
    padding: "10px 16px",
    background: "#F8F7F4",
    fontSize: 9, color: "#9A9A9A",
    letterSpacing: ".18em", textTransform: "uppercase" as const,
    fontWeight: 600,
    borderBottom: "0.5px solid #E7E2D8",
  };
}
function primaryBtnStyle(): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
    width: "100%", padding: "13px 0",
    background: "#1C1A17", color: "#FFFFFF",
    border: "none", borderRadius: 12,
    fontSize: 13, fontWeight: 700, letterSpacing: ".04em",
    fontFamily: FONT,
    cursor: "pointer", marginTop: 16,
  };
}
function secondaryBtnStyle(): React.CSSProperties {
  return {
    padding: "12px 22px",
    background: "#FFFFFF",
    border: "0.5px solid #E7E2D8",
    borderRadius: 12,
    fontSize: 12, fontWeight: 600, color: "#6F6F6F",
    fontFamily: FONT,
    cursor: "pointer",
  };
}
