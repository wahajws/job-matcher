import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export interface CompanyProfileAttributes {
  id: string;
  user_id: string;
  company_name: string;
  logo_url?: string;
  industry?: string;
  company_size?: CompanySize;
  website?: string;
  description?: string;
  country?: string;
  city?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class CompanyProfile extends BaseModel<CompanyProfileAttributes> implements CompanyProfileAttributes {
  declare id: string;
  declare user_id: string;
  declare company_name: string;
  declare logo_url?: string;
  declare industry?: string;
  declare company_size?: CompanySize;
  declare website?: string;
  declare description?: string;
  declare country?: string;
  declare city?: string;
  declare created_at: Date;
  declare updated_at: Date;
}

CompanyProfile.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    company_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    industry: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    company_size: {
      type: DataTypes.ENUM('1-10', '11-50', '51-200', '201-500', '500+'),
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
    tableName: 'company_profiles',
    timestamps: false,
    underscored: true,
  }
);
