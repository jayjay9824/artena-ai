import { NextRequest, NextResponse } from "next/server";

const WIKI_KO  = "https://ko.wikipedia.org/w/api.php";
const WIKI_EN  = "https://en.wikipedia.org/w/api.php";
const COMMONS  = "https://commons.wikimedia.org/w/api.php";
const HEADERS  = { "User-Agent": "ARTENA-AI/1.0 (artena-ai.com)" };

function timeout(ms: number): AbortSignal {
  const ac = new AbortController();
  setTimeout(() => ac.abort(), ms);
  return ac.signal;
}

// ── Namu Wiki ─────────────────────────────────────────────────────────

async function namuImage(query: string): Promise<string | null> {
  try {
    // Search API first — faster than fetching full pages
    const sr = await fetch(
      `https://namu.wiki/api/search/instant?query=${encodeURIComponent(query)}&limit=3`,
      { headers: HEADERS, signal: timeout(4000) }
    );
    if (!sr.ok) return null;
    const sd = await sr.json();
    const titles: string[] = [
      ...(sd.data?.exact  ?? []).map((x: { title: string }) => x.title),
      ...(sd.data?.search ?? []).map((x: { title: string }) => x.title),
    ].slice(0, 2);

    for (const title of titles) {
      try {
        const pr = await fetch(`https://namu.wiki/w/${encodeURIComponent(title)}`, {
          headers: { ...HEADERS, "Accept": "text/html", "Accept-Language": "ko-KR" },
          redirect: "follow",
          signal: timeout(4000),
        });
        if (!pr.ok) continue;
        const html = await pr.text();
        const m = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
               ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
        if (!m) continue;
        let url = m[1];
        // Resolve protocol-relative URLs
        if (url.startsWith("//")) url = "https:" + url;
        if (!url.startsWith("http")) continue;
        if (url.includes("namu_logo") || url.endsWith(".svg") || url.includes("/default")) continue;
        return url;
      } catch { continue; }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Wikipedia (Korean / English) ──────────────────────────────────────

async function wikiImage(base: string, query: string): Promise<string | null> {
  try {
    const sr = await fetch(
      `${base}?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=2&srprop=title&origin=*`,
      { headers: HEADERS, signal: timeout(6000) }
    );
    if (!sr.ok) return null;
    const sd = await sr.json();
    const hits: Array<{ title: string }> = sd.query?.search ?? [];

    for (const hit of hits) {
      const tr = await fetch(
        `${base}?action=query&titles=${encodeURIComponent(hit.title)}&prop=pageimages&format=json&pithumbsize=800&redirects=1&origin=*`,
        { headers: HEADERS, signal: timeout(5000) }
      );
      if (!tr.ok) continue;
      const td = await tr.json();
      const pages = td.query?.pages as Record<string, { thumbnail?: { source: string } }>;
      const src = Object.values(pages ?? {})[0]?.thumbnail?.source;
      if (src) return src;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Wikimedia Commons (great for artwork images) ───────────────────────

async function commonsImage(query: string): Promise<string | null> {
  try {
    const sr = await fetch(
      `${COMMONS}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&format=json&srlimit=3&origin=*`,
      { headers: HEADERS, signal: timeout(6000) }
    );
    if (!sr.ok) return null;
    const sd = await sr.json();
    const hits: Array<{ title: string }> = sd.query?.search ?? [];

    for (const hit of hits) {
      const tr = await fetch(
        `${COMMONS}?action=query&titles=${encodeURIComponent(hit.title)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`,
        { headers: HEADERS, signal: timeout(5000) }
      );
      if (!tr.ok) continue;
      const td = await tr.json();
      const pages = td.query?.pages as Record<string, { imageinfo?: Array<{ url: string }> }>;
      const url = Object.values(pages ?? {})[0]?.imageinfo?.[0]?.url;
      if (url) return url;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ url: null });

  try {
    // Run all sources in parallel — fastest one wins
    const [namu, ko, commons, en] = await Promise.all([
      namuImage(q),
      wikiImage(WIKI_KO, q),
      commonsImage(q),
      wikiImage(WIKI_EN, q),
    ]);

    const url = namu ?? ko ?? commons ?? en ?? null;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ url: null });
  }
}
