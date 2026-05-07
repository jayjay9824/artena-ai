/**
 * AXVELA AI Draft Generator — TypeScript model.
 *
 * One AIDraftBlock represents a single
 *
 *   (field × language × tone) permutation
 *
 * for a given artwork. A typical generation produces 16 blocks
 * at once (8 fields × 2 languages × 1 selected tone). Regenerating
 * with a different tone APPENDS new blocks rather than overwriting,
 * so the audit trail can show what was tried.
 *
 * Spec rules pinned to this type:
 *
 *   - status defaults to NEEDS_REVIEW on generation. AI is never
 *     auto-confirmed — every block must be reviewed by a human
 *     before transitioning to APPROVED.
 *   - the five "immutable facts" (artist name, title, year, medium,
 *     dimensions) are kept on the parent artwork record and are
 *     NEVER stored on a block. Blocks only carry generated copy.
 *   - approvedByRole must be "owner" or "manager" to transition
 *     to APPROVED. "staff" may generate / edit but cannot approve.
 *     "viewer" is read-only.
 */

export type AIDraftStatus =
  | "AI_DRAFT"
  | "NEEDS_REVIEW"
  | "APPROVED";

export type AITone =
  | "academic"
  | "commercial"
  | "storytelling";

export type AILanguage =
  | "ko"
  | "en";

/**
 * The eight output sections per the AI draft spec — matches the
 * 8 generation results listed in Step 1 (작품 설명 / 큐레이터 노트
 * / 작가 소개 / 전시 이력 / 소장 · 출처 / QR 공개용 / 도록용 /
 * Label용).
 */
export type AIDraftField =
  | "description"
  | "curatorNote"
  | "artistBio"
  | "exhibitionHistory"
  | "provenance"
  | "qrText"
  | "catalogText"
  | "labelText";

export interface AIDraftBlock {
  id:               string;
  artworkId:        string;

  field:            AIDraftField;
  language:         AILanguage;
  tone:             AITone;

  content:          string;
  status:           AIDraftStatus;

  generatedAt:      string;
  generatedBy:      string;

  approvedAt?:      string;
  approvedBy?:      string;
  approvedByRole?:  string;

  editedAt?:        string;
  editedBy?:        string;
}
