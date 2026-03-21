import { QueryTypes } from "sequelize";

import { rawFindComments, rawFindPostByPk, rawFindPosts } from "@web-speed-hackathon-2026/server/src/raw-queries";
import { getSequelize } from "@web-speed-hackathon-2026/server/src/sequelize";

export async function fetchSSRData(url: string): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  // Timeline: /
  if (url === "/") {
    const posts = await rawFindPosts({ limit: 5, offset: 0 });
    data["/api/v1/posts?offset=0&limit=5"] = posts;
  }

  // Post detail: /posts/:postId
  const postMatch = url.match(/^\/posts\/([^/]+)$/);
  if (postMatch) {
    const postId = postMatch[1]!;
    const post = await rawFindPostByPk(postId);
    if (post) {
      data[`/api/v1/posts/${postId}`] = post;
      const comments = await rawFindComments({ postId, limit: 30, offset: 0 });
      data[`/api/v1/posts/${postId}/comments?offset=0&limit=30`] = comments;
    }
  }

  // User profile: /users/:username
  const userMatch = url.match(/^\/users\/([^/]+)$/);
  if (userMatch) {
    const username = userMatch[1]!;
    const sequelize = getSequelize();
    const users = await sequelize.query<{ id: string; description: string; name: string; username: string; createdAt: string; updatedAt: string; pi_id: string; pi_alt: string; pi_createdAt: string; pi_updatedAt: string }>(
      `SELECT u.id, u.description, u.name, u.username, u.createdAt, u.updatedAt,
              pi.id as pi_id, pi.alt as pi_alt, pi.createdAt as pi_createdAt, pi.updatedAt as pi_updatedAt
       FROM Users u
       JOIN ProfileImages pi ON u.profileImageId = pi.id
       WHERE u.username = ?`,
      { replacements: [username], type: QueryTypes.SELECT },
    );
    if (users.length > 0) {
      const u = users[0]!;
      data[`/api/v1/users/${username}`] = {
        description: u.description,
        id: u.id,
        name: u.name,
        username: u.username,
        createdAt: new Date(u.createdAt).toISOString(),
        updatedAt: new Date(u.updatedAt).toISOString(),
        profileImage: {
          alt: u.pi_alt,
          id: u.pi_id,
          createdAt: new Date(u.pi_createdAt).toISOString(),
          updatedAt: new Date(u.pi_updatedAt).toISOString(),
        },
      };
      const posts = await rawFindPosts({ where: { userId: u.id }, limit: 5, offset: 0 });
      data[`/api/v1/users/${username}/posts?offset=0&limit=5`] = posts;
    }
  }

  return data;
}
