"use client";
import React, { useState, useEffect, useCallback } from "react";
import { GalleryListing, GalleryFilter, UserTier, GalleryView, VerifiedTier, PriceVisibility } from "./types/gallery";
import { MOCK_LISTINGS, MOCK_GALLERIES } from "./data/mockListings";
import { ListingDetail } from "./components/ListingDetail";
import { GalleryProfile } from "./components/GalleryProfile";
import { BottomNav } from "../components/BottomNav";

const FONT     = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

/* ── Tier helpers ───────────────────────────────────────────────── */
const TIERS: UserTier[] = ["visitor", "premium", "verified_collector", "trusted_collector", "vip_collector"];
const TIER_LABELS: Record<UserTier, string> = {
  visitor: "Visitor", premium: "Premium",
  verified_collector: "Verified", trusted_collector: "Trusted", vip_collector: "VIP",
};
const tierGte = (a: UserTier, b: UserTier) => TIERS.indexOf(a) >= TIERS.indexOf(b);

/* ── Verified badge ─────────────────────────────────────────────── */
const BADGE: Record<VerifiedTier, { label: string; color: string }> = {
  approved: { label: "ARTENA Verified", color: "#5A5AF0" },
  premium:  { label: "Premium Gallery", color: "#0D0D0D" },
  partner:  { label: "Partner Gallery", color: "#B5860A" },
};
function VerifiedPill({ tier }: { tier: VerifiedTier | false }) {
  if (!tier) return null;
  const { label, color } = BADGE[tier];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, color, fontFamily: FONT, fontWeight: 600, letterSpacing: ".06em" }}>
      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
        <path d="M6 1L7.4 4.1H10.8L8.2 6L9.2 9.2L6 7.4L2.8 9.2L3.8 6L1.2 4.1H4.6L6 1Z" fill={color} />
      </svg>
      {label}
    </span>
  );
}

/* ── Status pill ────────────────────────────────────────────────── */
function StatusPill({ status }: { status: GalleryListing["status"] }) {
  const c = { available: "#2D9967", held: "#C4820A", sold: "#AAAAAA", not_available: "#CCCCCC" }[status];
  const l = { available: "Available", held: "Held", sold: "Sold", not_available: "N/A" }[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: c, fontFamily: FONT }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, display: "inline-block" }} />
      {l}
    </span>
  );
}

/* ── Price line ─────────────────────────────────────────────────── */
function PriceLine({ price, style: s }: { price: GalleryListing["price"]; style?: React.CSSProperties }) {
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency, maximumFractionDigits: 0 }).format(n);
  const text = {
    hidden:           "Price unavailable",
    price_on_request: "Price on request",
    range_only:       `${fmt(price.range_min!)} – ${fmt(price.range_max!)}`,
    public:           fmt(price.value!),
  }[price.visibility];
  return <span style={{ fontSize: 12, color: "#666", fontFamily: FONT, ...s }}>{text}</span>;
}

/* ── Image placeholder ──────────────────────────────────────────── */
function ArtImg({ url, title, artist, style: s }: { url: string | null; title: string; artist: string; style?: React.CSSProperties }) {
  const initials = artist.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (url) return <img src={url} alt={title} style={{ objectFit: "cover", display: "block", ...s }} />;
  return (
    <div style={{ background: "#F4F4F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, ...s }}>
      <span style={{ fontSize: 28, fontWeight: 200, color: "#D0D0CC", fontFamily: FONT_HEAD }}>{initials}</span>
      <span style={{ fontSize: 8, color: "#C8C8C4", letterSpacing: ".14em", textTransform: "uppercase", fontFamily: FONT }}>{title.slice(0, 22)}</span>
    </div>
  );
}

/* ── Hold Modal ─────────────────────────────────────────────────── */
function HoldModal({ listing, onClose }: { listing: GalleryListing; onClose: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", background: "#FFF", borderRadius: "18px 18px 0 0", padding: "28px 24px 44px" }} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ fontSize: 13, color: "#AAAAAA", marginBottom: 6, fontFamily: FONT }}>HOLD REQUEST</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#0D0D0D", marginBottom: 8, fontFamily: FONT_HEAD }}>요청이 전송되었습니다</p>
            <p style={{ fontSize: 12, color: "#888", lineHeight: 1.7, marginBottom: 24, fontFamily: FONT }}>
              갤러리 승인 후 {listing.hold_policy.default_duration_hours}시간 홀드가 시작됩니다.
            </p>
            <button onClick={onClose} style={{ background: "#0D0D0D", color: "#FFF", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>확인</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 10, color: "#AAAAAA", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 4, fontFamily: FONT }}>Hold Request</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#0D0D0D", marginBottom: 2, fontFamily: FONT_HEAD }}>{listing.title}</p>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 20, fontFamily: FONT }}>{listing.artist_name} · {listing.gallery.name}</p>
            <div style={{ background: "#F8F8F6", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              {[["홀드 기간", `${listing.hold_policy.default_duration_hours}시간 (갤러리 승인 후)`], ["승인 방식", "수동 승인 (Manual Approval)"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontFamily: FONT }}>
                  <span style={{ color: "#AAAAAA" }}>{k}</span><span style={{ color: "#0D0D0D" }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: "#CCCCCC", lineHeight: 1.7, marginBottom: 20, fontFamily: FONT }}>
              Hold는 자동 확정이 아닙니다. 갤러리 승인 후 타이머가 시작됩니다.
            </p>
            <button onClick={() => setDone(true)} style={{ width: "100%", padding: "13px 0", background: "#0D0D0D", color: "#FFF", border: "none", borderRadius: 8, fontSize: 13, fontFamily: FONT, cursor: "pointer", marginBottom: 10 }}>Hold 요청 전송</button>
            <button onClick={onClose} style={{ width: "100%", padding: "12px 0", background: "transparent", color: "#AAAAAA", border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>취소</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Quick Action Buttons (on card) ─────────────────────────────── */
function QuickActions({ listing, userTier, onHold }: {
  listing: GalleryListing; userTier: UserTier; onHold: () => void;
}) {
  const { status, price, hold_policy, gallery } = listing;
  const primary = gallery.communication_channels.find(c => c.is_primary) ?? gallery.communication_channels[0];
  const canInquire = tierGte(userTier, "verified_collector");
  const canHold    = tierGte(userTier, "trusted_collector") && hold_policy.allow_hold;

  const pill = (label: string, onClick: () => void, disabled?: boolean) => (
    <button
      key={label}
      onClick={e => { e.stopPropagation(); if (!disabled) onClick(); }}
      style={{
        padding: "7px 14px", border: `0.5px solid ${disabled ? "#EBEBEB" : "#C8C8C8"}`,
        background: "transparent", borderRadius: 20,
        fontSize: 11, color: disabled ? "#CCCCCC" : "#444",
        fontFamily: FONT, cursor: disabled ? "default" : "pointer",
        letterSpacing: ".02em", transition: "all .12s",
      }}
    >{label}</button>
  );

  const buttons: React.ReactNode[] = [];

  // Contact — always available
  if (primary) {
    buttons.push(pill("Contact", () => window.open(primary.url, "_blank")));
  }

  if (status === "available") {
    if (price.visibility !== "hidden") {
      buttons.push(pill("Request Price", () => alert("가격 문의가 전송되었습니다."), !canInquire));
    }
    if (hold_policy.allow_hold) {
      buttons.push(pill("Hold", onHold, !canHold));
    }
  } else if (status === "held") {
    buttons.push(pill("Join Waitlist", () => alert("Waitlist 등록 요청이 전송되었습니다."), !tierGte(userTier, "premium")));
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }} onClick={e => e.stopPropagation()}>
      {buttons}
    </div>
  );
}

/* ── Bottom Sheet ───────────────────────────────────────────────── */
interface BottomSheetProps {
  listing: GalleryListing;
  userTier: UserTier;
  onClose: () => void;
  onViewDetail: () => void;
  onViewGallery: (id: string) => void;
  onHold: () => void;
}

function BottomSheet({ listing, userTier, onClose, onViewDetail, onViewGallery, onHold }: BottomSheetProps) {
  const [visible, setVisible] = useState(false);
  const { gallery, price, status, market_signal, hold_policy } = listing;
  const primary = gallery.communication_channels.find(c => c.is_primary) ?? gallery.communication_channels[0];
  const canInquire = tierGte(userTier, "verified_collector");
  const canHold    = tierGte(userTier, "trusted_collector") && hold_policy.allow_hold;

  // Slide in on mount, slide out on close
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 320);
  }, [onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const BtnFilled = ({ label, onClick, disabled, note }: { label: string; onClick: () => void; disabled?: boolean; note?: string }) => (
    <div style={{ marginBottom: 8 }}>
      <button onClick={() => !disabled && onClick()} style={{
        width: "100%", padding: "13px 0", background: disabled ? "#F5F5F5" : "#0D0D0D",
        border: "none", color: disabled ? "#BBBBBB" : "#FFF", borderRadius: 8,
        cursor: disabled ? "default" : "pointer", fontSize: 13, fontFamily: FONT,
        fontWeight: 500, letterSpacing: ".04em",
      }}>{label}</button>
      {note && <p style={{ fontSize: 10, color: "#AAAAAA", margin: "4px 0 0", textAlign: "center", fontFamily: FONT }}>{note}</p>}
    </div>
  );
  const BtnOutline = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <div style={{ marginBottom: 8 }}>
      <button onClick={onClick} style={{
        width: "100%", padding: "12px 0", background: "transparent",
        border: "1px solid #D8D8D8", color: "#444", borderRadius: 8,
        cursor: "pointer", fontSize: 13, fontFamily: FONT, letterSpacing: ".04em",
      }}>{label}</button>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0, zIndex: 700,
          background: "rgba(0,0,0,0.42)",
          opacity: visible ? 1 : 0,
          transition: "opacity .32s ease",
        }}
      />
      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "100%"})`,
        transition: "transform .32s cubic-bezier(0.32,0.72,0,1)",
        width: "100%", maxWidth: 640, zIndex: 800,
        background: "#FFF", borderRadius: "20px 20px 0 0",
        maxHeight: "88vh", overflowY: "auto",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E0E0E0" }} />
        </div>

        {/* Image */}
        <ArtImg
          url={listing.image_url} title={listing.title} artist={listing.artist_name}
          style={{ width: "100%", aspectRatio: "16/9" }}
        />

        <div style={{ padding: "20px 22px 40px" }}>

          {/* Basic info */}
          <p style={{ fontSize: 10, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: FONT }}>
            {listing.artist_nationality ?? ""}
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_HEAD, letterSpacing: "-.02em" }}>
            {listing.artist_name}
          </h2>
          <p style={{ fontSize: 14, color: "#555", margin: "0 0 3px", fontFamily: FONT }}>
            <em>{listing.title}</em>, {listing.year}
          </p>
          <p style={{ fontSize: 12, color: "#AAAAAA", margin: "0 0 12px", fontFamily: FONT }}>
            {listing.medium}{listing.dimensions ? ` · ${listing.dimensions}` : ""}
          </p>
          <StatusPill status={listing.status} />

          {listing.description && (
            <p style={{ fontSize: 12, color: "#666", lineHeight: 1.75, margin: "14px 0 0", fontFamily: FONT }}>
              {listing.description}
            </p>
          )}

          <div style={{ height: "0.5px", background: "#F0F0F0", margin: "20px 0" }} />

          {/* Gallery block */}
          <div style={{ background: "#F8F8F6", borderRadius: 10, padding: "14px 16px" }}>
            <VerifiedPill tier={gallery.verified_status} />
            <p style={{ fontSize: 15, fontWeight: 700, margin: "6px 0 2px", fontFamily: FONT_HEAD }}>{gallery.name}</p>
            <p style={{ fontSize: 11, color: "#888", margin: "0 0 10px", fontFamily: FONT }}>
              {gallery.location} · Est. {gallery.founded_year}
            </p>
            <button
              onClick={() => { dismiss(); setTimeout(() => onViewGallery(gallery.gallery_id), 340); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontSize: 12, color: "#0D0D0D", fontFamily: FONT, fontWeight: 600,
              }}
            >
              View Gallery <span style={{ fontSize: 10 }}>→</span>
            </button>
          </div>

          <div style={{ height: "0.5px", background: "#F0F0F0", margin: "20px 0" }} />

          {/* Market Signal */}
          <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: FONT }}>Market Signal</p>
          <p style={{ fontSize: 10, color: "#CCCCCC", margin: "0 0 10px", fontFamily: FONT }}>과거 거래 데이터 기반. 현재 판매가가 아닙니다.</p>
          <div style={{ display: "flex", gap: 0 }}>
            {[
              ["Recent", market_signal.last_transaction_year?.toString() ?? "—"],
              ["Count", market_signal.transaction_count.toString()],
              ["Trend", { rising: "↑ Rising", stable: "→ Stable", declining: "↓ Declining", unknown: "—" }[market_signal.trend_direction]],
            ].map(([k, v]) => (
              <div key={k} style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRight: k !== "Trend" ? "0.5px solid #F0F0F0" : "none" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0D0D0D", margin: "0 0 2px", fontFamily: FONT }}>{v}</p>
                <p style={{ fontSize: 9, color: "#AAAAAA", margin: 0, fontFamily: FONT, letterSpacing: ".06em" }}>{k}</p>
              </div>
            ))}
          </div>

          <div style={{ height: "0.5px", background: "#F0F0F0", margin: "20px 0" }} />

          {/* Price */}
          <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 8px", fontFamily: FONT }}>Price</p>
          <PriceLine price={price} style={{ fontSize: 15, fontWeight: status === "available" && price.visibility === "public" ? 600 : 400 }} />

          <div style={{ height: "0.5px", background: "#F0F0F0", margin: "20px 0" }} />

          {/* Action buttons */}
          {status === "available" && (
            <>
              {price.visibility !== "hidden" && (
                <BtnFilled
                  label="Request Price"
                  disabled={!canInquire}
                  note={!canInquire ? "Collector verification required" : undefined}
                  onClick={() => { alert("가격 문의가 전송되었습니다."); }}
                />
              )}
              {hold_policy.allow_hold && (
                <BtnFilled
                  label="Hold Request"
                  disabled={!canHold}
                  note={!canHold ? "Trusted collector status required for Hold" : undefined}
                  onClick={() => { dismiss(); setTimeout(onHold, 340); }}
                />
              )}
            </>
          )}
          {status === "held" && (
            <BtnFilled
              label="Join Waitlist"
              disabled={!tierGte(userTier, "premium")}
              note={!tierGte(userTier, "premium") ? "Waitlist requires a premium account" : undefined}
              onClick={() => alert("Waitlist 등록 요청이 전송되었습니다.")}
            />
          )}
          {primary && (
            <BtnOutline label="Contact Gallery" onClick={() => window.open(primary.url, "_blank")} />
          )}
          <BtnOutline
            label="View Full Detail →"
            onClick={() => { dismiss(); setTimeout(onViewDetail, 340); }}
          />

          {/* Tier notice */}
          {!tierGte(userTier, "verified_collector") && (
            <div style={{ background: "#F8F8F6", borderRadius: 8, padding: "12px 14px", marginTop: 8, border: "0.5px solid #EBEBEB" }}>
              <p style={{ fontSize: 10, color: "#888", margin: "0 0 2px", fontFamily: FONT, fontWeight: 600 }}>Collector Verification</p>
              <p style={{ fontSize: 10, color: "#AAAAAA", margin: 0, lineHeight: 1.6, fontFamily: FONT }}>
                Price inquiry and Hold access are available only to verified collectors.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Full listing card ──────────────────────────────────────────── */
function ListingCard({ listing, userTier, onOpen, onGallery, onHold }: {
  listing: GalleryListing;
  userTier: UserTier;
  onOpen: () => void;
  onGallery: () => void;
  onHold: () => void;
}) {
  const initials = listing.artist_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <article
      style={{ borderBottom: "0.5px solid #EBEBEB", paddingBottom: 28, marginBottom: 28, cursor: "pointer" }}
      onClick={onOpen}
    >
      {/* Image — large, 4:5 */}
      <div style={{ position: "relative" }}>
        {listing.image_url ? (
          <img src={listing.image_url} alt={listing.title} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", aspectRatio: "4/5", background: "#F4F4F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 44, fontWeight: 200, color: "#D4D4D0", fontFamily: FONT_HEAD }}>{initials}</span>
            <span style={{ fontSize: 9, color: "#C8C8C4", letterSpacing: ".16em", textTransform: "uppercase", fontFamily: FONT }}>{listing.medium}</span>
          </div>
        )}
        {/* Overlay badges */}
        {listing.status === "held" && (
          <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(8px)", padding: "5px 12px", fontSize: 10, color: "#C4820A", fontFamily: FONT, letterSpacing: ".06em", borderRadius: 20 }}>HELD</div>
        )}
        {listing.status === "sold" && (
          <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(8px)", padding: "5px 12px", fontSize: 10, color: "#AAAAAA", fontFamily: FONT, letterSpacing: ".06em", borderRadius: 20 }}>SOLD</div>
        )}
        {/* Bottom-left: tap hint */}
        <div style={{ position: "absolute", bottom: 14, left: 14, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", padding: "5px 12px", fontSize: 9, color: "#888", fontFamily: FONT, letterSpacing: ".06em", borderRadius: 20 }}>
          탭하여 상세 보기
        </div>
      </div>

      {/* Card info */}
      <div style={{ padding: "14px 22px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <p style={{ fontSize: 10, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: 0, fontFamily: FONT }}>
            {listing.artist_nationality ?? ""}
          </p>
          <VerifiedPill tier={listing.gallery.verified_status} />
        </div>

        <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_HEAD, lineHeight: 1.25, letterSpacing: "-.02em" }}>
          {listing.artist_name}
        </h2>
        <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px", fontFamily: FONT }}>
          <em>{listing.title}</em>, {listing.year}
        </p>

        {/* Gallery row — tappable separately */}
        <button
          onClick={e => { e.stopPropagation(); onGallery(); }}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: "6px 0", cursor: "pointer", marginBottom: 10, width: "100%" }}
        >
          <span style={{ fontSize: 12, color: "#444", fontFamily: FONT, fontWeight: 500 }}>{listing.gallery.name}</span>
          <span style={{ fontSize: 9, color: "#CCC", fontFamily: FONT }}>→</span>
        </button>

        {/* Status + Price row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <StatusPill status={listing.status} />
          <PriceLine price={listing.price} />
        </div>

        {/* Market signal summary */}
        <p style={{ fontSize: 10, color: "#C0C0C0", margin: "0 0 0", fontFamily: FONT }}>
          Recent Transaction: {listing.market_signal.last_transaction_year ?? "—"}
          <span style={{ margin: "0 8px" }}>·</span>
          {({ rising: "Trending ↑", stable: "Stable", declining: "Declining ↓", unknown: "—" })[listing.market_signal.trend_direction]}
        </p>

        {/* Quick Actions — no page nav needed */}
        <QuickActions listing={listing} userTier={userTier} onHold={onHold} />
      </div>
    </article>
  );
}

/* ── Demo tier badge ────────────────────────────────────────────── */
function DemoTierBadge({ tier, onCycle }: { tier: UserTier; onCycle: () => void }) {
  return (
    <button onClick={onCycle} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: "#F5F5F3", border: "0.5px solid #E0E0E0",
      borderRadius: 20, padding: "5px 12px",
      fontSize: 9, color: "#888", fontFamily: FONT, letterSpacing: ".06em", cursor: "pointer",
    }}>
      <span style={{ color: "#CCCCCC" }}>DEMO</span>
      {TIER_LABELS[tier]} ↻
    </button>
  );
}

/* ── Filter bar ─────────────────────────────────────────────────── */
const FILTERS: { id: GalleryFilter; label: string }[] = [
  { id: "all",            label: "All" },
  { id: "hold_available", label: "Hold Available" },
  { id: "price_visible",  label: "Price Visible" },
];

function FilterBar({ active, onSelect, onGallery }: {
  active: GalleryFilter | "gallery"; onSelect: (f: GalleryFilter) => void; onGallery: () => void;
}) {
  const pill = (label: string, isActive: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} style={{
      flexShrink: 0, padding: "7px 16px",
      background: isActive ? "#0D0D0D" : "#FFFFFF",
      color: isActive ? "#FFFFFF" : "#888",
      border: "0.5px solid " + (isActive ? "#0D0D0D" : "#E0E0E0"),
      borderRadius: 20, fontSize: 11, fontFamily: FONT,
      cursor: "pointer", letterSpacing: ".04em", transition: "all .12s",
    }}>{label}</button>
  );
  return (
    <div style={{ overflowX: "auto", display: "flex", gap: 8, padding: "0 22px", scrollbarWidth: "none" }}>
      {FILTERS.map(f => pill(f.label, active === f.id, () => onSelect(f.id)))}
      {pill("Galleries", active === "gallery", onGallery)}
    </div>
  );
}

/* ── Gallery picker bottom sheet ────────────────────────────────── */
function GalleryPickerModal({ onSelect, onClose }: { onSelect: (id: string) => void; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", background: "#FFF", borderRadius: "18px 18px 0 0", padding: "24px 22px 44px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E0E0E0" }} />
        </div>
        <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 16px", fontFamily: FONT }}>Galleries</p>
        {MOCK_GALLERIES.map(g => (
          <button key={g.gallery_id} onClick={() => onSelect(g.gallery_id)} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            width: "100%", background: "none", border: "none", borderBottom: "0.5px solid #F0F0F0",
            padding: "16px 0", cursor: "pointer",
          }}>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#0D0D0D", margin: "0 0 2px", fontFamily: FONT_HEAD }}>{g.name}</p>
              <p style={{ fontSize: 11, color: "#AAAAAA", margin: "0 0 2px", fontFamily: FONT }}>{g.location} · Est. {g.founded_year}</p>
              <p style={{ fontSize: 11, color: "#C8C8C8", margin: 0, fontFamily: FONT }}>{g.description_short}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 12, flexShrink: 0 }}>
              {g.verified_status && <span style={{ fontSize: 8, color: "#5A5AF0", letterSpacing: ".1em", fontFamily: FONT }}>◆ VERIFIED</span>}
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 2L10 7L5 12" stroke="#CCCCCC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Main Gallery Page ──────────────────────────────────────────── */
function GalleryPage() {
  const [view,        setView]       = useState<GalleryView>({ type: "list" });
  const [filter,      setFilter]     = useState<GalleryFilter | "gallery">("all");
  const [showPicker,  setShowPicker] = useState(false);
  const [sheetTarget, setSheet]      = useState<GalleryListing | null>(null);
  const [holdTarget,  setHold]       = useState<GalleryListing | null>(null);
  const [tierIdx,     setTierIdx]    = useState(0);
  const userTier = TIERS[tierIdx];

  const goToDetail  = useCallback((listing: GalleryListing, fromGalleryId?: string) =>
    setView({ type: "listing_detail", listing, fromGalleryId }), []);

  const goToGallery = useCallback((galleryId: string, fromListing?: GalleryListing) =>
    setView({ type: "gallery_profile", galleryId, fromListing }), []);

  const goBack = useCallback(() => {
    if (view.type === "listing_detail") {
      view.fromGalleryId
        ? setView({ type: "gallery_profile", galleryId: view.fromGalleryId })
        : setView({ type: "list" });
    } else if (view.type === "gallery_profile") {
      view.fromListing
        ? setView({ type: "listing_detail", listing: view.fromListing })
        : setView({ type: "list" });
    }
  }, [view]);

  /* ── Detail page ───────────────────────────────────────────── */
  if (view.type === "listing_detail") {
    return (
      <ListingDetail
        listing={view.listing}
        userTier={userTier}
        onBack={goBack}
        onViewGallery={id => goToGallery(id, view.listing)}
      />
    );
  }

  /* ── Gallery profile page ──────────────────────────────────── */
  if (view.type === "gallery_profile") {
    const gallery = MOCK_GALLERIES.find(g => g.gallery_id === view.galleryId);
    if (!gallery) return null;
    return (
      <>
        <GalleryProfile
          gallery={gallery}
          listings={MOCK_LISTINGS}
          onBack={goBack}
          onSelectListing={l => goToDetail(l, gallery.gallery_id)}
        />
        <BottomNav currentTab="gallery" />
      </>
    );
  }

  /* ── List view ─────────────────────────────────────────────── */
  const filtered = MOCK_LISTINGS.filter(l => {
    if (filter === "hold_available") return l.hold_policy.allow_hold && l.status === "available";
    if (filter === "price_visible")  return l.price.visibility === "range_only" || l.price.visibility === "public";
    return true;
  });

  return (
    <>
      {/* Overlays */}
      {showPicker && (
        <GalleryPickerModal
          onSelect={id => { setShowPicker(false); setFilter("gallery"); goToGallery(id); }}
          onClose={() => setShowPicker(false)}
        />
      )}
      {sheetTarget && (
        <BottomSheet
          listing={sheetTarget}
          userTier={userTier}
          onClose={() => setSheet(null)}
          onViewDetail={() => { setSheet(null); goToDetail(sheetTarget); }}
          onViewGallery={id => { setSheet(null); goToGallery(id, sheetTarget); }}
          onHold={() => { setSheet(null); setHold(sheetTarget); }}
        />
      )}
      {holdTarget && (
        <HoldModal listing={holdTarget} onClose={() => setHold(null)} />
      )}

      <div style={{
        background: "#FFFFFF", minHeight: "100vh",
        maxWidth: 640, margin: "0 auto",
        fontFamily: FONT, overflowX: "hidden", paddingBottom: 100,
      }}>
        {/* Header */}
        <div style={{ padding: "52px 22px 20px", borderBottom: "0.5px solid #EBEBEB", marginBottom: 20 }}>
          <p style={{ fontSize: 8, color: "#AAAAAA", letterSpacing: ".2em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: FONT }}>
            Powered by ARTENA AI
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", fontFamily: FONT_HEAD, letterSpacing: "-.025em", color: "#0D0D0D" }}>
                ARTENA Gallery
              </h1>
              <p style={{ fontSize: 12, color: "#AAAAAA", margin: 0, fontFamily: FONT }}>
                Available works from verified galleries
              </p>
            </div>
            <DemoTierBadge tier={userTier} onCycle={() => setTierIdx(i => (i + 1) % TIERS.length)} />
          </div>
        </div>

        {/* Filter */}
        <div style={{ marginBottom: 28 }}>
          <FilterBar
            active={filter}
            onSelect={f => setFilter(f)}
            onGallery={() => setShowPicker(true)}
          />
        </div>

        {/* Work count */}
        <p style={{ fontSize: 10, color: "#CCCCCC", letterSpacing: ".1em", padding: "0 22px", margin: "0 0 24px", fontFamily: FONT, textTransform: "uppercase" }}>
          {filtered.length} Works
        </p>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div style={{ padding: "60px 22px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#CCCCCC", fontFamily: FONT }}>No works match this filter.</p>
          </div>
        ) : (
          filtered.map(l => (
            <ListingCard
              key={l.listing_id}
              listing={l}
              userTier={userTier}
              onOpen={() => setSheet(l)}
              onGallery={() => goToGallery(l.gallery.gallery_id, l)}
              onHold={() => setHold(l)}
            />
          ))
        )}
      </div>

      <BottomNav currentTab="gallery" />
    </>
  );
}

export { GalleryPage as GalleryPageContent };
export default GalleryPage;
