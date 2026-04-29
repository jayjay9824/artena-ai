import type { Metadata } from "next";
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
  title: "AXVELA AI — Cultural Intelligence",
  description:
    "AXVELA AI is a learning-driven cultural intelligence platform for art, culture, artists, exhibitions, and taste learning.",
  applicationName: "AXVELA AI",
  openGraph: {
    title: "AXVELA AI",
    siteName: "AXVELA AI",
    description: "Cultural Intelligence, Refined.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AXVELA AI",
    description: "Cultural Intelligence, Refined.",
  },
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
