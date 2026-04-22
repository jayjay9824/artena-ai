"use client";
import { useState, useEffect, useRef } from "react";

const EMOTION_KEYS: [string, string, string][] = [
  ["calm", "차분함", "#4A7A5A"],
  ["heavy", "무거움", "#5A4A7A"],
  ["warm", "따뜻함", "#8A5A3A"],
  ["inward", "안으로", "#3A5A7A"],
  ["movement", "움직임", "#7A3A5A"],
];

interface Work { title: string; year: string; medium: string; location: string; }
interface Auction { date: string; work: string; house: string; result: string; estimate: string; note: string; }
interface Collection { inst: string; city: string; period: string; work: string; }
interface Critic { critic: string; source: string; year: string; quote: string; }
interface Exhibition { title: string; venue: string; city: string; year: string; type: string; }

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
  works?: Work[];
  auctions?: Auction[];
  collections?: Collection[];
  critics?: Critic[];
  exhibitions?: Exhibition[];
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
  const [mktTab, setMktTab] = useState("works");

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
    setImagePreview(null); setError(null); setTextQuery(""); setMktTab("works");
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

  const MKT_TABS = [
    { id: "works", l: "대표작" },
    { id: "auction", l: "경매 이력" },
    { id: "collection", l: "기관 소장" },
    { id: "critics", l: "평론" },
    { id: "exhibition", l: "전시" },
  ];

  const a = analysis || {};
  const emotions = a.emotions || {};
  const keywords = a.keywords || [];
  const colorPalette = a.colorPalette || [];
  const works = a.works || [];
  const auctions = a.auctions || [];
  const collections = a.collections || [];
  const critics = a.critics || [];
  const exhibitions = a.exhibitions || [];

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

      <div style={{ border: "0.5px solid #e8e3db", borderRadius: 10, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ background: "#1a1a18", padding: "10px 16px 0" }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,.3)" }}>Market Intelligence</span>
            {a.marketNote && <p style={{ fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.6, margin: "6px 0 0 0" }}>{a.marketNote}</p>}
          </div>
          <div style={{ display: "flex", overflowX: "auto" }}>
            {MKT_TABS.map(t => (
              <button key={t.id} onClick={() => setMktTab(t.id)} style={{ padding: "7px 13px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", color: mktTab === t.id ? "#fff" : "rgba(255,255,255,.4)", borderBottom: mktTab === t.id ? "2px solid #fff" : "2px solid transparent" }}>
                {t.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "4px 14px 14px" }}>
          {mktTab === "works" && (works.length === 0
            ? <p style={{ fontSize: 12, color: "#ccc", padding: "12px 0", fontStyle: "italic" }}>데이터 없음</p>
            : works.map((w, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid #f5f2ee" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{w.title}</p>
                  <span style={{ fontSize: 11, color: "#bbb", marginLeft: 8, flexShrink: 0 }}>{w.year}</span>
                </div>
                <p style={{ fontSize: 11, color: "#aaa", marginBottom: 1 }}>{w.medium}</p>
                <p style={{ fontSize: 11, color: "#888" }}>📍 {w.location}</p>
              </div>
            ))
          )}
          {mktTab === "auction" && (auctions.length === 0
            ? <p style={{ fontSize: 12, color: "#ccc", padding: "12px 0", fontStyle: "italic" }}>데이터 없음</p>
            : auctions.map((au, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid #f5f2ee", display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: "#bbb" }}>{au.date}</span>
                    <span style={{ fontSize: 10, background: "#f5f3ef", color: "#888", padding: "1px 7px", borderRadius: 8 }}>{au.house}</span>
                  </div>
                  <p style={{ fontSize: 12, marginBottom: 1 }}>{au.work}</p>
                  <p style={{ fontSize: 10, color: "#ccc" }}>추정가 {au.estimate}</p>
                  {au.note && <p style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}>{au.note}</p>}
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, paddingLeft: 8 }}>{au.result}</p>
              </div>
            ))
          )}
          {mktTab === "collection" && (collections.length === 0
            ? <p style={{ fontSize: 12, color: "#ccc", padding: "12px 0", fontStyle: "italic" }}>데이터 없음</p>
            : collections.map((col, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid #f5f2ee", display: "flex", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "#f0ece8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 15 }}>🏛</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{col.inst}</p>
                    <span style={{ fontSize: 10, background: "#EAF4ED", color: "#1E6B45", padding: "1px 7px", borderRadius: 8 }}>소장중</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#bbb" }}>{col.city} · {col.period}</p>
                  <p style={{ fontSize: 11, color: "#aaa", fontStyle: "italic" }}>{col.work}</p>
                </div>
              </div>
            ))
          )}
          {mktTab === "critics" && (critics.length === 0
            ? <p style={{ fontSize: 12, color: "#ccc", padding: "12px 0", fontStyle: "italic" }}>데이터 없음</p>
            : critics.map((r, i) => (
              <div key={i} style={{ padding: "11px 0", borderBottom: "0.5px solid #f5f2ee" }}>
                <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 6 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, margin: 0 }}>{r.critic}</p>
                  <span style={{ fontSize: 10, background: "#f5f3ef", color: "#888", padding: "1px 7px", borderRadius: 8 }}>{r.source}</span>
                  <span style={{ fontSize: 10, color: "#ccc" }}>{r.year}</span>
                </div>
                <p style={{ fontSize: 12, color: "#444", fontStyle: "italic", lineHeight: 1.7, paddingLeft: 9, borderLeft: "2px solid #ece8e2" }}>"{r.quote}"</p>
              </div>
            ))
          )}
          {mktTab === "exhibition" && (exhibitions.length === 0
            ? <p style={{ fontSize: 12, color: "#ccc", padding: "12px 0", fontStyle: "italic" }}>데이터 없음</p>
            : exhibitions.map((ex, i) => {
              const tc = ex.type === "solo" ? ["#EAF4ED", "#1E6B45", "개인"] : ex.type === "fair" ? ["#EEF0FA", "#3A4A8A", "페어"] : ["#f0ece8", "#888", "그룹"];
              return (
                <div key={i} style={{ padding: "9px 0", borderBottom: "0.5px solid #f5f2ee", display: "flex", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: tc[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: tc[1], flexShrink: 0 }}>{tc[2]}</div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{ex.title}</p>
                    <p style={{ fontSize: 11, color: "#bbb" }}>{ex.venue}, {ex.city} · {ex.year}</p>
                  </div>
                </div>
              );
            })
          )}
          <p style={{ fontSize: 9, color: "#ccc", marginTop: 10 }}>※ 데이터는 AI 추정 정보로, 실제와 다를 수 있습니다</p>
        </div>
      </div>

      <button onClick={reset} style={{ width: "100%", padding: "11px 0", background: "#1a1a18", color: "#fff", border: "none", fontFamily: "inherit", fontSize: 11, letterSpacing: ".08em", cursor: "pointer", borderRadius: 8 }}>
        새 작품 분석하기
      </button>
    </div>
  );
}
