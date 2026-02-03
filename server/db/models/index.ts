import sequelize from '../config.js';
import { User } from './User.js';
import { Candidate } from './Candidate.js';
import { CvFile } from './CvFile.js';
import { CandidateMatrix } from './CandidateMatrix.js';
import { Job } from './Job.js';
import { JobMatrix } from './JobMatrix.js';
import { Match } from './Match.js';
import { AdminNote } from './AdminNote.js';
import { CandidateTag } from './CandidateTag.js';
import { JobReport } from './JobReport.js';

// Define associations
Candidate.hasMany(CvFile, { foreignKey: 'candidate_id', as: 'cvFiles' });
CvFile.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

Candidate.hasMany(CandidateMatrix, { foreignKey: 'candidate_id', as: 'matrices' });
CandidateMatrix.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

CvFile.hasOne(CandidateMatrix, { foreignKey: 'cv_file_id', as: 'matrix' });
CandidateMatrix.belongsTo(CvFile, { foreignKey: 'cv_file_id', as: 'cvFile' });

Job.hasOne(JobMatrix, { foreignKey: 'job_id', as: 'matrix' });
JobMatrix.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

Candidate.hasMany(Match, { foreignKey: 'candidate_id', as: 'matches' });
Match.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

Job.hasMany(Match, { foreignKey: 'job_id', as: 'matches' });
Match.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

Candidate.hasMany(AdminNote, { foreignKey: 'candidate_id', as: 'notes' });
AdminNote.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

Candidate.hasMany(CandidateTag, { foreignKey: 'candidate_id', as: 'tags' });
CandidateTag.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

Job.hasMany(JobReport, { foreignKey: 'job_id', as: 'reports' });
JobReport.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

export {
  sequelize,
  User,
  Candidate,
  CvFile,
  CandidateMatrix,
  Job,
  JobMatrix,
  Match,
  AdminNote,
  CandidateTag,
  JobReport,
};
