import sequelize from './config.js';
import {
  Job,
  JobMatrix,
  Match,
} from './models/index.js';

async function clearJobs() {
  try {
    console.log('Starting Job data cleanup...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    console.log('\nDeleting data in order (respecting foreign key constraints)...');
    
    // Delete in order to respect foreign key constraints
    // 1. Matches (references jobs and candidates)
    const matchesDeleted = await Match.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted ${matchesDeleted} match(es)`);
    
    // 2. Job Matrices (references jobs)
    const matricesDeleted = await JobMatrix.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted ${matricesDeleted} job matrice(s)`);
    
    // 3. Jobs (main table)
    const jobsDeleted = await Job.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted ${jobsDeleted} job(s)`);
    
    console.log('\n✅ All Job data cleared successfully!');
    console.log('\nSummary:');
    console.log(`  - Jobs: ${jobsDeleted}`);
    console.log(`  - Job Matrices: ${matricesDeleted}`);
    console.log(`  - Matches: ${matchesDeleted}`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
    if (error.parent) {
      console.error('Database error:', error.parent.message);
    }
    console.error('Full error:', error);
    process.exit(1);
  }
}

clearJobs();
