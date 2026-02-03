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
    await User.sync({ alter: true });
    await Candidate.sync({ alter: true });
    await CvFile.sync({ alter: true });
    await CandidateMatrix.sync({ alter: true });
    await Job.sync({ alter: true });
    await JobMatrix.sync({ alter: true });
    await Match.sync({ alter: true });
    await AdminNote.sync({ alter: true });
    await CandidateTag.sync({ alter: true });
    await JobReport.sync({ alter: true });
    
    console.log('✓ All tables created/verified successfully!');
    console.log('\nCreated tables:');
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
