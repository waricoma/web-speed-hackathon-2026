import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

import { Router } from "express";

import { CLIENT_DIST_PATH } from "@web-speed-hackathon-2026/server/src/paths";
import { fetchSSRData } from "@web-speed-hackathon-2026/server/src/ssr/data-fetcher";

const require = createRequire(import.meta.url);

type RenderFn = (url: string, ssrData: Record<string, unknown>) => { html: string };

let render: RenderFn | null = null;
let htmlTemplate: string | null = null;
let ssrFailed = false;

// SSR response cache with pre-compressed Brotli (short TTL)
const ssrCache = new Map<string, { raw: string; br: Buffer; timestamp: number }>();
const SSR_CACHE_TTL_MS = 5000; // 5 seconds

function loadSSRBundle() {
  if (render || ssrFailed) return;
  try {
    const bundlePath = path.resolve(CLIENT_DIST_PATH, "../dist-ssr/entry-server.cjs");
    const ssrBundle = require(bundlePath);
    render = ssrBundle.render;
    htmlTemplate = readFileSync(path.resolve(CLIENT_DIST_PATH, "index.html"), "utf-8");
    console.log("SSR bundle loaded successfully");
  } catch (e) {
    console.error("SSR bundle not found, falling back to CSR:", e);
    ssrFailed = true;
  }
}

export function clearSSRCache() {
  ssrCache.clear();
}

export const ssrMiddleware = Router();

ssrMiddleware.use(async (req, res, next) => {
  // Only handle navigation requests (not API, not static assets)
  // Skip SSR for pages that don't benefit (auth-required, dynamic query)
  if (
    req.path.startsWith("/api") ||
    req.path.match(/\.\w+$/) ||
    req.path.startsWith("/dm") ||
    req.path.startsWith("/crok") ||
    req.path.startsWith("/search")
  ) {
    return next();
  }

  loadSSRBundle();
  if (!render || !htmlTemplate) {
    return next();
  }

  try {
    // Check SSR cache (static pages like /terms never expire)
    const isStaticPage = req.path === "/terms";
    const cached = ssrCache.get(req.path);
    if (cached && (isStaticPage || Date.now() - cached.timestamp < SSR_CACHE_TTL_MS)) {
      const acceptBr = (req.headers["accept-encoding"] || "").includes("br");
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", isStaticPage ? "public, max-age=3600" : "no-cache");
      if (acceptBr) {
        res.set("Content-Encoding", "br");
        return res.end(cached.br);
      }
      return res.send(cached.raw);
    }

    const ssrData = await fetchSSRData(req.path);

    // Skip SSR if no data was fetched for data-dependent pages
    const isDataPage = req.path.match(/^\/posts\/|^\/users\//);
    if (isDataPage && Object.keys(ssrData).length === 0) {
      return next(); // Fall back to CSR
    }

    let { html: appHtml } = render(req.path, ssrData);

    // Remove React 19 auto-injected preload links (cause hydration mismatch)
    appHtml = appHtml.replace(/<link rel="preload"[^>]*>/g, "");

    // Replace skeleton placeholder with SSR-rendered HTML
    // Use greedy match to capture nested divs inside <div id="app">...</div>
    let finalHtml = htmlTemplate.replace(
      /<div id="app">[\s\S]*<\/div>\s*<\/body>/,
      `<div id="app">${appHtml}</div>\n  </body>`,
    );

    // Inject SSR data for client hydration
    const ssrDataScript = `<script>window.__SSR_DATA__=${JSON.stringify(ssrData)}</script>`;
    finalHtml = finalHtml.replace("</head>", `${ssrDataScript}\n</head>`);

    // Inject <link rel="preload"> for LCP images from SSR data
    const preloadLinks: string[] = [];
    for (const [key, value] of Object.entries(ssrData)) {
      // Single post page: preload the first image
      if (key.match(/^\/api\/v1\/posts\/[^/]+$/) && value && typeof value === "object") {
        const post = value as any;
        if (post.images?.[0]?.id) {
          preloadLinks.push(`<link rel="preload" as="image" href="/images/${post.images[0].id}.jpg?w=640" type="image/avif" fetchpriority="high">`);
        }
      }
      // Timeline: preload first post's image
      if (key.includes("/posts?offset=0") && Array.isArray(value) && value.length > 0) {
        const first = value[0] as any;
        if (first?.images?.[0]?.id) {
          preloadLinks.push(`<link rel="preload" as="image" href="/images/${first.images[0].id}.jpg?w=640" type="image/avif" fetchpriority="high">`);
        }
        if (first?.user?.profileImage?.id) {
          preloadLinks.push(`<link rel="preload" as="image" href="/images/profiles/${first.user.profileImage.id}.jpg">`);
        }
      }
    }
    if (preloadLinks.length > 0) {
      finalHtml = finalHtml.replace("</head>", `${preloadLinks.join("\n")}\n</head>`);
    }

    // Remove prefetch script when SSR provides post data OR when page doesn't need posts (e.g. /terms)
    const isDatalessPage = ["/terms"].includes(req.path);
    if (ssrData["/api/v1/posts?offset=0&limit=5"] || isDatalessPage) {
      finalHtml = finalHtml.replace(
        /<script>\s*window\.__PREFETCH__[\s\S]*?<\/script>/,
        "",
      );
    }

    // Cache with pre-compressed Brotli
    const brCompressed = brotliCompressSync(Buffer.from(finalHtml), {
      params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
    });
    ssrCache.set(req.path, { raw: finalHtml, br: brCompressed, timestamp: Date.now() });

    const acceptBr = (req.headers["accept-encoding"] || "").includes("br");
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "no-cache");
    if (acceptBr) {
      res.set("Content-Encoding", "br");
      return res.end(brCompressed);
    }
    return res.send(finalHtml);
  } catch (err) {
    console.error("SSR render failed:", err);
    return next();
  }
});
