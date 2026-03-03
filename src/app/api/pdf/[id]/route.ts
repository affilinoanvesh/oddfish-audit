import { NextResponse } from 'next/server';
import { getReport } from '@/lib/store';
import { renderToBuffer } from '@react-pdf/renderer';
import { AuditPdfDocument } from '@/lib/pdf';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const report = getReport(params.id);

  if (!report) {
    return NextResponse.json({ error: 'Report not found or expired' }, { status: 404 });
  }

  try {
    const buffer = await renderToBuffer(AuditPdfDocument({ report }));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="seo-audit-${report.id}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
