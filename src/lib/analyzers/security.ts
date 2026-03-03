import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzeSecurity(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];

  // HTTPS check
  const isHttps = input.url.startsWith('https://');
  if (isHttps) {
    findings.push({ title: 'HTTPS', status: 'pass', description: 'Site uses HTTPS encryption' });
  } else {
    findings.push({ title: 'HTTPS', status: 'fail', description: 'Site does not use HTTPS', detail: 'HTTPS is a confirmed Google ranking signal and essential for user trust. Migrate to HTTPS immediately.' });
  }

  // Mixed content
  let mixedContent = 0;
  const mixedUrls: string[] = [];
  $('img[src], script[src], link[href], iframe[src], video[src], audio[src], source[src]').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('href') || '';
    if (src.startsWith('http://') && isHttps) {
      mixedContent++;
      if (mixedUrls.length < 3) mixedUrls.push(src.substring(0, 80));
    }
  });

  if (mixedContent === 0) {
    findings.push({ title: 'Mixed Content', status: 'pass', description: 'No mixed content issues detected' });
  } else {
    findings.push({ title: 'Mixed Content', status: 'fail', description: `${mixedContent} mixed content references found`, detail: `HTTP resources on HTTPS page: ${mixedUrls.join(', ')}${mixedContent > 3 ? '...' : ''}` });
  }

  // HSTS header
  const hsts = input.headers['strict-transport-security'];
  if (hsts) {
    findings.push({ title: 'HSTS Header', status: 'pass', description: 'Strict-Transport-Security header is set', detail: hsts });
  } else {
    findings.push({ title: 'HSTS Header', status: 'warn', description: 'No HSTS header found', detail: 'HSTS forces browsers to always use HTTPS, preventing downgrade attacks.' });
  }

  // Content Security Policy
  const cspMeta = $('meta[http-equiv="Content-Security-Policy"]').attr('content');
  const cspHeader = input.headers['content-security-policy'];
  if (cspMeta || cspHeader) {
    findings.push({ title: 'Content Security Policy', status: 'pass', description: 'CSP is configured' });
  } else {
    findings.push({ title: 'Content Security Policy', status: 'warn', description: 'No Content Security Policy found', detail: 'CSP helps prevent XSS attacks and other code injection vulnerabilities.' });
  }

  // X-Frame-Options
  const xframe = input.headers['x-frame-options'];
  if (xframe) {
    findings.push({ title: 'X-Frame-Options', status: 'pass', description: `X-Frame-Options: ${xframe}` });
  } else {
    findings.push({ title: 'X-Frame-Options', status: 'warn', description: 'No X-Frame-Options header', detail: 'Protects against clickjacking attacks.' });
  }

  // X-Content-Type-Options
  const xcontent = input.headers['x-content-type-options'];
  if (xcontent === 'nosniff') {
    findings.push({ title: 'X-Content-Type-Options', status: 'pass', description: 'X-Content-Type-Options: nosniff is set' });
  } else {
    findings.push({ title: 'X-Content-Type-Options', status: 'warn', description: 'No X-Content-Type-Options header', detail: 'Add "nosniff" to prevent MIME type sniffing.' });
  }

  return findings;
}
