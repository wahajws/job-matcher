import sequelize from './config.js';
import {
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
} from './models/index.js';

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Ensure all models are loaded
    console.log('Loading models...');
    
    // Use sync without alter to avoid index issues
    // If tables exist, they won't be modified
    // If they don't exist, they'll be created
    const syncOptions = { alter: false };
    
    // Check if we should force recreate (only in development)
    const FORCE_RECREATE = process.env.FORCE_RECREATE_TABLES === 'true';
    
    if (FORCE_RECREATE) {
      console.log('⚠️  FORCE_RECREATE enabled - dropping and recreating all tables...');
      await User.sync({ force: true });
      await Candidate.sync({ force: true });
      await CvFile.sync({ force: true });
      await CandidateMatrix.sync({ force: true });
      await Job.sync({ force: true });
      await JobMatrix.sync({ force: true });
      await Match.sync({ force: true });
      await AdminNote.sync({ force: true });
      await CandidateTag.sync({ force: true });
      await JobReport.sync({ force: true });
    } else {
      // Try to sync with alter, but catch errors for tables with too many indexes
      const models = [
        { name: 'User', model: User, table: 'users' },
        { name: 'Candidate', model: Candidate, table: 'candidates' },
        { name: 'CvFile', model: CvFile, table: 'cv_files' },
        { name: 'CandidateMatrix', model: CandidateMatrix, table: 'candidate_matrices' },
        { name: 'Job', model: Job, table: 'jobs' },
        { name: 'JobMatrix', model: JobMatrix, table: 'job_matrices' },
        { name: 'Match', model: Match, table: 'matches' },
        { name: 'AdminNote', model: AdminNote, table: 'admin_notes' },
        { name: 'CandidateTag', model: CandidateTag, table: 'candidate_tags' },
        { name: 'JobReport', model: JobReport, table: 'job_reports' },
      ];
      
      for (const { name, model, table } of models) {
        try {
          // First try to sync without alter (safe)
          await model.sync({ alter: false });
          console.log(`✓ ${name} table verified`);
        } catch (error: any) {
          // If table doesn't exist, create it
          if (error.name === 'SequelizeDatabaseError' && error.message?.includes("doesn't exist")) {
            await model.sync({ alter: false });
            console.log(`✓ ${name} table created`);
          } else {
            // If it's the "too many keys" error, just verify table exists
            if (error.message?.includes('Too many keys') || error.parent?.message?.includes('Too many keys')) {
              console.warn(`⚠️  ${name} table has too many indexes. Skipping alter. Table should already exist.`);
              // Just verify the table exists by querying it
              try {
                await sequelize.getQueryInterface().describeTable(table);
                console.log(`✓ ${name} table exists (skipped alter due to index limit)`);
              } catch (descError) {
                // Table doesn't exist, create it without indexes first
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
    
    console.log('✓ All tables created/verified successfully!');
    console.log('\nTables:');
    console.log('  - users');
    console.log('  - candidates');
    console.log('  - cv_files');
    console.log('  - candidate_matrices');
    console.log('  - jobs');
    console.log('  - job_matrices');
    console.log('  - matches');
    console.log('  - admin_notes');
    console.log('  - candidate_tags');
    console.log('  - job_reports');
    
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
