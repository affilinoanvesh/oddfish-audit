import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzePerformance(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];

  // Fetch time
  if (input.fetchTimeMs < 1000) {
    findings.push({ title: 'Server Response', status: 'pass', description: `Page responded in ${input.fetchTimeMs}ms`, detail: 'Fast server response time (under 1 second).' });
  } else if (input.fetchTimeMs < 3000) {
    findings.push({ title: 'Server Response', status: 'warn', description: `Page responded in ${input.fetchTimeMs}ms`, detail: 'Response time is acceptable but could be improved. Aim for under 1 second.' });
  } else {
    findings.push({ title: 'Server Response', status: 'fail', description: `Slow response: ${input.fetchTimeMs}ms`, detail: 'Server response time exceeds 3 seconds. Check server configuration and hosting.' });
  }

  // HTML size
  const sizeKb = Math.round(input.htmlSize / 1024);
  if (sizeKb < 100) {
    findings.push({ title: 'HTML Size', status: 'pass', description: `HTML document is ${sizeKb}KB` });
  } else if (sizeKb < 500) {
    findings.push({ title: 'HTML Size', status: 'warn', description: `HTML document is ${sizeKb}KB`, detail: 'Consider reducing HTML size for faster initial load.' });
  } else {
    findings.push({ title: 'HTML Size', status: 'fail', description: `HTML is very large: ${sizeKb}KB`, detail: 'Large HTML documents slow down parsing and rendering.' });
  }

  // Script count
  const scripts = $('script[src]').length;
  const inlineScripts = $('script:not([src])').length;
  if (scripts + inlineScripts <= 10) {
    findings.push({ title: 'Scripts', status: 'pass', description: `${scripts} external, ${inlineScripts} inline scripts` });
  } else if (scripts + inlineScripts <= 25) {
    findings.push({ title: 'Scripts', status: 'warn', description: `${scripts} external, ${inlineScripts} inline scripts`, detail: 'Consider bundling or deferring scripts to reduce render-blocking.' });
  } else {
    findings.push({ title: 'Scripts', status: 'fail', description: `Too many scripts: ${scripts} external, ${inlineScripts} inline`, detail: 'Excessive scripts impact load time. Bundle, defer, or remove unused scripts.' });
  }

  // Stylesheet count
  const stylesheets = $('link[rel="stylesheet"]').length;
  const inlineStyles = $('style').length;
  if (stylesheets + inlineStyles <= 5) {
    findings.push({ title: 'Stylesheets', status: 'pass', description: `${stylesheets} external, ${inlineStyles} inline stylesheets` });
  } else if (stylesheets + inlineStyles <= 15) {
    findings.push({ title: 'Stylesheets', status: 'warn', description: `${stylesheets} external, ${inlineStyles} inline stylesheets`, detail: 'Consider combining stylesheets to reduce HTTP requests.' });
  } else {
    findings.push({ title: 'Stylesheets', status: 'fail', description: `Too many stylesheets: ${stylesheets} external, ${inlineStyles} inline` });
  }

  // Resource hints
  const preconnect = $('link[rel="preconnect"]').length;
  const prefetch = $('link[rel="prefetch"], link[rel="dns-prefetch"]').length;
  const preload = $('link[rel="preload"]').length;
  const totalHints = preconnect + prefetch + preload;

  if (totalHints > 0) {
    findings.push({ title: 'Resource Hints', status: 'pass', description: `${totalHints} resource hints found`, detail: `Preconnect: ${preconnect}, Prefetch: ${prefetch}, Preload: ${preload}` });
  } else {
    findings.push({ title: 'Resource Hints', status: 'warn', description: 'No resource hints found', detail: 'Use preconnect, prefetch, and preload to speed up critical resources.' });
  }

  return findings;
}
