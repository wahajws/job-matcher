/**
 * Generate a UUID v4 (random UUID)
 * Works in both browser and Node.js environments
 * Falls back to Math.random() if crypto.randomUUID() is not available
 */
export function generateUUID(): string {
  // Try crypto.randomUUID() first (available in modern browsers and Node.js 16.7+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fall through to fallback
    }
  }

  // Fallback: Generate UUID v4 using crypto.getRandomValues or Math.random
  const getRandomValues = (arr: Uint8Array) => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return crypto.getRandomValues(arr);
    }
    // Fallback to Math.random if crypto.getRandomValues is not available
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const bytes = getRandomValues(new Uint8Array(16));
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  // Convert to hex string
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Format as UUID
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
