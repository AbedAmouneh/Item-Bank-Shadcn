import type { QuestionStatus } from '../db/db';

/**
 * Normalizes a stored question status to a valid QuestionStatus type.
 * Accepts both the title-case UI values ('Draft', 'Published', 'In Review')
 * and the snake_case API values ('draft', 'published', 'in_review').
 */
export function normalizeStatus(status: string): QuestionStatus {
  if (status === 'Draft' || status === 'draft') return 'Draft';
  if (status === 'Published' || status === 'published') return 'Published';
  if (status === 'In Review' || status === 'in_review') return 'In Review';
  return 'Draft';
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
