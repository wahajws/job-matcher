import { DataTypes } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export type MemberRole = 'owner' | 'admin' | 'recruiter' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'deactivated';

export interface CompanyMemberAttributes {
  id: string;
  company_id: string;
  user_id?: string;
  email: string;
  role: MemberRole;
  invited_by: string;
  status: MemberStatus;
  invited_at?: Date;
  joined_at?: Date;
}

export class CompanyMember extends BaseModel<CompanyMemberAttributes> implements CompanyMemberAttributes {
  declare id: string;
  declare company_id: string;
  declare user_id?: string;
  declare email: string;
  declare role: MemberRole;
  declare invited_by: string;
  declare status: MemberStatus;
  declare invited_at: Date;
  declare joined_at?: Date;
}

CompanyMember.init(
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
    user_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'recruiter', 'viewer'),
      allowNull: false,
      defaultValue: 'recruiter',
    },
    invited_by: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'deactivated'),
      allowNull: false,
      defaultValue: 'pending',
    },
    invited_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'company_members',
    timestamps: false,
    underscored: true,
  }
);
