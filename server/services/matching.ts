import type { CandidateMatrix, JobMatrix } from '../db/models/index.js';

export interface MatchBreakdown {
  skills: number;
  experience: number;
  domain: number;
  location: number;
}

/**
 * Set of soft/generic skills that should NOT count towards skill matching.
 * These appear on almost every CV and create false-positive matches.
 */
const SOFT_SKILLS = new Set([
  'communication', 'teamwork', 'team work', 'problem solving', 'problemsolving',
  'leadership', 'time management', 'timemanagement', 'critical thinking',
  'criticalthinking', 'adaptability', 'creativity', 'collaboration',
  'interpersonal', 'interpersonal skills', 'presentation', 'presentation skills',
  'public speaking', 'publicspeaking', 'negotiation', 'conflict resolution',
  'conflictresolution', 'decision making', 'decisionmaking', 'emotional intelligence',
  'emotionalintelligence', 'work ethic', 'workethic', 'self motivated',
  'selfmotivated', 'attention to detail', 'attentiontodetail', 'multitasking',
  'organization', 'organizational', 'flexibility', 'reliability',
  'analytical skills', 'analyticalskills', 'analytical thinking', 'analyticalthinking',
  'strategic thinking', 'strategicthinking', 'project management', 'projectmanagement',
]);

/**
 * Set of generic/ubiquitous technical skills that should be down-weighted.
 * These are so common that matching on them alone is not meaningful.
 */
const GENERIC_TECH_SKILLS = new Set([
  'git', 'github', 'gitlab', 'bitbucket',
  'microsoft office', 'microsoftoffice', 'ms office', 'msoffice',
  'word', 'excel', 'powerpoint',
  'windows', 'linux', 'macos',
  'agile', 'scrum', 'kanban', 'jira', 'trello',
  'slack', 'teams', 'zoom',
]);

export class MatchingService {
  /**
   * Normalize skill names to handle variations.
   * IMPORTANT: Treats related but distinct technologies separately
   * (e.g., "React" web ≠ "React Native" mobile)
   */
  private normalizeSkillName(skillName: string): string {
    if (!skillName) return '';
    
    let normalized = skillName.toLowerCase().trim();
    
    // Remove common separators for comparison
    const withoutSeparators = normalized.replace(/[._\s-]+/g, '');
    
    // ===== Handle compound/specific technologies FIRST (before generic ones) =====
    
    // React Native is DIFFERENT from React (web)
    if (normalized.includes('react native') || withoutSeparators === 'reactnative') {
      return 'react-native';
    }
    
    // Next.js
    if (normalized.includes('next') && (normalized.includes('js') || normalized.includes('next.js') || withoutSeparators === 'nextjs')) {
      return 'nextjs';
    }
    
    // Nuxt.js (Vue equivalent of Next.js)
    if (normalized.includes('nuxt') || withoutSeparators === 'nuxtjs') {
      return 'nuxtjs';
    }
    
    // React (web) - only after React Native check
    if (normalized === 'react' || normalized === 'react.js' || normalized === 'reactjs' || 
        withoutSeparators === 'reactjs' || normalized === 'react js') {
      return 'react';
    }
    
    // ===== Standalone abbreviations =====
    if (normalized === 'js' || normalized === 'javascript' || normalized === 'ecmascript') {
      return 'javascript';
    }
    if (normalized === 'ts' || normalized === 'typescript') {
      return 'typescript';
    }
    if (normalized === 'py' || normalized === 'python' || normalized === 'python3') {
      return 'python';
    }
    if (normalized === 'html' || normalized === 'html5') {
      return 'html';
    }
    if (normalized === 'css' || normalized === 'css3') {
      return 'css';
    }
    
    // Node.js variations (but not react-native, not next.js)
    if ((normalized === 'node' || normalized === 'node.js' || normalized === 'nodejs' || 
         withoutSeparators === 'nodejs') && 
        !normalized.includes('react') && !normalized.includes('next')) {
      return 'nodejs';
    }
    
    // Vue.js
    if (normalized === 'vue' || normalized === 'vue.js' || normalized === 'vuejs' || 
        withoutSeparators === 'vuejs' || normalized === 'vue js') {
      return 'vue';
    }
    
    // AngularJS (v1) is different from Angular (v2+)
    if (normalized === 'angularjs' || normalized === 'angular.js' || normalized === 'angular 1' ||
        withoutSeparators === 'angularjs') {
      return 'angularjs';
    }
    if (normalized === 'angular' || /^angular\s*[2-9]/.test(normalized) || /^angular\s*\d{2}/.test(normalized)) {
      return 'angular';
    }
    
    // Express.js
    if (normalized === 'express' || normalized === 'express.js' || normalized === 'expressjs' ||
        withoutSeparators === 'expressjs') {
      return 'expressjs';
    }
    
    // Flutter vs Dart
    if (normalized === 'flutter') return 'flutter';
    if (normalized === 'dart') return 'dart';
    
    // Swift / SwiftUI / Objective-C (iOS)
    if (normalized === 'swiftui') return 'swiftui';
    if (normalized === 'swift') return 'swift';
    if (normalized === 'objective-c' || normalized === 'objectivec' || normalized === 'obj-c') return 'objective-c';
    
    // Kotlin vs Java (Android)
    if (normalized === 'kotlin') return 'kotlin';
    if (normalized === 'java') return 'java';
    
    // SQL variations - keep specific databases distinct
    if (normalized === 'sql') return 'sql';
    if (normalized === 'mysql') return 'mysql';
    if (normalized === 'postgresql' || normalized === 'postgres') return 'postgresql';
    if (normalized === 'mssql' || normalized === 'sqlserver' || normalized === 'sql server') return 'mssql';
    if (normalized === 'sqlite') return 'sqlite';
    
    // NoSQL databases - keep distinct
    if (normalized === 'mongodb' || normalized === 'mongo') return 'mongodb';
    if (normalized === 'redis') return 'redis';
    if (normalized === 'dynamodb') return 'dynamodb';
    if (normalized === 'cassandra') return 'cassandra';
    if (normalized === 'firebase') return 'firebase';
    
    // Cloud platforms
    if (normalized === 'aws' || normalized === 'amazon web services') return 'aws';
    if (normalized === 'azure' || normalized === 'microsoft azure') return 'azure';
    if (normalized === 'gcp' || normalized === 'google cloud' || normalized === 'google cloud platform') return 'gcp';
    
    // DevOps
    if (normalized === 'docker') return 'docker';
    if (normalized === 'kubernetes' || normalized === 'k8s') return 'kubernetes';
    if (normalized === 'ci/cd' || normalized === 'cicd' || normalized === 'ci cd') return 'cicd';
    
    // ML/AI
    if (normalized === 'tensorflow' || normalized === 'tf') return 'tensorflow';
    if (normalized === 'pytorch') return 'pytorch';
    if (normalized === 'machine learning' || normalized === 'ml') return 'machine-learning';
    if (normalized === 'deep learning' || normalized === 'dl') return 'deep-learning';
    
    // For other skills, return the version without separators for better matching
    return withoutSeparators || normalized;
  }

  /**
   * Check if a skill is a soft/non-technical skill that should be excluded from matching
   */
  private isSoftSkill(skillName: string): boolean {
    if (!skillName) return false;
    const normalized = skillName.toLowerCase().trim();
    const withoutSeparators = normalized.replace(/[._\s-]+/g, '');
    return SOFT_SKILLS.has(normalized) || SOFT_SKILLS.has(withoutSeparators);
  }

  /**
   * Check if a skill is a generic/ubiquitous technical skill
   */
  private isGenericTechSkill(skillName: string): boolean {
    if (!skillName) return false;
    const normalized = skillName.toLowerCase().trim();
    const withoutSeparators = normalized.replace(/[._\s-]+/g, '');
    return GENERIC_TECH_SKILLS.has(normalized) || GENERIC_TECH_SKILLS.has(withoutSeparators);
  }

  /**
   * Check if two SQL-family skills should be considered compatible
   * e.g., "MySQL" experience satisfies "SQL" requirement
   */
  private areSqlCompatible(candidateSkill: string, requiredSkill: string): boolean {
    const sqlFamily = new Set(['sql', 'mysql', 'postgresql', 'mssql', 'sqlite']);
    return sqlFamily.has(candidateSkill) && sqlFamily.has(requiredSkill);
  }

  /**
   * Check if candidate should be considered for this job (strict filtering)
   * Returns false if candidate is clearly unsuitable
   * NOW uses the same normalizeSkillName as the scorer (Fix D)
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
    const isInternship = jobMinYearsExperience === 0 || 
      (jobSeniorityLevel === 'junior' && jobMinYearsExperience === 0);
    
    // Check if candidate is an intern (by role/title)
    const candidateIsIntern = this.isInternCandidate(candidateHeadline, candidateRoles);
    
    // For internships: Allow candidates who are interns OR have 0-1 years experience
    if (isInternship) {
      console.log(`[Matching] Job is internship. Candidate years: ${candidateYears}, Is intern: ${candidateIsIntern}, Headline: "${candidateHeadline}", Roles: ${JSON.stringify(candidateRoles)}`);
      if (candidateIsIntern) {
        if (candidateYears > 2) {
          console.log(`[Matching] Rejecting intern candidate: too experienced (${candidateYears} years)`);
          return false;
        }
        console.log(`[Matching] Accepting intern candidate for internship job (${candidateYears} years experience)`);
        return true;
      } else {
        if (candidateYears > 0) {
          console.log(`[Matching] Rejecting non-intern candidate for internship: has ${candidateYears} years experience`);
          return false;
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
          if (jobMinYearsExperience === 0 && candidateYears > 0) {
            return false;
          }
          if (candidateYears > 3) {
            return false;
          }
          break;
        case 'mid':
          if (candidateYears > 8) {
            return false;
          }
          break;
        case 'senior':
          if (candidateYears > 15) {
            return false;
          }
          break;
      }
    }
    
    // Check if candidate has ANY skills
    if (!candidateMatrix.skills || candidateMatrix.skills.length === 0) {
      return false;
    }
    
    // FIX D: Use normalizeSkillName for consistent matching in pre-filter
    if (jobMatrix.required_skills && jobMatrix.required_skills.length > 0) {
      // Build normalized candidate skill set (excluding soft skills)
      const candidateNormalizedSkills = new Set<string>();
      const candidateOriginalSkills = new Set<string>();
      
      if (Array.isArray(candidateMatrix.skills)) {
        candidateMatrix.skills.forEach((s: any) => {
          const name = s.name || s;
          if (name && !this.isSoftSkill(name)) {
            candidateNormalizedSkills.add(this.normalizeSkillName(name));
            candidateOriginalSkills.add(name.toLowerCase());
          }
        });
      }
      
      // Check how many NON-soft/NON-generic required skills match
      let coreRequiredSkills = 0;
      let matchedCoreRequired = 0;
      
      jobMatrix.required_skills.forEach((req: any) => {
        const skillName = req.skill || req || '';
        if (this.isSoftSkill(skillName) || this.isGenericTechSkill(skillName)) {
          return; // Skip soft and generic skills in filtering
        }
        
        coreRequiredSkills++;
        const normalized = this.normalizeSkillName(skillName);
        const original = skillName.toLowerCase();
        
        if (candidateNormalizedSkills.has(normalized) || candidateOriginalSkills.has(original)) {
          matchedCoreRequired++;
        } else {
          // Check SQL family compatibility
          for (const cs of candidateNormalizedSkills) {
            if (this.areSqlCompatible(cs, normalized)) {
              matchedCoreRequired++;
              break;
            }
          }
        }
      });
      
      // Must match at least 1 core required skill (non-internship)
      // For internships, be more lenient
      if (coreRequiredSkills > 0) {
        if (isInternship) {
          // Internship: allow through if candidate has any technical skills
          if (matchedCoreRequired === 0 && candidateNormalizedSkills.size === 0) {
            return false;
          }
        } else {
          if (matchedCoreRequired === 0) {
            console.log(`[Matching] Rejecting candidate: no core required skills match (0/${coreRequiredSkills})`);
            return false;
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Check if candidate is an intern based on their headline/roles
   */
  private isInternCandidate(headline?: string, roles?: string[]): boolean {
    const internKeywords = ['intern', 'internship', 'trainee', 'apprentice', 'student'];
    
    if (headline) {
      const headlineLower = headline.toLowerCase();
      const isIntern = internKeywords.some(keyword => headlineLower.includes(keyword));
      if (isIntern) {
        console.log(`[Matching] Candidate detected as intern via headline: "${headline}"`);
        return true;
      }
    }
    
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
   * Calculate deterministic match score between candidate and job.
   * Now accepts jobTitle and jobDepartment for domain matching (Fix C).
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
    candidateRoles?: string[],
    jobTitle?: string,
    jobDepartment?: string,
    jobDescription?: string,
  ): { score: number; breakdown: MatchBreakdown } {
    const isInternship = jobMinYearsExperience === 0 || 
      (jobSeniorityLevel === 'junior' && jobMinYearsExperience === 0);
    
    // Skills Score (0-100) — Fix A, B, F, G applied here
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

    // Domain Score (0-100) — Fix C: actual domain matching
    const domainScore = this.calculateDomainScore(
      candidateMatrix.domains,
      jobMatrix.domain_weight,
      jobTitle,
      jobDepartment,
      jobDescription,
      candidateMatrix.roles,
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

  /**
   * Calculate skills score with:
   * - Fix A: Proper normalization (React ≠ React Native)
   * - Fix B: Weight-aware scoring (core skills matter more)
   * - Fix F: Soft skills excluded
   * - Fix G: Core skill penalty (missing top skills caps score)
   */
  private calculateSkillsScore(
    candidateSkills: any[],
    requiredSkills: any[],
    preferredSkills: any[],
    isInternship: boolean = false
  ): number {
    if (!candidateSkills || candidateSkills.length === 0) {
      return 0;
    }

    // Build candidate skill map (excluding soft skills — Fix F)
    const candidateSkillMap = new Map<string, { level: string; years: number; original: string }>();
    candidateSkills.forEach((skill: any) => {
      const skillName = skill.name || '';
      if (!skillName) return;
      
      // Fix F: Skip soft skills entirely
      if (this.isSoftSkill(skillName)) return;
      
      const normalizedName = this.normalizeSkillName(skillName);
      const originalLower = skillName.toLowerCase();
      
      if (normalizedName) {
        candidateSkillMap.set(normalizedName, {
          level: skill.level,
          years: skill.yearsOfExperience || 0,
          original: skillName,
        });
        if (normalizedName !== originalLower) {
          candidateSkillMap.set(originalLower, {
            level: skill.level,
            years: skill.yearsOfExperience || 0,
            original: skillName,
          });
        }
      }
    });

    let requiredScore = 0;
    let preferredScore = 0;

    // ===== Required Skills Matching (Fix B: weight-aware) =====
    if (requiredSkills && requiredSkills.length > 0) {
      // Filter out soft skills from required skills (Fix F)
      const technicalRequired = requiredSkills.filter((req: any) => {
        const skillName = req.skill || req || '';
        return !this.isSoftSkill(skillName);
      });
      
      if (technicalRequired.length === 0) {
        requiredScore = 50; // If all required skills are soft, give neutral score
      } else {
        // Sort by weight descending to identify core skills (Fix G)
        const sortedRequired = [...technicalRequired].sort((a: any, b: any) => {
          const weightA = a.weight || 50;
          const weightB = b.weight || 50;
          return weightB - weightA;
        });
        
        // Identify top core skills (top 3 or top 30%, whichever is larger)
        const coreCount = Math.max(3, Math.ceil(sortedRequired.length * 0.3));
        const coreSkills = sortedRequired.slice(0, Math.min(coreCount, sortedRequired.length));
        const nonCoreSkills = sortedRequired.slice(Math.min(coreCount, sortedRequired.length));
        
        // Calculate weighted match for core skills
        let coreWeightTotal = 0;
        let coreWeightMatched = 0;
        let coreMatchCount = 0;
        
        coreSkills.forEach((req: any) => {
          const skillName = req.skill || req || '';
          const weight = req.weight || 70;
          const normalized = this.normalizeSkillName(skillName);
          const original = skillName.toLowerCase();
          const isGeneric = this.isGenericTechSkill(skillName);
          
          // Down-weight generic tech skills (Fix F)
          const effectiveWeight = isGeneric ? weight * 0.3 : weight;
          coreWeightTotal += effectiveWeight;
          
          let matched = candidateSkillMap.has(normalized) || candidateSkillMap.has(original);
          
          // Check SQL family compatibility
          if (!matched) {
            for (const [cs] of candidateSkillMap) {
              if (this.areSqlCompatible(cs, normalized)) {
                matched = true;
                break;
              }
            }
          }
          
          if (matched) {
            coreWeightMatched += effectiveWeight;
            coreMatchCount++;
          }
        });
        
        // Calculate weighted match for non-core skills
        let nonCoreWeightTotal = 0;
        let nonCoreWeightMatched = 0;
        
        nonCoreSkills.forEach((req: any) => {
          const skillName = req.skill || req || '';
          const weight = req.weight || 50;
          const normalized = this.normalizeSkillName(skillName);
          const original = skillName.toLowerCase();
          const isGeneric = this.isGenericTechSkill(skillName);
          
          const effectiveWeight = isGeneric ? weight * 0.3 : weight;
          nonCoreWeightTotal += effectiveWeight;
          
          let matched = candidateSkillMap.has(normalized) || candidateSkillMap.has(original);
          
          if (!matched) {
            for (const [cs] of candidateSkillMap) {
              if (this.areSqlCompatible(cs, normalized)) {
                matched = true;
                break;
              }
            }
          }
          
          if (matched) {
            nonCoreWeightMatched += effectiveWeight;
          }
        });
        
        // Core skills score (weighted by skill importance)
        const coreRatio = coreWeightTotal > 0 ? coreWeightMatched / coreWeightTotal : 0;
        const nonCoreRatio = nonCoreWeightTotal > 0 ? nonCoreWeightMatched / nonCoreWeightTotal : 0;
        
        // Fix G: Core skill penalty — if missing most core skills, cap score hard
        const coreMatchRatio = coreSkills.length > 0 ? coreMatchCount / coreSkills.length : 0;
        
        if (!isInternship) {
          // Non-internship: strict core skill requirements
          if (coreMatchRatio === 0) {
            // Missing ALL core skills → score is 0
            return 0;
          }
          if (coreMatchRatio < 0.34) {
            // Missing most core skills → cap at 25
            return Math.min(25, Math.round(coreRatio * 40));
          }
        } else {
          // Internship: more lenient, but still penalize missing all core skills
          if (coreMatchRatio === 0 && candidateSkillMap.size === 0) {
            return 0;
          }
        }
        
        // Combined: core skills worth 70%, non-core worth 30% (Fix B)
        const combinedScore = (coreRatio * 100 * 0.7) + (nonCoreRatio * 100 * 0.3);
        
        // Apply minimum threshold
        const minRatio = isInternship ? 0.2 : 0.3;
        const overallRatio = (coreWeightTotal + nonCoreWeightTotal) > 0 
          ? (coreWeightMatched + nonCoreWeightMatched) / (coreWeightTotal + nonCoreWeightTotal) 
          : 0;
        
        if (overallRatio < minRatio) {
          if (isInternship && coreMatchCount > 0) {
            requiredScore = Math.round(combinedScore * 0.5); // Partial for internships
          } else if (!isInternship) {
            return 0; // Too few matches
          }
        } else {
          requiredScore = Math.round(combinedScore);
        }
      }
    }

    // ===== Preferred Skills Matching =====
    if (preferredSkills && preferredSkills.length > 0) {
      const technicalPreferred = preferredSkills.filter((pref: any) => {
        const skillName = pref.skill || pref || '';
        return !this.isSoftSkill(skillName);
      });
      
      if (technicalPreferred.length > 0) {
        let weightTotal = 0;
        let weightMatched = 0;
        
        technicalPreferred.forEach((pref: any) => {
          const skillName = pref.skill || pref || '';
          const weight = pref.weight || 40;
          const normalized = this.normalizeSkillName(skillName);
          const original = skillName.toLowerCase();
          const isGeneric = this.isGenericTechSkill(skillName);
          
          const effectiveWeight = isGeneric ? weight * 0.3 : weight;
          weightTotal += effectiveWeight;
          
          let matched = candidateSkillMap.has(normalized) || candidateSkillMap.has(original);
          if (!matched) {
            for (const [cs] of candidateSkillMap) {
              if (this.areSqlCompatible(cs, normalized)) {
                matched = true;
                break;
              }
            }
          }
          
          if (matched) {
            weightMatched += effectiveWeight;
          }
        });
        
        preferredScore = weightTotal > 0 ? (weightMatched / weightTotal) * 70 : 0;
      }
    }

    // Weighted average: required 75%, preferred 25%
    return Math.round(requiredScore * 0.75 + preferredScore * 0.25);
  }

  private calculateExperienceScore(
    candidateYears: number,
    experienceWeight: number,
    jobMinYearsExperience?: number,
    jobSeniorityLevel?: 'junior' | 'mid' | 'senior' | 'lead' | 'principal',
    candidateHeadline?: string,
    candidateRoles?: string[]
  ): number {
    if (jobMinYearsExperience === undefined && !jobSeniorityLevel) {
      if (candidateYears >= 5) return 100;
      if (candidateYears >= 3) return 80;
      if (candidateYears >= 1) return 60;
      return 40;
    }

    let expectedMin = jobMinYearsExperience ?? 0;
    let expectedMax = jobMinYearsExperience ?? Infinity;
    let isInternship = false;
    
    if (jobMinYearsExperience === 0) {
      isInternship = true;
      expectedMin = 0;
      expectedMax = 0;
    } else if (jobSeniorityLevel) {
      switch (jobSeniorityLevel.toLowerCase()) {
        case 'junior':
          expectedMin = Math.max(jobMinYearsExperience ?? 0, 0);
          expectedMax = 2;
          break;
        case 'mid':
          expectedMin = Math.max(jobMinYearsExperience ?? 2, 2);
          expectedMax = 5;
          break;
        case 'senior':
          expectedMin = Math.max(jobMinYearsExperience ?? 5, 5);
          expectedMax = 10;
          break;
        case 'lead':
          expectedMin = Math.max(jobMinYearsExperience ?? 7, 7);
          expectedMax = 15;
          break;
        case 'principal':
          expectedMin = Math.max(jobMinYearsExperience ?? 10, 10);
          expectedMax = Infinity;
          break;
      }
    }

    if (isInternship) {
      const candidateIsIntern = this.isInternCandidate(candidateHeadline, candidateRoles);
      
      if (candidateIsIntern) {
        if (candidateYears === 0) return 100;
        if (candidateYears === 1) return 90;
        if (candidateYears === 2) return 75;
        return 0;
      } else {
        if (candidateYears === 0) return 100;
        if (candidateYears === 1) return 60;
        return 0;
      }
    }
    
    if (candidateYears < expectedMin) {
      const ratio = candidateYears / Math.max(expectedMin, 1);
      if (ratio < 0.8) {
        return 0;
      }
      return Math.round(30 + (ratio * 50));
    } else if (candidateYears <= expectedMax) {
      return 100;
    } else {
      const excessYears = candidateYears - expectedMax;
      if (excessYears <= 1) {
        return 80;
      } else if (excessYears <= 2) {
        return 50;
      } else {
        return 0;
      }
    }
  }

  /**
   * Fix C: ACTUAL domain matching — extracts domain keywords from job info
   * and compares with candidate domains and roles.
   */
  private calculateDomainScore(
    candidateDomains: any[],
    domainWeight: number,
    jobTitle?: string,
    jobDepartment?: string,
    jobDescription?: string,
    candidateRoles?: any[],
  ): number {
    // Extract domain keywords from job
    const jobDomainKeywords = this.extractDomainKeywords(jobTitle, jobDepartment, jobDescription);
    
    // If we can't determine job domain, return neutral score
    if (jobDomainKeywords.length === 0) {
      return 50;
    }
    
    // Build candidate domain set
    const candidateDomainSet = new Set<string>();
    
    if (candidateDomains && Array.isArray(candidateDomains)) {
      candidateDomains.forEach((domain: any) => {
        const domainName = typeof domain === 'string' ? domain : domain.name || domain.domain || '';
        if (domainName) {
          candidateDomainSet.add(domainName.toLowerCase().trim());
        }
      });
    }
    
    // Also consider candidate roles for domain matching
    if (candidateRoles && Array.isArray(candidateRoles)) {
      candidateRoles.forEach((role: any) => {
        const roleName = typeof role === 'string' ? role : '';
        if (roleName) {
          candidateDomainSet.add(roleName.toLowerCase().trim());
        }
      });
    }
    
    if (candidateDomainSet.size === 0) {
      return 40; // No domain info = slightly penalized
    }
    
    // Calculate domain match
    let matchCount = 0;
    const candidateDomainText = Array.from(candidateDomainSet).join(' ');
    
    for (const keyword of jobDomainKeywords) {
      if (candidateDomainSet.has(keyword) || candidateDomainText.includes(keyword)) {
        matchCount++;
      }
    }
    
    const matchRatio = matchCount / jobDomainKeywords.length;
    
    if (matchRatio >= 0.5) return 100;  // Strong domain match
    if (matchRatio >= 0.25) return 75;  // Partial domain match
    if (matchCount > 0) return 60;      // At least some overlap
    return 30;                          // No domain match = low score
  }

  /**
   * Extract domain keywords from job info for matching
   */
  private extractDomainKeywords(jobTitle?: string, jobDepartment?: string, jobDescription?: string): string[] {
    const keywords = new Set<string>();
    const text = `${jobTitle || ''} ${jobDepartment || ''} ${(jobDescription || '').substring(0, 2000)}`.toLowerCase();
    
    // Technology domains
    const domainPatterns: Record<string, string[]> = {
      'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin', 'app development'],
      'web': ['web', 'frontend', 'front-end', 'front end', 'fullstack', 'full-stack', 'full stack', 'webapp', 'web app'],
      'backend': ['backend', 'back-end', 'back end', 'server-side', 'server side', 'api', 'microservices'],
      'devops': ['devops', 'infrastructure', 'cloud', 'aws', 'azure', 'gcp', 'sre', 'site reliability'],
      'data': ['data', 'analytics', 'data science', 'data engineer', 'big data', 'etl', 'data pipeline'],
      'ml': ['machine learning', 'deep learning', 'artificial intelligence', 'ai', 'nlp', 'computer vision'],
      'security': ['security', 'cybersecurity', 'infosec', 'penetration testing'],
      'fintech': ['fintech', 'financial', 'banking', 'payment', 'trading', 'finance'],
      'healthcare': ['healthcare', 'health tech', 'medical', 'pharma', 'clinical'],
      'ecommerce': ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'shopping'],
      'saas': ['saas', 'software as a service', 'cloud software', 'platform'],
      'gaming': ['gaming', 'game dev', 'game development', 'unity', 'unreal'],
      'embedded': ['embedded', 'iot', 'firmware', 'hardware', 'microcontroller'],
      'blockchain': ['blockchain', 'web3', 'crypto', 'defi', 'smart contract'],
    };
    
    for (const [domain, patterns] of Object.entries(domainPatterns)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          keywords.add(domain);
          break;
        }
      }
    }
    
    return Array.from(keywords);
  }

  private calculateLocationScore(
    locationSignals: any,
    locationWeight: number,
    candidateCountry?: string,
    jobCountry?: string,
    jobLocationType?: 'onsite' | 'hybrid' | 'remote'
  ): number {
    if (jobLocationType === 'remote') {
      return 100;
    }

    if (!candidateCountry || !jobCountry) {
      if (locationSignals?.willingToRelocate) {
        return 80;
      }
      return 50;
    }

    if (candidateCountry === jobCountry) {
      return 100;
    }

    if (locationSignals?.willingToRelocate) {
      if (locationSignals.preferredLocations && Array.isArray(locationSignals.preferredLocations)) {
        if (locationSignals.preferredLocations.includes(jobCountry)) {
          return 90;
        }
      }
      return 70;
    }

    if (jobLocationType === 'hybrid') {
      return 40;
    }
    
    return 20;
  }
}

export const matchingService = new MatchingService();
