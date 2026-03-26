export const SPECIALTIES = [
  'Orthopedics',
  'Chiropractic',
  'Pain Management',
  'Physical Therapy',
  'Neurology',
  'Radiology / Imaging',
  'Primary Care',
  'Dental',
  'Mental Health / Psychology',
  'Surgery',
] as const;

export const SPECIALTY_COLORS: Record<string, string> = {
  'Orthopedics': '#2563eb',
  'Chiropractic': '#059669',
  'Pain Management': '#dc2626',
  'Physical Therapy': '#7c3aed',
  'Neurology': '#0891b2',
  'Radiology / Imaging': '#ca8a04',
  'Primary Care': '#16a34a',
  'Dental': '#0d9488',
  'Mental Health / Psychology': '#9333ea',
  'Surgery': '#e11d48',
};

export function getSpecialtyColor(specialty: string | null | undefined): string {
  if (!specialty) return '#6b7280';
  for (const [key, color] of Object.entries(SPECIALTY_COLORS)) {
    if (specialty.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#6b7280';
}
