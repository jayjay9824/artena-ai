"use client";
import React, { useState } from "react";
import { GalleryListing, GalleryFilter, UserTier, GalleryView } from "./types/gallery";
import { MOCK_LISTINGS, MOCK_GALLERIES } from "./data/mockListings";
import { ListingDetail } from "./components/ListingDetail";
import { GalleryProfile } from "./components/GalleryProfile";
import { BottomNav } from "../components/BottomNav";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

/* ── Demo tier cycler ───────────────────────────────────────────── */
const TIERS: UserTier[] = ["visitor", "premium", "verified_collector", "trusted_collector", "vip_collector"];
const TIER_LABELS: Record<UserTier, string> = {
  visitor: "Visitor", premium: "Premium",
  verified_collector: "Verified", trusted_collector: "Trusted", vip_collector: "VIP",
};

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
  { id: "all",           label: "All" },
  { id: "hold_available", label: "Hold Available" },
  { id: "price_visible",  label: "Price Visible" },
];

function FilterBar({ active, onSelect, onGallery }: {
  active: GalleryFilter | "gallery";
  onSelect: (f: GalleryFilter) => void;
  onGallery: () => void;
}) {
  const pill = (label: string, isActive: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: "7px 16px",
      background: isActive ? "#0D0D0D" : "#FFFFFF",
      color: isActive ? "#FFFFFF" : "#888",
      border: "0.5px solid " + (isActive ? "#0D0D0D" : "#E0E0E0"),
      borderRadius: 20, fontSize: 11, fontFamily: FONT,
      cursor: "pointer", letterSpacing: ".04em", transition: "all .15s",
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
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 640, margin: "0 auto", background: "#FFF", borderRadius: "16px 16px 0 0", padding: "24px 22px 44px" }} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: 9, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 20px", fontFamily: FONT }}>Galleries</p>
        {MOCK_GALLERIES.map(g => (
          <button key={g.gallery_id} onClick={() => onSelect(g.gallery_id)} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            width: "100%", background: "none", border: "none", borderBottom: "0.5px solid #F0F0F0",
            padding: "16px 0", cursor: "pointer",
          }}>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#0D0D0D", margin: "0 0 2px", fontFamily: FONT_HEAD }}>{g.name}</p>
              <p style={{ fontSize: 11, color: "#AAAAAA", margin: "0 0 3px", fontFamily: FONT }}>{g.location} · Est. {g.founded_year}</p>
              <p style={{ fontSize: 11, color: "#BBBBBB", margin: 0, fontFamily: FONT }}>{g.description_short}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 12, flexShrink: 0 }}>
              {g.verified_status && (
                <span style={{ fontSize: 8, color: "#5A5AF0", letterSpacing: ".1em", fontFamily: FONT }}>◆ VERIFIED</span>
              )}
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

/* ── Status pill + price line ───────────────────────────────────── */
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

function PriceLine({ price }: { price: GalleryListing["price"] }) {
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency, maximumFractionDigits: 0 }).format(n);
  const m = { hidden: "Price unavailable", price_on_request: "Price on request", range_only: `${fmt(price.range_min!)} – ${fmt(price.range_max!)}`, public: fmt(price.value!) };
  return <span style={{ fontSize: 12, color: "#666", fontFamily: FONT }}>{m[price.visibility]}</span>;
}

/* ── Full-width listing card ────────────────────────────────────── */
function ListingCard({ listing, onTap, onGallery }: { listing: GalleryListing; onTap: () => void; onGallery: () => void }) {
  const initials = listing.artist_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <article style={{ borderBottom: "0.5px solid #EBEBEB", paddingBottom: 32, marginBottom: 32 }}>
      {/* Image */}
      <div style={{ position: "relative", cursor: "pointer" }} onClick={onTap}>
        {listing.image_url ? (
          <img src={listing.image_url} alt={listing.title} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", aspectRatio: "4/5", background: "#F4F4F2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 40, fontWeight: 200, color: "#D0D0CC", fontFamily: FONT_HEAD }}>{initials}</span>
            <span style={{ fontSize: 9, color: "#C8C8C4", letterSpacing: ".16em", textTransform: "uppercase", fontFamily: FONT }}>{listing.medium}</span>
          </div>
        )}
        {listing.status === "held" && (
          <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", padding: "5px 12px", fontSize: 10, color: "#C4820A", fontFamily: FONT, letterSpacing: ".06em", borderRadius: 20 }}>HELD</div>
        )}
        {listing.status === "sold" && (
          <div style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", padding: "5px 12px", fontSize: 10, color: "#AAAAAA", fontFamily: FONT, letterSpacing: ".06em", borderRadius: 20 }}>SOLD</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "16px 22px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
          <p style={{ fontSize: 10, color: "#AAAAAA", letterSpacing: ".14em", textTransform: "uppercase", margin: 0, fontFamily: FONT }}>
            {listing.artist_nationality ?? ""}
          </p>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "2px 0 2px", fontFamily: FONT_HEAD, lineHeight: 1.25, letterSpacing: "-.02em", cursor: "pointer" }} onClick={onTap}>
          {listing.artist_name}
        </h2>
        <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px", fontFamily: FONT }}>
          <em>{listing.title}</em>, {listing.year}
        </p>

        {/* Gallery row — tappable */}
        <button onClick={onGallery} style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          padding: "8px 0", cursor: "pointer", marginBottom: 10, width: "100%",
        }}>
          <span style={{ fontSize: 12, color: "#444", fontFamily: FONT, fontWeight: 500 }}>{listing.gallery.name}</span>
          {listing.gallery.verified_status && (
            <span style={{ fontSize: 8, color: "#5A5AF0", fontFamily: FONT, letterSpacing: ".1em" }}>◆</span>
          )}
          <span style={{ fontSize: 11, color: "#CCCCCC", fontFamily: FONT, marginLeft: "auto" }}>View →</span>
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <StatusPill status={listing.status} />
          <PriceLine price={listing.price} />
        </div>

        <p style={{ fontSize: 10, color: "#C0C0C0", margin: "0 0 16px", fontFamily: FONT }}>
          Recent Transaction: {listing.market_signal.last_transaction_year ?? "—"}
          {"  ·  "}
          {({ rising: "Trending ↑", stable: "Stable", declining: "Declining ↓", unknown: "—" })[listing.market_signal.trend_direction]}
        </p>

        <button onClick={onTap} style={{
          width: "100%", padding: "12px 0", background: "#FFFFFF", border: "1px solid #0D0D0D",
          color: "#0D0D0D", borderRadius: 7, cursor: "pointer",
          fontSize: 12, letterSpacing: ".06em", fontFamily: FONT, transition: "all .15s",
        }}>
          View Details
        </button>
      </div>
    </article>
  );
}

/* ── Main Gallery Page ──────────────────────────────────────────── */
function GalleryPage() {
  const [view, setView]     = useState<GalleryView>({ type: "list" });
  const [filter, setFilter] = useState<GalleryFilter | "gallery">("all");
  const [showPicker, setShowPicker] = useState(false);
  const [tierIdx, setTierIdx] = useState(0);
  const userTier = TIERS[tierIdx];

  // ── Navigation helpers ────────────────────────────────────────
  const goToDetail  = (listing: GalleryListing, fromGalleryId?: string) =>
    setView({ type: "listing_detail", listing, fromGalleryId });

  const goToGallery = (galleryId: string, fromListing?: GalleryListing) =>
    setView({ type: "gallery_profile", galleryId, fromListing });

  const goBack = () => {
    if (view.type === "listing_detail") {
      if (view.fromGalleryId) {
        setView({ type: "gallery_profile", galleryId: view.fromGalleryId });
      } else {
        setView({ type: "list" });
      }
    } else if (view.type === "gallery_profile") {
      if (view.fromListing) {
        setView({ type: "listing_detail", listing: view.fromListing });
      } else {
        setView({ type: "list" });
        setFilter("all");
      }
    }
  };

  // ── Detail view ───────────────────────────────────────────────
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

  // ── Gallery profile view ──────────────────────────────────────
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

  // ── List view ─────────────────────────────────────────────────
  const filtered = MOCK_LISTINGS.filter(l => {
    if (filter === "hold_available") return l.hold_policy.allow_hold && l.status === "available";
    if (filter === "price_visible")  return l.price.visibility === "range_only" || l.price.visibility === "public";
    return true;
  });

  return (
    <>
      {showPicker && (
        <GalleryPickerModal
          onSelect={id => { setShowPicker(false); setFilter("gallery"); goToGallery(id); }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div style={{
        background: "#FFFFFF", minHeight: "100vh", maxWidth: 640, margin: "0 auto",
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

        {/* Filter bar */}
        <div style={{ marginBottom: 28 }}>
          <FilterBar
            active={filter}
            onSelect={f => { setFilter(f); }}
            onGallery={() => setShowPicker(true)}
          />
        </div>

        {/* Work count */}
        <p style={{ fontSize: 10, color: "#CCCCCC", letterSpacing: ".1em", padding: "0 22px", margin: "0 0 24px", fontFamily: FONT, textTransform: "uppercase" }}>
          {filtered.length} Works
        </p>

        {/* Listings */}
        {filtered.length === 0 ? (
          <div style={{ padding: "60px 22px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#CCCCCC", fontFamily: FONT }}>No works match this filter.</p>
          </div>
        ) : (
          filtered.map(l => (
            <ListingCard
              key={l.listing_id}
              listing={l}
              onTap={() => goToDetail(l)}
              onGallery={() => goToGallery(l.gallery.gallery_id, l)}
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
