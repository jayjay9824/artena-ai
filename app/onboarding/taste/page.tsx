"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMyActivity, SavedArtwork } from "../../context/MyActivityContext";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

/* ── Curated seed deck ──────────────────────────────────────────────
 * Mix of museum-canonical, Korean modernism, blue-chip contemporary,
 * and emerging — wide enough that a user's Like pattern produces a
 * real signal in /taste afterwards.
 */
interface SeedCard {
  id:     string;       // becomes artwork_id
  artist: string;
  title:  string;
  year:   string;
  medium: string;
  /** Single-word taste tag — surfaces in the Taste Profile clusters. */
  cluster: string;
}

const SEEDS: SeedCard[] = [
  { id: "ob-rothko-no14",     artist: "Mark Rothko",      title: "No. 14, 1960",          year: "1960", medium: "Oil on canvas",       cluster: "Color-driven Abstraction" },
  { id: "ob-leeufan-point",   artist: "Lee Ufan",         title: "From Point",            year: "1976", medium: "Oil on canvas",       cluster: "Quiet Minimalism" },
  { id: "ob-park-ecriture",   artist: "Park Seo-Bo",      title: "Ecriture No. 080723",   year: "2008", medium: "Mixed media",         cluster: "Quiet Minimalism" },
  { id: "ob-kusama-nets",     artist: "Yayoi Kusama",     title: "Infinity Nets — Yellow",year: "1998", medium: "Acrylic on canvas",   cluster: "Pattern & Repetition" },
  { id: "ob-monet-water",     artist: "Claude Monet",     title: "Water Lilies",          year: "1908", medium: "Oil on canvas",       cluster: "Atmospheric Impressionism" },
  { id: "ob-whanki-universe", artist: "Kim Whanki",       title: "Universe 5-IV-71 #200", year: "1971", medium: "Oil on cotton",       cluster: "Korean Modernism" },
  { id: "ob-richter-abstr",   artist: "Gerhard Richter",  title: "Abstraktes Bild",       year: "1992", medium: "Oil on canvas",       cluster: "Gestural Abstraction" },
  { id: "ob-kapoor-cloud",    artist: "Anish Kapoor",     title: "Cloud Gate Maquette",   year: "2018", medium: "Stainless steel",     cluster: "Material Reflection" },
];

interface CardState { liked: boolean; skipped: boolean; }

export default function OnboardingTastePage() {
  const router = useRouter();
  const { state, dispatch } = useMyActivity();

  // We seed the local "decisions" map; final commit happens on Finish.
  const [decisions, setDecisions] = useState<Record<string, CardState>>({});
  const [index, setIndex] = useState(0);

  const total = SEEDS.length;
  const liked = useMemo(
    () => SEEDS.filter(s => decisions[s.id]?.liked),
    [decisions],
  );

  const setDecision = (id: string, kind: "liked" | "skipped") => {
    setDecisions(d => ({ ...d, [id]: { liked: kind === "liked", skipped: kind === "skipped" } }));
    setIndex(i => Math.min(i + 1, total));
  };

  const finish = () => {
    // Commit liked seeds to MyActivity.likes — guest profile, no login.
    // dedupe via the reducer's existing artwork_id check.
    for (const seed of liked) {
      const artwork: SavedArtwork = {
        artwork_id:  seed.id,
        image_url:   null,
        artist_name: seed.artist,
        title:       seed.title,
        year:        seed.year,
        medium:      seed.medium,
        gallery_name: "",
        source: "analysis",
        status: "not_listed",
      };
      // Skip if already liked.
      if (!state.likes.some(a => a.artwork_id === seed.id)) {
        dispatch({ type: "LIKE", artwork });
      }
    }
    router.push("/taste");
  };

  const allDone = index >= total;
  const current = SEEDS[index] ?? null;
  const progress = Math.min(100, Math.round((index / total) * 100));

  return (
    <div style={{
      minHeight: "calc(var(--vh, 1vh) * 100)",
      background: "#F8F7F4",
      padding: "60px 22px 88px",
      maxWidth: 480, margin: "0 auto",
      fontFamily: FONT,
      display: "flex", flexDirection: "column",
    }}>
      {/* Brand */}
      <a
        href="/"
        style={{
          display: "inline-block",
          fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
          textTransform: "uppercase" as const, marginBottom: 18,
          textDecoration: "none",
        }}
      >
        AXVELA AI
      </a>

      {/* Title */}
      <h1 style={{
        fontSize: 28, fontWeight: 700, color: "#111111",
        margin: "0 0 8px",
        fontFamily: FONT_HEAD, letterSpacing: "-.025em", lineHeight: 1.1,
      }}>
        Start shaping your taste
      </h1>
      <p style={{ fontSize: 13, color: "#6F6F6F", lineHeight: 1.6, margin: "0 0 22px" }}>
        Choose the works you feel drawn to.
      </p>

      {/* Progress */}
      <div style={{
        height: 2, background: "#E7E2D8",
        borderRadius: 1, marginBottom: 18, overflow: "hidden",
      }}>
        <div style={{
          width: `${progress}%`, height: "100%",
          background: "#8A6A3F",
          transition: "width .25s ease",
        }} />
      </div>
      <p style={{ fontSize: 10, color: "#9A9A9A", letterSpacing: ".1em", margin: "0 0 22px" }}>
        {Math.min(index, total)} / {total} · {liked.length} liked
      </p>

      {/* Card stack */}
      {!allDone && current && (
        <div style={{
          background: "#FFFFFF",
          border: "0.5px solid #E7E2D8",
          borderRadius: 18,
          padding: "22px 22px 24px",
          marginBottom: 18,
          flex: 1,
          display: "flex", flexDirection: "column",
        }}>
          {/* Visual placeholder — premium block instead of fake image */}
          <div style={{
            aspectRatio: "4 / 5",
            background: "linear-gradient(160deg, #F4EFE5, #F8F4EB 60%, #F1ECE0)",
            borderRadius: 12,
            marginBottom: 18,
            display: "flex", alignItems: "flex-end", justifyContent: "flex-start",
            padding: 16,
          }}>
            <span style={{
              fontSize: 9, color: "#8A6A3F", letterSpacing: ".18em",
              textTransform: "uppercase" as const,
              fontWeight: 600,
            }}>
              {current.cluster}
            </span>
          </div>

          <p style={{
            fontSize: 18, fontWeight: 700, color: "#111111",
            margin: "0 0 4px",
            fontFamily: FONT_HEAD, letterSpacing: "-.01em",
          }}>
            {current.artist}
          </p>
          <p style={{ fontSize: 13, color: "#6F6F6F", margin: "0 0 4px", fontStyle: "italic" }}>
            {current.title}, {current.year}
          </p>
          <p style={{ fontSize: 11, color: "#9A9A9A", margin: 0 }}>
            {current.medium}
          </p>
        </div>
      )}

      {/* Done state */}
      {allDone && (
        <div style={{
          background: "#FFFFFF",
          border: "0.5px solid #E7E2D8",
          borderRadius: 18,
          padding: "32px 22px",
          marginBottom: 18,
          flex: 1,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center" as const,
        }}>
          <p style={{
            fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
            textTransform: "uppercase" as const, marginBottom: 14, fontWeight: 600,
          }}>
            Profile Ready
          </p>
          <h2 style={{
            fontSize: 22, fontWeight: 700, color: "#111111",
            margin: "0 0 10px",
            fontFamily: FONT_HEAD, letterSpacing: "-.02em",
          }}>
            {liked.length} works will shape your profile
          </h2>
          <p style={{ fontSize: 13, color: "#6F6F6F", lineHeight: 1.6, margin: 0 }}>
            Tap Finish to see your Taste Profile.
          </p>
        </div>
      )}

      {/* Actions */}
      {!allDone && current && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setDecision(current.id, "skipped")}
            style={{
              flex: 1, padding: "14px 0",
              background: "#FFFFFF",
              border: "0.5px solid #E7E2D8",
              borderRadius: 12, cursor: "pointer",
              fontSize: 13, fontWeight: 600, color: "#6F6F6F",
              letterSpacing: ".04em",
              fontFamily: FONT,
            }}
          >
            Skip
          </button>
          <button
            onClick={() => setDecision(current.id, "liked")}
            style={{
              flex: 2, padding: "14px 0",
              background: "#111111", color: "#FFFFFF",
              border: "none", borderRadius: 12, cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              letterSpacing: ".06em",
              fontFamily: FONT,
            }}
          >
            Like
          </button>
        </div>
      )}

      {allDone && (
        <button
          onClick={finish}
          style={{
            width: "100%", padding: "15px 0",
            background: "#8A6A3F", color: "#FFFFFF",
            border: "none", borderRadius: 12, cursor: "pointer",
            fontSize: 14, fontWeight: 700,
            letterSpacing: ".06em",
            fontFamily: FONT,
            boxShadow: "0 3px 14px rgba(138,106,63,0.32)",
          }}
        >
          Finish
        </button>
      )}

      {/* Skip-all escape hatch — never lock the user in */}
      {!allDone && (
        <button
          onClick={() => router.push("/taste")}
          style={{
            display: "block",
            margin: "16px auto 0",
            background: "transparent", border: "none",
            color: "#9A9A9A", fontSize: 11,
            letterSpacing: ".06em",
            cursor: "pointer", fontFamily: FONT,
          }}
        >
          Skip and explore later
        </button>
      )}
    </div>
  );
}
