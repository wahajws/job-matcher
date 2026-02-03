import { DataTypes, Model } from 'sequelize';
import sequelize from '../config.js';
import { BaseModel } from '../base/BaseModel.js';

export type JobStatus = 'draft' | 'published' | 'closed';
export type LocationType = 'onsite' | 'hybrid' | 'remote';
export type SeniorityLevel = 'internship' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal';

export interface JobAttributes {
  id: string;
  title: string;
  department: string;
  company?: string;
  location_type: LocationType;
  country: string;
  city: string;
  description: string;
  must_have_skills: any; // JSON
  nice_to_have_skills: any; // JSON
  min_years_experience: number;
  seniority_level: SeniorityLevel;
  status: JobStatus;
  created_at?: Date;
}

export class Job extends BaseModel<JobAttributes> implements JobAttributes {
  declare id: string;
  declare title: string;
  declare department: string;
  declare company?: string;
  declare location_type: LocationType;
  declare country: string;
  declare city: string;
  declare description: string;
  declare must_have_skills: any;
  declare nice_to_have_skills: any;
  declare min_years_experience: number;
  declare seniority_level: SeniorityLevel;
  declare status: JobStatus;
  declare created_at: Date;
}

Job.init(
  {
    id: {
      type: DataTypes.STRING(36),
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    location_type: {
      type: DataTypes.ENUM('onsite', 'hybrid', 'remote'),
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    must_have_skills: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    nice_to_have_skills: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    min_years_experience: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    seniority_level: {
      type: DataTypes.ENUM('junior', 'mid', 'senior', 'lead', 'principal'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'closed'),
      allowNull: false,
      defaultValue: 'draft',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'jobs',
    timestamps: false,
    underscored: true,
  }
);
