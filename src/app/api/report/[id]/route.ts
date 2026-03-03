import { NextResponse } from 'next/server';
import { getReport } from '@/lib/store';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const report = getReport(params.id);

  if (!report) {
    return NextResponse.json({ error: 'Report not found or expired' }, { status: 404 });
  }

  return NextResponse.json(report);
}
