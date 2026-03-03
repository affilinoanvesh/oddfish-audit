import Anthropic from '@anthropic-ai/sdk';
import { AuditReport } from './types';

export async function generateAiSummary(report: AuditReport): Promise<string | undefined> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set, skipping AI summary');
    return undefined;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build a concise summary of the report for the prompt
  const categoryLines = report.categories
    .map(c => {
      const issues = c.findings.filter(f => f.status === 'fail').length;
      const warns = c.findings.filter(f => f.status === 'warn').length;
      const passes = c.findings.filter(f => f.status === 'pass').length;
      return `- ${c.name}: ${c.score}/100 (Grade ${c.grade}) — ${issues} issues, ${warns} warnings, ${passes} passed`;
    })
    .join('\n');

  const topIssues = report.categories
    .flatMap(c => c.findings.filter(f => f.status === 'fail').map(f => `[${c.name}] ${f.title}: ${f.description}`))
    .slice(0, 10)
    .join('\n');

  const topWarnings = report.categories
    .flatMap(c => c.findings.filter(f => f.status === 'warn').map(f => `[${c.name}] ${f.title}: ${f.description}`))
    .slice(0, 5)
    .join('\n');

  const keywordInfo = report.keywordData
    ? `\nKeyword Data: ${report.keywordData.organicKeywords} organic keywords, ~${report.keywordData.estimatedTraffic} monthly traffic`
    : '';

  const prompt = `You are an SEO expert writing a personalized executive summary for a website audit report. Write in plain, professional English — no jargon unless necessary. Be direct and actionable.

Website: ${report.url}
Site Type: ${report.siteType}
Overall Score: ${report.overallScore}/100 (Grade ${report.overallGrade})
${keywordInfo}

Category Scores:
${categoryLines}

Top Issues (Critical):
${topIssues || 'None'}

Top Warnings:
${topWarnings || 'None'}

Write a 3-4 paragraph executive summary:
1. First paragraph: Plain-English assessment of the site's overall SEO health and what the score means
2. Second paragraph: The top 3 most impactful issues and why they matter for the business
3. Third paragraph: Specific, prioritized action items the site owner should tackle first
4. Optional fourth paragraph: Quick wins that could improve the score quickly

Keep it under 300 words. Do not use bullet points — write in flowing paragraphs. Do not include the score number or grade letter in the text. Address the reader as "your site" or "your website."`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    return textBlock?.text ?? undefined;
  } catch (err) {
    console.warn('AI summary generation failed:', err);
    return undefined;
  }
}
