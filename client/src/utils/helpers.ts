// Seeded random number generator for consistent mock data
export function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

// Phone country code to country mapping
const countryCodeMap: Record<string, { country: string; code: string }> = {
  '+1': { country: 'United States', code: 'US' },
  '+44': { country: 'United Kingdom', code: 'GB' },
  '+49': { country: 'Germany', code: 'DE' },
  '+33': { country: 'France', code: 'FR' },
  '+91': { country: 'India', code: 'IN' },
  '+86': { country: 'China', code: 'CN' },
  '+81': { country: 'Japan', code: 'JP' },
  '+82': { country: 'South Korea', code: 'KR' },
  '+61': { country: 'Australia', code: 'AU' },
  '+55': { country: 'Brazil', code: 'BR' },
  '+52': { country: 'Mexico', code: 'MX' },
  '+34': { country: 'Spain', code: 'ES' },
  '+39': { country: 'Italy', code: 'IT' },
  '+31': { country: 'Netherlands', code: 'NL' },
  '+46': { country: 'Sweden', code: 'SE' },
  '+47': { country: 'Norway', code: 'NO' },
  '+48': { country: 'Poland', code: 'PL' },
  '+65': { country: 'Singapore', code: 'SG' },
  '+971': { country: 'UAE', code: 'AE' },
  '+966': { country: 'Saudi Arabia', code: 'SA' },
};

export function parsePhoneCountryCode(phone: string): { country: string; code: string } | null {
  for (const [prefix, info] of Object.entries(countryCodeMap)) {
    if (phone.startsWith(prefix)) {
      return info;
    }
  }
  return null;
}

export function getCountryFromCode(code: string): string {
  for (const [, info] of Object.entries(countryCodeMap)) {
    if (info.code === code) {
      return info.country;
    }
  }
  return code;
}

// Delay helper for simulating API latency
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Score color mapping
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-100 dark:bg-emerald-900/30';
  if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/30';
  if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/30';
  return 'bg-rose-100 dark:bg-rose-900/30';
}

// Status chip color mapping
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    uploaded: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    parsing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    matrix_ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    needs_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    closed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    shortlisted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };
  return colors[status] || colors.pending;
}

// Format date helper
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
