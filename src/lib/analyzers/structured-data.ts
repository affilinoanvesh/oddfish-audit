import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput, SiteType } from '../types';

export function analyzeStructuredData(input: AnalyzerInput, siteType?: SiteType): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];

  // JSON-LD — parse all scripts
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const jsonLdTypes: string[] = [];
  const jsonLdObjects: Record<string, unknown>[] = [];

  jsonLdScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '');
      const items = Array.isArray(data) ? data : [data];
      items.forEach((item) => {
        if (item['@type']) { jsonLdTypes.push(item['@type']); jsonLdObjects.push(item); }
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          item['@graph'].forEach((g: Record<string, unknown>) => {
            if (g['@type']) { jsonLdTypes.push(g['@type'] as string); jsonLdObjects.push(g); }
          });
        }
      });
    } catch {
      findings.push({ title: 'JSON-LD Parsing Error', status: 'fail', description: 'Invalid JSON-LD found — Google cannot read your structured data', detail: 'One or more JSON-LD blocks contain broken JSON. This means your schema markup is completely invisible to search engines. Fix the syntax immediately.' });
    }
  });

  if (jsonLdTypes.length > 0) {
    findings.push({ title: 'JSON-LD Present', status: 'pass', description: `${jsonLdTypes.length} JSON-LD schema(s) found`, detail: `Types: ${jsonLdTypes.join(', ')}` });
  } else {
    findings.push({ title: 'JSON-LD Missing', status: 'fail', description: 'No JSON-LD structured data found', detail: 'JSON-LD is the #1 way to communicate with Google about your business, products, and content. Without it you are invisible in rich results, knowledge panels, and AI overviews.' });
  }

  // Organization schema — critical for all businesses
  const hasOrg = jsonLdTypes.some(t => t === 'Organization' || t === 'LocalBusiness');
  if (hasOrg) {
    // Validate completeness
    const org = jsonLdObjects.find(o => o['@type'] === 'Organization' || o['@type'] === 'LocalBusiness') || {};
    const missing: string[] = [];
    if (!org['name']) missing.push('name');
    if (!org['logo']) missing.push('logo');
    if (!org['url']) missing.push('url');
    if (!org['contactPoint'] && !org['telephone']) missing.push('contactPoint/telephone');
    if (!org['sameAs']) missing.push('sameAs (social profiles)');
    if (!org['address']) missing.push('address');

    if (missing.length === 0) {
      findings.push({ title: 'Organization Schema', status: 'pass', description: 'Complete Organization schema with all recommended fields' });
    } else if (missing.length <= 2) {
      findings.push({ title: 'Organization Schema', status: 'warn', description: `Organization schema missing: ${missing.join(', ')}`, detail: 'These fields help Google build a complete knowledge panel for your business. Add them to maximise visibility.' });
    } else {
      findings.push({ title: 'Organization Schema', status: 'warn', description: `Organization schema is incomplete — missing ${missing.length} fields`, detail: `Missing: ${missing.join(', ')}. A complete Organization schema is essential for knowledge panels and brand searches.` });
    }
  } else {
    findings.push({ title: 'Organization Schema', status: 'fail', description: 'No Organization or LocalBusiness schema', detail: 'Every business website MUST have Organization schema. Without it, Google cannot properly identify your business for knowledge panels, brand searches, or AI overviews.' });
  }

  // WebSite schema
  const hasWebsite = jsonLdTypes.includes('WebSite');
  if (hasWebsite) {
    const ws = jsonLdObjects.find(o => o['@type'] === 'WebSite') || {};
    if (!ws['potentialAction']) {
      findings.push({ title: 'WebSite Schema', status: 'warn', description: 'WebSite schema found but missing SearchAction', detail: 'Add a potentialAction SearchAction to enable the sitelinks search box in Google — a significant SERP real estate boost.' });
    } else {
      findings.push({ title: 'WebSite Schema', status: 'pass', description: 'WebSite schema with SearchAction found' });
    }
  } else {
    findings.push({ title: 'WebSite Schema', status: 'fail', description: 'No WebSite schema found', detail: 'WebSite schema enables the sitelinks search box in Google results and helps Google understand your site as a whole entity.' });
  }

  // Breadcrumb schema
  const hasBreadcrumb = jsonLdTypes.includes('BreadcrumbList');
  const hasBreadcrumbHtml = $('nav[aria-label*="breadcrumb" i], .breadcrumb, .breadcrumbs, [class*="breadcrumb"]').length > 0;
  if (hasBreadcrumb) {
    findings.push({ title: 'Breadcrumb Schema', status: 'pass', description: 'BreadcrumbList schema markup found' });
  } else if (hasBreadcrumbHtml) {
    findings.push({ title: 'Breadcrumb Schema', status: 'warn', description: 'Breadcrumbs in HTML but no BreadcrumbList schema', detail: 'You have breadcrumbs but Google cannot use them for rich results. Add JSON-LD BreadcrumbList schema to get breadcrumb URLs displayed in search results.' });
  } else {
    findings.push({ title: 'Breadcrumbs', status: 'fail', description: 'No breadcrumb navigation or schema found', detail: 'Breadcrumbs improve user experience and enable breadcrumb rich results in Google. They also help search engines understand your site hierarchy.' });
  }

  // FAQ schema
  const hasFaq = jsonLdTypes.includes('FAQPage');
  const hasFaqContent = $('[class*="faq" i], [id*="faq" i], details, .accordion').length > 0;
  if (hasFaq) {
    findings.push({ title: 'FAQ Schema', status: 'pass', description: 'FAQPage schema found — eligible for FAQ rich snippets' });
  } else if (hasFaqContent) {
    findings.push({ title: 'FAQ Schema', status: 'warn', description: 'FAQ content detected but no FAQPage schema', detail: 'You have FAQ content but are missing the schema to get FAQ rich snippets in search results. This is free SERP real estate you are leaving on the table.' });
  } else {
    findings.push({ title: 'FAQ Content & Schema', status: 'warn', description: 'No FAQ content or schema found', detail: 'FAQ sections with proper schema markup can dramatically increase your SERP visibility with expanded snippets. Consider adding an FAQ section to your key pages.' });
  }

  // Product schema (critical for ecommerce)
  const hasProduct = jsonLdTypes.includes('Product');
  if (siteType === 'ecommerce' || hasProduct) {
    if (hasProduct) {
      const product = jsonLdObjects.find(o => o['@type'] === 'Product') || {};
      const missing: string[] = [];
      if (!product['name']) missing.push('name');
      if (!product['image']) missing.push('image');
      if (!product['description']) missing.push('description');
      if (!product['sku']) missing.push('sku');
      if (!product['brand']) missing.push('brand');
      const offers = product['offers'] as Record<string, unknown> | undefined;
      if (!offers) {
        missing.push('offers (price/availability)');
      } else {
        if (!offers['price'] && !offers['lowPrice']) missing.push('price');
        if (!offers['availability']) missing.push('availability');
        if (!offers['priceCurrency']) missing.push('priceCurrency');
      }
      if (!product['aggregateRating'] && !product['review']) missing.push('aggregateRating/review');

      if (missing.length === 0) {
        findings.push({ title: 'Product Schema', status: 'pass', description: 'Complete Product schema with all recommended fields' });
      } else {
        findings.push({ title: 'Product Schema', status: missing.length <= 2 ? 'warn' : 'fail', description: `Product schema incomplete — missing ${missing.length} fields`, detail: `Missing: ${missing.join(', ')}. Complete Product schema enables rich results with price, availability, and reviews in Google Shopping.` });
      }
    } else if (siteType === 'ecommerce') {
      findings.push({ title: 'Product Schema', status: 'fail', description: 'Ecommerce site with no Product schema', detail: 'Product schema is CRITICAL for ecommerce. Without it you cannot appear in Google Shopping results, product carousels, or rich product snippets.' });
    }
  }

  // Review/Rating schema
  const hasReview = jsonLdTypes.includes('Review') || jsonLdTypes.includes('AggregateRating');
  const hasReviewHtml = $('[class*="review" i], [class*="rating" i], [class*="stars" i], [class*="testimonial" i]').length > 0;
  if (hasReview) {
    findings.push({ title: 'Review Schema', status: 'pass', description: 'Review/AggregateRating schema found — eligible for star ratings in search' });
  } else if (hasReviewHtml) {
    findings.push({ title: 'Review Schema', status: 'warn', description: 'Reviews visible on page but no schema markup', detail: 'You have reviews/ratings but Google cannot show star ratings in search results without AggregateRating schema. This is a major missed opportunity for click-through rate.' });
  } else {
    findings.push({ title: 'Review Schema', status: 'warn', description: 'No reviews or review schema found', detail: 'Star ratings in search results dramatically increase click-through rates. Add customer reviews with AggregateRating schema.' });
  }

  // SiteNavigationElement
  const hasNavSchema = jsonLdTypes.includes('SiteNavigationElement');
  if (!hasNavSchema) {
    findings.push({ title: 'Navigation Schema', status: 'warn', description: 'No SiteNavigationElement schema', detail: 'SiteNavigationElement schema helps Google understand your site navigation structure and can improve sitelinks in search results.' });
  }

  // Overall assessment
  const schemaCount = jsonLdTypes.length;
  if (schemaCount === 0) {
    findings.push({ title: 'Rich Results Eligibility', status: 'fail', description: 'Not eligible for ANY rich results in Google', detail: 'Without structured data, your site shows as plain blue links in search. Competitors with schema markup get rich snippets, star ratings, FAQs, breadcrumbs, and more SERP real estate.' });
  } else if (schemaCount < 3) {
    findings.push({ title: 'Rich Results Coverage', status: 'warn', description: `Only ${schemaCount} schema type(s) — below competitive standard`, detail: 'Well-optimised sites use 5+ schema types. You should have at minimum: Organization, WebSite, BreadcrumbList, and page-specific schemas (Article, Product, FAQ, LocalBusiness).' });
  }

  return findings;
}
