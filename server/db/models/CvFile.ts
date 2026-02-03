import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export type CvStatus = 'uploaded' | 'parsing' | 'matrix_ready' | 'failed' | 'needs_review';

export interface CvFileAttributes {
  id: string;
  candidate_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  status: CvStatus;
  batch_tag?: string;
  uploaded_at?: Date;
  processed_at?: Date;
}

export class CvFile extends BaseModel<CvFileAttributes> implements CvFileAttributes {
  declare id: string;
  declare candidate_id: string;
  declare filename: string;
  declare file_path: string;
  declare file_size: number;
  declare status: CvStatus;
  declare batch_tag?: string;
  declare uploaded_at: Date;
  declare processed_at?: Date;
}

CvFile.init(
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
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('uploaded', 'parsing', 'matrix_ready', 'failed', 'needs_review'),
      allowNull: false,
      defaultValue: 'uploaded',
    },
    batch_tag: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'cv_files',
    timestamps: false,
    underscored: true,
  }
);
