import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import { Router } from "express";
import httpErrors from "http-errors";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

const execFileAsync = promisify(execFile);

const EXTENSION = "mp4";
const MOVIES_DIR = path.resolve(UPLOAD_PATH, "movies");

export const movieRouter = Router();

// Skip bodyParser.raw - respond with ID immediately, process in background
movieRouter.post("/movies", (req, res, next) => {
  if (req.session.userId === undefined) {
    next(new httpErrors.Unauthorized());
    return;
  }

  const movieId = uuidv4();

  // Respond immediately
  res.status(200).type("application/json").send({ id: movieId });

  // Collect body and convert in background
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${movieId}_input`);
    const outputPath = path.join(MOVIES_DIR, `${movieId}.${EXTENSION}`);

    fs.mkdir(MOVIES_DIR, { recursive: true })
      .then(() => fs.writeFile(inputPath, body))
      .then(() =>
        execFileAsync("ffmpeg", [
          "-i", inputPath,
          "-y",
          "-t", "5",
          "-vf", "crop=min(iw\\,ih):min(iw\\,ih),scale=320:320,fps=12",
          "-vcodec", "libx264",
          "-pix_fmt", "yuv420p",
          "-crf", "28",
          "-preset", "fast",
          "-movflags", "+faststart",
          "-threads", "0",
          "-an",
          outputPath,
        ]),
      )
      .then(() => fs.unlink(inputPath).catch(() => {}))
      .catch(() => {});
  });
});
