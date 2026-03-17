export interface ColossusFactors {
  injury_severity?: string | null;
  imaging_performed?: boolean | null;
  surgery_performed?: boolean | null;
  permanent_impairment?: boolean | null;
  impairment_rating_percent?: number | null;
  lost_wages_claimed?: boolean | null;
  pre_existing_conditions?: boolean | null;
  liability_strength?: string | null;
  treatment_duration_days?: number | null;
}

export function calculateColossusScore(f: ColossusFactors): number {
  let score = 30;
  const sev = f.injury_severity || 'Minor';
  if (sev === 'Moderate') score += 10;
  else if (sev === 'Serious') score += 20;
  else if (sev === 'Severe') score += 30;
  else if (sev === 'Catastrophic') score += 40;

  if (f.imaging_performed) score += 8;
  if (f.surgery_performed) score += 15;
  if (f.permanent_impairment) {
    score += 12;
    score += Math.floor((f.impairment_rating_percent || 0) / 4);
  }
  if (f.lost_wages_claimed) score += 8;
  if (f.pre_existing_conditions) score -= 5;

  if (f.liability_strength === 'Clear') score += 10;
  else if (f.liability_strength === 'Weak') score -= 10;

  const days = f.treatment_duration_days || 0;
  score += Math.min(Math.floor(days / 30), 15);

  return Math.max(0, Math.min(100, score));
}

export function colossusRange(specials: number, score: number, policyLimit?: number | null) {
  const factor = score / 100 + 0.5;
  let low = specials * 1.5 * factor;
  let high = specials * 4 * factor;
  if (policyLimit && policyLimit > 0) {
    low = Math.min(low, policyLimit);
    high = Math.min(high, policyLimit);
  }
  return { low: Math.round(low), high: Math.round(high) };
}
