import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import sharp from "sharp";

import { PUBLIC_PATH, UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

export const imageOptimizeRouter = Router();

const CACHE_DIR = path.resolve(PUBLIC_PATH, "../.image-cache");

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function findFile(relPath: string): Promise<string | null> {
  for (const base of [PUBLIC_PATH, UPLOAD_PATH]) {
    const candidate = path.resolve(base, `.${relPath}`);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

imageOptimizeRouter.get(/\/(images)\/.*\.(jpg|jpeg|png)$/i, async (req, res, next) => {
  const accept = req.headers.accept || "";
  const supportsAvif = accept.includes("image/avif");
  const supportsWebp = accept.includes("image/webp");

  // Determine resize width
  const wParam = req.query["w"];
  const resizeWidth = wParam ? Math.min(Number(wParam), 1920) : undefined;

  // Auto-resize profile images to 128px if no width specified
  const isProfile = req.path.includes("/images/profiles/");
  const width = resizeWidth || (isProfile ? 128 : undefined);

  if (!supportsWebp && !supportsAvif && !width) {
    return next();
  }

  const format = supportsAvif ? "avif" : supportsWebp ? "webp" : "jpeg";
  const filePath = await findFile(req.path);
  if (!filePath) return next();

  const cacheKey = `${req.path.replace(/\//g, "_")}_w${width || "orig"}.${format}`;
  const cachePath = path.resolve(CACHE_DIR, cacheKey);

  try {
    const cached = await fs.readFile(cachePath);
    res.set("Content-Type", format === "jpeg" ? "image/jpeg" : `image/${format}`);
    res.set("Cache-Control", "public, max-age=86400");
    res.set("Vary", "Accept");
    return res.send(cached);
  } catch {
    // Cache miss
  }

  try {
    await ensureCacheDir();

    let pipeline = sharp(filePath);

    if (width) {
      pipeline = pipeline.resize(width, undefined, { withoutEnlargement: true });
    }

    if (format === "avif") {
      pipeline = pipeline.avif({ quality: 50 });
    } else if (format === "webp") {
      pipeline = pipeline.webp({ quality: 75 });
    } else {
      pipeline = pipeline.jpeg({ quality: 80 });
    }

    const buffer = await pipeline.toBuffer();
    await fs.writeFile(cachePath, buffer);

    res.set("Content-Type", format === "jpeg" ? "image/jpeg" : `image/${format}`);
    res.set("Cache-Control", "public, max-age=86400");
    res.set("Vary", "Accept");
    return res.send(buffer);
  } catch {
    return next();
  }
});
