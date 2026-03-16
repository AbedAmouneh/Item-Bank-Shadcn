import type { QuestionStatus } from '../db/db';

/**
 * Normalizes a stored question status to a valid QuestionStatus type
 */
export function normalizeStatus(status: string): QuestionStatus {
  return (status === 'Draft' || status === 'Published' || status === 'In Review'
    ? status
    : 'Draft') as QuestionStatus;
}

/**
 * Formats a date string or Date object to a localized date string
 * Returns the original string if parsing fails
 */
export function formatLastModified(lastModified: string | Date): string {
  try {
    const d = new Date(lastModified);
    return Number.isNaN(d.getTime()) ? String(lastModified) : d.toLocaleDateString();
  } catch {
    return String(lastModified);
  }
}
