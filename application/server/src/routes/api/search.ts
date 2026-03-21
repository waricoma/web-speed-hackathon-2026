import { Router } from "express";

import { rawSearchPosts } from "@web-speed-hackathon-2026/server/src/raw-queries";
import { responseCacheMiddleware } from "@web-speed-hackathon-2026/server/src/response-cache";
import { parseSearchQuery } from "@web-speed-hackathon-2026/server/src/utils/parse_search_query.js";

export const searchRouter = Router();

searchRouter.get("/search", responseCacheMiddleware(15_000), async (req, res) => {
  const query = req.query["q"];

  if (typeof query !== "string" || query.trim() === "") {
    return res.status(200).type("application/json").send([]);
  }

  const { keywords, sinceDate, untilDate } = parseSearchQuery(query);

  if (!keywords && !sinceDate && !untilDate) {
    return res.status(200).type("application/json").send([]);
  }

  const searchTerm = keywords ? `%${keywords}%` : null;
  const limit = req.query["limit"] != null ? Number(req.query["limit"]) : undefined;
  const offset = req.query["offset"] != null ? Number(req.query["offset"]) : undefined;

  const result = await rawSearchPosts({ searchTerm, sinceDate, untilDate, limit, offset });

  return res.status(200).type("application/json").send(result);
});
