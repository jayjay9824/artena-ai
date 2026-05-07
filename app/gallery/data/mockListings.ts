import { Gallery, GalleryListing } from "../types/gallery";

const KUKJE: Gallery = {
  gallery_id: "G-001",
  name: "Kukje Gallery",
  verified_status: "premium",
  description_short: "한국을 대표하는 국제 현대미술 갤러리. 서울·부산·뉴욕 거점.",
  description_full:
    "1982년 서울에서 설립된 국제갤러리는 국내 최초의 국제 현대미술 전문 갤러리다. " +
    "이우환, 박서보, 하종현, 양혜규 등 한국 현대미술의 거장들과 함께 Louise Bourgeois, " +
    "Bill Viola, Bruce Nauman 등 세계적인 작가들을 국내에 소개해왔다. " +
    "서울·부산·뉴욕 세 곳의 공간을 운영하며, Art Basel, Frieze 등 주요 국제 아트페어에 정기 참가한다.",
  location: "Seoul, Korea",
  founded_year: 1982,
  cover_url: null,
  logo_url: null,
  website: "https://www.kukjegallery.com",
  instagram: "https://www.instagram.com/kukjegallery",
  artists: ["이우환", "박서보", "하종현", "양혜규", "김수자", "Do Ho Suh"],
  exhibitions: [
    { title: "하종현: 어둠의 표면", year: 2024, venue: "Kukje Gallery K3" },
    { title: "이우환: 여백과 만남", year: 2023, venue: "Kukje Gallery K1&K2" },
    { title: "양혜규: Handles and Links", year: 2023, venue: "Kukje Gallery K2" },
    { title: "박서보: Écriture", year: 2022, venue: "Kukje Gallery K1" },
  ],
  transaction_count: 340,
  response_rate: 96,
  avg_response_time: "2시간 이내",
  communication_channels: [
    { type: "email", label: "Email", url: "mailto:info@kukjegallery.com", is_primary: true },
    { type: "website", label: "Website", url: "https://www.kukjegallery.com" },
    { type: "instagram", label: "Instagram", url: "https://www.instagram.com/kukjegallery" },
  ],
};

const PKM: Gallery = {
  gallery_id: "G-002",
  name: "PKM Gallery",
  verified_status: "approved",
  description_short: "국제적 시각으로 동시대 한국 현대미술을 큐레이팅하는 갤러리.",
  description_full:
    "PKM 갤러리는 2001년 서울에서 설립되었다. 국내외 동시대 미술을 아우르는 다양한 전시 프로그램을 운영하며, " +
    "양혜규, 최정화, Candice Breitz, 오스카 무릴로 등 국제적으로 활발히 활동하는 작가들을 대표한다. " +
    "국내를 넘어 Art Basel, Frieze, FIAC 등 주요 국제 아트페어에 지속적으로 참가하며 " +
    "한국 현대미술의 국제화를 이끌고 있다.",
  location: "Seoul, Korea",
  founded_year: 2001,
  cover_url: null,
  logo_url: null,
  website: "https://www.pkmgallery.com",
  instagram: "https://www.instagram.com/pkmgallery",
  artists: ["양혜규", "최정화", "Candice Breitz", "Oscar Murillo", "Haim Steinbach"],
  exhibitions: [
    { title: "양혜규: Hybrid Environments", year: 2024, venue: "PKM Gallery" },
    { title: "Oscar Murillo: frequencies", year: 2023, venue: "PKM Gallery" },
    { title: "최정화: Happy Happy", year: 2022, venue: "PKM Gallery" },
  ],
  transaction_count: 210,
  response_rate: 88,
  avg_response_time: "4시간 이내",
  communication_channels: [
    { type: "email", label: "Email", url: "mailto:info@pkmgallery.com", is_primary: true },
    { type: "website", label: "Website", url: "https://www.pkmgallery.com" },
    { type: "instagram", label: "Instagram", url: "https://www.instagram.com/pkmgallery" },
  ],
};

const TINA_KIM: Gallery = {
  gallery_id: "G-003",
  name: "Tina Kim Gallery",
  verified_status: "partner",
  description_short: "뉴욕 기반. 한국 및 아시아 현대미술의 국제적 허브.",
  description_full:
    "Tina Kim Gallery는 2011년 뉴욕에서 설립된 이래 한국 및 아시아 현대미술을 국제 무대에 소개하는 " +
    "핵심 플랫폼으로 자리잡았다. 이미래, 강서경, 문경원 & 전준호, Theaster Gates 등 " +
    "국제 무대에서 활발히 활동하는 작가들을 대표하며, Art Basel, Frieze New York, " +
    "FIAC 등 세계 주요 아트페어에 꾸준히 참가하고 있다. " +
    "뉴욕과 서울을 연결하는 가교 역할을 자임하며 동시대 미술의 지형을 확장한다.",
  location: "New York, USA",
  founded_year: 2011,
  cover_url: null,
  logo_url: null,
  website: "https://www.tinakimgallery.com",
  instagram: "https://www.instagram.com/tinakimgallery",
  artists: ["이미래", "강서경", "문경원 & 전준호", "Theaster Gates", "Park Chan-kyong"],
  exhibitions: [
    { title: "이미래: Open Wound", year: 2024, venue: "Tina Kim Gallery, NYC" },
    { title: "강서경: Hereafter", year: 2023, venue: "Tina Kim Gallery, NYC" },
    { title: "문경원 & 전준호: Protocols of the New", year: 2022, venue: "Tina Kim Gallery, NYC" },
  ],
  transaction_count: 175,
  response_rate: 93,
  avg_response_time: "당일",
  communication_channels: [
    { type: "email", label: "Email", url: "mailto:info@tinakimgallery.com", is_primary: true },
    { type: "website", label: "Website", url: "https://www.tinakimgallery.com" },
    { type: "instagram", label: "Instagram", url: "https://www.instagram.com/tinakimgallery" },
  ],
};

const GALLERY_HYUNDAI: Gallery = {
  gallery_id: "G-004",
  name: "Gallery Hyundai",
  verified_status: "premium",
  description_short: "1970년 설립. 한국 근현대미술사의 살아있는 아카이브.",
  description_full:
    "갤러리현대는 1970년 국내 최초의 사립 현대미술 갤러리로 설립되어 반세기 이상 한국 미술사와 함께해왔다. " +
    "박수근, 이중섭, 김환기 등 한국 근현대 거장들의 작품을 체계적으로 소개하고 보존해왔으며, " +
    "하종현, 이응노 등 현대 작가들의 국제 진출을 지원했다. " +
    "서울 삼청동 본관 및 두산갤러리와의 협력 프로그램을 통해 " +
    "한국 미술의 역사적 맥락과 동시대 담론을 함께 아우른다.",
  location: "Seoul, Korea",
  founded_year: 1970,
  cover_url: null,
  logo_url: null,
  website: "https://www.galleryhyundai.com",
  instagram: "https://www.instagram.com/galleryhyundai",
  artists: ["하종현", "이중섭", "김환기", "박수근", "이응노", "정상화"],
  exhibitions: [
    { title: "하종현: 접합, 귀환", year: 2024, venue: "갤러리현대 본관" },
    { title: "김환기: 어디서 무엇이 되어 다시 만나랴", year: 2023, venue: "갤러리현대 본관" },
    { title: "박수근: 나목의 서정", year: 2022, venue: "갤러리현대 신관" },
  ],
  transaction_count: 520,
  response_rate: 91,
  avg_response_time: "3시간 이내",
  communication_channels: [
    { type: "email", label: "Email", url: "mailto:info@galleryhyundai.com", is_primary: true },
    { type: "kakao", label: "KakaoTalk", url: "http://pf.kakao.com/_gallery", is_primary: false },
    { type: "website", label: "Website", url: "https://www.galleryhyundai.com" },
  ],
};

export const MOCK_GALLERIES: Gallery[] = [KUKJE, PKM, TINA_KIM, GALLERY_HYUNDAI];

export const MOCK_LISTINGS: GalleryListing[] = [
  {
    listing_id: "L-001",
    artwork_id: "AX-001",
    image_url: null,
    artist_name: "Lee Ufan",
    artist_nationality: "Korean / Japanese",
    title: "Dialogue",
    year: 2019,
    medium: "Oil and mineral pigment on canvas",
    dimensions: "162 × 130 cm",
    gallery: KUKJE,
    status: "available",
    price: { visibility: "price_on_request", currency: "USD", value: null, range_min: null, range_max: null },
    market_signal: { last_transaction_year: 2024, transaction_count: 12, trend_direction: "rising", source_label: "Auction Records" },
    hold_policy: { allow_hold: true, manual_approval_required: true, default_duration_hours: 24 },
    description: "이우환의 'Dialogue' 시리즈는 단 하나의 붓터치가 날것의 캔버스와 조용한 대화를 나누는 작업이다. 무위(無爲)와 현존의 미학이 화면 위에서 침묵으로 공명한다.",
    keywords: ["mono-ha", "minimalism", "Korean contemporary"],
  },
  {
    listing_id: "L-002",
    artwork_id: "AX-002",
    image_url: null,
    artist_name: "Yang Haegue",
    artist_nationality: "Korean",
    title: "Sol LeWitt Upside Down — Incomplete Open Cube",
    year: 2021,
    medium: "Powder-coated steel, venetian blinds, light bulb chains",
    dimensions: "230 × 180 × 180 cm",
    gallery: PKM,
    status: "available",
    price: { visibility: "range_only", currency: "USD", value: null, range_min: 80000, range_max: 120000 },
    market_signal: { last_transaction_year: 2023, transaction_count: 5, trend_direction: "stable", source_label: "Auction Records" },
    hold_policy: { allow_hold: true, manual_approval_required: true, default_duration_hours: 48 },
    description: "양혜규는 솔 르윗의 구조적 논리를 전복시키며 감각적 경험을 재구성한다. 베네치안 블라인드와 조명이 빛과 그림자의 연극성을 만들어낸다.",
    keywords: ["installation", "sculpture", "conceptual"],
  },
  {
    listing_id: "L-003",
    artwork_id: "AX-003",
    image_url: null,
    artist_name: "Park Seo-bo",
    artist_nationality: "Korean",
    title: "Écriture (描法) No. 180401",
    year: 2018,
    medium: "Mixed media with Korean hanji on canvas",
    dimensions: "130 × 162 cm",
    gallery: KUKJE,
    status: "held",
    price: { visibility: "public", currency: "USD", value: 95000, range_min: null, range_max: null },
    market_signal: { last_transaction_year: 2024, transaction_count: 18, trend_direction: "rising", source_label: "Christie's, Sotheby's" },
    hold_policy: { allow_hold: false, manual_approval_required: true, default_duration_hours: 24 },
    description: "박서보의 에크리튀르 시리즈는 한지 위에 반복적인 선 긋기로 자아를 비우는 수행적 회화다. 저편의 고요함이 화면 전체에 스며든다.",
    keywords: ["dansaekhwa", "Korean monochrome", "meditative"],
  },
  {
    listing_id: "L-004",
    artwork_id: "AX-004",
    image_url: null,
    artist_name: "Mire Lee",
    artist_nationality: "Korean",
    title: "Open Wound (Soft Sculpture IV)",
    year: 2022,
    medium: "Industrial fabric, steel frame, motor, lubricants",
    dimensions: "Variable dimensions",
    gallery: TINA_KIM,
    status: "available",
    price: { visibility: "price_on_request", currency: "USD", value: null, range_min: null, range_max: null },
    market_signal: { last_transaction_year: 2023, transaction_count: 3, trend_direction: "rising", source_label: "Primary Market Data" },
    hold_policy: { allow_hold: true, manual_approval_required: true, default_duration_hours: 24 },
    description: "이미래의 작업은 산업 재료의 유기적 변형을 통해 신체, 노동, 욕망의 경계를 탐문한다. 기계와 살의 경계에서 움직이는 조각.",
    keywords: ["sculpture", "installation", "biomorphic"],
  },
  {
    listing_id: "L-005",
    artwork_id: "AX-005",
    image_url: null,
    artist_name: "Ha Chong-hyun",
    artist_nationality: "Korean",
    title: "Conjunction 22-06",
    year: 2022,
    medium: "Oil on hemp cloth",
    dimensions: "97 × 130 cm",
    gallery: GALLERY_HYUNDAI,
    status: "available",
    price: { visibility: "hidden", currency: "USD", value: null, range_min: null, range_max: null },
    market_signal: { last_transaction_year: 2023, transaction_count: 7, trend_direction: "stable", source_label: "Auction Records" },
    hold_policy: { allow_hold: false, manual_approval_required: true, default_duration_hours: 24 },
    description: "하종현의 접합법(接合法) 시리즈는 마포 뒷면에서 물감을 밀어넣어 앞면으로 배어나오게 하는 독창적 기법으로 제작된다. 단색화의 물질성을 극한까지 밀어붙인 작업.",
    keywords: ["dansaekhwa", "materiality", "process art"],
  },
  {
    listing_id: "L-006",
    artwork_id: "AX-006",
    image_url: null,
    artist_name: "Choi Jeong-hwa",
    artist_nationality: "Korean",
    title: "Happy Happy — Bloom",
    year: 2023,
    medium: "Nylon, aluminum frame, LED",
    dimensions: "400 × 400 × 250 cm",
    gallery: PKM,
    status: "sold",
    price: { visibility: "hidden", currency: "USD", value: null, range_min: null, range_max: null },
    market_signal: { last_transaction_year: 2023, transaction_count: 2, trend_direction: "stable", source_label: "Gallery Records" },
    hold_policy: { allow_hold: false, manual_approval_required: true, default_duration_hours: 24 },
    description: "최정화는 일상과 축제, 고급문화와 저급문화의 경계를 흐리며 기쁨과 과잉을 탐구한다. 대형 설치작 'Bloom'은 공간 전체를 생명력으로 가득 채운다.",
    keywords: ["installation", "pop", "Korean contemporary"],
  },
];
