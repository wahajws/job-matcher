import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface CandidateTagAttributes {
  id: string;
  candidate_id: string;
  tag_name: string;
  tag_color: string;
  created_at?: Date;
}

export class CandidateTag extends BaseModel<CandidateTagAttributes> implements CandidateTagAttributes {
  declare id: string;
  declare candidate_id: string;
  declare tag_name: string;
  declare tag_color: string;
  declare created_at: Date;
}

CandidateTag.init(
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
    tag_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tag_color: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '#3b82f6',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'candidate_tags',
    timestamps: false,
    underscored: true,
  }
);
