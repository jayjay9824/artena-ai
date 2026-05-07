/**
 * Seed dataset for the Exhibitions & Travel page.
 *
 * Real venues and artists, fictional date windows so the page reads
 * as a real listing without claiming current availability. Replace
 * by a backend feed when one ships — page consumers go through
 * getExhibitions() / getMustSeeByCity() so the seam is single-file.
 */

export type City = "Seoul" | "New York" | "Tokyo" | "London";

/**
 * Spec STEP 12 categorisation. Drives the Must-See editorial card
 * top caption and lets the curator filter by venue type later.
 */
export type ExhibitionCategory =
  | "museum"
  | "gallery"
  | "art_district"
  | "landmark";

export interface Exhibition {
  id:           string;
  title:        string;
  venue:        string;
  city:         City;
  /** ISO yyyy-mm-dd. */
  startDate:    string;
  endDate:      string;
  artists:      string[];
  /** Editorial cluster — used for taste matching. */
  cluster:      string;
  /** Art-historical movement — drives Artist Alerts "Related" grouping. */
  movement?:    string;
  /** Venue type for Must-See / editorial filters. */
  category?:    ExhibitionCategory;
  /** Suggested visit length, e.g. "2 hours" / "Half day". */
  visitDuration?: string;
  imageHint?:   string;            // gradient seed when no real image
  whyItMatters: string;
  address?:     string;
  hours?:       string;
  ticketInfo?:  string;
  reservationUrl?: string;
  officialUrl?:    string;
  mapUrl?:         string;
  mustSee?:    boolean;
  /** Surfaces this exhibition under Travel rather than Near You. */
  travelDestination?: boolean;
}

/* Build a date string offset N days from a fixed reference so the
 * seed stays stable across renders without hitting Date.now(). */
const REF = new Date("2026-04-27").getTime();
const DAY = 86400 * 1000;
const dayOff = (n: number) => new Date(REF + n * DAY).toISOString().slice(0, 10);

export const EXHIBITIONS: Exhibition[] = [
  {
    id: "ex-leeufan-mmca",
    title: "Lee Ufan: Marking Infinity",
    venue: "MMCA Seoul",
    city: "Seoul",
    startDate: dayOff(-30), endDate: dayOff(60),
    artists: ["Lee Ufan"],
    cluster: "Quiet Minimalism",
    movement: "Mono-ha",
    category: "museum",
    visitDuration: "2 hours",
    whyItMatters: "The most comprehensive Lee Ufan retrospective in Korea since 2014, tracing 60 years of the Mono-ha legacy.",
    address: "30 Samcheong-ro, Jongno-gu, Seoul",
    hours: "Tue–Sun 10:00–18:00",
    ticketInfo: "Adult ₩4,000 · Online reservation recommended",
    officialUrl: "https://www.mmca.go.kr",
    mustSee: true,
  },
  {
    id: "ex-park-gana",
    title: "Park Seo-Bo: Écriture",
    venue: "Gana Art Center",
    city: "Seoul",
    startDate: dayOff(-7), endDate: dayOff(45),
    artists: ["Park Seo-Bo"],
    cluster: "Quiet Minimalism",
    movement: "Dansaekhwa",
    category: "gallery",
    visitDuration: "1 hour",
    whyItMatters: "Late-period Écriture works that cement Park's place at the centre of Dansaekhwa's continuing dialogue.",
    address: "28 Pyeongchang 30-gil, Jongno-gu, Seoul",
    hours: "Tue–Sun 10:00–19:00",
    ticketInfo: "Free admission",
    officialUrl: "https://www.ganaart.com",
  },
  {
    id: "ex-whanki-museum",
    title: "Kim Whanki: A Cosmos in Color",
    venue: "Whanki Museum",
    city: "Seoul",
    startDate: dayOff(-90), endDate: dayOff(120),
    artists: ["Kim Whanki"],
    cluster: "Korean Modernism",
    movement: "Korean Modernism",
    category: "museum",
    visitDuration: "Half day",
    whyItMatters: "The permanent collection re-hung as a single 70-year arc. The Universe canvases anchor a generation of Korean abstraction.",
    address: "63, Jahamun-ro 40-gil, Jongno-gu, Seoul",
    hours: "Tue–Sun 10:00–18:00 (closed Mondays)",
    ticketInfo: "Adult ₩7,000 · Student ₩5,000",
    officialUrl: "https://whankimuseum.org",
    mustSee: true,
  },
  {
    id: "ex-kusama-tate",
    title: "Yayoi Kusama: Infinity Mirror Rooms",
    venue: "Tate Modern",
    city: "London",
    startDate: dayOff(-60), endDate: dayOff(150),
    artists: ["Yayoi Kusama"],
    cluster: "Pattern & Repetition",
    movement: "Pop / Pattern",
    category: "museum",
    visitDuration: "2 hours",
    whyItMatters: "Two infinity rooms paired with rarely-shown 1960s drawings. Timed-entry tickets routinely sell out four weeks ahead.",
    address: "Bankside, London SE1 9TG",
    hours: "Daily 10:00–18:00 (Fri–Sat to 22:00)",
    ticketInfo: "£15 timed entry · advance booking required",
    reservationUrl: "https://www.tate.org.uk",
    officialUrl: "https://www.tate.org.uk/visit/tate-modern",
    mustSee: true,
    travelDestination: true,
  },
  {
    id: "ex-rothko-tate",
    title: "Rothko: Color as Threshold",
    venue: "Tate Modern",
    city: "London",
    startDate: dayOff(10), endDate: dayOff(180),
    artists: ["Mark Rothko"],
    cluster: "Color-driven Abstraction",
    movement: "Color Field",
    category: "museum",
    visitDuration: "2 hours",
    whyItMatters: "The Seagram Murals reunited with seven canvases on loan from the Phillips Collection.",
    address: "Bankside, London SE1 9TG",
    hours: "Daily 10:00–18:00",
    ticketInfo: "£18 · Members free",
    officialUrl: "https://www.tate.org.uk",
    travelDestination: true,
  },
  {
    id: "ex-leebul-hayward",
    title: "Lee Bul: Genesis",
    venue: "Hayward Gallery",
    city: "London",
    startDate: dayOff(-15), endDate: dayOff(75),
    artists: ["Lee Bul"],
    cluster: "Material Experimentation",
    movement: "Post-utopian Sculpture",
    category: "museum",
    visitDuration: "2 hours",
    whyItMatters: "Korea's most rigorous sculptor of the post-utopian decade, in her largest UK survey.",
    address: "Belvedere Rd, London SE1 8XX",
    hours: "Wed–Mon 11:00–19:00",
    ticketInfo: "£18 · concession £14",
    officialUrl: "https://www.southbankcentre.co.uk",
    travelDestination: true,
  },
  {
    id: "ex-kapoor-pace",
    title: "Anish Kapoor: Material as Mirror",
    venue: "Pace Gallery",
    city: "New York",
    startDate: dayOff(-2), endDate: dayOff(48),
    artists: ["Anish Kapoor"],
    cluster: "Material Reflection",
    movement: "Material Reflection",
    category: "gallery",
    visitDuration: "1 hour",
    whyItMatters: "Stainless-steel works at scale, including a new mirrored disc commissioned for the Chelsea space.",
    address: "540 W 25th Street, New York, NY",
    hours: "Tue–Sat 10:00–18:00",
    ticketInfo: "Free",
    officialUrl: "https://www.pacegallery.com",
    travelDestination: true,
  },
  {
    id: "ex-cecily-zwirner",
    title: "Cecily Brown: Carnival",
    venue: "David Zwirner",
    city: "New York",
    startDate: dayOff(-20), endDate: dayOff(40),
    artists: ["Cecily Brown"],
    cluster: "Gestural Abstraction",
    movement: "Gestural Abstraction",
    category: "gallery",
    visitDuration: "1 hour",
    whyItMatters: "Six new large-scale paintings; a step deeper into the figurative wreckage that made her work essential.",
    address: "525 W 19th Street, New York, NY",
    hours: "Tue–Sat 10:00–18:00",
    ticketInfo: "Free",
    officialUrl: "https://www.davidzwirner.com",
  },
  {
    id: "ex-monoha-dia",
    title: "Mono-ha: Encounter",
    venue: "Dia Beacon",
    city: "New York",
    startDate: dayOff(-120), endDate: dayOff(240),
    artists: ["Lee Ufan", "Nobuo Sekine", "Susumu Koshimizu"],
    cluster: "Quiet Minimalism",
    movement: "Mono-ha",
    category: "museum",
    visitDuration: "Half day",
    whyItMatters: "Permanent rotation of the Mono-ha holdings. The closest you'll come outside Tokyo to the founding gestures of the movement.",
    address: "3 Beekman Street, Beacon, NY",
    hours: "Fri–Mon 10:00–17:00",
    ticketInfo: "$20 · students $12",
    officialUrl: "https://www.diaart.org",
    mustSee: true,
    travelDestination: true,
  },
  {
    id: "ex-nara-mori",
    title: "Yoshitomo Nara: Quiet Riot",
    venue: "Mori Art Museum",
    city: "Tokyo",
    startDate: dayOff(-40), endDate: dayOff(80),
    artists: ["Yoshitomo Nara"],
    cluster: "Pattern & Repetition",
    movement: "Japanese Neo-Pop",
    category: "museum",
    visitDuration: "2 hours",
    whyItMatters: "The first major Tokyo museum survey since 2017. Three decades of solitary girls and the politics behind them.",
    address: "Roppongi Hills Mori Tower 53F, Tokyo",
    hours: "Daily 10:00–22:00 (Tue to 17:00)",
    ticketInfo: "¥2,000 · advance ¥1,800",
    reservationUrl: "https://www.mori.art.museum",
    officialUrl: "https://www.mori.art.museum",
    mustSee: true,
    travelDestination: true,
  },
  {
    id: "ex-eliasson-mori",
    title: "Olafur Eliasson: Weather Project Now",
    venue: "TOKAS",
    city: "Tokyo",
    startDate: dayOff(15), endDate: dayOff(105),
    artists: ["Olafur Eliasson"],
    cluster: "Atmospheric Impressionism",
    movement: "Material Reflection",
    category: "art_district",
    visitDuration: "2 hours",
    whyItMatters: "Two newly-built immersive rooms. Eliasson's clearest statement on weather as a public material since 2003.",
    address: "1-2-1 Kiyosumi, Koto-ku, Tokyo",
    hours: "Tue–Sun 11:00–19:00",
    ticketInfo: "Free with timed entry",
    reservationUrl: "https://www.tokas.or.jp",
    officialUrl: "https://www.tokas.or.jp",
    travelDestination: true,
  },
  {
    id: "ex-fujiwara-zwirner",
    title: "Simon Fujiwara: Who Else?",
    venue: "David Zwirner",
    city: "London",
    startDate: dayOff(5), endDate: dayOff(60),
    artists: ["Simon Fujiwara"],
    cluster: "Conceptual Sensibility",
    movement: "Conceptual",
    category: "gallery",
    visitDuration: "1 hour",
    whyItMatters: "New Spanish Identity series and a film commissioned for Mayfair — Fujiwara at his most institutionally pointed.",
    address: "24 Grafton Street, London W1S 4EZ",
    hours: "Tue–Sat 10:00–18:00",
    ticketInfo: "Free",
    officialUrl: "https://www.davidzwirner.com",
  },
];

/* ── Service-style accessors ──────────────────────────────────────── */

export function getExhibitions(): Exhibition[] {
  return EXHIBITIONS;
}

export function getMustSeeByCity(city: City): Exhibition[] {
  return EXHIBITIONS.filter(e => e.city === city && e.mustSee);
}

/** Cities the picker offers — keeps spec list + any other cities present in seed. */
export const CITIES: City[] = ["Seoul", "New York", "Tokyo", "London"];

/* ── Time-window helper ───────────────────────────────────────────── */

export type TimeKey = "now" | "1m" | "3m" | "6m" | "1y";

const TIME_DAYS: Record<TimeKey, number> = {
  now: 0,
  "1m":  30,
  "3m":  90,
  "6m":  180,
  "1y":  365,
};

/**
 * "now" = currently running. Other windows include exhibitions whose
 * window overlaps the next N days from the reference date.
 */
export function withinWindow(e: Exhibition, key: TimeKey): boolean {
  const today = new Date(dayOff(0)).getTime();
  const start = new Date(e.startDate).getTime();
  const end   = new Date(e.endDate).getTime();
  if (key === "now") return start <= today && end >= today;
  const horizon = today + TIME_DAYS[key] * DAY;
  // Overlap test: [start, end] ∩ [today, horizon] non-empty.
  return start <= horizon && end >= today;
}

/* ── Date label ───────────────────────────────────────────────────── */

export function formatDateRange(e: Exhibition): string {
  const f = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const startYear = new Date(e.startDate).getFullYear();
  const endYear   = new Date(e.endDate).getFullYear();
  const yearLabel = endYear === startYear ? `, ${endYear}` : `, ${startYear}–${endYear}`;
  return `${f(e.startDate)} – ${f(e.endDate)}${yearLabel}`;
}
