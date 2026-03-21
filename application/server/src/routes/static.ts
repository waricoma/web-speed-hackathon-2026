import { existsSync } from "node:fs";
import path from "node:path";

import history from "connect-history-api-fallback";
import { Router } from "express";
import serveStatic from "serve-static";

import {
  CLIENT_DIST_PATH,
  PUBLIC_PATH,
  UPLOAD_PATH,
} from "@web-speed-hackathon-2026/server/src/paths";

export const staticRouter = Router();

// Serve pre-compressed brotli/gzip files for dist assets
const CONTENT_TYPES: Record<string, string> = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

staticRouter.use((req, res, next) => {
  // Only for dist assets (scripts/, styles/)
  if (!req.path.match(/\.(js|css|html|json|svg)$/)) return next();

  const acceptEncoding = req.headers["accept-encoding"] || "";
  const ext = path.extname(req.path);
  const contentType = CONTENT_TYPES[ext];

  if (acceptEncoding.includes("br")) {
    const brPath = path.join(CLIENT_DIST_PATH, req.path + ".br");
    if (existsSync(brPath)) {
      res.set("Content-Encoding", "br");
      res.set("Content-Type", contentType || "application/octet-stream");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.set("Vary", "Accept-Encoding");
      return res.sendFile(brPath);
    }
  }

  if (acceptEncoding.includes("gzip")) {
    const gzPath = path.join(CLIENT_DIST_PATH, req.path + ".gz");
    if (existsSync(gzPath)) {
      res.set("Content-Encoding", "gzip");
      res.set("Content-Type", contentType || "application/octet-stream");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.set("Vary", "Accept-Encoding");
      return res.sendFile(gzPath);
    }
  }

  next();
});

// Resolve extensionless sound paths to .mp3 (existing) or .wav (new uploads)
const SOUND_CONTENT_TYPES: Record<string, string> = { ".mp3": "audio/mpeg", ".wav": "audio/wav" };
staticRouter.use("/sounds", (req, res, next) => {
  if (path.extname(req.path)) return next(); // already has extension
  for (const ext of [".mp3", ".wav"]) {
    for (const base of [UPLOAD_PATH, PUBLIC_PATH]) {
      const filePath = path.join(base, "sounds", req.path + ext);
      if (existsSync(filePath)) {
        res.set("Content-Type", SOUND_CONTENT_TYPES[ext]!);
        res.set("Cache-Control", "public, max-age=86400");
        return res.sendFile(filePath);
      }
    }
  }
  next();
});

// SPA 対応のため、ファイルが存在しないときに index.html を返す
staticRouter.use(history());

staticRouter.use(
  serveStatic(UPLOAD_PATH, {
    etag: true,
    lastModified: true,
    maxAge: "1d",
  }),
);

staticRouter.use(
  serveStatic(PUBLIC_PATH, {
    etag: true,
    lastModified: true,
    maxAge: "1d",
  }),
);

staticRouter.use(
  serveStatic(CLIENT_DIST_PATH, {
    etag: true,
    lastModified: true,
    maxAge: "1y",
    immutable: true,
  }),
);
