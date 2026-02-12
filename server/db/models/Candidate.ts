import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export type ProfileVisibility = 'public' | 'applied_only' | 'hidden';

export interface CandidateAttributes {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  country_code: string;
  headline?: string;
  photo_url?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  profile_visibility?: ProfileVisibility;
  show_email?: boolean;
  show_phone?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class Candidate extends BaseModel<CandidateAttributes> implements CandidateAttributes {
  declare id: string;
  declare user_id?: string;
  declare name: string;
  declare email: string;
  declare phone: string;
  declare country: string;
  declare country_code: string;
  declare headline?: string;
  declare photo_url?: string;
  declare bio?: string;
  declare linkedin_url?: string;
  declare github_url?: string;
  declare portfolio_url?: string;
  declare profile_visibility: ProfileVisibility;
  declare show_email: boolean;
  declare show_phone: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

Candidate.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '',
    },
    country: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '',
    },
    country_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '',
    },
    headline: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    linkedin_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    github_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    portfolio_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    profile_visibility: {
      type: DataTypes.ENUM('public', 'applied_only', 'hidden'),
      allowNull: false,
      defaultValue: 'public',
    },
    show_email: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    show_phone: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'candidates',
    timestamps: false,
    underscored: true,
  }
);
