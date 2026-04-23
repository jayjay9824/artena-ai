"use client";
import React, { useState } from "react";
import { ValuationInput, Currency, Condition } from "../types";
import { getAllArtists } from "../services/comparableData";

const MEDIUMS = ["oil", "acrylic", "works-on-paper", "print", "sculpture", "photography", "spray", "mixed", "other"];
const CONDITIONS: Condition[] = ["excellent", "good", "fair", "poor"];
const CURRENCIES: Currency[] = ["KRW", "USD", "EUR"];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", fontSize: 13, color: "#111",
  border: "1px solid #E0E0E0", background: "#FAFAFA", outline: "none",
  fontFamily: "'KakaoSmallSans', system-ui, sans-serif", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 9, color: "#AAA", letterSpacing: ".16em", textTransform: "uppercase", display: "block", marginBottom: 6,
};

interface ValuationFormProps {
  onSubmit: (input: ValuationInput) => void;
  loading: boolean;
  initialArtist?: string;
}

export function ValuationForm({ onSubmit, loading, initialArtist = "" }: ValuationFormProps) {
  const knownArtists = getAllArtists();
  const [form, setForm] = useState<ValuationInput>({
    artistName: initialArtist,
    title: "",
    year: undefined,
    medium: "oil",
    widthCm: undefined,
    heightCm: undefined,
    series: "",
    signed: false,
    condition: "good",
    provenanceNotes: "",
    exhibitionHistory: "",
    displayCurrency: "KRW",
  });

  const set = (key: keyof ValuationInput, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.artistName.trim()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: "#FFF", border: "1px solid #E8E8E8", padding: "36px 36px 28px" }}>
        <span style={{ fontSize: 9, color: "#7C6FF7", letterSpacing: ".22em", textTransform: "uppercase" as const, display: "block", marginBottom: 6 }}>ARTENA · Valuation Engine</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#000", margin: "0 0 28px", fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
          Market Value Estimator
        </h2>

        {/* Artist + Title */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Artist Name *</label>
            <input
              list="artist-suggestions"
              style={inputStyle}
              placeholder="e.g. Kim Whanki / 김환기"
              value={form.artistName}
              onChange={(e) => set("artistName", e.target.value)}
              required
            />
            <datalist id="artist-suggestions">
              {knownArtists.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>
          <div>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} placeholder="e.g. Untitled (Universe)" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
        </div>

        {/* Year + Medium */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Year Created</label>
            <input style={inputStyle} type="number" placeholder="e.g. 1971" value={form.year ?? ""} onChange={(e) => set("year", e.target.value ? parseInt(e.target.value) : undefined)} />
          </div>
          <div>
            <label style={labelStyle}>Medium</label>
            <select style={inputStyle} value={form.medium} onChange={(e) => set("medium", e.target.value)}>
              {MEDIUMS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace("-", " ")}</option>)}
            </select>
          </div>
        </div>

        {/* Size */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Width (cm)</label>
            <input style={inputStyle} type="number" placeholder="e.g. 162" value={form.widthCm ?? ""} onChange={(e) => set("widthCm", e.target.value ? parseFloat(e.target.value) : undefined)} />
          </div>
          <div>
            <label style={labelStyle}>Height (cm)</label>
            <input style={inputStyle} type="number" placeholder="e.g. 130" value={form.heightCm ?? ""} onChange={(e) => set("heightCm", e.target.value ? parseFloat(e.target.value) : undefined)} />
          </div>
        </div>

        {/* Condition + Currency */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Condition</label>
            <select style={inputStyle} value={form.condition} onChange={(e) => set("condition", e.target.value as Condition)}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Display Currency</label>
            <div style={{ display: "flex", gap: 1 }}>
              {CURRENCIES.map((cur) => (
                <button
                  key={cur} type="button"
                  onClick={() => set("displayCurrency", cur)}
                  style={{
                    flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600,
                    border: "1px solid #E0E0E0", cursor: "pointer",
                    background: form.displayCurrency === cur ? "#7C6FF7" : "#FAFAFA",
                    color: form.displayCurrency === cur ? "#FFF" : "#777",
                    fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
                  }}
                >{cur}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Signed + Series */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Series</label>
            <input style={inputStyle} placeholder="e.g. Dot paintings" value={form.series ?? ""} onChange={(e) => set("series", e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div
                onClick={() => set("signed", !form.signed)}
                style={{
                  width: 36, height: 20, background: form.signed ? "#7C6FF7" : "#DDD",
                  borderRadius: 10, position: "relative" as const, transition: "background 0.2s", cursor: "pointer",
                }}
              >
                <div style={{
                  position: "absolute" as const, top: 2,
                  left: form.signed ? 18 : 2,
                  width: 16, height: 16, background: "#FFF", borderRadius: "50%", transition: "left 0.2s",
                }} />
              </div>
              <span style={{ fontSize: 12, color: "#555" }}>Signed by artist</span>
            </label>
          </div>
        </div>

        {/* Provenance + Exhibition */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <div>
            <label style={labelStyle}>Provenance Notes</label>
            <textarea
              style={{ ...inputStyle, height: 72, resize: "none" as const }}
              placeholder="e.g. Purchased directly from artist's studio, 1990"
              value={form.provenanceNotes}
              onChange={(e) => set("provenanceNotes", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Exhibition History</label>
            <textarea
              style={{ ...inputStyle, height: 72, resize: "none" as const }}
              placeholder="e.g. Included in Guggenheim Bilbao survey, 2019"
              value={form.exhibitionHistory}
              onChange={(e) => set("exhibitionHistory", e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !form.artistName.trim()}
          style={{
            width: "100%", padding: "16px 0", fontSize: 13, fontWeight: 700,
            letterSpacing: ".12em", textTransform: "uppercase" as const,
            background: loading || !form.artistName.trim() ? "#D0D0D0" : "#7C6FF7",
            color: "#FFF", border: "none", cursor: loading || !form.artistName.trim() ? "not-allowed" : "pointer",
            fontFamily: "'KakaoBigSans', system-ui, sans-serif",
            transition: "background 0.2s",
          }}
        >
          {loading ? "Analyzing Market Data..." : "Generate Market Value Estimate"}
        </button>

        <p style={{ marginTop: 12, fontSize: 10, color: "#CCC", textAlign: "center" as const }}>
          Estimates are based on comparable auction and gallery sales. Not financial advice.
        </p>
      </div>
    </form>
  );
}
