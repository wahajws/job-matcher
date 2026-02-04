import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface CandidateAttributes {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  country_code: string;
  headline?: string;
  created_at?: Date;
}

export class Candidate extends BaseModel<CandidateAttributes> implements CandidateAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare phone: string;
  declare country: string;
  declare country_code: string;
  declare headline?: string;
  declare created_at: Date;
}

Candidate.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true, // Prevent duplicate candidates by email
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    country_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    headline: {
      type: DataTypes.STRING(500),
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
    tableName: 'candidates',
    timestamps: false,
    underscored: true,
  }
);
