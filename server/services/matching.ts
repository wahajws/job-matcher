import type { CandidateMatrix, JobMatrix } from '../db/models/index.js';

export interface MatchBreakdown {
  skills: number;
  experience: number;
  domain: number;
  location: number;
}

export class MatchingService {
  /**
   * Normalize skill names to handle variations (e.g., "React", "React.js", "ReactJS" → "react")
   * This ensures that different spellings/variations of the same skill match correctly
   */
  private normalizeSkillName(skillName: string): string {
    if (!skillName) return '';
    
    let normalized = skillName.toLowerCase().trim();
    const original = normalized;
    
    // First, handle standalone abbreviations
    if (normalized === 'js' || normalized === 'javascript' || normalized === 'ecmascript') {
      return 'javascript';
    }
    if (normalized === 'ts' || normalized === 'typescript') {
      return 'typescript';
    }
    if (normalized === 'py' || normalized === 'python') {
      return 'python';
    }
    if (normalized === 'html' || normalized === 'html5') {
      return 'html';
    }
    if (normalized === 'css' || normalized === 'css3') {
      return 'css';
    }
    
    // Remove common separators (dots, underscores, spaces, hyphens) for comparison
    const withoutSeparators = normalized.replace(/[._\s-]+/g, '');
    
    // Handle React variations: react, reactjs, react.js, react-js, react js
    if (normalized.includes('react') || withoutSeparators.includes('react')) {
      return 'react';
    }
    
    // Handle Node.js variations: node, nodejs, node.js, node-js, node js
    if ((normalized.includes('node') || withoutSeparators.includes('node')) && !normalized.includes('react')) {
      return 'nodejs';
    }
    
    // Handle Vue variations
    if (normalized.includes('vue') || withoutSeparators.includes('vue')) {
      return 'vue';
    }
    
    // Handle Angular variations
    if (normalized.includes('angular') || withoutSeparators.includes('angular')) {
      return 'angular';
    }
    
    // Handle SQL variations - normalize specific databases to generic SQL
    if (normalized === 'mysql' || normalized === 'postgresql' || normalized === 'postgres' || 
        normalized === 'mssql' || normalized === 'sqlserver') {
      return 'sql';
    }
    
    // For other skills, return the version without separators for better matching
    // This helps match "express.js" with "expressjs" or "express"
    return withoutSeparators || normalized;
  }

  /**
   * Check if candidate should be considered for this job (strict filtering)
   * Returns false if candidate is clearly unsuitable
   */
  shouldConsiderCandidate(
    candidateMatrix: CandidateMatrix,
    jobMatrix: JobMatrix,
    candidateYears: number,
    jobMinYearsExperience?: number,
    jobSeniorityLevel?: 'junior' | 'mid' | 'senior' | 'lead' | 'principal',
    candidateHeadline?: string,
    candidateRoles?: string[]
  ): boolean {
    // Check if this is an internship (0 years required)
    // Also check job title if available (we'll need to pass it)
    const isInternship = jobMinYearsExperience === 0 || 
      (jobSeniorityLevel === 'junior' && jobMinYearsExperience === 0);
    
    // Check if candidate is an intern (by role/title)
    const candidateIsIntern = this.isInternCandidate(candidateHeadline, candidateRoles);
    
    // For internships: Allow candidates who are interns OR have 0-1 years experience
    if (isInternship) {
      console.log(`[Matching] Job is internship. Candidate years: ${candidateYears}, Is intern: ${candidateIsIntern}, Headline: "${candidateHeadline}", Roles: ${JSON.stringify(candidateRoles)}`);
      if (candidateIsIntern) {
        // Candidate is an intern - allow even if they have some experience (up to 2 years)
        if (candidateYears > 2) {
          console.log(`[Matching] Rejecting intern candidate: too experienced (${candidateYears} years)`);
          return false; // Too experienced even for an intern candidate
        }
        console.log(`[Matching] Accepting intern candidate for internship job (${candidateYears} years experience)`);
        return true; // Intern candidate is suitable for internship job
      } else {
        // Not an intern candidate - only allow 0 years experience
        if (candidateYears > 0) {
          console.log(`[Matching] Rejecting non-intern candidate for internship: has ${candidateYears} years experience`);
          return false; // Overqualified - reject
        }
        console.log(`[Matching] Accepting non-intern candidate for internship (0 years experience)`);
      }
    }
    
    // Check minimum experience requirement
    if (jobMinYearsExperience !== undefined && jobMinYearsExperience > 0) {
      if (candidateYears < jobMinYearsExperience * 0.8) {
        return false; // Significantly underqualified
      }
    }
    
    // Check for overqualification based on seniority
    if (jobSeniorityLevel) {
      switch (jobSeniorityLevel.toLowerCase()) {
        case 'junior':
          // Junior: max 2 years, but if job requires 0, then max 0
          if (jobMinYearsExperience === 0 && candidateYears > 0) {
            return false; // Overqualified for internship-level
          }
          if (candidateYears > 3) {
            return false; // Too experienced for junior role
          }
          break;
        case 'mid':
          // Mid: 2-5 years, reject if way over
          if (candidateYears > 8) {
            return false; // Too experienced for mid role
          }
          break;
        case 'senior':
          // Senior: 5-10 years, reject if way over
          if (candidateYears > 15) {
            return false; // Too experienced (principal level)
          }
          break;
      }
    }
    
    // Check if candidate has ANY required skills
    if (!candidateMatrix.skills || candidateMatrix.skills.length === 0) {
      return false; // No skills at all
    }
    
    // Check if candidate has at least SOME matching skills
    // For internships, be more lenient - only require skills if job has many required skills
    if (jobMatrix.required_skills && jobMatrix.required_skills.length > 0) {
      const candidateSkillNames = new Set(
        candidateMatrix.skills.map((s: any) => s.name?.toLowerCase() || '')
      );
      const hasAnyRequiredSkill = jobMatrix.required_skills.some((req: any) => {
        const skillName = (req.skill || req || '').toLowerCase();
        return candidateSkillNames.has(skillName);
      });
      
      // For internships, be more lenient - allow if no required skills match but candidate has skills
      if (isInternship) {
        if (!hasAnyRequiredSkill && candidateMatrix.skills && candidateMatrix.skills.length > 0) {
          // Internship with skills mismatch - still allow if candidate has some skills
          console.log(`[Matching] Internship: candidate has skills but no required match - allowing anyway`);
          // Don't return false - allow it through
        } else if (!hasAnyRequiredSkill) {
          return false; // No skills at all
        }
      } else {
        // Non-internship: strict matching
        if (!hasAnyRequiredSkill) {
          return false; // No matching required skills
        }
      }
    }
    
    return true; // Candidate passes basic filters
  }

  /**
   * Check if candidate is an intern based on their headline/roles
   */
  private isInternCandidate(headline?: string, roles?: string[]): boolean {
    const internKeywords = ['intern', 'internship', 'trainee', 'apprentice', 'student'];
    
    // Check headline
    if (headline) {
      const headlineLower = headline.toLowerCase();
      const isIntern = internKeywords.some(keyword => headlineLower.includes(keyword));
      if (isIntern) {
        console.log(`[Matching] Candidate detected as intern via headline: "${headline}"`);
        return true;
      }
    }
    
    // Check roles
    if (roles && Array.isArray(roles)) {
      for (const role of roles) {
        if (role) {
          const roleLower = role.toLowerCase();
          const isIntern = internKeywords.some(keyword => roleLower.includes(keyword));
          if (isIntern) {
            console.log(`[Matching] Candidate detected as intern via role: "${role}"`);
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Calculate deterministic match score between candidate and job
   */
  calculateMatchScore(
    candidateMatrix: CandidateMatrix,
    jobMatrix: JobMatrix,
    candidateCountry?: string,
    jobCountry?: string,
    jobLocationType?: 'onsite' | 'hybrid' | 'remote',
    jobMinYearsExperience?: number,
    jobSeniorityLevel?: 'junior' | 'mid' | 'senior' | 'lead' | 'principal',
    candidateHeadline?: string,
    candidateRoles?: string[]
  ): { score: number; breakdown: MatchBreakdown } {
    // Check if this is an internship
    const isInternship = jobMinYearsExperience === 0 || 
      (jobSeniorityLevel === 'junior' && jobMinYearsExperience === 0);
    
    // Skills Score (0-100)
    const skillsScore = this.calculateSkillsScore(
      candidateMatrix.skills,
      jobMatrix.required_skills,
      jobMatrix.preferred_skills,
      isInternship
    );

    // Experience Score (0-100)
    const experienceScore = this.calculateExperienceScore(
      candidateMatrix.total_years_experience,
      jobMatrix.experience_weight,
      jobMinYearsExperience,
      jobSeniorityLevel,
      candidateHeadline,
      candidateRoles
    );

    // Domain Score (0-100)
    const domainScore = this.calculateDomainScore(
      candidateMatrix.domains,
      jobMatrix.domain_weight
    );

    // Location Score (0-100)
    const locationScore = this.calculateLocationScore(
      candidateMatrix.location_signals,
      jobMatrix.location_weight,
      candidateCountry,
      jobCountry,
      jobLocationType
    );

    // Weighted final score
    const skillsWeight = 100 - jobMatrix.experience_weight - jobMatrix.location_weight - jobMatrix.domain_weight;
    const totalWeight = skillsWeight + jobMatrix.experience_weight + jobMatrix.location_weight + jobMatrix.domain_weight;

    const finalScore = Math.round(
      (skillsScore * skillsWeight +
        experienceScore * jobMatrix.experience_weight +
        domainScore * jobMatrix.domain_weight +
        locationScore * jobMatrix.location_weight) /
        totalWeight
    );

    return {
      score: Math.min(100, Math.max(0, finalScore)),
      breakdown: {
        skills: skillsScore,
        experience: experienceScore,
        domain: domainScore,
        location: locationScore,
      },
    };
  }

  private calculateSkillsScore(
    candidateSkills: any[],
    requiredSkills: any[],
    preferredSkills: any[],
    isInternship: boolean = false
  ): number {
    if (!candidateSkills || candidateSkills.length === 0) {
      return 0; // No skills = 0 score
    }
    
    // STRICT: If job has required skills but candidate has none, return 0
    if (requiredSkills && requiredSkills.length > 0 && candidateSkills.length === 0) {
      return 0;
    }

    // Create a map of normalized skill names to skill data
    // This allows matching "React", "React.js", "ReactJS" as the same skill
    const candidateSkillMap = new Map<string, { level: string; years: number; original: string }>();
    candidateSkills.forEach((skill: any) => {
      const skillName = skill.name || '';
      if (!skillName) return;
      
      const normalizedName = this.normalizeSkillName(skillName);
      const originalLower = skillName.toLowerCase();
      
      if (normalizedName) {
        // Store normalized version (primary)
        candidateSkillMap.set(normalizedName, {
          level: skill.level,
          years: skill.yearsOfExperience,
          original: skillName,
        });
        // Also store original lowercase for exact matches
        if (normalizedName !== originalLower) {
          candidateSkillMap.set(originalLower, {
            level: skill.level,
            years: skill.yearsOfExperience,
            original: skillName,
          });
        }
      }
    });

    let requiredScore = 0;
    let preferredScore = 0;

    // Calculate required skills match
    if (requiredSkills && requiredSkills.length > 0) {
      let matchedRequired = 0;
      requiredSkills.forEach((req: any) => {
        const skillName = req.skill || req;
        const normalized = this.normalizeSkillName(skillName);
        const original = skillName.toLowerCase();
        
        // Try normalized first, then original
        if (candidateSkillMap.has(normalized) || candidateSkillMap.has(original)) {
          matchedRequired++;
        }
      });
      const matchRatio = matchedRequired / requiredSkills.length;
      
      // For internships: be more lenient - only require 30% match
      // For other jobs: require 50% match
      const minMatchRatio = isInternship ? 0.3 : 0.5;
      
      if (matchRatio < minMatchRatio) {
        // Too few required skills
        if (isInternship && matchedRequired > 0) {
          // Internship: give partial score if at least 1 skill matches
          return Math.round((matchedRequired / requiredSkills.length) * 60); // 0-60 range
        }
        return 0;
      }
      
      requiredScore = matchRatio * 100;
    }

    // Calculate preferred skills match
    if (preferredSkills && preferredSkills.length > 0) {
      let matchedPreferred = 0;
      preferredSkills.forEach((pref: any) => {
        const skillName = pref.skill || pref;
        const normalized = this.normalizeSkillName(skillName);
        const original = skillName.toLowerCase();
        
        // Try normalized first, then original
        if (candidateSkillMap.has(normalized) || candidateSkillMap.has(original)) {
          matchedPreferred++;
        }
      });
      preferredScore = (matchedPreferred / preferredSkills.length) * 70; // Preferred skills worth less
    }

    // Weighted average: required skills 70%, preferred 30%
    return Math.round(requiredScore * 0.7 + preferredScore * 0.3);
  }

  private calculateExperienceScore(
    candidateYears: number,
    experienceWeight: number,
    jobMinYearsExperience?: number,
    jobSeniorityLevel?: 'junior' | 'mid' | 'senior' | 'lead' | 'principal',
    candidateHeadline?: string,
    candidateRoles?: string[]
  ): number {
    // If no job requirements specified, use neutral scoring
    if (jobMinYearsExperience === undefined && !jobSeniorityLevel) {
      if (candidateYears >= 5) return 100;
      if (candidateYears >= 3) return 80;
      if (candidateYears >= 1) return 60;
      return 40;
    }

    // Determine expected experience range based on seniority level
    let expectedMin = jobMinYearsExperience ?? 0;
    let expectedMax = jobMinYearsExperience ?? Infinity;
    let isInternship = false;
    
    // Check if this is an internship (0 years experience)
    if (jobMinYearsExperience === 0) {
      isInternship = true;
      expectedMin = 0;
      expectedMax = 0;
    } else if (jobSeniorityLevel) {
      switch (jobSeniorityLevel.toLowerCase()) {
        case 'junior':
          expectedMin = Math.max(jobMinYearsExperience ?? 0, 0);
          expectedMax = 2; // Junior: 0-2 years
          break;
        case 'mid':
          expectedMin = Math.max(jobMinYearsExperience ?? 2, 2);
          expectedMax = 5; // Mid: 2-5 years
          break;
        case 'senior':
          expectedMin = Math.max(jobMinYearsExperience ?? 5, 5);
          expectedMax = 10; // Senior: 5-10 years
          break;
        case 'lead':
          expectedMin = Math.max(jobMinYearsExperience ?? 7, 7);
          expectedMax = 15; // Lead: 7-15 years
          break;
        case 'principal':
          expectedMin = Math.max(jobMinYearsExperience ?? 10, 10);
          expectedMax = Infinity; // Principal: 10+ years
          break;
      }
    }

    // STRICT SCORING: Reject if outside acceptable range
    if (isInternship) {
      // Check if candidate is an intern
      const candidateIsIntern = this.isInternCandidate(candidateHeadline, candidateRoles);
      
      if (candidateIsIntern) {
        // Intern candidate: Allow 0-2 years experience
        if (candidateYears === 0) return 100;
        if (candidateYears === 1) return 90; // 1 year is good for intern candidates
        if (candidateYears === 2) return 75; // 2 years is acceptable for intern candidates
        return 0; // More than 2 years = 0 score
      } else {
        // Non-intern candidate: Only 0 years
        if (candidateYears === 0) return 100;
        if (candidateYears === 1) return 60; // 1 year is borderline for non-interns
        return 0; // More than 1 year = 0 score
      }
    }
    
    if (candidateYears < expectedMin) {
      // Underqualified: if more than 20% below minimum, return 0
      const ratio = candidateYears / Math.max(expectedMin, 1);
      if (ratio < 0.8) {
        return 0; // Too underqualified
      }
      return Math.round(30 + (ratio * 50)); // 30-80 range for close matches
    } else if (candidateYears <= expectedMax) {
      // Perfect match: within expected range
      return 100;
    } else {
      // Overqualified: STRICT - heavily penalize
      const excessYears = candidateYears - expectedMax;
      if (excessYears <= 1) {
        return 80; // Slightly overqualified - acceptable
      } else if (excessYears <= 2) {
        return 50; // Moderately overqualified
      } else {
        // Severely overqualified - return 0 (will be filtered)
        return 0;
      }
    }
  }

  private calculateDomainScore(candidateDomains: any[], domainWeight: number): number {
    // Simplified: if candidate has any domain experience, give partial score
    // In real implementation, you'd match against job's domain
    if (!candidateDomains || candidateDomains.length === 0) {
      return 50;
    }
    return 80; // Partial match
  }

  private calculateLocationScore(
    locationSignals: any,
    locationWeight: number,
    candidateCountry?: string,
    jobCountry?: string,
    jobLocationType?: 'onsite' | 'hybrid' | 'remote'
  ): number {
    // If job is remote, location doesn't matter - give full score
    if (jobLocationType === 'remote') {
      return 100;
    }

    // If no location information available, return neutral score
    if (!candidateCountry || !jobCountry) {
      if (locationSignals?.willingToRelocate) {
        return 80; // Willing to relocate, so give decent score
      }
      return 50; // No location info, neutral score
    }

    // Exact country match
    if (candidateCountry === jobCountry) {
      return 100;
    }

    // Check if candidate is willing to relocate
    if (locationSignals?.willingToRelocate) {
      // Check if job country is in preferred locations
      if (locationSignals.preferredLocations && Array.isArray(locationSignals.preferredLocations)) {
        if (locationSignals.preferredLocations.includes(jobCountry)) {
          return 90; // Job location is in preferred locations
        }
      }
      return 70; // Willing to relocate but not preferred location
    }

    // Different countries and not willing to relocate
    // For hybrid jobs, give partial score; for onsite, lower score
    if (jobLocationType === 'hybrid') {
      return 40; // Hybrid might work with some travel
    }
    
    return 20; // Onsite in different country, not willing to relocate - low score
  }
}

export const matchingService = new MatchingService();
