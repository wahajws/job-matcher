# Token Usage Analysis

This document provides an estimate of token usage for the CV Matcher application using Alibaba Qwen LLM.

## Token Usage Per Operation

### 1. Extract Candidate Info from CV
**When:** Every time a CV is uploaded
- **Input:** ~5,000 characters of CV text + ~500 characters of prompt
- **Estimated tokens:** ~1,200-1,500 tokens (input) + ~200-300 tokens (output)
- **Total per CV:** ~1,400-1,800 tokens

### 2. Generate Candidate Matrix
**When:** Every time a CV is processed (after extraction)
- **Input:** Full CV text (varies, typically 3,000-10,000 characters) + ~600 characters of prompt
- **Estimated tokens:** ~2,000-3,000 tokens (input) + ~500-800 tokens (output)
- **Total per CV:** ~2,500-3,800 tokens

### 3. Extract Job Info from URL
**When:** When creating a job from a URL
- **Input:** ~8,000 characters of job posting text + ~500 characters of prompt
- **Estimated tokens:** ~2,000-2,500 tokens (input) + ~300-400 tokens (output)
- **Total per job:** ~2,300-2,900 tokens

### 4. Generate Job Matrix
**When:** When a job is created or matrix is regenerated
- **Input:** Job title, description, skills (~1,000-2,000 characters) + ~400 characters of prompt
- **Estimated tokens:** ~400-600 tokens (input) + ~200-300 tokens (output)
- **Total per job:** ~600-900 tokens

### 5. Generate Match Explanation
**When:** For each candidate-job match calculation
- **Input:** Candidate profile + job requirements (~1,000-1,500 characters) + ~400 characters of prompt
- **Estimated tokens:** ~500-700 tokens (input) + ~300-500 tokens (output)
- **Total per match:** ~800-1,200 tokens

## Total Token Usage Scenarios

### Scenario 1: Upload 1 CV
- Extract candidate info: ~1,400-1,800 tokens
- Generate candidate matrix: ~2,500-3,800 tokens
- **Total:** ~3,900-5,600 tokens per CV upload

### Scenario 2: Create 1 Job from URL
- Extract job info: ~2,300-2,900 tokens
- Generate job matrix: ~600-900 tokens
- **Total:** ~2,900-3,800 tokens per job creation

### Scenario 3: Calculate Matches for 1 Job with 10 Candidates
- Generate job matrix (if not exists): ~600-900 tokens
- Generate match explanations (10 matches): ~8,000-12,000 tokens
- **Total:** ~8,600-12,900 tokens

### Scenario 4: Full Workflow (1 Job + 10 CVs)
- 10 CV uploads: ~39,000-56,000 tokens
- 1 Job creation: ~2,900-3,800 tokens
- Match calculations: ~8,600-12,900 tokens
- **Total:** ~50,500-72,700 tokens

## Monthly Usage Estimates

### Small Scale (10 jobs, 50 CVs)
- CV processing: 50 × 5,000 = ~250,000 tokens
- Job processing: 10 × 3,000 = ~30,000 tokens
- Match calculations: 10 jobs × 50 candidates × 1,000 = ~500,000 tokens
- **Total:** ~780,000 tokens/month

### Medium Scale (50 jobs, 200 CVs)
- CV processing: 200 × 5,000 = ~1,000,000 tokens
- Job processing: 50 × 3,000 = ~150,000 tokens
- Match calculations: 50 jobs × 200 candidates × 1,000 = ~10,000,000 tokens
- **Total:** ~11,150,000 tokens/month

### Large Scale (200 jobs, 1,000 CVs)
- CV processing: 1,000 × 5,000 = ~5,000,000 tokens
- Job processing: 200 × 3,000 = ~600,000 tokens
- Match calculations: 200 jobs × 1,000 candidates × 1,000 = ~200,000,000 tokens
- **Total:** ~205,600,000 tokens/month

## Cost Considerations

Token usage depends on:
1. **Model used:** `qwen-turbo` (default) is more cost-effective than `qwen-plus` or `qwen-max`
2. **CV length:** Longer CVs use more tokens
3. **Number of matches:** Match explanations are generated for every candidate-job pair
4. **Retries:** Failed API calls with retries will use additional tokens

## Optimization Tips

1. **Cache match explanations:** Don't regenerate if nothing changed
2. **Limit CV text length:** Already limited to 5,000 chars for extraction, but matrix generation uses full text
3. **Batch processing:** Process multiple CVs/jobs together when possible
4. **Use lighter model:** `qwen-turbo` is sufficient for most operations
5. **Skip unnecessary operations:** Only generate matrices when needed

## Token Tracking

The application now logs token usage in the console when available from the API response. Check server logs for actual token counts per operation.
