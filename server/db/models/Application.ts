import { DataTypes } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export type ApplicationStatus =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'
  | 'withdrawn';

export interface ApplicationAttributes {
  id: string;
  candidate_id: string;
  job_id: string;
  status: ApplicationStatus;
  cover_letter?: string;
  match_id?: string;
  notes?: any; // JSON — internal company notes
  pipeline_stage_id?: string;
  applied_at?: Date;
  updated_at?: Date;
}

export class Application extends BaseModel<ApplicationAttributes> implements ApplicationAttributes {
  declare id: string;
  declare candidate_id: string;
  declare job_id: string;
  declare status: ApplicationStatus;
  declare cover_letter?: string;
  declare match_id?: string;
  declare notes: any;
  declare pipeline_stage_id?: string;
  declare applied_at: Date;
  declare updated_at: Date;
}

Application.init(
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
    job_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'jobs',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'),
      allowNull: false,
      defaultValue: 'applied',
    },
    cover_letter: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    match_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: 'matches',
        key: 'id',
      },
    },
    notes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    pipeline_stage_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: 'pipeline_stages',
        key: 'id',
      },
    },
    applied_at: {
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
    tableName: 'applications',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['candidate_id', 'job_id'],
        name: 'idx_application_candidate_job',
      },
    ],
  }
);
