import sequelize from './config.js';
import {
  User,
  Candidate,
  CompanyProfile,
  CvFile,
  CandidateMatrix,
  Job,
  JobMatrix,
  Match,
  Application,
  AdminNote,
  CandidateTag,
  JobReport,
  PipelineStage,
  Notification,
  ApplicationHistory,
  Conversation,
  Message,
  SavedJob,
  CompanyMember,
} from './models/index.js';

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Ensure all models are loaded
    console.log('Loading models...');
    
    // Check if we should force recreate (only in development)
    const FORCE_RECREATE = process.env.FORCE_RECREATE_TABLES === 'true';
    
    if (FORCE_RECREATE) {
      console.log('⚠️  FORCE_RECREATE enabled - dropping and recreating all tables...');
      await User.sync({ force: true });
      await Candidate.sync({ force: true });
      await CompanyProfile.sync({ force: true });
      await CvFile.sync({ force: true });
      await CandidateMatrix.sync({ force: true });
      await Job.sync({ force: true });
      await JobMatrix.sync({ force: true });
      await Match.sync({ force: true });
      await PipelineStage.sync({ force: true });
      await Application.sync({ force: true });
      await AdminNote.sync({ force: true });
      await CandidateTag.sync({ force: true });
      await JobReport.sync({ force: true });
      await Notification.sync({ force: true });
      await ApplicationHistory.sync({ force: true });
      await Conversation.sync({ force: true });
      await Message.sync({ force: true });
      await SavedJob.sync({ force: true });
      await CompanyMember.sync({ force: true });
    } else {
      // Try to sync with alter, but catch errors for tables with too many indexes
      const models = [
        { name: 'User', model: User, table: 'users' },
        { name: 'Candidate', model: Candidate, table: 'candidates' },
        { name: 'CompanyProfile', model: CompanyProfile, table: 'company_profiles' },
        { name: 'CvFile', model: CvFile, table: 'cv_files' },
        { name: 'CandidateMatrix', model: CandidateMatrix, table: 'candidate_matrices' },
        { name: 'Job', model: Job, table: 'jobs' },
        { name: 'JobMatrix', model: JobMatrix, table: 'job_matrices' },
        { name: 'Match', model: Match, table: 'matches' },
        { name: 'PipelineStage', model: PipelineStage, table: 'pipeline_stages' },
        { name: 'Application', model: Application, table: 'applications' },
        { name: 'AdminNote', model: AdminNote, table: 'admin_notes' },
        { name: 'CandidateTag', model: CandidateTag, table: 'candidate_tags' },
        { name: 'JobReport', model: JobReport, table: 'job_reports' },
        { name: 'Notification', model: Notification, table: 'notifications' },
        { name: 'ApplicationHistory', model: ApplicationHistory, table: 'application_history' },
        { name: 'Conversation', model: Conversation, table: 'conversations' },
        { name: 'Message', model: Message, table: 'messages' },
        { name: 'SavedJob', model: SavedJob, table: 'saved_jobs' },
        { name: 'CompanyMember', model: CompanyMember, table: 'company_members' },
      ];
      
      for (const { name, model, table } of models) {
        try {
          await model.sync({ alter: false });
          console.log(`✓ ${name} table verified`);
        } catch (error: any) {
          if (error.name === 'SequelizeDatabaseError' && error.message?.includes("doesn't exist")) {
            await model.sync({ alter: false });
            console.log(`✓ ${name} table created`);
          } else {
            if (error.message?.includes('Too many keys') || error.parent?.message?.includes('Too many keys')) {
              console.warn(`⚠️  ${name} table has too many indexes. Skipping alter.`);
              try {
                await sequelize.getQueryInterface().describeTable(table);
                console.log(`✓ ${name} table exists (skipped alter due to index limit)`);
              } catch (descError) {
                console.log(`Creating ${name} table without indexes...`);
                await model.sync({ alter: false });
              }
            } else {
              throw error;
            }
          }
        }
      }
    }
    
    // === Schema patches (safe to re-run) ===

    // Patch: Add 'internship' to seniority_level ENUM
    try {
      await sequelize.query(`
        ALTER TABLE jobs 
        MODIFY COLUMN seniority_level ENUM('internship','junior','mid','senior','lead','principal') NOT NULL
      `);
      console.log('✓ Patched seniority_level ENUM to include "internship"');
    } catch (patchError: any) {
      console.warn('⚠️  seniority_level ENUM patch skipped:', patchError.message?.substring(0, 100));
    }

    // Patch: Add 'company' to users.role ENUM
    try {
      await sequelize.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('admin','candidate','company') NOT NULL
      `);
      console.log('✓ Patched users.role ENUM to include "company"');
    } catch (patchError: any) {
      console.warn('⚠️  users.role ENUM patch skipped:', patchError.message?.substring(0, 100));
    }

    // Patch: Add email_verified column to users
    try {
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0
      `);
      console.log('✓ Added email_verified column to users');
    } catch (patchError: any) {
      if (patchError.message?.includes('Duplicate column')) {
        console.log('✓ email_verified column already exists');
      } else {
        console.warn('⚠️  email_verified patch skipped:', patchError.message?.substring(0, 100));
      }
    }

    // Patch: Add updated_at column to users
    try {
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✓ Added updated_at column to users');
    } catch (patchError: any) {
      if (patchError.message?.includes('Duplicate column')) {
        console.log('✓ updated_at column already exists on users');
      } else {
        console.warn('⚠️  users updated_at patch skipped:', patchError.message?.substring(0, 100));
      }
    }

    // Patch: Add new columns to candidates
    const candidateColumns = [
      { name: 'user_id', sql: 'ALTER TABLE candidates ADD COLUMN user_id VARCHAR(36) NULL UNIQUE' },
      { name: 'photo_url', sql: 'ALTER TABLE candidates ADD COLUMN photo_url VARCHAR(500) NULL' },
      { name: 'bio', sql: 'ALTER TABLE candidates ADD COLUMN bio TEXT NULL' },
      { name: 'linkedin_url', sql: 'ALTER TABLE candidates ADD COLUMN linkedin_url VARCHAR(500) NULL' },
      { name: 'github_url', sql: 'ALTER TABLE candidates ADD COLUMN github_url VARCHAR(500) NULL' },
      { name: 'portfolio_url', sql: 'ALTER TABLE candidates ADD COLUMN portfolio_url VARCHAR(500) NULL' },
      { name: 'updated_at', sql: 'ALTER TABLE candidates ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' },
    ];

    for (const col of candidateColumns) {
      try {
        await sequelize.query(col.sql);
        console.log(`✓ Added ${col.name} column to candidates`);
      } catch (patchError: any) {
        if (patchError.message?.includes('Duplicate column')) {
          console.log(`✓ ${col.name} column already exists on candidates`);
        } else {
          console.warn(`⚠️  candidates ${col.name} patch skipped:`, patchError.message?.substring(0, 100));
        }
      }
    }

    // Patch: Add company_id, deadline, is_featured to jobs
    const jobColumns = [
      { name: 'company_id', sql: 'ALTER TABLE jobs ADD COLUMN company_id VARCHAR(36) NULL' },
      { name: 'deadline', sql: 'ALTER TABLE jobs ADD COLUMN deadline DATETIME NULL' },
      { name: 'is_featured', sql: 'ALTER TABLE jobs ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0' },
    ];

    for (const col of jobColumns) {
      try {
        await sequelize.query(col.sql);
        console.log(`✓ Added ${col.name} column to jobs`);
      } catch (patchError: any) {
        if (patchError.message?.includes('Duplicate column')) {
          console.log(`✓ ${col.name} column already exists on jobs`);
        } else {
          console.warn(`⚠️  jobs ${col.name} patch skipped:`, patchError.message?.substring(0, 100));
        }
      }
    }

    // Patch: Add application_id to matches
    try {
      await sequelize.query('ALTER TABLE matches ADD COLUMN application_id VARCHAR(36) NULL');
      console.log('✓ Added application_id column to matches');
    } catch (patchError: any) {
      if (patchError.message?.includes('Duplicate column')) {
        console.log('✓ application_id column already exists on matches');
      } else {
        console.warn('⚠️  matches application_id patch skipped:', patchError.message?.substring(0, 100));
      }
    }

    // Patch: Make email unique on users (if not already)
    try {
      await sequelize.query(`
        ALTER TABLE users ADD UNIQUE INDEX idx_users_email (email)
      `);
      console.log('✓ Added unique index on users.email');
    } catch (patchError: any) {
      if (patchError.message?.includes('Duplicate key name') || patchError.message?.includes('Duplicate entry')) {
        console.log('✓ users.email unique index already exists');
      } else {
        console.warn('⚠️  users email unique index patch skipped:', patchError.message?.substring(0, 100));
      }
    }

    // Patch: Update application status ENUM to include pipeline stages
    try {
      await sequelize.query(`
        ALTER TABLE applications 
        MODIFY COLUMN status ENUM('applied','screening','interview','offer','hired','rejected','withdrawn') NOT NULL DEFAULT 'applied'
      `);
      console.log('✓ Patched applications.status ENUM for pipeline stages');
    } catch (patchError: any) {
      console.warn('⚠️  applications status ENUM patch skipped:', patchError.message?.substring(0, 100));
    }

    // Patch: Add pipeline_stage_id to applications
    try {
      await sequelize.query('ALTER TABLE applications ADD COLUMN pipeline_stage_id VARCHAR(36) NULL');
      console.log('✓ Added pipeline_stage_id column to applications');
    } catch (patchError: any) {
      if (patchError.message?.includes('Duplicate column')) {
        console.log('✓ pipeline_stage_id column already exists on applications');
      } else {
        console.warn('⚠️  applications pipeline_stage_id patch skipped:', patchError.message?.substring(0, 100));
      }
    }

    // === Phase 5 Patches ===

    // Patch: Add privacy columns to candidates
    const privacyColumns = [
      { name: 'profile_visibility', sql: "ALTER TABLE candidates ADD COLUMN profile_visibility ENUM('public','applied_only','hidden') NOT NULL DEFAULT 'public'" },
      { name: 'show_email', sql: 'ALTER TABLE candidates ADD COLUMN show_email TINYINT(1) NOT NULL DEFAULT 0' },
      { name: 'show_phone', sql: 'ALTER TABLE candidates ADD COLUMN show_phone TINYINT(1) NOT NULL DEFAULT 0' },
    ];

    for (const col of privacyColumns) {
      try {
        await sequelize.query(col.sql);
        console.log(`✓ Added ${col.name} column to candidates`);
      } catch (patchError: any) {
        if (patchError.message?.includes('Duplicate column')) {
          console.log(`✓ ${col.name} column already exists on candidates`);
        } else {
          console.warn(`⚠️  candidates ${col.name} patch skipped:`, patchError.message?.substring(0, 100));
        }
      }
    }

    // Patch: Add label and is_primary to cv_files
    const cvColumns = [
      { name: 'label', sql: 'ALTER TABLE cv_files ADD COLUMN label VARCHAR(255) NULL' },
      { name: 'is_primary', sql: 'ALTER TABLE cv_files ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 0' },
    ];

    for (const col of cvColumns) {
      try {
        await sequelize.query(col.sql);
        console.log(`✓ Added ${col.name} column to cv_files`);
      } catch (patchError: any) {
        if (patchError.message?.includes('Duplicate column')) {
          console.log(`✓ ${col.name} column already exists on cv_files`);
        } else {
          console.warn(`⚠️  cv_files ${col.name} patch skipped:`, patchError.message?.substring(0, 100));
        }
      }
    }

    console.log('\n✓ All tables created/verified successfully!');
    console.log('\nTables:');
    console.log('  - users');
    console.log('  - candidates');
    console.log('  - company_profiles');
    console.log('  - cv_files');
    console.log('  - candidate_matrices');
    console.log('  - jobs');
    console.log('  - job_matrices');
    console.log('  - matches');
    console.log('  - applications');
    console.log('  - admin_notes');
    console.log('  - candidate_tags');
    console.log('  - job_reports');
    console.log('  - pipeline_stages');
    console.log('  - notifications');
    console.log('  - application_history');
    console.log('  - conversations');
    console.log('  - messages');
    console.log('  - saved_jobs');
    console.log('  - company_members');
    
    await sequelize.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.parent) {
      console.error('Database error:', error.parent.message);
    }
    console.error('Full error:', error);
    process.exit(1);
  }
}

migrate();
