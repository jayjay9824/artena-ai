# AXVELA AI — Project Context (For Onboarding New Claude Sessions)

> **Quick handoff doc.** When starting a fresh Claude session (any
> environment — iPad, web, new terminal), paste this file or share
> the URL `github.com/jayjay9824/artena-ai/blob/main/AXVELA_AI_CONTEXT.md`
> so the assistant has the full state without re-discovery.

---

## What this project is

**AXVELA AI** — Cultural Intelligence consumer scanner app. Users
point a camera at an artwork (or upload an image) and the app
returns identification, market context, exhibition history, and a
shareable Quick Report. Korean-first, English secondary.

Brand: **AXVELA** / **AXVELA AI** / **CULTURAL INTELLIGENCE**.
Korean pronunciation: **엑스벨라**.

## Domains

| URL | Project | Purpose |
|---|---|---|
| `https://www.axvela.com` | **this repo** (`jayjay9824/artena-ai`) | Consumer scanner app — primary product |
| `https://www.artena-ai.com` | `axvela-console` (separate Vercel project, source at `C:\Users\jayja\artena-console`) | Gallery / B2B operating system console |
| `https://www.artxpark.com` | separate project | Marketing landing for ArtXpark (parent company) |

`/` on axvela.com redirects to `/analyze` (scanner home).
artena-ai.com points to a different Vercel project.

## Tech stack

- Next.js 16.2.3 App Router (Turbopack)
- TypeScript strict
- React 18
- Vercel auto-deploy on `main` push (GitHub webhook)
- AI: Claude (Opus 4.7 / Haiku 4.5) + Gemini hybrid (Gemini-primary
  for image analysis, Claude-fallback). Streaming with adaptive
  thinking. See `app/services/analyzeService.ts`.

## Working agreement (locked-in user preferences)

1. **Auto-deploy on every accepted change.** Commit + push to
   `main` immediately, do not ask permission. Vercel deploys
   automatically. (See `feedback_auto_deploy.md` in memory.)
2. **Verify before push.** Always run `npm run build` first; only
   push on green. If build fails, surface the issue, do not push.
3. **Don't break existing flow.** When in doubt, preserve current
   behavior and add a switch rather than refactor.
4. **Internal `artena_*` identifiers are intentional.** localStorage
   keys (`artena_language`, `artena_collection_v1`, `artena_my_v1`)
   and JSON payload keys (`artenaEvaluation`, `artenaInsight`, …)
   are kept for backward compat with stored data. UI-facing brand
   text is AXVELA / AXVELA AI / 엑스벨라.

## File / folder conventions

```
app/
  analyze/                      consumer scanner UI surface
    components/
      AnalysisProcessFlow.tsx   stage pipeline (stage.label.*, stage.caption.*)
      ProgressiveSections.tsx   stage row list
      QuickReport.tsx           scan result card
      MarketReport / MarketIntelligenceReport / ArtistReport
      IntroSplash.tsx           white→ocean intro with cookie-aware fade
    page.tsx                    AppShell that hosts every tab
  api/
    analyze/route.ts            full Claude analysis (sync user-facing)
    analyze/quick/route.ts      Haiku quick view (~2-3s)
    axvela-chat/route.ts        AXVELA AI overlay chat
    market-intelligence/route.ts
    valuation/route.ts
    reports/[id]/share-card/route.tsx OG share card renderer
    reports/generate/route.ts   background full report
  components/
    BottomNav.tsx               3-column grid: Collection / AXVELA AI / Profile
    home/                       MinimalHomeScreen + ScanOrb + OceanBackground
    scanner/                    SmartScannerScreen + camera lifecycle
    axvela-ai/                  AIModeOverlay + AxvelaAIChatModal (legacy)
  context/
    AIOverlayContext.tsx        global AXVELA AI overlay state
    LanguageProvider.tsx        i18n
    MyActivityContext.tsx       likes / saved (legacy "artena_my_v1" LS)
    TabContext.tsx              app-shell tab switching
  i18n/
    translations.ts             single-file KO + EN dict (flat dotted keys)
    LanguageProvider.tsx        Context, hydrates from V3 lib
    LanguageToggle.tsx          fixed top-right pill
    useLanguage.ts              hook → { t, lang, toggleLanguage }
  lib/
    brand.ts                    BRAND constant (UI-facing only)
    language.ts                 V3 storage util (axvela_lang + legacy mirror)
    i18n/safeT.ts               safe wrapper that hides raw i18n keys
  services/
    analyzeService.ts           hybrid Gemini→Claude analysis (full)
    ai/userLang.ts              request → "ko"|"en" + prompt injection
    ai/promptEngine.ts          AXVELA AI assistant system prompt
  utils/
    savedArtworks.ts            axvela:savedArtworks LS util (V1 saved feature)
    aiDrafts.ts                 axvela:aiDrafts LS util (gallery AI draft generator types only)
    browserDetect.ts            isKakaoInApp / isInAppBrowser / openInExternalBrowser
  layout.tsx                    async root layout, reads cookie for <html lang>
  page.tsx                      ArtXpark marketing landing (legacy /, redirected away)
public/
  ocean-background.jpg          6KB poster, used as KakaoTalk first-paint
  videos/ocean.mp4              14MB ocean video for home background
  og/axvela-og.png              1200×630 OG share card
```

## Major series shipped (chronological)

1. **AXVELA Hybrid AI Safe Launch — Phases 0–8.** Claude default +
   Gemini optional, Phase 8 flipped to Gemini-primary /
   Claude-fallback at user request.
2. **Camera Stability Final — Phases 1–8.** Strict
   artwork → label → QR pipeline. Phase 4 multi-scan session,
   Phase 5 stability-locked detection hook, Phase 7 QR safety
   classifier + Quick Report builder, Phase 8 CameraScanner
   integration component (not yet wired into production
   SmartScannerScreen).
3. **KakaoTalk in-app flicker fix — Steps 1–8.** Browser detect,
   ocean background preload, Intro/Home cross-fade with
   `introMounted` / `introDone` gates, SCAN shadow safety, viewport
   `--vh` sync, pointer-events audit. Plus a follow-up commit
   killing the remaining start-of-load flash via `<head>` critical
   CSS.
4. **Auto-scan flow restore.** Removed the "이 작품을 분석할까요?"
   confirm gate; mock cycle now auto-progresses to success.
5. **Animated process pipeline** during staged analysis
   (`AnalysisProcessFlow`).
6. **In-app browser SCAN gate (Steps 1–5).** KakaoTalk users see a
   warning modal instead of black-screen camera failure. Three
   recovery paths: external browser scheme, copy link, image
   upload via `<input capture="environment">`.
7. **Profile UX (Steps 1–4).** Profile saved-count card → real
   `<button>` with tap-safety, mobile globals.css pointer rules,
   `/profile/saved` page, savedArtworks util as single source of
   truth (with legacy collection_v1 migration on first read).
8. **AI Draft Generator (foundation only — Steps 1–8 spec).** Type
   model + localStorage util shipped (`app/types/aiDraft.ts`,
   `app/utils/aiDrafts.ts`). Page / prompt / UI not yet built —
   waiting on more spec detail (route, prompt template,
   role/auth, UI layout).
9. **Domain split.** axvela.com stays scanner; artena-ai.com moved
   to the separate `axvela-console` Vercel project.
10. **AXVELA FIXES v3 — Steps 1–12.** Language storage util, async
    `<html lang>` from cookie, Provider 4-surface sync, `safeT`
    helper, stage translation keys, stepper safeT migration,
    rejection language quick fix (server prompt injection +
    client mismatch guard), 3-column bottom nav (drops floating
    AI pill), brand constants, brand text consistency. Final QA
    in commit `993f412`.

## Recent commit log (most recent 15)

Run `git log --oneline -15` for the live list. As of last QA:

```
993f412 fix(brand): unify visible brand wording — Step 11
a4db511 feat(brand): UI-facing brand constants — Step 10
cfd3641 feat(nav): 3-column bottom nav, drop floating AI pill — Step 9
0beb15b fix(i18n): rejection message language quick fix — Step 8
60c182c fix(i18n): stepper uses safeT — Step 7
786b207 feat(i18n): stage label + caption keys — Step 6
e6dd472 feat(i18n): safeT helper — Step 5
622fe2e feat(i18n): provider syncs all four lang surfaces — Step 4
7db2c92 fix(layout): html lang reflects active locale — Step 3
5af0faf feat(lib): language storage utility — AXVELA FIXES v3 Step 2
9659995 chore(routing): drop host-aware redirect — artena-ai.com moved out
17334c9 feat(ai-draft): localStorage util + audit trail — Step 6 follow-up
b24158d feat(types): AI draft generator model — Step 6
0f2468a feat(saved): savedArtworks util — single source of truth — Step 4
47c4b26 feat(profile): saved artworks list page — Step 3
```

## How to onboard a fresh Claude session

In the new conversation, paste:

> Read `AXVELA_AI_CONTEXT.md` from
> `https://github.com/jayjay9824/artena-ai/blob/main/AXVELA_AI_CONTEXT.md`
> for the full project state. The repo is checked out at
> `C:\Users\jayja\OneDrive\Desktop\artena-ai`. Auto-deploy rule:
> commit + push on every accepted change.

If the new environment can't fetch URLs (some sandboxed mobile
apps), copy-paste this entire file into the first message instead.

## Open work / known gaps

- AI Draft Generator UI not built (only types + util landed).
  Spec items pending: route, prompt template, role/auth wiring,
  storage backend choice, UI layout.
- AXVELA AI overlay (`/api/axvela-chat`) lives at provider level,
  but its activation choreography that used to live on the home
  was deleted with the floating button. Animations could be
  reintroduced if the user wants.
- `next lint` is broken in Next.js 16 (parses `lint` as
  directory). Build's `tsc` pass covers types; standalone ESLint
  CLI hasn't been wired.
- Real-device QA on KakaoTalk / Naver / Instagram WebViews is the
  user's job — automation can't simulate those WebView quirks.
