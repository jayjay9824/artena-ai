import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { OfflineBanner } from "./components/OfflineBanner";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <Providers>
          {children}
          <OfflineBanner />
        </Providers>
      </body>
    </html>
  );
}
