/**
 * Script to fix "Too many keys" error by removing duplicate indexes
 * Run this if you're getting ER_TOO_MANY_KEYS errors
 * 
 * Usage: tsx server/db/fixIndexes.ts
 */

import sequelize from './config.js';
import { QueryTypes } from 'sequelize';

async function fixIndexes() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    const dbName = sequelize.getDatabaseName();
    console.log(`\nChecking indexes in database: ${dbName}\n`);

    // Get all indexes for the users table
    const indexes = await sequelize.query(`
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'users'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, {
      replacements: [dbName],
      type: QueryTypes.SELECT
    }) as any[];

    if (!Array.isArray(indexes)) {
      console.error('❌ Unexpected query result format');
      console.error('Result:', indexes);
      await sequelize.close();
      process.exit(1);
    }

    if (indexes.length === 0) {
      console.log('✓ No indexes found on users table (table might not exist)');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`Found ${indexes.length} index entries on users table\n`);
    
    // Group indexes by name
    const indexGroups: Record<string, any[]> = {};
    indexes.forEach((idx: any) => {
      const indexName = idx.INDEX_NAME || 'UNNAMED';
      if (!indexGroups[indexName]) {
        indexGroups[indexName] = [];
      }
      indexGroups[indexName].push(idx);
    });

    const indexNames = Object.keys(indexGroups);
    console.log(`Total unique indexes: ${indexNames.length}\n`);
    
    // Show all indexes
    console.log('Current indexes:');
    indexNames.forEach(name => {
      const cols = indexGroups[name].map((x: any) => x.COLUMN_NAME).join(', ');
      const unique = indexGroups[name][0].NON_UNIQUE === 0 ? 'UNIQUE' : 'INDEX';
      console.log(`  - ${name} (${unique}): [${cols}]`);
    });
    console.log('');

    // Find duplicate indexes (same columns, different names)
    const duplicates: string[] = [];
    
    for (let i = 0; i < indexNames.length; i++) {
      for (let j = i + 1; j < indexNames.length; j++) {
        const idx1 = indexGroups[indexNames[i]];
        const idx2 = indexGroups[indexNames[j]];
        
        // Check if they have the same columns
        const cols1 = idx1.map((x: any) => x.COLUMN_NAME).sort().join(',');
        const cols2 = idx2.map((x: any) => x.COLUMN_NAME).sort().join(',');
        
        if (cols1 === cols2 && idx1[0].NON_UNIQUE === idx2[0].NON_UNIQUE) {
          // Keep PRIMARY, drop others
          if (indexNames[i] === 'PRIMARY') {
            duplicates.push(indexNames[j]);
          } else if (indexNames[j] === 'PRIMARY') {
            duplicates.push(indexNames[i]);
          } else {
            // Keep the shorter name, drop the longer
            duplicates.push(indexNames[i].length > indexNames[j].length ? indexNames[i] : indexNames[j]);
          }
        }
      }
    }

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate indexes to remove:\n`);
      duplicates.forEach(name => {
        console.log(`  - ${name}`);
      });
      
      console.log('\n⚠️  To remove these indexes, run the following SQL commands:');
      console.log('(Make sure to backup your database first!)\n');
      
      duplicates.forEach(name => {
        console.log(`DROP INDEX \`${name}\` ON \`users\`;`);
      });
      
      console.log('\nOr set FORCE_RECREATE_TABLES=true to drop and recreate all tables');
      console.log('(WARNING: This will delete all data!)');
    } else {
      console.log('✓ No duplicate indexes found');
      console.log('\nIf you still get "Too many keys" error, you may need to:');
      console.log('1. Manually remove unused indexes');
      console.log('2. Or set FORCE_RECREATE_TABLES=true to recreate tables');
      console.log('   (WARNING: This will delete all data!)');
    }

    // Show current index count
    console.log(`\nCurrent index count: ${indexNames.length}/64 (MySQL limit)`);
    
    if (indexNames.length >= 60) {
      console.log('⚠️  Warning: Approaching MySQL index limit (64)');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

fixIndexes();
