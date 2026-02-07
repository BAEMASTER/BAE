export type StructuredInterest = {
  name: string;
  source: 'profile' | 'match' | 'explorer';
  from?: string; // uid of user it came from
  addedAt: string; // ISO timestamp
};

/** Backward-compatible parser: handles old string[] and new StructuredInterest[] */
export function parseInterests(raw: unknown): StructuredInterest[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      return { name: item, source: 'profile' as const, addedAt: '' };
    }
    return item as StructuredInterest;
  });
}

/** Extract plain string[] of names — bridge for all display code */
export function interestNames(interests: StructuredInterest[]): string[] {
  return interests.map((i) => i.name);
}

/** Build a new StructuredInterest with current timestamp */
export function createInterest(
  name: string,
  source: 'profile' | 'match' | 'explorer',
  from?: string,
): StructuredInterest {
  return { name, source, from, addedAt: new Date().toISOString() };
}

/** Add interests, deduplicating by name (case-insensitive) */
export function addInterests(
  current: StructuredInterest[],
  toAdd: StructuredInterest[],
): StructuredInterest[] {
  const existing = new Set(current.map((i) => i.name.toLowerCase()));
  const unique = toAdd.filter((i) => !existing.has(i.name.toLowerCase()));
  return [...current, ...unique];
}

/** Remove an interest by name (case-insensitive) */
export function removeInterest(
  current: StructuredInterest[],
  name: string,
): StructuredInterest[] {
  const lower = name.toLowerCase();
  return current.filter((i) => i.name.toLowerCase() !== lower);
}

/** Check if an interest exists by name (case-insensitive) */
export function hasInterest(interests: StructuredInterest[], name: string): boolean {
  const lower = name.toLowerCase();
  return interests.some((i) => i.name.toLowerCase() === lower);
}

/** Get the most recently added interest (by addedAt timestamp) */
export function mostRecentInterest(interests: StructuredInterest[]): StructuredInterest | null {
  if (interests.length === 0) return null;
  return interests.reduce((latest, i) => {
    if (!latest.addedAt) return i;
    if (!i.addedAt) return latest;
    return i.addedAt > latest.addedAt ? i : latest;
  });
}

/** Count interests from a specific source */
export function countBySource(
  interests: StructuredInterest[],
  source: 'profile' | 'match' | 'explorer',
): number {
  return interests.filter((i) => i.source === source).length;
}
