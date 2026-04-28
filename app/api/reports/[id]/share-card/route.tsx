/**
 * GET /api/reports/[id]/share-card — STEP 5.
 *
 * Renders a 1080x1920 share card PNG for the given report. Used as
 * og:image / twitter:image on the public viewer page so social
 * platforms (Instagram Stories, KakaoTalk, X, etc.) get a frozen
 * preview that matches the spec card.
 *
 * Layout:
 *   ─ artwork image (top half, full bleed)
 *   ─ ARTENA brand line
 *   ─ artist
 *   ─ title
 *   ─ short insight (italic, bronze rule)
 *   ─ canonical share link (artena.ai/report/{id})
 */

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getReportStore } from "../../../../services/reportStore";

export const runtime = "nodejs";

const W = 1080;
const H = 1920;

const BRONZE   = "#8A6A3F";
const INK      = "#0D0D0D";
const PAPER    = "#FBF8F2";
const SUBTLE   = "#E7E2D8";
const GREY_2   = "#2A2A2A";
const GREY_5   = "#555555";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const report = await getReportStore().get(id);
  if (!report) return new Response("Not found", { status: 404 });

  const title    = report.title  || "Untitled";
  const artist   = report.artist || "Unknown Artist";
  const year     = report.year   || "";
  const insight  = (report.artenaInsight || report.analysisSummary || "").trim().slice(0, 160);
  const imageUrl = report.representativeImageUrl || report.imageUrl;
  const link     = `artena.ai/report/${id}`;

  return new ImageResponse(
    (
      <div style={{
        width: `${W}px`, height: `${H}px`,
        display: "flex", flexDirection: "column",
        background: PAPER,
      }}>
        {/* ── Artwork (top, square 1080x1080) ────────────────── */}
        <div style={{
          width: "100%", height: "1080px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: INK, overflow: "hidden",
        }}>
          {imageUrl
            ? <img src={imageUrl} alt="" width={1080} height={1080} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                color: BRONZE,
              }}>
                <div style={{ fontSize: 48, letterSpacing: "0.18em" }}>◆</div>
                <div style={{ fontSize: 92, letterSpacing: "0.16em", fontWeight: 700 }}>ARTENA</div>
              </div>
            )
          }
        </div>

        {/* ── Editorial slab (bottom 840px) ──────────────────── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          padding: "70px 80px 90px",
        }}>
          {/* Brand line */}
          <div style={{
            display: "flex",
            fontSize: 22, color: BRONZE,
            letterSpacing: "0.22em", textTransform: "uppercase",
            marginBottom: 32,
          }}>
            ARTENA AI · Cultural Intelligence
          </div>

          {/* Artist */}
          <div style={{
            display: "flex",
            fontSize: 36, color: GREY_5,
            marginBottom: 12,
          }}>
            {artist}
          </div>

          {/* Title (+ year) */}
          <div style={{
            display: "flex",
            fontSize: 78, fontWeight: 700, color: INK,
            letterSpacing: "-0.02em", lineHeight: 1.05,
            marginBottom: year ? 14 : 28,
          }}>
            {title}
          </div>
          {year && (
            <div style={{
              display: "flex",
              fontSize: 28, color: "#9A9A9A",
              fontStyle: "italic", marginBottom: 36,
            }}>
              {year}
            </div>
          )}

          {/* Insight */}
          {insight && (
            <div style={{
              display: "flex",
              fontSize: 30, color: GREY_2,
              fontStyle: "italic", lineHeight: 1.5,
              borderLeft: `4px solid ${BRONZE}`,
              paddingLeft: 24, marginBottom: 36,
            }}>
              {insight}
            </div>
          )}

          {/* Spacer so footer hugs the bottom */}
          <div style={{ display: "flex", flex: 1 }} />

          {/* Footer — link + brand mark */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 30,
            borderTop: `1px solid ${SUBTLE}`,
          }}>
            <div style={{
              display: "flex",
              fontSize: 26, color: INK,
              letterSpacing: "0.04em",
            }}>
              {link}
            </div>
            <div style={{
              display: "flex", alignItems: "center",
              fontSize: 22, color: BRONZE,
              letterSpacing: "0.22em",
            }}>
              ◆ ARTENA
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
