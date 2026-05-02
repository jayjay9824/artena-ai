// Headless mobile audit — captures console + network failures, asset
// load failures, and horizontal-scroll detection on a 375x812 viewport
// for a fixed list of routes. Writes a single JSON report.
//
// Usage:
//   PORT=3010 node scripts/mobile-audit.mjs <out.json>

import { chromium, devices } from "playwright";
import fs from "node:fs/promises";

const PORT   = process.env.PORT || "3010";
const BASE   = `http://localhost:${PORT}`;
const ROUTES = ["/", "/analyze", "/collection", "/profile"];
const OUT    = process.argv[2] || "audit-report.json";
const NAV_WAIT_MS = 7000;

const iPhone12 = devices["iPhone 12"];

const browser = await chromium.launch();
const context = await browser.newContext({
  ...iPhone12,
  // 375x812 hard pin per spec.
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

const report = { base: BASE, routes: [] };

for (const path of ROUTES) {
  const page = await context.newPage();
  const consoleErrors  = [];
  const consoleWarns   = [];
  const failedRequests = [];
  const httpFailures   = [];

  page.on("console", (msg) => {
    const t = msg.type();
    const txt = msg.text();
    if (t === "error") consoleErrors.push(txt);
    else if (t === "warning") consoleWarns.push(txt);
  });

  page.on("requestfailed", (req) => {
    failedRequests.push({
      url:    req.url(),
      method: req.method(),
      reason: req.failure()?.errorText ?? "unknown",
    });
  });

  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400) {
      httpFailures.push({
        url:    res.url(),
        status,
        type:   res.request().resourceType(),
      });
    }
  });

  let navError = null;
  let finalUrl = null;
  let httpStatus = null;
  try {
    const resp = await page.goto(BASE + path, {
      waitUntil: "domcontentloaded",
      timeout:   NAV_WAIT_MS,
    });
    httpStatus = resp?.status() ?? null;
    finalUrl   = page.url();
    // Give the page a beat to fire client-side requests.
    await page.waitForTimeout(2500);
  } catch (e) {
    navError = String(e?.message || e);
  }

  // Horizontal scroll check.
  let hScroll = null;
  let overflowSamples = [];
  if (!navError) {
    hScroll = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        scrollWidth:  root.scrollWidth,
        clientWidth:  root.clientWidth,
        overflows:    root.scrollWidth > root.clientWidth + 1,
      };
    });
    if (hScroll.overflows) {
      overflowSamples = await page.evaluate(() => {
        const max = document.documentElement.clientWidth;
        const offenders = [];
        const all = document.querySelectorAll("body *");
        for (const el of all) {
          const r = el.getBoundingClientRect();
          if (r.right > max + 1 || r.left < -1) {
            offenders.push({
              tag:    el.tagName.toLowerCase(),
              id:     el.id || null,
              klass:  (typeof el.className === "string" ? el.className : "") || null,
              left:   Math.round(r.left),
              right:  Math.round(r.right),
              width:  Math.round(r.width),
            });
            if (offenders.length >= 8) break;
          }
        }
        return offenders;
      });
    }
  }

  report.routes.push({
    path,
    finalUrl,
    httpStatus,
    navError,
    consoleErrors,
    consoleWarns,
    failedRequests,
    httpFailures,
    hScroll,
    overflowSamples,
  });

  await page.close();
}

await browser.close();
await fs.writeFile(OUT, JSON.stringify(report, null, 2));
console.log(`wrote ${OUT}`);
