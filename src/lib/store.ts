import { AuditReport } from './types';

const TTL = 24 * 60 * 60 * 1000; // 24 hours

interface StoreEntry {
  report: AuditReport;
  expiresAt: number;
}

const store = new Map<string, StoreEntry>();

export function saveReport(report: AuditReport): void {
  store.set(report.id, {
    report,
    expiresAt: Date.now() + TTL,
  });
}

export function getReport(id: string): AuditReport | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(id);
    return null;
  }
  return entry.report;
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, id) => {
    if (now > entry.expiresAt) {
      store.delete(id);
    }
  });
}, 60 * 60 * 1000); // every hour
