import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzeSpeed(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];

  // Server response time (TTFB proxy)
  if (input.fetchTimeMs < 500) {
    findings.push({ title: 'Server Response (TTFB)', status: 'pass', description: `Excellent response time: ${input.fetchTimeMs}ms`, detail: 'Under 500ms is fast. Good server performance.' });
  } else if (input.fetchTimeMs < 1000) {
    findings.push({ title: 'Server Response (TTFB)', status: 'pass', description: `Good response time: ${input.fetchTimeMs}ms`, detail: 'Under 1 second is acceptable. Consider CDN or server optimization for further improvement.' });
  } else if (input.fetchTimeMs < 3000) {
    findings.push({ title: 'Server Response (TTFB)', status: 'warn', description: `Slow response: ${input.fetchTimeMs}ms`, detail: 'Response time exceeds 1 second. Consider server-side caching, CDN, or upgrading hosting.' });
  } else {
    findings.push({ title: 'Server Response (TTFB)', status: 'fail', description: `Very slow response: ${input.fetchTimeMs}ms`, detail: 'Over 3 seconds is critically slow. This directly impacts Core Web Vitals (LCP). Check server, database, and hosting.' });
  }

  // Total page weight
  const sizeKb = Math.round(input.htmlSize / 1024);
  if (sizeKb < 50) {
    findings.push({ title: 'Page Weight (HTML)', status: 'pass', description: `Lightweight HTML: ${sizeKb}KB` });
  } else if (sizeKb < 200) {
    findings.push({ title: 'Page Weight (HTML)', status: 'pass', description: `HTML document: ${sizeKb}KB` });
  } else if (sizeKb < 500) {
    findings.push({ title: 'Page Weight (HTML)', status: 'warn', description: `Large HTML: ${sizeKb}KB`, detail: 'Large HTML slows down initial parsing. Consider reducing inline styles/scripts and removing unnecessary markup.' });
  } else {
    findings.push({ title: 'Page Weight (HTML)', status: 'fail', description: `Very large HTML: ${sizeKb}KB`, detail: 'HTML over 500KB severely impacts load time. Remove inline data, reduce DOM size, and lazy-load content.' });
  }

  // Render-blocking resources
  const blockingCSS = $('link[rel="stylesheet"]:not([media="print"]):not([media="(max-width"])').length;
  const blockingJS = $('script[src]:not([async]):not([defer]):not([type="module"])').length;

  if (blockingCSS + blockingJS === 0) {
    findings.push({ title: 'Render-Blocking Resources', status: 'pass', description: 'No render-blocking resources detected' });
  } else if (blockingCSS + blockingJS <= 3) {
    findings.push({ title: 'Render-Blocking Resources', status: 'warn', description: `${blockingCSS} blocking CSS, ${blockingJS} blocking JS files`, detail: 'Render-blocking resources delay First Contentful Paint. Use async/defer for scripts and consider critical CSS inlining.' });
  } else {
    findings.push({ title: 'Render-Blocking Resources', status: 'fail', description: `${blockingCSS + blockingJS} render-blocking resources`, detail: `${blockingCSS} stylesheets and ${blockingJS} scripts block rendering. This directly impacts LCP and FCP.` });
  }

  // Third-party scripts (performance impact)
  let thirdPartyScripts = 0;
  const thirdPartyDomains = new Set<string>();
  try {
    const pageHost = new URL(input.url).hostname;
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      try {
        const scriptHost = new URL(src, input.url).hostname;
        if (scriptHost !== pageHost) {
          thirdPartyScripts++;
          thirdPartyDomains.add(scriptHost);
        }
      } catch {
        // skip
      }
    });
  } catch {
    // skip
  }

  if (thirdPartyScripts === 0) {
    findings.push({ title: 'Third-Party Scripts', status: 'pass', description: 'No third-party scripts detected' });
  } else if (thirdPartyScripts <= 5) {
    findings.push({ title: 'Third-Party Scripts', status: 'pass', description: `${thirdPartyScripts} third-party scripts from ${thirdPartyDomains.size} domains` });
  } else if (thirdPartyScripts <= 15) {
    findings.push({ title: 'Third-Party Scripts', status: 'warn', description: `${thirdPartyScripts} third-party scripts from ${thirdPartyDomains.size} domains`, detail: 'Third-party scripts add latency. Audit and remove unused ones. Consider lazy-loading non-critical scripts.' });
  } else {
    findings.push({ title: 'Third-Party Scripts', status: 'fail', description: `Too many third-party scripts: ${thirdPartyScripts} from ${thirdPartyDomains.size} domains`, detail: 'Excessive third-party scripts severely impact INP and page speed. Audit and remove unnecessary ones.' });
  }

  // Caching headers
  const cacheControl = input.headers['cache-control'];
  if (cacheControl && (cacheControl.includes('max-age') || cacheControl.includes('s-maxage'))) {
    findings.push({ title: 'Caching Headers', status: 'pass', description: 'Cache-Control header is set', detail: cacheControl });
  } else if (cacheControl) {
    findings.push({ title: 'Caching Headers', status: 'warn', description: `Cache-Control: ${cacheControl}`, detail: 'Consider adding max-age or s-maxage for better caching performance.' });
  } else {
    findings.push({ title: 'Caching Headers', status: 'warn', description: 'No Cache-Control header found', detail: 'Set appropriate caching headers to reduce server load and speed up repeat visits.' });
  }

  // Compression
  const encoding = input.headers['content-encoding'];
  if (encoding && (encoding.includes('gzip') || encoding.includes('br') || encoding.includes('zstd'))) {
    findings.push({ title: 'Compression', status: 'pass', description: `Response compressed with ${encoding}`, detail: encoding.includes('br') ? 'Brotli compression provides best compression ratios.' : 'Gzip compression is enabled.' });
  } else {
    findings.push({ title: 'Compression', status: 'warn', description: 'No response compression detected', detail: 'Enable gzip or Brotli compression to reduce transfer sizes by 60-80%.' });
  }

  // CDN detection
  const cdnHeaders = ['x-cdn', 'x-cache', 'cf-ray', 'x-vercel-id', 'x-amz-cf-id', 'x-fastly-request-id', 'x-netlify-request-id'];
  const cdnFound = cdnHeaders.find((h) => input.headers[h]);
  const server = input.headers['server'] || '';
  const isCdn = cdnFound || /cloudflare|fastly|akamai|cloudfront|vercel|netlify/i.test(server);

  if (isCdn) {
    findings.push({ title: 'CDN', status: 'pass', description: 'Content delivery network detected', detail: 'CDN ensures fast delivery to users worldwide.' });
  } else {
    findings.push({ title: 'CDN', status: 'warn', description: 'No CDN detected', detail: 'A CDN (CloudFlare, Fastly, CloudFront) improves load times globally by serving from edge locations.' });
  }

  // DOM size estimation
  const allElements = $('*').length;
  if (allElements < 800) {
    findings.push({ title: 'DOM Size', status: 'pass', description: `${allElements} DOM elements`, detail: 'Lightweight DOM helps with fast rendering and low memory usage.' });
  } else if (allElements < 1500) {
    findings.push({ title: 'DOM Size', status: 'pass', description: `${allElements} DOM elements` });
  } else if (allElements < 3000) {
    findings.push({ title: 'DOM Size', status: 'warn', description: `${allElements} DOM elements`, detail: 'Large DOM increases memory usage and slows style recalculations. Aim for under 1,500 elements.' });
  } else {
    findings.push({ title: 'DOM Size', status: 'fail', description: `Very large DOM: ${allElements} elements`, detail: 'Oversized DOM (3000+) severely impacts INP and rendering performance. Simplify markup and lazy-render off-screen content.' });
  }

  return findings;
}
