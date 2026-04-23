"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { Recommendation, ActiveFilter, FilterKey } from "../types/recommendation";
import { useCollection, makeItemId } from "../../collection/hooks/useCollection";

const INITIAL_RECS: Recommendation[] = [
  {
    id: "rec-agnes-martin",
    artist: "Agnes Martin",
    title: "Untitled #12",
    year: "1977",
    style: "Minimalism",
    medium: "Acrylic and graphite on canvas",
    marketTier: "Blue-chip",
    reason: "Echoes your preference for tonal restraint and the meditative line",
    reasonCategory: "style",
    accentColor: "#C0A87A",
    liked: false,
    saved: false,
    analysis: {
      title: "Untitled #12",
      artist: "Agnes Martin",
      year: "1977",
      style: "Minimalism",
      description: "마틴의 수평선 반복은 침묵과 명상의 언어로 캔버스를 가득 채운다. 미세한 색조 변화가 빛과 시간의 흐름을 기록하며, 관람자에게 내면의 고요함을 전한다. 그것은 작품이 아니라 상태다.",
      emotions: { calm: 92, heavy: 28, warm: 55, inward: 88, movement: 12 },
      keywords: ["미니멀리즘", "명상", "수평선", "고요함", "반복"],
      marketNote: "Agnes Martin 작품은 MoMA, Tate Modern 등 주요 기관에 소장되어 있으며, 경매 최고가는 $10.7M (Christie's 2015)입니다.",
      works: [{ title: "Untitled #12", year: "1977", medium: "Acrylic and graphite on canvas", location: "Dia Art Foundation" }],
      auctions: [
        { date: "2022-05", work: "Untitled #3", house: "Christie's", result: "$7,200,000", estimate: "$6M–$8M", note: "상회 낙찰" },
        { date: "2021-11", work: "Untitled #8", house: "Sotheby's", result: "$4,800,000", estimate: "$4M–$6M", note: "" },
        { date: "2020-03", work: "Untitled #14", house: "Phillips", result: "$3,100,000", estimate: "$2.5M–$3.5M", note: "" },
      ],
      collections: [
        { inst: "MoMA", city: "New York", period: "1967–현재", work: "영구 소장 다수" },
        { inst: "Tate Modern", city: "London", period: "1974–현재", work: "Friendship (1963)" },
        { inst: "Guggenheim", city: "New York", period: "1990–현재", work: "다수" },
      ],
      critics: [
        { critic: "Klaus Kertess", source: "MoMA Catalogue", year: "1992", quote: "Martin's paintings are about the perfect — the serenity that comes from perfect harmony." },
      ],
    },
  },
  {
    id: "rec-lee-ufan",
    artist: "Lee Ufan",
    title: "Relatum",
    year: "1974",
    style: "Mono-ha",
    medium: "Stone and steel plate",
    marketTier: "Blue-chip",
    reason: "Extends your sensitivity to the interval between presence and absence",
    reasonCategory: "extension",
    accentColor: "#8090A8",
    liked: false,
    saved: false,
    analysis: {
      title: "Relatum",
      artist: "Lee Ufan",
      year: "1974",
      style: "Mono-ha / Minimalism",
      description: "물질과 공간의 관계를 탐구하는 이우환의 대표 연작. 철판과 돌의 접촉은 작품이 아닌 그 사이의 관계를 전시한다. 보는 행위 자체가 작품의 완성이며, 침묵이 형식이 된다.",
      emotions: { calm: 80, heavy: 65, warm: 35, inward: 90, movement: 18 },
      keywords: ["모노하", "관계", "물질", "공간", "침묵"],
      marketNote: "이우환 작품은 한국과 일본 미술계에서 최고 경매가를 기록하며, 유럽 기관 소장이 강하게 형성된 Blue-chip 작가입니다.",
      works: [{ title: "Relatum", year: "1974", medium: "Stone and steel plate", location: "Guggenheim Bilbao" }],
      auctions: [
        { date: "2023-10", work: "Correspondence", house: "Seoul Auction", result: "KRW 2,800,000,000", estimate: "KRW 2B–3B", note: "" },
        { date: "2022-06", work: "From Line", house: "Christie's HK", result: "$1,200,000", estimate: "$900K–$1.4M", note: "상회 낙찰" },
        { date: "2021-05", work: "From Point", house: "Sotheby's HK", result: "$980,000", estimate: "$800K–$1.2M", note: "" },
      ],
      collections: [
        { inst: "Fondation Maeght", city: "Saint-Paul-de-Vence", period: "1997–현재", work: "Relatum" },
        { inst: "National Museum of Modern Art", city: "Tokyo", period: "1988–현재", work: "From Point" },
      ],
    },
  },
  {
    id: "rec-gerhard-richter",
    artist: "Gerhard Richter",
    title: "Abstract Painting 726",
    year: "1990",
    style: "Abstraction",
    medium: "Oil on canvas",
    marketTier: "Blue-chip",
    reason: "Deepens your interest in the tension between image and pure abstraction",
    reasonCategory: "concept",
    accentColor: "#A07858",
    liked: false,
    saved: false,
    analysis: {
      title: "Abstract Painting 726",
      artist: "Gerhard Richter",
      year: "1990",
      style: "Abstract Expressionism / Postmodernism",
      description: "리히터의 추상 회화는 제어와 우연의 경계에서 탄생한다. 스퀴지로 긁어낸 물감 층은 기억과 망각의 지층처럼 축적되며, 이미지와 비이미지 사이의 진실을 탐구한다.",
      emotions: { calm: 42, heavy: 70, warm: 48, inward: 65, movement: 58 },
      keywords: ["추상", "우연", "기억", "물감층", "스퀴지"],
      marketNote: "리히터는 생존 작가 중 최고 경매 시장가를 유지하며, Abstract Paintings 연작은 경매 최고가 $46.3M을 기록했습니다.",
      works: [{ title: "Abstract Painting 726", year: "1990", medium: "Oil on canvas", location: "Private Collection" }],
      auctions: [
        { date: "2023-11", work: "Abstract Painting (811-3)", house: "Christie's", result: "$28,000,000", estimate: "$25M–$35M", note: "" },
        { date: "2022-05", work: "Abstraktes Bild", house: "Sotheby's", result: "$19,500,000", estimate: "$18M–$25M", note: "" },
      ],
      collections: [
        { inst: "Museum Ludwig", city: "Cologne", period: "1986–현재", work: "다수" },
        { inst: "Tate Modern", city: "London", period: "1990–현재", work: "Abstract Painting 858-6" },
      ],
    },
  },
  {
    id: "rec-roni-horn",
    artist: "Roni Horn",
    title: "Gold Field",
    year: "1980–82",
    style: "Minimalism",
    medium: "Pure gold foil on floor",
    marketTier: "Established",
    reason: "Responds to your focus on quiet material investigation and perceptual presence",
    reasonCategory: "style",
    accentColor: "#C0A030",
    liked: false,
    saved: false,
    analysis: {
      title: "Gold Field",
      artist: "Roni Horn",
      year: "1980–82",
      style: "Minimalism / Conceptual",
      description: "순금박을 바닥에 펼쳐놓은 이 작품은 물질의 근원적 아름다움과 공간과의 관계를 탐구한다. 보는 각도에 따라 달라지는 빛의 반사는 작품이 아닌 관람자의 현존을 드러낸다.",
      emotions: { calm: 75, heavy: 35, warm: 82, inward: 70, movement: 22 },
      keywords: ["금", "물질성", "바닥", "반사", "현존"],
      marketNote: "Roni Horn은 Tate Modern과 Whitney Museum 등 주요 기관에 소장된 작가로, 중간급 경매 시장이 안정적으로 형성되어 있습니다.",
      works: [{ title: "Gold Field", year: "1980–82", medium: "Pure gold foil on floor", location: "Tate Modern" }],
      auctions: [
        { date: "2021-05", work: "Untitled (Weather)", house: "Phillips", result: "$280,000", estimate: "$200K–$300K", note: "" },
      ],
      collections: [
        { inst: "Tate Modern", city: "London", period: "2001–현재", work: "Gold Field" },
        { inst: "Whitney Museum", city: "New York", period: "2005–현재", work: "You Are the Weather" },
      ],
    },
  },
  {
    id: "rec-wolfgang-tillmans",
    artist: "Wolfgang Tillmans",
    title: "Lutz & Alex Sitting in the Trees",
    year: "1992",
    style: "Photography",
    medium: "Chromogenic print",
    marketTier: "Established",
    reason: "Reflects your attraction to intimacy framed as document and presence",
    reasonCategory: "emotion",
    accentColor: "#7A8870",
    liked: false,
    saved: false,
    analysis: {
      title: "Lutz & Alex Sitting in the Trees",
      artist: "Wolfgang Tillmans",
      year: "1992",
      style: "Contemporary Photography",
      description: "틸만스의 초기작은 친밀한 순간을 기록하는 방식으로 사진의 사적 공간과 공적 전시 사이의 경계를 탐구한다. 일상의 발견이 예술적 선언이 된다.",
      emotions: { calm: 55, heavy: 40, warm: 72, inward: 60, movement: 35 },
      keywords: ["사진", "친밀함", "일상", "기록", "젊음"],
      marketNote: "Tillmans는 2000년 Turner Prize 수상 작가로, 갤러리 1차 시장과 2차 경매 모두 안정적인 가격대를 형성합니다.",
      works: [{ title: "Lutz & Alex Sitting in the Trees", year: "1992", medium: "Chromogenic print", location: "MoMA" }],
      auctions: [
        { date: "2022-03", work: "Concorde Grid", house: "Christie's", result: "$380,000", estimate: "$300K–$500K", note: "" },
      ],
      collections: [
        { inst: "MoMA", city: "New York", period: "2001–현재", work: "다수" },
        { inst: "Tate Modern", city: "London", period: "2000–현재", work: "다수" },
      ],
    },
  },
  {
    id: "rec-felix-gonzalez-torres",
    artist: "Félix González-Torres",
    title: '"Untitled" (Portrait of Ross in L.A.)',
    year: "1991",
    style: "Conceptual",
    medium: "Candies, endless supply",
    marketTier: "Blue-chip",
    reason: "Deepens your focus on time, tenderness, and the weight of gentle persistence",
    reasonCategory: "extension",
    accentColor: "#C87850",
    liked: false,
    saved: false,
    analysis: {
      title: '"Untitled" (Portrait of Ross in L.A.)',
      artist: "Félix González-Torres",
      year: "1991",
      style: "Conceptual / Minimalism",
      description: "175파운드의 사탕 더미는 파트너의 몸무게를 상징한다. 관람자가 사탕을 가져갈수록 줄어들고 보충되는 이 작품은 상실, 사랑, 그리고 끝없는 순환에 대한 가장 조용한 선언이다.",
      emotions: { calm: 60, heavy: 85, warm: 90, inward: 78, movement: 20 },
      keywords: ["사랑", "상실", "개념미술", "시간", "순환"],
      marketNote: "González-Torres의 작품은 경매 최고가 $7.7M (Christie's 2010)을 기록하며, Candies 연작은 미술계 최고 개념 작품 중 하나로 인정받습니다.",
      works: [{ title: '"Untitled" (Portrait of Ross in L.A.)', year: "1991", medium: "Candies, endless supply", location: "Art Institute of Chicago" }],
      auctions: [
        { date: "2022-11", work: '"Untitled" (Last Light)', house: "Christie's", result: "$4,200,000", estimate: "$3.5M–$5M", note: "상회 낙찰" },
        { date: "2021-05", work: '"Untitled" (Blood)', house: "Sotheby's", result: "$3,800,000", estimate: "$3M–$4.5M", note: "" },
      ],
      collections: [
        { inst: "Art Institute of Chicago", city: "Chicago", period: "1991–현재", work: '"Untitled" (Portrait of Ross in L.A.)' },
        { inst: "Guggenheim", city: "New York", period: "1996–현재", work: '"Untitled" (Golden)' },
      ],
    },
  },
  {
    id: "rec-koo-jeong-a",
    artist: "Koo Jeong A",
    title: "Constellation Congress",
    year: "2005",
    style: "Conceptual",
    medium: "Mixed media installation",
    marketTier: "Established",
    reason: "Extends your interest in micro-scale perception and environmental quiet",
    reasonCategory: "extension",
    accentColor: "#9080B8",
    liked: false,
    saved: false,
    analysis: {
      title: "Constellation Congress",
      artist: "Koo Jeong A",
      year: "2005",
      style: "Conceptual / Installation",
      description: "구정아는 거의 보이지 않을 만큼 작은 설치물로 공간의 감각을 바꾼다. 극소 스케일의 개입이 거대한 지각적 변화를 이끌어내는 이 작업은 존재의 경계를 재정의한다.",
      emotions: { calm: 70, heavy: 30, warm: 65, inward: 85, movement: 40 },
      keywords: ["설치", "미세지각", "공간", "극소", "현존"],
      marketNote: "구정아는 국제적으로 인정받는 한국 작가로, Tate Modern과 Palais de Tokyo 등에서 개인전을 가진 Established 레벨 작가입니다.",
      works: [{ title: "Constellation Congress", year: "2005", medium: "Mixed media installation", location: "Palais de Tokyo, Paris" }],
      auctions: [
        { date: "2020-10", work: "Eton", house: "Seoul Auction", result: "KRW 42,000,000", estimate: "KRW 30M–50M", note: "" },
      ],
      collections: [
        { inst: "Tate Modern", city: "London", period: "2008–현재", work: "Constellation Congress" },
        { inst: "Palais de Tokyo", city: "Paris", period: "2005–현재", work: "다수" },
      ],
    },
  },
];

export function useRecommendations() {
  const [recs, setRecs] = useState<Recommendation[]>(INITIAL_RECS);
  const [images, setImages] = useState<Record<string, string | null>>({});
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>({ key: "all", value: "all" });
  const fetchedRef = useRef<Set<string>>(new Set());
  const { upsert, patch, items } = useCollection();

  // Fetch Wikipedia images once per artist
  useEffect(() => {
    INITIAL_RECS.forEach(rec => {
      if (fetchedRef.current.has(rec.id)) return;
      fetchedRef.current.add(rec.id);
      fetch(`/api/wiki-image?q=${encodeURIComponent(rec.artist)}`)
        .then(r => r.json())
        .then(json => setImages(prev => ({ ...prev, [rec.id]: json.url ?? null })))
        .catch(() => setImages(prev => ({ ...prev, [rec.id]: null })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync liked/saved from collection on collection changes
  useEffect(() => {
    setRecs(prev => prev.map(rec => {
      const collId = makeItemId(rec.artist, rec.title);
      const existing = items.find(i => i.id === collId);
      if (!existing) return rec;
      if (existing.liked === rec.liked && existing.saved === rec.saved) return rec;
      return { ...rec, liked: existing.liked, saved: existing.saved };
    }));
  }, [items]);

  const toggleAction = useCallback((recId: string, key: "liked" | "saved") => {
    setRecs(prev => {
      const rec = prev.find(r => r.id === recId);
      if (!rec) return prev;
      const updated = { ...rec, [key]: !rec[key] };
      const collId = makeItemId(rec.artist, rec.title);
      const existing = items.find(i => i.id === collId);
      if (!existing) {
        upsert({
          id: collId,
          savedAt: new Date().toISOString(),
          liked: updated.liked,
          saved: updated.saved,
          collected: false,
          analysis: rec.analysis,
          imagePreview: images[recId] ?? null,
        });
      } else {
        patch(collId, { [key]: updated[key] });
      }
      return prev.map(r => r.id === recId ? updated : r);
    });
  }, [items, images, upsert, patch]);

  const setFilter = useCallback((key: FilterKey, value: string) => {
    setActiveFilter({ key, value });
  }, []);

  const filtered = recs.filter(rec => {
    if (activeFilter.key === "all") return true;
    if (activeFilter.key === "style")  return rec.style.toLowerCase().includes(activeFilter.value.toLowerCase());
    if (activeFilter.key === "market") return rec.marketTier === activeFilter.value;
    if (activeFilter.key === "medium") return rec.medium.toLowerCase().includes(activeFilter.value.toLowerCase());
    return true;
  });

  return { recs: filtered, images, activeFilter, setFilter, toggleAction };
}
