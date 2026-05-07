"use client";
import React from "react";
import { ArtistPhotoData } from "../types/artistPhoto";

interface ArtistPhotoAvatarProps {
  data: ArtistPhotoData;
  height?: number;
}

export function ArtistPhotoAvatar({ data, height = 160 }: ArtistPhotoAvatarProps) {
  if (data.verificationStatus === "verified" && data.imageUrl) {
    return (
      <div style={{ width: "100%", height, overflow: "hidden", flexShrink: 0 }}>
        <img
          src={data.imageUrl}
          alt={data.artistName}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  const initials = data.artistName
    .split(" ")
    .filter(w => w.length > 0)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join("");

  const fontSize = Math.max(16, Math.floor(height * 0.17));

  return (
    <div style={{
      width: "100%", height, flexShrink: 0,
      background: "#F8F8F6",
      border: "0.5px solid #E6E6E2",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 10,
    }}>
      <span style={{
        fontSize,
        fontWeight: 300,
        color: "#C4C0B8",
        letterSpacing: ".24em",
        fontFamily: "Georgia, serif",
        lineHeight: 1,
        userSelect: "none",
      }}>
        {initials}
      </span>
      <span style={{
        fontSize: 8,
        color: "#C8C4BC",
        letterSpacing: ".12em",
        textTransform: "uppercase" as const,
        fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        textAlign: "center" as const,
        lineHeight: 1.6,
      }}>
        공식 작가 사진 확인 중
      </span>
    </div>
  );
}
