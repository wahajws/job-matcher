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
    const prompt = `You are a CV parsing expert. Extract structured information from this CV:

${cvText}

Return a JSON object with this exact structure:
{
  "skills": [{"name": "JavaScript", "level": "advanced", "yearsOfExperience": 5}],
  "roles": ["Software Engineer", "Tech Lead"],
  "totalYearsExperience": 8,
  "domains": ["FinTech", "SaaS"],
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

CRITICAL for roles extraction:
- Extract roles with special attention to seniority indicators
- If role contains "Intern", "Internship", "Trainee", "Apprentice", "Student" → mark clearly in roles array
- If candidate is a student seeking internship → include "Intern" in roles (e.g., ["Data Analyst Intern"])
- If CV mentions "seeking X Intern position" → include that role in the roles array
- The "roles" array should reflect the candidate's actual/desired position level
- Prioritize the most prominent/current role, especially if it's an intern/trainee/apprentice role
- Look for keywords: "Intern", "Internship", "Trainee", "Apprentice", "Student" in job titles, summaries, or objective sections

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
    const prompt = `Analyze this job posting and extract structured requirements:

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
  "domainWeight": 10
}

CRITICAL RULES for skill weights:
1. The "weight" field (0-100) indicates how IMPORTANT each skill is for THIS specific job
2. CORE/PRIMARY skills (the main technology the job revolves around) MUST have weight 85-95
   - Example: For a "React Native Developer" job, "React Native" should be weight 95
   - Example: For a "Python Data Engineer" job, "Python" should be weight 90
3. SECONDARY skills (supporting technologies) should have weight 60-80
   - Example: For a "React Native Developer" job, "Redux" might be weight 75, "REST APIs" weight 70
4. GENERIC/COMMON skills (tools everyone knows) should have weight 30-50
   - Example: "Git" = weight 30, "Agile" = weight 35, "Communication" = weight 20
5. Do NOT give high weights to soft skills (Communication, Teamwork, Problem Solving)
6. Do NOT include pure soft skills in requiredSkills — only include technical skills
7. Use EXACT technology names — distinguish between related but different technologies:
   - "React" (web framework) is DIFFERENT from "React Native" (mobile framework)
   - "Angular" (v2+) is DIFFERENT from "AngularJS" (v1)
   - "Node.js" is DIFFERENT from "Deno"
   - Keep specific: use "React Native" not just "React" if the job is for mobile
8. For internships: Skills may have lower weights (50-70) as internships are learning opportunities
9. For senior roles: Core skills should have higher weights (90-95)

Return ONLY valid JSON, no additional text.`;

    const response = await this.callQwen(prompt, true);
    return JSON.parse(response);
  }

  async generateMatchExplanation(
    candidateProfile: any,
    jobRequirements: any,
    score: number
  ): Promise<{ explanation: string; gaps: any[] }> {
    // Check if candidate is an intern
    const candidateRoles = candidateProfile.roles || [];
    const candidateIsIntern = Array.isArray(candidateRoles) && 
      candidateRoles.some((role: string) => 
        role && typeof role === 'string' && 
        /intern|internship|trainee|apprentice|student/i.test(role)
      );
    
    // Check if job is an internship
    const jobIsInternship = jobRequirements.minYearsExperience === 0 || 
      (jobRequirements.seniorityLevel && 
       /intern|internship/i.test(jobRequirements.seniorityLevel));

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

MATCHING CONTEXT RULES:
1. Intern-to-Intern Matching:
   - If candidate role contains "Intern" AND job seniorityLevel is "internship" → this is a GOOD match
   - Intern candidates with 0-2 years experience are appropriate for internships
   - Don't penalize for having some internship experience (1 year as intern is different from 1 year as senior engineer)
   - Focus on learning potential, not perfect skill match

2. Experience Interpretation:
   - 1 year as "Data Analyst Intern" is different from 1 year as "Senior Data Analyst"
   - Consider the role context when evaluating experience
   - For internships, some experience (0-2 years) is acceptable and even positive

3. Skills for Internships:
   - Internships may have more lenient skill requirements
   - Focus on learning potential and basic knowledge, not advanced expertise
   - Having some relevant skills is more important than having all skills perfectly

4. If candidate is intern but job is not:
   - Explain why they might be underqualified (but don't reject outright if they have relevant skills)

5. If job is internship but candidate is not:
   - Explain why they might be overqualified (unless they explicitly want to switch careers)

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
      console.log(`[Qwen] Raw match explanation response: ${responseJson.substring(0, 500)}`);
      
      let parsed: any;
      try {
        // callQwen with jsonMode=true returns a JSON string, so parse it
        parsed = JSON.parse(responseJson);
      } catch (parseError: any) {
        console.warn(`[Qwen] Initial parse failed, trying to clean response: ${parseError.message}`);
        // Try to clean markdown code blocks if present
        let cleanedResponse = responseJson.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        parsed = JSON.parse(cleanedResponse);
      }
      
      console.log(`[Qwen] Parsed match explanation:`, {
        explanation: parsed.explanation?.substring(0, 100) + '...',
        gapsCount: parsed.gaps?.length || 0,
      });
      
      // Ensure we have valid structure
      return {
        explanation: parsed.explanation || 'No explanation available.',
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      };
    } catch (error: any) {
      console.error('[Qwen] Failed to generate match explanation:', error);
      console.error('[Qwen] Error details:', error.message);
      // Return default values on error
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
