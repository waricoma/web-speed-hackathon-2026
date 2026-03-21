import { Router } from "express";
import httpErrors from "http-errors";
import { col, where, Op } from "sequelize";

import { eventhub } from "@web-speed-hackathon-2026/server/src/eventhub";
import {
  DirectMessage,
  DirectMessageConversation,
  User,
} from "@web-speed-hackathon-2026/server/src/models";
import { rawFindDMConversations, rawFindDMMessages } from "@web-speed-hackathon-2026/server/src/raw-queries";
import { getSequelize } from "@web-speed-hackathon-2026/server/src/sequelize";

export const directMessageRouter = Router();

directMessageRouter.get("/dm", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const result = await rawFindDMConversations(req.session.userId);
  return res.status(200).type("application/json").send(result);
});

directMessageRouter.post("/dm", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const peer = await User.findByPk(req.body?.peerId);
  if (peer === null) {
    throw new httpErrors.NotFound();
  }

  const [conversation] = await DirectMessageConversation.findOrCreate({
    where: {
      [Op.or]: [
        { initiatorId: req.session.userId, memberId: peer.id },
        { initiatorId: peer.id, memberId: req.session.userId },
      ],
    },
    defaults: {
      initiatorId: req.session.userId,
      memberId: peer.id,
    },
  });
  await conversation.reload();

  return res.status(200).type("application/json").send(conversation);
});

directMessageRouter.ws("/dm/unread", async (req, _res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const handler = (payload: unknown) => {
    req.ws.send(JSON.stringify({ type: "dm:unread", payload }));
  };

  eventhub.on(`dm:unread/${req.session.userId}`, handler);
  req.ws.on("close", () => {
    eventhub.off(`dm:unread/${req.session.userId}`, handler);
  });

  const unreadCount = await DirectMessage.count({
    distinct: true,
    where: {
      senderId: { [Op.ne]: req.session.userId },
      isRead: false,
    },
    include: [
      {
        association: "conversation",
        where: {
          [Op.or]: [{ initiatorId: req.session.userId }, { memberId: req.session.userId }],
        },
        required: true,
      },
    ],
  });

  eventhub.emit(`dm:unread/${req.session.userId}`, { unreadCount });
});

directMessageRouter.get("/dm/:conversationId", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const { QueryTypes } = await import("sequelize");
  const sequelize = getSequelize();
  const convRows = await sequelize.query<any>(
    `SELECT c.id, c.initiatorId, c.memberId, c.createdAt, c.updatedAt,
            i.id as i_id, i.description as i_desc, i.name as i_name, i.username as i_uname, i.createdAt as i_ca, i.updatedAt as i_ua,
            ipi.id as ipi_id, ipi.alt as ipi_alt, ipi.createdAt as ipi_ca, ipi.updatedAt as ipi_ua,
            m.id as m_id, m.description as m_desc, m.name as m_name, m.username as m_uname, m.createdAt as m_ca, m.updatedAt as m_ua,
            mpi.id as mpi_id, mpi.alt as mpi_alt, mpi.createdAt as mpi_ca, mpi.updatedAt as mpi_ua
     FROM DirectMessageConversations c
     JOIN Users i ON c.initiatorId = i.id JOIN ProfileImages ipi ON i.profileImageId = ipi.id
     JOIN Users m ON c.memberId = m.id JOIN ProfileImages mpi ON m.profileImageId = mpi.id
     WHERE c.id = ? AND (c.initiatorId = ? OR c.memberId = ?)`,
    { replacements: [req.params.conversationId, req.session.userId, req.session.userId], type: QueryTypes.SELECT },
  );

  if (convRows.length === 0) {
    throw new httpErrors.NotFound();
  }

  const c = convRows[0];
  const messages = await rawFindDMMessages(c.id);

  const toISO = (d: string) => new Date(d).toISOString();
  const result = {
    id: c.id,
    createdAt: toISO(c.createdAt),
    updatedAt: toISO(c.updatedAt),
    initiator: {
      description: c.i_desc, id: c.i_id, name: c.i_name, username: c.i_uname,
      createdAt: toISO(c.i_ca), updatedAt: toISO(c.i_ua),
      profileImage: { alt: c.ipi_alt, id: c.ipi_id, createdAt: toISO(c.ipi_ca), updatedAt: toISO(c.ipi_ua) },
    },
    member: {
      description: c.m_desc, id: c.m_id, name: c.m_name, username: c.m_uname,
      createdAt: toISO(c.m_ca), updatedAt: toISO(c.m_ua),
      profileImage: { alt: c.mpi_alt, id: c.mpi_id, createdAt: toISO(c.mpi_ca), updatedAt: toISO(c.mpi_ua) },
    },
    messages,
  };

  return res.status(200).type("application/json").send(result);
});

directMessageRouter.ws("/dm/:conversationId", async (req, _res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const conversation = await DirectMessageConversation.findOne({
    where: {
      id: req.params.conversationId,
      [Op.or]: [{ initiatorId: req.session.userId }, { memberId: req.session.userId }],
    },
  });
  if (conversation == null) {
    throw new httpErrors.NotFound();
  }

  const peerId =
    conversation.initiatorId !== req.session.userId
      ? conversation.initiatorId
      : conversation.memberId;

  const handleMessageUpdated = (payload: unknown) => {
    req.ws.send(JSON.stringify({ type: "dm:conversation:message", payload }));
  };
  eventhub.on(`dm:conversation/${conversation.id}:message`, handleMessageUpdated);
  req.ws.on("close", () => {
    eventhub.off(`dm:conversation/${conversation.id}:message`, handleMessageUpdated);
  });

  const handleTyping = (payload: unknown) => {
    req.ws.send(JSON.stringify({ type: "dm:conversation:typing", payload }));
  };
  eventhub.on(`dm:conversation/${conversation.id}:typing/${peerId}`, handleTyping);
  req.ws.on("close", () => {
    eventhub.off(`dm:conversation/${conversation.id}:typing/${peerId}`, handleTyping);
  });
});

directMessageRouter.post("/dm/:conversationId/messages", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const body: unknown = req.body?.body;
  if (typeof body !== "string" || body.trim().length === 0) {
    throw new httpErrors.BadRequest();
  }

  const conversation = await DirectMessageConversation.findOne({
    where: {
      id: req.params.conversationId,
      [Op.or]: [{ initiatorId: req.session.userId }, { memberId: req.session.userId }],
    },
  });
  if (conversation === null) {
    throw new httpErrors.NotFound();
  }

  const message = await DirectMessage.create({
    body: body.trim(),
    conversationId: conversation.id,
    senderId: req.session.userId,
  });
  await message.reload();

  return res.status(201).type("application/json").send(message);
});

directMessageRouter.post("/dm/:conversationId/read", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const conversation = await DirectMessageConversation.findOne({
    where: {
      id: req.params.conversationId,
      [Op.or]: [{ initiatorId: req.session.userId }, { memberId: req.session.userId }],
    },
  });
  if (conversation === null) {
    throw new httpErrors.NotFound();
  }

  const peerId =
    conversation.initiatorId !== req.session.userId
      ? conversation.initiatorId
      : conversation.memberId;

  await DirectMessage.update(
    { isRead: true },
    {
      where: { conversationId: conversation.id, senderId: peerId, isRead: false },
    },
  );

  return res.status(200).type("application/json").send({});
});

directMessageRouter.post("/dm/:conversationId/typing", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }

  const conversation = await DirectMessageConversation.findByPk(req.params.conversationId);
  if (conversation === null) {
    throw new httpErrors.NotFound();
  }

  eventhub.emit(`dm:conversation/${conversation.id}:typing/${req.session.userId}`, {});

  return res.status(200).type("application/json").send({});
});
