import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzeCrawlability(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];

  // Meta robots
  const robotsMeta = $('meta[name="robots"]').attr('content') || '';
  if (robotsMeta.includes('noindex')) {
    findings.push({ title: 'Meta Robots', status: 'fail', description: 'Page is set to noindex', detail: `Meta robots: "${robotsMeta}". This page will NOT appear in search results.` });
  } else if (robotsMeta.includes('nofollow')) {
    findings.push({ title: 'Meta Robots', status: 'warn', description: 'Page has nofollow directive', detail: `Meta robots: "${robotsMeta}". Links on this page won't pass link equity.` });
  } else if (robotsMeta) {
    findings.push({ title: 'Meta Robots', status: 'pass', description: `Meta robots: "${robotsMeta}"` });
  } else {
    findings.push({ title: 'Meta Robots', status: 'pass', description: 'No restrictive meta robots directives' });
  }

  // X-Robots-Tag header
  const xRobots = input.headers['x-robots-tag'];
  if (xRobots) {
    if (xRobots.includes('noindex')) {
      findings.push({ title: 'X-Robots-Tag', status: 'fail', description: `X-Robots-Tag header contains noindex: "${xRobots}"`, detail: 'This HTTP header prevents indexation even without a meta tag.' });
    } else {
      findings.push({ title: 'X-Robots-Tag', status: 'pass', description: `X-Robots-Tag: "${xRobots}"` });
    }
  }

  // Language
  const lang = $('html').attr('lang');
  if (lang) {
    findings.push({ title: 'Language', status: 'pass', description: `Page language set to "${lang}"` });
  } else {
    findings.push({ title: 'Language', status: 'warn', description: 'No lang attribute on <html> tag', detail: 'Setting the language helps search engines serve your page to the right audience and aids accessibility.' });
  }

  // Charset
  const charset = $('meta[charset]').attr('charset') || $('meta[http-equiv="Content-Type"]').attr('content');
  if (charset) {
    findings.push({ title: 'Character Encoding', status: 'pass', description: `Character encoding declared: ${typeof charset === 'string' ? charset : 'set'}` });
  } else {
    findings.push({ title: 'Character Encoding', status: 'warn', description: 'No character encoding declared', detail: 'Add <meta charset="UTF-8"> to prevent rendering issues across browsers.' });
  }

  // Hreflang (for international sites)
  const hreflangs = $('link[rel="alternate"][hreflang]');
  if (hreflangs.length > 0) {
    const langs = hreflangs.map((_, el) => $(el).attr('hreflang')).get().join(', ');
    findings.push({ title: 'Hreflang Tags', status: 'pass', description: `${hreflangs.length} hreflang tag(s) found`, detail: `Languages: ${langs}` });
  }

  // Pagination (rel next/prev)
  const relNext = $('link[rel="next"]').length > 0;
  const relPrev = $('link[rel="prev"]').length > 0;
  if (relNext || relPrev) {
    findings.push({ title: 'Pagination', status: 'pass', description: 'Pagination links (rel next/prev) found', detail: 'Helps search engines understand paginated content sequences.' });
  }

  // Site architecture — check link depth from navigation
  const navLinks = $('nav a[href], header a[href]').length;
  const footerLinks = $('footer a[href]').length;
  if (navLinks > 0) {
    findings.push({ title: 'Navigation Links', status: 'pass', description: `${navLinks} links in navigation/header`, detail: `${footerLinks} links in footer. Good navigation helps crawlers and users discover content.` });
  } else {
    findings.push({ title: 'Navigation Links', status: 'warn', description: 'No navigation links detected', detail: 'A clear navigation structure helps search engines crawl and index your site effectively.' });
  }

  // Check for nofollow on internal links
  let nofollowInternal = 0;
  try {
    const baseHost = new URL(input.url).hostname;
    $('a[rel*="nofollow"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      try {
        const linkHost = new URL(href, input.url).hostname;
        if (linkHost === baseHost) nofollowInternal++;
      } catch {
        nofollowInternal++; // relative = internal
      }
    });
  } catch {
    // skip
  }
  if (nofollowInternal > 0) {
    findings.push({ title: 'Internal Nofollow', status: 'warn', description: `${nofollowInternal} internal links use nofollow`, detail: 'Nofollow on internal links wastes PageRank. Remove nofollow from internal links to allow link equity to flow.' });
  }

  return findings;
}

// Check robots.txt
export async function checkRobotsTxt(baseUrl: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  try {
    const url = new URL('/robots.txt', baseUrl).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const text = await res.text();
      const hasSitemap = text.toLowerCase().includes('sitemap');
      const hasDisallow = text.includes('Disallow');
      const blocksAll = /^Disallow:\s*\/\s*$/m.test(text);

      findings.push({
        title: 'robots.txt',
        status: 'pass',
        description: 'robots.txt is accessible',
        detail: [
          hasSitemap && 'Contains sitemap reference',
          hasDisallow && 'Has crawl directives',
        ].filter(Boolean).join('. ') + '.',
      });

      if (blocksAll) {
        findings.push({
          title: 'robots.txt Blocking',
          status: 'fail',
          description: 'robots.txt may be blocking all crawlers',
          detail: 'Found broad "Disallow: /" rule. This could prevent search engines from crawling your entire site.',
        });
      }

      if (!hasSitemap) {
        findings.push({
          title: 'Sitemap in robots.txt',
          status: 'warn',
          description: 'No sitemap reference in robots.txt',
          detail: 'Add "Sitemap: https://yourdomain.com/sitemap.xml" to help crawlers discover your sitemap.',
        });
      }
    } else {
      findings.push({ title: 'robots.txt', status: 'warn', description: `robots.txt returned ${res.status}`, detail: 'A robots.txt file helps control crawler access to your site.' });
    }
  } catch {
    findings.push({ title: 'robots.txt', status: 'warn', description: 'Could not fetch robots.txt' });
  }
  return findings;
}

// Check sitemap
export async function checkSitemap(baseUrl: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  try {
    const url = new URL('/sitemap.xml', baseUrl).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const text = await res.text();
      const urlCount = (text.match(/<url>/gi) || []).length;
      const sitemapIndex = text.includes('<sitemapindex');

      if (sitemapIndex) {
        const sitemapCount = (text.match(/<sitemap>/gi) || []).length;
        findings.push({
          title: 'Sitemap',
          status: 'pass',
          description: `Sitemap index found with ${sitemapCount} child sitemaps`,
          detail: 'Sitemap index is good for organizing large sites.',
        });
      } else if (urlCount > 0) {
        findings.push({
          title: 'Sitemap',
          status: 'pass',
          description: `sitemap.xml found with ${urlCount} URLs`,
        });

        if (urlCount > 50000) {
          findings.push({
            title: 'Sitemap Size',
            status: 'warn',
            description: `Sitemap has ${urlCount} URLs — exceeds 50,000 limit`,
            detail: 'Split into multiple sitemaps using a sitemap index. Max 50,000 URLs per file.',
          });
        }
      } else {
        findings.push({
          title: 'Sitemap',
          status: 'pass',
          description: 'sitemap.xml found',
        });
      }

      // Check for lastmod
      const hasLastmod = text.includes('<lastmod>');
      if (!hasLastmod && urlCount > 0) {
        findings.push({
          title: 'Sitemap Lastmod',
          status: 'warn',
          description: 'Sitemap URLs missing <lastmod> dates',
          detail: 'Adding lastmod helps search engines prioritize crawling recently updated pages.',
        });
      }
    } else {
      findings.push({
        title: 'Sitemap',
        status: 'warn',
        description: `sitemap.xml returned ${res.status}`,
        detail: 'An XML sitemap helps search engines discover all your indexable pages. Create and submit one.',
      });
    }
  } catch {
    findings.push({ title: 'Sitemap', status: 'warn', description: 'Could not fetch sitemap.xml' });
  }
  return findings;
}
