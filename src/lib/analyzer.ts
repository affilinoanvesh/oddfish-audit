import { AuditReport, AnalyzerInput, CategoryName, Finding } from './types';
import { scoreCategory, computeOverallScore } from './scoring';
import { analyzeMetaTags } from './analyzers/meta-tags';
import { analyzeHeadings } from './analyzers/headings';
import { analyzeImages } from './analyzers/images';
import { analyzeLinks } from './analyzers/links';
import { analyzeSecurity } from './analyzers/security';
import { analyzeMobile } from './analyzers/mobile';
import { analyzeStructuredData } from './analyzers/structured-data';
import { analyzePerformance } from './analyzers/performance';
import { analyzeSpeed } from './analyzers/speed';
import { analyzeContent } from './analyzers/content';
import { analyzeCrawlability, checkRobotsTxt, checkSitemap } from './analyzers/crawlability';
import { analyzeEcommerce } from './analyzers/ecommerce';
import { detectSiteType } from './analyzers/site-type';
import { isDataForSeoConfigured } from './dataforseo';
import { analyzeKeywords } from './analyzers/keywords';
import { analyzeReputation } from './analyzers/reputation';
import { analyzeGMB } from './analyzers/gmb';
import { generateAiSummary } from './ai-summary';
import { nanoid } from 'nanoid';

export async function runAudit(params: {
  url: string;
  name: string;
  email: string;
  company?: string;
  businessName?: string;
  businessLocation?: string;
}): Promise<AuditReport> {
  const { url, name, email, company, businessName, businessLocation } = params;

  // Fetch the page
  const start = Date.now();
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const fetchTimeMs = Date.now() - start;
  const htmlSize = new TextEncoder().encode(html).length;

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const input: AnalyzerInput = { html, url, fetchTimeMs, htmlSize, headers };

  // Detect site type first so we can pass it to analyzers
  const siteType = detectSiteType(input);

  // Run all Cheerio-based analyzers in parallel
  const [
    metaFindings,
    headingFindings,
    imageFindings,
    linkFindings,
    securityFindings,
    mobileFindings,
    structuredDataFindings,
    performanceFindings,
    speedFindings,
    contentFindings,
    crawlFindings,
    ecommerceFindings,
    robotsFindings,
    sitemapFindings,
  ] = await Promise.all([
    Promise.resolve(analyzeMetaTags(input)),
    Promise.resolve(analyzeHeadings(input)),
    Promise.resolve(analyzeImages(input)),
    Promise.resolve(analyzeLinks(input)),
    Promise.resolve(analyzeSecurity(input)),
    Promise.resolve(analyzeMobile(input)),
    Promise.resolve(analyzeStructuredData(input, siteType)),
    Promise.resolve(analyzePerformance(input)),
    Promise.resolve(analyzeSpeed(input)),
    Promise.resolve(analyzeContent(input)),
    Promise.resolve(analyzeCrawlability(input)),
    Promise.resolve(analyzeEcommerce(input, siteType)),
    checkRobotsTxt(url),
    checkSitemap(url),
  ]);

  // Merge robots.txt and sitemap findings into crawlability
  crawlFindings.push(...robotsFindings, ...sitemapFindings);

  // Run DataForSEO analyzers in parallel (if configured)
  let keywordFindings: Finding[] = [];
  let reputationFindings: Finding[] = [];
  let gmbFindings: Finding[] = [];
  let keywordData: AuditReport['keywordData'];
  let gmbData: AuditReport['gmbData'];

  if (isDataForSeoConfigured()) {
    const [keywordResult, repResult, gmbResult] = await Promise.all([
      analyzeKeywords(url),
      analyzeReputation(url),
      analyzeGMB(url, businessName, businessLocation),
    ]);

    keywordFindings = keywordResult.findings;
    keywordData = keywordResult.keywordData;
    reputationFindings = repResult;
    gmbFindings = gmbResult.findings;
    gmbData = gmbResult.gmbData;
  }

  const analyzers: [CategoryName, Finding[]][] = [
    ['Meta Tags', metaFindings],
    ['Headings', headingFindings],
    ['Images', imageFindings],
    ['Links', linkFindings],
    ['Security', securityFindings],
    ['Mobile', mobileFindings],
    ['Structured Data', structuredDataFindings],
    ['Performance', performanceFindings],
    ['Speed', speedFindings],
    ['Content', contentFindings],
    ['Crawlability', crawlFindings],
    ['Ecommerce', ecommerceFindings],
    ['Keyword Rankings', keywordFindings],
    ['Reputation', reputationFindings],
    ['Google Business', gmbFindings],
  ];

  // Only include categories that have findings
  const categories = analyzers
    .filter(([, findings]) => findings.length > 0)
    .map(([catName, findings]) => scoreCategory(catName, findings));

  const { score: overallScore, grade: overallGrade } = computeOverallScore(categories);

  const report: AuditReport = {
    id: nanoid(12),
    url,
    name,
    email,
    company,
    createdAt: new Date().toISOString(),
    overallScore,
    overallGrade,
    siteType,
    categories,
    fetchTimeMs,
    htmlSize,
    keywordData,
    gmbData,
  };

  // Generate AI summary after all analyzers finish
  const aiSummary = await generateAiSummary(report);
  if (aiSummary) {
    report.aiSummary = aiSummary;
  }

  return report;
}
