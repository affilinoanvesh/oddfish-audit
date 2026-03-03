import { Finding } from '../types';

// GMB-specific checks have moved to gmb.ts.
// This analyzer is kept for any future non-GMB reputation checks (e.g., Trustpilot, BBB).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function analyzeReputation(url: string): Promise<Finding[]> {
  return [];
}
