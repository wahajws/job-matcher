import { DataTypes } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface PipelineStageAttributes {
  id: string;
  company_id: string;
  name: string;
  order: number;
  color: string;
  is_default: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class PipelineStage extends BaseModel<PipelineStageAttributes> implements PipelineStageAttributes {
  declare id: string;
  declare company_id: string;
  declare name: string;
  declare order: number;
  declare color: string;
  declare is_default: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

PipelineStage.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    company_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'company_profiles',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '#6B7280',
    },
    is_default: {
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
    tableName: 'pipeline_stages',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['company_id', 'order'],
        name: 'idx_pipeline_stage_company_order',
      },
    ],
  }
);
