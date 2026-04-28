"use client";
import { useMemo } from "react";
import { TasteProfile, TasteDimension, VisualPattern, SignalStrength } from "../types/taste";
import { useCollection, CollectionItem } from "../../collection/hooks/useCollection";
import { useMyActivity, SavedArtwork } from "../../context/MyActivityContext";

/* ── Demo profile (shown when collection is empty) ────────────── */

const DEMO_PROFILE: TasteProfile = {
  statement: "Your taste is defined by restraint, structure, and quiet intensity.",
  subStatement: "You favor the interval over the image — the space where meaning accumulates.",
  dimensions: [
    { key: "color",       label: "Color Sensitivity",     value: 38, leftPole: "Monochrome",   rightPole: "Chromatic"    },
    { key: "composition", label: "Composition",           value: 74, leftPole: "Fluid",         rightPole: "Structured"   },
    { key: "emotion",     label: "Emotional Tone",        value: 78, leftPole: "Expressive",    rightPole: "Restrained"   },
    { key: "concept",     label: "Conceptual Depth",      value: 82, leftPole: "Aesthetic",     rightPole: "Conceptual"   },
    { key: "material",    label: "Material Interest",     value: 62, leftPole: "Traditional",   rightPole: "Experimental" },
  ],
  patterns: [
    { keyword: "Restraint",    weight: 0.95, category: "concept"  },
    { keyword: "Minimalism",   weight: 0.92, category: "style"    },
    { keyword: "Silence",      weight: 0.88, category: "emotion"  },
    { keyword: "Conceptual",   weight: 0.84, category: "concept"  },
    { keyword: "Identity",     weight: 0.80, category: "concept"  },
    { keyword: "Reduction",    weight: 0.76, category: "style"    },
    { keyword: "Spatial",      weight: 0.72, category: "concept"  },
    { keyword: "정체성",        weight: 0.68, category: "concept"  },
    { keyword: "Mono-ha",      weight: 0.64, category: "style"    },
    { keyword: "Time",         weight: 0.60, category: "concept"  },
    { keyword: "고요함",        weight: 0.54, category: "emotion"  },
    { keyword: "Material",     weight: 0.50, category: "material" },
  ],
  patternSummary: "Your visual language clusters around minimal abstraction, conceptual restraint, and the politics of identity.",
  insight: "Your taste is shifting toward more concept-driven structures, with growing sensitivity to spatial and material themes. Works that treat silence as a medium — where reduction becomes argument — are increasingly central to your aesthetic.",
  dominantStyle: "Minimalism",
  dominantEmotion: "Restrained",
  collectionSize: 4,
  signalStrength: "emerging",
};

/* ── Helpers ──────────────────────────────────────────────────── */

function avg(values: number[]): number {
  if (values.length === 0) return 50;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function containsAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some(t => lower.includes(t.toLowerCase()));
}

function keywordBias(items: CollectionItem[], highTerms: string[], lowTerms: string[], base: number): number {
  let score = base;
  items.forEach(item => {
    const allText = [
      ...(item.analysis.keywords ?? []),
      item.analysis.style ?? "",
      ...(item.analysis.works ?? []).map(w => (w as { medium?: string }).medium ?? ""),
    ].join(" ");
    if (containsAny(allText, highTerms)) score += 6;
    if (containsAny(allText, lowTerms))  score -= 5;
  });
  return Math.max(10, Math.min(90, Math.round(score)));
}

/* ── Main computation ─────────────────────────────────────────── */

function computeProfile(items: CollectionItem[]): TasteProfile {
  const n = items.length;

  const signalStrength: SignalStrength = n >= 7 ? "defined" : n >= 3 ? "emerging" : "forming";

  /* Emotion aggregates */
  const calmArr     = items.map(i => i.analysis.emotions?.calm     ?? 50);
  const heavyArr    = items.map(i => i.analysis.emotions?.heavy    ?? 50);
  const warmArr     = items.map(i => i.analysis.emotions?.warm     ?? 50);
  const inwardArr   = items.map(i => i.analysis.emotions?.inward   ?? 50);
  const movementArr = items.map(i => i.analysis.emotions?.movement ?? 50);

  const calmAvg     = avg(calmArr);
  const heavyAvg    = avg(heavyArr);
  const warmAvg     = avg(warmArr);
  const inwardAvg   = avg(inwardArr);
  const movementAvg = avg(movementArr);

  /* Dimensions */
  const colorSensitivity = Math.round(warmAvg * 0.7 + (100 - inwardAvg) * 0.3);

  const compositionScore = keywordBias(
    items,
    ["minimalis", "structured", "geometric", "선", "반복", "격자", "구조", "grid"],
    ["gestural", "fluid", "organic", "자유", "흐름", "표현주의"],
    50,
  );

  const emotionalTone = Math.round(
    Math.max(20, Math.min(90, 100 - (heavyAvg * 0.45 + movementAvg * 0.55)))
  );

  const conceptualDepth = keywordBias(
    items,
    ["conceptual", "concept", "개념", "identity", "정체성", "존재", "탐구", "관계", "시간", "물질"],
    ["decorative", "aesthetic", "장식", "아름다움", "형태미"],
    35,
  );

  const materialInterest = keywordBias(
    items,
    ["installation", "설치", "performance", "digital", "photograph", "사진", "stone", "steel", "mixed media", "canvas-less"],
    ["oil", "acrylic", "watercolor", "canvas", "캔버스", "수채"],
    40,
  );

  const dimensions: TasteDimension[] = [
    { key: "color",       label: "Color Sensitivity", value: colorSensitivity, leftPole: "Monochrome",  rightPole: "Chromatic"    },
    { key: "composition", label: "Composition",        value: compositionScore, leftPole: "Fluid",        rightPole: "Structured"   },
    { key: "emotion",     label: "Emotional Tone",     value: emotionalTone,    leftPole: "Expressive",   rightPole: "Restrained"   },
    { key: "concept",     label: "Conceptual Depth",   value: conceptualDepth,  leftPole: "Aesthetic",    rightPole: "Conceptual"   },
    { key: "material",    label: "Material Interest",  value: materialInterest, leftPole: "Traditional",  rightPole: "Experimental" },
  ];

  /* Visual patterns — keyword frequency */
  const freq: Record<string, number> = {};
  items.forEach(item => {
    (item.analysis.keywords ?? []).forEach(kw => { freq[kw] = (freq[kw] ?? 0) + 1; });
  });
  const maxFreq = Math.max(1, ...Object.values(freq));
  const patterns: VisualPattern[] = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([kw, count]) => ({
      keyword: kw,
      weight: Math.round((count / maxFreq) * 100) / 100,
      category: "concept" as const,
    }));

  /* Dominant style + emotion */
  const styleFreq: Record<string, number> = {};
  items.forEach(i => { const s = i.analysis.style ?? ""; if (s) styleFreq[s] = (styleFreq[s] ?? 0) + 1; });
  const dominantStyle = Object.entries(styleFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Contemporary";

  const emotionMap: Record<string, string> = { calm: "Serene", heavy: "Weighty", warm: "Warm", inward: "Contemplative", movement: "Dynamic" };
  const emotionAvgs = { calm: calmAvg, heavy: heavyAvg, warm: warmAvg, inward: inwardAvg, movement: movementAvg };
  const topEmotionKey = Object.entries(emotionAvgs).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "calm";
  const dominantEmotion = emotionMap[topEmotionKey] ?? "Serene";

  /* Taste statement */
  const restrained  = emotionalTone > 62;
  const conceptual  = conceptualDepth > 58;
  const structured  = compositionScore > 58;
  const colorful    = colorSensitivity > 60;

  let statement = "";
  let subStatement = "";

  if (restrained && conceptual && structured) {
    statement    = "Your taste is defined by restraint, structure, and quiet intensity.";
    subStatement = "You favor the interval over the image — the space where meaning accumulates.";
  } else if (restrained && conceptual && !structured) {
    statement    = "You favor restraint over expression. Silence over noise.";
    subStatement = "Your aesthetic gravitates toward work that withholds as much as it reveals.";
  } else if (restrained && !conceptual && !colorful) {
    statement    = "Your taste gravitates toward the minimal — reduction as its own kind of statement.";
    subStatement = "You find more in what is left out than in what is included.";
  } else if (!restrained && conceptual) {
    statement    = "You are drawn to work that interrogates rather than decorates.";
    subStatement = "Your taste is shaped by ideas — art as argument, not ornament.";
  } else if (!restrained && colorful) {
    statement    = "Your taste moves between sensation and structure — color as both feeling and form.";
    subStatement = "You are drawn to work that uses visual intensity to carry conceptual weight.";
  } else {
    statement    = "Your taste bridges the sensory and the intellectual.";
    subStatement = "You are drawn to work that moves between feeling and idea without resolving the tension.";
  }

  /* Pattern summary */
  const topKws = patterns.slice(0, 4).map(p => p.keyword).join(", ");
  const patternSummary = `Your visual language clusters around ${topKws || "restrained abstraction and conceptual depth"}.`;

  /* Insight */
  const insight = conceptual && materialInterest > 55
    ? "Your taste is shifting toward more concept-driven structures, with growing sensitivity to spatial and material themes. Works that treat the physical as argument — where reduction becomes form — are increasingly central to your aesthetic."
    : conceptual
    ? "Your taste is consolidating around conceptual and identity-driven work. The next territory your taste seems ready to explore is the relationship between material and meaning."
    : restrained
    ? "Your preference for restraint is consistent and defining. The works you're drawn to share a quality of deliberate withholding — where less is not compromise but precision."
    : "Your taste is still forming its shape. Each work you engage with adds definition to the profile — the patterns are beginning to clarify.";

  return {
    statement, subStatement, dimensions, patterns,
    patternSummary, insight, dominantStyle, dominantEmotion,
    collectionSize: n, signalStrength,
  };
}

/* ── MyActivity bridge ───────────────────────────────────────────
 * Spec STEP 7: profile is built from likes / saved / collections.
 * Recent is a viewing log, not affinity, so it's excluded from the
 * count + cluster signal. Items that lack a full analysis (came
 * from gallery / onboarding rather than the analyze flow) still
 * contribute via title / period / medium / artist token scanning
 * + an artist-cluster hint table for the canonical seed roster.
 */

/** Lowercased artist name → cluster keywords seeded from canonical. */
const ARTIST_CLUSTER_HINTS: Record<string, string[]> = {
  "kim whanki":     ["korean", "modernism"],
  "김환기":          ["korean", "modernism"],
  "lee ufan":       ["mono-ha", "minimal", "korean"],
  "이우환":          ["mono-ha", "minimal", "korean"],
  "park seo-bo":    ["dansaekhwa", "단색화", "minimal", "korean"],
  "박서보":          ["dansaekhwa", "단색화", "minimal", "korean"],
  "yayoi kusama":   ["infinity", "pattern", "repetition"],
  "쿠사마 야요이":   ["infinity", "pattern", "repetition"],
  "mark rothko":    ["color", "abstract"],
  "마크 로스코":     ["color", "abstract"],
  "gerhard richter":["abstract", "gestural"],
};

const TEXT_CLUSTER_TERMS: { term: string; category: VisualPattern["category"] }[] = [
  { term: "minimal",      category: "style"    },
  { term: "abstract",     category: "style"    },
  { term: "abstraction",  category: "style"    },
  { term: "infinity",     category: "style"    },
  { term: "pattern",      category: "style"    },
  { term: "repetition",   category: "style"    },
  { term: "korean",       category: "style"    },
  { term: "modernism",    category: "style"    },
  { term: "dansaek",      category: "style"    },
  { term: "단색",          category: "style"    },
  { term: "단색화",        category: "style"    },
  { term: "mono-ha",      category: "style"    },
  { term: "ecriture",     category: "concept"  },
  { term: "묘법",          category: "concept"  },
  { term: "conceptual",   category: "concept"  },
  { term: "concept",      category: "concept"  },
  { term: "identity",     category: "concept"  },
  { term: "정체성",        category: "concept"  },
  { term: "color",        category: "concept"  },
  { term: "material",     category: "material" },
  { term: "installation", category: "material" },
  { term: "sculpture",    category: "material" },
  { term: "restrain",     category: "concept"  },
  { term: "silence",      category: "emotion"  },
];

function patternsFromSaved(s: SavedArtwork): VisualPattern[] {
  const out: VisualPattern[] = [];
  const blob = `${s.title ?? ""} ${s.artist_name ?? ""} ${s.period ?? ""} ${s.medium ?? ""}`.toLowerCase();

  // Artist-anchored hints — high confidence for our canonical roster.
  const artistKey = (s.artist_name ?? "").toLowerCase();
  const hints     = ARTIST_CLUSTER_HINTS[artistKey] ?? [];
  for (const term of hints) {
    out.push({ keyword: term, weight: 0.65, category: "style" });
  }

  // Free-text term scan — catches non-roster artworks.
  for (const t of TEXT_CLUSTER_TERMS) {
    if (blob.includes(t.term)) {
      out.push({ keyword: t.term, weight: 0.45, category: t.category });
    }
  }
  return out;
}

/** Merge analysis-collection items + MyActivity items, deduped by id. */
function gatherSignalSources(
  analysisItems: CollectionItem[],
  my: ReturnType<typeof useMyActivity>["state"],
): { items: CollectionItem[]; extraPatterns: VisualPattern[]; size: number } {
  const seen = new Set(analysisItems.map(i => i.id));
  const collectionArtworks = my.collections.flatMap(c => c.items.map(ci => ci.artwork));
  const fromMy: SavedArtwork[] = [...my.likes, ...my.saved, ...collectionArtworks]
    .filter(a => !seen.has(a.artwork_id));

  // Dedupe my-side too — same artwork in likes + saved should count once.
  const dedupedMy = Array.from(new Map(fromMy.map(a => [a.artwork_id, a])).values());

  const extraPatterns = dedupedMy.flatMap(patternsFromSaved);
  return {
    items: analysisItems,
    extraPatterns,
    size:  analysisItems.length + dedupedMy.length,
  };
}

/* ── Hook ─────────────────────────────────────────────────────── */

export function useTasteProfile(): { profile: TasteProfile; isDemo: boolean; hydrated: boolean } {
  const { items: analysisItems, hydrated } = useCollection();
  const { state: my }                       = useMyActivity();

  const profile = useMemo(() => {
    if (!hydrated) return DEMO_PROFILE;

    const signals = gatherSignalSources(analysisItems, my);

    // Both stores empty → demo profile (unchanged behavior).
    if (signals.size === 0) return DEMO_PROFILE;

    // Compute the rich profile from analysis items, then bolt on the
    // MyActivity-derived patterns + size. computeProfile handles the
    // empty analysisItems case too — extra patterns still drive
    // clusters even when there's no analyze-flow data.
    const base = computeProfile(signals.items);

    const mergedPatterns = [...base.patterns, ...signals.extraPatterns]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 24);

    const signalStrength: SignalStrength =
      signals.size >= 7 ? "defined" :
      signals.size >= 3 ? "emerging" : "forming";

    return {
      ...base,
      patterns:        mergedPatterns,
      collectionSize:  signals.size,
      signalStrength,
    };
  }, [analysisItems, hydrated, my]);

  const totalEmpty = analysisItems.length === 0
    && my.likes.length === 0
    && my.saved.length === 0
    && my.collections.length === 0;

  return {
    profile,
    isDemo: hydrated && totalEmpty,
    hydrated,
  };
}
