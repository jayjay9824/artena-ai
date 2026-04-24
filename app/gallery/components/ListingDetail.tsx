"use client";
import React, { useState } from "react";
import { GalleryListing, UserTier, PriceVisibility } from "../types/gallery";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

const TIER_ORDER: UserTier[] = ["visitor", "premium", "verified_collector", "trusted_collector", "vip_collector"];
const tierGte = (a: UserTier, b: UserTier) => TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b);

/* ── Image placeholder ──────────────────────────────────────────── */
function ArtworkImage({ url, title, artist }: { url: string | null; title: string; artist: string }) {
  const initials = artist.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (!url) {
    return (
      <div style={{
        width: "100%", aspectRatio: "4/5", background: "#F4F4F2",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 12,
      }}>
        <span style={{ fontSize: 36, fontWeight: 300, color: "#C8C8C4", fontFamily: FONT_HEAD, letterSpacing: ".06em" }}>
          {initials}
        </span>
        <span style={{ fontSize: 10, color: "#C0C0BC", letterSpacing: ".12em", textTransform: "uppercase", fontFamily: FONT }}>
          {title}
        </span>
      </div>
    );
  }
  return (
    <img src={url} alt={title}
      style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} />
  );
}

/* ── Verified badge ─────────────────────────────────────────────── */
function VerifiedBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
      color: "#5A5AF0", fontFamily: FONT, fontWeight: 600,
    }}>
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <path d="M4.5 1L5.6 3.3H8L6.2 4.8L6.9 7.2L4.5 5.8L2.1 7.2L2.8 4.8L1 3.3H3.4L4.5 1Z"
          fill="#5A5AF0" />
      </svg>
      ARTENA Verified
    </span>
  );
}

/* ── Status indicator ───────────────────────────────────────────── */
function StatusDot({ status }: { status: GalleryListing["status"] }) {
  const map = {
    available: { color: "#2D9967", label: "Available" },
    held:      { color: "#C4820A", label: "Held" },
    sold:      { color: "#AAAAAA", label: "Sold" },
    not_available: { color: "#CCCCCC", label: "Not available" },
  };
  const { color, label } = map[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color, fontFamily: FONT }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

/* ── Price section ──────────────────────────────────────────────── */
function PriceDisplay({ price }: { price: GalleryListing["price"] }) {
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency, maximumFractionDigits: 0 }).format(n);

  const map: Record<PriceVisibility, React.ReactNode> = {
    hidden:           <span style={{ color: "#AAAAAA" }}>Price unavailable</span>,
    price_on_request: <span>Price on request</span>,
    range_only:       <span>{fmt(price.range_min!)} – {fmt(price.range_max!)}</span>,
    public:           <span style={{ fontWeight: 600 }}>{fmt(price.value!)}</span>,
  };

  return (
    <div style={{ fontFamily: FONT, fontSize: 14, color: "#0D0D0D" }}>
      {map[price.visibility]}
    </div>
  );
}

/* ── Market Signal ──────────────────────────────────────────────── */
function MarketSignalBlock({ signal }: { signal: GalleryListing["market_signal"] }) {
  const trendLabel = { rising: "Rising ↑", stable: "Stable →", declining: "Declining ↓", unknown: "—" };
  const trendColor = { rising: "#2D9967", stable: "#0D0D0D", declining: "#C74040", unknown: "#AAAAAA" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        ["Recent Transaction", signal.last_transaction_year?.toString() ?? "—"],
        ["Transactions", signal.transaction_count.toString()],
        ["Trend", <span style={{ color: trendColor[signal.trend_direction], fontSize: 12, fontFamily: FONT }}>{trendLabel[signal.trend_direction]}</span>],
        ["Source", signal.source_label],
      ].map(([k, v]) => (
        <div key={k as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#AAAAAA", letterSpacing: ".04em", fontFamily: FONT }}>{k as string}</span>
          <span style={{ fontSize: 12, color: "#0D0D0D", fontFamily: FONT }}>{v as React.ReactNode}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Action Buttons ─────────────────────────────────────────────── */
function ActionButtons({ listing, userTier, onHoldRequest }: {
  listing: GalleryListing;
  userTier: UserTier;
  onHoldRequest: () => void;
}) {
  const { status, price, hold_policy, gallery } = listing;
  const primary = gallery.communication_channels.find(c => c.is_primary) ?? gallery.communication_channels[0];

  const BtnOutline = ({ label, onClick, disabled, note }: { label: string; onClick?: () => void; disabled?: boolean; note?: string }) => (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={!disabled ? onClick : undefined}
        style={{
          width: "100%", padding: "13px 0",
          background: disabled ? "#F5F5F5" : "#FFFFFF",
          border: `1px solid ${disabled ? "#E0E0E0" : "#0D0D0D"}`,
          color: disabled ? "#BBBBBB" : "#0D0D0D",
          borderRadius: 7, cursor: disabled ? "default" : "pointer",
          fontSize: 13, letterSpacing: ".04em", fontFamily: FONT,
          transition: "all .15s",
        }}
      >{label}</button>
      {note && <p style={{ fontSize: 10, color: "#AAAAAA", margin: "5px 0 0", textAlign: "center", fontFamily: FONT, letterSpacing: ".02em" }}>{note}</p>}
    </div>
  );

  const BtnFilled = ({ label, onClick, disabled, note }: { label: string; onClick?: () => void; disabled?: boolean; note?: string }) => (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={!disabled ? onClick : undefined}
        style={{
          width: "100%", padding: "13px 0",
          background: disabled ? "#F5F5F5" : "#0D0D0D",
          border: "none",
          color: disabled ? "#BBBBBB" : "#FFFFFF",
          borderRadius: 7, cursor: disabled ? "default" : "pointer",
          fontSize: 13, letterSpacing: ".04em", fontFamily: FONT,
          fontWeight: 500, transition: "all .15s",
        }}
      >{label}</button>
      {note && <p style={{ fontSize: 10, color: "#AAAAAA", margin: "5px 0 0", textAlign: "center", fontFamily: FONT, letterSpacing: ".02em" }}>{note}</p>}
    </div>
  );

  if (status === "sold") {
    return <BtnOutline label="Not available" disabled />;
  }

  if (status === "held") {
    return (
      <>
        <BtnFilled
          label="Join Waitlist"
          disabled={!tierGte(userTier, "premium")}
          note={!tierGte(userTier, "premium") ? "Waitlist requires a premium account" : undefined}
          onClick={() => alert("Waitlist 등록 요청이 전송되었습니다.")}
        />
        <BtnOutline
          label="Contact Gallery"
          onClick={() => window.open(primary?.url, "_blank")}
        />
      </>
    );
  }

  // available
  const canInquire = tierGte(userTier, "verified_collector");
  const canHold = hold_policy.allow_hold && tierGte(userTier, "trusted_collector");

  const priceCTA = {
    hidden:           { label: "Contact Gallery", action: () => window.open(primary?.url, "_blank"), gated: false },
    price_on_request: { label: "Request Price", action: () => alert("가격 문의가 전송되었습니다."), gated: !canInquire },
    range_only:       { label: "Request Exact Price", action: () => alert("정확한 가격 문의가 전송되었습니다."), gated: !canInquire },
    public:           { label: "Hold Request", action: onHoldRequest, gated: !canHold },
  }[price.visibility];

  return (
    <>
      <BtnFilled
        label={priceCTA.label}
        disabled={priceCTA.gated}
        onClick={priceCTA.action}
        note={priceCTA.gated
          ? (canInquire ? "Trusted collector status required for Hold" : "Collector verification required")
          : undefined}
      />
      <BtnOutline
        label="Contact Gallery"
        onClick={() => window.open(primary?.url, "_blank")}
      />
    </>
  );
}

/* ── Hold Request Modal ─────────────────────────────────────────── */
function HoldModal({ listing, onClose }: { listing: GalleryListing; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end",
    }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 640, margin: "0 auto",
          background: "#FFFFFF", borderRadius: "16px 16px 0 0",
          padding: "28px 24px 40px",
        }}
        onClick={e => e.stopPropagation()}
      >
        {submitted ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ fontSize: 13, color: "#AAAAAA", marginBottom: 6, fontFamily: FONT, letterSpacing: ".04em" }}>HOLD REQUEST</p>
            <p style={{ fontSize: 17, fontWeight: 600, color: "#0D0D0D", marginBottom: 8, fontFamily: FONT_HEAD }}>요청이 전송되었습니다</p>
            <p style={{ fontSize: 12, color: "#888", lineHeight: 1.6, marginBottom: 24, fontFamily: FONT }}>
              갤러리 승인 후 {listing.hold_policy.default_duration_hours}시간 홀드가 시작됩니다.
              승인 여부는 My Activity에서 확인하실 수 있습니다.
            </p>
            <button onClick={onClose} style={{ background: "#0D0D0D", color: "#FFF", border: "none", borderRadius: 7, padding: "12px 32px", fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>
              확인
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 10, color: "#AAAAAA", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 4, fontFamily: FONT }}>Hold Request</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#0D0D0D", marginBottom: 4, fontFamily: FONT_HEAD }}>{listing.title}</p>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 20, fontFamily: FONT }}>{listing.artist_name}</p>

            <div style={{ background: "#F8F8F6", borderRadius: 8, padding: "14px 16px", marginBottom: 20 }}>
              {[
                ["갤러리", listing.gallery.name],
                ["홀드 기간", `${listing.hold_policy.default_duration_hours}시간 (갤러리 승인 후 시작)`],
                ["승인 방식", "수동 승인 (Manual Approval)"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontFamily: FONT }}>
                  <span style={{ color: "#AAAAAA" }}>{k}</span>
                  <span style={{ color: "#0D0D0D" }}>{v}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 10, color: "#BBBBBB", lineHeight: 1.7, marginBottom: 20, fontFamily: FONT }}>
              Hold는 자동 확정이 아닙니다. 갤러리 승인 후 타이머가 시작되며, 만료 시 자동으로 Available 상태로 전환됩니다.
            </p>

            <button
              onClick={() => setSubmitted(true)}
              style={{ width: "100%", padding: "13px 0", background: "#0D0D0D", color: "#FFF", border: "none", borderRadius: 7, fontSize: 13, fontFamily: FONT, cursor: "pointer", marginBottom: 10 }}
            >
              Hold 요청 전송
            </button>
            <button
              onClick={onClose}
              style={{ width: "100%", padding: "12px 0", background: "transparent", color: "#AAAAAA", border: "1px solid #E8E8E8", borderRadius: 7, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}
            >
              취소
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Divider ────────────────────────────────────────────────────── */
const Divider = () => <div style={{ height: "0.5px", background: "#EBEBEB", margin: "24px 0" }} />;

/* ── Main Detail View ───────────────────────────────────────────── */
interface ListingDetailProps {
  listing: GalleryListing;
  userTier: UserTier;
  onBack: () => void;
}

export function ListingDetail({ listing, userTier, onBack }: ListingDetailProps) {
  const [showHold, setShowHold] = useState(false);

  return (
    <div style={{
      background: "#FFFFFF", minHeight: "100vh", maxWidth: 640, margin: "0 auto",
      fontFamily: FONT, color: "#0D0D0D", overflowX: "hidden",
    }}>
      {/* Back button */}
      <div style={{ padding: "52px 22px 0", marginBottom: 16 }}>
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
      </div>

      {/* Artwork image */}
      <ArtworkImage url={listing.image_url} title={listing.title} artist={listing.artist_name} />

      {/* Main content */}
      <div style={{ padding: "24px 22px 60px" }}>

        {/* Artist + Title */}
        <p style={{ fontSize: 10, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 6px", fontFamily: FONT }}>
          {listing.artist_nationality ?? ""}
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", fontFamily: FONT_HEAD, lineHeight: 1.25, letterSpacing: "-.02em" }}>
          {listing.artist_name}
        </h1>
        <p style={{ fontSize: 15, color: "#444", margin: "0 0 4px", fontFamily: FONT }}>
          <em>{listing.title}</em>, {listing.year}
        </p>
        <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px", fontFamily: FONT }}>
          {listing.medium}
        </p>
        {listing.dimensions && (
          <p style={{ fontSize: 12, color: "#AAAAAA", margin: "0 0 16px", fontFamily: FONT }}>{listing.dimensions}</p>
        )}

        <StatusDot status={listing.status} />

        {listing.description && (
          <>
            <Divider />
            <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, margin: 0, fontFamily: FONT }}>
              {listing.description}
            </p>
          </>
        )}

        <Divider />

        {/* Gallery info */}
        <div>
          <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 8px", fontFamily: FONT }}>Gallery</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", fontFamily: FONT_HEAD }}>{listing.gallery.name}</p>
              <VerifiedBadge />
              <p style={{ fontSize: 12, color: "#888", margin: "6px 0 0", lineHeight: 1.6, fontFamily: FONT, maxWidth: 240 }}>
                {listing.gallery.description}
              </p>
            </div>
          </div>

          {/* Contact channels */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {listing.gallery.communication_channels.map(ch => (
              <a key={ch.type} href={ch.url} target="_blank" rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, color: "#555", fontFamily: FONT,
                  border: "0.5px solid #E0E0E0", borderRadius: 20, padding: "6px 14px",
                  textDecoration: "none", letterSpacing: ".02em",
                }}
              >
                {ch.label}
              </a>
            ))}
          </div>
        </div>

        <Divider />

        {/* Market Signal */}
        <div>
          <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 14px", fontFamily: FONT }}>
            Market Signal
          </p>
          <p style={{ fontSize: 10, color: "#C0C0C0", margin: "0 0 12px", fontFamily: FONT, lineHeight: 1.6 }}>
            과거 거래 데이터 기반 시장 흐름 정보입니다. 현재 판매가가 아닙니다.
          </p>
          <MarketSignalBlock signal={listing.market_signal} />
        </div>

        <Divider />

        {/* Price */}
        <div>
          <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 10px", fontFamily: FONT }}>Price</p>
          <PriceDisplay price={listing.price} />
        </div>

        <Divider />

        {/* Action buttons */}
        <ActionButtons
          listing={listing}
          userTier={userTier}
          onHoldRequest={() => setShowHold(true)}
        />

        {/* Tier notice */}
        {userTier === "visitor" && (
          <div style={{
            background: "#F8F8F6", borderRadius: 8, padding: "14px 16px", marginTop: 8,
            border: "0.5px solid #EBEBEB",
          }}>
            <p style={{ fontSize: 11, color: "#888", margin: "0 0 2px", fontFamily: FONT, fontWeight: 600 }}>
              Collector Verification
            </p>
            <p style={{ fontSize: 11, color: "#AAAAAA", margin: 0, lineHeight: 1.6, fontFamily: FONT }}>
              Price inquiry and Hold access are available only to verified collectors.
            </p>
          </div>
        )}
      </div>

      {showHold && (
        <HoldModal listing={listing} onClose={() => setShowHold(false)} />
      )}
    </div>
  );
}
