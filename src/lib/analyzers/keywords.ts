import { Finding } from '../types';
import { dataforseoPost, extractDomain } from '../dataforseo';

interface DomainRankResponse {
  tasks?: [{
    result?: [{
      items?: [{
        metrics?: {
          organic?: {
            count?: number;
            estimated_paid_traffic_cost?: number;
            pos_1?: number;
            pos_2_3?: number;
            pos_4_10?: number;
            pos_11_20?: number;
            pos_21_30?: number;
            pos_31_40?: number;
            pos_41_50?: number;
            pos_51_60?: number;
            pos_61_70?: number;
            pos_71_80?: number;
            pos_81_90?: number;
            pos_91_100?: number;
            etv?: number;
          };
        };
      }];
    }];
  }];
}

interface RankedKeywordsResponse {
  tasks?: [{
    result?: [{
      items?: {
        keyword_data?: {
          keyword?: string;
          keyword_info?: {
            search_volume?: number;
          };
        };
        ranked_serp_element?: {
          serp_item?: {
            rank_absolute?: number;
          };
        };
      }[];
    }];
  }];
}

export interface KeywordData {
  organicKeywords: number;
  estimatedTraffic: number;
  topKeywords: { keyword: string; position: number; volume: number }[];
}

export async function analyzeKeywords(url: string): Promise<{ findings: Finding[]; keywordData?: KeywordData }> {
  const domain = extractDomain(url);
  const findings: Finding[] = [];

  // Australia only
  const locationCode = 2036;

  // Get domain rank overview
  const rankData = await dataforseoPost<DomainRankResponse>(
    '/dataforseo_labs/google/domain_rank_overview/live',
    { target: domain, language_code: 'en', location_code: locationCode }
  );

  const organic = rankData?.tasks?.[0]?.result?.[0]?.items?.[0]?.metrics?.organic;
  const keywordCount = organic?.count ?? 0;
  const estimatedTraffic = organic?.etv ?? 0;

  if (!rankData || !organic) {
    findings.push({
      title: 'Keyword Data',
      status: 'warn',
      description: 'Could not retrieve keyword ranking data for this domain.',
    });
    return { findings };
  }

  // If organic data exists but shows zero keywords, this domain genuinely has no rankings
  if (keywordCount === 0 && estimatedTraffic === 0) {
    findings.push({
      title: 'Organic Visibility',
      status: 'fail',
      description: 'This domain has no tracked organic keyword rankings in Australia. Your site is essentially invisible in Google search results. You need a comprehensive SEO strategy including keyword research, content creation, and link building.',
    });
    return { findings };
  }

  // Keyword count finding
  if (keywordCount < 10) {
    findings.push({
      title: 'Organic Keywords',
      status: 'fail',
      description: `Your domain ranks for only ${keywordCount} organic keywords. Most competitive sites rank for 50+.`,
      detail: `${keywordCount} organic keywords detected`,
    });
  } else if (keywordCount < 50) {
    findings.push({
      title: 'Organic Keywords',
      status: 'warn',
      description: `Your domain ranks for ${keywordCount} organic keywords. Aim for 50+ to establish strong search presence.`,
      detail: `${keywordCount} organic keywords detected`,
    });
  } else {
    findings.push({
      title: 'Organic Keywords',
      status: 'pass',
      description: `Your domain ranks for ${keywordCount} organic keywords — solid keyword coverage.`,
      detail: `${keywordCount} organic keywords detected`,
    });
  }

  // Estimated traffic finding
  if (estimatedTraffic < 100) {
    findings.push({
      title: 'Estimated Organic Traffic',
      status: 'fail',
      description: `Estimated monthly organic traffic is only ${Math.round(estimatedTraffic)} visits.`,
    });
  } else if (estimatedTraffic < 1000) {
    findings.push({
      title: 'Estimated Organic Traffic',
      status: 'warn',
      description: `Estimated monthly organic traffic is ${Math.round(estimatedTraffic)} visits. There's room to grow.`,
    });
  } else {
    findings.push({
      title: 'Estimated Organic Traffic',
      status: 'pass',
      description: `Estimated monthly organic traffic is ${Math.round(estimatedTraffic).toLocaleString()} visits.`,
    });
  }

  // Position buckets
  const pos1 = organic?.pos_1 ?? 0;
  const pos2_3 = organic?.pos_2_3 ?? 0;
  const pos4_10 = organic?.pos_4_10 ?? 0;
  const pos11_20 = organic?.pos_11_20 ?? 0;
  const pos21_30 = organic?.pos_21_30 ?? 0;
  const topPositions = pos1 + pos2_3 + pos4_10;
  const notTop10 = keywordCount - topPositions;

  // Top 10 Rankings — relative to total keywords
  if (topPositions === 0) {
    findings.push({
      title: 'Top 10 Rankings',
      status: 'fail',
      description: 'No keywords ranking in the top 10 search results. All your rankings are buried on page 2 or beyond.',
    });
  } else if (notTop10 > topPositions) {
    const pct = Math.round((topPositions / keywordCount) * 100);
    findings.push({
      title: 'Top 10 Rankings',
      status: 'warn',
      description: `Only ${pct}% of your keywords (${topPositions} of ${keywordCount}) rank on page 1. The majority are on page 2 or beyond — significant untapped potential.`,
      detail: `${topPositions} in top 10, ${notTop10} outside top 10`,
    });
  } else {
    findings.push({
      title: 'Top 10 Rankings',
      status: 'pass',
      description: `${topPositions} keywords ranking in the top 10 search results.`,
    });
  }

  // Page 2 Opportunities (positions 11-20)
  if (pos11_20 > 0) {
    findings.push({
      title: 'Page 2 Keywords',
      status: 'warn',
      description: `${pos11_20} keywords are stuck on page 2 (positions 11-20) — just outside page 1. With targeted optimization, these could move to the first page where 95% of clicks happen.`,
      detail: `${pos11_20} keywords on page 2`,
    });
  }

  // Striking Distance (positions 4-10)
  if (pos4_10 > 0) {
    findings.push({
      title: 'Near Top 3 Positions',
      status: 'warn',
      description: `${pos4_10} keywords rank in positions 4-10. The top 3 results capture over 60% of all clicks — moving these up could dramatically increase your traffic.`,
      detail: `${pos4_10} keywords in positions 4-10`,
    });
  }

  // Deep opportunity keywords (positions 21-30)
  if (pos21_30 > 0) {
    findings.push({
      title: 'Page 3 Keywords',
      status: 'fail',
      description: `${pos21_30} keywords are buried on page 3 (positions 21-30). These keywords show Google recognises your relevance, but they drive almost zero traffic at this position.`,
      detail: `${pos21_30} keywords on page 3`,
    });
  }

  // Get keywords ranking 4-30 sorted by highest volume — these are the real opportunities
  const topKeywords: KeywordData['topKeywords'] = [];
  const rankedData = await dataforseoPost<RankedKeywordsResponse>(
    '/dataforseo_labs/google/ranked_keywords/live',
    {
      target: domain,
      language_code: 'en',
      location_code: locationCode,
      limit: 10,
      order_by: ['keyword_data.keyword_info.search_volume,desc'],
      filters: [
        'ranked_serp_element.serp_item.rank_absolute', '>=', 4,
        'and',
        'ranked_serp_element.serp_item.rank_absolute', '<=', 30,
      ],
    }
  );

  const items = rankedData?.tasks?.[0]?.result?.[0]?.items;
  if (items) {
    for (const item of items) {
      const keyword = item.keyword_data?.keyword;
      const position = item.ranked_serp_element?.serp_item?.rank_absolute;
      const volume = item.keyword_data?.keyword_info?.search_volume ?? 0;
      if (keyword && position) {
        topKeywords.push({ keyword, position, volume });
      }
    }
  }

  return {
    findings,
    keywordData: {
      organicKeywords: keywordCount,
      estimatedTraffic: Math.round(estimatedTraffic),
      topKeywords,
    },
  };
}
