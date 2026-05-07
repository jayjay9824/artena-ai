import { ComparableSale } from "../types";

const DATA: ComparableSale[] = [
  // ── Kim Whanki (김환기) ──────────────────────────────────────────────
  { id:"kw-01", artistName:"Kim Whanki", title:"점화 05-IV-71 #200", year:1971, medium:"oil", widthCm:254, heightCm:254, normalizedPriceUSD:11_500_000, originalPrice:11_500_000, originalCurrency:"USD", saleDate:"2022-11", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"Seoul Auction" },
  { id:"kw-02", artistName:"Kim Whanki", title:"5-IV-67 #96", year:1967, medium:"oil", widthCm:183, heightCm:183, normalizedPriceUSD:5_200_000, originalPrice:40_300_000, originalCurrency:"HKD", saleDate:"2021-09", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"kw-03", artistName:"Kim Whanki", title:"산울림", year:1968, medium:"oil", widthCm:162, heightCm:130, normalizedPriceUSD:7_300_000, originalPrice:7_300_000, originalCurrency:"USD", saleDate:"2021-05", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"Seoul Auction" },
  { id:"kw-04", artistName:"Kim Whanki", title:"점화 57-IV-70", year:1970, medium:"oil", widthCm:150, heightCm:150, normalizedPriceUSD:3_200_000, originalPrice:24_800_000, originalCurrency:"HKD", saleDate:"2023-11", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"kw-05", artistName:"Kim Whanki", title:"Recurrence 30-III-73", year:1973, medium:"oil", widthCm:100, heightCm:100, normalizedPriceUSD:1_800_000, originalPrice:1_800_000, originalCurrency:"USD", saleDate:"2022-05", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Sotheby's" },
  { id:"kw-06", artistName:"Kim Whanki", title:"귀로", year:1957, medium:"oil", widthCm:162, heightCm:130, normalizedPriceUSD:2_100_000, originalPrice:2_100_000, originalCurrency:"USD", saleDate:"2019-03", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"K-Auction" },
  { id:"kw-07", artistName:"Kim Whanki", title:"점화 9-VII-73", year:1973, medium:"oil", widthCm:90, heightCm:90, normalizedPriceUSD:890_000, originalPrice:6_900_000, originalCurrency:"HKD", saleDate:"2020-11", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Bonhams" },
  { id:"kw-08", artistName:"Kim Whanki", title:"Composition", year:1965, medium:"oil", widthCm:73, heightCm:60, normalizedPriceUSD:650_000, originalPrice:650_000, originalCurrency:"USD", saleDate:"2018-06", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"kw-09", artistName:"Kim Whanki", title:"From the Moon's Side", year:1969, medium:"works-on-paper", widthCm:50, heightCm:50, normalizedPriceUSD:120_000, originalPrice:95_000, originalCurrency:"GBP", saleDate:"2019-06", country:"UK", city:"London", region:"EU", saleChannel:"auction", auctionHouse:"Sotheby's" },
  { id:"kw-10", artistName:"Kim Whanki", title:"Series Works on Paper", year:1971, medium:"works-on-paper", widthCm:35, heightCm:35, normalizedPriceUSD:85_000, originalPrice:85_000, originalCurrency:"USD", saleDate:"2018-11", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"Seoul Auction" },

  // ── Lee Ufan (이우환) ────────────────────────────────────────────────
  { id:"lu-01", artistName:"Lee Ufan", title:"Dialogue", year:2013, medium:"oil", widthCm:228, heightCm:181, normalizedPriceUSD:1_450_000, originalPrice:1_450_000, originalCurrency:"USD", saleDate:"2023-10", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Sotheby's" },
  { id:"lu-02", artistName:"Lee Ufan", title:"With Winds", year:2010, medium:"oil", widthCm:181, heightCm:227, normalizedPriceUSD:1_200_000, originalPrice:1_200_000, originalCurrency:"USD", saleDate:"2022-11", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Phillips" },
  { id:"lu-03", artistName:"Lee Ufan", title:"From Line", year:1979, medium:"oil", widthCm:181, heightCm:227, normalizedPriceUSD:890_000, originalPrice:6_900_000, originalCurrency:"HKD", saleDate:"2023-06", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"lu-04", artistName:"Lee Ufan", title:"Relatum", year:2005, medium:"sculpture", widthCm:40, heightCm:40, normalizedPriceUSD:780_000, originalPrice:780_000, originalCurrency:"USD", saleDate:"2022-05", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"Seoul Auction" },
  { id:"lu-05", artistName:"Lee Ufan", title:"Correspondance", year:2005, medium:"oil", widthCm:100, heightCm:80, normalizedPriceUSD:420_000, originalPrice:386_000, originalCurrency:"EUR", saleDate:"2021-10", country:"France", city:"Paris", region:"EU", saleChannel:"auction", auctionHouse:"Sotheby's" },
  { id:"lu-06", artistName:"Lee Ufan", title:"From Point", year:1975, medium:"oil", widthCm:45, heightCm:53, normalizedPriceUSD:380_000, originalPrice:2_950_000, originalCurrency:"HKD", saleDate:"2021-03", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"lu-07", artistName:"Lee Ufan", title:"The Wind", year:2008, medium:"oil", widthCm:71, heightCm:89, normalizedPriceUSD:210_000, originalPrice:210_000, originalCurrency:"USD", saleDate:"2020-11", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"K-Auction" },
  { id:"lu-08", artistName:"Lee Ufan", title:"Landscape", year:1984, medium:"works-on-paper", widthCm:55, heightCm:75, normalizedPriceUSD:95_000, originalPrice:75_000, originalCurrency:"GBP", saleDate:"2020-06", country:"UK", city:"London", region:"EU", saleChannel:"auction", auctionHouse:"Bonhams" },

  // ── Park Seo-bo (박서보) ─────────────────────────────────────────────
  { id:"ps-01", artistName:"Park Seo-bo", title:"Écriture (No.050516)", year:2005, medium:"mixed", widthCm:120, heightCm:200, normalizedPriceUSD:1_200_000, originalPrice:9_300_000, originalCurrency:"HKD", saleDate:"2022-05", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"ps-02", artistName:"Park Seo-bo", title:"Écriture No. 100-87", year:1987, medium:"mixed", widthCm:100, heightCm:130, normalizedPriceUSD:980_000, originalPrice:7_600_000, originalCurrency:"HKD", saleDate:"2023-11", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"ps-03", artistName:"Park Seo-bo", title:"Écriture No. 27-80", year:1980, medium:"oil", widthCm:130, heightCm:162, normalizedPriceUSD:750_000, originalPrice:750_000, originalCurrency:"USD", saleDate:"2023-05", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Sotheby's" },
  { id:"ps-04", artistName:"Park Seo-bo", title:"Primordiale No. 14-72", year:1972, medium:"oil", widthCm:100, heightCm:80, normalizedPriceUSD:520_000, originalPrice:520_000, originalCurrency:"USD", saleDate:"2021-05", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Phillips" },
  { id:"ps-05", artistName:"Park Seo-bo", title:"Écriture No. 131-72", year:1972, medium:"oil", widthCm:80, heightCm:65, normalizedPriceUSD:420_000, originalPrice:420_000, originalCurrency:"USD", saleDate:"2022-11", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"Seoul Auction" },
  { id:"ps-06", artistName:"Park Seo-bo", title:"Écriture No. 060207", year:2006, medium:"mixed", widthCm:80, heightCm:116, normalizedPriceUSD:310_000, originalPrice:310_000, originalCurrency:"USD", saleDate:"2021-10", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"K-Auction" },
  { id:"ps-07", artistName:"Park Seo-bo", title:"Écriture No. 30-71", year:1971, medium:"oil", widthCm:73, heightCm:91, normalizedPriceUSD:190_000, originalPrice:190_000, originalCurrency:"USD", saleDate:"2020-11", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"Seoul Auction" },

  // ── Yayoi Kusama ─────────────────────────────────────────────────────
  { id:"yk-01", artistName:"Yayoi Kusama", title:"Pumpkin", year:2014, medium:"acrylic", widthCm:130, heightCm:130, normalizedPriceUSD:4_200_000, originalPrice:4_200_000, originalCurrency:"USD", saleDate:"2023-11", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"yk-02", artistName:"Yayoi Kusama", title:"Infinity Nets", year:2007, medium:"oil", widthCm:145, heightCm:145, normalizedPriceUSD:3_800_000, originalPrice:29_500_000, originalCurrency:"HKD", saleDate:"2023-06", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Sotheby's" },
  { id:"yk-03", artistName:"Yayoi Kusama", title:"Nets No. 2", year:2001, medium:"oil", widthCm:91, heightCm:91, normalizedPriceUSD:2_100_000, originalPrice:2_100_000, originalCurrency:"USD", saleDate:"2022-11", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Phillips" },
  { id:"yk-04", artistName:"Yayoi Kusama", title:"Flower", year:2005, medium:"acrylic", widthCm:100, heightCm:100, normalizedPriceUSD:1_650_000, originalPrice:1_518_000, originalCurrency:"GBP", saleDate:"2022-05", country:"UK", city:"London", region:"EU", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"yk-05", artistName:"Yayoi Kusama", title:"Infinity (2010)", year:2010, medium:"acrylic", widthCm:116, heightCm:91, normalizedPriceUSD:780_000, originalPrice:6_050_000, originalCurrency:"HKD", saleDate:"2020-11", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"yk-06", artistName:"Yayoi Kusama", title:"Pumpkin (Yellow)", year:2006, medium:"acrylic", widthCm:80, heightCm:100, normalizedPriceUSD:890_000, originalPrice:890_000, originalCurrency:"USD", saleDate:"2021-10", country:"Korea", city:"Seoul", region:"Korea", saleChannel:"auction", auctionHouse:"Seoul Auction" },
  { id:"yk-07", artistName:"Yayoi Kusama", title:"Dots Obsession", year:2003, medium:"acrylic", widthCm:70, heightCm:70, normalizedPriceUSD:520_000, originalPrice:478_000, originalCurrency:"EUR", saleDate:"2021-03", country:"France", city:"Paris", region:"EU", saleChannel:"auction", auctionHouse:"Sotheby's" },
  { id:"yk-08", artistName:"Yayoi Kusama", title:"Flower (works on paper)", year:2009, medium:"works-on-paper", widthCm:40, heightCm:40, normalizedPriceUSD:85_000, originalPrice:660_000, originalCurrency:"HKD", saleDate:"2020-06", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Bonhams" },

  // ── Banksy ──────────────────────────────────────────────────────────
  { id:"bk-01", artistName:"Banksy", title:"Love is in the Bin", year:2018, medium:"spray", widthCm:101, heightCm:78, normalizedPriceUSD:3_200_000, originalPrice:2_528_000, originalCurrency:"GBP", saleDate:"2022-11", country:"UK", city:"London", region:"EU", saleChannel:"auction", auctionHouse:"Bonhams" },
  { id:"bk-02", artistName:"Banksy", title:"Girl with Balloon", year:2004, medium:"spray", widthCm:101, heightCm:101, normalizedPriceUSD:1_400_000, originalPrice:1_106_000, originalCurrency:"GBP", saleDate:"2023-10", country:"UK", city:"London", region:"EU", saleChannel:"auction", auctionHouse:"Sotheby's" },
  { id:"bk-03", artistName:"Banksy", title:"Jack and Jill", year:2005, medium:"spray", widthCm:80, heightCm:80, normalizedPriceUSD:650_000, originalPrice:513_000, originalCurrency:"GBP", saleDate:"2022-05", country:"UK", city:"London", region:"EU", saleChannel:"auction", auctionHouse:"Christie's" },
  { id:"bk-04", artistName:"Banksy", title:"Laugh Now", year:2003, medium:"spray", widthCm:70, heightCm:70, normalizedPriceUSD:780_000, originalPrice:780_000, originalCurrency:"USD", saleDate:"2023-06", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Phillips" },
  { id:"bk-05", artistName:"Banksy", title:"Happy Choppers", year:2002, medium:"spray", widthCm:50, heightCm:50, normalizedPriceUSD:210_000, originalPrice:210_000, originalCurrency:"USD", saleDate:"2021-09", country:"USA", city:"New York", region:"US", saleChannel:"auction", auctionHouse:"Sotheby's" },
  { id:"bk-06", artistName:"Banksy", title:"Nola series", year:2008, medium:"spray", widthCm:65, heightCm:50, normalizedPriceUSD:180_000, originalPrice:142_000, originalCurrency:"GBP", saleDate:"2021-03", country:"UK", city:"London", region:"EU", saleChannel:"auction", auctionHouse:"Phillips" },
  { id:"bk-07", artistName:"Banksy", title:"Flower Thrower", year:2005, medium:"print", widthCm:50, heightCm:60, normalizedPriceUSD:95_000, originalPrice:735_000, originalCurrency:"HKD", saleDate:"2020-10", country:"Hong Kong", city:"Hong Kong", region:"Asia", saleChannel:"auction", auctionHouse:"Christie's" },
];

const ALIASES: Record<string, string> = {
  "김환기": "Kim Whanki",
  "이우환": "Lee Ufan",
  "박서보": "Park Seo-bo",
  "쿠사마": "Yayoi Kusama",
  "kusama": "Yayoi Kusama",
  "뱅크시": "Banksy",
  "whanki": "Kim Whanki",
  "whanki kim": "Kim Whanki",
  "ufan": "Lee Ufan",
  "lee ufan": "Lee Ufan",
  "seo-bo": "Park Seo-bo",
};

function normalize(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (lower.includes(alias.toLowerCase())) return canonical;
  }
  return name.trim();
}

export function getGlobalComparableSales(artistName: string): ComparableSale[] {
  const canonical = normalize(artistName);
  return DATA.filter(
    (s) => normalize(s.artistName).toLowerCase() === canonical.toLowerCase()
  );
}

export function getAllArtists(): string[] {
  return [...new Set(DATA.map((s) => s.artistName))];
}
