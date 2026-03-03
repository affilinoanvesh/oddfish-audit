import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { AuditReport, Finding, ReportSection, SECTION_CATEGORIES } from './types';

const colors = {
  bg: '#09090b',
  card: '#18181b',
  accent: '#ffd600',
  text: '#fafafa',
  muted: '#a1a1aa',
  pass: '#34d399',
  warn: '#fbbf24',
  fail: '#f87171',
  border: '#27272a',
};

const styles = StyleSheet.create({
  page: { backgroundColor: colors.bg, padding: 40, color: colors.text, fontFamily: 'Helvetica' },
  coverPage: { backgroundColor: colors.bg, padding: 40, color: colors.text, fontFamily: 'Helvetica', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.accent, marginBottom: 8 },
  subtitle: { fontSize: 12, color: colors.muted, marginBottom: 24 },
  scoreBox: { backgroundColor: colors.card, borderRadius: 8, padding: 24, alignItems: 'center', marginBottom: 24, width: '100%' },
  scoreNum: { fontSize: 48, fontWeight: 'bold', color: colors.accent },
  scoreLabel: { fontSize: 11, color: colors.muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.accent, marginBottom: 8, marginTop: 20 },
  table: { marginBottom: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.card, padding: 8, borderRadius: 4 },
  tableHeaderCell: { fontSize: 9, fontWeight: 'bold', color: colors.muted, textTransform: 'uppercase' as const },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableCell: { fontSize: 10, color: colors.text },
  finding: { flexDirection: 'row', marginBottom: 6, paddingVertical: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, marginTop: 3 },
  findingText: { flex: 1 },
  findingTitle: { fontSize: 10, fontWeight: 'bold', color: colors.text },
  findingDesc: { fontSize: 9, color: colors.muted, marginTop: 2 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: colors.muted },
  url: { fontSize: 11, color: colors.muted, marginBottom: 4 },
  meta: { fontSize: 10, color: colors.muted },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 12 },
  catName: { fontSize: 12, fontWeight: 'bold', color: colors.text },
  catScore: { fontSize: 10, color: colors.accent },
});

function StatusDot({ status }: { status: Finding['status'] }) {
  const color = status === 'pass' ? colors.pass : status === 'warn' ? colors.warn : colors.fail;
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

export function AuditPdfDocument({ report }: { report: AuditReport }) {
  const totalIssues = report.categories.reduce((s, c) => s + c.findings.filter(f => f.status === 'fail').length, 0);
  const totalWarnings = report.categories.reduce((s, c) => s + c.findings.filter(f => f.status === 'warn').length, 0);

  // Build sections
  const sectionOrder: ReportSection[] = ['Technical SEO', 'On-Page SEO', 'Links & Authority', 'Mobile & UX', 'Search Performance', 'Local SEO', 'Ecommerce'];
  const sections = sectionOrder
    .map(section => ({
      section,
      categories: report.categories.filter(c => SECTION_CATEGORIES[section].includes(c.name) && c.findings.length > 0),
    }))
    .filter(s => s.categories.length > 0);

  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.title}>SEO Audit Report</Text>
        <Text style={styles.url}>{report.url}</Text>
        <Text style={styles.meta}>Prepared for {report.name} • {new Date(report.createdAt).toLocaleDateString()}</Text>

        <View style={styles.scoreBox}>
          <Text style={styles.scoreNum}>{report.overallScore}</Text>
          <Text style={styles.scoreLabel}>Overall Score — Grade {report.overallGrade}</Text>
        </View>

        <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 16 }}>
          {totalIssues} critical issues • {totalWarnings} warnings • {report.categories.reduce((s, c) => s + c.findings.length, 0)} total checks
        </Text>

        {/* Section summary table */}
        <View style={[styles.table, { width: '100%' }]}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Section</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Categories</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Avg Score</Text>
          </View>
          {sections.map((s, i) => {
            const avg = Math.round(s.categories.reduce((sum, c) => sum + c.score, 0) / s.categories.length);
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{s.section}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{s.categories.length}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{avg}/100</Text>
              </View>
            );
          })}
        </View>

        <Text style={{ fontSize: 10, color: colors.muted, marginTop: 8 }}>
          Site type: {report.siteType} • HTML size: {Math.round(report.htmlSize / 1024)}KB • Response time: {report.fetchTimeMs}ms
        </Text>
        <Text style={styles.footer}>Generated by Oddfish Media SEO Audit Tool</Text>
      </Page>

      {/* AI Executive Summary page */}
      {report.aiSummary && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>AI Executive Summary</Text>
          <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.6, marginBottom: 16 }}>
            {report.aiSummary}
          </Text>
          <Text style={{ fontSize: 8, color: colors.muted, marginTop: 8 }}>Powered by Claude AI</Text>
          <Text style={styles.footer}>Generated by Oddfish Media SEO Audit Tool</Text>
        </Page>
      )}

      {/* Keyword data page */}
      {report.keywordData && (
        <Page size="A4" style={styles.page}>
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>Keyword Rankings</Text>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 12 }}>
              {report.keywordData.organicKeywords.toLocaleString()} organic keywords • ~{report.keywordData.estimatedTraffic.toLocaleString()} monthly traffic
            </Text>
            {report.keywordData.topKeywords.length > 0 && (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Keyword</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Position</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Volume</Text>
                </View>
                {report.keywordData.topKeywords.map((kw, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 3 }]}>{kw.keyword}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: kw.position <= 10 ? colors.pass : kw.position <= 20 ? colors.warn : colors.fail }]}>{kw.position}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{kw.volume.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <Text style={styles.footer}>Generated by Oddfish Media SEO Audit Tool</Text>
        </Page>
      )}

      {/* Detailed findings pages — one per section */}
      {sections.map((s, si) => (
        <Page key={si} size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>{s.section}</Text>
          {s.categories
            .sort((a, b) => a.score - b.score)
            .map((cat, ci) => (
              <View key={ci} wrap={false} style={{ marginBottom: 16 }}>
                <View style={styles.catHeader}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catScore}>{cat.score}/100 ({cat.grade})</Text>
                </View>
                {[...cat.findings]
                  .sort((a, b) => {
                    const order = { fail: 0, warn: 1, pass: 2 };
                    return order[a.status] - order[b.status];
                  })
                  .map((f, fi) => (
                    <View key={fi} style={styles.finding}>
                      <StatusDot status={f.status} />
                      <View style={styles.findingText}>
                        <Text style={styles.findingTitle}>{f.title}: {f.description}</Text>
                        {f.detail && <Text style={styles.findingDesc}>{f.detail}</Text>}
                      </View>
                    </View>
                  ))}
              </View>
            ))}
          <Text style={styles.footer}>Generated by Oddfish Media SEO Audit Tool</Text>
        </Page>
      ))}
    </Document>
  );
}
