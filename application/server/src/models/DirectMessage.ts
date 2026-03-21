import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  Op,
  Sequelize,
  UUIDV4,
} from "sequelize";

import { eventhub } from "@web-speed-hackathon-2026/server/src/eventhub";
import { DirectMessageConversation } from "@web-speed-hackathon-2026/server/src/models/DirectMessageConversation";
import { User } from "@web-speed-hackathon-2026/server/src/models/User";

export class DirectMessage extends Model<
  InferAttributes<DirectMessage>,
  InferCreationAttributes<DirectMessage>
> {
  declare id: CreationOptional<string>;
  declare conversationId: ForeignKey<DirectMessageConversation["id"]>;
  declare senderId: ForeignKey<User["id"]>;
  declare body: string;
  declare isRead: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare sender?: NonAttribute<User>;
  declare conversation?: NonAttribute<DirectMessageConversation>;
}

export function initDirectMessage(sequelize: Sequelize) {
  DirectMessage.init(
    {
      id: {
        allowNull: false,
        defaultValue: UUIDV4,
        primaryKey: true,
        type: DataTypes.UUID,
      },
      body: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      isRead: {
        allowNull: false,
        defaultValue: false,
        type: DataTypes.BOOLEAN,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      defaultScope: {
        include: [
          {
            association: "sender",
            include: [{ association: "profileImage" }],
          },
        ],
        order: [["createdAt", "ASC"]],
      },
    },
  );

  DirectMessage.addHook("afterSave", "onDmSaved", (message) => {
    // Run entirely in background - don't block the POST response
    const data = message.get();
    const conversationId = data.conversationId;
    const senderId = data.senderId;

    setImmediate(async () => {
      try {
        const conversation = await DirectMessageConversation.unscoped().findByPk(conversationId);
        if (conversation == null) return;

        const receiverId =
          conversation.initiatorId === senderId
            ? conversation.memberId
            : conversation.initiatorId;

        // Emit message event immediately (don't wait for unread count)
        const directMessage = await DirectMessage.findByPk(data.id);
        eventhub.emit(`dm:conversation/${conversationId}:message`, directMessage);

        // Calculate unread count in background
        const unreadCount = await DirectMessage.unscoped().count({
          where: {
            senderId: { [Op.ne]: receiverId },
            isRead: false,
          },
          include: [
            {
              association: "conversation",
              where: {
                [Op.or]: [{ initiatorId: receiverId }, { memberId: receiverId }],
              },
              required: true,
            },
          ],
        });
        eventhub.emit(`dm:unread/${receiverId}`, { unreadCount });
      } catch {}
    });
  });
}
