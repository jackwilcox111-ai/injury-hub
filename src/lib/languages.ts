export const LANGUAGES = [
  'English',
  'Spanish',
  'Portuguese',
  'Mandarin',
  'Cantonese',
  'Vietnamese',
  'Korean',
  'Tagalog',
  'Arabic',
  'Russian',
  'Haitian Creole',
  'French',
] as const;

export type Language = (typeof LANGUAGES)[number];
