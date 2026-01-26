import type {
  Candidate,
  CandidateMatrix,
  Job,
  JobMatrix,
  MatchResult,
  AdminNote,
  DashboardStats,
  CvFile,
  CvStatus,
  JobStatus,
  LocationType,
  SeniorityLevel,
} from '@/types';
import { seededRandom } from '@/utils/helpers';

// Seed for consistent random data
const rng = seededRandom(42);

const skillsList = [
  'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Node.js',
  'Python', 'Django', 'FastAPI', 'Java', 'Spring Boot', 'Go',
  'Rust', 'C++', 'C#', '.NET', 'Ruby', 'Rails', 'PHP', 'Laravel',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
  'CI/CD', 'Jenkins', 'GitHub Actions', 'Machine Learning', 'TensorFlow',
  'PyTorch', 'Data Analysis', 'SQL', 'GraphQL', 'REST APIs',
  'Microservices', 'System Design', 'Agile', 'Scrum', 'Leadership',
];

const domains = [
  'FinTech', 'HealthTech', 'E-commerce', 'SaaS', 'EdTech',
  'Gaming', 'Enterprise', 'Startup', 'Consulting', 'Banking',
];

const countries = ['US', 'GB', 'DE', 'FR', 'IN', 'SG', 'AU', 'NL', 'SE', 'CA'];
const cities: Record<string, string[]> = {
  US: ['New York', 'San Francisco', 'Seattle', 'Austin', 'Boston'],
  GB: ['London', 'Manchester', 'Edinburgh', 'Cambridge', 'Bristol'],
  DE: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg', 'Stuttgart'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
  IN: ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune'],
  SG: ['Singapore'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  NL: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'],
  SE: ['Stockholm', 'Gothenburg', 'Malmo'],
  CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
};

const names = [
  'Sarah Chen', 'Michael Rodriguez', 'Emily Johnson', 'David Kim',
  'Jessica Williams', 'James Miller', 'Amanda Taylor', 'Christopher Brown',
  'Ashley Martinez', 'Matthew Anderson', 'Jennifer Thomas', 'Daniel Jackson',
  'Stephanie White', 'Andrew Harris', 'Nicole Thompson', 'Joshua Garcia',
  'Lauren Wilson', 'Ryan Moore', 'Megan Clark', 'Brandon Lewis',
];

const phoneCodes: Record<string, string> = {
  US: '+1', GB: '+44', DE: '+49', FR: '+33', IN: '+91',
  SG: '+65', AU: '+61', NL: '+31', SE: '+46', CA: '+1',
};

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(rng() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

// Generate mock candidates
export function generateCandidates(count: number = 20): Candidate[] {
  const candidates: Candidate[] = [];
  const statusOptions: CvStatus[] = ['uploaded', 'parsing', 'matrix_ready', 'failed', 'needs_review'];
  
  for (let i = 0; i < count; i++) {
    const country = randomFromArray(countries);
    const phoneCode = phoneCodes[country];
    const phoneNumber = `${phoneCode}${Math.floor(rng() * 9000000000 + 1000000000)}`;
    const name = names[i % names.length];
    const email = `${name.toLowerCase().replace(' ', '.')}${i}@example.com`;
    
    const status: CvStatus = rng() > 0.7 ? randomFromArray(statusOptions) : 'matrix_ready';
    
    const cvFile: CvFile = {
      id: `cv-${i + 1}`,
      candidateId: `cand-${i + 1}`,
      filename: `${name.replace(' ', '_')}_CV.pdf`,
      uploadedAt: new Date(Date.now() - Math.floor(rng() * 30 * 24 * 60 * 60 * 1000)),
      status,
      batchTag: rng() > 0.5 ? 'Jan 2026 Batch' : 'Dec 2025 Batch',
      fileSize: Math.floor(rng() * 500000 + 100000),
    };
    
    candidates.push({
      id: `cand-${i + 1}`,
      name,
      email,
      phone: phoneNumber,
      country: country,
      countryCode: country,
      headline: `Senior ${randomFromArray(['Software Engineer', 'Product Manager', 'Data Scientist', 'DevOps Engineer', 'Full Stack Developer'])}`,
      cvFile,
      createdAt: cvFile.uploadedAt,
      tags: randomSubset(['Top Talent', 'Urgent', 'Referral', 'Passive', 'Active'], 0, 2),
      matrix: status === 'matrix_ready' ? generateCandidateMatrix(`cand-${i + 1}`) : undefined,
    });
  }
  
  return candidates;
}

export function generateCandidateMatrix(candidateId: string): CandidateMatrix {
  const selectedSkills = randomSubset(skillsList, 5, 12);
  type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
  const levels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
  
  return {
    id: `matrix-${candidateId}`,
    candidateId,
    skills: selectedSkills.map(skill => ({
      name: skill,
      level: randomFromArray(levels),
      yearsOfExperience: Math.floor(rng() * 8 + 1),
    })),
    roles: randomSubset(['Software Engineer', 'Tech Lead', 'Architect', 'Manager', 'Individual Contributor'], 1, 3),
    totalYearsExperience: Math.floor(rng() * 15 + 2),
    domains: randomSubset(domains, 1, 3),
    education: [{
      degree: randomFromArray(['BSc Computer Science', 'MSc Software Engineering', 'PhD Machine Learning', 'BSc Information Technology', 'MBA']),
      institution: randomFromArray(['MIT', 'Stanford', 'Cambridge', 'ETH Zurich', 'NUS', 'IIT']),
      year: 2010 + Math.floor(rng() * 14),
    }],
    languages: [
      { language: 'English', proficiency: 'Native' },
      ...randomSubset([
        { language: 'Spanish', proficiency: 'Fluent' },
        { language: 'German', proficiency: 'Intermediate' },
        { language: 'French', proficiency: 'Basic' },
        { language: 'Mandarin', proficiency: 'Fluent' },
      ], 0, 2),
    ],
    locationSignals: {
      currentCountry: randomFromArray(countries),
      willingToRelocate: rng() > 0.5,
      preferredLocations: randomSubset(countries, 1, 3),
    },
    confidence: Math.floor(rng() * 20 + 80),
    evidence: [
      {
        id: 'ev-1',
        text: 'Led a team of 5 engineers to deliver a microservices architecture...',
        category: 'Leadership',
        source: 'Work Experience',
      },
      {
        id: 'ev-2',
        text: 'Implemented CI/CD pipelines reducing deployment time by 70%...',
        category: 'Technical',
        source: 'Work Experience',
      },
      {
        id: 'ev-3',
        text: 'Published research paper on distributed systems optimization...',
        category: 'Research',
        source: 'Publications',
      },
    ],
    generatedAt: new Date(),
  };
}

// Generate mock jobs
export function generateJobs(count: number = 10): Job[] {
  const jobs: Job[] = [];
  const titles = [
    'Senior Frontend Engineer', 'Backend Developer', 'Full Stack Engineer',
    'DevOps Engineer', 'Data Engineer', 'Machine Learning Engineer',
    'Platform Engineer', 'Site Reliability Engineer', 'Software Architect',
    'Engineering Manager',
  ];
  const departments = ['Engineering', 'Product', 'Data Science', 'Infrastructure', 'Platform'];
  const locationTypes: LocationType[] = ['onsite', 'hybrid', 'remote'];
  const seniorityLevels: SeniorityLevel[] = ['junior', 'mid', 'senior', 'lead', 'principal'];
  const statusOptions: JobStatus[] = ['draft', 'published', 'closed'];
  
  for (let i = 0; i < count; i++) {
    const country = randomFromArray(countries);
    const city = randomFromArray(cities[country] || ['Unknown']);
    const status: JobStatus = rng() > 0.3 ? 'published' : randomFromArray(statusOptions);
    
    const job: Job = {
      id: `job-${i + 1}`,
      title: titles[i % titles.length],
      department: randomFromArray(departments),
      locationType: randomFromArray(locationTypes),
      country,
      city,
      description: `We are looking for an experienced ${titles[i % titles.length]} to join our ${randomFromArray(departments)} team. You will work on cutting-edge technology and help build products that impact millions of users worldwide.

Key Responsibilities:
- Design and implement scalable solutions
- Collaborate with cross-functional teams
- Mentor junior team members
- Participate in code reviews and architectural decisions

Requirements:
- Strong programming fundamentals
- Experience with modern development practices
- Excellent communication skills`,
      mustHaveSkills: randomSubset(skillsList, 3, 5),
      niceToHaveSkills: randomSubset(skillsList, 2, 4),
      minYearsExperience: Math.floor(rng() * 5 + 2),
      seniorityLevel: randomFromArray(seniorityLevels),
      status,
      createdAt: new Date(Date.now() - Math.floor(rng() * 60 * 24 * 60 * 60 * 1000)),
      matrix: status === 'published' ? generateJobMatrix(`job-${i + 1}`) : undefined,
    };
    
    jobs.push(job);
  }
  
  return jobs;
}

export function generateJobMatrix(jobId: string): JobMatrix {
  const selectedSkills = randomSubset(skillsList, 4, 8);
  
  return {
    id: `jmatrix-${jobId}`,
    jobId,
    requiredSkills: selectedSkills.slice(0, Math.floor(selectedSkills.length / 2)).map(skill => ({
      skill,
      weight: Math.floor(rng() * 30 + 70),
    })),
    preferredSkills: selectedSkills.slice(Math.floor(selectedSkills.length / 2)).map(skill => ({
      skill,
      weight: Math.floor(rng() * 40 + 30),
    })),
    experienceWeight: Math.floor(rng() * 20 + 15),
    locationWeight: Math.floor(rng() * 15 + 10),
    domainWeight: Math.floor(rng() * 15 + 10),
    generatedAt: new Date(),
  };
}

// Generate match results
export function generateMatches(candidates: Candidate[], jobs: Job[]): MatchResult[] {
  const matches: MatchResult[] = [];
  type MatchStatus = 'pending' | 'shortlisted' | 'rejected';
  const matchStatusOptions: MatchStatus[] = ['pending', 'shortlisted', 'rejected'];
  
  for (const job of jobs.filter(j => j.status === 'published')) {
    for (const candidate of candidates.filter(c => c.cvFile?.status === 'matrix_ready')) {
      const score = Math.floor(rng() * 60 + 40);
      
      matches.push({
        id: `match-${job.id}-${candidate.id}`,
        candidateId: candidate.id,
        jobId: job.id,
        score,
        breakdown: {
          skills: Math.floor(rng() * 40 + 60),
          experience: Math.floor(rng() * 40 + 60),
          domain: Math.floor(rng() * 40 + 60),
          location: Math.floor(rng() * 40 + 60),
        },
        explanation: `The candidate demonstrates strong alignment with the ${job.title} role. Their experience in ${randomSubset(job.mustHaveSkills, 1, 2).join(' and ')} matches well with the job requirements. Overall compatibility score indicates a ${score >= 70 ? 'strong' : score >= 50 ? 'moderate' : 'partial'} match.`,
        gaps: score < 80 ? [
          {
            type: 'skill',
            description: `Missing experience with ${randomFromArray(job.mustHaveSkills)}`,
            severity: rng() > 0.5 ? 'minor' : 'moderate',
          },
        ] : [],
        status: rng() > 0.7 ? randomFromArray(matchStatusOptions) : 'pending',
        calculatedAt: new Date(),
      });
    }
  }
  
  return matches;
}

// Generate admin notes
export function generateNotes(candidateId: string): AdminNote[] {
  const noteTexts = [
    'Excellent communication skills observed during initial screening.',
    'Strong technical background, consider for senior positions.',
    'Salary expectations may be above budget - need discussion.',
    'References verified and positive feedback received.',
    'Schedule follow-up interview with engineering team.',
  ];
  
  return randomSubset(noteTexts, 1, 3).map((text, i) => ({
    id: `note-${candidateId}-${i}`,
    candidateId,
    authorId: 'admin-1',
    authorName: 'Admin User',
    content: text,
    createdAt: new Date(Date.now() - Math.floor(rng() * 7 * 24 * 60 * 60 * 1000)),
  }));
}

// Dashboard stats
export function getDashboardStats(): DashboardStats {
  return {
    totalCvs: 156,
    processedCvs: 142,
    needsReviewCvs: 8,
    totalJobs: 24,
    matchesGenerated: 1847,
  };
}

// Initialize mock data
export const mockCandidates = generateCandidates(20);
export const mockJobs = generateJobs(10);
export const mockMatches = generateMatches(mockCandidates, mockJobs);
