import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface QwenResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class QwenService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private maxRetries: number = 3;

  /**
   * Check if a name looks invalid (hash, too short, no letters, etc.)
   */
  private isInvalidName(name: string): boolean {
    if (!name || name.length < 2) return true;
    
    // Check if it looks like a hash (long alphanumeric string without spaces)
    if (name.length > 30 && /^[a-f0-9]+$/i.test(name.replace(/\s/g, ''))) {
      return true; // Looks like a hash
    }
    
    // Check if it has very few letters (mostly numbers/special chars)
    const letterCount = (name.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 2) {
      return true; // Not enough letters to be a real name
    }
    
    // Check if it's mostly special characters or numbers
    const specialCharCount = (name.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (specialCharCount > name.length * 0.5) {
      return true; // Too many special characters
    }
    
    return false;
  }

  /**
   * Extract name directly from CV text as fallback
   * Looks for the largest/most prominent text at the beginning
   */
  private extractNameFromText(cvText: string): string | null {
    if (!cvText || cvText.trim().length === 0) return null;
    
    // Get first 2000 characters (where name usually is)
    const headerText = cvText.substring(0, 2000);
    
    // Split into lines and find the most likely name line
    const lines = headerText.split(/\n+/).map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for lines that:
    // 1. Are in the first 10 lines
    // 2. Have 2-4 words (typical name format)
    // 3. Start with capital letter
    // 4. Don't contain common CV keywords
    const nameKeywords = ['email', 'phone', 'address', 'resume', 'cv', 'experience', 'education', 'skills', 'objective'];
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      const words = line.split(/\s+/);
      
      // Check if line looks like a name (2-4 words, starts with capital, no keywords)
      if (words.length >= 2 && words.length <= 4) {
        const hasKeywords = nameKeywords.some(keyword => line.toLowerCase().includes(keyword));
        const startsWithCapital = /^[A-Z]/.test(line);
        const hasEnoughLetters = (line.match(/[a-zA-Z]/g) || []).length >= 4;
        
        if (!hasKeywords && startsWithCapital && hasEnoughLetters) {
          // This looks like a name
          return line;
        }
      }
    }
    
    return null;
  }

  constructor() {
    this.apiKey = process.env.ALIBABA_LLM_API_KEY || '';
    this.apiUrl = process.env.ALIBABA_LLM_API_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    this.model = process.env.QWEN_MODEL || 'qwen-turbo';

    if (!this.apiKey) {
      console.warn('ALIBABA_LLM_API_KEY not set. Qwen service will not work.');
    }
  }

  private async callQwen(prompt: string, jsonMode: boolean = true): Promise<string> {
    if (!this.apiKey) {
      throw new Error('QWEN_API_KEY not configured');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[Qwen] API call attempt ${attempt}/${this.maxRetries}`);
        console.log(`[Qwen] API URL: ${this.apiUrl}`);
        console.log(`[Qwen] Model: ${this.model}`);
        console.log(`[Qwen] Prompt length: ${prompt.length} chars`);
        
        // Alibaba compatible-mode API (OpenAI-compatible format)
        // Endpoint should be /chat/completions for compatible mode
        const endpoint = this.apiUrl.endsWith('/chat/completions') 
          ? this.apiUrl 
          : `${this.apiUrl}/chat/completions`;
        
        // OpenAI-compatible request format
        const requestBody: any = {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        };
        
        // Add JSON mode if supported (OpenAI-compatible format)
        if (jsonMode) {
          requestBody.response_format = { type: 'json_object' };
        }
        
        console.log(`[Qwen] Calling endpoint: ${endpoint}`);
        
        const response = await axios.post<QwenResponse>(
          endpoint,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000, // 60 seconds
          }
        );

        console.log(`[Qwen] Response status: ${response.status}`);
        console.log(`[Qwen] Response data keys:`, Object.keys(response.data));
        
        // Log token usage if available
        const usage = (response.data as any).usage;
        if (usage) {
          console.log(`[Qwen] Token usage:`, {
            prompt_tokens: usage.prompt_tokens || usage.input_tokens,
            completion_tokens: usage.completion_tokens || usage.output_tokens,
            total_tokens: usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens),
          });
        }
        
        console.log(`[Qwen] Response data:`, JSON.stringify(response.data, null, 2).substring(0, 500));
        console.log(`[Qwen] Response choices length:`, response.data.choices?.length);
        
        // Compatible mode returns choices[0].message.content
        const content = response.data.choices?.[0]?.message?.content;
        if (!content) {
          console.error(`[Qwen] Empty content in response:`, JSON.stringify(response.data, null, 2));
          throw new Error('Empty response from Qwen API');
        }
        
        console.log(`[Qwen] Content length: ${content.length} chars`);
        console.log(`[Qwen] Content preview: ${content.substring(0, 200)}`);

        // If JSON mode, try to parse and return clean JSON
        if (jsonMode) {
          try {
            // Sometimes the response is wrapped in markdown code blocks
            const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : content;
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed);
          } catch (parseError) {
            // If parsing fails, return raw content
            return content;
          }
        }

        return content;
      } catch (error: any) {
        lastError = error;
        console.error(`[Qwen] API call failed (attempt ${attempt}/${this.maxRetries}):`, error.message);
        if (error.response) {
          console.error(`[Qwen] Response status: ${error.response.status}`);
          console.error(`[Qwen] Response data:`, JSON.stringify(error.response.data, null, 2));
        }
        if (error.request) {
          console.error(`[Qwen] Request made but no response received`);
        }
        if (attempt < this.maxRetries) {
          const delay = attempt * 1000; // Exponential backoff
          console.warn(`[Qwen] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Qwen API call failed after retries');
  }

  async extractCandidateInfo(cvText: string): Promise<{
    name: string;
    email?: string;
    phone?: string;
    country?: string;
    countryCode?: string;
    headline?: string;
  }> {
    // Use more text (first 5000 chars) to ensure we capture the name and contact info
    // Most CVs have name and contact info in the first 1000-2000 chars, but some have longer headers
    const cvTextToUse = cvText.substring(0, 5000);
    
    console.log(`[Qwen] Extracting candidate info from CV (using ${cvTextToUse.length} chars of ${cvText.length} total)`);
    console.log(`[Qwen] First 500 chars of CV: ${cvTextToUse.substring(0, 500)}`);
    
    const prompt = `You are a CV parsing expert. Extract the candidate's personal information from this CV:

${cvTextToUse}

Extract the following information:
- Full name (the candidate's actual name, not the filename - look for the largest/most prominent name at the top of the CV)
- Email address (if available)
- Phone number (if available, include country code)
- Country (current location or country code)
- Country code (2-letter ISO code like "US", "UK", "SG", etc.)
- Professional headline or title (if available, e.g., "Senior Software Engineer", "Data Analyst Intern")
  * Look for phrases like "Data Analyst Intern", "Seeking Software Engineer Intern position"
  * This is critical for matching - an intern candidate should have "Intern" in their headline
  * If the CV says "seeking X position" or mentions internship/trainee role, include that in the headline

Return a JSON object with this exact structure:
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "country": "United States",
  "countryCode": "US",
  "headline": "Senior Software Engineer"
}

CRITICAL RULES FOR NAME EXTRACTION:
- The name MUST be extracted from the CV content itself, NEVER from the filename
- Look at the very top of the CV - the candidate's name is usually the largest, most prominent text
- The name should be a real person's name (2-4 words typically, containing letters)
- DO NOT use hash-like strings, file paths, or random alphanumeric sequences as names
- If the name looks like a hash (long string of letters/numbers), it's WRONG - look harder in the CV
- The name should start with a capital letter and contain proper name-like words
- If you truly cannot find a valid name in the CV content, return "Unknown" (but this should be rare)

IMPORTANT:
- headline: Extract the candidate's current or desired role/title. If the CV mentions "seeking Data Analyst Intern position" or similar, include "Intern" in the headline
- If any field is not found in the CV, use null for that field (except name - try harder to find it)
- Return ONLY valid JSON, no additional text or markdown formatting

Return ONLY valid JSON, no additional text.`;

    try {
      // callQwen with jsonMode=true returns a JSON string
      const responseJson = await this.callQwen(prompt, true);
      console.log(`[Qwen] Raw response (JSON string): ${responseJson}`);
      
      // Parse the JSON string returned by callQwen
      let parsed: any;
      try {
        parsed = JSON.parse(responseJson);
      } catch (parseError: any) {
        // If parsing fails, try to clean markdown code blocks
        console.warn(`[Qwen] Initial parse failed, trying to clean response: ${parseError.message}`);
        let cleanedResponse = responseJson.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        parsed = JSON.parse(cleanedResponse);
      }
      
      console.log(`[Qwen] Parsed candidate info:`, parsed);
      
      // Validate and clean the extracted name
      let extractedName = parsed.name?.trim() || '';
      
      // Validate name - reject if it looks like a hash or invalid
      if (!extractedName || 
          extractedName === 'Unknown' ||
          extractedName.length < 2 ||
          this.isInvalidName(extractedName)) {
        console.warn(`[Qwen] WARNING: Extracted name "${extractedName}" appears invalid. First 500 chars: ${cvTextToUse.substring(0, 500)}`);
        // Try to extract name directly from text
        const directName = this.extractNameFromText(cvTextToUse);
        if (directName && !this.isInvalidName(directName)) {
          console.log(`[Qwen] Using directly extracted name: ${directName}`);
          extractedName = directName;
        } else {
          extractedName = 'Unknown';
        }
      }
      
      const result = {
        name: extractedName,
        email: parsed.email || undefined,
        phone: parsed.phone || undefined,
        country: parsed.country || 'US',
        countryCode: parsed.countryCode || 'US',
        headline: parsed.headline || undefined,
      };
      
      // If name is still "Unknown", log a warning
      if (result.name === 'Unknown') {
        console.warn(`[Qwen] WARNING: Could not extract valid name from CV. First 500 chars: ${cvTextToUse.substring(0, 500)}`);
      }
      
      console.log(`[Qwen] Final extracted info:`, result);
      return result;
    } catch (error: any) {
      console.error('[Qwen] Failed to extract candidate info from CV:', error);
      console.error('[Qwen] Error details:', error.message);
      if (error.stack) {
        console.error('[Qwen] Error stack:', error.stack);
      }
      if (error.response) {
        console.error('[Qwen] API response:', error.response.data);
      }
      // Fallback to defaults
      return {
        name: 'Unknown',
        country: 'US',
        countryCode: 'US',
      };
    }
  }

  async generateCandidateMatrix(cvText: string): Promise<any> {
    const prompt = `You are a CV parsing expert. Extract ALL structured information from this CV thoroughly.

${cvText}

Return a JSON object with this exact structure:
{
  "skills": [{"name": "JavaScript", "level": "advanced", "yearsOfExperience": 5}],
  "roles": ["Software Engineer", "Tech Lead"],
  "totalYearsExperience": 8,
  "domains": ["FinTech", "SaaS", "AI/ML", "Web Development"],
  "education": [{"degree": "BSc Computer Science", "institution": "MIT", "year": 2015}],
  "languages": [{"language": "English", "proficiency": "Native"}],
  "locationSignals": {
    "currentCountry": "US",
    "willingToRelocate": true,
    "preferredLocations": ["US", "UK"]
  },
  "evidence": [
    {"id": "ev-1", "text": "Led team of 5 engineers...", "category": "Leadership", "source": "Work Experience"}
  ],
  "confidence": 85
}

CRITICAL SKILL EXTRACTION RULES:
1. Extract EVERY technical skill mentioned — include ALL programming languages, frameworks, libraries, tools, platforms, databases, cloud services, APIs, methodologies
2. Include BOTH explicit skills AND implied skills:
   - If CV mentions "built chatbot using OpenAI API" → extract skills: "OpenAI API", "LLM", "Chatbot Development", "Generative AI"
   - If CV mentions "fine-tuned BERT model" → extract: "BERT", "NLP", "Transfer Learning", "Deep Learning", "Machine Learning"
   - If CV mentions "RAG pipeline" → extract: "RAG", "LLM", "Vector Database", "Information Retrieval"
   - If CV mentions "trained neural networks" → extract: "Neural Networks", "Deep Learning", "Machine Learning"
   - If CV mentions "deployed on AWS Lambda" → extract: "AWS", "AWS Lambda", "Serverless", "Cloud Computing"
   - If CV mentions "React dashboard" → extract: "React", "JavaScript", "Frontend Development"
3. For AI/ML candidates, specifically look for and extract:
   - LLM-related: LLM, GPT, OpenAI, Claude, Prompt Engineering, Fine-tuning, RAG, LangChain, Vector DB, Embeddings
   - ML frameworks: TensorFlow, PyTorch, Scikit-learn, Keras, Hugging Face, Transformers
   - ML domains: NLP, Computer Vision, Generative AI, Reinforcement Learning, Data Science
   - Data tools: Pandas, NumPy, Jupyter, MLflow, Weights & Biases
4. Set skill levels accurately: "beginner", "intermediate", "advanced", "expert"
5. Include the number of years of experience for each skill if inferable

CRITICAL DOMAIN EXTRACTION:
- Extract ALL relevant industry domains AND technology domains
- Technology domains: "AI/ML", "Generative AI", "Web Development", "Mobile Development", "Cloud Computing", "Data Engineering", "DevOps", "Cybersecurity", "Blockchain", etc.
- Industry domains: "FinTech", "Healthcare", "E-commerce", "SaaS", "Education", "Gaming", etc.
- Be thorough: if candidate worked on AI projects, include "AI/ML" AND "Generative AI" (if applicable) in domains

CRITICAL ROLES EXTRACTION:
- Extract roles with special attention to seniority indicators
- If role contains "Intern", "Internship", "Trainee" → mark clearly in roles array
- Prioritize the most prominent/current role

Return ONLY valid JSON, no additional text.`;

    const response = await this.callQwen(prompt, true);
    return JSON.parse(response);
  }

  async generateJobMatrix(
    title: string,
    description: string,
    mustHaveSkills: string[],
    niceToHaveSkills: string[]
  ): Promise<any> {
    const prompt = `Analyze this job posting and extract structured requirements. Be THOROUGH — extract every technical requirement.

Title: ${title}
Description: ${description}
Must-have skills: ${mustHaveSkills.join(', ')}
Nice-to-have skills: ${niceToHaveSkills.join(', ')}

Return a JSON object with this exact structure:
{
  "requiredSkills": [{"skill": "JavaScript", "weight": 85}],
  "preferredSkills": [{"skill": "TypeScript", "weight": 60}],
  "experienceWeight": 20,
  "locationWeight": 15,
  "domainWeight": 10,
  "semanticKeywords": ["generative AI", "large language models", "machine learning", "backend development"]
}

CRITICAL RULES:
1. The "weight" field (0-100) indicates how IMPORTANT each skill is for THIS specific job
2. CORE/PRIMARY skills MUST have weight 85-95
3. SECONDARY skills should have weight 60-80
4. GENERIC skills should have weight 30-50
5. Do NOT include pure soft skills in requiredSkills — only technical skills
6. Use EXACT technology names — "React" ≠ "React Native", "Angular" ≠ "AngularJS"

IMPORTANT — "semanticKeywords" field:
- Extract 5-15 semantic keywords/phrases that describe what this job is REALLY about
- Include technology themes: "generative AI", "machine learning", "full-stack web development", "cloud infrastructure"
- Include domain themes: "fintech", "healthcare", "SaaS"
- Include methodology themes: "agile", "microservices architecture", "CI/CD"
- These keywords help with semantic matching — a candidate with "LLM" experience should match a "Generative AI" job
- Think broadly: what kind of technical background would be ideal for this role?

For AI/ML jobs specifically:
- Include both specific skills (e.g., "PyTorch", "LangChain") AND broader categories (e.g., "Deep Learning", "LLM")
- A "GenAI Engineer" job should have semanticKeywords like: ["generative AI", "large language models", "LLM", "prompt engineering", "AI/ML", "deep learning", "NLP"]
- Include related/adjacent skills that a good candidate would likely have

Return ONLY valid JSON, no additional text.`;

    const response = await this.callQwen(prompt, true);
    return JSON.parse(response);
  }

  /**
   * LLM-based match evaluation — the LLM directly scores the candidate-job match.
   * This replaces the deterministic scoring with semantic understanding.
   * The LLM can understand that "GenAI" ≈ "LLM" ≈ "Generative AI" etc.
   */
  async evaluateMatch(
    candidateMatrix: any,
    jobMatrix: any,
    jobInfo: {
      title: string;
      description: string;
      department?: string;
      seniorityLevel?: string;
      minYearsExperience?: number;
      locationType?: string;
      country?: string;
    },
    candidateInfo: {
      name: string;
      headline?: string;
      country?: string;
      roles?: string[];
    }
  ): Promise<{
    score: number;
    breakdown: { skills: number; experience: number; domain: number; location: number };
    explanation: string;
    gaps: any[];
  }> {
    // Build a concise candidate summary from the matrix
    const candidateSkills = (candidateMatrix.skills || [])
      .map((s: any) => {
        const name = s.name || s;
        const level = s.level ? ` (${s.level})` : '';
        const years = s.yearsOfExperience ? ` ${s.yearsOfExperience}y` : '';
        return `${name}${level}${years}`;
      })
      .join(', ');

    const jobRequiredSkills = (jobMatrix.required_skills || [])
      .map((s: any) => {
        const skill = s.skill || s;
        const weight = s.weight ? ` [importance: ${s.weight}/100]` : '';
        return `${skill}${weight}`;
      })
      .join(', ');

    const jobPreferredSkills = (jobMatrix.preferred_skills || [])
      .map((s: any) => {
        const skill = s.skill || s;
        const weight = s.weight ? ` [importance: ${s.weight}/100]` : '';
        return `${skill}${weight}`;
      })
      .join(', ');

    const prompt = `You are an expert technical recruiter. Evaluate how well this candidate matches this job.

=== CANDIDATE PROFILE ===
Name: ${candidateInfo.name}
Headline: ${candidateInfo.headline || 'Not specified'}
Country: ${candidateInfo.country || 'Unknown'}
Total Experience: ${candidateMatrix.total_years_experience || 0} years
Roles: ${JSON.stringify(candidateInfo.roles || candidateMatrix.roles || [])}
Domains: ${JSON.stringify(candidateMatrix.domains || [])}
Skills: ${candidateSkills}
Education: ${JSON.stringify(candidateMatrix.education || [])}
Location Preferences: ${JSON.stringify(candidateMatrix.location_signals || {})}

=== JOB REQUIREMENTS ===
Title: ${jobInfo.title}
Department: ${jobInfo.department || 'Not specified'}
Seniority Level: ${jobInfo.seniorityLevel || 'Not specified'}
Min Years Experience: ${jobInfo.minYearsExperience !== undefined ? jobInfo.minYearsExperience : 'Not specified'}
Location Type: ${jobInfo.locationType || 'Not specified'}
Job Country: ${jobInfo.country || 'Not specified'}
Required Skills: ${jobRequiredSkills}
Preferred Skills: ${jobPreferredSkills}
Job Description (excerpt): ${(jobInfo.description || '').substring(0, 2000)}

=== SCORING INSTRUCTIONS ===
Score this candidate against this job in 4 dimensions (each 0-100):

1. **skills** (0-100): How well do the candidate's skills match the job's required and preferred skills?
   - CRITICAL: Use SEMANTIC matching, not just exact text matching!
   - "GenAI" = "Generative AI" = relates to "LLM", "Large Language Models", "AI"
   - "React" knowledge implies JavaScript/TypeScript knowledge
   - "Python" + "TensorFlow" implies machine learning capability
   - "FastAPI" implies Python backend development
   - "LangChain" implies LLM/GenAI experience
   - Consider skill TRANSFERABILITY: similar technologies show adaptability
   - Weight by importance: core skills (weight 85-95) matter much more than nice-to-haves (weight 30-50)
   - Score 80-100: Candidate has most/all core skills and many preferred skills
   - Score 60-79: Candidate has some core skills, can likely learn the rest
   - Score 40-59: Candidate has related but not exact skills
   - Score 20-39: Candidate has few relevant skills
   - Score 0-19: Almost no relevant skills

2. **experience** (0-100): Does the candidate's experience level match?
   - Perfect match = 100, slight under/over = 80, significant mismatch = 40-60, extreme mismatch = 0-20
   - Consider that intern experience is different from professional experience
   - "Senior" candidates applying for "Mid" roles: slight penalty but not severe
   - "Junior" candidates for "Senior" roles: significant penalty

3. **domain** (0-100): Does the candidate's domain/industry experience align?
   - Same domain = 100, related domain = 70-80, different but transferable = 50, unrelated = 30
   - "SaaS" and "Web Development" are closely related
   - "AI/ML" and "Data Science" are closely related
   - "FinTech" and "Banking" are the same domain

4. **location** (0-100): Does the location match?
   - Remote jobs = 100 (location doesn't matter)
   - Same country = 100
   - Willing to relocate = 70-80
   - Different country, not willing to relocate, onsite = 20-30

Then calculate the overall score as a weighted average:
- skills: ${100 - (jobMatrix.experience_weight || 20) - (jobMatrix.location_weight || 15) - (jobMatrix.domain_weight || 10)}% weight
- experience: ${jobMatrix.experience_weight || 20}% weight
- domain: ${jobMatrix.domain_weight || 10}% weight
- location: ${jobMatrix.location_weight || 15}% weight

Also provide:
- A 2-3 sentence natural language explanation of why this candidate matches or doesn't match
- A list of gaps (missing skills, experience shortfalls, etc.)

Return a JSON object with this EXACT structure:
{
  "score": 75,
  "breakdown": {
    "skills": 80,
    "experience": 70,
    "domain": 85,
    "location": 100
  },
  "explanation": "The candidate demonstrates strong skills in X and Y which align well with the job requirements...",
  "gaps": [
    {"type": "skill", "description": "Missing experience with X", "severity": "minor"},
    {"type": "experience", "description": "2 years less than required", "severity": "moderate"}
  ]
}

IMPORTANT RULES:
- Be GENEROUS with semantic skill matching. If a candidate has "Python" + "Deep Learning" + "NLP", they ARE relevant for a "GenAI Engineer" job even if they don't list "GenAI" explicitly.
- Consider the WHOLE profile holistically — a candidate with strong AI/ML foundations is a great fit for GenAI even without that exact buzzword
- Return ONLY valid JSON, no additional text or markdown formatting.`;

    try {
      const responseJson = await this.callQwen(prompt, true);
      console.log(`[Qwen] Raw match evaluation response: ${responseJson.substring(0, 500)}`);
      
      let parsed: any;
      try {
        parsed = JSON.parse(responseJson);
      } catch (parseError: any) {
        console.warn(`[Qwen] Initial parse failed, trying to clean response: ${parseError.message}`);
        let cleanedResponse = responseJson.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        parsed = JSON.parse(cleanedResponse);
      }
      
      console.log(`[Qwen] LLM Match evaluation result:`, {
        score: parsed.score,
        breakdown: parsed.breakdown,
        explanation: parsed.explanation?.substring(0, 100) + '...',
        gapsCount: parsed.gaps?.length || 0,
      });
      
      // Validate and clamp scores
      const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v || 0)));
      
      return {
        score: clamp(parsed.score),
        breakdown: {
          skills: clamp(parsed.breakdown?.skills),
          experience: clamp(parsed.breakdown?.experience),
          domain: clamp(parsed.breakdown?.domain),
          location: clamp(parsed.breakdown?.location),
        },
        explanation: parsed.explanation || 'No explanation available.',
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      };
    } catch (error: any) {
      console.error('[Qwen] Failed to evaluate match via LLM:', error.message);
      // Return null to signal fallback to deterministic scoring
      throw error;
    }
  }

  async generateMatchExplanation(
    candidateProfile: any,
    jobRequirements: any,
    score: number
  ): Promise<{ explanation: string; gaps: any[] }> {
    const prompt = `Candidate Profile:
Skills: ${JSON.stringify(candidateProfile.skills)}
Experience: ${candidateProfile.totalYearsExperience} years
Roles: ${JSON.stringify(candidateProfile.roles || [])}
Domains: ${JSON.stringify(candidateProfile.domains)}
Location: ${JSON.stringify(candidateProfile.locationSignals)}

Job Requirements:
Required Skills: ${JSON.stringify(jobRequirements.requiredSkills)}
Preferred Skills: ${JSON.stringify(jobRequirements.preferredSkills)}
Min Experience: ${jobRequirements.minYearsExperience} years
Seniority Level: ${jobRequirements.seniorityLevel || 'not specified'}

Match Score: ${score}

Generate a natural language explanation (2-3 sentences) of why this candidate matches (or doesn't match) this job. Also identify any gaps (missing skills, insufficient experience, etc.).

Return a JSON object:
{
  "explanation": "The candidate demonstrates...",
  "gaps": [
    {"type": "skill", "description": "Missing experience with X", "severity": "minor"}
  ]
}

Return ONLY valid JSON, no additional text.`;

    try {
      const responseJson = await this.callQwen(prompt, true);
      
      let parsed: any;
      try {
        parsed = JSON.parse(responseJson);
      } catch (parseError: any) {
        let cleanedResponse = responseJson.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        parsed = JSON.parse(cleanedResponse);
      }
      
      return {
        explanation: parsed.explanation || 'No explanation available.',
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      };
    } catch (error: any) {
      console.error('[Qwen] Failed to generate match explanation:', error);
      return {
        explanation: 'Unable to generate explanation at this time.',
        gaps: [],
      };
    }
  }

  async extractJobInfoFromPosting(jobPostingText: string): Promise<{
    title: string;
    department?: string;
    company?: string;
    description: string;
    locationType: 'onsite' | 'hybrid' | 'remote';
    country: string;
    countryCode: string;
    city: string;
    mustHaveSkills: string[];
    niceToHaveSkills: string[];
    minYearsExperience: number;
    seniorityLevel: 'internship' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal';
  }> {
    const prompt = `You are an expert at extracting structured information from job postings.

Extract the following information from this job posting:

${jobPostingText.substring(0, 8000)}

Extract and return a JSON object with this exact structure:
{
  "title": "Job Title",
  "department": "Department name (e.g., Engineering, Sales, Marketing)",
  "company": "Company name (the organization posting this job)",
  "description": "Full job description",
  "locationType": "onsite" | "hybrid" | "remote",
  "country": "Country name (e.g., United States, Malaysia)",
  "countryCode": "2-letter ISO code (e.g., US, MY, SG)",
  "city": "City name",
  "mustHaveSkills": ["skill1", "skill2", "skill3"],
  "niceToHaveSkills": ["skill1", "skill2"],
  "minYearsExperience": 3,
  "seniorityLevel": "internship" | "junior" | "mid" | "senior" | "lead" | "principal"
}

IMPORTANT:
- company: Extract the company/organization name posting this job (look for company name, organization name, or employer name in the posting)
- locationType: Determine from keywords like "remote", "hybrid", "on-site", "onsite", "work from home"
- countryCode: Use ISO 3166-1 alpha-2 codes (US, MY, SG, UK, etc.)
- mustHaveSkills: Extract technical skills, programming languages, frameworks, tools that are required
- niceToHaveSkills: Extract skills that are preferred but not required
- minYearsExperience: CRITICAL - Intelligently infer minimum years of experience based on:
  * Job title: "Developer" typically requires 2-3+ years, "Senior Developer" requires 5+ years, "Lead/Principal" requires 7+ years
  * Seniority keywords: "Junior" = 0-2 years, "Mid" = 2-4 years, "Senior" = 5+ years, "Lead" = 7+ years, "Principal" = 10+ years
  * Skill complexity: Advanced frameworks (React, Angular, Node.js) typically require 2+ years, multiple technologies suggest 3+ years
  * Job responsibilities: Team leadership, architecture decisions, mentoring = 5+ years; Independent project work = 2-3 years
  * Industry standards: Full-stack developers typically need 3+ years, specialized roles (DevOps, Data Engineer) need 3-5+ years
  * DO NOT default to 0 unless the job explicitly states "Intern", "Internship", "Entry-level", "Fresh graduate", or "No experience required"
  * If experience is not explicitly stated, infer from context: A "React.js Developer" role typically requires 2-3 years minimum
- seniorityLevel: Infer from title, requirements, and responsibilities
  * CRITICAL: If job title/description contains "Intern", "Internship", "Trainee" → seniorityLevel MUST be "internship" AND minYearsExperience = 0
  * If title contains "Senior", "Lead", "Principal", "Architect" → seniorityLevel should match AND minYearsExperience should be 5+ years
  * If title is just "Developer" or "Engineer" without qualifiers → typically "mid" level with 2-3 years experience
  * junior = 0-2 years, mid = 2-5 years, senior = 5+ years, lead = team lead (7+ years), principal = architect level (10+ years)
- If information is not found, use reasonable defaults based on industry standards (company can be null if not found)

Return ONLY valid JSON, no additional text or markdown formatting.`;

    try {
      const responseJson = await this.callQwen(prompt, true);
      console.log(`[Qwen] Raw job extraction response: ${responseJson}`);
      
      let parsed: any;
      try {
        parsed = JSON.parse(responseJson);
      } catch (parseError: any) {
        console.warn(`[Qwen] Initial parse failed, trying to clean response: ${parseError.message}`);
        let cleanedResponse = responseJson.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        parsed = JSON.parse(cleanedResponse);
      }
      
      console.log(`[Qwen] Parsed job info:`, parsed);
      
      // Validate and set defaults
      return {
        title: parsed.title || 'Untitled Job',
        department: parsed.department || 'General',
        company: parsed.company || undefined,
        description: parsed.description || '',
        locationType: parsed.locationType || 'remote',
        country: parsed.country || 'United States',
        countryCode: parsed.countryCode || 'US',
        city: parsed.city || 'Unknown',
        mustHaveSkills: Array.isArray(parsed.mustHaveSkills) ? parsed.mustHaveSkills : [],
        niceToHaveSkills: Array.isArray(parsed.niceToHaveSkills) ? parsed.niceToHaveSkills : [],
        minYearsExperience: parsed.minYearsExperience !== undefined && parsed.minYearsExperience !== null 
          ? parsed.minYearsExperience 
          : (parsed.seniorityLevel === 'internship' ? 0 : 
             parsed.seniorityLevel === 'junior' ? 1 : 
             parsed.seniorityLevel === 'senior' || parsed.seniorityLevel === 'lead' || parsed.seniorityLevel === 'principal' ? 5 : 
             2), // Default to 2 years for mid-level if not specified
        seniorityLevel: parsed.seniorityLevel || 'mid',
      };
    } catch (error: any) {
      console.error('[Qwen] Failed to extract job info:', error);
      throw new Error(`Failed to extract job information: ${error.message}`);
    }
  }

  getModelVersion(): string {
    return this.model;
  }
}

export const qwenService = new QwenService();
