import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface JobReportAttributes {
  id: string;
  job_id: string;
  report_data: any; // JSON
  status: 'generating' | 'completed' | 'failed';
  generated_at?: Date;
  generated_by?: string;
  created_at?: Date;
}

export class JobReport extends BaseModel<JobReportAttributes> implements JobReportAttributes {
  declare id: string;
  declare job_id: string;
  declare report_data: any;
  declare status: 'generating' | 'completed' | 'failed';
  declare generated_at: Date;
  declare generated_by?: string;
  declare created_at: Date;
}

JobReport.init(
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
      onDelete: 'CASCADE',
    },
    report_data: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('generating', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'generating',
    },
    generated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    generated_by: {
      type: DataTypes.STRING(36),
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
    tableName: 'job_reports',
    timestamps: false,
  }
);
