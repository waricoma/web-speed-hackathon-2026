import { promises as fs } from "node:fs";
import path from "node:path";

import { Router } from "express";

import { PUBLIC_PATH, UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

export const waveformRouter = Router();

// Simple cache for waveform data
const waveformCache = new Map<string, number[]>();

waveformRouter.get("/waveform/:soundId", async (req, res) => {
  const soundId = req.params.soundId;

  const cached = waveformCache.get(soundId);
  if (cached) {
    res.set("Cache-Control", "public, max-age=86400");
    return res.json({ peaks: cached });
  }

  // Find the sound file
  let filePath: string | null = null;
  for (const base of [UPLOAD_PATH, PUBLIC_PATH]) {
    const candidate = path.resolve(base, `sounds/${soundId}.mp3`);
    try {
      await fs.access(candidate);
      filePath = candidate;
      break;
    } catch {
      continue;
    }
  }

  if (!filePath) {
    return res.status(404).json({ error: "not found" });
  }

  try {
    const buffer = await fs.readFile(filePath);

    // Generate simple peaks from raw audio bytes
    // Sample 100 evenly-spaced amplitude values from the file
    const peaks: number[] = [];
    const numPeaks = 100;
    const chunkSize = Math.floor(buffer.length / numPeaks);

    for (let i = 0; i < numPeaks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, buffer.length);
      let maxVal = 0;
      for (let j = start; j < end; j += 2) {
        const val = Math.abs(buffer[j]! - 128) / 128;
        if (val > maxVal) maxVal = val;
      }
      peaks.push(maxVal);
    }

    // Normalize
    const maxPeak = Math.max(...peaks, 0.001);
    const normalized = peaks.map((p) => p / maxPeak);

    waveformCache.set(soundId, normalized);

    res.set("Cache-Control", "public, max-age=86400");
    return res.json({ peaks: normalized });
  } catch {
    return res.status(500).json({ error: "failed to generate waveform" });
  }
});
