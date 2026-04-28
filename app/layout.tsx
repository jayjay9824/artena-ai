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
  title: "ARTENA AI — Cultural Intelligence",
  description:
    "ARTENA AI is a learning-driven cultural intelligence platform for art, culture, artists, exhibitions, and taste learning.",
  openGraph: {
    title: "ARTENA AI",
    description: "Cultural Intelligence, Refined.",
    type: "website",
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
