import fs from 'fs';
import path from 'path';
import { AuditReport } from './types';

const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');
const URL_INDEX_PATH = path.join(REPORTS_DIR, '_url-index.json');
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

interface UrlIndexEntry {
  reportId: string;
  createdAt: string;
}

type UrlIndex = Record<string, UrlIndexEntry>;

function ensureDir(): void {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

function readUrlIndex(): UrlIndex {
  try {
    const data = fs.readFileSync(URL_INDEX_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeUrlIndex(index: UrlIndex): void {
  fs.writeFileSync(URL_INDEX_PATH, JSON.stringify(index, null, 2));
}

export function saveReport(report: AuditReport): void {
  ensureDir();

  const filePath = path.join(REPORTS_DIR, `${report.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));

  const index = readUrlIndex();
  const normalizedUrl = normalizeUrl(report.url);
  index[normalizedUrl] = {
    reportId: report.id,
    createdAt: report.createdAt,
  };
  writeUrlIndex(index);
}

export function getReport(id: string): AuditReport | null {
  try {
    const filePath = path.join(REPORTS_DIR, `${id}.json`);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as AuditReport;
  } catch {
    return null;
  }
}

export function getReportByUrl(url: string): AuditReport | null {
  const index = readUrlIndex();
  const normalizedUrl = normalizeUrl(url);
  const entry = index[normalizedUrl];

  if (!entry) return null;

  const age = Date.now() - new Date(entry.createdAt).getTime();
  if (age > CACHE_MAX_AGE) return null;

  return getReport(entry.reportId);
}
