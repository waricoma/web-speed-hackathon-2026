import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import httpErrors from "http-errors";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

// 変換した画像の拡張子
const EXTENSION = "jpg";

// Extract ImageDescription from TIFF tag 270 or EXIF
function extractDescription(buf: Buffer): string {
  const str = buf.toString("utf8");
  // Search for TIFF ImageDescription tag content (Japanese text patterns)
  // TIFF tag 270 stores description as UTF-8 string
  const match = str.match(/[\u3000-\u9FFF\uF900-\uFAFF][\s\S]*?(?=\x00|\s{4,})/);
  if (match) {
    return match[0].trim();
  }
  return "";
}

export const imageRouter = Router();

imageRouter.post("/images", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }
  if (Buffer.isBuffer(req.body) === false) {
    throw new httpErrors.BadRequest();
  }

  const imageId = uuidv4();

  // Extract description from image metadata before conversion
  const alt = extractDescription(req.body);

  const outputBuffer = await sharp(req.body)
    .keepMetadata()
    .jpeg({ quality: 80 })
    .toBuffer();

  const filePath = path.resolve(UPLOAD_PATH, `./images/${imageId}.${EXTENSION}`);
  await fs.mkdir(path.resolve(UPLOAD_PATH, "images"), { recursive: true });
  await fs.writeFile(filePath, outputBuffer);

  return res.status(200).type("application/json").send({ id: imageId, alt });
});
