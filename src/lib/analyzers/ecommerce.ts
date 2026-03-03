import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput, SiteType } from '../types';

export function analyzeEcommerce(input: AnalyzerInput, siteType: SiteType): Finding[] {
  if (siteType !== 'ecommerce') return [];

  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];
  const html = input.html.toLowerCase();
  const bodyText = $('body').text().toLowerCase();

  // Platform detection
  const platforms: string[] = [];
  if (html.includes('shopify') || html.includes('cdn.shopify.com')) platforms.push('Shopify');
  if (html.includes('woocommerce') || html.includes('wc-')) platforms.push('WooCommerce');
  if (html.includes('bigcommerce')) platforms.push('BigCommerce');
  if (html.includes('magento')) platforms.push('Magento');
  if (html.includes('squarespace')) platforms.push('Squarespace');
  if (html.includes('wix.com')) platforms.push('Wix');

  if (platforms.length > 0) {
    findings.push({ title: 'Ecommerce Platform', status: 'pass', description: `Detected: ${platforms.join(', ')}` });
  }

  // Product page signals
  const hasPrice = $('[class*="price" i], [itemprop="price"], [data-price], .product-price, .price').length > 0;
  const hasAddToCart = $('[class*="add-to-cart" i], button:contains("Add to Cart"), button:contains("Add to Bag"), [name="add"], form[action*="cart"]').length > 0
    || bodyText.includes('add to cart') || bodyText.includes('add to bag');
  const hasBuyNow = bodyText.includes('buy now') || bodyText.includes('shop now') || bodyText.includes('order now');

  if (hasPrice) {
    findings.push({ title: 'Price Display', status: 'pass', description: 'Product pricing is visible on page' });
  } else {
    findings.push({ title: 'Price Display', status: 'warn', description: 'No price elements detected', detail: 'If this is a product page, ensure price is visible above the fold with proper schema markup.' });
  }

  if (hasAddToCart) {
    findings.push({ title: 'Add to Cart', status: 'pass', description: 'Add-to-cart functionality detected' });
  } else if (hasBuyNow) {
    findings.push({ title: 'Buy Action', status: 'pass', description: 'Buy/Shop now CTA detected' });
  } else {
    findings.push({ title: 'Purchase CTA', status: 'warn', description: 'No add-to-cart or buy button detected', detail: 'Product pages need a clear, visible add-to-cart or buy button above the fold.' });
  }

  // Product images
  const productImages = $('[class*="product"] img, [class*="gallery"] img, [data-zoom], [class*="thumbnail"] img').length;
  const allImages = $('img').length;
  if (productImages >= 3) {
    findings.push({ title: 'Product Images', status: 'pass', description: `${productImages} product images found`, detail: 'Multiple product images (front, back, detail shots) increase conversion.' });
  } else if (productImages > 0 || allImages >= 3) {
    findings.push({ title: 'Product Images', status: 'warn', description: `${productImages || allImages} product image(s) found`, detail: 'Aim for 6-8 product images with multiple angles, zoom functionality, and lifestyle shots.' });
  } else {
    findings.push({ title: 'Product Images', status: 'fail', description: 'No product images detected', detail: 'Product pages need high-quality images. Missing images dramatically reduce conversion rates.' });
  }

  // Stock/Availability signals
  const hasStock = $('[class*="stock" i], [class*="availability" i], [itemprop="availability"]').length > 0
    || bodyText.includes('in stock') || bodyText.includes('out of stock') || bodyText.includes('available');
  if (hasStock) {
    findings.push({ title: 'Stock Status', status: 'pass', description: 'Stock/availability information displayed' });
  } else {
    findings.push({ title: 'Stock Status', status: 'warn', description: 'No stock availability indicator found', detail: 'Show stock status to create urgency and set expectations. Use schema availability markup.' });
  }

  // Product reviews/ratings on page
  const hasReviews = $('[class*="review" i], [class*="rating" i], [class*="stars" i], [itemprop="aggregateRating"], [itemprop="review"]').length > 0;
  if (hasReviews) {
    findings.push({ title: 'Customer Reviews', status: 'pass', description: 'Customer reviews/ratings displayed on page', detail: 'Reviews build trust and improve conversion. Ensure they have Review schema for star ratings in search.' });
  } else {
    findings.push({ title: 'Customer Reviews', status: 'warn', description: 'No customer reviews or ratings found', detail: 'User reviews increase trust and conversion. 93% of consumers say reviews influence purchasing decisions.' });
  }

  // Shipping/returns info
  const hasShipping = bodyText.includes('free shipping') || bodyText.includes('shipping') || bodyText.includes('delivery');
  const hasReturns = bodyText.includes('return') || bodyText.includes('refund') || bodyText.includes('money back');
  if (hasShipping && hasReturns) {
    findings.push({ title: 'Shipping & Returns', status: 'pass', description: 'Shipping and returns information found' });
  } else if (hasShipping || hasReturns) {
    findings.push({ title: 'Shipping & Returns', status: 'warn', description: `${hasShipping ? 'Shipping' : 'Returns'} info found but ${hasShipping ? 'returns' : 'shipping'} info missing`, detail: 'Both shipping and returns info should be visible near the purchase button to reduce cart abandonment.' });
  } else {
    findings.push({ title: 'Shipping & Returns', status: 'warn', description: 'No shipping or returns information found', detail: 'Visible shipping costs and return policy reduce cart abandonment by up to 30%.' });
  }

  // Collection/category page signals
  const hasFilters = $('[class*="filter" i], [class*="facet" i], [class*="sort" i], select[name*="sort"]').length > 0;
  const hasProductGrid = $('[class*="product-grid" i], [class*="product-list" i], [class*="collection" i] [class*="product"]').length > 0;

  if (hasFilters) {
    findings.push({ title: 'Product Filtering', status: 'pass', description: 'Product filtering/sorting options detected', detail: 'Ensure filter URLs use canonical tags to prevent duplicate content from faceted navigation.' });
  }

  if (hasProductGrid) {
    // Check pagination
    const hasPagination = $('[class*="pagination" i], a[rel="next"], .page-numbers, [class*="load-more" i]').length > 0;
    if (hasPagination) {
      findings.push({ title: 'Collection Pagination', status: 'pass', description: 'Pagination found on collection page' });
    }
  }

  // Breadcrumbs (critical for ecommerce navigation)
  const hasBreadcrumbs = $('[class*="breadcrumb" i], nav[aria-label*="breadcrumb" i], [itemtype*="BreadcrumbList"]').length > 0;
  if (hasBreadcrumbs) {
    findings.push({ title: 'Breadcrumb Navigation', status: 'pass', description: 'Breadcrumb navigation found', detail: 'Breadcrumbs help users and crawlers understand product hierarchy.' });
  } else {
    findings.push({ title: 'Breadcrumb Navigation', status: 'warn', description: 'No breadcrumb navigation detected', detail: 'Breadcrumbs are essential for ecommerce. They improve navigation, reduce bounce rate, and enable breadcrumb rich results.' });
  }

  // Trust badges / secure checkout
  const hasTrustBadges = $('[class*="trust" i] img, [class*="badge" i] img, [class*="secure" i], img[alt*="secure" i], img[alt*="payment" i]').length > 0;
  const hasPaymentIcons = $('[class*="payment" i] img, [class*="payment-icons" i], img[alt*="visa" i], img[alt*="mastercard" i], img[alt*="paypal" i]').length > 0;

  if (hasTrustBadges || hasPaymentIcons) {
    findings.push({ title: 'Trust & Payment Badges', status: 'pass', description: 'Trust or payment badges detected', detail: 'Trust badges near checkout/CTA buttons can increase conversion by 15-20%.' });
  } else {
    findings.push({ title: 'Trust & Payment Badges', status: 'warn', description: 'No trust or payment badges found', detail: 'Add payment method icons and security badges near the add-to-cart button to build purchase confidence.' });
  }

  // Structured data check specific to ecommerce
  const jsonLdScripts = $('script[type="application/ld+json"]');
  let hasProductSchema = false;
  let hasOfferSchema = false;

  jsonLdScripts.each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('"Product"') || text.includes('"@type":"Product"')) hasProductSchema = true;
    if (text.includes('"Offer"') || text.includes('"offers"')) hasOfferSchema = true;
  });

  if (hasProductSchema && hasOfferSchema) {
    findings.push({ title: 'Product Rich Results', status: 'pass', description: 'Product schema with offers found — eligible for rich results', detail: 'Your products can show price, availability, and reviews directly in Google search results.' });
  } else if (hasProductSchema) {
    findings.push({ title: 'Product Rich Results', status: 'warn', description: 'Product schema found but missing offers/pricing', detail: 'Add offers with price, priceCurrency, and availability to enable product rich results in Google.' });
  } else {
    findings.push({ title: 'Product Rich Results', status: 'fail', description: 'No Product schema markup found', detail: 'Product schema is critical for ecommerce SEO. It enables rich results with price, availability, and star ratings in Google.' });
  }

  return findings;
}
