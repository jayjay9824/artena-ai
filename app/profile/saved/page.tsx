"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSavedArtworks,
  type SavedArtwork,
} from "../../utils/savedArtworks";

const FONT      = "'KakaoSmallSans', -apple-system, BlinkMacSystemFont, sans-serif";
const FONT_HEAD = "'KakaoBigSans', -apple-system, BlinkMacSystemFont, sans-serif";

/**
 * Saved artworks list — opened from the Profile saved-count card.
 *
 * Reads exclusively from utils/savedArtworks (single source of
 * truth, localStorage["axvela:savedArtworks"]). The util takes
 * care of legacy collection_v1 → new key migration on first read,
 * so users with previously saved analyses still see them here.
 *
 * Refresh strategy: re-reads the store on focus and on
 * visibilitychange, so saving an artwork on another surface and
 * tab-switching back in here surfaces the new item without a
 * manual reload.
 *
 * Click on a card → /analyze?artworkId={id}. The analyze page
 * already honours that deep-link to restore the Quick Report; the
 * spec's "/artwork/{id}" wording maps to this existing route.
 */

export default function SavedArtworksPage() {
  const router = useRouter();
  const [saved,    setSaved]    = useState<SavedArtwork[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    const items = getSavedArtworks().slice().sort(
      (a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""),
    );
    setSaved(items);
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);

    const onFocus      = () => refresh();
    const onVisChange  = () => { if (!document.hidden) refresh(); };
    const onStorage    = (e: StorageEvent) => {
      // axvela:savedArtworks may be mutated from another tab; pick it up.
      if (!e.key || e.key === "axvela:savedArtworks") refresh();
    };

    window.addEventListener("focus",            onFocus);
    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("storage",           onStorage);
    return () => {
      window.removeEventListener("focus",            onFocus);
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("storage",           onStorage);
    };
  }, [refresh]);

  const isReady = hydrated;
  const isEmpty = isReady && saved.length === 0;

  return (
    <div style={{
      minHeight:   "100dvh",
      background:  "#FFFFFF",
      maxWidth:    640,
      margin:      "0 auto",
      fontFamily:  FONT,
      paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
      boxSizing:   "border-box" as const,
    }}>
      {/* Header — back button + title. */}
      <header style={{
        display:        "flex",
        alignItems:     "center",
        gap:            8,
        padding:        "calc(env(safe-area-inset-top, 0px) + 18px) 16px 14px",
        position:       "sticky" as const,
        top:            0,
        background:     "#FFFFFF",
        zIndex:         10,
      }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          style={{
            width:           40,
            height:          40,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            background:      "transparent",
            border:          "none",
            cursor:          "pointer",
            color:           "#0D0D0D",
            padding:         0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
            <path d="M14 4l-7 7 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 style={{
          margin:        0,
          fontSize:      18,
          fontWeight:    700,
          color:         "#0D0D0D",
          fontFamily:    FONT_HEAD,
          letterSpacing: "-0.01em",
        }}>
          저장한 작품
        </h1>
      </header>

      {/* Body — pre-hydration: blank; empty: empty state; otherwise grid. */}
      {!isReady && (
        <div aria-hidden style={{ height: 240 }} />
      )}

      {isEmpty && <EmptyState />}

      {isReady && saved.length > 0 && (
        <div style={{
          display:              "grid",
          gridTemplateColumns:  "repeat(2, minmax(0, 1fr))",
          gap:                  14,
          padding:              "10px 16px 24px",
        }}>
          {saved.map(item => (
            <SavedArtworkCard
              key={item.id}
              item={item}
              onOpen={() =>
                router.push(`/analyze?artworkId=${encodeURIComponent(item.id)}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Card ─────────────────────────────────────────────────────── */

function SavedArtworkCard({
  item,
  onOpen,
}: {
  item:   SavedArtwork;
  onOpen: () => void;
}) {
  const hasThumb = item.thumbnailUrl && item.thumbnailUrl.length > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${item.title} ${item.artist} 작품 열기`}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "stretch",
        textAlign:      "left" as const,
        padding:        0,
        background:     "transparent",
        border:         "none",
        cursor:         "pointer",
        fontFamily:     FONT,
        // Tap-safety — globals.css already covers buttons; these
        // are belt-and-suspenders for the card surface.
        userSelect:               "none",
        WebkitUserSelect:         "none",
        WebkitTouchCallout:       "none" as const,
        WebkitTapHighlightColor:  "transparent",
        touchAction:              "manipulation",
      }}
    >
      <div style={{
        aspectRatio:    "1 / 1",
        background:     "#F4F2EC",
        borderRadius:   12,
        overflow:       "hidden",
        marginBottom:   10,
      }}>
        {hasThumb ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            draggable={false}
            style={{
              width:     "100%",
              height:    "100%",
              objectFit: "cover",
              display:   "block",
            }}
          />
        ) : (
          <div style={{
            width:           "100%",
            height:          "100%",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            color:           "#B5AB97",
            fontSize:        11,
            letterSpacing:   "0.18em",
            textTransform:   "uppercase" as const,
          }}>
            No Image
          </div>
        )}
      </div>
      <p style={{
        margin:         "0 4px 2px",
        fontSize:       13.5,
        fontWeight:     600,
        color:          "#0D0D0D",
        lineHeight:     1.35,
        // Clamp to 2 lines so titles don't push the artist line
        // off the card on small screens.
        display:        "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as const,
        overflow:       "hidden",
      }}>
        {item.title}
      </p>
      <p style={{
        margin:    "0 4px",
        fontSize:  11.5,
        color:     "#888888",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        overflow:   "hidden",
        textOverflow: "ellipsis",
      }}>
        {item.artist}
      </p>
    </button>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div style={{
      padding:         "80px 32px",
      display:         "flex",
      flexDirection:   "column",
      alignItems:      "center",
      textAlign:       "center" as const,
      gap:             10,
    }}>
      <div aria-hidden style={{
        width:           60,
        height:          60,
        borderRadius:    "50%",
        background:      "#FAFAF7",
        border:          "0.5px solid #ECEAE2",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        marginBottom:    10,
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M7 4h11l5 5v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="#B5AB97" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M18 4v5h5" stroke="#B5AB97" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 style={{
        margin:     0,
        fontSize:   16,
        fontWeight: 600,
        color:      "#0D0D0D",
        fontFamily: FONT_HEAD,
      }}>
        아직 저장한 작품이 없습니다
      </h2>
      <p style={{
        margin:     "4px 0 0",
        fontSize:   12.5,
        color:      "#9A9A9A",
        lineHeight: 1.6,
      }}>
        SCAN으로 작품을 분석하고 저장해보세요.
      </p>
    </div>
  );
}
