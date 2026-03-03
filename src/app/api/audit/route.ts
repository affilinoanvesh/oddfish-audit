import { NextResponse } from 'next/server';
import { leadFormSchema } from '@/lib/schemas';
import { runAudit } from '@/lib/analyzer';
import { saveReport } from '@/lib/store';
import { sendLeadEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = leadFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, website, company, businessName, businessLocation } = parsed.data;

    const report = await runAudit({ url: website, name, email, company, businessName, businessLocation });
    saveReport(report);

    // Fire-and-forget email
    sendLeadEmail(report).catch((err) => {
      console.error('Failed to send lead email:', err);
    });

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Audit failed';
    console.error('Audit error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
