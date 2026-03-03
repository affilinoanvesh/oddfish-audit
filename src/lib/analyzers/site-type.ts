import * as cheerio from 'cheerio';
import { SiteType, AnalyzerInput } from '../types';

export function detectSiteType(input: AnalyzerInput): SiteType {
  const $ = cheerio.load(input.html);
  const html = input.html.toLowerCase();
  const bodyText = $('body').text().toLowerCase();

  const signals: Record<SiteType, number> = {
    ecommerce: 0,
    blog: 0,
    saas: 0,
    corporate: 0,
    unknown: 0,
  };

  // Ecommerce signals
  if (html.includes('shopify') || html.includes('cdn.shopify.com')) signals.ecommerce += 3;
  if (html.includes('woocommerce') || html.includes('wc-')) signals.ecommerce += 3;
  if (html.includes('bigcommerce') || html.includes('magento')) signals.ecommerce += 3;
  if ($('[class*="product"], [class*="cart"], [class*="checkout"]').length > 0) signals.ecommerce += 2;
  if ($('meta[property="product:price"]').length > 0) signals.ecommerce += 2;
  if (bodyText.includes('add to cart') || bodyText.includes('buy now')) signals.ecommerce += 2;
  if (bodyText.includes('free shipping') || bodyText.includes('shop now')) signals.ecommerce += 1;

  // Blog signals
  if (html.includes('wordpress') || html.includes('wp-content')) signals.blog += 3;
  if ($('article, [class*="post"], [class*="blog"], [class*="entry"]').length > 2) signals.blog += 2;
  if ($('time, [class*="date"], [class*="author"]').length > 0) signals.blog += 1;
  if (bodyText.includes('read more') || bodyText.includes('continue reading')) signals.blog += 1;

  // SaaS signals
  if (bodyText.includes('sign up') || bodyText.includes('get started')) signals.saas += 2;
  if (bodyText.includes('free trial') || bodyText.includes('start your')) signals.saas += 2;
  if (bodyText.includes('pricing') || bodyText.includes('/mo')) signals.saas += 2;
  if ($('[class*="pricing"], [class*="plan"], [class*="tier"]').length > 0) signals.saas += 2;
  if (bodyText.includes('api') || bodyText.includes('integration')) signals.saas += 1;
  if (bodyText.includes('dashboard') || bodyText.includes('analytics')) signals.saas += 1;

  // Corporate signals
  if (bodyText.includes('about us') || bodyText.includes('our team')) signals.corporate += 1;
  if (bodyText.includes('contact us') || bodyText.includes('our services')) signals.corporate += 1;
  if (bodyText.includes('our mission') || bodyText.includes('our vision')) signals.corporate += 1;
  if ($('[class*="team"], [class*="service"]').length > 0) signals.corporate += 1;

  const sorted = Object.entries(signals)
    .filter(([key]) => key !== 'unknown')
    .sort((a, b) => b[1] - a[1]);

  if (sorted[0][1] >= 3) {
    return sorted[0][0] as SiteType;
  }

  return 'unknown';
}
