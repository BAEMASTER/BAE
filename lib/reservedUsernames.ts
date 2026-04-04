// Reserved names that cannot be claimed as usernames
// Includes all existing routes and common reserved strings
export const RESERVED_USERNAMES = new Set([
  // Existing app routes
  'auth', 'profile', 'match', 'explorer', 'how-bae-works',
  'terms', 'privacy', 'guidelines', 'hello', 'call',
  // API and system
  'api', 'admin', 'settings', 'devcheck',
  // Common reserved
  'about', 'help', 'support', 'home', 'login', 'signup',
  'register', 'bae', 'app', 'www', 'blog', 'status',
  'contact', 'feedback', 'invite', 'join', 'download',
  'search', 'explore', 'discover', 'talk', 'trending', 'popular',
  // Future routes
  'notifications', 'messages', 'friends', 'connections',
  'serendipity', 'open', 'live', 'stream',
]);

// Username validation: 3-30 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphens
export const USERNAME_REGEX = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const lower = username.toLowerCase();

  if (lower.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  if (lower.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' };
  }
  if (!USERNAME_REGEX.test(lower)) {
    return { valid: false, error: 'No spaces or periods — just letters, numbers, or hyphens' };
  }
  if (RESERVED_USERNAMES.has(lower)) {
    return { valid: false, error: 'This username is reserved' };
  }
  return { valid: true };
}
