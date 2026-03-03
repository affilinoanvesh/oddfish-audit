import { Resend } from 'resend';
import { AuditReport } from './types';

let resend: Resend | null = null;
function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY || '');
  }
  return resend;
}

export async function sendLeadEmail(report: AuditReport): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email');
    return;
  }
  const categoryRows = report.categories
    .map((c) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #2a2a3a">${c.name}</td><td style="padding:6px 12px;border-bottom:1px solid #2a2a3a;text-align:center">${c.score}/100</td><td style="padding:6px 12px;border-bottom:1px solid #2a2a3a;text-align:center">${c.grade}</td></tr>`)
    .join('');

  const reportUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/report/${report.id}`;

  await getResend().emails.send({
    from: 'Oddfish Media SEO Audit <hello@oddfishmedia.com.au>',
    to: 'hello@oddfishmedia.com.au',
    subject: `New SEO Audit Lead: ${report.name} (${report.overallGrade})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e0e0e0;padding:32px;border-radius:12px">
        <h1 style="color:#ffd600;margin-bottom:24px">New SEO Audit Lead</h1>

        <table style="width:100%;margin-bottom:24px">
          <tr><td style="color:#8888a0;padding:4px 0">Name</td><td style="padding:4px 0">${report.name}</td></tr>
          <tr><td style="color:#8888a0;padding:4px 0">Email</td><td style="padding:4px 0"><a href="mailto:${report.email}" style="color:#ffd600">${report.email}</a></td></tr>
          <tr><td style="color:#8888a0;padding:4px 0">Website</td><td style="padding:4px 0"><a href="${report.url}" style="color:#ffd600">${report.url}</a></td></tr>
          ${report.company ? `<tr><td style="color:#8888a0;padding:4px 0">Company</td><td style="padding:4px 0">${report.company}</td></tr>` : ''}
          <tr><td style="color:#8888a0;padding:4px 0">Site Type</td><td style="padding:4px 0">${report.siteType}</td></tr>
        </table>

        <div style="text-align:center;margin:24px 0;padding:24px;background:#12121a;border-radius:8px">
          <div style="font-size:48px;font-weight:700;color:#ffd600">${report.overallScore}</div>
          <div style="font-size:14px;color:#8888a0">Overall Score — Grade ${report.overallGrade}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr style="color:#8888a0">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #2a2a3a">Category</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #2a2a3a">Score</th>
            <th style="padding:8px 12px;text-align:center;border-bottom:2px solid #2a2a3a">Grade</th>
          </tr>
          ${categoryRows}
        </table>

        ${report.keywordData ? `
        <div style="margin-bottom:16px;padding:16px;background:#12121a;border-radius:8px">
          <div style="font-size:12px;color:#8888a0;margin-bottom:8px">Search Performance</div>
          <div style="display:flex;gap:16px">
            <span style="font-size:14px;color:#e0e0e0"><strong>${report.keywordData.organicKeywords.toLocaleString()}</strong> organic keywords</span>
            <span style="font-size:14px;color:#e0e0e0"><strong>~${report.keywordData.estimatedTraffic.toLocaleString()}</strong> monthly traffic</span>
          </div>
        </div>` : ''}

        <a href="${reportUrl}" style="display:inline-block;padding:12px 24px;background:#ffd600;color:white;text-decoration:none;border-radius:6px;font-weight:600">View Full Report</a>
      </div>
    `,
  });
}
