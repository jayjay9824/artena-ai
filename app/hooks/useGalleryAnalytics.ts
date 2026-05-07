"use client";
import { useEffect, useState } from "react";
import {
  AnalyticsFilters,
  GalleryDashboardMetrics,
  getGalleryDashboard,
} from "../services/galleryConsole/galleryAnalyticsService";
import type { GalleryId } from "../lib/types";

/**
 * useGalleryAnalytics — dashboard-level metrics with filters.
 * Component-side state only, services do all the work.
 */
export function useGalleryAnalytics(galleryId: GalleryId, initial: AnalyticsFilters = { range: "7d" }) {
  const [filters, setFilters] = useState<AnalyticsFilters>(initial);
  const [metrics, setMetrics] = useState<GalleryDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getGalleryDashboard(galleryId, filters).then(m => {
      if (!cancelled) { setMetrics(m); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [galleryId, filters]);

  return { metrics, filters, setFilters, loading };
}
