import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

// Import setup to run before starting server
import './setup.js';

// After setup completes, start the server
exec('tsx server/index.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`Server error: ${error}`);
    return;
  }
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
});
