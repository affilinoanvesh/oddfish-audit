import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzeMobile(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];

  // Viewport meta tag
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  if (!viewport) {
    findings.push({ title: 'Viewport Meta', status: 'fail', description: 'No viewport meta tag found', detail: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile responsiveness.' });
  } else if (viewport.includes('width=device-width')) {
    findings.push({ title: 'Viewport Meta', status: 'pass', description: 'Viewport is properly configured', detail: viewport });
  } else {
    findings.push({ title: 'Viewport Meta', status: 'warn', description: 'Viewport meta found but may not be optimal', detail: viewport });
  }

  // Touch icon
  const touchIcon = $('link[rel="apple-touch-icon"]').length > 0;
  if (touchIcon) {
    findings.push({ title: 'Touch Icon', status: 'pass', description: 'Apple touch icon is defined' });
  } else {
    findings.push({ title: 'Touch Icon', status: 'warn', description: 'No Apple touch icon found', detail: 'Touch icons improve the appearance when users bookmark your site on mobile.' });
  }

  // Text size / readability hints
  const smallFont = $('[style*="font-size"]').filter((_, el) => {
    const style = $(el).attr('style') || '';
    const match = style.match(/font-size:\s*(\d+)/);
    return match ? parseInt(match[1]) < 12 : false;
  }).length;

  if (smallFont > 0) {
    findings.push({ title: 'Font Sizes', status: 'warn', description: `${smallFont} elements have font-size below 12px`, detail: 'Small text is hard to read on mobile devices.' });
  } else {
    findings.push({ title: 'Font Sizes', status: 'pass', description: 'No excessively small inline font sizes detected' });
  }

  // Media queries hint (check for responsive stylesheets)
  const responsiveLink = $('link[media*="max-width"], link[media*="min-width"]').length > 0;
  const responsiveMeta = viewport.includes('width=device-width');
  if (responsiveLink || responsiveMeta) {
    findings.push({ title: 'Responsive Design', status: 'pass', description: 'Responsive design indicators found' });
  } else {
    findings.push({ title: 'Responsive Design', status: 'warn', description: 'No responsive design signals detected', detail: 'Ensure your site adapts to different screen sizes.' });
  }

  return findings;
}
