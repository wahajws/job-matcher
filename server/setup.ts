import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execAsync = promisify(exec);

const AUTO_CREATE_DB = process.env.AUTO_CREATE_DB !== 'false'; // Default: true
const AUTO_MIGRATE = process.env.AUTO_MIGRATE !== 'false'; // Default: true
const AUTO_SEED = process.env.AUTO_SEED === 'true'; // Default: false
const SKIP_SETUP = process.env.SKIP_SETUP === 'true'; // Default: false

async function runCommand(command: string, description: string) {
  try {
    console.log(`\n🔄 ${description}...`);
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function setup() {
  if (SKIP_SETUP) {
    console.log('⏭️  Setup skipped (SKIP_SETUP=true)');
    return;
  }

  console.log('🚀 Starting automated setup...\n');

  // Step 1: Create database (if enabled)
  if (AUTO_CREATE_DB) {
    const dbCreated = await runCommand(
      'npm run db:create',
      'Creating database'
    );
    if (!dbCreated) {
      console.warn('⚠️  Database creation failed, but continuing...');
    }
  } else {
    console.log('⏭️  Database creation skipped (AUTO_CREATE_DB=false)');
  }

  // Step 2: Run migrations (if enabled)
  if (AUTO_MIGRATE) {
    const migrated = await runCommand(
      'npm run db:migrate',
      'Running migrations'
    );
    if (!migrated) {
      console.error('❌ Migration failed. Please run manually: npm run db:migrate');
      process.exit(1);
    }
  } else {
    console.log('⏭️  Migrations skipped (AUTO_MIGRATE=false)');
  }

  // Step 3: Seed database (if enabled)
  if (AUTO_SEED) {
    await runCommand(
      'npm run db:seed',
      'Seeding database'
    );
  } else {
    console.log('⏭️  Seeding skipped (AUTO_SEED=false, set AUTO_SEED=true to enable)');
  }

  console.log('\n✨ Setup completed successfully!');
}

// Run setup
setup().catch((error) => {
  console.error('Setup error:', error);
  process.exit(1);
});
