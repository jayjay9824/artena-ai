"use client";
import React, { useEffect, useState } from "react";
import { ArtistPhotoAvatar } from "../../components/ArtistPhotoAvatar";

export interface MarketIntelligenceData {
  artworkOverview: {
    artist: string;
    title: string;
    year: string;
    medium: string;
    size: string;
    additionalInfo: string;
  };
  interpretation: {
    coreThemes: string[];
    structuralAnalysis: string;
    artenaSummary: string;
  };
  artistPositioning: {
    base: string;
    galleryHistory: string;
    marketPosition: string;
    artenaEvaluation: string;
  };
  marketData: {
    auctionSample: string;
    publicPriceRange: string;
    comparability: string;
    marketStructure: string;
  };
  comparableAnalysis: {
    limitations: string[];
    artenaJudgment: string;
  };
  priceRange: {
    usd: { low: string; mid: string; high: string };
    eur: { low: string; mid: string; high: string };
    krw: { low: string; mid: string; high: string };
    confidenceNote: string;
  };
  confidence: {
    overall: number;
    dataDepth: number;
    marketStability: number;
    comparableMatch: number;
    geographicCoverage: number;
    localMarketFit: number;
    interpretation: string;
  };
  priceDrivers: {
    upward: string[];
    downward: string[];
  };
  marketContext: {
    stage: string;
    regional: string;
    collectorDemand: string;
    artenaInsight: string;
  };
  investmentInsight: {
    holdingPeriod: string;
    growthPotential: string;
    riskLevel: string;
    strategicNote: string;
  };
  finalSummary: string;
  representativeWork?: string;
}

/* ---- Image fetch via server API ---- */
async function fetchWikiImage(query: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/wiki-image?q=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const d = await res.json();
    return (d.url as string) || null;
  } catch {
    return null;
  }
}

/* ---- Image card ---- */
function ImgCard({
  src, label, caption, sub, loading = false,
}: {
  src: string | null; label: string; caption: string; sub?: string; loading?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, flex: 1, minWidth: 0 }}>
      <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".18em", textTransform: "uppercase" as const }}>{label}</span>
      <div style={{ width: "100%", height: 160, background: "#F0F0F0", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {loading ? (
          <div style={{ width: 20, height: 20, border: "2px solid #E0E0E0", borderTop: "2px solid #8A6A3F", borderRadius: "50%", animation: "mir-spin 0.8s linear infinite" }} />
        ) : src ? (
          <img src={src} alt={caption} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: 6 }}>
            <span style={{ fontSize: 22, opacity: 0.25 }}>🎨</span>
            <span style={{ fontSize: 9, color: "#CCC" }}>이미지 없음</span>
          </div>
        )}
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#111", margin: "0 0 2px", lineHeight: 1.4, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>{caption}</p>
        {sub && <p style={{ fontSize: 10, color: "#AAA", margin: 0 }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 18, paddingBottom: 10, borderBottom: "1px solid #F0F0F0" }}>
      <span style={{ fontSize: 10, color: "#8A6A3F", fontWeight: 700, letterSpacing: ".14em" }}>{num}</span>
      <span style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" as const, fontWeight: 700, color: "#000", fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>{title}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const unavailable = !value || value === "확인 불가" || value === "공개 정보 부족" || value === "없음" || value === "Data not available";
  return (
    <div className="mir-row">
      <span style={{ fontSize: 11, color: "#AAA" }}>{label}</span>
      <span style={{ fontSize: 12, color: unavailable ? "#CCC" : "#111" }}>{value || "확인 불가"}</span>
    </div>
  );
}

function Tag({ text, variant = "default" }: { text: string; variant?: "default" | "purple" | "orange" }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: "#F5F5F5", color: "#555", border: "1px solid #EBEBEB" },
    purple: { background: "#F3F2FF", color: "#8A6A3F", border: "1px solid #E0DCFF" },
    orange: { background: "#FFF8F0", color: "#C07030", border: "1px solid #FFE5C0" },
  };
  return (
    <span style={{ fontSize: 11, padding: "4px 12px", ...styles[variant] }}>{text}</span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 65 ? "#4CAF86" : value >= 40 ? "#8A6A3F" : "#E0954A";
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#555", wordBreak: "keep-all" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color, flexShrink: 0, marginLeft: 8 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: "#F0F0F0" }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

function BulletList({ items, color = "#8A6A3F" }: { items: string[]; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color, fontSize: 10, marginTop: 3, flexShrink: 0 }}>◆</span>
          <span style={{ fontSize: 12, color: "#444", lineHeight: 1.65 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ fontSize: 10, color: "#CCC", minWidth: 16, flexShrink: 0, marginTop: 2 }}>{i + 1}.</span>
          <span style={{ fontSize: 12, color: "#555", lineHeight: 1.65 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function PriceTier({ currency, data }: { currency: string; data: { low: string; mid: string; high: string } }) {
  return (
    <div className="mir-price-tier">
      <span style={{ fontSize: 9, color: "#BBB", letterSpacing: ".16em", display: "block", marginBottom: 10 }}>{currency}</span>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 1 }}>
        {[
          { label: "LOW", value: data.low, accent: false },
          { label: "MID", value: data.mid, accent: true },
          { label: "HIGH", value: data.high, accent: false },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: accent ? "#8A6A3F" : "#FAFAFA", border: `1px solid ${accent ? "#8A6A3F" : "#F0F0F0"}` }}>
            <span style={{ fontSize: 9, letterSpacing: ".14em", color: accent ? "rgba(255,255,255,0.7)" : "#BBB", flexShrink: 0 }}>{label}</span>
            <span className="mir-price-value" style={{ fontWeight: 700, color: accent ? "#FFF" : "#333", fontFamily: "'KakaoBigSans', system-ui, sans-serif", fontSize: accent ? 14 : 12 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskLevel({ level }: { level: string }) {
  const filled = level === "Low" ? 2 : level === "High" ? 5 : 3;
  const color = level === "Low" ? "#4CAF86" : level === "High" ? "#E05050" : "#E0954A";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ display: "inline-block", width: 8, height: 8, background: i < filled ? color : "#EBEBEB" }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{level} Risk</span>
    </div>
  );
}

/* ---- Responsive styles ---- */
const MIR_STYLES = `
  @keyframes mir-spin { to { transform: rotate(360deg); } }
  .mir-wrap {
    background: #FFFFFF;
    border: 1px solid #E0E0E0;
    padding: 44px 40px;
    font-family: 'KakaoSmallSans', system-ui, sans-serif;
    box-sizing: border-box;
    max-width: 100%;
    overflow-x: hidden;
  }
  .mir-header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .mir-row {
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
  .mir-price-grid {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }
  .mir-price-tier {
    flex: 1;
    min-width: 0;
  }
  .mir-price-value {
    white-space: nowrap;
    word-break: keep-all;
    text-align: right;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .mir-confidence-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 24px;
  }
  .mir-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 767px) {
    .mir-wrap {
      padding: 24px 16px;
    }
    .mir-header-row {
      flex-direction: column;
      gap: 12px;
    }
    .mir-header-meta {
      text-align: left !important;
    }
    .mir-row {
      grid-template-columns: 96px 1fr;
      gap: 6px;
    }
    .mir-price-grid {
      flex-direction: column;
      gap: 16px;
    }
    .mir-price-tier {
      flex: none;
      width: 100%;
    }
    .mir-price-value {
      font-size: clamp(12px, 3.5vw, 14px) !important;
    }
    .mir-confidence-grid {
      grid-template-columns: 1fr;
      gap: 20px;
    }
    .mir-confidence-circle {
      margin: 0 auto;
    }
    .mir-two-col {
      grid-template-columns: 1fr;
      gap: 20px;
    }
  }
`;

/* ---- Main Component ---- */

export function MarketIntelligenceReport({
  data,
  imagePreview,
}: {
  data: MarketIntelligenceData;
  imagePreview?: string | null;
}) {
  const section: React.CSSProperties = { marginBottom: 32 };

  const [workImg, setWorkImg] = useState<string | null>(null);
  const [workLoading, setWorkLoading] = useState(true);

  useEffect(() => {
    const repWork = data.representativeWork || data.artworkOverview.title;
    let cancelled = false;
    setWorkLoading(true);
    fetchWikiImage(repWork)
      .then((url) => {
        if (cancelled) return;
        setWorkImg(url);
        setWorkLoading(false);
      })
      .catch(() => {
        /* Fail-closed — drop loading flag so the report doesn't sit
           in a "loading representative work…" state forever when the
           wiki fetch errors (offline, in-app browser blocking
           cross-origin, rate limit). The card simply renders without
           the rep image; everything else still surfaces. */
        if (cancelled) return;
        setWorkImg(null);
        setWorkLoading(false);
      });
    return () => { cancelled = true; };
  }, [data.artworkOverview.title, data.representativeWork]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MIR_STYLES }} />
      <div className="mir-wrap">

        {/* Header */}
        <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid #F0F0F0" }}>
          <div className="mir-header-row">
            <div>
              <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".24em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>AXVELA AI · Market Intelligence Report</span>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#000", margin: "0 0 6px", fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
                {data.artworkOverview.artist}
              </h2>
              <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
                {data.artworkOverview.title}
                {data.artworkOverview.year && data.artworkOverview.year !== "확인 불가" ? `, ${data.artworkOverview.year}` : ""}
              </p>
            </div>
            <div className="mir-header-meta" style={{ textAlign: "right" as const }}>
              <span style={{ fontSize: 9, color: "#CCC", letterSpacing: ".1em", display: "block", marginBottom: 4 }}>GENERATED</span>
              <span style={{ fontSize: 11, color: "#AAA" }}>{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span>
              <div style={{ marginTop: 8, padding: "4px 10px", background: "#F3F2FF", border: "1px solid #E0DCFF", display: "inline-block" }}>
                <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".1em" }}>참고용 · 공식 감정 아님</span>
              </div>
            </div>
          </div>
        </div>

        {/* Image Section */}
        <div style={{ marginBottom: 36 }}>
          {/* Row 1: Artist (verified-only avatar) + Representative Work */}
          <div className="mir-two-col" style={{ marginBottom: 20 }}>
            {/* Artist — no portrait unless explicitly verified */}
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".18em", textTransform: "uppercase" as const }}>Artist</span>
              <ArtistPhotoAvatar
                data={{
                  artistName: data.artworkOverview.artist,
                  imageUrl: null,
                  verificationStatus: "unavailable",
                  source: "",
                  sourceType: "unknown",
                }}
                height={160}
              />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#111", margin: "0 0 2px", lineHeight: 1.4, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
                  {data.artworkOverview.artist}
                </p>
                {data.artistPositioning.base && (
                  <p style={{ fontSize: 10, color: "#AAA", margin: 0 }}>{data.artistPositioning.base}</p>
                )}
              </div>
            </div>
            <ImgCard
              src={workImg}
              label="Representative Work"
              caption={data.representativeWork || data.artworkOverview.title}
              loading={workLoading}
            />
          </div>
          {/* Row 2: Uploaded image */}
          {imagePreview && (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".18em", textTransform: "uppercase" as const }}>Analyzed Work</span>
              <div style={{ width: "100%", maxHeight: 280, overflow: "hidden" }}>
                <img
                  src={imagePreview}
                  alt={data.artworkOverview.title}
                  style={{ width: "100%", maxHeight: 280, objectFit: "contain", background: "#F8F8F8", display: "block" }}
                />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#111", margin: "0 0 2px", fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>
                  {data.artworkOverview.title}
                </p>
                <p style={{ fontSize: 10, color: "#AAA", margin: 0 }}>
                  {[data.artworkOverview.year, data.artworkOverview.medium].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 01. 작품 개요 */}
        <div style={section}>
          <SectionHeader num="01" title="작품 개요 (Artwork Overview)" />
          <Row label="작가" value={data.artworkOverview.artist} />
          <Row label="작품명" value={data.artworkOverview.title} />
          <Row label="제작연도" value={data.artworkOverview.year} />
          <Row label="매체" value={data.artworkOverview.medium} />
          <Row label="사이즈" value={data.artworkOverview.size} />
          {data.artworkOverview.additionalInfo && data.artworkOverview.additionalInfo !== "없음" && (
            <Row label="기타" value={data.artworkOverview.additionalInfo} />
          )}
        </div>

        {/* 02. 작품 해석 */}
        <div style={section}>
          <SectionHeader num="02" title="작품 해석 (Interpretation Layer)" />
          <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 10 }}>핵심 개념</p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 18 }}>
            {data.interpretation.coreThemes.map((t, i) => <Tag key={i} text={t} variant="purple" />)}
          </div>
          <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 10 }}>구조적 해석</p>
          <p style={{ fontSize: 13, color: "#444", lineHeight: 1.85, marginBottom: 18 }}>{data.interpretation.structuralAnalysis}</p>
          <div style={{ background: "#FAFAFA", border: "1px solid #F0F0F0", padding: "16px 20px" }}>
            <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".14em", display: "block", marginBottom: 6 }}>AXVELA 한 줄 해석</span>
            <p style={{ fontSize: 13, color: "#222", fontWeight: 600, margin: 0, lineHeight: 1.6, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>{data.interpretation.artenaSummary}</p>
          </div>
        </div>

        {/* 03. 작가 포지션 */}
        <div style={section}>
          <SectionHeader num="03" title="작가 포지션 (Artist Positioning)" />
          <Row label="활동 기반" value={data.artistPositioning.base} />
          <Row label="갤러리/기관 이력" value={data.artistPositioning.galleryHistory} />
          <Row label="시장 포지션" value={data.artistPositioning.marketPosition} />
          <div style={{ marginTop: 14, padding: "12px 16px", background: "#F8F7FF", border: "1px solid #E8E4FF" }}>
            <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".12em", display: "block", marginBottom: 4 }}>AXVELA 평가</span>
            <p style={{ fontSize: 12, color: "#444", margin: 0, lineHeight: 1.65 }}>{data.artistPositioning.artenaEvaluation}</p>
          </div>
        </div>

        {/* 04. 시장 데이터 */}
        <div style={section}>
          <SectionHeader num="04" title="시장 데이터 (Market Data)" />
          <Row label="경매 표본" value={data.marketData.auctionSample} />
          <Row label="공개 가격대" value={data.marketData.publicPriceRange} />
          <Row label="비교 가능성" value={data.marketData.comparability} />
          <Row label="시장 구조" value={data.marketData.marketStructure} />
        </div>

        {/* 05. Comparable 분석 */}
        <div style={section}>
          <SectionHeader num="05" title="Comparable 분석" />
          <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 10 }}>제한 사항</p>
          <div style={{ marginBottom: 18 }}>
            <NumberedList items={data.comparableAnalysis.limitations} />
          </div>
          <p style={{ fontSize: 9, color: "#BBB", letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 10 }}>AXVELA 판단</p>
          <p style={{ fontSize: 13, color: "#444", lineHeight: 1.85, margin: 0 }}>{data.comparableAnalysis.artenaJudgment}</p>
        </div>

        {/* 06. Market Value Range */}
        <div style={section}>
          <SectionHeader num="06" title="Market Value Range (참고용)" />
          <div className="mir-price-grid">
            <PriceTier currency="USD" data={data.priceRange.usd} />
            <PriceTier currency="EUR" data={data.priceRange.eur} />
            <PriceTier currency="KRW" data={data.priceRange.krw} />
          </div>
          <div style={{ padding: "10px 14px", background: "#FFFBF0", border: "1px solid #F5E6C0" }}>
            <span style={{ fontSize: 11, color: "#A07030", lineHeight: 1.6 }}>{data.priceRange.confidenceNote}</span>
          </div>
        </div>

        {/* 07. Confidence */}
        <div style={section}>
          <SectionHeader num="07" title="Confidence 분석" />
          <div className="mir-confidence-grid">
            <div>
              <div className="mir-confidence-circle" style={{ textAlign: "center" as const, marginBottom: 16 }}>
                {(() => {
                  const v = data.confidence.overall;
                  const color = v >= 65 ? "#4CAF86" : v >= 40 ? "#8A6A3F" : "#E0954A";
                  const tier = v >= 65 ? "HIGH" : v >= 40 ? "MID" : "LOW";
                  return (
                    <div style={{ width: 88, height: 88, border: `3px solid ${color}`, borderRadius: "50%", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'KakaoBigSans', system-ui, sans-serif", lineHeight: 1 }}>{v}</span>
                      <span style={{ fontSize: 8, color, letterSpacing: ".1em" }}>{tier}</span>
                    </div>
                  );
                })()}
              </div>
              <p style={{ fontSize: 10, color: "#CCC", textAlign: "center" as const, margin: 0 }}>Overall Confidence</p>
            </div>
            <div>
              <ScoreBar label="Data Depth" value={data.confidence.dataDepth} />
              <ScoreBar label="Market Stability" value={data.confidence.marketStability} />
              <ScoreBar label="Comparable Match" value={data.confidence.comparableMatch} />
              <ScoreBar label="Geographic Coverage" value={data.confidence.geographicCoverage} />
              <ScoreBar label="Local Market Fit" value={data.confidence.localMarketFit} />
            </div>
          </div>
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#FAFAFA", border: "1px solid #F0F0F0" }}>
            <p style={{ fontSize: 12, color: "#555", margin: 0, lineHeight: 1.65 }}>{data.confidence.interpretation}</p>
          </div>
        </div>

        {/* 08. 가격 형성 요인 */}
        <div style={section}>
          <SectionHeader num="08" title="가격 형성 요인 (Price Drivers)" />
          <div className="mir-two-col">
            <div>
              <p style={{ fontSize: 9, color: "#4CAF86", letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 12 }}>상승 요인</p>
              <BulletList items={data.priceDrivers.upward} color="#4CAF86" />
            </div>
            <div>
              <p style={{ fontSize: 9, color: "#E0954A", letterSpacing: ".14em", textTransform: "uppercase" as const, marginBottom: 12 }}>하락 / 리스크 요인</p>
              <BulletList items={data.priceDrivers.downward} color="#E0954A" />
            </div>
          </div>
        </div>

        {/* 09. 시장 컨텍스트 */}
        <div style={section}>
          <SectionHeader num="09" title="시장 컨텍스트 (Market Context)" />
          <Row label="시장 단계" value={data.marketContext.stage} />
          <Row label="지역 특성" value={data.marketContext.regional} />
          <Row label="수요 구조" value={data.marketContext.collectorDemand} />
          <div style={{ marginTop: 14, padding: "14px 18px", background: "#000", border: "1px solid #000" }}>
            <span style={{ fontSize: 9, color: "#8A6A3F", letterSpacing: ".14em", display: "block", marginBottom: 6 }}>AXVELA INSIGHT</span>
            <p style={{ fontSize: 13, color: "#FFF", fontWeight: 600, margin: 0, lineHeight: 1.6, fontFamily: "'KakaoBigSans', system-ui, sans-serif" }}>{data.marketContext.artenaInsight}</p>
          </div>
        </div>

        {/* 10. 투자 관점 */}
        <div style={section}>
          <SectionHeader num="10" title="투자 관점 (Investment Insight)" />
          <Row label="권장 보유 기간" value={data.investmentInsight.holdingPeriod} />
          <Row label="성장 가능성" value={data.investmentInsight.growthPotential} />
          <div className="mir-row">
            <span style={{ fontSize: 11, color: "#AAA" }}>리스크 수준</span>
            <RiskLevel level={data.investmentInsight.riskLevel} />
          </div>
          <div style={{ marginTop: 14, padding: "16px 20px", background: "#FAFAFA", border: "1px solid #F0F0F0" }}>
            <p style={{ fontSize: 13, color: "#333", margin: 0, lineHeight: 1.85 }}>{data.investmentInsight.strategicNote}</p>
          </div>
        </div>

        {/* 11. 최종 결론 */}
        <div style={section}>
          <SectionHeader num="11" title="최종 결론 (Final Summary)" />
          <p style={{ fontSize: 13, color: "#333", lineHeight: 1.9, margin: 0 }}>{data.finalSummary}</p>
        </div>

        {/* Disclaimer */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #F0F0F0" }}>
          <p style={{ fontSize: 9, color: "#CCC", letterSpacing: ".1em", marginBottom: 8 }}>⚠ DISCLAIMER</p>
          <p style={{ fontSize: 10, color: "#BBB", lineHeight: 1.7, margin: 0 }}>
            본 리포트는 공개 시장 데이터 및 비교 분석 기반의 참고용 시장 추정 정보입니다.
            공식 감정서, 법적 평가, 세무 평가, 투자 자문이 아닙니다.
            비공개 갤러리 거래, 실제 계약 가격, 작품 상태, 프로비넌스는 반영되지 않을 수 있습니다.
            AXVELA AI · Cultural Intelligence
          </p>
        </div>
      </div>
    </>
  );
}
