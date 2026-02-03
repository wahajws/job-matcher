import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface JobMatrixAttributes {
  id: string;
  job_id: string;
  required_skills: any; // JSON
  preferred_skills: any; // JSON
  experience_weight: number;
  location_weight: number;
  domain_weight: number;
  generated_at?: Date;
  qwen_model_version?: string;
}

export class JobMatrix extends BaseModel<JobMatrixAttributes> implements JobMatrixAttributes {
  declare id: string;
  declare job_id: string;
  declare required_skills: any;
  declare preferred_skills: any;
  declare experience_weight: number;
  declare location_weight: number;
  declare domain_weight: number;
  declare generated_at: Date;
  declare qwen_model_version?: string;
}

JobMatrix.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    job_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'jobs',
        key: 'id',
      },
    },
    required_skills: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    preferred_skills: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    experience_weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    location_weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    domain_weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    generated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    qwen_model_version: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'job_matrices',
    timestamps: false,
    underscored: true,
  }
);
