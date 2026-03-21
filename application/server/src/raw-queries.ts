import { QueryTypes } from "sequelize";

import { getSequelize } from "@web-speed-hackathon-2026/server/src/sequelize";

// SQLite returns "2026-01-31 23:56:22.307 +00:00", Sequelize returned "2026-01-31T23:56:22.307Z"
function toISO(d: string | null): string | null {
  if (!d) return null;
  return new Date(d).toISOString();
}

// ---- Post queries ----

interface RawPost {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  user_id: string;
  user_description: string;
  user_name: string;
  user_username: string;
  user_createdAt: string;
  user_updatedAt: string;
  pi_id: string;
  pi_alt: string;
  pi_createdAt: string;
  pi_updatedAt: string;
  movie_id: string | null;
  movie_createdAt: string | null;
  movie_updatedAt: string | null;
  sound_id: string | null;
  sound_artist: string | null;
  sound_title: string | null;
  sound_createdAt: string | null;
  sound_updatedAt: string | null;
}

interface RawImage {
  postId: string;
  id: string;
  alt: string;
  createdAt: string;
  updatedAt: string;
}

const POST_BASE_SQL = `
  SELECT
    p.id, p.text, p.createdAt, p.updatedAt,
    u.id as user_id, u.description as user_description, u.name as user_name, u.username as user_username, u.createdAt as user_createdAt, u.updatedAt as user_updatedAt,
    pi.id as pi_id, pi.alt as pi_alt, pi.createdAt as pi_createdAt, pi.updatedAt as pi_updatedAt,
    m.id as movie_id, m.createdAt as movie_createdAt, m.updatedAt as movie_updatedAt,
    s.id as sound_id, s.artist as sound_artist, s.title as sound_title, s.createdAt as sound_createdAt, s.updatedAt as sound_updatedAt
  FROM Posts p
  JOIN Users u ON p.userId = u.id
  JOIN ProfileImages pi ON u.profileImageId = pi.id
  LEFT JOIN Movies m ON p.movieId = m.id
  LEFT JOIN Sounds s ON p.soundId = s.id
`;

function assemblePost(row: RawPost, imagesByPostId: Map<string, any[]>) {
  return {
    id: row.id,
    text: row.text,
    createdAt: toISO(row.createdAt),
    updatedAt: toISO(row.updatedAt),
    user: {
      description: row.user_description,
      id: row.user_id,
      name: row.user_name,
      username: row.user_username,
      createdAt: toISO(row.user_createdAt),
      updatedAt: toISO(row.user_updatedAt),
      profileImage: {
        alt: row.pi_alt,
        id: row.pi_id,
        createdAt: toISO(row.pi_createdAt),
        updatedAt: toISO(row.pi_updatedAt),
      },
    },
    images: imagesByPostId.get(row.id) || [],
    movie: row.movie_id
      ? { id: row.movie_id, createdAt: toISO(row.movie_createdAt), updatedAt: toISO(row.movie_updatedAt) }
      : null,
    sound: row.sound_id
      ? {
          artist: row.sound_artist,
          id: row.sound_id,
          title: row.sound_title,
          createdAt: toISO(row.sound_createdAt),
          updatedAt: toISO(row.sound_updatedAt),
        }
      : null,
  };
}

async function fetchImagesByPostIds(postIds: string[]): Promise<Map<string, any[]>> {
  if (postIds.length === 0) return new Map();

  const sequelize = getSequelize();
  const placeholders = postIds.map(() => "?").join(",");
  const images = await sequelize.query<RawImage>(
    `SELECT pir.postId, i.id, i.alt, i.createdAt, i.updatedAt
     FROM PostsImagesRelations pir
     JOIN Images i ON pir.imageId = i.id
     WHERE pir.postId IN (${placeholders})
     ORDER BY i.createdAt ASC`,
    { replacements: postIds, type: QueryTypes.SELECT },
  );

  const map = new Map<string, any[]>();
  for (const img of images) {
    const list = map.get(img.postId);
    const imgObj = { alt: img.alt, id: img.id, createdAt: toISO(img.createdAt), updatedAt: toISO(img.updatedAt) };
    if (list) {
      list.push(imgObj);
    } else {
      map.set(img.postId, [imgObj]);
    }
  }
  return map;
}

export async function rawSearchPosts(options: {
  searchTerm: string | null;
  sinceDate?: Date;
  untilDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const sequelize = getSequelize();
  const replacements: any[] = [];
  const conditions: string[] = [];

  // Date conditions
  if (options.sinceDate) {
    conditions.push("p.createdAt >= ?");
    replacements.push(options.sinceDate.toISOString());
  }
  if (options.untilDate) {
    conditions.push("p.createdAt <= ?");
    replacements.push(options.untilDate.toISOString());
  }

  // Text + user search
  if (options.searchTerm) {
    const userRows = await sequelize.query<{ id: string }>(
      "SELECT id FROM Users WHERE username LIKE ? OR name LIKE ?",
      { replacements: [options.searchTerm, options.searchTerm], type: QueryTypes.SELECT },
    );
    const userIds = userRows.map((u) => u.id);

    if (userIds.length > 0) {
      const placeholders = userIds.map(() => "?").join(",");
      conditions.push(`(p.text LIKE ? OR p.userId IN (${placeholders}))`);
      replacements.push(options.searchTerm, ...userIds);
    } else {
      conditions.push("p.text LIKE ?");
      replacements.push(options.searchTerm);
    }
  }

  let sql = POST_BASE_SQL;
  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY p.createdAt DESC";
  if (options.limit != null) {
    sql += " LIMIT ?";
    replacements.push(options.limit);
  }
  if (options.offset != null) {
    sql += " OFFSET ?";
    replacements.push(options.offset);
  }

  const rows = await sequelize.query<RawPost>(sql, { replacements, type: QueryTypes.SELECT });
  const postIds = rows.map((r) => r.id);
  const imagesByPostId = await fetchImagesByPostIds(postIds);
  return rows.map((row) => assemblePost(row, imagesByPostId));
}

export async function rawFindPosts(options: {
  limit?: number;
  offset?: number;
  where?: { userId?: string };
}): Promise<any[]> {
  const sequelize = getSequelize();
  const replacements: any[] = [];

  let sql = POST_BASE_SQL;
  if (options.where?.userId) {
    sql += " WHERE p.userId = ?";
    replacements.push(options.where.userId);
  }
  sql += " ORDER BY p.createdAt DESC";
  if (options.limit != null) {
    sql += " LIMIT ?";
    replacements.push(options.limit);
  }
  if (options.offset != null) {
    sql += " OFFSET ?";
    replacements.push(options.offset);
  }

  const rows = await sequelize.query<RawPost>(sql, { replacements, type: QueryTypes.SELECT });
  const postIds = rows.map((r) => r.id);
  const imagesByPostId = await fetchImagesByPostIds(postIds);

  return rows.map((row) => assemblePost(row, imagesByPostId));
}

export async function rawFindPostByPk(postId: string): Promise<any | null> {
  const sequelize = getSequelize();
  const rows = await sequelize.query<RawPost>(POST_BASE_SQL + " WHERE p.id = ?", {
    replacements: [postId],
    type: QueryTypes.SELECT,
  });

  if (rows.length === 0) return null;

  const imagesByPostId = await fetchImagesByPostIds([postId]);
  return assemblePost(rows[0]!, imagesByPostId);
}

// ---- Comment queries ----

interface RawComment {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  user_id: string;
  user_description: string;
  user_name: string;
  user_username: string;
  user_createdAt: string;
  user_updatedAt: string;
  pi_id: string;
  pi_alt: string;
  pi_createdAt: string;
  pi_updatedAt: string;
}

export async function rawFindComments(options: {
  postId: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const sequelize = getSequelize();
  const replacements: any[] = [options.postId];

  let sql = `
    SELECT
      c.id, c.text, c.createdAt, c.updatedAt,
      u.id as user_id, u.description as user_description, u.name as user_name, u.username as user_username, u.createdAt as user_createdAt, u.updatedAt as user_updatedAt,
      pi.id as pi_id, pi.alt as pi_alt, pi.createdAt as pi_createdAt, pi.updatedAt as pi_updatedAt
    FROM Comments c
    JOIN Users u ON c.userId = u.id
    JOIN ProfileImages pi ON u.profileImageId = pi.id
    WHERE c.postId = ?
    ORDER BY c.createdAt ASC
  `;

  if (options.limit != null) {
    sql += " LIMIT ?";
    replacements.push(options.limit);
  }
  if (options.offset != null) {
    sql += " OFFSET ?";
    replacements.push(options.offset);
  }

  const rows = await sequelize.query<RawComment>(sql, { replacements, type: QueryTypes.SELECT });

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    createdAt: toISO(row.createdAt),
    updatedAt: toISO(row.updatedAt),
    user: {
      description: row.user_description,
      id: row.user_id,
      name: row.user_name,
      username: row.user_username,
      createdAt: toISO(row.user_createdAt),
      updatedAt: toISO(row.user_updatedAt),
      profileImage: {
        alt: row.pi_alt,
        id: row.pi_id,
        createdAt: toISO(row.pi_createdAt),
        updatedAt: toISO(row.pi_updatedAt),
      },
    },
  }));
}

// ---- DM queries ----

function assembleUser(row: { id: string; description: string; name: string; username: string; createdAt: string; updatedAt: string; pi_id: string; pi_alt: string; pi_createdAt: string; pi_updatedAt: string }) {
  return {
    description: row.description,
    id: row.id,
    name: row.name,
    username: row.username,
    createdAt: toISO(row.createdAt),
    updatedAt: toISO(row.updatedAt),
    profileImage: {
      alt: row.pi_alt,
      id: row.pi_id,
      createdAt: toISO(row.pi_createdAt),
      updatedAt: toISO(row.pi_updatedAt),
    },
  };
}

export async function rawFindDMConversations(userId: string): Promise<any[]> {
  const sequelize = getSequelize();

  // 1) Get conversations for this user
  const convs = await sequelize.query<{
    id: string; initiatorId: string; memberId: string; createdAt: string; updatedAt: string;
  }>(
    "SELECT id, initiatorId, memberId, createdAt, updatedAt FROM DirectMessageConversations WHERE initiatorId = ? OR memberId = ?",
    { replacements: [userId, userId], type: QueryTypes.SELECT },
  );

  if (convs.length === 0) return [];
  const convIds = convs.map((c) => c.id);

  // 2) Get all users involved (initiators + members)
  const userIds = [...new Set(convs.flatMap((c) => [c.initiatorId, c.memberId]))];
  const userPlaceholders = userIds.map(() => "?").join(",");
  const users = await sequelize.query<any>(
    `SELECT u.id, u.description, u.name, u.username, u.createdAt, u.updatedAt,
            pi.id as pi_id, pi.alt as pi_alt, pi.createdAt as pi_createdAt, pi.updatedAt as pi_updatedAt
     FROM Users u JOIN ProfileImages pi ON u.profileImageId = pi.id
     WHERE u.id IN (${userPlaceholders})`,
    { replacements: userIds, type: QueryTypes.SELECT },
  );
  const userMap = new Map(users.map((u: any) => [u.id, assembleUser(u)]));

  // 3) Get only the last message per conversation + unread flag (instead of ALL messages)
  const convPlaceholders = convIds.map(() => "?").join(",");
  const lastMessages = await sequelize.query<any>(
    `SELECT dm.id, dm.body, dm.isRead, dm.createdAt, dm.updatedAt, dm.senderId, dm.conversationId,
            u.id as s_id, u.description as s_description, u.name as s_name, u.username as s_username, u.createdAt as s_createdAt, u.updatedAt as s_updatedAt,
            pi.id as s_pi_id, pi.alt as s_pi_alt, pi.createdAt as s_pi_createdAt, pi.updatedAt as s_pi_updatedAt
     FROM DirectMessages dm
     JOIN Users u ON dm.senderId = u.id
     JOIN ProfileImages pi ON u.profileImageId = pi.id
     WHERE dm.id IN (
       SELECT id FROM (
         SELECT id, conversationId, ROW_NUMBER() OVER (PARTITION BY conversationId ORDER BY createdAt DESC) as rn
         FROM DirectMessages WHERE conversationId IN (${convPlaceholders})
       ) WHERE rn = 1
     )`,
    { replacements: convIds, type: QueryTypes.SELECT },
  );

  const lastMsgByConv = new Map<string, any>();
  for (const m of lastMessages) {
    lastMsgByConv.set(m.conversationId, {
      id: m.id,
      body: m.body,
      isRead: !!m.isRead,
      createdAt: toISO(m.createdAt),
      updatedAt: toISO(m.updatedAt),
      sender: assembleUser({ id: m.s_id, description: m.s_description, name: m.s_name, username: m.s_username, createdAt: m.s_createdAt, updatedAt: m.s_updatedAt, pi_id: m.s_pi_id, pi_alt: m.s_pi_alt, pi_createdAt: m.s_pi_createdAt, pi_updatedAt: m.s_pi_updatedAt }),
    });
  }

  // 4) Get unread counts per conversation from the peer
  const unreadRows = await sequelize.query<{ conversationId: string; cnt: number }>(
    `SELECT conversationId, COUNT(*) as cnt FROM DirectMessages
     WHERE conversationId IN (${convPlaceholders}) AND senderId != ? AND isRead = 0
     GROUP BY conversationId`,
    { replacements: [...convIds, userId], type: QueryTypes.SELECT },
  );
  const unreadByConv = new Map(unreadRows.map((r) => [r.conversationId, r.cnt > 0]));

  // Build result - only conversations with messages, wrap lastMessage in array for client compat
  return convs
    .filter((c) => lastMsgByConv.has(c.id))
    .map((c) => {
      const lastMsg = lastMsgByConv.get(c.id);
      const hasUnread = unreadByConv.get(c.id) || false;
      // Client expects messages array - provide lastMessage + hasUnread flag in sender
      return {
        id: c.id,
        createdAt: toISO(c.createdAt),
        updatedAt: toISO(c.updatedAt),
        initiator: userMap.get(c.initiatorId),
        member: userMap.get(c.memberId),
        messages: lastMsg ? [{ ...lastMsg, isRead: hasUnread ? false : lastMsg.isRead }] : [],
      };
    })
    .sort((a, b) => {
      const aLast = a.messages[0]?.createdAt;
      const bLast = b.messages[0]?.createdAt;
      return new Date(bLast).getTime() - new Date(aLast).getTime();
    });
}

export async function rawFindDMMessages(conversationId: string, limit = 50): Promise<any[]> {
  const sequelize = getSequelize();
  // Fetch latest N messages (subquery for LIMIT with ASC order)
  const messages = await sequelize.query<any>(
    `SELECT * FROM (
       SELECT dm.id, dm.body, dm.isRead, dm.createdAt, dm.updatedAt, dm.senderId, dm.conversationId,
              u.id as s_id, u.description as s_description, u.name as s_name, u.username as s_username, u.createdAt as s_createdAt, u.updatedAt as s_updatedAt,
              pi.id as s_pi_id, pi.alt as s_pi_alt, pi.createdAt as s_pi_createdAt, pi.updatedAt as s_pi_updatedAt
       FROM DirectMessages dm
       JOIN Users u ON dm.senderId = u.id
       JOIN ProfileImages pi ON u.profileImageId = pi.id
       WHERE dm.conversationId = ?
       ORDER BY dm.createdAt DESC
       LIMIT ?
     ) sub ORDER BY sub.createdAt ASC`,
    { replacements: [conversationId, limit], type: QueryTypes.SELECT },
  );

  return messages.map((m: any) => ({
    id: m.id,
    body: m.body,
    isRead: !!m.isRead,
    createdAt: toISO(m.createdAt),
    updatedAt: toISO(m.updatedAt),
    sender: assembleUser({ id: m.s_id, description: m.s_description, name: m.s_name, username: m.s_username, createdAt: m.s_createdAt, updatedAt: m.s_updatedAt, pi_id: m.s_pi_id, pi_alt: m.s_pi_alt, pi_createdAt: m.s_pi_createdAt, pi_updatedAt: m.s_pi_updatedAt }),
  }));
}

// ---- QaSuggestion queries ----

export async function rawFindQaSuggestions(): Promise<string[]> {
  const sequelize = getSequelize();
  const rows = await sequelize.query<{ question: string }>(
    "SELECT question FROM qa_suggestions",
    { type: QueryTypes.SELECT },
  );
  return rows.map((r) => r.question);
}
