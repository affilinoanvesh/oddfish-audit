import { CategoryResult, Finding, CategoryName } from './types';

const WEIGHTS: Record<CategoryName, number> = {
  'Meta Tags': 12,
  'Content': 12,
  'Crawlability': 10,
  'Speed': 10,
  'Headings': 8,
  'Images': 5,
  'Links': 8,
  'Security': 6,
  'Mobile': 5,
  'Structured Data': 8,
  'Performance': 3,
  'Ecommerce': 8,
  'Keyword Rankings': 10,
  'Reputation': 5,
  'Google Business': 10,
};

function scoreFindingsToPercent(findings: Finding[]): number {
  if (findings.length === 0) return 100;
  const total = findings.reduce((sum, f) => {
    if (f.status === 'pass') return sum + 100;
    if (f.status === 'warn') return sum + 5; // Warnings are real issues — almost no credit
    return sum; // fail = 0
  }, 0);
  return Math.round(total / findings.length);
}

function percentToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function scoreCategory(name: CategoryName, findings: Finding[]): CategoryResult {
  const score = scoreFindingsToPercent(findings);
  return {
    name,
    score,
    grade: percentToGrade(score),
    findings,
  };
}

export function computeOverallScore(categories: CategoryResult[]): { score: number; grade: string } {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const cat of categories) {
    if (cat.findings.length === 0) continue;
    const weight = WEIGHTS[cat.name] || 5;
    weightedSum += cat.score * weight;
    totalWeight += weight;
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  return { score, grade: percentToGrade(score) };
}
