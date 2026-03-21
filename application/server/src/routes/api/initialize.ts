import fs from "node:fs/promises";

import { Router } from "express";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

import { initializeSequelize } from "../../sequelize";
import { sessionStore } from "../../session";
import { clearSSRCache } from "@web-speed-hackathon-2026/server/src/ssr/ssr-middleware";
import { clearResponseCache } from "@web-speed-hackathon-2026/server/src/response-cache";

export const initializeRouter = Router();

initializeRouter.post("/initialize", async (_req, res) => {
  // DBリセット
  await initializeSequelize();
  // sessionStoreをクリア
  sessionStore.clear();
  // SSRキャッシュをクリア
  clearSSRCache();
  // APIレスポンスキャッシュをクリア
  clearResponseCache();
  // uploadディレクトリをクリア
  await fs.rm(UPLOAD_PATH, { force: true, recursive: true });

  return res.status(200).type("application/json").send({});
});
