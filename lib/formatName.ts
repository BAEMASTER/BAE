/** Format a display name for public-facing contexts: "First L." */
export function formatPublicName(displayName: string | undefined | null): string {
  if (!displayName) return 'Anonymous';
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}
