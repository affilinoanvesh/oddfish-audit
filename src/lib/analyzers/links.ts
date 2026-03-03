import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzeLinks(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];
  const links = $('a[href]');
  const total = links.length;

  if (total === 0) {
    findings.push({ title: 'Links', status: 'fail', description: 'No links found on the page', detail: 'Links are essential for SEO — both internal linking and outbound links signal relevance and authority to Google.' });
    return findings;
  }

  let internal = 0;
  let external = 0;
  let nofollowCount = 0;
  let hashOnly = 0;
  const uniqueInternalPaths = new Set<string>();
  const uniqueExternalDomains = new Set<string>();
  let emptyAnchorCount = 0;
  let genericAnchorCount = 0;
  let longAnchorCount = 0; // eslint-disable-line @typescript-eslint/no-unused-vars

  const baseHost = new URL(input.url).hostname;
  const genericAnchors = ['click here', 'read more', 'learn more', 'here', 'link', 'this', 'more', 'go', 'visit', 'see more', 'view', 'details'];

  links.each((_, el) => {
    const href = $(el).attr('href') || '';
    const rel = $(el).attr('rel') || '';
    const text = $(el).text().trim().toLowerCase();

    if (!href || href === '#') { hashOnly++; return; }
    if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    if (!text && !$(el).find('img').length) emptyAnchorCount++;
    else if (genericAnchors.includes(text)) genericAnchorCount++;
    if (text && text.length > 80) longAnchorCount++;

    try {
      const resolved = new URL(href, input.url);
      if (resolved.hostname === baseHost) {
        internal++;
        uniqueInternalPaths.add(resolved.pathname);
      } else {
        external++;
        uniqueExternalDomains.add(resolved.hostname);
      }
    } catch {
      internal++;
    }

    if (rel.includes('nofollow')) nofollowCount++;
  });

  // --- Internal links: very strict ---
  if (internal === 0) {
    findings.push({ title: 'Internal Links', status: 'fail', description: 'No internal links found', detail: 'Internal links are critical for distributing link equity and helping search engines crawl your site. You need a strong internal linking strategy to rank.' });
  } else if (uniqueInternalPaths.size < 5) {
    findings.push({ title: 'Internal Links', status: 'warn', description: `Only ${uniqueInternalPaths.size} unique internal pages linked`, detail: `Found ${internal} internal links but they point to very few pages. Top-ranking pages typically link to 10+ unique internal pages. You need more contextual internal links to key pages.` });
  } else if (uniqueInternalPaths.size < 10) {
    findings.push({ title: 'Internal Links', status: 'warn', description: `${uniqueInternalPaths.size} unique internal pages linked — below average`, detail: 'Competitive sites link to 15-20+ unique internal pages from their key pages. Add more contextual links in your content to boost crawlability and distribute authority.' });
  } else {
    findings.push({ title: 'Internal Links', status: 'pass', description: `${internal} internal links to ${uniqueInternalPaths.size} unique pages` });
  }

  // --- External links: you always need more authority ---
  if (external === 0) {
    findings.push({ title: 'External Links', status: 'warn', description: 'No outbound links to authoritative sources', detail: 'Linking to relevant, high-authority external sources signals expertise to Google. Add 2-3 outbound links to trusted sources per page.' });
  } else if (uniqueExternalDomains.size < 2) {
    findings.push({ title: 'External Links', status: 'warn', description: `Only linking to ${uniqueExternalDomains.size} external domain`, detail: 'Diversify outbound links to multiple authoritative sources. This demonstrates broader topic expertise and builds trust signals.' });
  } else {
    findings.push({ title: 'External Links', status: 'pass', description: `${external} external links to ${uniqueExternalDomains.size} domains` });
  }

  // --- Link volume: harsh - you always need more links to rank ---
  findings.push({
    title: 'Link Building Opportunity',
    status: 'warn',
    description: `${total} total links found — backlink acquisition is critical for ranking`,
    detail: 'On-page links alone are not enough. To rank competitively you need an active link building strategy — guest posts, digital PR, citations, and partnership links. Even sites with good on-page SEO struggle without quality backlinks.',
  });

  // --- Internal to external ratio ---
  if (internal > 0 && external > 0) {
    const ratio = internal / external;
    if (ratio < 1) {
      findings.push({ title: 'Link Ratio', status: 'fail', description: `More external (${external}) than internal (${internal}) links — leaking authority`, detail: 'Your page sends more authority out than it keeps. This is a significant SEO issue. Aim for at least a 3:1 internal-to-external ratio.' });
    } else if (ratio < 3) {
      findings.push({ title: 'Link Ratio', status: 'warn', description: `${ratio.toFixed(1)}:1 internal/external ratio — could be stronger`, detail: 'Best practice is 3:1 or higher. More internal links keep authority circulating within your site and improve crawl depth.' });
    } else {
      findings.push({ title: 'Link Ratio', status: 'pass', description: `${ratio.toFixed(1)}:1 internal/external ratio` });
    }
  }

  // --- Empty/placeholder links ---
  if (hashOnly > 0) {
    findings.push({ title: 'Empty Links', status: 'fail', description: `${hashOnly} broken/placeholder links with empty or "#" href`, detail: 'These waste crawl budget, confuse users, and pass no SEO value. Replace with real URLs or use buttons.' });
  }

  // --- Anchor text quality ---
  if (emptyAnchorCount > 2) {
    findings.push({ title: 'Missing Anchor Text', status: 'fail', description: `${emptyAnchorCount} links have no descriptive anchor text`, detail: 'Anchor text is a top ranking signal for linked pages. Every link should have descriptive text telling Google what the target page is about.' });
  } else if (emptyAnchorCount > 0) {
    findings.push({ title: 'Missing Anchor Text', status: 'warn', description: `${emptyAnchorCount} link(s) missing anchor text`, detail: 'Use keyword-rich, descriptive anchor text on all links to maximise SEO value.' });
  }

  if (genericAnchorCount > 1) {
    findings.push({ title: 'Generic Anchor Text', status: 'warn', description: `${genericAnchorCount} links use generic text like "click here" or "read more"`, detail: 'Generic anchors waste a powerful ranking signal. Use descriptive text: instead of "click here", use "view our SEO services" or "read the case study".' });
  }

  // --- Nofollow assessment ---
  if (nofollowCount > 0) {
    const nofollowRatio = nofollowCount / total;
    if (nofollowRatio > 0.3) {
      findings.push({ title: 'Nofollow Overuse', status: 'warn', description: `${Math.round(nofollowRatio * 100)}% of links are nofollow (${nofollowCount}/${total})`, detail: 'Excessive nofollow blocks PageRank flow within your site. Only use nofollow for sponsored or user-generated content.' });
    }
  }

  // --- Navigation ---
  const navLinks = $('nav a[href]').length;
  if (navLinks === 0) {
    findings.push({ title: 'Navigation Structure', status: 'warn', description: 'No semantic <nav> element with links found', detail: 'Wrap your main navigation in a <nav> element. This helps Google identify your site structure and key pages.' });
  }

  // --- Footer links ---
  const footerLinks = $('footer a[href]').length;
  if (footerLinks === 0) {
    findings.push({ title: 'Footer Links', status: 'warn', description: 'No links found in the page footer', detail: 'Footer links to key pages (about, contact, services, privacy) improve crawlability and internal link distribution.' });
  }

  return findings;
}
