export interface ArtistPhotoData {
  artistName: string;
  imageUrl: string | null;
  verificationStatus: "verified" | "unverified" | "unavailable";
  source: string;
  sourceType: "official" | "institutional" | "press" | "unknown";
}

export function unavailableArtistPhoto(artistName: string): ArtistPhotoData {
  return {
    artistName,
    imageUrl: null,
    verificationStatus: "unavailable",
    source: "",
    sourceType: "unknown",
  };
}
