import { useTranslation } from 'react-i18next';

import { Button, Badge } from '@item-bank/ui';
import type { LearnerAssignment } from '@item-bank/types';

function dueDateVariant(dateStr: string): 'overdue' | 'soon' | 'normal' {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 72 * 60 * 60 * 1000) return 'soon';
  return 'normal';
}

type AssignmentCardProps = { assignment: LearnerAssignment };

/**
 * Displays a single learner assignment: title, due date, status badge,
 * and CTA buttons (disabled — submission flow is Batch 3B).
 */
export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const { t } = useTranslation('common');
  const variant = assignment.due_date ? dueDateVariant(assignment.due_date) : null;

  const statusBadge: Record<LearnerAssignment['status'], React.ReactNode> = {
    not_submitted: (
      <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
        {t('learn.not_submitted')}
      </span>
    ),
    draft: (
      <span className="flex items-center gap-1.5 text-sm text-yellow-700 dark:text-yellow-400">
        <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" />
        {t('learn.draft')}
      </span>
    ),
    submitted: (
      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
        {t('learn.awaiting_review')}
      </Badge>
    ),
    graded: (
      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
        {assignment.score !== null
          ? `${assignment.score} / ${assignment.max_score}`
          : t('learn.view_feedback')}
      </Badge>
    ),
  };

  const ctaLabel =
    assignment.status === 'not_submitted'
      ? t('learn.submit')
      : assignment.status === 'draft'
        ? t('learn.continue_draft')
        : t('learn.view_feedback');

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{assignment.title}</p>
        {assignment.due_date && variant && (
          <p className={`text-xs ${
            variant === 'overdue'
              ? 'text-red-600 dark:text-red-400'
              : variant === 'soon'
                ? 'text-yellow-700 dark:text-yellow-400'
                : 'text-muted-foreground'
          }`}>
            {variant === 'overdue'
              ? t('learn.overdue')
              : variant === 'soon'
                ? t('learn.due_soon')
                : new Date(assignment.due_date).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {statusBadge[assignment.status]}
        {/* CTA disabled — submission flow is Batch 3B */}
        <Button size="sm" variant="outline" disabled>{ctaLabel}</Button>
      </div>
    </div>
  );
}
