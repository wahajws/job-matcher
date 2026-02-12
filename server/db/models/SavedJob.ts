import { DataTypes } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface SavedJobAttributes {
  id: string;
  candidate_id: string;
  job_id: string;
  saved_at?: Date;
}

export class SavedJob extends BaseModel<SavedJobAttributes> implements SavedJobAttributes {
  declare id: string;
  declare candidate_id: string;
  declare job_id: string;
  declare saved_at: Date;
}

SavedJob.init(
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
    saved_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'saved_jobs',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['candidate_id', 'job_id'],
        name: 'idx_saved_jobs_candidate_job',
      },
    ],
  }
);
