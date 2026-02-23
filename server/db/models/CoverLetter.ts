import { DataTypes } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface CoverLetterAttributes {
  id: string;
  candidate_id: string;
  job_id: string;
  content: string;
  tone: 'formal' | 'conversational' | 'enthusiastic';
  version: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class CoverLetter extends BaseModel<CoverLetterAttributes> implements CoverLetterAttributes {
  declare id: string;
  declare candidate_id: string;
  declare job_id: string;
  declare content: string;
  declare tone: 'formal' | 'conversational' | 'enthusiastic';
  declare version: number;
  declare is_active: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

CoverLetter.init(
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
      onDelete: 'CASCADE',
    },
    job_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'jobs',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tone: {
      type: DataTypes.ENUM('formal', 'conversational', 'enthusiastic'),
      allowNull: false,
      defaultValue: 'formal',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'cover_letters',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['candidate_id', 'job_id'],
        name: 'idx_cover_letters_candidate_job',
      },
    ],
  }
);
