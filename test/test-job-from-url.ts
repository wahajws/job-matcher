import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

const testUrl = 'https://amast.com.my/jobs/gen-ai-engineers/';

async function testJobFromUrl() {
  console.log('🧪 Testing Job Creation from URL');
  console.log(`🌐 API URL: ${API_BASE_URL}`);
  console.log(`📄 Test URL: ${testUrl}\n`);

  try {
    console.log('Step 1: Sending POST request to /api/jobs/from-url...');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/jobs/from-url`,
      {
        url: testUrl,
        status: 'published', // Publish to generate matrix
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minutes (AI processing can take time)
      }
    );

    console.log('✅ Job created successfully!');
    console.log('\n📋 Created Job:');
    console.log('='.repeat(60));
    console.log(`Title: ${response.data.title}`);
    console.log(`Department: ${response.data.department}`);
    console.log(`Location: ${response.data.city}, ${response.data.country}`);
    console.log(`Location Type: ${response.data.locationType}`);
    console.log(`Seniority: ${response.data.seniorityLevel}`);
    console.log(`Min Experience: ${response.data.minYearsExperience} years`);
    console.log(`Status: ${response.data.status}`);
    console.log(`\nDescription (first 200 chars):`);
    console.log(response.data.description.substring(0, 200) + '...');
    console.log(`\nMust-Have Skills:`, response.data.mustHaveSkills);
    console.log(`Nice-to-Have Skills:`, response.data.niceToHaveSkills);
    
    if (response.data.matrix) {
      console.log(`\n✅ Job Matrix Generated:`);
      console.log(`  Required Skills:`, response.data.matrix.requiredSkills);
      console.log(`  Preferred Skills:`, response.data.matrix.preferredSkills);
      console.log(`  Experience Weight: ${response.data.matrix.experienceWeight}`);
      console.log(`  Location Weight: ${response.data.matrix.locationWeight}`);
      console.log(`  Domain Weight: ${response.data.matrix.domainWeight}`);
    } else {
      console.log(`\n⚠️  Job Matrix not generated (might still be processing)`);
    }
    
    console.log('='.repeat(60));
    console.log(`\n✅ Test passed! Job ID: ${response.data.id}`);
    
    return true;
  } catch (error: any) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.request) {
      console.error('No response received. Is the server running?');
    }
    
    return false;
  }
}

// Run test
testJobFromUrl()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
