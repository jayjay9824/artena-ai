"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMyActivity, SavedArtwork, Collection } from "../context/MyActivityContext";
import { BottomNav } from "../components/BottomNav";
import { useTabNav } from "../context/TabContext";
import { useLanguage } from "../i18n/useLanguage";

const FONT = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";

type MyTab = "likes" | "saved" | "collections" | "recent";

/* ── Helpers ─────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  available: "#2D9967", held: "#C4820A", sold: "#AAAAAA",
  not_available: "#CCCCCC", not_listed: "#CCCCCC",
};
const STATUS_LABEL: Record<string, string> = {
  available: "Available", held: "Held", sold: "Sold",
  not_available: "N/A", not_listed: "Not listed",
};

/* ── Status badge ────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? "#CCCCCC";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: c, fontFamily: FONT }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, display: "inline-block", flexShrink: 0 }} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/* ── Artwork thumbnail ───────────────────────────────────────────── */
/**
 * Premium placeholder when no image: warm bronze-tinted gradient,
 * bronze initials in serif weight, tiny ARTENA glyph above. Reads
 * as a museum archive card rather than a missing-image fallback.
 * Real images render edge-to-edge as before.
 */
function ArtThumb({ url, artist }: { url: string | null; artist: string }) {
  const initials = artist.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (url) {
    return (
      <div style={{
        width: 72, height: 72, flexShrink: 0,
        background: "#F4F4F2", borderRadius: 6, overflow: "hidden",
      }}>
        <img
          src={url}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
        />
      </div>
    );
  }
  return (
    <div style={{
      width: 72, height: 72, flexShrink: 0,
      background: "linear-gradient(140deg, #F8F4EB, #F1ECE0 60%, #ECE6D6)",
      borderRadius: 6, overflow: "hidden",
      border: "0.5px solid #E7E2D8",
      display: "flex", flexDirection: "column" as const,
      alignItems: "center", justifyContent: "center",
      gap: 2,
    }}>
      <span style={{
        fontSize: 7, color: "#8A6A3F",
        letterSpacing: ".22em", textTransform: "uppercase" as const,
        fontWeight: 600, fontFamily: FONT,
      }}>
        ◆
      </span>
      <span style={{
        fontSize: 17, color: "#8A6A3F",
        fontFamily: FONT_HEAD, fontWeight: 600,
        letterSpacing: ".02em",
      }}>
        {initials}
      </span>
    </div>
  );
}

/* ── Artwork mini card ───────────────────────────────────────────── */
interface MiniCardProps {
  artwork: SavedArtwork;
  meta?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  secondaryAction?: { label: string; icon: React.ReactNode; onClick: () => void };
  onView?: () => void;
}

function ArtworkMiniCard({ artwork, meta, onAction, actionLabel, actionIcon, secondaryAction, onView }: MiniCardProps) {
  const { goTo } = useTabNav();
  const router = useRouter();

  // Spec routing: reportId → /report/{reportId}
  // else artworkId → /analyze?artworkId={artworkId}
  const onViewAnalysis = () => {
    if (artwork.report_id) {
      router.push(`/report/${artwork.report_id}`);
    } else if (artwork.artwork_id) {
      router.push(`/analyze?artworkId=${encodeURIComponent(artwork.artwork_id)}`);
    } else {
      goTo("scan");
    }
  };

  // Build the secondary metadata line: medium and/or period if present.
  const metaParts: string[] = [];
  if (artwork.medium) metaParts.push(artwork.medium);
  if (artwork.period) metaParts.push(artwork.period);
  const mediumPeriod = metaParts.join(" · ");

  return (
    <div style={{ display: "flex", gap: 14, padding: "16px 0", borderBottom: "0.5px solid #F4F4F4", alignItems: "flex-start" }}>
      <ArtThumb url={artwork.image_url} artist={artwork.artist_name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#0D0D0D", margin: "0 0 2px", fontFamily: FONT_HEAD, lineHeight: 1.3 }}>{artwork.artist_name}</p>
        <p style={{ fontSize: 12, color: "#555", margin: "0 0 2px", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <em>{artwork.title}</em>{artwork.year ? `, ${artwork.year}` : ""}
        </p>
        {mediumPeriod && (
          <p style={{ fontSize: 11, color: "#9A9A9A", margin: "0 0 4px", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {mediumPeriod}
          </p>
        )}
        {artwork.gallery_name && (
          <p style={{ fontSize: 11, color: "#AAAAAA", margin: "0 0 6px", fontFamily: FONT }}>{artwork.gallery_name}</p>
        )}
        {artwork.source === "analysis" && (
          <p style={{
            fontSize: 9, color: "#8A6A3F", letterSpacing: ".18em",
            textTransform: "uppercase" as const,
            margin: "2px 0 6px", fontWeight: 600, fontFamily: FONT,
          }}>
            Record · ARTENA Analysis
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge status={artwork.status} />
          {meta && <span style={{ fontSize: 10, color: "#C8C8C8", fontFamily: FONT }}>{meta}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {artwork.source === "gallery" && artwork.status === "available" && (
            <button onClick={() => goTo("gallery")} style={{ fontSize: 10, color: "#8A6A3F", background: "none", border: "0.5px solid #D9C9A6", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontFamily: FONT, letterSpacing: ".04em" }}>
              View in Gallery
            </button>
          )}
          {artwork.source === "analysis" && (
            <button onClick={onViewAnalysis} style={{ fontSize: 10, color: "#1C1A17", background: "none", border: "0.5px solid #D8D8D8", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontFamily: FONT, letterSpacing: ".04em", fontWeight: 600 }}>
              View Analysis →
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {onAction && (
          <button onClick={onAction} title={actionLabel} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#CCCCCC", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {actionIcon}
          </button>
        )}
        {secondaryAction && (
          <button onClick={secondaryAction.onClick} title={secondaryAction.label} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#CCCCCC", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {secondaryAction.icon}
          </button>
        )}
      </div>
    </div>
  );
}

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 4h9M5.5 4V2.5h3V4M6 6.5v4M8 6.5v4M3.5 4l.5 7.5h6L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Empty state ─────────────────────────────────────────────────── */
function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: "60px 0", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.18 }}>◆</div>
      <p style={{ fontSize: 13, color: "#CCCCCC", fontFamily: FONT }}>{text}</p>
    </div>
  );
}

/* ── Likes tab ───────────────────────────────────────────────────── */
function LikesTab() {
  const { state, unlike } = useMyActivity();
  if (state.likes.length === 0) return <Empty text="You haven't liked any artworks yet." />;
  return (
    <>
      {state.likes.map(a => (
        <ArtworkMiniCard
          key={a.artwork_id}
          artwork={a}
          onAction={() => unlike(a.artwork_id)}
          actionLabel="Unlike"
          actionIcon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 13.5C8 13.5 2 9.5 2 5.5a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 8-6 8Z" fill="#E04040" stroke="#E04040" strokeWidth="1.2" strokeLinejoin="round" /></svg>}
        />
      ))}
    </>
  );
}

/* ── Saved tab ───────────────────────────────────────────────────── */
function SavedTab() {
  const { state, unsave } = useMyActivity();
  if (state.saved.length === 0) return <Empty text="No saved artworks yet." />;
  return (
    <>
      {state.saved.map(a => (
        <ArtworkMiniCard
          key={a.artwork_id}
          artwork={a}
          onAction={() => unsave(a.artwork_id)}
          actionLabel="Remove"
          actionIcon={<TrashIcon />}
        />
      ))}
    </>
  );
}

/* ── Collection card ─────────────────────────────────────────────── */
function CollectionCard({ col, onClick }: { col: Collection; onClick: () => void }) {
  const previews = col.items.slice(0, 3);
  return (
    <button onClick={onClick} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "16px 0", borderBottom: "0.5px solid #F4F4F4", display: "flex", gap: 14, alignItems: "center", textAlign: "left" }}>
      {/* Thumbnail mosaic */}
      <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 6, overflow: "hidden", background: "#F4F4F2", display: "grid", gridTemplateColumns: previews.length >= 2 ? "1fr 1fr" : "1fr", gap: 1 }}>
        {previews.length === 0
          ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: "#C8C8C4", letterSpacing: ".1em", fontFamily: FONT }}>EMPTY</span>
            </div>
          : previews.map((item, i) => (
            <div key={i} style={{ background: "#EAEAE8", overflow: "hidden" }}>
              {item.artwork.image_url
                ? <img src={item.artwork.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
                : <div style={{ width: "100%", height: "100%", background: "#EAEAE8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, color: "#C0C0BC", fontFamily: FONT_HEAD }}>
                      {item.artwork.artist_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
              }
            </div>
          ))
        }
      </div>
      {/* Info */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#0D0D0D", margin: "0 0 4px", fontFamily: FONT_HEAD }}>{col.name}</p>
        <p style={{ fontSize: 11, color: "#AAAAAA", margin: "0 0 2px", fontFamily: FONT }}>{col.items.length} works</p>
        <p style={{ fontSize: 10, color: "#C8C8C8", margin: 0, fontFamily: FONT }}>Updated {timeAgo(col.updated_at)}</p>
      </div>
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M5 2L10 7L5 12" stroke="#CCCCCC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* ── Collection detail ───────────────────────────────────────────── */
function CollectionDetail({ col, onBack }: { col: Collection; onBack: () => void }) {
  const { dispatch } = useMyActivity();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(col.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== col.name) {
      dispatch({ type: "RENAME_COLLECTION", collection_id: col.collection_id, name: newName.trim() });
    }
    setRenaming(false);
  };

  const handleDelete = () => {
    dispatch({ type: "DELETE_COLLECTION", collection_id: col.collection_id });
    onBack();
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Back */}
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#888", fontFamily: FONT, padding: "0 0 20px" }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12" stroke="#888" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Collections
      </button>

      {/* Header */}
      {renaming ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setRenaming(false); setNewName(col.name); } }}
            style={{ flex: 1, border: "0.5px solid #D8D8D8", borderRadius: 8, padding: "8px 12px", fontSize: 18, fontFamily: FONT_HEAD, fontWeight: 700, outline: "none", color: "#0D0D0D" }} />
          <button onClick={handleRename} style={{ padding: "8px 16px", background: "#0D0D0D", color: "#FFF", border: "none", borderRadius: 8, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>Save</button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0D0D0D", margin: 0, fontFamily: FONT_HEAD }}>{col.name}</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setRenaming(true); setNewName(col.name); }} style={{ background: "none", border: "0.5px solid #E8E8E8", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#888", fontFamily: FONT, cursor: "pointer" }}>Rename</button>
            <button onClick={() => setConfirmDelete(true)} style={{ background: "none", border: "0.5px solid #F0CECE", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#E04040", fontFamily: FONT, cursor: "pointer" }}>Delete</button>
          </div>
        </div>
      )}
      <p style={{ fontSize: 12, color: "#AAAAAA", margin: "0 0 24px", fontFamily: FONT }}>{col.items.length} works</p>

      {col.items.length === 0
        ? <Empty text="No artworks in this collection yet." />
        : col.items.map(item => (
          <ArtworkMiniCard
            key={item.artwork.artwork_id}
            artwork={item.artwork}
            meta={`Added ${timeAgo(item.added_at)}`}
            onAction={() => dispatch({ type: "REMOVE_FROM_COLLECTION", collection_id: col.collection_id, artwork_id: item.artwork.artwork_id })}
            actionLabel="Remove"
            actionIcon={<TrashIcon />}
          />
        ))
      }

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }} onClick={() => setConfirmDelete(false)}>
          <div style={{ background: "#FFF", borderRadius: 16, padding: "28px 24px", width: "100%", maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#0D0D0D", margin: "0 0 8px", fontFamily: FONT_HEAD }}>Delete "{col.name}"?</p>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 24px", lineHeight: 1.6, fontFamily: FONT }}>This collection and all its items will be permanently deleted.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, padding: "12px 0", background: "none", border: "0.5px solid #E8E8E8", borderRadius: 8, fontSize: 13, fontFamily: FONT, cursor: "pointer", color: "#888" }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: "12px 0", background: "#E04040", border: "none", borderRadius: 8, fontSize: 13, fontFamily: FONT, cursor: "pointer", color: "#FFF", fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Collections tab ─────────────────────────────────────────────── */
function CollectionsTab() {
  const { state, createCollection } = useMyActivity();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const activeCol = detailId ? state.collections.find(c => c.collection_id === detailId) : null;

  if (activeCol) {
    return <CollectionDetail col={activeCol} onBack={() => setDetailId(null)} />;
  }

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createCollection(name);
    setNewName("");
    setCreating(false);
  };

  return (
    <>
      {state.collections.map(c => (
        <CollectionCard key={c.collection_id} col={c} onClick={() => setDetailId(c.collection_id)} />
      ))}
      {state.collections.length === 0 && !creating && (
        <Empty text="Create your first collection." />
      )}
      {creating ? (
        <div style={{ paddingTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
            placeholder="Collection name"
            style={{ flex: 1, border: "0.5px solid #D8D8D8", borderRadius: 8, padding: "11px 14px", fontSize: 13, fontFamily: FONT, outline: "none", color: "#0D0D0D" }} />
          <button onClick={handleCreate} disabled={!newName.trim()} style={{ padding: "11px 18px", background: newName.trim() ? "#0D0D0D" : "#E8E8E8", color: newName.trim() ? "#FFF" : "#AAAAAA", border: "none", borderRadius: 8, fontSize: 13, fontFamily: FONT, cursor: newName.trim() ? "pointer" : "default" }}>
            Create
          </button>
        </div>
      ) : (
        <button onClick={() => setCreating(true)} style={{ width: "100%", padding: "14px 0", background: "none", border: "0.5px dashed #D8D8D8", borderRadius: 8, fontSize: 13, color: "#555", fontFamily: FONT, cursor: "pointer", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="#888" strokeWidth="1.8" strokeLinecap="round" /></svg>
          New Collection
        </button>
      )}
    </>
  );
}

/* ── Recently viewed tab ─────────────────────────────────────────── */
function RecentlyViewedTab() {
  const { state } = useMyActivity();
  if (state.recentlyViewed.length === 0) return <Empty text="No recently viewed artworks." />;
  return (
    <>
      {state.recentlyViewed.map(r => (
        <ArtworkMiniCard
          key={r.artwork.artwork_id}
          artwork={r.artwork}
          meta={timeAgo(r.viewed_at)}
        />
      ))}
    </>
  );
}

/* ── Tab bar ─────────────────────────────────────────────────────── */
function TabBar({ active, onSelect, counts }: { active: MyTab; onSelect: (t: MyTab) => void; counts: Record<MyTab, number> }) {
  const { t } = useLanguage();
  const tabs: { id: MyTab; label: string }[] = [
    { id: "likes",       label: t("my.tab_likes")       },
    { id: "saved",       label: t("my.tab_saved")       },
    { id: "collections", label: t("my.tab_collections") },
    { id: "recent",      label: t("my.tab_recent")      },
  ];
  return (
    <div style={{ display: "flex", borderBottom: "0.5px solid #EBEBEB", marginBottom: 4 }}>
      {tabs.map(tb => (
        <button key={tb.id} onClick={() => onSelect(tb.id)} style={{
          flex: 1, padding: "10px 4px", background: "none", border: "none", cursor: "pointer",
          borderBottom: active === tb.id ? "1.5px solid #0D0D0D" : "1.5px solid transparent",
          fontFamily: FONT, fontSize: 11, fontWeight: active === tb.id ? 700 : 400,
          color: active === tb.id ? "#0D0D0D" : "#AAAAAA", letterSpacing: ".04em",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        }}>
          {tb.label}
          {counts[tb.id] > 0 && (
            <span style={{ fontSize: 9, color: active === tb.id ? "#0D0D0D" : "#C8C8C8", fontFamily: FONT }}>
              {counts[tb.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── Summary counts row ──────────────────────────────────────────── */
function SummaryRow({ counts }: { counts: Record<MyTab, number> }) {
  const { t } = useLanguage();
  const cells: { id: MyTab; label: string }[] = [
    { id: "likes",       label: t("my.tab_likes")       },
    { id: "saved",       label: t("my.tab_saved")       },
    { id: "collections", label: t("my.tab_collections") },
    { id: "recent",      label: t("my.tab_recent")      },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
      borderTop: "0.5px solid #E7E2D8", borderBottom: "0.5px solid #E7E2D8",
    }}>
      {cells.map((c, i) => (
        <div
          key={c.id}
          style={{
            borderRight: i < cells.length - 1 ? "0.5px solid #E7E2D8" : "none",
            padding: "16px 8px",
            textAlign: "center" as const,
            fontFamily: FONT,
          }}
        >
          <p style={{
            fontSize: 22, fontWeight: 700, color: "#1C1A17",
            fontFamily: FONT_HEAD, letterSpacing: "-.02em",
            margin: "0 0 4px", lineHeight: 1, fontVariantNumeric: "tabular-nums",
          }}>
            {counts[c.id]}
          </p>
          <p style={{
            fontSize: 9.5, color: "#8A6A3F", letterSpacing: ".12em",
            textTransform: "uppercase" as const, margin: 0,
            fontWeight: 600,
          }}>
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Main My Page ────────────────────────────────────────────────── */
function MyPage() {
  const { state } = useMyActivity();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<MyTab>("likes");

  const counts: Record<MyTab, number> = {
    likes: state.likes.length,
    saved: state.saved.length,
    collections: state.collections.length,
    recent: state.recentlyViewed.length,
  };

  return (
    <>
      <div style={{ background: "#FFFFFF", minHeight: "100vh", maxWidth: 640, margin: "0 auto", fontFamily: FONT, paddingBottom: 110 }}>
        {/* Header */}
        <div style={{ padding: "52px 22px 22px" }}>
          <a
            href="/"
            style={{
              display: "inline-block",
              fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
              textTransform: "uppercase" as const, margin: "0 0 12px",
              textDecoration: "none", fontFamily: FONT,
            }}
          >
            {t("common.app_name")}
          </a>
          <h1 style={{
            fontSize: 30, fontWeight: 700, margin: "0 0 6px",
            fontFamily: FONT_HEAD, letterSpacing: "-.03em", color: "#0D0D0D",
            lineHeight: 1.05,
          }}>
            {t("my.title")}
          </h1>
          <p style={{ fontSize: 13, color: "#6F6F6F", margin: 0, letterSpacing: ".005em" }}>
            {t("my.tagline")}
          </p>
        </div>

        {/* Summary */}
        <SummaryRow counts={counts} />

        <div style={{ padding: "0 22px" }}>
          <div style={{ paddingTop: 18 }}>
            <TabBar active={activeTab} onSelect={setActiveTab} counts={counts} />
          </div>

          <div style={{ paddingTop: 8 }}>
            {activeTab === "likes"       && <LikesTab />}
            {activeTab === "saved"       && <SavedTab />}
            {activeTab === "collections" && <CollectionsTab />}
            {activeTab === "recent"      && <RecentlyViewedTab />}
          </div>
        </div>
      </div>

      <BottomNav currentTab="my" />
    </>
  );
}

export { MyPage as MyPageContent };
export default MyPage;
