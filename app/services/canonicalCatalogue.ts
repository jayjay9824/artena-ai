/**
 * canonicalCatalogue — seed data for the canonical Artwork registry.
 *
 * Real Gallery Console / AXID registry will populate this table over
 * time. V1 ships with hand-seeded records sized to demonstrate that
 * the matching pipeline converges identically across image, text,
 * and QR inputs (STEP 2 acceptance: same artwork → same artworkId).
 *
 * The matching service reads from getCanonicalCatalogue(); swapping
 * to a backend query is one function later.
 */

import type { Artist, Artwork } from "../lib/types";

const SEED_GALLERY_ID = "demo-gallery";

/* ── Artists ───────────────────────────────────────────────────── */

export const SEED_ARTISTS: Artist[] = [
  { id: "artist-whanki",    name: "Kim Whanki",    aliases: ["김환기", "Kim Hwan-gi", "Whanki Kim"] },
  { id: "artist-leeufan",   name: "Lee Ufan",      aliases: ["이우환", "Lee U-fan"] },
  { id: "artist-parkseobo", name: "Park Seo-Bo",   aliases: ["박서보", "Park Seobo"] },
  { id: "artist-kusama",    name: "Yayoi Kusama",  aliases: ["쿠사마 야요이", "Kusama Yayoi"] },
  { id: "artist-rothko",    name: "Mark Rothko",   aliases: ["로스코"] },
  { id: "artist-richter",   name: "Gerhard Richter", aliases: ["게르하르트 리히터"] },
];

/* ── Artworks ──────────────────────────────────────────────────── */

export const SEED_ARTWORKS: Artwork[] = [
  // Kim Whanki — STEP 2 spec example. All three input forms
  // ("김환기 귀로", "Kim Whanki Gwi-ro", "Whanki Kim 귀로") must
  // resolve to this single artworkId.
  {
    id:                 "kw-gwi-ro",
    axid:               "AX-KW-1950-001",
    galleryId:          SEED_GALLERY_ID,
    artistId:           "artist-whanki",
    artistName:         "Kim Whanki",
    artistNameKo:       "김환기",
    title:              "Returning Home",
    titleKo:            "귀로",
    aliases:            ["Gwi-ro", "Gwiro", "Returning Home (귀로)"],
    year:               "1950",
    period:             "Early period",
    medium:             "Oil on canvas",
    dimensions:         "70 × 100 cm",
    primaryImageUrl:    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Kim_Whanki_-_Universe_5-IV-71_%23200.jpg/640px-Kim_Whanki_-_Universe_5-IV-71_%23200.jpg",
    imageHash:          "f3a91c0e4b8d2f57",      // illustrative pHash hex
    source:             "axid_registry",
    trustLevel:         "axid_verified",
    artenaInsight:      "Whanki's pre-abstraction figuration: home, soil, and the village street as a quiet ledger of time.",
    shortSummary:       "Pre-abstraction Whanki, returning to the village street as a meditation on departure.",
    marketPosition:     "Blue-chip",
    marketConfidence:   88,
    dataDepth:          "deep",
    comparableMatches:  9,
    marketStability:    "high",
    priceVisibility:    "on_request",
    availabilityStatus: "available",
    publicShareSlug:    "kim-whanki-gwi-ro",
  },

  {
    id:                 "kw-universe",
    axid:               "AX-KW-1971-200",
    galleryId:          SEED_GALLERY_ID,
    artistId:           "artist-whanki",
    artistName:         "Kim Whanki",
    artistNameKo:       "김환기",
    title:              "Universe",
    titleKo:            "우주",
    aliases:            ["Universe 5-IV-71 #200", "5-IV-71 #200"],
    year:               "1971",
    period:             "New York period",
    medium:             "Oil on cotton",
    dimensions:         "254 × 254 cm",
    imageHash:          "9b1c44ff77e0d2a3",
    source:             "axid_registry",
    trustLevel:         "axid_verified",
    artenaInsight:      "Whanki's late dot-painting cosmos — discipline becomes infinite. The 2019 Christie's HK record holder.",
    shortSummary:       "The dot-painting cosmos that anchors Korean modernism's market.",
    marketPosition:     "Blue-chip",
    marketConfidence:   94,
    dataDepth:          "deep",
    comparableMatches:  12,
    marketStability:    "high",
    priceVisibility:    "on_request",
    availabilityStatus: "not_for_sale",
    publicShareSlug:    "kim-whanki-universe-1971",
  },

  {
    id:                 "lu-from-point",
    axid:               "AX-LU-1976-014",
    galleryId:          SEED_GALLERY_ID,
    artistId:           "artist-leeufan",
    artistName:         "Lee Ufan",
    artistNameKo:       "이우환",
    title:              "From Point",
    titleKo:            "점으로부터",
    aliases:            ["From-Point", "점", "Lee Ufan From Point"],
    year:               "1976",
    period:             "From Point series",
    medium:             "Oil and mineral pigment on canvas",
    dimensions:         "182 × 227 cm",
    imageHash:          "2d8fa1e6c7b54309",
    source:             "axid_registry",
    trustLevel:         "axid_verified",
    artenaInsight:      "The disciplined fade of pigment — Mono-ha's ethics of restraint translated to the canvas.",
    shortSummary:       "Mono-ha translated to the canvas: pigment as quiet exhaustion.",
    marketPosition:     "Blue-chip",
    marketConfidence:   86,
    dataDepth:          "deep",
    comparableMatches:  11,
    marketStability:    "high",
    priceVisibility:    "on_request",
    availabilityStatus: "available",
    publicShareSlug:    "lee-ufan-from-point-1976",
  },

  {
    id:                 "ps-ecriture",
    axid:               "AX-PS-2008-072",
    galleryId:          SEED_GALLERY_ID,
    artistId:           "artist-parkseobo",
    artistName:         "Park Seo-Bo",
    artistNameKo:       "박서보",
    title:              "Ecriture No. 080723",
    titleKo:            "묘법 No. 080723",
    aliases:            ["Écriture", "묘법", "Park Seobo Ecriture", "Myobop"],
    year:               "2008",
    period:             "Late Ecriture",
    medium:             "Mixed media with hanji on canvas",
    dimensions:         "200 × 300 cm",
    imageHash:          "5e0d3a8b6f12e478",
    source:             "axid_registry",
    trustLevel:         "axid_verified",
    artenaInsight:      "Hanji-laid Ecriture — Dansaekhwa's most legible ledger of time and pressure.",
    shortSummary:       "Late Ecriture: hanji + pencil ridges as the diary of Dansaekhwa.",
    marketPosition:     "Blue-chip",
    marketConfidence:   84,
    dataDepth:          "deep",
    comparableMatches:  10,
    marketStability:    "moderate",
    priceVisibility:    "public",
    availabilityStatus: "available",
    publicShareSlug:    "park-seo-bo-ecriture-080723",
  },

  {
    id:                 "yk-infinity-nets-yellow",
    axid:               "AX-YK-1998-INF",
    galleryId:          SEED_GALLERY_ID,
    artistId:           "artist-kusama",
    artistName:         "Yayoi Kusama",
    artistNameKo:       "쿠사마 야요이",
    title:              "Infinity Nets — Yellow",
    titleKo:            "무한의 그물 — 노랑",
    aliases:            ["Infinity Nets Yellow", "무한의 그물", "Kusama Infinity Nets"],
    year:               "1998",
    period:             "Mature Infinity Nets",
    medium:             "Acrylic on canvas",
    dimensions:         "162 × 130 cm",
    imageHash:          "ac2bef013778d491",
    source:             "axid_registry",
    trustLevel:         "axid_verified",
    artenaInsight:      "Late-90s Nets — obsessive lattice as both meditation and market signal.",
    shortSummary:       "Late-90s Nets as obsessive lattice; a market ladder for Kusama collectors.",
    marketPosition:     "Blue-chip",
    marketConfidence:   90,
    dataDepth:          "deep",
    comparableMatches:  14,
    marketStability:    "high",
    priceVisibility:    "public",
    availabilityStatus: "sold",
    publicShareSlug:    "yayoi-kusama-infinity-nets-yellow",
  },

  {
    id:                 "mr-no14-1960",
    axid:               "AX-MR-1960-014",
    galleryId:          SEED_GALLERY_ID,
    artistId:           "artist-rothko",
    artistName:         "Mark Rothko",
    artistNameKo:       "마크 로스코",
    title:              "No. 14, 1960",
    titleKo:            "No. 14, 1960",
    aliases:            ["Rothko No. 14", "Number 14"],
    year:               "1960",
    period:             "Late color-field",
    medium:             "Oil on canvas",
    dimensions:         "291 × 268 cm",
    imageHash:          "11d4e2c80b9f5e26",
    source:             "axid_registry",
    trustLevel:         "axid_verified",
    artenaInsight:      "The threshold canvas — Rothko's late palette, where color becomes the room.",
    shortSummary:       "Late color-field threshold; the painting that turns into the room.",
    marketPosition:     "Blue-chip",
    marketConfidence:   95,
    dataDepth:          "deep",
    comparableMatches:  16,
    marketStability:    "high",
    priceVisibility:    "private",
    availabilityStatus: "not_for_sale",
    publicShareSlug:    "mark-rothko-no-14-1960",
  },
];

/* ── Public accessors (matching service consumes these) ────────── */

export interface CatalogueSnapshot {
  artworks: Artwork[];
  artists:  Artist[];
}

let catalogueOverride: CatalogueSnapshot | null = null;

export function getCanonicalCatalogue(): CatalogueSnapshot {
  if (catalogueOverride) return catalogueOverride;
  return { artworks: SEED_ARTWORKS, artists: SEED_ARTISTS };
}

/** Test-only: replace the catalogue at runtime. */
export function setCanonicalCatalogue(snapshot: CatalogueSnapshot | null): void {
  catalogueOverride = snapshot;
}

/** Lookup by exact artworkId — used by analyze flow when wiring canonical results. */
export function findArtworkById(id: string): Artwork | null {
  const cat = getCanonicalCatalogue();
  return cat.artworks.find(a => a.id === id) ?? null;
}
