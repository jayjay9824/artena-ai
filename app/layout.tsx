import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { OfflineBanner } from "./components/OfflineBanner";

/**
 * Strict locale union. Anything outside this set is treated as
 * malformed cookie data and silently coerced to "ko".
 */
function normalizeLang(value?: string): "ko" | "en" {
  return value === "en" ? "en" : "ko";
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  // Production canonical for OG / Twitter image URL resolution.
  // Vercel auto-injects this for previews; we set it explicitly so
  // share crawlers always see absolute URLs.
  metadataBase: new URL("https://www.axvela.com"),
  title: "AXVELA AI — Cultural Intelligence",
  description:
    "AXVELA AI is a learning-driven cultural intelligence platform for art, culture, artists, exhibitions, and taste learning.",
  applicationName: "AXVELA AI",
  openGraph: {
    title: "AXVELA AI",
    siteName: "AXVELA AI",
    description: "Cultural Intelligence, Refined.",
    type: "website",
    url: "https://www.axvela.com",
    images: [
      {
        url:    "/og/axvela-og.png",
        width:  1200,
        height: 630,
        alt:    "AXVELA AI",
        type:   "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AXVELA AI",
    description: "Cultural Intelligence, Refined.",
    images: ["/og/axvela-og.png"],
  },
};

/** viewport-fit=cover lets env(safe-area-inset-*) return real values
 *  on iPhones with home indicators / notches — needed so the camera
 *  confirm card and bottom dock don't sit behind the home bar. */
export const viewport: Viewport = {
  width:          "device-width",
  initialScale:   1,
  viewportFit:    "cover",
  themeColor:     "#0D0D0D",
};

/**
 * Body fallback paint — kills the KakaoTalk in-app browser white-
 * flash during Intro → Home transition. The deep-blue color paints
 * before any image loads; the ocean poster (a small SVG-rasterized
 * gradient JPG, ~6 KB) decodes near-instantly and bridges the gap
 * until OceanBackground's MP4 starts streaming. Both the color and
 * image match the existing OceanBackground gradient exactly so
 * there is no visible swap when the video takes over.
 */
const BODY_FALLBACK_STYLE: React.CSSProperties = {
  backgroundColor:    "#2c4a6b",
  backgroundImage:    "url('/ocean-background.jpg')",
  backgroundSize:     "cover",
  backgroundPosition: "center",
  backgroundRepeat:   "no-repeat",
};

const HIDDEN_PRELOAD_IMG_STYLE: React.CSSProperties = {
  position:      "absolute",
  width:         1,
  height:        1,
  opacity:       0,
  pointerEvents: "none",
  top:           -9999,
  left:          -9999,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the active locale from the request cookies so the SSR pass
  // emits the right <html lang>. Chrome's auto-translate prompt and
  // every screen reader key off this attribute — hardcoding "en" on
  // a Korean page produced bogus translation banners.
  //
  // Read order (V3): axvela_lang → artena_language → fallback "ko".
  // Anything outside the strict union is coerced to "ko" by
  // normalizeLang above.
  const cookieStore = await cookies();
  const cookieLang =
    cookieStore.get("axvela_lang")?.value
    ?? cookieStore.get("artena_language")?.value;
  const lang = normalizeLang(cookieLang);

  return (
    <html lang={lang} className={inter.variable}>
      <head>
        {/*
          Critical CSS — inlined in <head> so the very first paint
          is dark blue + ocean. KakaoTalk's in-app WebView
          occasionally paints a frame from the system white default
          before external CSS / inline body styles apply; this
          guarantees html + body is dark from byte 1, killing the
          white flash users were seeing when opening shared URLs.
        */}
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background-color: #2c4a6b;
            background-image: url('/ocean-background.jpg');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            margin: 0;
          }
        ` }} />
        {/*
          High-priority preload so the browser fetches the ocean
          poster in parallel with the JS bundle. KakaoTalk in-app
          honors this hint, so the image is decoded by the time
          Home mounts and the SCAN shadow paints.
        */}
        <link
          rel="preload"
          as="image"
          href="/ocean-background.jpg"
          fetchPriority="high"
        />
      </head>
      <body className="antialiased" style={BODY_FALLBACK_STYLE}>
        {/*
          Hidden in-body preload — belt-and-suspenders for WebViews
          that ignore <link rel="preload"> hints. The 1×1 offscreen
          img triggers a normal image fetch + decode so the body
          background-image is ready instantly.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ocean-background.jpg"
          aria-hidden="true"
          alt=""
          style={HIDDEN_PRELOAD_IMG_STYLE}
        />
        <Providers>
          {children}
          <OfflineBanner />
        </Providers>
      </body>
    </html>
  );
}
