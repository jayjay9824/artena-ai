/**
 * Seeded mock data for the Gallery Console MVP.
 *
 * Single source of truth for the demo artworks, users, and interactions.
 * Produced once at module load so a console refresh stays consistent.
 *
 * When real Gallery Console data lands, swap the consumer-facing
 * services to read from the API instead of importing from this file.
 */

import type {
  Artwork, Artist, Gallery,
  UserArtworkInteraction, InteractionType,
  GalleryId,
} from "../../lib/types";

const GALLERY_ID: GalleryId = "demo-gallery";

/* ── Seeded RNG so the mock looks the same each refresh ────────── */

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260427);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (lo: number, hi: number) => Math.floor(rand() * (hi - lo + 1)) + lo;

/* ── Gallery + Artists ─────────────────────────────────────────── */

export const MOCK_GALLERY: Gallery = {
  id:   GALLERY_ID,
  name: "AXVELA Demo Gallery",
};

export const MOCK_ARTISTS: Artist[] = [
  { id: "artist-1",  name: "Lee Ufan",         aliases: ["이우환"]              },
  { id: "artist-2",  name: "Park Seo-Bo",      aliases: ["박서보"]              },
  { id: "artist-3",  name: "Yayoi Kusama",     aliases: ["쿠사마 야요이"]        },
  { id: "artist-4",  name: "Anish Kapoor",     aliases: ["아니쉬 카푸어"]        },
  { id: "artist-5",  name: "Simon Fujiwara",   aliases: []                       },
  { id: "artist-6",  name: "Kim Whanki",       aliases: ["김환기"]              },
  { id: "artist-7",  name: "Cecily Brown",     aliases: []                       },
  { id: "artist-8",  name: "Xinmin Liu",       aliases: ["류신민"]              },
];

/* ── Artworks ──────────────────────────────────────────────────── */

interface SeedArtwork {
  title:    string;
  year:     string;
  medium:   string;
  artistId: string;
  imageUrl?: string;
  availability: Artwork["availabilityStatus"];
  priceVisibility: Artwork["priceVisibility"];
}

const SEEDS: SeedArtwork[] = [
  { title: "From Point",                year: "1976", medium: "Oil on canvas",         artistId: "artist-1", availability: "available",   priceVisibility: "on_request" },
  { title: "Relatum — Silence",         year: "2014", medium: "Stone, steel",          artistId: "artist-1", availability: "reserved",    priceVisibility: "on_request" },
  { title: "Ecriture No. 080723",       year: "2008", medium: "Mixed media on canvas", artistId: "artist-2", availability: "available",   priceVisibility: "public"     },
  { title: "Infinity Nets — Yellow",    year: "1998", medium: "Acrylic on canvas",     artistId: "artist-3", availability: "sold",        priceVisibility: "public"     },
  { title: "Pumpkin (Polka)",           year: "2002", medium: "Bronze, lacquer",       artistId: "artist-3", availability: "available",   priceVisibility: "on_request" },
  { title: "Cloud Gate Maquette",       year: "2018", medium: "Stainless steel",       artistId: "artist-4", availability: "available",   priceVisibility: "private"    },
  { title: "Who's Iconic? (Spanish)",   year: "2022", medium: "Mixed media",           artistId: "artist-5", availability: "available",   priceVisibility: "on_request" },
  { title: "Universe 5-IV-71 #200",     year: "1971", medium: "Oil on cotton",         artistId: "artist-6", availability: "available",   priceVisibility: "on_request" },
  { title: "Untitled (Mountain & Sea)", year: "1969", medium: "Oil on canvas",         artistId: "artist-6", availability: "reserved",    priceVisibility: "on_request" },
  { title: "Carnival Streamers",        year: "2023", medium: "Oil on linen",          artistId: "artist-7", availability: "available",   priceVisibility: "public"     },
  { title: "Grass Paths Forever",       year: "2024", medium: "Ink on rice paper",     artistId: "artist-8", availability: "available",   priceVisibility: "on_request" },
  { title: "Letters from Wuhan #4",     year: "2021", medium: "Photograph, archival",  artistId: "artist-8", availability: "sold",        priceVisibility: "public"     },
];

export const MOCK_ARTWORKS: Artwork[] = SEEDS.map((s, i) => ({
  id:                 `aw-${(i + 1).toString().padStart(3, "0")}`,
  galleryId:          GALLERY_ID,
  artistId:           s.artistId,
  title:              s.title,
  year:               s.year,
  medium:             s.medium,
  imageUrl:           s.imageUrl,
  priceVisibility:    s.priceVisibility,
  availabilityStatus: s.availability,
  publicShareSlug:    `${s.artistId.replace("artist-", "a")}-${i + 1}`,
}));

/* ── Anonymous users ───────────────────────────────────────────── */

export const MOCK_USER_IDS: string[] = Array.from({ length: 18 }, (_, i) =>
  `u_${String(0xA100 + i).toUpperCase()}`,
);

/* ── Interactions ──────────────────────────────────────────────── */

const INTERACTION_WEIGHTS: { type: InteractionType; weight: number }[] = [
  { type: "viewed",              weight: 60 },
  { type: "liked",               weight: 14 },
  { type: "saved",               weight: 9  },
  { type: "asked_ai",            weight: 8  },
  { type: "shared",              weight: 4  },
  { type: "added_to_collection", weight: 3  },
  { type: "price_question",      weight: 2  },
];
const TOTAL_WEIGHT = INTERACTION_WEIGHTS.reduce((s, w) => s + w.weight, 0);

function pickInteractionType(): InteractionType {
  let r = rand() * TOTAL_WEIGHT;
  for (const w of INTERACTION_WEIGHTS) {
    if (r < w.weight) return w.type;
    r -= w.weight;
  }
  return "viewed";
}

const NOW = Date.now();
const HOUR = 3600 * 1000;

function randomTimestamp(): string {
  // Skewed toward recent — most interactions in the last 7 days, some
  // older for the 30-day filter.
  const ageHours = Math.floor(Math.pow(rand(), 2.4) * 24 * 30);
  return new Date(NOW - ageHours * HOUR).toISOString();
}

export const MOCK_INTERACTIONS: UserArtworkInteraction[] = (() => {
  const list: UserArtworkInteraction[] = [];
  // Boost a couple of "hot" artworks so the dashboard has obvious leaders.
  const HOT_ARTWORK_IDS = new Set([MOCK_ARTWORKS[2].id, MOCK_ARTWORKS[6].id, MOCK_ARTWORKS[9].id]);

  for (const artwork of MOCK_ARTWORKS) {
    const baseCount = HOT_ARTWORK_IDS.has(artwork.id) ? between(38, 56) : between(8, 26);
    for (let i = 0; i < baseCount; i++) {
      const type = pickInteractionType();
      list.push({
        id:        `mi-${list.length}`,
        userId:    pick(MOCK_USER_IDS),
        artworkId: artwork.id,
        galleryId: artwork.galleryId,
        interactionType: type,
        meta:      type === "asked_ai" ? { intent: rand() < 0.18 ? "price" : "general" } : undefined,
        createdAt: randomTimestamp(),
      });
    }
  }
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
})();
