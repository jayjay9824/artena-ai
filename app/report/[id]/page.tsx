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

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  const report = await getReportStore().get(id);

  if (!report) {
    return {
      title: "Report not found · ARTENA AI",
      description: "ARTENA only shows results when the artwork can be matched to a reliable record.",
    };
  }

  const title = `${report.artist} - ${report.title}`;
  const description = report.artenaInsight
    || (report.analysisSummary
        ? report.analysisSummary.slice(0, 180) + (report.analysisSummary.length > 180 ? "…" : "")
        : "ARTENA AI cultural intelligence report");
  const image = report.representativeImageUrl || report.imageUrl;

  return {
    title:       `${title} · ARTENA AI`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
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
