import * as cheerio from 'cheerio';
import { Finding, AnalyzerInput } from '../types';

export function analyzeHeadings(input: AnalyzerInput): Finding[] {
  const $ = cheerio.load(input.html);
  const findings: Finding[] = [];

  // H1 count
  const h1s = $('h1');
  if (h1s.length === 0) {
    findings.push({ title: 'H1 Tag', status: 'fail', description: 'No H1 tag found', detail: 'The H1 is the most important on-page heading signal. Every page MUST have exactly one H1 containing your primary keyword.' });
  } else if (h1s.length === 1) {
    const h1Text = h1s.first().text().trim();
    if (h1Text.length < 10) {
      findings.push({ title: 'H1 Tag', status: 'warn', description: `H1 is very short (${h1Text.length} chars)`, detail: `"${h1Text}" — Your H1 should be descriptive and include your target keyword. Short H1s miss a major ranking signal.` });
    } else if (h1Text.length > 70) {
      findings.push({ title: 'H1 Tag', status: 'warn', description: `H1 is too long (${h1Text.length} chars)`, detail: `"${h1Text.substring(0, 80)}..." — Keep H1 under 60-70 characters for maximum impact. Overly long H1s dilute keyword focus.` });
    } else {
      findings.push({ title: 'H1 Tag', status: 'pass', description: `H1 tag is well-formatted (${h1Text.length} chars)`, detail: `"${h1Text.substring(0, 100)}"` });
    }
  } else {
    findings.push({ title: 'H1 Tag', status: 'fail', description: `Multiple H1 tags found (${h1s.length})`, detail: 'Having multiple H1s confuses Google about your page topic. Use exactly one H1 for your primary keyword, then H2-H6 for subtopics.' });
  }

  // H1 keyword match with title
  if (h1s.length === 1) {
    const h1Text = h1s.first().text().trim().toLowerCase();
    const title = $('title').text().trim().toLowerCase();
    if (title && h1Text) {
      const h1Words = h1Text.split(/\s+/).filter(w => w.length > 3);
      const titleWords = title.split(/\s+/).filter(w => w.length > 3);
      const overlap = h1Words.filter(w => titleWords.includes(w)).length;
      const overlapRatio = h1Words.length > 0 ? overlap / h1Words.length : 0;

      if (overlapRatio < 0.2) {
        findings.push({ title: 'H1/Title Alignment', status: 'warn', description: 'H1 and title tag have little keyword overlap', detail: 'Your H1 and title should target the same primary keyword. When they diverge, you send mixed signals about what the page is about.' });
      }
    }
  }

  // Heading hierarchy
  const headingLevels: number[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tag: string = (el as any).tagName || (el as any).name;
    headingLevels.push(parseInt(tag.charAt(1)));
  });

  let gapCount = 0;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] - headingLevels[i - 1] > 1) gapCount++;
  }

  if (headingLevels.length === 0) {
    findings.push({ title: 'Heading Structure', status: 'fail', description: 'No headings found on the page', detail: 'Headings (H1-H6) are essential for SEO. They create content hierarchy, help screen readers, and give Google clear topic signals. This page has zero heading structure.' });
  } else if (gapCount > 2) {
    findings.push({ title: 'Heading Hierarchy', status: 'fail', description: `${gapCount} heading hierarchy gaps found`, detail: 'Skipping heading levels (e.g., H1 → H3, H2 → H4) breaks content structure. Fix the hierarchy: H1 → H2 → H3 with no gaps.' });
  } else if (gapCount > 0) {
    findings.push({ title: 'Heading Hierarchy', status: 'warn', description: `${gapCount} heading hierarchy gap(s)`, detail: 'Skipping levels (e.g., H2 → H4) can confuse screen readers and weakens your content structure signal to Google.' });
  } else {
    findings.push({ title: 'Heading Hierarchy', status: 'pass', description: 'Heading hierarchy is properly structured' });
  }

  // H2 count — need subheadings for content structure
  const h2Count = $('h2').length;
  if (h2Count === 0) {
    findings.push({ title: 'Subheadings (H2)', status: 'fail', description: 'No H2 subheadings found', detail: 'H2 tags break content into scannable sections and are a strong secondary keyword signal. Every page should have multiple H2s targeting related keywords.' });
  } else if (h2Count < 3) {
    findings.push({ title: 'Subheadings (H2)', status: 'warn', description: `Only ${h2Count} H2 subheading(s) — need more content structure`, detail: 'Top-ranking pages typically have 5-10+ H2 subheadings. Each H2 is an opportunity to target a related keyword and improve content depth.' });
  } else {
    findings.push({ title: 'Subheadings (H2)', status: 'pass', description: `${h2Count} H2 subheadings provide good content structure` });
  }

  // H3+ depth
  const h3Count = $('h3').length;
  if (h2Count >= 2 && h3Count === 0) {
    findings.push({ title: 'Content Depth (H3)', status: 'warn', description: 'No H3 sub-sections found', detail: 'Adding H3 headings within H2 sections creates deeper content structure. This signals comprehensive topic coverage to Google and improves featured snippet eligibility.' });
  }

  // Heading count summary
  const counts: Record<string, number> = {};
  for (let i = 1; i <= 6; i++) {
    const count = $(`h${i}`).length;
    if (count > 0) counts[`H${i}`] = count;
  }
  const summary = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ');

  if (headingLevels.length > 0) {
    findings.push({ title: 'Heading Count', status: 'pass', description: `${headingLevels.length} headings found`, detail: summary });
  }

  // Duplicate headings — stricter
  const headingTexts: string[] = [];
  $('h1, h2, h3').each((_, el) => { headingTexts.push($(el).text().trim().toLowerCase()); });
  const dupes = headingTexts.filter((t, i) => t.length > 3 && headingTexts.indexOf(t) !== i);
  if (dupes.length > 2) {
    findings.push({ title: 'Duplicate Headings', status: 'fail', description: `${dupes.length} duplicate headings — confusing Google`, detail: `Repeated: "${dupes[0]}". Each heading should be unique and target different keyword variations. Duplicate headings waste ranking potential.` });
  } else if (dupes.length > 0) {
    findings.push({ title: 'Duplicate Headings', status: 'warn', description: `${dupes.length} duplicate heading(s) found`, detail: `"${dupes[0]}" — Use unique, keyword-varied headings throughout your content.` });
  }

  // Keyword stuffing in headings
  const headingTextAll = headingTexts.join(' ');
  const headingWords = headingTextAll.split(/\s+/).filter(w => w.length > 3);
  const headingFreq: Record<string, number> = {};
  headingWords.forEach(w => { headingFreq[w] = (headingFreq[w] || 0) + 1; });
  const stuffed = Object.entries(headingFreq).filter(([, c]) => c > 4);
  if (stuffed.length > 0) {
    findings.push({ title: 'Heading Keyword Stuffing', status: 'warn', description: `Word "${stuffed[0][0]}" appears ${stuffed[0][1]} times across headings`, detail: 'Over-repeating keywords in headings can trigger Google spam filters. Use natural variations and synonyms instead.' });
  }

  return findings;
}
