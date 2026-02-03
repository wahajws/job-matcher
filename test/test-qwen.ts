import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { qwenService } from '../server/services/qwen.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Sample CV text for testing
const sampleCvText = `
JIAWEN XIAO
Email: jiawen.xiao@example.com
Phone: +1 (650) 123-4567
Location: San Francisco, CA, United States

PROFESSIONAL SUMMARY
Experienced Software Engineer with 5+ years of expertise in full-stack development,
specializing in React, Node.js, and cloud technologies. Proven track record of building
scalable web applications and leading cross-functional teams.

WORK EXPERIENCE

Senior Software Engineer | Tech Company Inc. | 2020 - Present
- Developed and maintained React-based frontend applications
- Built RESTful APIs using Node.js and Express
- Implemented CI/CD pipelines using Docker and Kubernetes
- Led a team of 3 junior developers

Software Engineer | Startup Co. | 2018 - 2020
- Built responsive web applications using React and TypeScript
- Designed and implemented database schemas using PostgreSQL
- Collaborated with product team to deliver features on time

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley | 2014 - 2018

SKILLS
- Programming Languages: JavaScript, TypeScript, Python, Java
- Frontend: React, Vue.js, HTML5, CSS3
- Backend: Node.js, Express, Django, Flask
- Databases: PostgreSQL, MongoDB, Redis
- Cloud: AWS, Docker, Kubernetes
- Tools: Git, Jenkins, Jira
`;

async function testQwenApiKey() {
  console.log('🔑 Testing Qwen API Key Configuration...\n');
  
  const apiKey = process.env.ALIBABA_LLM_API_KEY;
  const apiUrl = process.env.ALIBABA_LLM_API_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
  const model = process.env.QWEN_MODEL || 'qwen-turbo';
  
  if (!apiKey) {
    console.error('❌ ALIBABA_LLM_API_KEY is not set in .env file');
    return false;
  }
  
  console.log(`✅ ALIBABA_LLM_API_KEY found: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`✅ API URL: ${apiUrl}`);
  console.log(`✅ Model: ${model}\n`);
  
  return true;
}

async function testSimpleQwenCall() {
  console.log('🧪 Test 1: Simple Qwen API Call\n');
  
  try {
    const prompt = 'What is 2+2? Respond with only the number.';
    console.log(`Prompt: "${prompt}"`);
    console.log('Calling Qwen API...\n');
    
    // We need to access the private method, so we'll test through extractCandidateInfo instead
    // But first let's test if the service is configured
    const result = await qwenService.extractCandidateInfo(sampleCvText);
    
    console.log('✅ Qwen API call successful!');
    console.log('Result:', result);
    return true;
  } catch (error: any) {
    console.error('❌ Qwen API call failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testCandidateInfoExtraction() {
  console.log('\n🧪 Test 2: Candidate Info Extraction\n');
  
  try {
    console.log('Extracting candidate info from sample CV...');
    console.log(`CV text length: ${sampleCvText.length} characters\n`);
    
    const result = await qwenService.extractCandidateInfo(sampleCvText);
    
    console.log('✅ Extraction successful!');
    console.log('\n📋 Extracted Information:');
    console.log('='.repeat(50));
    console.log(`Name: ${result.name}`);
    console.log(`Email: ${result.email || 'Not found'}`);
    console.log(`Phone: ${result.phone || 'Not found'}`);
    console.log(`Country: ${result.country || 'Not found'}`);
    console.log(`Country Code: ${result.countryCode || 'Not found'}`);
    console.log(`Headline: ${result.headline || 'Not found'}`);
    console.log('='.repeat(50));
    
    // Validate results
    const issues: string[] = [];
    if (result.name === 'Unknown' || !result.name) {
      issues.push('Name extraction failed (returned "Unknown")');
    }
    if (!result.email) {
      issues.push('Email not extracted');
    }
    if (!result.phone) {
      issues.push('Phone not extracted');
    }
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      return false;
    }
    
    console.log('\n✅ All fields extracted successfully!');
    return true;
  } catch (error: any) {
    console.error('\n❌ Extraction failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

async function testWithRealPdfText() {
  console.log('\n🧪 Test 3: Testing with Real PDF Text\n');
  
  try {
    const { readFileSync, readdirSync, statSync } = await import('fs');
    const cvFolder = path.resolve(__dirname, '..', 'uploads', 'cvs');
    
    // Find a non-empty PDF file
    const files = readdirSync(cvFolder)
      .filter(f => f.endsWith('.pdf'))
      .map(f => path.join(cvFolder, f))
      .filter(f => {
        try {
          return statSync(f).size > 0;
        } catch {
          return false;
        }
      });
    
    if (files.length === 0) {
      console.log('⚠️  No PDF files found in uploads/cvs folder');
      return true; // Not a failure, just skip
    }
    
    const testFile = files[0];
    console.log(`Testing with file: ${path.basename(testFile)}`);
    
    // Extract text from PDF
    const { pdfParserService } = await import('../server/services/pdfParser.js');
    const cvText = await pdfParserService.extractText(testFile);
    
    console.log(`Extracted ${cvText.length} characters from PDF`);
    console.log(`First 200 chars: ${cvText.substring(0, 200)}...\n`);
    
    // Extract candidate info
    const result = await qwenService.extractCandidateInfo(cvText);
    
    console.log('✅ Extraction from real PDF successful!');
    console.log('\n📋 Extracted Information:');
    console.log('='.repeat(50));
    console.log(`Name: ${result.name}`);
    console.log(`Email: ${result.email || 'Not found'}`);
    console.log(`Phone: ${result.phone || 'Not found'}`);
    console.log(`Country: ${result.country || 'Not found'}`);
    console.log(`Country Code: ${result.countryCode || 'Not found'}`);
    console.log(`Headline: ${result.headline || 'Not found'}`);
    console.log('='.repeat(50));
    
    if (result.name === 'Unknown') {
      console.log('\n⚠️  Warning: Name extraction returned "Unknown"');
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Qwen API Tests\n');
  console.log('='.repeat(60));
  
  const results: { test: string; passed: boolean }[] = [];
  
  // Test 1: API Key Configuration
  const apiKeyOk = await testQwenApiKey();
  if (!apiKeyOk) {
    console.log('\n❌ Cannot proceed without API key. Please set ALIBABA_LLM_API_KEY in .env file.');
    console.log('   Example: ALIBABA_LLM_API_KEY=sk-your-key-here');
    console.log('   Also set: ALIBABA_LLM_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1');
    process.exit(1);
  }
  
  // Test 2: Simple API Call (through extractCandidateInfo)
  const test1Passed = await testCandidateInfoExtraction();
  results.push({ test: 'Candidate Info Extraction', passed: test1Passed });
  
  // Test 3: Real PDF Text
  const test2Passed = await testWithRealPdfText();
  results.push({ test: 'Real PDF Extraction', passed: test2Passed });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  results.forEach(({ test, passed }) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;
  
  console.log(`\nTotal: ${passedCount}/${results.length} tests passed`);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Qwen API integration is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above for details.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
