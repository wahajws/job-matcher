import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface AdminNoteAttributes {
  id: string;
  candidate_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at?: Date;
}

export class AdminNote extends BaseModel<AdminNoteAttributes> implements AdminNoteAttributes {
  declare id: string;
  declare candidate_id: string;
  declare author_id: string;
  declare author_name: string;
  declare content: string;
  declare created_at: Date;
}

AdminNote.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    candidate_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'candidates',
        key: 'id',
      },
    },
    author_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    author_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'admin_notes',
    timestamps: false,
    underscored: true,
  }
);
