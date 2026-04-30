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
    ];
  },
};

export default nextConfig;
