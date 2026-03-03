'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AuditReport, CategoryResult, Finding, FindingStatus, ReportSection, SECTION_CATEGORIES } from '@/lib/types';

/* ─── Palette ─── */
const GRADE_COLORS: Record<string, string> = { A: '#34d399', B: '#34d399', C: '#fbbf24', D: '#f87171', F: '#f87171' };
const STATUS_COLORS: Record<FindingStatus, string> = { pass: '#34d399', warn: '#fbbf24', fail: '#f87171' };
const STATUS_LABELS: Record<FindingStatus, string> = { pass: 'PASS', warn: 'WARNING', fail: 'ISSUE' };
function scoreColor(s: number) { return s >= 75 ? '#34d399' : s >= 45 ? '#fbbf24' : '#f87171'; }

/* ─── Donut chart (reusable) ─── */
function DonutChart({ score, size = 120, strokeWidth = 10, label }: { score: number; size?: number; strokeWidth?: number; label?: string }) {
  const [val, setVal] = useState(0);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);

  useEffect(() => {
    let frame: number;
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / 1200, 1);
      setVal(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - (val / 100) * circ}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.08s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-white" style={{ fontSize: size * 0.26 }}>{val}</span>
        {label && <span className="text-[10px] text-[#a1a1aa] mt-0.5">{label}</span>}
      </div>
    </div>
  );
}

/* ─── Horizontal bar ─── */
function ScoreBar({ score, height = 8 }: { score: number; height?: number }) {
  const color = scoreColor(score);
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: '#27272a' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

/* ─── Stacked bar (pass/warn/fail proportions) ─── */
function StackedBar({ pass, warn, fail }: { pass: number; warn: number; fail: number }) {
  const total = pass + warn + fail;
  if (total === 0) return null;
  const pP = (pass / total) * 100;
  const wP = (warn / total) * 100;
  const fP = (fail / total) * 100;
  return (
    <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: '#27272a' }}>
      {pP > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${pP}%` }} transition={{ duration: 0.6 }} className="h-full" style={{ background: '#34d399' }} />}
      {wP > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${wP}%` }} transition={{ duration: 0.6, delay: 0.1 }} className="h-full" style={{ background: '#fbbf24' }} />}
      {fP > 0 && <motion.div initial={{ width: 0 }} animate={{ width: `${fP}%` }} transition={{ duration: 0.6, delay: 0.2 }} className="h-full" style={{ background: '#f87171' }} />}
    </div>
  );
}

/* ─── Star rating visual ─── */
function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.min(Math.max(rating - i, 0), 1);
        return (
          <svg key={i} className="w-5 h-5" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              fill={fill >= 0.99 ? '#fbbf24' : '#27272a'} />
            {fill > 0 && fill < 0.99 && (
              <defs>
                <clipPath id={`star-${i}`}><rect x="0" y="0" width={fill * 20} height="20" /></clipPath>
              </defs>
            )}
            {fill > 0 && fill < 0.99 && (
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                fill="#fbbf24" clipPath={`url(#star-${i})`} />
            )}
          </svg>
        );
      })}
    </div>
  );
}

/* ─── Finding row ─── */
function FindingRow({ finding }: { finding: Finding }) {
  const c = STATUS_COLORS[finding.status];
  return (
    <div className={`flex items-start gap-4 py-4 ${finding.status === 'fail' ? 'bg-[#f87171]/[0.03] -mx-6 px-6' : ''}`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${c}15` }}>
        {finding.status === 'pass' && <svg className="w-4 h-4" style={{ color: c }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        {finding.status === 'warn' && <svg className="w-4 h-4" style={{ color: c }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01" /></svg>}
        {finding.status === 'fail' && <svg className="w-4 h-4" style={{ color: c }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[15px] font-medium text-white">{finding.title}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: `${c}15`, color: c }}>
            {STATUS_LABELS[finding.status]}
          </span>
        </div>
        <p className="text-sm text-[#a1a1aa] leading-relaxed">{finding.description}</p>
        {finding.detail && <p className="text-xs text-[#71717a] mt-2 font-mono break-all bg-[#09090b] px-3 py-2 rounded-lg leading-relaxed">{finding.detail}</p>}
      </div>
    </div>
  );
}

/* ─── Category block (no accordion — always open, with graph) ─── */
function CategoryBlock({ category }: { category: CategoryResult }) {
  const color = GRADE_COLORS[category.grade] || '#ffd600';
  const pass = category.findings.filter(f => f.status === 'pass').length;
  const warn = category.findings.filter(f => f.status === 'warn').length;
  const fail = category.findings.filter(f => f.status === 'fail').length;
  const sorted = [...category.findings].sort((a, b) => {
    const o: Record<FindingStatus, number> = { fail: 0, warn: 1, pass: 2 };
    return o[a.status] - o[b.status];
  });

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
      {/* Category header with donut + stacked bar */}
      <div className="p-6 md:p-8">
        <div className="flex items-start gap-6">
          <DonutChart score={category.score} size={80} strokeWidth={7} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-white">{category.name}</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${color}15`, color }}>{category.grade}</span>
            </div>
            <StackedBar pass={pass} warn={warn} fail={fail} />
            <div className="flex items-center gap-4 mt-2">
              {fail > 0 && <span className="text-xs text-[#f87171]">{fail} issues</span>}
              {warn > 0 && <span className="text-xs text-[#fbbf24]">{warn} warnings</span>}
              <span className="text-xs text-[#34d399]">{pass} passed</span>
              <span className="text-xs text-[#71717a] ml-auto">{category.findings.length} checks</span>
            </div>
          </div>
        </div>
      </div>
      {/* All findings — always visible */}
      <div className="border-t border-[#27272a] px-6 md:px-8 py-2 divide-y divide-[#27272a]">
        {sorted.map((f, i) => <FindingRow key={i} finding={f} />)}
      </div>
    </div>
  );
}

/* ─── Section overview bar chart (horizontal bars for each category) ─── */
function SectionBarChart({ categories }: { categories: CategoryResult[] }) {
  return (
    <div className="space-y-3">
      {categories.map(c => (
        <div key={c.name} className="flex items-center gap-3">
          <span className="text-sm text-[#a1a1aa] w-32 flex-shrink-0 truncate">{c.name}</span>
          <div className="flex-1"><ScoreBar score={c.score} height={6} /></div>
          <span className="text-sm font-semibold w-8 text-right" style={{ color: scoreColor(c.score) }}>{c.score}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Section icons ─── */
const SECTION_ICONS: Record<string, string> = {
  'Technical SEO': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'On-Page SEO': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'Links & Authority': 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  'Mobile & UX': 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  'Ecommerce': 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
  'Search Performance': 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  'Local SEO': 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
};

/* ─── Full section ─── */
function SectionBlock({ section, categories, index }: { section: ReportSection; categories: CategoryResult[]; index: number }) {
  const sorted = [...categories].sort((a, b) => a.score - b.score);

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.1, duration: 0.5 }}
      className="scroll-mt-20"
      id={section.toLowerCase().replace(/[^a-z]+/g, '-')}
    >
      {/* Section header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
          <svg className="w-6 h-6 text-[#ffd600]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={SECTION_ICONS[section]} />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{section}</h2>
          <div className="h-px bg-gradient-to-r from-[#ffd600]/40 via-[#27272a] to-transparent mt-2" />
        </div>
      </div>

      {/* Bar chart overview */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 mb-6">
        <SectionBarChart categories={sorted} />
      </div>

      {/* Category blocks */}
      <div className="space-y-6 mb-16">
        {sorted.map(cat => <CategoryBlock key={cat.name} category={cat} />)}
      </div>
    </motion.section>
  );
}

/* ─── Main ─── */
export default function ReportPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cached = sessionStorage.getItem(`report-${params.id}`);
    if (cached) {
      try { setReport(JSON.parse(cached)); setLoading(false); return; } catch { /* fall through */ }
    }
    fetch(`/api/report/${params.id}`)
      .then(async r => { if (!r.ok) throw new Error('Report not found'); return r.json(); })
      .then(setReport)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const { sections, totalChecks, totalIssues, totalWarnings, totalPassed } = useMemo(() => {
    if (!report) return { sections: [], totalChecks: 0, totalIssues: 0, totalWarnings: 0, totalPassed: 0 };
    const sectionOrder: ReportSection[] = ['Local SEO', 'On-Page SEO', 'Technical SEO', 'Links & Authority', 'Search Performance', 'Mobile & UX', 'Ecommerce'];
    const secs: { section: ReportSection; categories: CategoryResult[] }[] = [];
    for (const s of sectionOrder) {
      const cats = report.categories.filter(c => SECTION_CATEGORIES[s].includes(c.name) && c.findings.length > 0);
      if (cats.length > 0) secs.push({ section: s, categories: cats });
    }
    return {
      sections: secs,
      totalChecks: report.categories.reduce((s, c) => s + c.findings.length, 0),
      totalIssues: report.categories.reduce((s, c) => s + c.findings.filter(f => f.status === 'fail').length, 0),
      totalWarnings: report.categories.reduce((s, c) => s + c.findings.filter(f => f.status === 'warn').length, 0),
      totalPassed: report.categories.reduce((s, c) => s + c.findings.filter(f => f.status === 'pass').length, 0),
    };
  }, [report]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#ffd600] border-t-transparent rounded-full animate-spin" />

      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Report Not Found</h1>
          <p className="text-[#a1a1aa] mb-6">This report may have expired or the link is invalid.</p>
          <a href="/" className="px-6 py-3 bg-[#ffd600] hover:bg-[#ffe033] text-black rounded-xl font-medium transition-colors inline-block">Run New Audit</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ─── Sticky nav ─── */}
      <nav className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-sm border-b border-[#27272a]">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ffd600] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <span className="font-semibold text-white">Oddfish Media</span>
          </a>
          {/* Section quick-links */}
          <div className="hidden md:flex items-center gap-1 text-xs">
            {sections.map(s => (
              <a key={s.section} href={`#${s.section.toLowerCase().replace(/[^a-z]+/g, '-')}`} className="px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors">
                {s.section.replace(' & ', '/')}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-16">

        {/* ─── Hero: score + context ─── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-16">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <DonutChart score={report.overallScore} size={220} strokeWidth={14} label={`Grade ${report.overallGrade}`} />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Website Audit Report</h1>
              <p className="text-[#a1a1aa] font-mono text-sm mb-1">{report.url}</p>
              <p className="text-xs text-[#71717a] mb-6">
                {new Date(report.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
                {report.siteType !== 'unknown' && <> &middot; <span className="capitalize">{report.siteType}</span> site</>}
              </p>

              {/* Summary */}
              {report.overallScore < 80 ? (
                <p className="text-sm text-[#d4d4d8] leading-relaxed mb-6 max-w-lg">
                  We found <span className="font-semibold text-[#f87171]">{totalIssues} critical issues</span> and{' '}
                  <span className="font-semibold text-[#fbbf24]">{totalWarnings} warnings</span> affecting your search rankings. Here&apos;s what to fix.
                </p>
              ) : (
                <p className="text-sm text-[#d4d4d8] leading-relaxed mb-6 max-w-lg">
                  Solid foundation. We still found <span className="font-semibold text-white">{totalIssues + totalWarnings} opportunities</span> to improve your rankings.
                </p>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { n: totalChecks, l: 'Checks', c: '#a1a1aa' },
                  { n: totalIssues, l: 'Issues', c: '#f87171' },
                  { n: totalWarnings, l: 'Warnings', c: '#fbbf24' },
                  { n: totalPassed, l: 'Passed', c: '#34d399' },
                ].map(s => (
                  <div key={s.l} className="bg-[#18181b] border border-[#27272a] rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold" style={{ color: s.c }}>{s.n}</div>
                    <div className="text-[11px] text-[#71717a] mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Urgency Banner ─── */}
        {totalIssues > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
            <div className="relative overflow-hidden bg-gradient-to-r from-[#f87171]/10 via-[#18181b] to-[#fbbf24]/10 border border-[#f87171]/20 rounded-2xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-5">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f87171] opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f87171]" />
                  </span>
                  <span className="text-sm font-bold text-[#f87171] uppercase tracking-wider">{totalIssues} issues found</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-lg font-bold text-white">Your website is losing traffic right now</p>
                  <p className="text-sm text-[#a1a1aa] mt-1">
                    We found {totalIssues} critical issues and {totalWarnings} warnings hurting your Google rankings. Every day unfixed = lost customers.
                  </p>
                </div>
                <a href="mailto:hello@oddfishmedia.com.au?subject=SEO%20Audit%20Follow-up" className="flex-shrink-0 px-6 py-3 bg-[#ffd600] hover:bg-[#ffe033] text-black rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-[#ffd600]/20 whitespace-nowrap">
                  Fix My Website
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── GMB — top of analysis if present ─── */}
        {report.gmbData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-16" id="google-business">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center justify-center">
                <svg className="w-6 h-6 text-[#ffd600]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">Google Business Profile</h2>
                <div className="h-px bg-gradient-to-r from-[#ffd600]/40 via-[#27272a] to-transparent mt-2" />
              </div>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden">
              {/* Business name + claimed badge */}
              <div className="p-6 md:p-8 border-b border-[#27272a]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{report.gmbData.businessName}</h3>
                    {report.gmbData.category && <p className="text-sm text-[#a1a1aa] mt-1">{report.gmbData.category}</p>}
                    {report.gmbData.address && <p className="text-xs text-[#71717a] mt-1">{report.gmbData.address}</p>}
                  </div>
                  {report.gmbData.isClaimed && (
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#34d399]/10 text-[#34d399]">Verified & Claimed</span>
                  )}
                </div>

                {/* Visual stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#09090b] rounded-xl p-5 text-center">
                    <div className="text-3xl font-bold text-white mb-1">{report.gmbData.rating.toFixed(1)}</div>
                    <Stars rating={report.gmbData.rating} />
                    <div className="text-xs text-[#71717a] mt-2">Rating</div>
                  </div>
                  <div className="bg-[#09090b] rounded-xl p-5 text-center">
                    <div className="text-3xl font-bold text-white mb-2">{report.gmbData.reviewCount.toLocaleString()}</div>
                    <div className="text-xs text-[#71717a]">Reviews</div>
                    {report.gmbData.reviewCount < 50 && (
                      <div className="text-[10px] text-[#fbbf24] mt-1">Aim for 50+</div>
                    )}
                  </div>
                  <div className="bg-[#09090b] rounded-xl p-5 text-center">
                    <div className="text-3xl font-bold text-white mb-2">{report.gmbData.totalPhotos}</div>
                    <div className="text-xs text-[#71717a]">Photos</div>
                    {report.gmbData.totalPhotos < 10 && (
                      <div className="text-[10px] text-[#fbbf24] mt-1">Add more photos</div>
                    )}
                  </div>
                  <div className="bg-[#09090b] rounded-xl p-5 text-center">
                    <div className="text-xl font-bold text-white mb-2 truncate">{report.gmbData.phone || 'Not listed'}</div>
                    <div className="text-xs text-[#71717a]">Phone</div>
                    {!report.gmbData.phone && (
                      <div className="text-[10px] text-[#f87171] mt-1">Missing</div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ─── AI Summary ─── */}
        {report.aiSummary && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-12">
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#ffd600]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#ffd600]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">AI Executive Summary</h2>
                  <p className="text-xs text-[#71717a]">Powered by Claude AI</p>
                </div>
              </div>
              <div className="text-sm text-[#d4d4d8] leading-relaxed whitespace-pre-line">{report.aiSummary}</div>
            </div>
          </motion.div>
        )}

        {/* ─── Mid-report CTA ─── */}
        {totalIssues > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-16">
            <a href="mailto:hello@oddfishmedia.com.au?subject=SEO%20Audit%20Follow-up" className="block bg-[#18181b] border border-[#ffd600]/20 rounded-2xl p-6 md:p-8 hover:border-[#ffd600]/40 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#ffd600]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-[#ffd600]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">Need help fixing these {totalIssues} issues?</p>
                    <p className="text-sm text-[#a1a1aa]">Our Australian SEO team can resolve them for you</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#ffd600] hidden sm:block">Get Expert Help &rarr;</span>
              </div>
            </a>
          </motion.div>
        )}

        {/* ─── Section blocks ─── */}
        {sections.map((s, i) => <SectionBlock key={s.section} section={s.section} categories={s.categories} index={i} />)}

        {/* ─── Keyword Opportunities ─── */}
        {report.keywordData && report.keywordData.topKeywords.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-16">
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Keyword Opportunities</h3>
                <div className="flex items-center gap-4 text-xs text-[#a1a1aa]">
                  <span>{report.keywordData.organicKeywords.toLocaleString()} keywords</span>
                  <span>~{report.keywordData.estimatedTraffic.toLocaleString()} monthly visits</span>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {report.keywordData.topKeywords.slice(0, 10).map((kw, i) => {
                  const maxPos = 100;
                  const barWidth = Math.max(5, ((maxPos - kw.position) / maxPos) * 100);
                  const color = kw.position <= 10 ? '#34d399' : kw.position <= 20 ? '#fbbf24' : '#f87171';
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-[#a1a1aa] w-40 truncate font-mono">{kw.keyword}</span>
                      <div className="flex-1 h-4 rounded bg-[#09090b] overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${barWidth}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                          className="h-full rounded" style={{ backgroundColor: color }} />
                      </div>
                      <span className="text-xs font-bold w-8 text-right" style={{ color }}>#{kw.position}</span>
                      <span className="text-xs text-[#71717a] w-16 text-right">{kw.volume.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-[#71717a]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#34d399]" />Top 10</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#fbbf24]" />Top 20</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f87171]" />20+</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Bottom CTA ─── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 mb-16">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-8 md:p-12 text-center">
            {totalIssues > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f87171]/10 text-[#f87171] text-xs font-medium mb-5">
                <span className="w-2 h-2 bg-[#f87171] rounded-full animate-pulse" />
                {totalIssues} issues need fixing
              </div>
            )}
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {totalIssues > 0 ? 'Every day these issues go unfixed, you lose traffic' : 'Ready to improve your SEO?'}
            </h2>
            <p className="text-sm text-[#a1a1aa] mb-8 max-w-lg mx-auto leading-relaxed">
              {totalIssues > 0
                ? 'These issues are actively hurting your search rankings. Our Australian SEO team can fix them and get your site performing at its best.'
                : 'Our team can help you implement these recommendations and drive more organic traffic to your site.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="mailto:hello@oddfishmedia.com.au?subject=SEO%20Audit%20Follow-up" className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#ffd600] hover:bg-[#ffe033] text-black rounded-xl font-semibold text-base transition-all hover:shadow-lg hover:shadow-[#ffd600]/20">
                Book a Free Strategy Call
              </a>
            </div>
            <p className="text-xs text-[#71717a] mt-5">Trusted by Australian businesses</p>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-[#27272a] px-6 py-8">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs text-[#71717a]">&copy; {new Date().getFullYear()} Oddfish Media. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
