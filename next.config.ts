import type { NextConfig } from "next";

/**
 * Host-aware root redirects.
 *
 * One Next.js project, two consumer domains:
 *
 *   www.axvela.com    → /analyze   (consumer scanner app)
 *   www.artena-ai.com → /console   (gallery / B2B dashboard)
 *
 * Order matters — Next.js processes redirects top-to-bottom and the
 * first match wins. Host-specific rules sit at the top so the
 * fallback (which has no `has` clause and therefore matches every
 * host) only fires for axvela / preview / localhost.
 *
 * 302 (permanent: false) on every rule so we can flip the
 * relationship later — e.g. promote /console content to live at "/"
 * directly on artena-ai — without poisoning browser / search caches
 * with a 301.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      // artena-ai.com → /console (gallery / B2B surface)
      {
        source:      "/",
        destination: "/console",
        has: [{ type: "host", value: "www.artena-ai.com" }],
        permanent:   false,
      },
      {
        source:      "/",
        destination: "/console",
        has: [{ type: "host", value: "artena-ai.com" }],
        permanent:   false,
      },

      // Fallback — axvela.com, vercel previews, localhost.
      // Lands on /analyze (the consumer scanner app).
      {
        source:      "/",
        destination: "/analyze",
        permanent:   false,
      },
    ];
  },
};

export default nextConfig;
