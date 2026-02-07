export type SavedProfile = {
  uid: string;
  source: 'match' | 'explorer';
  savedAt: string;
};

/** Backward-compatible parser: handles old string[] and new SavedProfile[] */
export function parseSavedProfiles(raw: unknown): SavedProfile[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') {
      // Legacy format — treat as explorer save
      return { uid: item, source: 'explorer' as const, savedAt: '' };
    }
    // New structured format
    return item as SavedProfile;
  });
}

/** Fast uid lookup set from SavedProfile[] */
export function savedProfileUids(profiles: SavedProfile[]): Set<string> {
  return new Set(profiles.map((p) => p.uid));
}

/** Toggle a profile in/out of the saved list, returns new array */
export function toggleSavedProfile(
  current: SavedProfile[],
  uid: string,
  source: 'match' | 'explorer',
): SavedProfile[] {
  const exists = current.some((p) => p.uid === uid);
  if (exists) {
    return current.filter((p) => p.uid !== uid);
  }
  return [...current, { uid, source, savedAt: new Date().toISOString() }];
}
