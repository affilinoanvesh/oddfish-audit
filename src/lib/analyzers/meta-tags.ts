import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzeMetaTags(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];

  // Title tag — stricter
  const title = $('title').text().trim();
  if (!title) {
    findings.push({ title: 'Title Tag', status: 'fail', description: 'No title tag found', detail: 'The title tag is the #1 on-page ranking factor. Without it, Google will auto-generate a title that likely won\'t target your keywords.' });
  } else if (title.length < 20) {
    findings.push({ title: 'Title Tag', status: 'fail', description: `Title is far too short (${title.length} chars)`, detail: `"${title}" — You are wasting the most valuable SEO real estate. Write a compelling 50-60 character title with your primary keyword near the front.` });
  } else if (title.length < 40) {
    findings.push({ title: 'Title Tag', status: 'warn', description: `Title is short (${title.length} chars) — wasting SERP space`, detail: `"${title}" — You have room for more keywords and compelling copy. Aim for 50-60 characters to maximise click-through rate.` });
  } else if (title.length > 65) {
    findings.push({ title: 'Title Tag', status: 'warn', description: `Title will be truncated in Google (${title.length} chars)`, detail: `"${title}" — Google cuts off titles around 60 chars. Move your primary keyword to the front and trim to 50-60 characters.` });
  } else {
    findings.push({ title: 'Title Tag', status: 'pass', description: `Title is well-optimised (${title.length} chars)`, detail: `"${title}"` });
  }

  // Title keyword quality
  if (title) {
    const titleLower = title.toLowerCase();
    const genericTitles = ['home', 'homepage', 'welcome', 'untitled', 'index', 'page'];
    if (genericTitles.some(g => titleLower === g || titleLower.startsWith(g + ' '))) {
      findings.push({ title: 'Title Quality', status: 'fail', description: 'Title tag is generic and not keyword-targeted', detail: `"${title}" — Generic titles like "Home" or "Welcome" rank for nothing. Use your primary keyword and value proposition.` });
    }

    // Check for brand-only title
    if (title.split(/\s+/).length <= 2 && !title.includes('|') && !title.includes('-')) {
      findings.push({ title: 'Title Optimization', status: 'warn', description: 'Title appears to be brand-only with no keywords', detail: 'Your title should include both target keywords AND your brand. Format: "Primary Keyword — Secondary Keyword | Brand".' });
    }

    // Pipe/dash separator check for keyword segmentation
    if (!title.includes('|') && !title.includes('-') && !title.includes('—') && !title.includes(':') && title.length > 30) {
      findings.push({ title: 'Title Format', status: 'warn', description: 'Title has no separator for brand/keyword segmentation', detail: 'Use a separator (| or —) to separate your keyword phrase from your brand name. Example: "SEO Services Melbourne | Your Brand".' });
    }
  }

  // Meta description — stricter
  const desc = $('meta[name="description"]').attr('content')?.trim();
  if (!desc) {
    findings.push({ title: 'Meta Description', status: 'fail', description: 'No meta description found', detail: 'Without a meta description, Google writes one for you — and it usually performs poorly. Write a compelling 150-160 char description with your keyword and a clear call-to-action.' });
  } else if (desc.length < 70) {
    findings.push({ title: 'Meta Description', status: 'fail', description: `Meta description far too short (${desc.length} chars)`, detail: 'You are using less than half the available space. A full-length meta description with keywords and a CTA can increase click-through rate by 5-10%.' });
  } else if (desc.length < 130) {
    findings.push({ title: 'Meta Description', status: 'warn', description: `Meta description is short (${desc.length} chars)`, detail: 'Aim for 150-160 characters. You have room for more keywords and a stronger call-to-action to improve CTR from search results.' });
  } else if (desc.length > 165) {
    findings.push({ title: 'Meta Description', status: 'warn', description: `Meta description may be truncated (${desc.length} chars)`, detail: 'Google typically shows 150-160 characters. Front-load your most important keywords and CTA.' });
  } else {
    findings.push({ title: 'Meta Description', status: 'pass', description: `Meta description well-optimised (${desc.length} chars)` });
  }

  // Open Graph tags — stricter
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogDesc = $('meta[property="og:description"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  const ogType = $('meta[property="og:type"]').attr('content');
  const ogUrl = $('meta[property="og:url"]').attr('content');
  const ogMissing = [!ogTitle && 'og:title', !ogDesc && 'og:description', !ogImage && 'og:image', !ogType && 'og:type', !ogUrl && 'og:url'].filter(Boolean);

  if (ogMissing.length === 0) {
    findings.push({ title: 'Open Graph Tags', status: 'pass', description: 'All OG tags present' });
  } else if (ogMissing.length <= 2) {
    findings.push({ title: 'Open Graph Tags', status: 'warn', description: `Missing: ${ogMissing.join(', ')}`, detail: 'Incomplete OG tags mean your page looks broken when shared on Facebook, LinkedIn, and other platforms. This hurts referral traffic and brand perception.' });
  } else {
    findings.push({ title: 'Open Graph Tags', status: 'fail', description: `Missing ${ogMissing.length} OG tags: ${ogMissing.join(', ')}`, detail: 'Without OG tags, social shares show random text and no image. This kills social click-through rate and makes your brand look unprofessional.' });
  }

  // OG image size check
  if (ogImage && !ogImage.includes('1200')) {
    findings.push({ title: 'OG Image Size', status: 'warn', description: 'OG image may not be optimally sized', detail: 'Facebook and LinkedIn recommend 1200x630px OG images. Undersized images get cropped or look blurry when shared.' });
  }

  // Twitter Card tags
  const twCard = $('meta[name="twitter:card"]').attr('content');
  if (twCard) {
    if (twCard === 'summary_large_image') {
      findings.push({ title: 'Twitter Card', status: 'pass', description: 'Large Twitter card configured — maximum visibility' });
    } else {
      findings.push({ title: 'Twitter Card', status: 'warn', description: `Twitter card type "${twCard}" — consider "summary_large_image"`, detail: 'The summary_large_image card type gets significantly more engagement on Twitter/X than the default summary card.' });
    }
  } else {
    findings.push({ title: 'Twitter Card', status: 'warn', description: 'No Twitter Card meta tags', detail: 'Without twitter:card, your page shows as a plain link on Twitter/X. Add twitter:card="summary_large_image" for maximum social visibility.' });
  }

  // Canonical URL — stricter
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) {
    try {
      const canonicalUrl = new URL(canonical, input.url);
      const pageUrl = new URL(input.url);
      if (canonicalUrl.hostname !== pageUrl.hostname) {
        findings.push({ title: 'Canonical URL', status: 'fail', description: 'Canonical points to a DIFFERENT domain', detail: `Canonical: ${canonical} — This tells Google to ignore this page and credit a different domain. Fix immediately unless this is intentional.` });
      } else if (canonicalUrl.pathname !== pageUrl.pathname && canonicalUrl.href !== input.url) {
        findings.push({ title: 'Canonical URL', status: 'warn', description: 'Canonical URL differs from current page URL', detail: `Canonical: ${canonical} — Make sure this is intentional. Incorrect canonicals can de-index your page.` });
      } else {
        findings.push({ title: 'Canonical URL', status: 'pass', description: 'Self-referencing canonical URL is set', detail: canonical });
      }
    } catch {
      findings.push({ title: 'Canonical URL', status: 'warn', description: 'Canonical URL appears malformed', detail: `Value: ${canonical}` });
    }
  } else {
    findings.push({ title: 'Canonical URL', status: 'fail', description: 'No canonical URL specified', detail: 'Without a canonical tag, Google may treat URL variations (www vs non-www, http vs https, trailing slashes) as duplicate content. This splits your ranking signals across multiple URLs.' });
  }

  // Favicon
  const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
  const appleTouchIcon = $('link[rel="apple-touch-icon"]').length > 0;
  if (favicon && appleTouchIcon) {
    findings.push({ title: 'Favicon', status: 'pass', description: 'Favicon and Apple touch icon set' });
  } else if (favicon) {
    findings.push({ title: 'Favicon', status: 'pass', description: 'Favicon defined' });
  } else {
    findings.push({ title: 'Favicon', status: 'warn', description: 'No favicon found', detail: 'A missing favicon shows a broken icon in browser tabs and Google search results. It hurts brand trust and CTR.' });
  }

  // Viewport meta
  const viewport = $('meta[name="viewport"]').attr('content');
  if (!viewport) {
    findings.push({ title: 'Viewport Meta', status: 'fail', description: 'No viewport meta tag', detail: 'Without a viewport meta tag, your page won\'t render correctly on mobile. Google uses mobile-first indexing — this will severely hurt rankings.' });
  }

  // Language
  const lang = $('html').attr('lang');
  if (!lang) {
    findings.push({ title: 'Language Attribute', status: 'warn', description: 'No lang attribute on <html> tag', detail: 'Set lang="en" (or your language) to help Google serve your page to the right audience. Required for accessibility compliance.' });
  }

  // URL Structure
  try {
    const url = new URL(input.url);
    const path = url.pathname;
    const issues: string[] = [];

    if (path !== path.toLowerCase()) issues.push('contains uppercase characters');
    if (path.includes('_')) issues.push('uses underscores (use hyphens)');
    if (path.split('/').some(s => s.length > 60)) issues.push('URL segment too long');
    if (url.search && url.search.length > 50) issues.push('excessive query parameters');
    if (path.split('/').filter(Boolean).length > 5) issues.push('URL is too deep (5+ levels)');

    if (issues.length === 0) {
      findings.push({ title: 'URL Structure', status: 'pass', description: 'URL is clean and well-structured', detail: path });
    } else {
      findings.push({ title: 'URL Structure', status: 'warn', description: `URL issues: ${issues.join('; ')}`, detail: 'Clean URLs with keywords, hyphens, and shallow depth rank better and get more clicks from search results.' });
    }
  } catch {
    // skip
  }

  return findings;
}
