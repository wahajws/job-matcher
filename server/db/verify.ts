import sequelize from './config.js';
import { QueryTypes } from 'sequelize';

async function verifyTables() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established\n');

    // Get list of tables
    const tables = await sequelize.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()",
      { type: QueryTypes.SELECT }
    ) as any[];

    console.log(`Found ${tables.length} tables in database:\n`);
    
    if (tables.length === 0) {
      console.log('❌ No tables found!');
      console.log('Run: npm run db:migrate');
    } else {
      tables.forEach((table: any) => {
        console.log(`  ✓ ${table.TABLE_NAME}`);
      });
    }

    // Check for required tables
    const requiredTables = [
      'users',
      'candidates',
      'cv_files',
      'candidate_matrices',
      'jobs',
      'job_matrices',
      'matches',
      'admin_notes',
      'candidate_tags',
    ];

    console.log('\nRequired tables check:');
    const existingTableNames = tables.map((t: any) => t.TABLE_NAME);
    let allPresent = true;
    
    requiredTables.forEach(table => {
      if (existingTableNames.includes(table)) {
        console.log(`  ✓ ${table}`);
      } else {
        console.log(`  ❌ ${table} - MISSING`);
        allPresent = false;
      }
    });

    if (!allPresent) {
      console.log('\n⚠️  Some tables are missing. Run: npm run db:migrate');
      process.exit(1);
    } else {
      console.log('\n✅ All required tables exist!');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyTables();
