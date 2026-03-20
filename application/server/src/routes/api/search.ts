import { Router } from "express";
import { Op } from "sequelize";

import { Post, User } from "@web-speed-hackathon-2026/server/src/models";
import { parseSearchQuery } from "@web-speed-hackathon-2026/server/src/utils/parse_search_query.js";

export const searchRouter = Router();

searchRouter.get("/search", async (req, res) => {
  const query = req.query["q"];

  if (typeof query !== "string" || query.trim() === "") {
    return res.status(200).type("application/json").send([]);
  }

  const { keywords, sinceDate, untilDate } = parseSearchQuery(query);

  // キーワードも日付フィルターもない場合は空配列を返す
  if (!keywords && !sinceDate && !untilDate) {
    return res.status(200).type("application/json").send([]);
  }

  const searchTerm = keywords ? `%${keywords}%` : null;
  const limit = req.query["limit"] != null ? Number(req.query["limit"]) : undefined;
  const offset = req.query["offset"] != null ? Number(req.query["offset"]) : undefined;

  // 日付条件を構築
  const dateConditions: Record<symbol, Date>[] = [];
  if (sinceDate) {
    dateConditions.push({ [Op.gte]: sinceDate });
  }
  if (untilDate) {
    dateConditions.push({ [Op.lte]: untilDate });
  }
  const dateWhere =
    dateConditions.length > 0 ? { createdAt: Object.assign({}, ...dateConditions) } : {};

  // Single combined query: search by text OR by user name/username
  const whereClause: any = { ...dateWhere };

  if (searchTerm) {
    // Find user IDs matching the search term first
    const matchingUsers = await User.unscoped().findAll({
      attributes: ["id"],
      where: {
        [Op.or]: [{ username: { [Op.like]: searchTerm } }, { name: { [Op.like]: searchTerm } }],
      },
    });
    const userIds = matchingUsers.map((u: any) => u.id);

    if (userIds.length > 0) {
      whereClause[Op.or] = [
        { text: { [Op.like]: searchTerm } },
        { userId: { [Op.in]: userIds } },
      ];
    } else {
      whereClause.text = { [Op.like]: searchTerm };
    }
  }

  const result = await Post.findAll({
    limit,
    offset,
    where: whereClause,
  });

  return res.status(200).type("application/json").send(result);
});
