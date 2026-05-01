/**
 * AXVELA AI — translation dictionaries.
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
  /* ── brand (AXVELA rebrand) ────────────────────────────── */
  "brand.name":      "AXVELA AI",
  "brand.shortName": "AXVELA",
  "brand.scanner":   "AXVELA Scanner",

  /* ── common ────────────────────────────────────────────── */
  "common.app_name":         "AXVELA AI",
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
  "nav.my":              "프로필",
  "nav.exhibitions":     "전시 & 여행",

  /* ── home ──────────────────────────────────────────────── */
  "home.subtitle":          "AI 아트 분석",
  "home.scan_label":        "스캔",
  "home.headline":          "Just Show It.",
  "home.sub":               "작품, 라벨, QR을 보여주면\nAXVELA가 맥락과 시장을 읽습니다.",
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
  "report.ask_artena":          "AXVELA AI에게 더 물어보기",
  "report.deep_dive_caption":   "이 작품을 더 깊이 이해해보세요",
  "report.share_link_copied":   "링크가 복사되었습니다",
  "report.not_found_title":     "분석 결과를 찾을 수 없습니다",
  "report.not_found_body":      "링크가 만료되었거나 분석이 삭제되었을 수 있습니다.",

  /* ── matching ──────────────────────────────────────────── */
  "match.candidates_title":     "유사한 작품을 찾았습니다",
  "match.candidates_subtitle":  "정확한 작품을 선택해주세요",
  "match.no_match_title":       "이 작품을 신뢰할 수 있는 기록과 매칭하지 못했습니다.",
  "match.no_match_body":        "AXVELA는 신뢰 가능한 기록과 매칭된 결과만 보여드립니다.",
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
  "my.record_label":    "기록 · AXVELA 분석",

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
  "ex.sub":                 "오늘의 도시부터 다음 여행지까지, AXVELA가 볼만한 곳을 추천합니다.",
  "ex.tab_near":            "Near You",
  "ex.tab_travel":          "Travel",
  "ex.tab_alerts":          "Artist Alerts",
  "ex.tab_must":            "Must-See",
  "ex.open_during_trip":    "여행 기간 동안 관람 가능",
  "ex.add_to_calendar":     "캘린더에 추가",
  "ex.tickets_fallback":    "티켓 정보는 공식 웹사이트를 방문해주세요.",

  /* ── staged analysis (STEP 1) ──────────────────────────── */
  "stage.basic":       "기본 정보",
  "stage.market":      "시장 분석",
  "stage.price":       "가격 추정",
  "stage.comparables": "유사 작품",

  /* ── stage labels + captions (FIXES v3 STEP 6) ─────────── */
  "stage.label.basic":               "기본 정보",
  "stage.label.market":              "시장 분석",
  "stage.label.price":               "가격 추정",
  "stage.label.comparables":         "유사 사례",
  "stage.caption.basic":             "기본 정보를 확인하고 있어요",
  "stage.caption.market":            "시장 데이터를 살피고 있어요",
  "stage.caption.price":             "가격대를 추정하고 있어요",
  "stage.caption.comparables":       "유사 거래 사례를 모으고 있어요",
  "stage.caption.reading_image":     "엑스벨라가 작품을 분석하고 있습니다",
  "stage.caption.background_notice": "곧 Quick View가 표시됩니다 — 시장 분석은 백그라운드에서 계속됩니다",

  /* ── camera transition + minimal quick view ────────────── */
  "transition.analyzing": "분석 중…",
  "quick.ask":            "물어보기",
  "quick.save":           "저장",
  "quick.saved":          "저장됨",

  /* ── cultural heritage intelligence (object-category dispatch) ── */
  "cultural.heritage_intelligence":  "문화유산 인텔리전스",
  "cultural.market_hidden":          "시장 정보가 적용되지 않는 객체입니다",
  "cultural.period":                 "시대",
  "cultural.region":                 "지역",
  "cultural.material":               "재료",
  "cultural.purpose":                "용도",
  "cultural.historical_context":     "역사적 맥락",
  "cultural.exhibition_info":        "전시 정보",
  "cultural.original_label":         "원문 라벨",

  /* ── QR intelligence (STEP 3) ─────────────────────────── */
  "qr.app_detected_title":          "이 QR은 앱 다운로드 또는 안내 링크로 보입니다.",
  "qr.app_detected_body":           "AXVELA 리포트는 생성되지 않습니다. 작품을 직접 촬영해 주세요.",
  "qr.cannot_analyze_title":        "이 QR은 직접 분석할 수 없습니다.",
  "qr.cannot_analyze_body":         "작품을 촬영하거나 설명 라벨을 촬영하면 분석을 계속할 수 있습니다.",
  "qr.scan_artwork":                "작품 촬영하기",
  "qr.scan_label_fallback":         "작품 설명 촬영하기",
  "qr.search_by_text":              "텍스트로 검색하기",
  "qr.multiple_detected":           "여러 개의 QR이 감지됨",
  "qr.label_unknown":               "알 수 없는 QR",
  "qr.label_artwork_info":          "작품 정보",
  "qr.label_exhibition_info":       "전시 정보",
  "qr.label_museum_guide":          "뮤지엄 가이드",
  "qr.label_ios_app":               "iOS 앱",
  "qr.label_android_app":           "Android 앱",

  /* ── recognition confidence (STEP 2) ─────────────────── */
  "recognition.partial_notice":          "일부 정보가 불확실합니다. 작품 라벨을 함께 촬영하면 정확도가 높아집니다.",
  "recognition.uncertain_title":         "작품 정보를 정확히 확인하기 어렵습니다.",
  "recognition.uncertain_description":   "작품 옆 설명 라벨을 촬영하면 더 정확하게 분석할 수 있습니다.",
  "recognition.scan_label":              "작품 설명 촬영하기",
  "recognition.search_by_text":          "텍스트로 검색하기",
  "recognition.continue_anyway":         "그래도 현재 결과 보기",
  "recognition.image_only_limited":      "이미지만으로는 정확한 식별이 어렵습니다.",
  "recognition.label_to_improve":        "작품 설명 라벨을 촬영하면 정확도가 높아집니다.",
  "scanner.scan_label_mode":             "S C A N   L A B E L",

  /* ── confirm-before-analyze (camera) ───────────────────── */
  "scanner.confirm_caption":             "작품 감지됨",
  "scanner.confirm_question":            "이 작품을 분석할까요?",
  "scanner.confirm_cta":                 "분석 시작",
  "scanner.confirm_rescan":              "다시 스캔",

  /* ── AXVELA Mode System (Step 4) ───────────────────────── */
  "mode.appreciation":                    "감상",
  "mode.investment":                      "투자",
  "mode.expert":                          "전문가",

  /* ── AXVELA AI floating launcher ───────────────────────── */
  "axvela.cta.title":                     "AXVELA AI",
  "axvela.cta.subtitle":                  "작품에 대해 무엇이든 물어보세요",
  "axvela.cta.aria_label":                "AXVELA AI 모드 활성화",
  "axvela.modal.title":                   "AXVELA AI",
  "axvela.modal.placeholder":             "작품에 대해 물어보세요…",
  "axvela.modal.empty_title":             "무엇이든 물어보세요",
  "axvela.modal.empty_body":              "미술사, 작가, 시장, 감상법 — AXVELA AI가 함께합니다.",
  "axvela.modal.error":                   "답변 생성 중 오류가 발생했습니다. 다시 시도해 주세요.",
  "axvela.modal.close":                   "닫기",
  "axvela.chip.artist":                   "이 작가에 대해 알려줘",
  "axvela.chip.value":                    "투자 가치는?",
  "axvela.chip.similar":                  "비슷한 작품 추천",

  /* ── AXVELA AI Mode Overlay (Phase 3) ─────────────────── */
  "ai_overlay.title":                     "AXVELA AI",
  "ai_overlay.aria_label":                "AXVELA AI 어시스턴트",
  "ai_overlay.greeting_main":             "안녕하세요,\n지니님 ✦",
  "ai_overlay.greeting_pre":              "작품, 작가, 시장 맥락을 분석하고\n당신의 아트 컬렉션을 더 ",
  "ai_overlay.greeting_highlight":        "특별하게",
  "ai_overlay.greeting_post":             " 만들어 드릴게요.",
  "ai_overlay.input_placeholder":         "무엇이든 물어보세요...",
  "ai_overlay.disclaimer":                "AI는 실수를 할 수 있습니다. 중요한 정보는 확인해주세요.",
  "ai_overlay.back":                      "뒤로",
  "ai_overlay.history":                   "기록",
  "ai_overlay.settings":                  "설정",
  "ai_overlay.mic":                       "음성 입력",
  "ai_overlay.send":                      "보내기",

  "profile.title":        "프로필",
  "profile.tagline":      "나의 AXVELA",
  "profile.saved_count":  "저장한 작품",
  "profile.language":     "언어",
  "collection.empty":     "저장한 작품이 아직 없습니다",

  /* ── camera intelligence layer ─────────────────────────── */
  "scanner.title":             "AXVELA Scanner",
  "scanner.permission_title":  "카메라 사용 권한",
  "scanner.permission_body":   "카메라 접근을 허용하면 작품, 설명, QR을 바로 인식할 수 있습니다.",
  "scanner.denied_title":      "카메라 접근이 차단되었습니다",
  "scanner.enable_camera":     "카메라 켜기",
  "scanner.upload_image":      "이미지 업로드",
  "scanner.search_by_text":    "텍스트로 검색",
  "scanner.toggle_flash":      "플래시 전환",
  "scanner.status_starting":         "카메라를 준비하는 중…",
  "scanner.status_idle":             "작품, 설명, 또는 QR을 비춰주세요",
  "scanner.status_detecting":        "시각 신호를 분석 중",
  "scanner.status_artwork_detected": "작품 감지됨",
  "scanner.status_label_detected":   "설명을 읽고 있습니다",
  "scanner.status_qr_detected":      "QR 데이터 추출 중",
  "scanner.status_locking":          "대상 고정",
  "scanner.status_analyzing":        "AXVELA 리포트 생성 중",
  "scanner.status_success":          "리포트 준비 완료",
  "scanner.status_failed":           "대상을 인식하지 못했습니다",
  "scanner.box_artwork":             "작품 감지됨",
  "scanner.box_label":               "설명 감지됨",
  "scanner.box_qr":                  "QR 감지됨",
  "scanner.fallback_title":          "대상을 정확히 인식하지 못했습니다.",
  "scanner.fallback_subtitle":       "다른 방법으로 작품 정보를 가져올 수 있습니다.",
  "scanner.fallback_upload":         "이미지 업로드",
  "scanner.fallback_label":          "작품 설명 촬영",
  "scanner.fallback_search":         "텍스트 검색",
  "scanner.upload_label":            "이미지 업로드",
  "scanner.upload_calm_clearer":     "더 선명한 작품 이미지를 사용해보세요.",
  "scanner.upload_calm_more_detail": "더 자세한 정보가 있으면 작품을 더 잘 인식할 수 있어요.",

  /* ── offline queue (STEP 3) ────────────────────────────── */
  "offline.saved_locally":  "오프라인 상태입니다. 온라인에 연결되면 자동으로 분석합니다.",

  /* ── label translation (STEP 4) ────────────────────────── */
  "label.view_original":   "원본 라벨 보기",
  "label.view_translated": "번역 보기",

  /* ── Ask AXVELA chips (STEP 6) ─────────────────────────── */
  "ask.chip_major_works":     "대표작은?",
  "ask.chip_price_range":     "가격 range?",
  "ask.chip_similar_artists": "비슷한 작가?",
  "ask.chip_exhibitions":     "전시 정보?",
  "ask.chip_importance":      "이 작품 왜 중요한가요?",
  "ask.chip_history":         "역사적 의의는?",
  "ask.chip_similar_works":   "비슷한 작품은?",
  "ask.chip_period":          "어느 시대 작품인가요?",
  "ask.chip_where_visible":   "어디서 볼 수 있나요?",
  "ask.chip_market_trend":    "시장 흐름은?",
  "ask.chip_concept":         "어떤 개념인가요?",
  "ask.chip_market_position": "시장 위치는?",
  "ask.chip_cultural_period":   "어떤 시대의 것인가요?",
  "ask.chip_cultural_material": "어떤 재료로 만들어졌나요?",
  "ask.chip_cultural_meaning":  "역사적 의미는 무엇인가요?",
  "ask.chip_cultural_label":    "원문 라벨을 설명해 주세요",
  "ask.cultural_context_instead": "이 대상은 시장 가격보다 문화적 맥락으로 이해하는 것이 적합합니다.",
  "ask.price_blocked_for_non_artwork": "이 대상은 시장 가격 정보가 적용되지 않습니다.",
  "ask.placeholder":          "이 작품에 대해 더 물어보세요",
  "ask.previously_explored":  "이전에 둘러본 흔적",
  "ask.view_previous_insights": "이전 인사이트 보기",

  /* ── gallery ───────────────────────────────────────────── */
  "gallery.title":              "AXVELA 갤러리",
  "gallery.subtitle":           "검증된 갤러리와 큐레이션 작품",
  "gallery.filter_all":         "전체",
  "gallery.filter_hold":        "홀드 가능",
  "gallery.filter_price":       "가격 공개",
  "gallery.galleries":          "갤러리",
  "gallery.view_with":          "AXVELA AI로 보기",
  "gallery.inquire":            "문의하기",
  "gallery.ask":                "갤러리에 질문하기",
  "gallery.price_on_inquiry":   "가격은 문의 시 확인 가능",
};

const en: Dictionary = {
  /* ── brand (AXVELA rebrand) ────────────────────────────── */
  "brand.name":      "AXVELA AI",
  "brand.shortName": "AXVELA",
  "brand.scanner":   "AXVELA Scanner",

  /* ── common ────────────────────────────────────────────── */
  "common.app_name":         "AXVELA AI",
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
  "nav.my":              "Profile",
  "nav.exhibitions":     "Exhibitions & Travel",

  /* ── home ──────────────────────────────────────────────── */
  "home.subtitle":          "AI ART ANALYSIS",
  "home.scan_label":        "SCAN",
  "home.headline":          "Just Show It.",
  "home.sub":               "Show AXVELA the artwork, label, or QR —\nit reads the context and the market.",
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
  "report.ask_artena":          "Ask AXVELA more",
  "report.deep_dive_caption":   "Go deeper into this work",
  "report.share_link_copied":   "Link copied",
  "report.not_found_title":     "We couldn't find that report.",
  "report.not_found_body":      "The link may have expired or the analysis may have been removed.",

  /* ── matching ──────────────────────────────────────────── */
  "match.candidates_title":     "We found similar artworks",
  "match.candidates_subtitle":  "Select the correct artwork to continue",
  "match.no_match_title":       "We couldn't match this artwork with high confidence.",
  "match.no_match_body":        "AXVELA only shows results when the artwork can be matched to a reliable record.",
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
  "my.record_label":    "Record · AXVELA Analysis",

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
  "ex.sub":                 "From your city to your next trip, AXVELA recommends what to see.",
  "ex.tab_near":            "Near You",
  "ex.tab_travel":          "Travel",
  "ex.tab_alerts":          "Artist Alerts",
  "ex.tab_must":            "Must-See",
  "ex.open_during_trip":    "Open during your trip",
  "ex.add_to_calendar":     "Add to Calendar",
  "ex.tickets_fallback":    "Visit official website for ticket information.",

  /* ── staged analysis (STEP 1) ──────────────────────────── */
  "stage.basic":       "Basic info",
  "stage.market":      "Market analysis",
  "stage.price":       "Price estimate",
  "stage.comparables": "Comparables",

  /* ── stage labels + captions (FIXES v3 STEP 6) ─────────── */
  "stage.label.basic":               "Basic info",
  "stage.label.market":              "Market analysis",
  "stage.label.price":               "Price estimate",
  "stage.label.comparables":         "Comparables",
  "stage.caption.basic":             "Reading basic information",
  "stage.caption.market":            "Analyzing market data",
  "stage.caption.price":             "Estimating price range",
  "stage.caption.comparables":       "Gathering comparable sales",
  "stage.caption.reading_image":     "AXVELA is analyzing the artwork",
  "stage.caption.background_notice": "Quick View will appear shortly — market analysis continues in background",

  /* ── camera transition + minimal quick view ────────────── */
  "transition.analyzing": "Analyzing…",
  "quick.ask":            "Ask",
  "quick.save":           "Save",
  "quick.saved":          "Saved",

  /* ── cultural heritage intelligence (object-category dispatch) ── */
  "cultural.heritage_intelligence":  "Cultural Heritage Intelligence",
  "cultural.market_hidden":          "Market intelligence does not apply to this object",
  "cultural.period":                 "Period",
  "cultural.region":                 "Region",
  "cultural.material":               "Material",
  "cultural.purpose":                "Purpose",
  "cultural.historical_context":     "Historical Context",
  "cultural.exhibition_info":        "Exhibition Info",
  "cultural.original_label":         "Original Label",

  /* ── QR intelligence (STEP 3) ─────────────────────────── */
  "qr.app_detected_title":          "This QR appears to be an app download or guide link.",
  "qr.app_detected_body":           "No AXVELA report will be generated. Try scanning the artwork directly.",
  "qr.cannot_analyze_title":        "This QR cannot be analyzed directly.",
  "qr.cannot_analyze_body":         "Scan the artwork or label to continue.",
  "qr.scan_artwork":                "Scan Artwork",
  "qr.scan_label_fallback":         "Scan Label",
  "qr.search_by_text":              "Search by Text",
  "qr.multiple_detected":           "Multiple QR codes detected",
  "qr.label_unknown":               "Unknown QR",
  "qr.label_artwork_info":          "Artwork Info",
  "qr.label_exhibition_info":       "Exhibition Info",
  "qr.label_museum_guide":          "Museum Guide",
  "qr.label_ios_app":               "iOS App",
  "qr.label_android_app":           "Android App",

  /* ── recognition confidence (STEP 2) ─────────────────── */
  "recognition.partial_notice":          "Some details may be uncertain. Scan the artwork label to improve accuracy.",
  "recognition.uncertain_title":         "Artwork identification is uncertain.",
  "recognition.uncertain_description":   "Scan the artwork label for a more accurate result.",
  "recognition.scan_label":              "Scan Label",
  "recognition.search_by_text":          "Search by Text",
  "recognition.continue_anyway":         "Continue Anyway",
  "recognition.image_only_limited":      "Image-only recognition is limited.",
  "recognition.label_to_improve":        "Scan the artwork label to improve accuracy.",
  "scanner.scan_label_mode":             "S C A N   L A B E L",

  /* ── confirm-before-analyze (camera) ───────────────────── */
  "scanner.confirm_caption":             "Artwork detected",
  "scanner.confirm_question":            "Analyze this artwork?",
  "scanner.confirm_cta":                 "Analyze",
  "scanner.confirm_rescan":              "Rescan",

  /* ── AXVELA Mode System (Step 4) ───────────────────────── */
  "mode.appreciation":                    "Appreciation",
  "mode.investment":                      "Investment",
  "mode.expert":                          "Expert",

  /* ── AXVELA AI floating launcher ───────────────────────── */
  "axvela.cta.title":                     "AXVELA AI",
  "axvela.cta.subtitle":                  "Ask anything about art",
  "axvela.cta.aria_label":                "Activate AXVELA AI mode",
  "axvela.modal.title":                   "AXVELA AI",
  "axvela.modal.placeholder":             "Ask anything about art…",
  "axvela.modal.empty_title":             "Ask anything",
  "axvela.modal.empty_body":              "Art history, artists, markets, how to look — AXVELA AI is here.",
  "axvela.modal.error":                   "Sorry, something went wrong. Please try again.",
  "axvela.modal.close":                   "Close",
  "axvela.chip.artist":                   "Tell me about this artist",
  "axvela.chip.value":                    "What's the investment value?",
  "axvela.chip.similar":                  "Recommend similar works",

  /* ── AXVELA AI Mode Overlay (Phase 3) ─────────────────── */
  "ai_overlay.title":                     "AXVELA AI",
  "ai_overlay.aria_label":                "AXVELA AI assistant",
  "ai_overlay.greeting_main":             "Hello,\nGenie ✦",
  "ai_overlay.greeting_pre":              "I'll read artworks, artists, and market context\nto make your art collection ",
  "ai_overlay.greeting_highlight":        "more meaningful",
  "ai_overlay.greeting_post":             ".",
  "ai_overlay.input_placeholder":         "Ask anything...",
  "ai_overlay.disclaimer":                "AI can make mistakes. Verify important information.",
  "ai_overlay.back":                      "Back",
  "ai_overlay.history":                   "History",
  "ai_overlay.settings":                  "Settings",
  "ai_overlay.mic":                       "Voice input",
  "ai_overlay.send":                      "Send",

  "profile.title":        "Profile",
  "profile.tagline":      "Your AXVELA",
  "profile.saved_count":  "Saved works",
  "profile.language":     "Language",
  "collection.empty":     "Nothing saved yet",

  /* ── camera intelligence layer ─────────────────────────── */
  "scanner.title":             "AXVELA Scanner",
  "scanner.permission_title":  "Camera Access",
  "scanner.permission_body":   "Allow camera access to read artwork, labels, and QR.",
  "scanner.denied_title":      "Camera access blocked",
  "scanner.enable_camera":     "Enable Camera",
  "scanner.upload_image":      "Upload Image Instead",
  "scanner.search_by_text":    "Search by Text",
  "scanner.toggle_flash":      "Toggle flash",
  "scanner.status_starting":         "Starting camera…",
  "scanner.status_idle":             "Point at artwork, label, or QR",
  "scanner.status_detecting":        "Reading visual signals",
  "scanner.status_artwork_detected": "Artwork detected",
  "scanner.status_label_detected":   "Reading label information",
  "scanner.status_qr_detected":      "Extracting QR data",
  "scanner.status_locking":          "Target locked",
  "scanner.status_analyzing":        "Building AXVELA report",
  "scanner.status_success":          "Report ready",
  "scanner.status_failed":           "Couldn't recognize the target",
  "scanner.box_artwork":             "Artwork detected",
  "scanner.box_label":               "Label detected",
  "scanner.box_qr":                  "QR detected",
  "scanner.fallback_title":          "Couldn't recognize the target clearly.",
  "scanner.fallback_subtitle":       "Try another way to bring in artwork details.",
  "scanner.fallback_upload":         "Upload Image",
  "scanner.fallback_label":          "Scan Label Manually",
  "scanner.fallback_search":         "Search by Text",
  "scanner.upload_label":            "Upload image",
  "scanner.upload_calm_clearer":     "Try a clearer image of the artwork.",
  "scanner.upload_calm_more_detail": "More detail may help reveal the artwork.",

  /* ── offline queue (STEP 3) ────────────────────────────── */
  "offline.saved_locally":  "Saved locally. Will analyze when online.",

  /* ── label translation (STEP 4) ────────────────────────── */
  "label.view_original":   "View Original Label",
  "label.view_translated": "View Translation",

  /* ── Ask AXVELA chips (STEP 6) ─────────────────────────── */
  "ask.chip_major_works":     "Major works?",
  "ask.chip_price_range":     "Price range?",
  "ask.chip_similar_artists": "Similar artists?",
  "ask.chip_exhibitions":     "Exhibitions?",
  "ask.chip_importance":      "Why is this work important?",
  "ask.chip_history":         "Historical significance?",
  "ask.chip_similar_works":   "Similar works?",
  "ask.chip_period":          "What period is this from?",
  "ask.chip_where_visible":   "Where can I see it?",
  "ask.chip_market_trend":    "Market trend?",
  "ask.chip_concept":         "What's the concept?",
  "ask.chip_market_position": "Market position?",
  "ask.chip_cultural_period":   "What period is this from?",
  "ask.chip_cultural_material": "What material is it made of?",
  "ask.chip_cultural_meaning":  "What is its historical meaning?",
  "ask.chip_cultural_label":    "Explain the original label",
  "ask.cultural_context_instead": "This object is better understood through cultural context rather than market price.",
  "ask.price_blocked_for_non_artwork": "Market price intelligence does not apply to this object.",
  "ask.placeholder":          "Ask more about this work",
  "ask.previously_explored":  "Previously explored",
  "ask.view_previous_insights": "View previous insights",

  /* ── gallery ───────────────────────────────────────────── */
  "gallery.title":              "AXVELA Gallery",
  "gallery.subtitle":           "Verified galleries and curated available works",
  "gallery.filter_all":         "All",
  "gallery.filter_hold":        "Hold Available",
  "gallery.filter_price":       "Price Visible",
  "gallery.galleries":          "Galleries",
  "gallery.view_with":          "View with AXVELA AI",
  "gallery.inquire":            "Inquire",
  "gallery.ask":                "Ask Gallery",
  "gallery.price_on_inquiry":   "Price available upon inquiry",
};

export const translations: Record<LanguageCode, Dictionary> = { ko, en };

/** Type-safe key extraction — every key from the ko dictionary is canonical. */
export type TranslationKey = keyof typeof ko;
