/**
 * Server component shell — fetches the report once on the server so
 * generateMetadata() can produce real OG tags (og:title / og:description
 * / og:image) and so crawlers (Twitter, KakaoTalk, FB) see the frozen
 * snapshot in the initial HTML. Rendering itself is delegated to the
 * client child SharedReportView.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReportStore } from "../../services/reportStore";
import { SharedReportView } from "./SharedReportView";

/**
 * STEP 5 — Build an absolute URL for the share-card image.
 * Crawlers don't run client JS, so OG/Twitter metadata must point at
 * a fully-qualified URL. We resolve it from VERCEL_URL (production /
 * preview) or fall back to a relative path during local dev.
 */
function shareCardOgUrl(id: string): string {
  const path = `/api/reports/${encodeURIComponent(id)}/share-card`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}${path}`;
  return path;
}

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const report = await getReportStore().get(id);

  if (!report) {
    return {
      title: "Report not found · AXVELA AI",
      description: "AXVELA only shows results when the artwork can be matched to a reliable record.",
    };
  }

  const title = `${report.artist} - ${report.title}`;
  const description = report.artenaInsight
    || (report.analysisSummary
        ? report.analysisSummary.slice(0, 180) + (report.analysisSummary.length > 180 ? "…" : "")
        : "AXVELA AI cultural intelligence report");

  // STEP 5 — point OG/Twitter at the rendered 1080x1920 share card so
  // crawlers see the editorial card with title + artist + insight +
  // brand mark instead of the raw artwork crop.
  const cardUrl = shareCardOgUrl(id);

  return {
    title:       `${title} · AXVELA AI`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: cardUrl, width: 1080, height: 1920 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cardUrl],
    },
  };
}

export default async function SharedReportPage({ params }: RouteProps) {
  const { id } = await params;
  const report = await getReportStore().get(id);

  // Server-side miss: render a 404. The client SharedReportView still
  // handles the soft-miss case (in-flight cold start, race conditions).
  if (!report) notFound();

  return <SharedReportView initialReport={report} />;
}
