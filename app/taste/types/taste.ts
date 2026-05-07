export type SignalStrength = "forming" | "emerging" | "defined";

export interface TasteDimension {
  key: string;
  label: string;
  value: number;     // 0–100
  leftPole: string;  // descriptor when value is low
  rightPole: string; // descriptor when value is high
}

export interface VisualPattern {
  keyword: string;
  weight: number;    // 0.0–1.0
  category: "style" | "concept" | "emotion" | "material";
}

export interface TasteProfile {
  statement: string;
  subStatement: string;
  dimensions: TasteDimension[];
  patterns: VisualPattern[];
  patternSummary: string;
  insight: string;
  dominantStyle: string;
  dominantEmotion: string;
  collectionSize: number;
  signalStrength: SignalStrength;
}
