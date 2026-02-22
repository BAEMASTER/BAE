/**
 * Basic content moderation for user-submitted interests.
 * Word-boundary regex check against a blocklist of terms.
 */

const BLOCKED_WORDS: string[] = [
  // Drugs / substances
  'meth', 'heroin', 'cocaine', 'crack', 'fentanyl', 'molly', 'ecstasy',
  'ketamine', 'lsd', 'dmt', 'pcp', 'xanax',
  'oxy', 'oxycontin', 'percocet', 'adderall', 'codeine', 'lean',
  'opium', 'morphine', 'bath salts', 'mephedrone', 'ghb',

  // Slurs (abbreviated / common forms)
  'nigger', 'nigga', 'faggot', 'fag', 'dyke', 'tranny', 'retard',
  'retarded', 'spic', 'kike', 'chink', 'gook', 'wetback', 'beaner',
  'coon', 'jigaboo', 'raghead', 'towelhead', 'paki',

  // Explicit / sexual
  'porn', 'pornhub', 'xvideos', 'hentai', 'onlyfans', 'blowjob',
  'handjob', 'cumshot', 'creampie', 'deepthroat', 'gangbang',
  'orgy', 'milf', 'dildo', 'fleshlight', 'camgirl', 'escort',
  'hooker', 'prostitute', 'brothel',

  // Hate / violence
  'nazi', 'white power', 'white supremacy', 'kkk', 'ku klux',
  'genocide', 'ethnic cleansing', 'jihad', 'terrorist', 'terrorism',
  'school shooting', 'mass shooting', 'kill all', 'gas the',
  'heil hitler', 'sieg heil', 'race war', 'incel',

  // Pedophilia / child exploitation
  'pedophile', 'pedophilia', 'pedo', 'child porn', 'cp', 'map pride',
  'minor attracted', 'lolicon', 'shotacon', 'grooming',

  // Self-harm
  'suicide', 'self harm', 'cutting myself', 'kill myself',
];

// Pre-compile patterns for performance
const BLOCKED_PATTERNS = BLOCKED_WORDS.map(
  (word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
);

export function isBlockedInterest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}
