export type PriceVisibility = "hidden" | "price_on_request" | "range_only" | "public";
export type ListingStatus = "available" | "held" | "sold" | "not_available";
export type TrendDirection = "rising" | "stable" | "declining" | "unknown";
export type UserTier = "visitor" | "premium" | "verified_collector" | "trusted_collector" | "vip_collector";
export type ContactType = "kakao" | "email" | "instagram" | "whatsapp" | "website" | "phone";
export type VerifiedTier = "approved" | "premium" | "partner";
export type HoldStatus =
  | "requested" | "approved" | "active"
  | "expired" | "rejected" | "cancelled" | "converted_to_sale";

export interface CommunicationChannel {
  type: ContactType;
  label: string;
  url: string;
  is_primary?: boolean;
}

export interface GalleryExhibition {
  title: string;
  year: number;
  venue?: string;
}

export interface Gallery {
  gallery_id: string;
  name: string;
  verified_status: VerifiedTier | false;
  description_short: string;
  description_full: string;
  location: string;
  founded_year: number;
  cover_url: string | null;
  logo_url: string | null;
  website?: string;
  instagram?: string;
  artists: string[];
  exhibitions: GalleryExhibition[];
  transaction_count?: number;
  response_rate?: number;
  avg_response_time?: string;
  communication_channels: CommunicationChannel[];
}

export interface MarketSignal {
  last_transaction_year: number | null;
  transaction_count: number;
  trend_direction: TrendDirection;
  source_label: string;
}

export interface Price {
  visibility: PriceVisibility;
  currency: string;
  value: number | null;
  range_min: number | null;
  range_max: number | null;
}

export interface HoldPolicy {
  allow_hold: boolean;
  manual_approval_required: boolean;
  default_duration_hours: number;
}

export interface GalleryListing {
  listing_id: string;
  artwork_id: string;
  image_url: string | null;
  artist_name: string;
  artist_nationality?: string;
  title: string;
  year: number;
  medium: string;
  dimensions?: string;
  gallery: Gallery;
  status: ListingStatus;
  price: Price;
  market_signal: MarketSignal;
  hold_policy: HoldPolicy;
  description?: string;
  keywords?: string[];
}

export type GalleryFilter = "all" | "hold_available" | "price_visible";

// Navigation state machine for gallery tab
export type GalleryView =
  | { type: "list" }
  | { type: "gallery_profile"; galleryId: string; fromListing?: GalleryListing }
  | { type: "listing_detail"; listing: GalleryListing; fromGalleryId?: string };
