import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import httpErrors from "http-errors";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";
import { extractMetadataFromSound } from "@web-speed-hackathon-2026/server/src/utils/extract_metadata_from_sound";

const EXTENSION = "wav";
const SOUNDS_DIR = path.resolve(UPLOAD_PATH, "sounds");

export const soundRouter = Router();

// Skip bodyParser.raw - stream request body, extract metadata from first chunk, respond immediately
soundRouter.post("/sounds", (req, res, next) => {
  if (req.session.userId === undefined) {
    next(new httpErrors.Unauthorized());
    return;
  }

  const soundId = uuidv4();
  const chunks: Buffer[] = [];
  let responded = false;

  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk);

    // Once we have enough data for metadata extraction (~512 bytes), respond immediately
    if (!responded) {
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      if (totalLen >= 512) {
        responded = true;
        const headerBuf = Buffer.concat(chunks);
        extractMetadataFromSound(headerBuf).then(({ artist, title }) => {
          res.status(200).type("application/json").send({ artist, id: soundId, title });
        });
      }
    }
  });

  req.on("end", () => {
    const fullBuf = Buffer.concat(chunks);

    // If we haven't responded yet (tiny file)
    if (!responded) {
      responded = true;
      extractMetadataFromSound(fullBuf).then(({ artist, title }) => {
        res.status(200).type("application/json").send({ artist, id: soundId, title });
      });
    }

    // Save file in background
    fs.mkdir(SOUNDS_DIR, { recursive: true })
      .then(() => fs.writeFile(path.join(SOUNDS_DIR, `${soundId}.${EXTENSION}`), fullBuf))
      .catch(() => {});
  });

  req.on("error", () => {
    if (!responded) {
      responded = true;
      next(new httpErrors.BadRequest());
    }
  });
});
