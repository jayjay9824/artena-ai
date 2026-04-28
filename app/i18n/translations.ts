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
  "nav.my":              "My",
  "nav.exhibitions":     "전시 & 여행",

  /* ── home ──────────────────────────────────────────────── */
  "home.headline":          "Just Show It.",
  "home.sub":               "작품, 라벨, QR을 보여주면\nARTENA가 맥락과 시장을 읽습니다.",
  "home.smart_scan":        "Smart Scan",
  "home.smart_scan_badge":  "Smart Scan",
  "home.smart_scan_desc":   "작품, 설명, QR을 한 번에 인식합니다.",
  "home.scan_cta":          "스캔 시작",
  "home.tag_artwork":       "작품",
  "home.tag_label":         "설명",
  "home.tag_qr":            "QR",
  "home.alt_inputs_title":  "추가 입력 방법",
  "home.upload":            "이미지 업로드",
  "home.upload_sub":        "JPG / PNG / WEBP",
  "home.camera":            "카메라 촬영",
  "home.camera_sub":        "직접 찍기",
  "home.text_search":       "텍스트 검색",
  "home.text_search_sub":   "작가·작품 검색",
  "home.search_placeholder":"작가명 또는 작품명 입력",
  "home.search_button":     "검색",

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
  "match.candidates_title":     "유사한 작품을 찾았습니다",
  "match.candidates_subtitle":  "정확한 작품을 선택해주세요",
  "match.no_match_title":       "이 작품을 신뢰할 수 있는 기록과 매칭하지 못했습니다.",
  "match.no_match_body":        "ARTENA는 신뢰 가능한 기록과 매칭된 결과만 보여드립니다.",
  "match.try_another_image":    "다른 이미지로 시도",
  "match.search_by_text":       "작가명 또는 작품명으로 검색",
  "match.enter_manually":       "직접 작품 정보 입력",

  /* ── my archive ────────────────────────────────────────── */
  "my.title":           "나의 아카이브",
  "my.tagline":         "나의 문화 기록",
  "my.tab_likes":       "좋아요",
  "my.tab_saved":       "저장",
  "my.tab_collections": "컬렉션",
  "my.tab_recent":      "최근",
  "my.view_analysis":   "분석 보기",
  "my.record_label":    "기록 · ARTENA 분석",

  /* ── collection (shared with my archive) ───────────────── */
  "collection.subtitle":  "저장한 작품과 컬렉션을 한 곳에서",

  /* ── taste ─────────────────────────────────────────────── */
  "taste.title":                 "취향 프로필",
  "taste.tagline":               "나의 문화 지능 시그니처",
  "taste.profile_emerging":      "Profile Emerging",
  "taste.based_on":              "{n}개 작품 기반",
  "taste.key_clusters":          "핵심 취향 클러스터",
  "taste.dimensions_title":      "취향 차원",
  "taste.visual_patterns_title": "시각 패턴",
  "taste.insight_title":         "취향 인사이트",
  "taste.explore_recs_cta":      "추천 보기",
  "taste.view_collection_cta":   "컬렉션 보기",
  "taste.exhibitions_cta":       "전시 & 여행",

  /* ── recommendations ───────────────────────────────────── */
  "rec.title":            "추천",
  "rec.subtitle":         "취향 프로필 기반 추천",
  "rec.featured":         "주요 추천 작품",
  "rec.curator_insight":  "큐레이터 인사이트",
  "rec.curated_for_you":  "당신을 위한 큐레이션",
  "rec.like":             "좋아요",
  "rec.save":             "저장",
  "rec.report":           "리포트",

  /* ── exhibitions ───────────────────────────────────────── */
  "ex.page_name":           "전시 & 여행",
  "ex.headline":            "취향에 맞는 전시와 문화 공간을 찾아보세요.",
  "ex.sub":                 "오늘의 도시부터 다음 여행지까지, ARTENA가 볼만한 곳을 추천합니다.",
  "ex.tab_near":            "Near You",
  "ex.tab_travel":          "Travel",
  "ex.tab_alerts":          "Artist Alerts",
  "ex.tab_must":            "Must-See",
  "ex.open_during_trip":    "여행 기간 동안 관람 가능",
  "ex.add_to_calendar":     "캘린더에 추가",
  "ex.tickets_fallback":    "티켓 정보는 공식 웹사이트를 방문해주세요.",

  /* ── gallery ───────────────────────────────────────────── */
  "gallery.title":              "ARTENA 갤러리",
  "gallery.subtitle":           "검증된 갤러리와 큐레이션 작품",
  "gallery.filter_all":         "전체",
  "gallery.filter_hold":        "홀드 가능",
  "gallery.filter_price":       "가격 공개",
  "gallery.galleries":          "갤러리",
  "gallery.view_with":          "ARTENA AI로 보기",
  "gallery.inquire":            "문의하기",
  "gallery.ask":                "갤러리에 질문하기",
  "gallery.price_on_inquiry":   "가격은 문의 시 확인 가능",
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
  "nav.recommendations": "For You",
  "nav.gallery":         "Gallery",
  "nav.my":              "My",
  "nav.exhibitions":     "Exhibitions & Travel",

  /* ── home ──────────────────────────────────────────────── */
  "home.headline":          "Just Show It.",
  "home.sub":               "Show ARTENA the artwork, label, or QR —\nit reads the context and the market.",
  "home.smart_scan":        "Smart Scan",
  "home.smart_scan_badge":  "Smart Scan",
  "home.smart_scan_desc":   "Recognize artwork, label, or QR in one step.",
  "home.scan_cta":          "Start Scan",
  "home.tag_artwork":       "Artwork",
  "home.tag_label":         "Label",
  "home.tag_qr":            "QR",
  "home.alt_inputs_title":  "Other ways to start",
  "home.upload":            "Upload Image",
  "home.upload_sub":        "JPG / PNG / WEBP",
  "home.camera":            "Take Photo",
  "home.camera_sub":        "Use camera",
  "home.text_search":       "Text Search",
  "home.text_search_sub":   "Artist · Title",
  "home.search_placeholder":"Artist or artwork title",
  "home.search_button":     "Search",

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
  "my.title":           "My Archive",
  "my.tagline":         "Your personal cultural memory",
  "my.tab_likes":       "Likes",
  "my.tab_saved":       "Saved",
  "my.tab_collections": "Collections",
  "my.tab_recent":      "Recent",
  "my.view_analysis":   "View Analysis",
  "my.record_label":    "Record · ARTENA Analysis",

  /* ── collection (shared with my archive) ───────────────── */
  "collection.subtitle":  "Your saved artworks, likes, and curated collections",

  /* ── taste ─────────────────────────────────────────────── */
  "taste.title":                 "Taste Profile",
  "taste.tagline":               "Your cultural intelligence signature",
  "taste.profile_emerging":      "Profile Emerging",
  "taste.based_on":              "Based on {n} artworks",
  "taste.key_clusters":          "Key Taste Clusters",
  "taste.dimensions_title":      "Taste Dimensions",
  "taste.visual_patterns_title": "Visual Patterns",
  "taste.insight_title":         "Taste Insight",
  "taste.explore_recs_cta":      "Explore Recommendations",
  "taste.view_collection_cta":   "View Collection",
  "taste.exhibitions_cta":       "Exhibitions & Travel",

  /* ── recommendations ───────────────────────────────────── */
  "rec.title":            "Recommended",
  "rec.subtitle":         "Based on your taste profile",
  "rec.featured":         "Featured Recommendation",
  "rec.curator_insight":  "Curator Insight",
  "rec.curated_for_you":  "Curated for you",
  "rec.like":             "Like",
  "rec.save":             "Save",
  "rec.report":           "Report",

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
  "gallery.title":              "ARTENA Gallery",
  "gallery.subtitle":           "Verified galleries and curated available works",
  "gallery.filter_all":         "All",
  "gallery.filter_hold":        "Hold Available",
  "gallery.filter_price":       "Price Visible",
  "gallery.galleries":          "Galleries",
  "gallery.view_with":          "View with ARTENA AI",
  "gallery.inquire":            "Inquire",
  "gallery.ask":                "Ask Gallery",
  "gallery.price_on_inquiry":   "Price available upon inquiry",
};

export const translations: Record<LanguageCode, Dictionary> = { ko, en };

/** Type-safe key extraction — every key from the ko dictionary is canonical. */
export type TranslationKey = keyof typeof ko;
