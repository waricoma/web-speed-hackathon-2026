import { Router } from "express";
import httpErrors from "http-errors";

import { Post } from "@web-speed-hackathon-2026/server/src/models";
import { rawFindComments, rawFindPostByPk, rawFindPosts } from "@web-speed-hackathon-2026/server/src/raw-queries";
import { responseCacheMiddleware, invalidateCacheByPrefix } from "@web-speed-hackathon-2026/server/src/response-cache";

export const postRouter = Router();

const postCache = responseCacheMiddleware(10_000);

postRouter.get("/posts", postCache, async (req, res) => {
  const posts = await rawFindPosts({
    limit: req.query["limit"] != null ? Number(req.query["limit"]) : undefined,
    offset: req.query["offset"] != null ? Number(req.query["offset"]) : undefined,
  });

  res.set("Cache-Control", "public, max-age=5, stale-while-revalidate=30");
  return res.status(200).type("application/json").send(posts);
});

postRouter.get("/posts/:postId", postCache, async (req, res) => {
  const post = await rawFindPostByPk(req.params.postId);

  if (post === null) {
    throw new httpErrors.NotFound();
  }

  res.set("Cache-Control", "public, max-age=10, stale-while-revalidate=60");
  return res.status(200).type("application/json").send(post);
});

postRouter.get("/posts/:postId/comments", postCache, async (req, res) => {
  const comments = await rawFindComments({
    postId: req.params.postId,
    limit: req.query["limit"] != null ? Number(req.query["limit"]) : undefined,
    offset: req.query["offset"] != null ? Number(req.query["offset"]) : undefined,
  });

  res.set("Cache-Control", "public, max-age=10, stale-while-revalidate=60");
  return res.status(200).type("application/json").send(comments);
});

postRouter.post("/posts", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  // Keep Sequelize for create (validation + associations)
  const post = await Post.create(
    {
      ...req.body,
      userId: req.session.userId,
    },
    {
      include: [
        {
          association: "images",
          through: { attributes: [] },
        },
        { association: "movie" },
        { association: "sound" },
      ],
    },
  );

  // Invalidate posts cache after new post creation
  invalidateCacheByPrefix("/api/v1/posts");

  return res.status(200).type("application/json").send(post);
});
