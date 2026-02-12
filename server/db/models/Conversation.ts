import { DataTypes } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface ConversationAttributes {
  id: string;
  participant_1_id: string; // company user
  participant_2_id: string; // candidate user
  job_id?: string;
  application_id?: string;
  last_message_at?: Date;
  created_at?: Date;
}

export class Conversation extends BaseModel<ConversationAttributes> implements ConversationAttributes {
  declare id: string;
  declare participant_1_id: string;
  declare participant_2_id: string;
  declare job_id?: string;
  declare application_id?: string;
  declare last_message_at: Date;
  declare created_at: Date;
}

Conversation.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    participant_1_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    participant_2_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    job_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: 'jobs',
        key: 'id',
      },
    },
    application_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: 'applications',
        key: 'id',
      },
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'conversations',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['participant_1_id', 'participant_2_id', 'job_id'],
        name: 'idx_conversation_participants_job',
      },
      {
        fields: ['participant_1_id'],
        name: 'idx_conversation_participant_1',
      },
      {
        fields: ['participant_2_id'],
        name: 'idx_conversation_participant_2',
      },
    ],
  }
);
