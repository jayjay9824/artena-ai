import type { NextConfig } from "next";

/**
 * Root redirect: www.axvela.com lands directly on the AXVELA AI app
 * (/analyze surface — MinimalHomeScreen + ScanOrb + AI pill + AI
 * Mode Overlay) instead of the legacy ArtXpark marketing landing
 * page that previously occupied "/".
 *
 * Kept as a 302 (permanent: false) so we can flip the relationship
 * later — e.g. promote /analyze content to live at "/" directly —
 * without poisoning browser / search caches with a 301.
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
