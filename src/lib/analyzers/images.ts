import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzeImages(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];
  const images = $('img');
  const total = images.length;

  if (total === 0) {
    findings.push({ title: 'Images', status: 'warn', description: 'No images found on the page', detail: 'Images improve engagement and can rank in Google Image search. Consider adding relevant visuals.' });
    return findings;
  }

  findings.push({ title: 'Image Count', status: 'pass', description: `${total} image(s) found on the page` });

  // Alt text coverage
  let withAlt = 0;
  let emptyAlt = 0;
  let noAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined) noAlt++;
    else if (alt.trim() === '') emptyAlt++;
    else withAlt++;
  });

  const altPercent = Math.round((withAlt / total) * 100);
  if (noAlt === 0 && emptyAlt <= total * 0.1) {
    findings.push({ title: 'Alt Text', status: 'pass', description: `${altPercent}% of images have descriptive alt text`, detail: `${withAlt}/${total} images have alt text. Good for accessibility and image SEO.` });
  } else if (noAlt > total * 0.5) {
    findings.push({ title: 'Alt Text', status: 'fail', description: `${noAlt} images are missing alt attributes`, detail: 'Alt text is critical for accessibility (screen readers) and helps Google understand image content for ranking.' });
  } else {
    findings.push({ title: 'Alt Text', status: 'warn', description: `${noAlt} missing alt, ${emptyAlt} empty alt attributes`, detail: `${withAlt}/${total} images have descriptive alt text. Each image should have unique, descriptive alt text.` });
  }

  // Image file names
  let genericNames = 0;
  const genericPatterns = /^(img|image|photo|pic|screenshot|untitled|dsc|dcim|img_?\d|screen\s?shot)/i;
  images.each((_, el) => {
    const src = $(el).attr('src') || '';
    const filename = src.split('/').pop()?.split('?')[0] || '';
    if (genericPatterns.test(filename) || /^\d+\.(jpg|png|webp|gif)$/i.test(filename)) {
      genericNames++;
    }
  });

  if (genericNames === 0) {
    findings.push({ title: 'Image File Names', status: 'pass', description: 'Image file names appear descriptive' });
  } else {
    findings.push({ title: 'Image File Names', status: 'warn', description: `${genericNames} images have generic file names`, detail: 'Use descriptive, keyword-rich file names like "blue-running-shoe.webp" instead of "IMG_1234.jpg".' });
  }

  // Modern image formats (WebP/AVIF)
  let modernFormat = 0;
  let legacyFormat = 0;
  images.each((_, el) => {
    const src = $(el).attr('src') || '';
    if (/\.webp|\.avif/i.test(src)) modernFormat++;
    else if (/\.jpg|\.jpeg|\.png|\.gif/i.test(src)) legacyFormat++;
  });

  // Also check <picture> and <source> for modern formats
  const pictureWebp = $('picture source[type="image/webp"], picture source[type="image/avif"]').length;
  if (pictureWebp > 0) modernFormat += pictureWebp;

  if (modernFormat > 0 && legacyFormat === 0) {
    findings.push({ title: 'Image Formats', status: 'pass', description: 'All images use modern formats (WebP/AVIF)' });
  } else if (modernFormat > 0) {
    findings.push({ title: 'Image Formats', status: 'pass', description: `${modernFormat} images use modern formats (WebP/AVIF)`, detail: `${legacyFormat} still use legacy formats. Convert remaining JPG/PNG to WebP for 25-35% size savings.` });
  } else if (legacyFormat > 0) {
    findings.push({ title: 'Image Formats', status: 'warn', description: 'No images use modern formats', detail: 'Convert images to WebP or AVIF for significantly smaller file sizes and faster loading.' });
  }

  // Lazy loading
  let lazyCount = 0;
  images.each((_, el) => {
    if ($(el).attr('loading') === 'lazy') lazyCount++;
  });

  if (total <= 2) {
    findings.push({ title: 'Lazy Loading', status: 'pass', description: 'Few images — lazy loading not critical' });
  } else if (lazyCount >= total * 0.5) {
    findings.push({ title: 'Lazy Loading', status: 'pass', description: `${lazyCount}/${total} images use native lazy loading` });
  } else if (lazyCount > 0) {
    findings.push({ title: 'Lazy Loading', status: 'warn', description: `Only ${lazyCount}/${total} images use lazy loading`, detail: 'Add loading="lazy" to below-the-fold images. Keep above-the-fold images eager-loaded.' });
  } else {
    findings.push({ title: 'Lazy Loading', status: 'warn', description: 'No images use lazy loading', detail: 'Add loading="lazy" to below-the-fold images. This defers loading until the user scrolls near them.' });
  }

  // Responsive images (srcset)
  let hasSrcset = 0;
  images.each((_, el) => {
    if ($(el).attr('srcset') || $(el).attr('sizes')) hasSrcset++;
  });
  if (hasSrcset > 0) {
    findings.push({ title: 'Responsive Images', status: 'pass', description: `${hasSrcset}/${total} images use srcset for responsive delivery` });
  } else if (total > 3) {
    findings.push({ title: 'Responsive Images', status: 'warn', description: 'No images use srcset/sizes attributes', detail: 'Responsive images serve appropriately sized files to different devices, improving mobile performance.' });
  }

  // Broken image detection (check for empty src or data: placeholders)
  let suspectBroken = 0;
  images.each((_, el) => {
    const src = $(el).attr('src') || '';
    if (!src || src === '#' || src === 'about:blank') suspectBroken++;
  });
  if (suspectBroken > 0) {
    findings.push({ title: 'Broken Images', status: 'fail', description: `${suspectBroken} images have empty or invalid src`, detail: 'Images with missing sources display as broken and hurt user experience.' });
  }

  return findings;
}
