import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";
import httpErrors from "http-errors";

import { rawFindQaSuggestions } from "@web-speed-hackathon-2026/server/src/raw-queries";

export const crokRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const response = fs.readFileSync(path.join(__dirname, "crok-response.md"), "utf-8");

crokRouter.get("/crok/suggestions", async (_req, res) => {
  const suggestions = await rawFindQaSuggestions();
  res.set("Cache-Control", "public, max-age=3600");
  res.json({ suggestions });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

crokRouter.get("/crok", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let messageId = 0;

  // Stream in large chunks with longer intervals to reduce client-side re-renders
  const chunkSize = 140;
  for (let i = 0; i < response.length; i += chunkSize) {
    if (res.closed) break;

    const chunk = response.slice(i, i + chunkSize);
    const data = JSON.stringify({ text: chunk, done: false });
    res.write(`event: message\nid: ${messageId++}\ndata: ${data}\n\n`);

    await sleep(30);
  }

  if (!res.closed) {
    const data = JSON.stringify({ text: "", done: true });
    res.write(`event: message\nid: ${messageId}\ndata: ${data}\n\n`);
  }

  res.end();
});
