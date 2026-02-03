import dotenv from 'dotenv';
import path from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (one level up from test folder)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const CVS_FOLDER = path.resolve(__dirname, '..', 'uploads', 'cvs');

interface TestResult {
  filename: string;
  success: boolean;
  error?: string;
  candidateInfo?: any;
  fileSize?: number;
  candidateName?: string;
  candidateEmail?: string;
}

async function testFileUpload(filePath: string): Promise<TestResult> {
  const filename = path.basename(filePath);
  console.log(`\n📄 Testing: ${filename}`);
  
  try {
    // Check file exists and get size
    const stats = statSync(filePath);
    if (stats.size === 0) {
      return {
        filename,
        success: false,
        error: 'File is 0 bytes',
        fileSize: 0,
      };
    }

    console.log(`   File size: ${stats.size} bytes`);

    // Read file
    const fileBuffer = readFileSync(filePath);
    
    // Create FormData using form-data package (Node.js compatible)
    const formData = new FormData();
    formData.append('files', fileBuffer, {
      filename,
      contentType: 'application/pdf',
    });
    formData.append('batchTag', 'Test Batch');

    // Upload file
    console.log(`   Uploading to ${API_BASE_URL}/api/candidates/upload...`);
    const response = await axios.post(
      `${API_BASE_URL}/api/candidates/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log(`   ✅ Upload response:`, JSON.stringify(response.data, null, 2));

    // If upload was successful, wait for processing and check candidate
    if (response.data.successful > 0) {
      // Wait for Qwen to extract candidate info and create candidate
      console.log(`   ⏳ Waiting for candidate info extraction...`);
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Try to get the candidate list to find our newly created candidate
      try {
        const candidatesResponse = await axios.get(`${API_BASE_URL}/api/candidates`);
        const candidates = candidatesResponse.data;
        
        // Find the most recently created candidate (should be ours)
        const latestCandidate = candidates
          .filter((c: any) => c.cvFile?.filename === filename || c.name)
          .sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];

        if (latestCandidate) {
          console.log(`   ✅ Candidate created:`, {
            name: latestCandidate.name,
            email: latestCandidate.email,
            phone: latestCandidate.phone,
            country: latestCandidate.country,
            headline: latestCandidate.headline,
          });

          return {
            filename,
            success: true,
            fileSize: stats.size,
            candidateName: latestCandidate.name,
            candidateEmail: latestCandidate.email,
            candidateInfo: latestCandidate,
          };
        }
      } catch (err: any) {
        console.log(`   ⚠️  Could not fetch candidate details: ${err.message}`);
      }

      return {
        filename,
        success: true,
        fileSize: stats.size,
        candidateInfo: response.data,
      };
    } else {
      return {
        filename,
        success: false,
        error: response.data.files?.[0]?.error || 'Upload failed',
        fileSize: stats.size,
      };
    }
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message);
    if (error.response) {
      console.error(`   Response:`, error.response.data);
    }
    return {
      filename,
      success: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('🧪 Starting CV Upload Tests');
  console.log(`📁 CVs folder: ${CVS_FOLDER}`);
  console.log(`🌐 API URL: ${API_BASE_URL}\n`);

  // Get all PDF files from the cvs folder
  let files: string[] = [];
  try {
    const entries = readdirSync(CVS_FOLDER);
    files = entries
      .filter(entry => entry.toLowerCase().endsWith('.pdf'))
      .map(entry => path.join(CVS_FOLDER, entry))
      .filter(filePath => {
        const stats = statSync(filePath);
        return stats.size > 0; // Only test non-empty files
      });
  } catch (error: any) {
    console.error(`❌ Error reading CVs folder: ${error.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('⚠️  No PDF files found in CVs folder (or all are 0 bytes)');
    process.exit(0);
  }

  console.log(`Found ${files.length} PDF file(s) to test\n`);

  const results: TestResult[] = [];

  // Test each file
  for (const filePath of files) {
    const result = await testFileUpload(filePath);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.filename}: ${r.error}`);
      });
  }

  console.log('\n' + '='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
