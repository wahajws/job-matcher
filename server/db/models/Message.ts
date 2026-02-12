import { DataTypes } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface MessageAttributes {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at?: Date;
}

export class Message extends BaseModel<MessageAttributes> implements MessageAttributes {
  declare id: string;
  declare conversation_id: string;
  declare sender_id: string;
  declare content: string;
  declare read: boolean;
  declare created_at: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    conversation_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    sender_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['conversation_id', 'created_at'],
        name: 'idx_messages_conversation_created',
      },
      {
        fields: ['sender_id'],
        name: 'idx_messages_sender',
      },
    ],
  }
);
