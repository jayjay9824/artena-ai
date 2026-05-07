"use client";
import React from "react";
import { GalleryDashboard } from "../components/galleryConsole/GalleryDashboard";
import { MOCK_GALLERY } from "../services/galleryConsole/mockData";

/**
 * Gallery Console — B2B intelligence surface.
 * Permission today: each gallery only sees its own galleryId data;
 * this MVP uses MOCK_GALLERY.id. When auth lands, swap MOCK_GALLERY
 * for the signed-in gallery's session payload.
 */
export default function GalleryConsolePage() {
  return (
    <GalleryDashboard
      galleryId={MOCK_GALLERY.id}
      galleryName={MOCK_GALLERY.name}
    />
  );
}
