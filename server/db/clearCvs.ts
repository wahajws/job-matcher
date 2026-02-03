import sequelize from './config.js';
import {
  Candidate,
  CvFile,
  CandidateMatrix,
  CandidateTag,
  AdminNote,
  Match,
} from './models/index.js';

async function clearCvs() {
  try {
    console.log('Starting CV data cleanup...');
    
    // Test connection first
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    console.log('\nDeleting data in order (respecting foreign key constraints)...');
    
    // Delete in order to respect foreign key constraints
    // 1. Matches (references candidates and jobs)
    const matchesDeleted = await Match.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted ${matchesDeleted} match(es)`);
    
    // 2. Admin Notes (references candidates)
    const notesDeleted = await AdminNote.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted ${notesDeleted} admin note(s)`);
    
    // 3. Candidate Tags (references candidates)
    const tagsDeleted = await CandidateTag.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted ${tagsDeleted} candidate tag(s)`);
    
    // 4. Candidate Matrices (references candidates)
    const matricesDeleted = await CandidateMatrix.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted ${matricesDeleted} candidate matrice(s)`);
    
    // 5. CV Files (references candidates)
    const cvFilesDeleted = await CvFile.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted ${cvFilesDeleted} CV file(s)`);
    
    // 6. Candidates (main table)
    const candidatesDeleted = await Candidate.destroy({ where: {}, truncate: false });
    console.log(`✓ Deleted ${candidatesDeleted} candidate(s)`);
    
    console.log('\n✅ All CV data cleared successfully!');
    console.log('\nSummary:');
    console.log(`  - Candidates: ${candidatesDeleted}`);
    console.log(`  - CV Files: ${cvFilesDeleted}`);
    console.log(`  - Candidate Matrices: ${matricesDeleted}`);
    console.log(`  - Candidate Tags: ${tagsDeleted}`);
    console.log(`  - Admin Notes: ${notesDeleted}`);
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

clearCvs();
