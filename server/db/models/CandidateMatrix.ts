import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface CandidateMatrixAttributes {
  id: string;
  candidate_id: string;
  cv_file_id: string;
  skills: any; // JSON
  roles: any; // JSON
  total_years_experience: number;
  domains: any; // JSON
  education: any; // JSON
  languages: any; // JSON
  location_signals: any; // JSON
  confidence: number;
  evidence: any; // JSON
  generated_at?: Date;
  qwen_model_version?: string;
}

export class CandidateMatrix extends BaseModel<CandidateMatrixAttributes> implements CandidateMatrixAttributes {
  declare id: string;
  declare candidate_id: string;
  declare cv_file_id: string;
  declare skills: any;
  declare roles: any;
  declare total_years_experience: number;
  declare domains: any;
  declare education: any;
  declare languages: any;
  declare location_signals: any;
  declare confidence: number;
  declare evidence: any;
  declare generated_at: Date;
  declare qwen_model_version?: string;
}

CandidateMatrix.init(
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
    cv_file_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'cv_files',
        key: 'id',
      },
    },
    skills: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    roles: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    total_years_experience: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    domains: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    education: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    languages: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    location_signals: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    confidence: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    evidence: {
      type: DataTypes.JSON,
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
    tableName: 'candidate_matrices',
    timestamps: false,
    underscored: true,
  }
);
