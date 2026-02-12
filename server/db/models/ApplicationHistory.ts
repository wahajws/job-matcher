import { DataTypes } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export interface ApplicationHistoryAttributes {
  id: string;
  application_id: string;
  from_status: string;
  to_status: string;
  changed_by: string;
  note?: string;
  created_at?: Date;
}

export class ApplicationHistory extends BaseModel<ApplicationHistoryAttributes> implements ApplicationHistoryAttributes {
  declare id: string;
  declare application_id: string;
  declare from_status: string;
  declare to_status: string;
  declare changed_by: string;
  declare note?: string;
  declare created_at: Date;
}

ApplicationHistory.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    application_id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'applications',
        key: 'id',
      },
    },
    from_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    to_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    changed_by: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    note: {
      type: DataTypes.TEXT,
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
    tableName: 'application_history',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        fields: ['application_id'],
        name: 'idx_app_history_application',
      },
    ],
  }
);
