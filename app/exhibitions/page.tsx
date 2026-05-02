"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, Bookmark, BookmarkCheck, Calendar, ExternalLink, MapPin, Ticket, X, Plus } from "lucide-react";
import { useMyActivity } from "../context/MyActivityContext";
import { useCollection } from "../collection/hooks/useCollection";
import { useLanguage } from "../i18n/useLanguage";
import {
  Exhibition, City, TimeKey, CITIES,
  getExhibitions, getMustSeeByCity, withinWindow, formatDateRange,
} from "./lib/exhibitionsData";

const FONT      = "'KakaoSmallSans', system-ui, sans-serif";
const FONT_HEAD = "'KakaoBigSans', system-ui, sans-serif";

type TabKey = "near" | "travel" | "alerts" | "must";

/* ── Local-storage Notify Me + Saved Exhibitions + Filters ───────── */

const NOTIFY_KEY        = "artena.exhibitions.notify";
const SAVED_KEY         = "artena.exhibitions.saved";
const CITIES_KEY        = "artena.exhibitions.cities";
const CUSTOM_CITIES_KEY = "artena.exhibitions.customCities";
const TIME_KEY          = "artena.exhibitions.time";
const TRIP_KEY          = "artena.exhibitions.trip";

/** Centroid coords for the canonical 4 cities. */
const CITY_COORDS: Record<City, [number, number]> = {
  "Seoul":    [37.5665, 126.9780],
  "New York": [40.7128, -74.0060],
  "Tokyo":    [35.6762, 139.6503],
  "London":   [51.5074, -0.1278],
};

/** True when an exhibition's [start,end] window overlaps a trip [start,end]. */
function overlapsTrip(ex: Exhibition, tripStart: string, tripEnd: string): boolean {
  if (!tripStart || !tripEnd) return false;
  // Plain string compare works because all dates are ISO yyyy-mm-dd.
  return ex.startDate <= tripEnd && ex.endDate >= tripStart;
}

/* ── Artist → movement table for Artist Alerts "Related" grouping ──
 * Same map shape useTasteProfile uses, kept duplicated here to avoid
 * a circular import. When a real backend ships, both consumers read
 * from one source. Lowercased keys; values are movement strings that
 * line up with Exhibition.movement. */
const ARTIST_MOVEMENT: Record<string, string[]> = {
  "lee ufan":        ["Mono-ha"],
  "이우환":           ["Mono-ha"],
  "park seo-bo":     ["Dansaekhwa", "Korean Modernism"],
  "박서보":           ["Dansaekhwa", "Korean Modernism"],
  "kim whanki":      ["Korean Modernism"],
  "김환기":           ["Korean Modernism"],
  "yayoi kusama":    ["Pop / Pattern"],
  "쿠사마 야요이":    ["Pop / Pattern"],
  "mark rothko":     ["Color Field"],
  "마크 로스코":      ["Color Field"],
  "gerhard richter": ["Gestural Abstraction"],
  "cecily brown":    ["Gestural Abstraction"],
  "anish kapoor":    ["Material Reflection"],
  "olafur eliasson": ["Material Reflection"],
  "lee bul":         ["Post-utopian Sculpture"],
  "yoshitomo nara":  ["Japanese Neo-Pop"],
  "simon fujiwara":  ["Conceptual"],
};

/** Resolve user's lat/lon to the closest known city via squared Euclidean. */
function closestKnownCity(lat: number, lon: number): City {
  let best:     City   = "Seoul";
  let bestDist: number = Infinity;
  (Object.entries(CITY_COORDS) as [City, [number, number]][]).forEach(([name, [clat, clon]]) => {
    const d = Math.pow(lat - clat, 2) + Math.pow(lon - clon, 2);
    if (d < bestDist) { bestDist = d; best = name; }
  });
  return best;
}

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}
function writeSet(key: string, s: Set<string>): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(Array.from(s))); } catch {}
}

/* ── Taste match score ───────────────────────────────────────────── */
/*
 * Simple, transparent scoring so the "reason" line below the score
 * stays honest. Base 50, +25 if user has liked/saved the exhibition's
 * artists, +20 if any of the user's items mentions the cluster.
 * Capped at 99.
 */
function scoreExhibition(
  ex: Exhibition,
  knownArtists: Set<string>,
  patternKeywords: Set<string>,
): { score: number; reason: string } {
  let score = 50;
  let topReason = "";

  const artistHit = ex.artists.find(a => knownArtists.has(a.toLowerCase()));
  if (artistHit) {
    score += 25;
    topReason = `You've engaged with ${artistHit}.`;
  }

  const cluster = ex.cluster.toLowerCase();
  const clusterHit = Array.from(patternKeywords).some(k =>
    cluster.includes(k) || k.includes(cluster.split(" ")[0])
  );
  if (clusterHit) {
    score += 20;
    if (!topReason) topReason = `Aligned with your ${ex.cluster} signal.`;
  }

  if (!topReason) topReason = `Curated for the ${ex.cluster} thread.`;
  return { score: Math.min(99, score), reason: topReason };
}

/* ── Card ────────────────────────────────────────────────────────── */

interface CardProps {
  ex:        Exhibition;
  score:     number;
  reason:    string;
  /** True when this card is on the Travel tab and overlaps the user's trip dates. */
  onTripBadge?: boolean;
  saved:     boolean;
  notifying: boolean;
  onSave:    () => void;
  onNotify:  () => void;
  onTickets: () => void;
  onDetails: () => void;
}

function ExhibitionCard({ ex, score, reason, onTripBadge, saved, notifying, onSave, onNotify, onTickets, onDetails }: CardProps) {
  return (
    <article style={{
      background: "#FFFFFF",
      border: "0.5px solid #E7E2D8",
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 14,
    }}>
      {/* Hero band — gradient placeholder seeded by cluster */}
      <div style={{
        aspectRatio: "16 / 9",
        background: "linear-gradient(160deg, #F1ECE0, #F4EFE5 55%, #ECE6D6)",
        position: "relative" as const,
        cursor: "pointer",
      }} onClick={onDetails}>
        <div style={{
          position: "absolute" as const, top: 12, left: 14,
          fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
          textTransform: "uppercase" as const, fontWeight: 600,
        }}>
          {ex.cluster}
        </div>
        {/* Match badge */}
        <div style={{
          position: "absolute" as const, top: 12, right: 14,
          padding: "4px 10px",
          background: "rgba(255,255,255,0.9)",
          border: "0.5px solid #D9C9A6",
          borderRadius: 12,
          fontSize: 10, fontWeight: 700, color: "#8A6A3F",
          letterSpacing: ".04em",
          fontFamily: FONT_HEAD,
        }}>
          {score} taste match
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px 18px" }}>
        <p style={{
          fontSize: 9, color: "#9A9A9A", letterSpacing: ".18em",
          textTransform: "uppercase" as const, margin: "0 0 6px",
        }}>
          {ex.venue} · {ex.city}
        </p>

        <h3
          onClick={onDetails}
          style={{
            fontSize: 18, fontWeight: 700, color: "#1C1A17",
            margin: "0 0 6px", letterSpacing: "-.015em", lineHeight: 1.25,
            cursor: "pointer",
            fontFamily: FONT_HEAD,
          }}
        >
          {ex.title}
        </h3>

        <p style={{ fontSize: 12, color: "#6F6F6F", margin: "0 0 8px" }}>
          {ex.artists.slice(0, 3).join(" · ")}
          {ex.artists.length > 3 ? ` +${ex.artists.length - 3}` : ""}
        </p>

        <p style={{ fontSize: 11, color: "#9A9A9A", margin: "0 0 12px", letterSpacing: ".005em" }}>
          {formatDateRange(ex)}
        </p>

        {/* Open during your trip — only visible on Travel tab when the
            exhibition window overlaps the user's saved trip dates. */}
        {onTripBadge && (
          <span style={{
            display: "inline-block", marginBottom: 12,
            fontSize: 9, color: "#FFFFFF",
            background: "#1C1A17", padding: "3px 9px",
            borderRadius: 12, letterSpacing: ".12em",
            textTransform: "uppercase" as const, fontWeight: 600,
          }}>
            Open during your trip
          </span>
        )}

        {/* Reason */}
        <p style={{
          fontSize: 11.5, color: "#6F6F6F", lineHeight: 1.6,
          margin: "0 0 14px",
          paddingLeft: 10, borderLeft: "1.5px solid #D9C9A6",
          fontStyle: "italic" as const,
        }}>
          {reason}
        </p>

        {/* Action row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          <BtnGhost label={saved ? "Saved" : "Save"} active={saved} icon={saved ? <BookmarkCheck size={13} strokeWidth={1.6} /> : <Bookmark size={13} strokeWidth={1.6} />} onClick={onSave} />
          <BtnGhost label={notifying ? "Notifying" : "Notify Me"} active={notifying} icon={notifying ? <BellRing size={13} strokeWidth={1.6} /> : <Bell size={13} strokeWidth={1.6} />} onClick={onNotify} />
          {(ex.reservationUrl || ex.officialUrl) && (
            <BtnGhost label="Get Tickets" icon={<Ticket size={13} strokeWidth={1.6} />} onClick={onTickets} />
          )}
          <button
            onClick={onDetails}
            style={{
              marginLeft: "auto",
              padding: "7px 14px",
              background: "#111111", color: "#FFFFFF",
              border: "none", borderRadius: 20, cursor: "pointer",
              fontSize: 11, fontWeight: 600, letterSpacing: ".04em",
              fontFamily: FONT,
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

function BtnGhost({ label, icon, onClick, active = false }: {
  label: string; icon: React.ReactNode; onClick: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "7px 12px",
        background: active ? "#F4EFE5" : "transparent",
        border: `0.5px solid ${active ? "#D9C9A6" : "#E7E2D8"}`,
        borderRadius: 20, cursor: "pointer",
        color: active ? "#8A6A3F" : "#6F6F6F",
        fontSize: 11, fontWeight: 600, letterSpacing: ".02em",
        fontFamily: FONT,
        transition: "background .12s, border-color .12s, color .12s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Detail panel ────────────────────────────────────────────────── */

interface DetailPanelProps {
  ex:     Exhibition;
  score:  number;
  reason: string;
  onClose: () => void;
}

function DetailPanel({ ex, score, reason, onClose }: DetailPanelProps) {
  // Add-to-Calendar: opens the universal Google Calendar template URL.
  const calendarUrl = useMemo(() => {
    const dt = (iso: string) => iso.replace(/-/g, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text:   `${ex.title} — ${ex.venue}`,
      dates:  `${dt(ex.startDate)}/${dt(ex.endDate)}`,
      details: `${ex.whyItMatters}\n\n${ex.officialUrl ?? ""}`,
      location: `${ex.venue}, ${ex.address ?? ex.city}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [ex]);

  return (
    <div style={{
      position: "fixed" as const, inset: 0,
      background: "rgba(28,26,23,0.55)",
      zIndex: 200,
      display: "flex", justifyContent: "center" as const, alignItems: "flex-end",
      fontFamily: FONT,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560,
          background: "#F8F7F4",
          borderRadius: "20px 20px 0 0",
          padding: "20px 22px 32px",
          maxHeight: "92vh", overflowY: "auto" as const,
          animation: "exDetailIn .28s ease",
        }}
      >
        <style>{`@keyframes exDetailIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <p style={{
            fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
            textTransform: "uppercase" as const, margin: 0, fontWeight: 600,
          }}>
            {ex.venue}
          </p>
          <button onClick={onClose} aria-label="Close" style={{
            width: 28, height: 28, padding: 0,
            background: "transparent", border: "none",
            cursor: "pointer", color: "#6F6F6F",
          }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <h2 style={{
          fontSize: 22, fontWeight: 700, color: "#1C1A17",
          margin: "0 0 6px", letterSpacing: "-.02em", lineHeight: 1.2,
          fontFamily: FONT_HEAD,
        }}>
          {ex.title}
        </h2>

        <p style={{ fontSize: 12, color: "#6F6F6F", margin: "0 0 4px" }}>
          {ex.artists.join(" · ")}
        </p>
        <p style={{ fontSize: 11, color: "#9A9A9A", margin: "0 0 18px" }}>
          {formatDateRange(ex)} · {ex.city}
        </p>

        {/* AXVELA Match Reason — surfaces the score + signal in detail
            (the card already shows it, but the detail panel is where
            users decide whether to book). */}
        <div style={{
          marginBottom: 16,
          padding: "12px 14px",
          background: "#F4EFE5",
          border: "0.5px solid #D9C9A6",
          borderRadius: 12,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{
              fontSize: 9, color: "#8A6A3F", letterSpacing: ".18em",
              textTransform: "uppercase" as const, fontWeight: 600,
            }}>
              AXVELA Match
            </span>
            <span style={{
              fontSize: 14, fontWeight: 700, color: "#8A6A3F",
              fontFamily: FONT_HEAD,
              fontVariantNumeric: "tabular-nums",
            }}>
              {score}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#1C1A17", margin: 0, lineHeight: 1.5 }}>
            {reason}
          </p>
        </div>

        {/* Why it matters */}
        <p style={{
          fontSize: 13, color: "#1C1A17", lineHeight: 1.7,
          margin: "0 0 22px",
          paddingLeft: 12, borderLeft: "2px solid #8A6A3F",
        }}>
          {ex.whyItMatters}
        </p>

        {/* Practical info */}
        <div style={{
          background: "#FFFFFF", borderRadius: 12,
          border: "0.5px solid #E7E2D8",
          padding: "14px 16px",
          marginBottom: 16,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {ex.address && <DetailRow icon={<MapPin size={13} strokeWidth={1.5} />}   label="Address" value={ex.address} />}
          {ex.hours   && <DetailRow icon={<Calendar size={13} strokeWidth={1.5} />} label="Hours"   value={ex.hours}   />}
          {/* Ticket fallback — spec: when no ticket info, point to the
              official site instead of leaving the row empty. */}
          <DetailRow
            icon={<Ticket size={13} strokeWidth={1.5} />}
            label="Tickets"
            value={ex.ticketInfo ?? "Visit official website for ticket information."}
          />
          <DetailRow
            icon={<Calendar size={13} strokeWidth={1.5} />}
            label="Reservation required"
            value={ex.reservationUrl ? "Yes — advance booking" : "No"}
          />
        </div>

        {/* External links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ex.reservationUrl && (
            <ExternalRow href={ex.reservationUrl} label="Reservation" />
          )}
          {ex.officialUrl && (
            <ExternalRow href={ex.officialUrl} label="Official site" />
          )}
          {(ex.address || ex.venue) && (
            <ExternalRow
              href={`https://maps.google.com/?q=${encodeURIComponent(`${ex.venue}, ${ex.address ?? ex.city}`)}`}
              label="Open in Maps"
            />
          )}
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "13px 0",
              background: "#1C1A17", color: "#FFFFFF",
              borderRadius: 12, marginTop: 6,
              fontSize: 13, fontWeight: 700, letterSpacing: ".06em",
              textDecoration: "none",
            }}
          >
            <Calendar size={14} strokeWidth={1.6} />
            Add to Calendar
          </a>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
      <span style={{ color: "#8A6A3F", marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 9, color: "#9A9A9A", letterSpacing: ".12em", textTransform: "uppercase" as const, margin: "0 0 2px", fontWeight: 600 }}>
          {label}
        </p>
        <p style={{ fontSize: 12.5, color: "#1C1A17", margin: 0, lineHeight: 1.5 }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ExternalRow({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px",
        background: "#FFFFFF",
        border: "0.5px solid #E7E2D8",
        borderRadius: 12,
        textDecoration: "none",
        fontSize: 12.5, fontWeight: 600, color: "#1C1A17",
      }}
    >
      <span>{label}</span>
      <ExternalLink size={13} strokeWidth={1.6} color="#8A6A3F" />
    </a>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */

export default function ExhibitionsPage() {
  const { state: my }    = useMyActivity();
  const { items: items } = useCollection();
  const { t }            = useLanguage();

  const [tab, setTab]               = useState<TabKey>("near");

  // Multi-city filter — Set of city names (canonical + user-added).
  // Hydrated from localStorage on mount; defaults to ["Seoul"] for
  // first-time visitors so the page isn't empty.
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set(["Seoul"]));
  const [customCities,   setCustomCities]   = useState<string[]>([]);
  const [time,           setTime]           = useState<TimeKey>("3m");
  const [hydrated,       setHydrated]       = useState(false);
  const [savedSet,       setSavedSet]       = useState<Set<string>>(() => readSet(SAVED_KEY));
  const [notifySet,      setNotifySet]      = useState<Set<string>>(() => readSet(NOTIFY_KEY));
  const [detail,         setDetail]         = useState<Exhibition | null>(null);

  // Travel context — destination + trip dates. Persisted to localStorage.
  // Empty start/end means "no active trip" — Travel tab still shows
  // travel-flagged exhibitions with the existing fallback logic.
  const [trip, setTrip] = useState<{ destination: string; start: string; end: string }>({
    destination: "Tokyo",
    start: "",
    end:   "",
  });

  /* Hydrate filters from localStorage */
  useEffect(() => {
    try {
      const c = JSON.parse(window.localStorage.getItem(CITIES_KEY) ?? "null");
      if (Array.isArray(c) && c.length > 0) setSelectedCities(new Set(c.filter(x => typeof x === "string")));
      const cc = JSON.parse(window.localStorage.getItem(CUSTOM_CITIES_KEY) ?? "null");
      if (Array.isArray(cc)) setCustomCities(cc.filter(x => typeof x === "string"));
      const t = window.localStorage.getItem(TIME_KEY);
      if (t && ["now", "1m", "3m", "6m", "1y"].includes(t)) setTime(t as TimeKey);
      const tr = JSON.parse(window.localStorage.getItem(TRIP_KEY) ?? "null");
      if (tr && typeof tr.destination === "string") {
        setTrip({
          destination: tr.destination,
          start: typeof tr.start === "string" ? tr.start : "",
          end:   typeof tr.end   === "string" ? tr.end   : "",
        });
      }
    } catch { /* corrupted store — ignore */ }
    setHydrated(true);
  }, []);

  /* Persist filters whenever they change (skip until hydrated to avoid clobber) */
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(CITIES_KEY, JSON.stringify(Array.from(selectedCities))); } catch {}
  }, [selectedCities, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(CUSTOM_CITIES_KEY, JSON.stringify(customCities)); } catch {}
  }, [customCities, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(TIME_KEY, time); } catch {}
  }, [time, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(TRIP_KEY, JSON.stringify(trip)); } catch {}
  }, [trip, hydrated]);

  /* City toggle — click adds/removes; keep at least one city so the
   * tabs aren't entirely empty. */
  const toggleCity = (name: string) => {
    setSelectedCities(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        if (next.size > 1) next.delete(name);   // never empty
      } else {
        next.add(name);
      }
      return next;
    });
  };

  /* Near me — real geolocation, then resolve to closest known city. */
  const requestNearMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // Browser doesn't support geolocation — fall back to Seoul.
      setSelectedCities(prev => new Set([...prev, "Seoul"]));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const closest = closestKnownCity(pos.coords.latitude, pos.coords.longitude);
        setSelectedCities(prev => new Set([...prev, closest]));
      },
      () => {
        // Permission denied / unavailable — silently fall back, no
        // browser dialog noise. User can pick a city manually.
      },
      { timeout: 8000, maximumAge: 60_000 * 30 },
    );
  };

  /* Add city — V1 simple text prompt. Replace with a dropdown
   * autocomplete once a real city catalogue ships. */
  const addCustomCity = () => {
    if (typeof window === "undefined") return;
    const raw = window.prompt("Add a city");
    if (!raw) return;
    const name = raw.trim();
    if (!name) return;
    if (!customCities.includes(name) && !(CITIES as string[]).includes(name)) {
      setCustomCities(arr => [...arr, name]);
    }
    setSelectedCities(prev => new Set([...prev, name]));
  };

  /* User signal extraction (taste match + Artist Alerts feed) */
  const { knownArtists, patternKeywords, userMovements } = useMemo(() => {
    const artistSet = new Set<string>();
    my.likes.forEach(a => artistSet.add(a.artist_name.toLowerCase()));
    my.saved.forEach(a => artistSet.add(a.artist_name.toLowerCase()));
    items.forEach(i => i.analysis.artist && artistSet.add(i.analysis.artist.toLowerCase()));

    const kwSet = new Set<string>();
    items.forEach(i => (i.analysis.keywords ?? []).forEach(k => kwSet.add(k.toLowerCase())));

    // Movements the user is implicitly "following" via their known artists.
    const movements = new Set<string>();
    artistSet.forEach(name => {
      const ms = ARTIST_MOVEMENT[name];
      if (ms) ms.forEach(m => movements.add(m));
    });
    return { knownArtists: artistSet, patternKeywords: kwSet, userMovements: movements };
  }, [my.likes, my.saved, items]);

  const exhibitions = getExhibitions();

  /* Tab → list filter (multi-city aware) */
  const visible = useMemo<Exhibition[]>(() => {
    const inSelected = (e: Exhibition) => selectedCities.has(e.city);
    let list = exhibitions.filter(e => withinWindow(e, time));

    if (tab === "near") {
      list = list.filter(e => inSelected(e) && !e.travelDestination);
      // Fallback: if "Near You" is empty for the chosen cities, show
      // any exhibition in those cities (incl. travel-destination ones).
      if (list.length === 0) list = exhibitions.filter(e => inSelected(e) && withinWindow(e, time));
    } else if (tab === "travel") {
      // When a trip is active (destination + dates), only show
      // exhibitions in that destination whose window overlaps the
      // trip. Otherwise fall back to the original "travel-flagged
      // exhibitions outside selectedCities" pool.
      const tripActive = trip.destination && trip.start && trip.end;
      if (tripActive) {
        list = exhibitions.filter(e =>
          e.city === trip.destination && overlapsTrip(e, trip.start, trip.end)
        );
      } else {
        list = list.filter(e => e.travelDestination && !inSelected(e));
      }
    } else if (tab === "alerts") {
      list = list.filter(e => e.artists.some(a => knownArtists.has(a.toLowerCase())));
    } else if (tab === "must") {
      list = list.filter(e => e.mustSee && inSelected(e));
      if (list.length === 0) list = exhibitions.filter(e => e.mustSee);
    }

    // Sort by taste match desc.
    return list
      .map(e => ({ ex: e, ...scoreExhibition(e, knownArtists, patternKeywords) }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.ex);
  }, [exhibitions, tab, selectedCities, time, knownArtists, patternKeywords, trip]);

  /* Artist Alerts → Related (movement-based, exclusive of direct hits). */
  const relatedAlerts = useMemo<Exhibition[]>(() => {
    if (tab !== "alerts") return [];
    return exhibitions
      .filter(e => withinWindow(e, time))
      .filter(e => e.movement && userMovements.has(e.movement))
      .filter(e => !e.artists.some(a => knownArtists.has(a.toLowerCase())))
      .map(e => ({ ex: e, ...scoreExhibition(e, knownArtists, patternKeywords) }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.ex);
  }, [exhibitions, tab, time, userMovements, knownArtists, patternKeywords]);

  const toggleSave = (id: string) => {
    setSavedSet(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      writeSet(SAVED_KEY, next);
      return next;
    });
  };
  const toggleNotify = (id: string) => {
    setNotifySet(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      writeSet(NOTIFY_KEY, next);
      return next;
    });
  };

  return (
    <div style={{
      minHeight: "calc(var(--vh, 1vh) * 100)",
      background: "#F8F7F4",
      fontFamily: FONT,
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "52px 22px 88px" }}>
        {/* Brand */}
        <a
          href="/"
          style={{
            display: "inline-block",
            fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
            textTransform: "uppercase" as const, marginBottom: 6,
            textDecoration: "none",
          }}
        >
          {t("common.app_name")}
        </a>

        {/* Page name */}
        <p style={{
          fontSize: 11, color: "#1C1A17",
          letterSpacing: ".18em", textTransform: "uppercase" as const,
          margin: "0 0 16px", fontWeight: 600,
        }}>
          {t("ex.page_name")}
        </p>

        {/* Header copy */}
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: "#111111",
          margin: "0 0 10px",
          fontFamily: FONT_HEAD, letterSpacing: "-.025em", lineHeight: 1.2,
        }}>
          {t("ex.headline")}
        </h1>
        <p style={{ fontSize: 13, color: "#6F6F6F", margin: "0 0 24px", lineHeight: 1.6 }}>
          {t("ex.sub")}
        </p>

        {/* Tabs */}
        <Tabs value={tab} onChange={setTab} />

        {/* Filters */}
        <Filters
          selectedCities={selectedCities}
          customCities={customCities}
          onToggleCity={toggleCity}
          onNearMe={requestNearMe}
          onAddCity={addCustomCity}
          time={time}
          setTime={setTime}
        />

        {/* Travel-only: trip controls + saved cities */}
        {tab === "travel" && (
          <TravelControls
            trip={trip}
            onTrip={setTrip}
            cityOptions={[...CITIES, ...customCities]}
            savedCities={customCities}
          />
        )}

        {/* List */}
        {(() => {
          // Card factory closure — used by every tab + the alerts split.
          const renderCard = (ex: Exhibition) => {
            const { score, reason } = scoreExhibition(ex, knownArtists, patternKeywords);
            const tripActive  = !!trip.start && !!trip.end;
            const onTripBadge = tab === "travel" && tripActive && overlapsTrip(ex, trip.start, trip.end);
            return (
              <ExhibitionCard
                key={ex.id}
                ex={ex}
                score={score}
                reason={reason}
                onTripBadge={onTripBadge}
                saved={savedSet.has(ex.id)}
                notifying={notifySet.has(ex.id)}
                onSave={() => toggleSave(ex.id)}
                onNotify={() => toggleNotify(ex.id)}
                onTickets={() => {
                  const url = ex.reservationUrl || ex.officialUrl;
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                }}
                onDetails={() => setDetail(ex)}
              />
            );
          };

          // Must-See — editorial card variant per spec.
          if (tab === "must") {
            if (visible.length === 0) {
              return (
                <div style={emptyStateStyle()}>
                  No must-see places curated for these cities yet.
                </div>
              );
            }
            return visible.map(ex => (
              <MustSeeCard
                key={ex.id}
                ex={ex}
                onSave={() => toggleSave(ex.id)}
                saved={savedSet.has(ex.id)}
                onDetails={() => setDetail(ex)}
              />
            ));
          }

          // Artist Alerts — two-section editorial split.
          if (tab === "alerts") {
            if (visible.length === 0 && relatedAlerts.length === 0) {
              return (
                <div style={emptyStateStyle()}>
                  Like or save artworks first to surface exhibitions of artists you follow.
                </div>
              );
            }
            return (
              <>
                {visible.length > 0 && (
                  <>
                    <SectionHeading caption="Following" subtitle="Artists you've engaged with" />
                    {visible.map(renderCard)}
                  </>
                )}
                {relatedAlerts.length > 0 && (
                  <>
                    <SectionHeading
                      caption="Related artists & movements"
                      subtitle={
                        userMovements.size > 0
                          ? `Same lineage as ${Array.from(userMovements).slice(0, 2).join(" · ")}`
                          : undefined
                      }
                    />
                    {relatedAlerts.map(renderCard)}
                  </>
                )}
              </>
            );
          }

          // Other tabs — single list with the existing fallback copy.
          if (visible.length === 0) {
            return (
              <div style={emptyStateStyle()}>
                No exhibitions in this window. Try a different time or city.
              </div>
            );
          }
          return visible.map(renderCard);
        })()}
      </div>

      {detail && (() => {
        // Recompute against the same scoring fn so the detail panel
        // shows the exact same number/reason the card surfaced.
        const { score, reason } = scoreExhibition(detail, knownArtists, patternKeywords);
        return (
          <DetailPanel
            ex={detail}
            score={score}
            reason={reason}
            onClose={() => setDetail(null)}
          />
        );
      })()}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function Tabs({ value, onChange }: { value: TabKey; onChange: (t: TabKey) => void }) {
  const { t } = useLanguage();
  const tabs: { id: TabKey; label: string }[] = [
    { id: "near",   label: t("ex.tab_near")   },
    { id: "travel", label: t("ex.tab_travel") },
    { id: "alerts", label: t("ex.tab_alerts") },
    { id: "must",   label: t("ex.tab_must")   },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" as const }}>
      {tabs.map(t => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              flexShrink: 0,
              padding: "8px 14px",
              background: active ? "#1C1A17" : "#FFFFFF",
              border: `0.5px solid ${active ? "#1C1A17" : "#E7E2D8"}`,
              borderRadius: 20, cursor: "pointer",
              color: active ? "#FFFFFF" : "#6F6F6F",
              fontSize: 12, fontWeight: 600, letterSpacing: ".02em",
              fontFamily: FONT,
              transition: "background .12s, color .12s, border-color .12s",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Filters({
  selectedCities, customCities, onToggleCity, onNearMe, onAddCity,
  time, setTime,
}: {
  selectedCities: Set<string>;
  customCities:   string[];
  onToggleCity:   (name: string) => void;
  onNearMe:       () => void;
  onAddCity:      () => void;
  time:           TimeKey;
  setTime:        (t: TimeKey) => void;
}) {
  const timeOptions: { id: TimeKey; label: string }[] = [
    { id: "now", label: "Now" },
    { id: "1m",  label: "1M" },
    { id: "3m",  label: "3M" },
    { id: "6m",  label: "6M" },
    { id: "1y",  label: "1Y" },
  ];
  return (
    <div style={{
      display: "flex", flexDirection: "column" as const, gap: 10,
      padding: "12px 14px", marginBottom: 18,
      background: "#FFFFFF",
      border: "0.5px solid #E7E2D8",
      borderRadius: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
        <span style={{ fontSize: 9, color: "#9A9A9A", letterSpacing: ".18em", textTransform: "uppercase" as const, fontWeight: 600, marginRight: 4 }}>Location</span>

        {/* Near me — triggers real geolocation, never marked active itself
            (the resolved city becomes active in the canonical chip below). */}
        <button onClick={onNearMe} style={pillStyle(false)}>
          <MapPin size={11} strokeWidth={1.6} style={{ marginRight: 4 }} />
          Near me
        </button>

        {/* Canonical 4 cities — toggle in/out of the selectedCities Set. */}
        {CITIES.map(c => (
          <button
            key={c}
            onClick={() => onToggleCity(c)}
            style={pillStyle(selectedCities.has(c))}
          >
            {c}
          </button>
        ))}

        {/* User-added custom cities — same toggle behaviour. */}
        {customCities.map(c => (
          <button
            key={`custom-${c}`}
            onClick={() => onToggleCity(c)}
            style={pillStyle(selectedCities.has(c))}
          >
            {c}
          </button>
        ))}

        <button style={pillStyle(false)} onClick={onAddCity}>
          <Plus size={11} strokeWidth={1.6} style={{ marginRight: 3 }} /> Add city
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
        <span style={{ fontSize: 9, color: "#9A9A9A", letterSpacing: ".18em", textTransform: "uppercase" as const, fontWeight: 600, marginRight: 4 }}>Time</span>
        {timeOptions.map(o => (
          <button key={o.id} onClick={() => setTime(o.id)} style={pillStyle(time === o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Travel controls — destination + dates + saved cities ──────── */

function TravelControls({
  trip, onTrip, cityOptions, savedCities,
}: {
  trip:        { destination: string; start: string; end: string };
  onTrip:      (next: { destination: string; start: string; end: string }) => void;
  cityOptions: string[];
  savedCities: string[];
}) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "0.5px solid #E7E2D8",
      borderRadius: 14,
      padding: "14px 16px",
      marginBottom: 18,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <p style={{
        fontSize: 9, color: "#9A9A9A", letterSpacing: ".18em",
        textTransform: "uppercase" as const, fontWeight: 600,
        margin: 0,
      }}>
        Plan a trip
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <label style={fieldLabelStyle()}>
          <span style={fieldCaptionStyle()}>Destination</span>
          <select
            value={trip.destination}
            onChange={e => onTrip({ ...trip, destination: e.target.value })}
            style={fieldInputStyle()}
          >
            {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={fieldLabelStyle()}>
          <span style={fieldCaptionStyle()}>Start</span>
          <input
            type="date"
            value={trip.start}
            onChange={e => onTrip({ ...trip, start: e.target.value })}
            style={fieldInputStyle()}
          />
        </label>
        <label style={fieldLabelStyle()}>
          <span style={fieldCaptionStyle()}>End</span>
          <input
            type="date"
            value={trip.end}
            onChange={e => onTrip({ ...trip, end: e.target.value })}
            style={fieldInputStyle()}
          />
        </label>
      </div>

      {savedCities.length > 0 && (
        <div>
          <p style={{
            fontSize: 9, color: "#9A9A9A", letterSpacing: ".18em",
            textTransform: "uppercase" as const, fontWeight: 600,
            margin: "0 0 8px",
          }}>
            Saved Cities
          </p>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            {savedCities.map(c => (
              <button
                key={c}
                onClick={() => onTrip({ ...trip, destination: c })}
                style={{
                  padding: "5px 11px",
                  fontSize: 11, fontWeight: 600, letterSpacing: ".02em",
                  background: trip.destination === c ? "#1C1A17" : "transparent",
                  color:      trip.destination === c ? "#FFFFFF" : "#6F6F6F",
                  border:     `0.5px solid ${trip.destination === c ? "#1C1A17" : "#E7E2D8"}`,
                  borderRadius: 16, cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function fieldLabelStyle(): React.CSSProperties {
  return { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 };
}
function fieldCaptionStyle(): React.CSSProperties {
  return {
    fontSize: 8.5, color: "#9A9A9A", letterSpacing: ".14em",
    textTransform: "uppercase" as const, fontWeight: 600,
  };
}
function fieldInputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 10px",
    fontSize: 12, color: "#1C1A17",
    background: "#F8F7F4",
    border: "0.5px solid #E7E2D8",
    borderRadius: 8,
    fontFamily: FONT,
    outline: "none",
  };
}

/* ── Must-See card — editorial / museum-guide tone ──────────────── */

const CATEGORY_LABEL: Record<NonNullable<Exhibition["category"]>, string> = {
  museum:       "Museum",
  gallery:      "Gallery",
  art_district: "Art District",
  landmark:     "Landmark Exhibition",
};

function MustSeeCard({
  ex, saved, onSave, onDetails,
}: {
  ex: Exhibition; saved: boolean; onSave: () => void; onDetails: () => void;
}) {
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(`${ex.venue}, ${ex.address ?? ex.city}`)}`;
  const ticketCopy = ex.ticketInfo ?? "Visit official website for ticket information.";

  return (
    <article style={{
      background: "#FFFFFF",
      border: "0.5px solid #E7E2D8",
      borderRadius: 16,
      padding: "22px 22px 20px",
      marginBottom: 14,
    }}>
      {/* Top caption — category in caps */}
      <p style={{
        fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
        textTransform: "uppercase" as const, fontWeight: 600,
        margin: "0 0 12px",
      }}>
        {ex.category ? CATEGORY_LABEL[ex.category] : "Cultural Place"}
      </p>

      {/* Headline */}
      <h3
        onClick={onDetails}
        style={{
          fontSize: 20, fontWeight: 700, color: "#1C1A17",
          margin: "0 0 6px", letterSpacing: "-.02em", lineHeight: 1.2,
          fontFamily: FONT_HEAD, cursor: "pointer",
        }}
      >
        {ex.title}
      </h3>

      {/* Why it matters — editorial blockquote */}
      <p style={{
        fontSize: 13, color: "#1C1A17", lineHeight: 1.7,
        margin: "0 0 18px", paddingLeft: 12,
        borderLeft: "2px solid #8A6A3F",
        fontStyle: "italic" as const,
      }}>
        {ex.whyItMatters}
      </p>

      {/* Practical info — compact rows, no pricing emphasis */}
      <div style={{
        display: "flex", flexDirection: "column" as const, gap: 8,
        marginBottom: 16,
      }}>
        <PracticalRow icon={<MapPin size={12} strokeWidth={1.5} />} label="Location"        value={`${ex.venue} · ${ex.address ?? ex.city}`} />
        {ex.visitDuration && (
          <PracticalRow icon={<Calendar size={12} strokeWidth={1.5} />} label="Visit"       value={ex.visitDuration} />
        )}
        <PracticalRow icon={<Ticket size={12} strokeWidth={1.5} />}  label="Tickets"        value={ticketCopy} />
      </div>

      {/* Action row — Save + prominent map link, no shopping CTAs */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={onSave}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px",
            background: saved ? "#F4EFE5" : "transparent",
            border: `0.5px solid ${saved ? "#D9C9A6" : "#E7E2D8"}`,
            borderRadius: 18, cursor: "pointer",
            color: saved ? "#8A6A3F" : "#6F6F6F",
            fontSize: 11, fontWeight: 600, letterSpacing: ".04em",
            fontFamily: FONT,
          }}
        >
          {saved ? <BookmarkCheck size={12} strokeWidth={1.6} /> : <Bookmark size={12} strokeWidth={1.6} />}
          {saved ? "Saved" : "Save"}
        </button>

        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px",
            background: "transparent",
            border: "0.5px solid #E7E2D8",
            borderRadius: 18, cursor: "pointer",
            color: "#6F6F6F",
            fontSize: 11, fontWeight: 600, letterSpacing: ".04em",
            fontFamily: FONT, textDecoration: "none",
          }}
        >
          <MapPin size={12} strokeWidth={1.6} />
          Open in Maps
        </a>

        <button
          onClick={onDetails}
          style={{
            marginLeft: "auto",
            padding: "7px 14px",
            background: "#111111", color: "#FFFFFF",
            border: "none", borderRadius: 18, cursor: "pointer",
            fontSize: 11, fontWeight: 600, letterSpacing: ".04em",
            fontFamily: FONT,
          }}
        >
          View Details
        </button>
      </div>
    </article>
  );
}

function PracticalRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span style={{ color: "#8A6A3F", marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 8.5, color: "#9A9A9A", letterSpacing: ".14em",
          textTransform: "uppercase" as const, fontWeight: 600,
          margin: "0 0 2px",
        }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: "#1C1A17", margin: 0, lineHeight: 1.5 }}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ── Editorial section heading (used in Artist Alerts split) ────── */

function SectionHeading({ caption, subtitle }: { caption: string; subtitle?: string }) {
  return (
    <div style={{ margin: "18px 0 10px" }}>
      <p style={{
        fontSize: 9, color: "#8A6A3F", letterSpacing: ".22em",
        textTransform: "uppercase" as const, fontWeight: 600,
        margin: "0 0 4px",
      }}>
        {caption}
      </p>
      {subtitle && (
        <p style={{ fontSize: 11.5, color: "#6F6F6F", margin: 0, fontStyle: "italic" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function emptyStateStyle(): React.CSSProperties {
  return {
    padding: "40px 18px", background: "#FFFFFF",
    border: "0.5px solid #E7E2D8", borderRadius: 14,
    textAlign: "center" as const, color: "#9A9A9A", fontSize: 12,
  };
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center",
    padding: "6px 11px",
    background: active ? "#1C1A17" : "transparent",
    border: `0.5px solid ${active ? "#1C1A17" : "#E7E2D8"}`,
    borderRadius: 16, cursor: "pointer",
    color: active ? "#FFFFFF" : "#6F6F6F",
    fontSize: 11, fontWeight: 600, letterSpacing: ".02em",
    fontFamily: FONT,
    transition: "background .12s, color .12s, border-color .12s",
  };
}
