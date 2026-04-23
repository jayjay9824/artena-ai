import { NextRequest, NextResponse } from "next/server";

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const WIKI_KO  = "https://ko.wikipedia.org/w/api.php";

async function getImageByTitle(base: string, title: string): Promise<string | null> {
  const url = `${base}?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=600&redirects=1&origin=*`;
  const res = await fetch(url, { headers: { "User-Agent": "ARTENA-AI/1.0" } });
  if (!res.ok) return null;
  const d = await res.json();
  const pages = d.query?.pages as Record<string, { thumbnail?: { source: string } }>;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  return page?.thumbnail?.source ?? null;
}

async function searchThenImage(base: string, query: string): Promise<string | null> {
  const searchUrl = `${base}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&srprop=title&origin=*`;
  const res = await fetch(searchUrl, { headers: { "User-Agent": "ARTENA-AI/1.0" } });
  if (!res.ok) return null;
  const d = await res.json();
  const hit = d.query?.search?.[0]?.title as string | undefined;
  if (!hit) return null;
  return getImageByTitle(base, hit);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q) return NextResponse.json({ url: null });

  try {
    // 1. Try exact title on English Wikipedia
    let url = await getImageByTitle(WIKI_API, q);
    // 2. Fallback: search English Wikipedia
    if (!url) url = await searchThenImage(WIKI_API, q);
    // 3. Fallback: search Korean Wikipedia
    if (!url) url = await searchThenImage(WIKI_KO, q);

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
