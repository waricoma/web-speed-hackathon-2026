import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import httpErrors from "http-errors";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

const EXTENSION = "jpg";
const IMAGES_DIR = path.resolve(UPLOAD_PATH, "images");

function extractDescription(buf: Buffer): string {
  const str = buf.toString("utf8");
  const match = str.match(/[\u3000-\u9FFF\uF900-\uFAFF][\s\S]*?(?=\x00|\s{4,})/);
  if (match) {
    return match[0].trim();
  }
  return "";
}

export const imageRouter = Router();

// Skip bodyParser.raw - handle streaming manually for instant response
imageRouter.post("/images", (req, res, next) => {
  if (req.session.userId === undefined) {
    next(new httpErrors.Unauthorized());
    return;
  }

  const imageId = uuidv4();
  const chunks: Buffer[] = [];
  let altExtracted = false;
  let alt = "";

  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk);

    // Extract alt from first chunk (TIFF header contains ImageDescription)
    if (!altExtracted && chunks.length === 1 && chunk.length >= 256) {
      alt = extractDescription(chunk);
      altExtracted = true;

      // Respond immediately with ID and alt
      res.status(200).type("application/json").send({ id: imageId, alt });
    }
  });

  req.on("end", () => {
    // If we haven't responded yet (very small file)
    if (!altExtracted) {
      const fullBuf = Buffer.concat(chunks);
      alt = extractDescription(fullBuf);
      res.status(200).type("application/json").send({ id: imageId, alt });
    }

    // Save file in background
    const fullBuf = Buffer.concat(chunks);
    fs.mkdir(IMAGES_DIR, { recursive: true })
      .then(() => sharp(fullBuf).keepMetadata().jpeg({ quality: 80 }).toFile(
        path.join(IMAGES_DIR, `${imageId}.${EXTENSION}`),
      ))
      .catch(() => {});
  });

  req.on("error", () => {
    if (!altExtracted) {
      next(new httpErrors.BadRequest());
    }
  });
});
