"use client";
import React, { useState } from "react";
import { Gallery, GalleryListing, VerifiedTier } from "../types/gallery";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

/* ── Cover placeholder — gallery name initial on dark bg ────────── */
function CoverArea({ gallery }: { gallery: Gallery }) {
  const initials = gallery.name
    .split(" ")
    .filter(w => w.length > 1)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join("");

  if (gallery.cover_url) {
    return (
      <div style={{ width: "100%", height: "42vh", minHeight: 220, position: "relative", overflow: "hidden" }}>
        <img src={gallery.cover_url} alt={gallery.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />
      </div>
    );
  }

  // Elegant typographic cover
  return (
    <div style={{
      width: "100%", height: "42vh", minHeight: 220,
      background: "#111110",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      <span style={{
        fontSize: 72, fontWeight: 200, color: "rgba(255,255,255,0.12)",
        fontFamily: FONT_HEAD, letterSpacing: ".08em", lineHeight: 1,
        userSelect: "none",
      }}>
        {initials}
      </span>
      <span style={{
        position: "absolute", bottom: 22, left: 22,
        fontSize: 9, color: "rgba(255,255,255,0.3)",
        letterSpacing: ".22em", textTransform: "uppercase", fontFamily: FONT,
      }}>
        {gallery.location}
      </span>
    </div>
  );
}

/* ── Verified badge + modal ─────────────────────────────────────── */
const BADGE_META: Record<VerifiedTier, { label: string; color: string; desc: string }> = {
  approved: {
    label: "ARTENA Verified Gallery",
    color: "#5A5AF0",
    desc: "ARTENA에서 검증된 갤러리입니다.\n작가, 전시, 거래 이력을 기반으로 승인되었습니다.",
  },
  premium: {
    label: "Premium Gallery",
    color: "#0D0D0D",
    desc: "프리미엄 갤러리는 지속적인 거래 이력, 높은 응답률, 검증된 작가 라인업을 보유합니다.",
  },
  partner: {
    label: "ARTENA Partner Gallery",
    color: "#B5860A",
    desc: "ARTENA와 공식 파트너십을 맺은 갤러리입니다.\n가장 높은 수준의 신뢰 검증이 완료되었습니다.",
  },
};

function VerifiedBadge({ tier }: { tier: VerifiedTier }) {
  const [open, setOpen] = useState(false);
  const meta = BADGE_META[tier];
  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: "none", border: "none", padding: 0, cursor: "pointer",
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1L7.4 4.1H10.8L8.2 6L9.2 9.2L6 7.4L2.8 9.2L3.8 6L1.2 4.1H4.6L6 1Z"
            fill={meta.color} />
        </svg>
        <span style={{ fontSize: 11, color: meta.color, fontFamily: FONT, letterSpacing: ".06em", fontWeight: 600 }}>
          {meta.label}
        </span>
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end" }}
          onClick={() => setOpen(false)}>
          <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", background: "#FFF", borderRadius: "16px 16px 0 0", padding: "28px 24px 40px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L7.4 4.1H10.8L8.2 6L9.2 9.2L6 7.4L2.8 9.2L3.8 6L1.2 4.1H4.6L6 1Z" fill={meta.color} />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0D0D0D", fontFamily: FONT_HEAD }}>{meta.label}</span>
            </div>
            {meta.desc.split("\n").map((line, i) => (
              <p key={i} style={{ fontSize: 13, color: "#666", lineHeight: 1.7, margin: "0 0 4px", fontFamily: FONT }}>{line}</p>
            ))}
            <button onClick={() => setOpen(false)} style={{ marginTop: 20, width: "100%", padding: "12px 0", background: "#0D0D0D", color: "#FFF", border: "none", borderRadius: 7, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Listing card (compact, for within gallery profile) ─────────── */
function CompactCard({ listing, onTap }: { listing: GalleryListing; onTap: () => void }) {
  const initials = listing.artist_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const statusColor = { available: "#2D9967", held: "#C4820A", sold: "#AAAAAA", not_available: "#CCCCCC" }[listing.status];
  const statusLabel = { available: "Available", held: "Held", sold: "Sold", not_available: "N/A" }[listing.status];

  return (
    <article style={{ display: "flex", gap: 16, padding: "20px 0", borderBottom: "0.5px solid #F0F0F0", cursor: "pointer" }} onClick={onTap}>
      {/* Thumbnail */}
      <div style={{ flexShrink: 0, width: 80, height: 100, background: "#F4F4F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {listing.image_url
          ? <img src={listing.image_url} alt={listing.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          : <span style={{ fontSize: 20, fontWeight: 200, color: "#C8C8C4", fontFamily: FONT_HEAD }}>{initials}</span>
        }
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#0D0D0D", margin: "0 0 2px", fontFamily: FONT_HEAD }}>{listing.artist_name}</p>
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 2px", fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <em>{listing.title}</em>, {listing.year}
        </p>
        <p style={{ fontSize: 11, color: "#AAAAAA", margin: "0 0 8px", fontFamily: FONT }}>{listing.medium}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, color: statusColor, display: "flex", alignItems: "center", gap: 4, fontFamily: FONT }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
            {statusLabel}
          </span>
          <span style={{ fontSize: 10, color: "#CCC" }}>·</span>
          <span style={{ fontSize: 10, color: "#AAAAAA", fontFamily: FONT }}>
            {listing.price.visibility === "public" && listing.price.value != null
              ? `$${listing.price.value.toLocaleString()}`
              : listing.price.visibility === "range_only" && listing.price.range_min != null
                ? `$${listing.price.range_min.toLocaleString()}+`
                : listing.price.visibility === "price_on_request"
                  ? "Price on request"
                  : "Price unavailable"
            }
          </span>
        </div>
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2L10 7L5 12" stroke="#CCCCCC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </article>
  );
}

/* ── Divider ────────────────────────────────────────────────────── */
const Divider = () => <div style={{ height: "0.5px", background: "#EBEBEB", margin: "28px 0" }} />;

/* ── Main GalleryProfile ────────────────────────────────────────── */
export interface GalleryProfileProps {
  gallery: Gallery;
  listings: GalleryListing[];
  onBack: () => void;
  onSelectListing: (l: GalleryListing) => void;
}

export function GalleryProfile({ gallery, listings, onBack, onSelectListing }: GalleryProfileProps) {
  const primary = gallery.communication_channels.find(c => c.is_primary) ?? gallery.communication_channels[0];
  const availableWorks = listings.filter(l => l.gallery.gallery_id === gallery.gallery_id);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", maxWidth: 640, margin: "0 auto", fontFamily: FONT, overflowX: "hidden", paddingBottom: 80 }}>

      {/* Cover */}
      <CoverArea gallery={gallery} />

      {/* Back + Contact strip */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 22px 0",
      }}>
        <button onClick={onBack} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, color: "#888", fontFamily: FONT, padding: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7L9 12" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          ARTENA Gallery
        </button>
        {primary && (
          <a href={primary.url} target="_blank" rel="noreferrer" style={{
            fontSize: 12, color: "#0D0D0D", fontFamily: FONT, letterSpacing: ".04em",
            border: "0.5px solid #D0D0D0", borderRadius: 20, padding: "6px 16px",
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            Contact Gallery
          </a>
        )}
      </div>

      {/* Identity block */}
      <div style={{ padding: "22px 22px 0" }}>
        {gallery.verified_status && (
          <div style={{ marginBottom: 8 }}>
            <VerifiedBadge tier={gallery.verified_status} />
          </div>
        )}
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px", fontFamily: FONT_HEAD, letterSpacing: "-.025em", lineHeight: 1.2, color: "#0D0D0D" }}>
          {gallery.name}
        </h1>
        <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px", fontFamily: FONT }}>
          {gallery.location}
          <span style={{ color: "#D0D0D0", margin: "0 8px" }}>·</span>
          Est. {gallery.founded_year}
        </p>
      </div>

      {/* Description */}
      <div style={{ padding: "20px 22px 0" }}>
        <p style={{ fontSize: 13, color: "#555", lineHeight: 1.85, margin: 0, fontFamily: FONT }}>
          {gallery.description_full}
        </p>
      </div>

      {/* Channel links */}
      <div style={{ padding: "16px 22px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {gallery.communication_channels.map(ch => (
          <a key={ch.type} href={ch.url} target="_blank" rel="noreferrer" style={{
            fontSize: 11, color: "#555", fontFamily: FONT, letterSpacing: ".02em",
            border: "0.5px solid #E0E0E0", borderRadius: 20, padding: "6px 14px",
            textDecoration: "none",
          }}>
            {ch.label}
          </a>
        ))}
      </div>

      <div style={{ padding: "0 22px" }}>
        <Divider />

        {/* Trust signals */}
        {(gallery.transaction_count || gallery.response_rate || gallery.avg_response_time) && (
          <>
            <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".16em", textTransform: "uppercase", margin: "0 0 14px", fontFamily: FONT }}>
              Trust Signals
            </p>
            <div style={{ display: "flex", gap: 0 }}>
              {gallery.response_rate !== undefined && (
                <div style={{ flex: 1, textAlign: "center", padding: "16px 0", borderRight: "0.5px solid #F0F0F0" }}>
                  <p style={{ fontSize: 20, fontWeight: 600, color: "#0D0D0D", margin: "0 0 4px", fontFamily: FONT_HEAD }}>{gallery.response_rate}%</p>
                  <p style={{ fontSize: 10, color: "#AAAAAA", margin: 0, fontFamily: FONT, letterSpacing: ".04em" }}>응답률</p>
                </div>
              )}
              {gallery.avg_response_time && (
                <div style={{ flex: 1, textAlign: "center", padding: "16px 0", borderRight: gallery.transaction_count ? "0.5px solid #F0F0F0" : "none" }}>
                  <p style={{ fontSize: 20, fontWeight: 600, color: "#0D0D0D", margin: "0 0 4px", fontFamily: FONT_HEAD }}>{gallery.avg_response_time}</p>
                  <p style={{ fontSize: 10, color: "#AAAAAA", margin: 0, fontFamily: FONT, letterSpacing: ".04em" }}>평균 응답</p>
                </div>
              )}
              {gallery.transaction_count !== undefined && (
                <div style={{ flex: 1, textAlign: "center", padding: "16px 0" }}>
                  <p style={{ fontSize: 20, fontWeight: 600, color: "#0D0D0D", margin: "0 0 4px", fontFamily: FONT_HEAD }}>{gallery.transaction_count}+</p>
                  <p style={{ fontSize: 10, color: "#AAAAAA", margin: 0, fontFamily: FONT, letterSpacing: ".04em" }}>거래</p>
                </div>
              )}
            </div>
            <Divider />
          </>
        )}

        {/* Featured Artists */}
        {gallery.artists.length > 0 && (
          <>
            <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".16em", textTransform: "uppercase", margin: "0 0 14px", fontFamily: FONT }}>
              Representative Artists
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px" }}>
              {gallery.artists.map(a => (
                <span key={a} style={{
                  fontSize: 13, color: "#333", fontFamily: FONT,
                  paddingBottom: 2, borderBottom: "0.5px solid #E8E8E8",
                }}>
                  {a}
                </span>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* Exhibitions */}
        {gallery.exhibitions.length > 0 && (
          <>
            <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".16em", textTransform: "uppercase", margin: "0 0 14px", fontFamily: FONT }}>
              Exhibitions
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {gallery.exhibitions.map((ex, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  padding: "12px 0", borderBottom: "0.5px solid #F4F4F4",
                }}>
                  <div>
                    <p style={{ fontSize: 13, color: "#0D0D0D", margin: "0 0 2px", fontFamily: FONT }}>{ex.title}</p>
                    {ex.venue && <p style={{ fontSize: 11, color: "#AAAAAA", margin: 0, fontFamily: FONT }}>{ex.venue}</p>}
                  </div>
                  <span style={{ fontSize: 12, color: "#CCCCCC", fontFamily: FONT, flexShrink: 0, marginLeft: 12 }}>{ex.year}</span>
                </div>
              ))}
            </div>
            <Divider />
          </>
        )}

        {/* Available Works */}
        <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".16em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: FONT }}>
          Available Works from this Gallery
        </p>
        <p style={{ fontSize: 11, color: "#CCCCCC", margin: "0 0 16px", fontFamily: FONT }}>
          {availableWorks.length} works
        </p>

        {availableWorks.length === 0 ? (
          <p style={{ fontSize: 13, color: "#CCCCCC", fontFamily: FONT, padding: "20px 0" }}>
            현재 등록된 작품이 없습니다.
          </p>
        ) : (
          availableWorks.map(l => (
            <CompactCard key={l.listing_id} listing={l} onTap={() => onSelectListing(l)} />
          ))
        )}
      </div>
    </div>
  );
}
