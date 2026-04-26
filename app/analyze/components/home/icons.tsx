// Shared SVG icons — lucide-style, strokeWidth 1.5
import React from "react";

interface IconProps { size?: number; color?: string; strokeWidth?: number; }

const D: React.FC<IconProps & { children: React.ReactNode }> = ({ size = 20, color = "currentColor", strokeWidth = 1.5, children }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export function IcoQr({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="1.5" y="1.5" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="11.5" y="1.5" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="1.5" y="11.5" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" />
      <rect x="3.5" y="3.5" width="3" height="3" fill={color} stroke="none" />
      <rect x="13.5" y="3.5" width="3" height="3" fill={color} stroke="none" />
      <rect x="3.5" y="13.5" width="3" height="3" fill={color} stroke="none" />
      <path d="M11.5 11.5h2v2h-2zM15.5 11.5h2M11.5 15.5h2M15.5 15.5h2v2h-2zM11.5 18h2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IcoCamera({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <D size={size} color={color}>
      <path d="M2 7h2l2-2h8l2 2h2v10H2V7z" />
      <circle cx="10" cy="12" r="3" />
    </D>
  );
}

export function IcoImage({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <D size={size} color={color}>
      <rect x="2" y="3" width="16" height="14" rx="2" />
      <circle cx="7" cy="8" r="1.5" />
      <path d="M2 14l4-4 3.5 3.5 2.5-2.5L18 15" />
    </D>
  );
}

export function IcoFileText({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <D size={size} color={color}>
      <path d="M12 2H5a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V7l-4-5z" />
      <path d="M12 2v5h4" />
      <line x1="7" y1="11" x2="13" y2="11" />
      <line x1="7" y1="14" x2="10" y2="14" />
    </D>
  );
}

export function IcoSearch({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <D size={size} color={color}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M15 15l3.5 3.5" />
    </D>
  );
}

export function IcoBarChart({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <D size={size} color={color}>
      <line x1="4" y1="17" x2="4" y2="11" />
      <line x1="8.5" y1="17" x2="8.5" y2="8" />
      <line x1="13" y1="17" x2="13" y2="5" />
      <line x1="17.5" y1="17" x2="17.5" y2="12" />
      <line x1="2" y1="17" x2="19" y2="17" />
    </D>
  );
}

export function IcoLandmark({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <D size={size} color={color}>
      <path d="M2 17h16M4 17V9m4 8V9m4 8V9m4 8V9M2 9h16M10 2L2 7h16L10 2z" />
    </D>
  );
}

export function IcoUpload({ size = 20, color = "currentColor" }: IconProps) {
  return (
    <D size={size} color={color}>
      <path d="M10 13V5M7 8l3-3 3 3" strokeLinejoin="round" />
      <path d="M3 15v2h14v-2" />
    </D>
  );
}

export function IcoArrowRight({ size = 16, color = "currentColor" }: IconProps) {
  return (
    <D size={size} color={color}>
      <path d="M4 10h12M12 6l4 4-4 4" />
    </D>
  );
}
