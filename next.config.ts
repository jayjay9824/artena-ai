import type { NextConfig } from "next";

/**
 * Root redirect — landing on this Next.js project (axvela.com,
 * vercel previews, localhost) lands on /analyze, the AXVELA AI
 * consumer scanner surface.
 *
 * Note: artena-ai.com is NOT attached to this project anymore —
 * it points at the separate `axvela-console` Vercel project, so
 * none of these redirect rules fire for that host.
 *
 * 302 (permanent: false) so we can flip the relationship later
 * (e.g. promote /analyze to "/" directly) without poisoning
 * browser / search caches with a 301.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source:      "/",
        destination: "/analyze",
        permanent:   false,
      },
      /* /profile/* — the canonical profile page lives at /my (the
         BottomNav middle-right tab routes there). Bare /profile
         used to 404 because only /profile/saved had a page. Mirror
         the BottomNav and redirect /profile → /my so direct URL
         entry, external links, and back-stack history all land on
         a real page. /profile/saved keeps its own route. */
      {
        source:      "/profile",
        destination: "/my",
        permanent:   false,
      },
    ];
  },
};

export default nextConfig;
