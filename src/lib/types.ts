export type FindingStatus = 'pass' | 'warn' | 'fail';

export interface Finding {
  title: string;
  status: FindingStatus;
  description: string;
  detail?: string;
}

export type CategoryName =
  | 'Meta Tags'
  | 'Headings'
  | 'Images'
  | 'Links'
  | 'Security'
  | 'Mobile'
  | 'Structured Data'
  | 'Performance'
  | 'Content'
  | 'Crawlability'
  | 'Speed'
  | 'Ecommerce'
  | 'Keyword Rankings'
  | 'Reputation'
  | 'Google Business';

export type ReportSection =
  | 'Technical SEO'
  | 'On-Page SEO'
  | 'Links & Authority'
  | 'Mobile & UX'
  | 'Ecommerce'
  | 'Search Performance'
  | 'Local SEO';

export const SECTION_CATEGORIES: Record<ReportSection, CategoryName[]> = {
  'Technical SEO': ['Crawlability', 'Security', 'Speed'],
  'On-Page SEO': ['Meta Tags', 'Headings', 'Content'],
  'Links & Authority': ['Links', 'Structured Data'],
  'Mobile & UX': ['Mobile', 'Images', 'Performance'],
  'Ecommerce': ['Ecommerce'],
  'Search Performance': ['Keyword Rankings', 'Reputation'],
  'Local SEO': ['Google Business'],
};

export interface CategoryResult {
  name: CategoryName;
  score: number;
  grade: string;
  findings: Finding[];
}

export type SiteType = 'ecommerce' | 'blog' | 'saas' | 'corporate' | 'unknown';

export interface AuditReport {
  id: string;
  url: string;
  name: string;
  email: string;
  company?: string;
  createdAt: string;
  overallScore: number;
  overallGrade: string;
  siteType: SiteType;
  categories: CategoryResult[];
  fetchTimeMs: number;
  htmlSize: number;
  aiSummary?: string;
  keywordData?: {
    organicKeywords: number;
    estimatedTraffic: number;
    topKeywords: { keyword: string; position: number; volume: number }[];
  };
  gmbData?: GMBData;
}

export interface GMBData {
  businessName: string;
  rating: number;
  reviewCount: number;
  address: string;
  phone?: string;
  category: string;
  totalPhotos: number;
  isClaimed: boolean;
  placeId?: string;
}

export interface LeadFormData {
  name: string;
  email: string;
  website: string;
  company?: string;
  businessName?: string;
  businessLocation?: string;
}

export interface AnalyzerInput {
  html: string;
  url: string;
  fetchTimeMs: number;
  htmlSize: number;
  headers: Record<string, string>;
}
