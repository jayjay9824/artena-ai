/**
 * ARTENA AI — translation dictionaries.
 *
 * Add keys here as components migrate. Adding a new key requires
 * Korean + English entries; missing values fall back to the Korean
 * dictionary in t() at runtime so the UI never renders raw key
 * strings to users.
 *
 * Convention: dot-namespaced keys grouped by surface.
 *   common.* — generic UI verbs (Save / Cancel / Continue …)
 *   nav.*    — navigation labels
 *   home.*   — /analyze home screen
 *   report.* — QuickReport / share viewer
 *   …
 */

export type LanguageCode = "ko" | "en";

export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ["ko", "en"] as const;

export const DEFAULT_LANGUAGE: LanguageCode = "ko";

/** Storage key spec'd by STEP 1. */
export const LANGUAGE_STORAGE_KEY = "artena_language";

type Dictionary = Record<string, string>;

const ko: Dictionary = {
  /* ── common ────────────────────────────────────────────── */
  "common.app_name":         "ARTENA AI",
  "common.tagline":          "Cultural Intelligence AI",
  "common.save":             "저장",
  "common.saved":            "저장됨",
  "common.like":             "좋아요",
  "common.share":            "공유",
  "common.cancel":           "취소",
  "common.continue":         "계속",
  "common.back":             "뒤로",
  "common.close":            "닫기",
  "common.more":             "더 보기",
  "common.less":             "접기",
  "common.loading":          "불러오는 중",
  "common.try_again":        "다시 시도",
  "common.go_home":          "홈으로 가기",

  /* ── navigation ────────────────────────────────────────── */
  "nav.scan":            "스캔",
  "nav.collection":      "컬렉션",
  "nav.taste":           "취향",
  "nav.recommendations": "추천",
  "nav.gallery":         "갤러리",
  "nav.my":              "마이 아카이브",
  "nav.exhibitions":     "전시 & 여행",

  /* ── home ──────────────────────────────────────────────── */
  "home.headline":   "Just Show It.",
  "home.sub":        "작품, 라벨, QR을 보여주면\nARTENA가 맥락과 시장을 읽습니다.",
  "home.scan_cta":   "스캔 시작",
  "home.smart_scan": "Smart Scan",

  /* ── report / share viewer ─────────────────────────────── */
  "report.market_confidence":   "Market Confidence",
  "report.estimated_range":     "Estimated Market Range",
  "report.insufficient_data":   "Insufficient market data",
  "report.unavailable":         "Unavailable",
  "report.ask_artena":          "아르테나 AI에게 더 물어보기",
  "report.deep_dive_caption":   "이 작품을 더 깊이 이해해보세요",
  "report.share_link_copied":   "링크가 복사되었습니다",
  "report.not_found_title":     "분석 결과를 찾을 수 없습니다",
  "report.not_found_body":      "링크가 만료되었거나 분석이 삭제되었을 수 있습니다.",

  /* ── matching ──────────────────────────────────────────── */
  "match.candidates_title":     "We found similar artworks",
  "match.candidates_subtitle":  "Select the correct artwork to continue",
  "match.no_match_title":       "We couldn't match this artwork with high confidence.",
  "match.no_match_body":        "ARTENA only shows results when the artwork can be matched to a reliable record.",
  "match.try_another_image":    "Try another image",
  "match.search_by_text":       "Search by artist or title",
  "match.enter_manually":       "Enter artwork details manually",

  /* ── my archive ────────────────────────────────────────── */
  "my.title":         "My Archive",
  "my.tagline":       "Your personal cultural memory",
  "my.tab_likes":     "Likes",
  "my.tab_saved":     "Saved",
  "my.tab_collections": "Collections",
  "my.tab_recent":    "Recent",
  "my.view_analysis": "View Analysis",
  "my.record_label":  "Record · ARTENA Analysis",

  /* ── taste ─────────────────────────────────────────────── */
  "taste.title":     "Taste Profile",
  "taste.tagline":   "Your cultural intelligence signature",
  "taste.profile_emerging": "Profile Emerging",
  "taste.based_on":         "Based on {n} artworks",
  "taste.key_clusters":     "Key Taste Clusters",

  /* ── recommendations ───────────────────────────────────── */
  "rec.title":           "Recommended",
  "rec.subtitle":        "Based on your taste profile",
  "rec.featured":        "Featured Recommendation",
  "rec.curator_insight": "Curator Insight",

  /* ── exhibitions ───────────────────────────────────────── */
  "ex.page_name":           "Exhibitions & Travel",
  "ex.headline":            "Find exhibitions and cultural places that match your taste.",
  "ex.sub":                 "From your city to your next trip, ARTENA recommends what to see.",
  "ex.tab_near":            "Near You",
  "ex.tab_travel":          "Travel",
  "ex.tab_alerts":          "Artist Alerts",
  "ex.tab_must":            "Must-See",
  "ex.open_during_trip":    "Open during your trip",
  "ex.add_to_calendar":     "Add to Calendar",
  "ex.tickets_fallback":    "Visit official website for ticket information.",

  /* ── gallery ───────────────────────────────────────────── */
  "gallery.title":      "ARTENA Gallery",
  "gallery.subtitle":   "Verified galleries and curated available works",
  "gallery.view_with":  "View with ARTENA AI",
  "gallery.inquire":    "Inquire",
  "gallery.ask":        "Ask Gallery",
  "gallery.price_on_inquiry": "Price available upon inquiry",
};

const en: Dictionary = {
  /* ── common ────────────────────────────────────────────── */
  "common.app_name":         "ARTENA AI",
  "common.tagline":          "Cultural Intelligence AI",
  "common.save":             "Save",
  "common.saved":            "Saved",
  "common.like":             "Like",
  "common.share":            "Share",
  "common.cancel":           "Cancel",
  "common.continue":         "Continue",
  "common.back":             "Back",
  "common.close":            "Close",
  "common.more":             "More",
  "common.less":             "Less",
  "common.loading":          "Loading",
  "common.try_again":        "Try again",
  "common.go_home":          "Go home",

  /* ── navigation ────────────────────────────────────────── */
  "nav.scan":            "Scan",
  "nav.collection":      "Collection",
  "nav.taste":           "Taste",
  "nav.recommendations": "Recommended",
  "nav.gallery":         "Gallery",
  "nav.my":              "My Archive",
  "nav.exhibitions":     "Exhibitions & Travel",

  /* ── home ──────────────────────────────────────────────── */
  "home.headline":   "Just Show It.",
  "home.sub":        "Show ARTENA the artwork, label, or QR —\nit reads the context and the market.",
  "home.scan_cta":   "Start Scan",
  "home.smart_scan": "Smart Scan",

  /* ── report / share viewer ─────────────────────────────── */
  "report.market_confidence":   "Market Confidence",
  "report.estimated_range":     "Estimated Market Range",
  "report.insufficient_data":   "Insufficient market data",
  "report.unavailable":         "Unavailable",
  "report.ask_artena":          "Ask ARTENA more",
  "report.deep_dive_caption":   "Go deeper into this work",
  "report.share_link_copied":   "Link copied",
  "report.not_found_title":     "We couldn't find that report.",
  "report.not_found_body":      "The link may have expired or the analysis may have been removed.",

  /* ── matching ──────────────────────────────────────────── */
  "match.candidates_title":     "We found similar artworks",
  "match.candidates_subtitle":  "Select the correct artwork to continue",
  "match.no_match_title":       "We couldn't match this artwork with high confidence.",
  "match.no_match_body":        "ARTENA only shows results when the artwork can be matched to a reliable record.",
  "match.try_another_image":    "Try another image",
  "match.search_by_text":       "Search by artist or title",
  "match.enter_manually":       "Enter artwork details manually",

  /* ── my archive ────────────────────────────────────────── */
  "my.title":         "My Archive",
  "my.tagline":       "Your personal cultural memory",
  "my.tab_likes":     "Likes",
  "my.tab_saved":     "Saved",
  "my.tab_collections": "Collections",
  "my.tab_recent":    "Recent",
  "my.view_analysis": "View Analysis",
  "my.record_label":  "Record · ARTENA Analysis",

  /* ── taste ─────────────────────────────────────────────── */
  "taste.title":     "Taste Profile",
  "taste.tagline":   "Your cultural intelligence signature",
  "taste.profile_emerging": "Profile Emerging",
  "taste.based_on":         "Based on {n} artworks",
  "taste.key_clusters":     "Key Taste Clusters",

  /* ── recommendations ───────────────────────────────────── */
  "rec.title":           "Recommended",
  "rec.subtitle":        "Based on your taste profile",
  "rec.featured":        "Featured Recommendation",
  "rec.curator_insight": "Curator Insight",

  /* ── exhibitions ───────────────────────────────────────── */
  "ex.page_name":           "Exhibitions & Travel",
  "ex.headline":            "Find exhibitions and cultural places that match your taste.",
  "ex.sub":                 "From your city to your next trip, ARTENA recommends what to see.",
  "ex.tab_near":            "Near You",
  "ex.tab_travel":          "Travel",
  "ex.tab_alerts":          "Artist Alerts",
  "ex.tab_must":            "Must-See",
  "ex.open_during_trip":    "Open during your trip",
  "ex.add_to_calendar":     "Add to Calendar",
  "ex.tickets_fallback":    "Visit official website for ticket information.",

  /* ── gallery ───────────────────────────────────────────── */
  "gallery.title":      "ARTENA Gallery",
  "gallery.subtitle":   "Verified galleries and curated available works",
  "gallery.view_with":  "View with ARTENA AI",
  "gallery.inquire":    "Inquire",
  "gallery.ask":        "Ask Gallery",
  "gallery.price_on_inquiry": "Price available upon inquiry",
};

export const translations: Record<LanguageCode, Dictionary> = { ko, en };

/** Type-safe key extraction — every key from the ko dictionary is canonical. */
export type TranslationKey = keyof typeof ko;
