import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzeContent(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];

  // Extract text content
  const $clone = cheerio.load(input.html);
  $clone('script, style, noscript, header, footer, nav').remove();
  const bodyText = $clone('body').text().replace(/\s+/g, ' ').trim();
  const words = bodyText.split(/\s+/).filter(w => w.length > 1);
  const wordCount = words.length;

  // Word count — much stricter
  if (wordCount < 100) {
    findings.push({ title: 'Word Count', status: 'fail', description: `Critically thin content (${wordCount} words)`, detail: 'Pages with less than 100 words almost never rank. Google considers this thin content. You need at minimum 300 words, ideally 800+ for competitive keywords.' });
  } else if (wordCount < 300) {
    findings.push({ title: 'Word Count', status: 'fail', description: `Thin content (${wordCount} words)`, detail: 'Google recommends comprehensive content. Pages under 300 words rarely rank for anything competitive. Your competitors likely have 800-2000+ words on their key pages.' });
  } else if (wordCount < 600) {
    findings.push({ title: 'Word Count', status: 'warn', description: `Below-average content length (${wordCount} words)`, detail: 'Average top-10 ranking page has 1,400+ words. At 300-600 words you are at a significant disadvantage. Expand your content with more depth, examples, and detail.' });
  } else if (wordCount < 1000) {
    findings.push({ title: 'Word Count', status: 'warn', description: `Moderate content (${wordCount} words)`, detail: 'Good start, but top-ranking pages typically have 1,000-2,000 words. Adding more comprehensive content (FAQs, how-tos, case studies) can significantly boost rankings.' });
  } else {
    findings.push({ title: 'Word Count', status: 'pass', description: `Strong content depth (${wordCount} words)` });
  }

  // Top keywords (frequency analysis)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'this', 'that', 'are', 'was', 'be', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'can', 'not', 'from', 'as', 'all', 'we', 'our', 'your', 'you', 'they', 'them', 'their', 'its', 'my', 'me', 'us', 'about', 'more', 'so', 'if', 'up', 'out', 'no', 'just', 'than', 'into', 'also', 'been', 'which', 'when', 'who', 'how', 'what', 'where', 'why', 'each', 'she', 'he', 'his', 'her', 'get', 'here', 'there', 'these', 'those', 'then', 'some', 'one', 'two', 'new', 'over', 'after', 'only', 'very', 'most', 'other', 'any', 'such', 'like', 'own', 'same', 'well', 'back', 'even', 'still', 'way', 'first', 'many', 'make', 'use', 'see']);

  const freq: Record<string, number> = {};
  words.forEach(w => {
    const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lower.length > 2 && !stopWords.has(lower)) freq[lower] = (freq[lower] || 0) + 1;
  });

  const topKeywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topKeywordsStr = topKeywords.map(([word, count]) => `${word} (${count})`).join(', ');

  if (topKeywords.length > 0) {
    findings.push({ title: 'Top Keywords', status: 'pass', description: 'Content keyword themes identified', detail: topKeywordsStr });
  }

  // Keyword alignment — stricter
  const title = $('title').text().toLowerCase();
  const h1 = $('h1').first().text().toLowerCase();
  const metaDesc = ($('meta[name="description"]').attr('content') || '').toLowerCase();
  const topWord = topKeywords[0];

  if (topWord) {
    const inTitle = title.includes(topWord[0]);
    const inH1 = h1.includes(topWord[0]);
    const inDesc = metaDesc.includes(topWord[0]);
    const aligned = [inTitle, inH1, inDesc].filter(Boolean).length;

    if (aligned >= 3) {
      findings.push({ title: 'Keyword Alignment', status: 'pass', description: `Primary keyword "${topWord[0]}" aligned across title, H1, and description` });
    } else if (aligned === 2) {
      findings.push({ title: 'Keyword Alignment', status: 'warn', description: `Keyword "${topWord[0]}" only in ${[inTitle && 'title', inH1 && 'H1', inDesc && 'description'].filter(Boolean).join(' + ')}`, detail: 'Your primary keyword should appear in ALL three: title tag, H1, and meta description. This is basic on-page SEO that most competitors get right.' });
    } else if (aligned === 1) {
      findings.push({ title: 'Keyword Alignment', status: 'fail', description: `Poor keyword alignment — "${topWord[0]}" only in ${inTitle ? 'title' : inH1 ? 'H1' : 'description'}`, detail: 'Your most-used keyword is barely represented in your SEO elements. Align your title tag, H1, and meta description around your target keyword.' });
    } else {
      findings.push({ title: 'Keyword Alignment', status: 'fail', description: 'No keyword alignment between content and SEO elements', detail: 'Your most frequent content keyword does not appear in your title, H1, or meta description. This is a fundamental on-page SEO failure.' });
    }
  }

  // Paragraph structure — stricter
  const paragraphs = $('p').length;
  if (paragraphs === 0 && wordCount > 50) {
    findings.push({ title: 'Paragraph Structure', status: 'fail', description: 'No <p> tags found — content is unstructured', detail: 'Content without proper paragraph structure is harder for Google to parse and terrible for user experience. Use <p> tags to break content into digestible sections.' });
  } else if (paragraphs < 3 && wordCount > 200) {
    findings.push({ title: 'Paragraph Structure', status: 'warn', description: `Only ${paragraphs} paragraphs for ${wordCount} words`, detail: 'Break your content into more paragraphs. Short paragraphs (2-3 sentences) improve readability and reduce bounce rate.' });
  } else if (paragraphs > 0) {
    findings.push({ title: 'Paragraph Structure', status: 'pass', description: `${paragraphs} paragraphs found` });
  }

  // Readability
  const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 0) {
    const avgWords = Math.round(words.length / sentences.length);
    if (avgWords > 25) {
      findings.push({ title: 'Readability', status: 'fail', description: `Average sentence length ${avgWords} words — too complex`, detail: 'Web content should average 15-20 words per sentence. Long, complex sentences increase bounce rate and hurt engagement signals that affect rankings.' });
    } else if (avgWords > 20) {
      findings.push({ title: 'Readability', status: 'warn', description: `Average sentence length ${avgWords} words — slightly long`, detail: 'Aim for 15-20 words per sentence. Shorter sentences improve comprehension and keep users engaged.' });
    } else {
      findings.push({ title: 'Readability', status: 'pass', description: `Good readability (avg ${avgWords} words/sentence)` });
    }
  }

  // Unique value / content depth signals
  const lists = $('ul, ol').length;
  const images = $('img').length;
  const videos = $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
  const tables = $('table').length;

  const richElements = lists + (images > 0 ? 1 : 0) + videos + tables;
  if (richElements === 0) {
    findings.push({ title: 'Content Richness', status: 'warn', description: 'No lists, images, videos, or tables in content', detail: 'Rich content with varied media types ranks better. Add bullet lists, images, videos, or comparison tables to make your content more comprehensive and engaging.' });
  } else if (richElements < 2) {
    findings.push({ title: 'Content Richness', status: 'warn', description: `Limited content variety (${richElements} rich element type)`, detail: 'Top-ranking pages use multiple content formats — bullet lists, numbered steps, images, videos, tables. Add more variety to improve engagement and dwell time.' });
  } else {
    findings.push({ title: 'Content Richness', status: 'pass', description: `Good content variety: ${[lists > 0 && `${lists} lists`, images > 0 && `${images} images`, videos > 0 && `${videos} videos`, tables > 0 && `${tables} tables`].filter(Boolean).join(', ')}` });
  }

  // E-E-A-T Signals
  const allText = input.html.toLowerCase();

  // Contact information
  const hasContactLink = $('a[href*="contact"], a[href*="mailto:"], a:contains("Contact")').length > 0;
  const hasPhone = /(\+?\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4})/.test(bodyText);
  const hasEmail = $('a[href^="mailto:"]').length > 0;
  if (hasContactLink || hasPhone || hasEmail) {
    findings.push({ title: 'Contact Information', status: 'pass', description: 'Contact information accessible' });
  } else {
    findings.push({ title: 'Contact Information', status: 'fail', description: 'No contact information found on page', detail: 'Google expects legitimate businesses to have visible contact details. Missing contact info is a major E-E-A-T red flag that can suppress rankings.' });
  }

  // Privacy Policy / Terms
  const hasPrivacy = $('a[href*="privacy"], a:contains("Privacy")').length > 0;
  const hasTerms = $('a[href*="terms"], a:contains("Terms")').length > 0;
  if (hasPrivacy && hasTerms) {
    findings.push({ title: 'Legal Pages', status: 'pass', description: 'Privacy policy and terms of service linked' });
  } else if (hasPrivacy || hasTerms) {
    findings.push({ title: 'Legal Pages', status: 'warn', description: `Missing ${hasPrivacy ? 'terms of service' : 'privacy policy'}`, detail: 'Both legal pages are expected by Google for trustworthy sites, especially YMYL (Your Money Your Life) content.' });
  } else {
    findings.push({ title: 'Legal Pages', status: 'fail', description: 'No privacy policy or terms of service', detail: 'Missing legal pages is a serious trust signal failure. Google considers this a red flag, especially for sites handling user data or transactions.' });
  }

  // About page / Author info
  const hasAbout = $('a[href*="about"], a:contains("About")').length > 0;
  const hasAuthor = $('[class*="author" i], [rel="author"], .byline, [itemprop="author"]').length > 0;
  if (hasAbout && hasAuthor) {
    findings.push({ title: 'Authority Signals', status: 'pass', description: 'About page and author attribution found' });
  } else if (hasAbout || hasAuthor) {
    findings.push({ title: 'Authority Signals', status: 'warn', description: hasAuthor ? 'Author shown but no About page linked' : 'About page linked but no author attribution on content', detail: 'Google wants to see WHO is behind the content. Both an About page and author bylines demonstrate expertise and experience.' });
  } else {
    findings.push({ title: 'Authority Signals', status: 'fail', description: 'No About page or author attribution found', detail: 'This is a critical E-E-A-T failure. Google needs to know who created this content and why they are qualified. Add an About page and author bylines.' });
  }

  // Trust signals
  const trustSignals: string[] = [];
  if ($('[class*="trust" i], [class*="badge" i], [class*="secure" i], [class*="guarantee" i]').length > 0) trustSignals.push('Trust badges');
  if ($('[class*="testimonial" i], [class*="review" i], [class*="rating" i]').length > 0) trustSignals.push('Reviews/testimonials');
  if (allText.includes('money back') || allText.includes('guarantee') || allText.includes('free returns')) trustSignals.push('Guarantees');
  if ($('[class*="social" i] a, a[href*="facebook"], a[href*="linkedin"], a[href*="twitter"], a[href*="instagram"]').length > 0) trustSignals.push('Social proof');

  if (trustSignals.length >= 3) {
    findings.push({ title: 'Trust Signals', status: 'pass', description: `${trustSignals.length} trust signals found`, detail: trustSignals.join(', ') });
  } else if (trustSignals.length > 0) {
    findings.push({ title: 'Trust Signals', status: 'warn', description: `Only ${trustSignals.length} trust signal(s) — needs improvement`, detail: `Found: ${trustSignals.join(', ')}. Add reviews, testimonials, trust badges, guarantees, and social proof. These directly impact conversion and bounce rate.` });
  } else {
    findings.push({ title: 'Trust Signals', status: 'fail', description: 'No trust signals detected anywhere on the page', detail: 'Pages without social proof, reviews, or trust indicators have higher bounce rates. This sends negative engagement signals to Google.' });
  }

  // Call-to-Action
  const ctaElements = $('a[class*="cta" i], button[class*="cta" i], a[class*="btn" i], button[class*="btn" i], .button, a.btn').length;
  const ctaText = bodyText.match(/\b(get started|sign up|buy now|shop now|learn more|contact us|try free|start free|book now|schedule|request|download|enquire|get quote)\b/gi);
  if (ctaElements > 0 || (ctaText && ctaText.length > 0)) {
    findings.push({ title: 'Call-to-Action', status: 'pass', description: 'Call-to-action elements found' });
  } else {
    findings.push({ title: 'Call-to-Action', status: 'warn', description: 'No clear call-to-action detected', detail: 'Every page should guide users to a next step. Pages without CTAs have lower engagement — a negative ranking signal.' });
  }

  return findings;
}
