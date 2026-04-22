"use client";
import { useState, useEffect, useRef } from "react";

const EMOTION_KEYS: [string, string, string][] = [
  ["calm", "차분함", "#4A7A5A"],
  ["heavy", "무거움", "#5A4A7A"],
  ["warm", "따뜻함", "#8A5A3A"],
  ["inward", "안으로", "#3A5A7A"],
  ["movement", "움직임", "#7A3A5A"],
];

interface Analysis {
  title?: string;
  artist?: string;
  year?: string;
  style?: string;
  description?: string;
  emotions?: Record<string, number>;
  colorPalette?: string[];
  keywords?: string[];
  marketNote?: string;
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 20 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #f0ece8", borderTop: "3px solid #1a1a18", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#555", marginBottom: 4 }}>작품을 분석하고 있습니다</p>
        <p style={{ fontSize: 11, color: "#bbb" }}>Claude가 감성과 시장 데이터를 분석 중...</p>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  const [screen, setScreen] = useState("upload");
  const [animated, setAnimated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [textQuery, setTextQuery] = useState("");
  const [activeInput, setActiveInput] = useState<"image" | "camera" | "text">("image");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (screen === "result") {
      setAnimated(false);
      const t = setTimeout(() => setAnimated(true), 120);
      return () => clearTimeout(t);
    }
  }, [screen]);

  const analyzeImage = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
    setScreen("loading");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "분석 실패");
      setAnalysis(json.data);
      setScreen("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setScreen("upload");
    }
  };

  const analyzeText = async () => {
    if (!textQuery.trim()) return;
    setImagePreview(null);
    setError(null);
    setScreen("loading");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textQuery }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "분석 실패");
      setAnalysis(json.data);
      setScreen("result");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setScreen("upload");
    }
  };

  const reset = () => {
    setScreen("upload"); setAnimated(false); setAnalysis(null);
    setImagePreview(null); setError(null); setTextQuery("");
  };

  const S: React.CSSProperties = {
    fontFamily: "system-ui,sans-serif", fontSize: 14, color: "#1a1a18",
    padding: "20px 22px", maxWidth: 640, margin: "0 auto", background: "#F8F7F4", minHeight: "100vh",
  };

  const tabBtn = (id: "image" | "camera" | "text", icon: string, label: string) => (
    <button
      key={id}
      onClick={() => setActiveInput(id)}
      style={{
        flex: 1, padding: "10px 0", border: "none", background: "transparent",
        fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 5,
        borderBottom: activeInput === id ? "2px solid #1a1a18" : "2px solid transparent",
        color: activeInput === id ? "#1a1a18" : "#bbb",
        transition: "all .15s",
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 11, letterSpacing: ".04em" }}>{label}</span>
    </button>
  );

  if (screen === "upload" || screen === "loading") return (
    <div style={S}>
      <div style={{ marginBottom: 22, paddingBottom: 12, borderBottom: "0.5px solid #e8e3db" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 3 }}>
          <span style={{ fontSize: 17, letterSpacing: ".05em", fontStyle: "italic", fontFamily: "Georgia,serif" }}>ARTENA</span>
          <span style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "#ccc" }}>Cultural Intelligence AI</span>
        </div>
        <p style={{ fontSize: 12, color: "#bbb", margin: 0 }}>작품을 올리면 감성 분석 + 시장 데이터를 함께 보여드립니다</p>
      </div>

      {screen === "loading" ? <LoadingSpinner /> : (
        <>
          {/* 탭 */}
          <div style={{ display: "flex", borderBottom: "0.5px solid #e8e3db", marginBottom: 20 }}>
            {tabBtn("image", "🖼️", "이미지 업로드")}
            {tabBtn("camera", "📷", "카메라")}
            {tabBtn("text", "🔍", "텍스트 검색")}
          </div>

          {/* 이미지 업로드 */}
          {activeInput === "image" && (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) analyzeImage(f); }}
                onDragOver={(e) => e.preventDefault()}
                style={{ border: "2px dashed #e0dbd4", borderRadius: 10, padding: "44px 24px", textAlign: "center", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", minHeight: 200 }}
              >
                <div style={{ fontSize: 40, marginBottom: 14 }}>🖼️</div>
                <p style={{ fontSize: 14, color: "#777", marginBottom: 4 }}>작품 이미지를 업로드하세요</p>
                <p style={{ fontSize: 11, color: "#ccc", marginBottom: 18 }}>JPG, PNG, WEBP · 최대 20MB</p>
                <span style={{ fontSize: 11, color: "#888", background: "#f0ece8", padding: "7px 18px", borderRadius: 20, border: "0.5px solid #e0dbd4" }}>클릭하거나 드래그하세요</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) analyzeImage(e.target.files[0]); }} />
            </>
          )}

          {/* 카메라 */}
          {activeInput === "camera" && (
            <>
              <div
                onClick={() => cameraInputRef.current?.click()}
                style={{ border: "2px dashed #e0dbd4", borderRadius: 10, padding: "44px 24px", textAlign: "center", cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", minHeight: 200 }}
              >
                <div style={{ fontSize: 40, marginBottom: 14 }}>📷</div>
                <p style={{ fontSize: 14, color: "#777", marginBottom: 4 }}>카메라로 작품을 촬영하세요</p>
                <p style={{ fontSize: 11, color: "#ccc", marginBottom: 18 }}>갤러리, 아트페어, 경매장에서 바로 촬영</p>
                <span style={{ fontSize: 11, color: "#888", background: "#f0ece8", padding: "7px 18px", borderRadius: 20, border: "0.5px solid #e0dbd4" }}>카메라 열기</span>
              </div>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) analyzeImage(e.target.files[0]); }} />
            </>
          )}

          {/* 텍스트 검색 */}
          {activeInput === "text" && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#aaa", marginBottom: 12 }}>작품명, 작가명, 또는 작품 설명을 입력하세요</p>
              <textarea
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyzeText(); } }}
                placeholder={"예: 모네의 수련 연작\n예: 파란 배경에 점들로 가득한 추상화\n예: 김환기 귀로"}
                rows={5}
                style={{ width: "100%", border: "0.5px solid #e0dbd4", borderRadius: 10, padding: "14px 16px", fontFamily: "inherit", fontSize: 13, color: "#1a1a18", background: "#fff", resize: "none", outline: "none", lineHeight: 1.7, marginBottom: 12 }}
              />
              <button
                onClick={analyzeText}
                disabled={!textQuery.trim()}
                style={{ width: "100%", padding: "13px 0", background: textQuery.trim() ? "#1a1a18" : "#e0dbd4", color: textQuery.trim() ? "#fff" : "#bbb", border: "none", fontFamily: "inherit", fontSize: 13, letterSpacing: ".06em", cursor: textQuery.trim() ? "pointer" : "default", borderRadius: 8, transition: "all .2s" }}
              >
                분석하기
              </button>
            </div>
          )}

          {error && (
            <div style={{ background: "#FEF2F2", border: "0.5px solid #FECACA", borderRadius: 8, padding: "12px 14px", marginTop: 8 }}>
              <p style={{ fontSize: 12, color: "#DC2626", marginBottom: 4 }}>⚠️ 오류 발생</p>
              <p style={{ fontSize: 11, color: "#991B1B" }}>{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  const a = analysis || {};
  const emotions = a.emotions || {};
  const keywords = a.keywords || [];
  const colorPalette = a.colorPalette || [];

  return (
    <div style={S}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "0.5px solid #e8e3db" }}>
        <span style={{ fontSize: 15, letterSpacing: ".05em", fontStyle: "italic", fontFamily: "Georgia,serif" }}>ARTENA</span>
        <button onClick={reset} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#bbb", fontFamily: "inherit" }}>← 새 작품</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: imagePreview ? "100px 1fr" : "1fr", gap: 14, marginBottom: 18 }}>
        {imagePreview && <img src={imagePreview} alt="uploaded" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 8 }} />}
        <div style={{ paddingTop: 2 }}>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 3, lineHeight: 1.3 }}>{a.title || "분석 완료"}</p>
          <p style={{ fontSize: 12, color: "#bbb", marginBottom: 3 }}>{a.artist}{a.year ? `, ${a.year}` : ""}{a.style ? ` · ${a.style}` : ""}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 7 }}>
            {keywords.map((t: string) => <span key={t} style={{ fontSize: 10, color: "#888", background: "#f0ece8", padding: "2px 7px", borderRadius: 7 }}>{t}</span>)}
          </div>
        </div>
      </div>

      {a.description && (
        <div style={{ background: "#fff", border: "0.5px solid #e8e3db", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
          <p style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#ccc", marginBottom: 8 }}>작품 설명</p>
          <p style={{ fontSize: 12, color: "#444", lineHeight: 1.75 }}>{a.description}</p>
        </div>
      )}

      {colorPalette.length > 0 && (
        <div style={{ background: "#fff", border: "0.5px solid #e8e3db", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
          <p style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#ccc", marginBottom: 8 }}>색상 팔레트</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {colorPalette.map((c: string, i: number) => <span key={i} style={{ fontSize: 11, color: "#555", background: "#f5f2ee", padding: "3px 10px", borderRadius: 8 }}>{c}</span>)}
          </div>
        </div>
      )}

      <div style={{ background: "#fff", border: "0.5px solid #e8e3db", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
        <p style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#ccc", marginBottom: 10 }}>이 작품의 감정</p>
        {EMOTION_KEYS.map(([key, l, c], i) => {
          const v = (emotions[key] || 0) / 100;
          return (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 11, color: "#aaa", minWidth: 52 }}>{l}</span>
              <div style={{ flex: 1, height: 4, background: "#f0ece6", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: animated ? `${Math.round(v * 100)}%` : "0%", height: "100%", background: c, borderRadius: 2, transition: `width 0.75s cubic-bezier(0.4,0,0.2,1) ${i * 110}ms` }} />
              </div>
              <span style={{ fontSize: 10, color: c, minWidth: 22, textAlign: "right", opacity: animated ? 1 : 0, transition: `opacity 0.35s ease ${i * 110 + 500}ms` }}>{Math.round(v * 100)}</span>
            </div>
          );
        })}
      </div>

      {a.marketNote && (
        <div style={{ border: "0.5px solid #e8e3db", borderRadius: 10, overflow: "hidden", marginBottom: 18 }}>
          <div style={{ background: "#1a1a18", padding: "13px 16px" }}>
            <span style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", display: "block", marginBottom: 6 }}>Market Intelligence</span>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.65, margin: "0 0 5px 0" }}>{a.marketNote}</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,.22)", margin: 0 }}>경매가는 참고용이며 실제 낙찰가와 다를 수 있습니다</p>
          </div>
        </div>
      )}

      <button onClick={reset} style={{ width: "100%", padding: "11px 0", background: "#1a1a18", color: "#fff", border: "none", fontFamily: "inherit", fontSize: 11, letterSpacing: ".08em", cursor: "pointer", borderRadius: 8 }}>
        새 작품 분석하기
      </button>
    </div>
  );
}
