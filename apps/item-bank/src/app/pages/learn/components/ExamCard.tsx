import { useTranslation } from 'react-i18next';
import { Clock, RotateCcw } from 'lucide-react';

import { Button, Badge } from '@item-bank/ui';
import type { LearnerExam } from '@item-bank/types';

type ExamCardProps = { exam: LearnerExam };

/**
 * Displays a single exam row with attempt info, last score, and a CTA.
 * All CTAs are disabled — exam navigation is Batch 3B.
 */
export function ExamCard({ exam }: ExamCardProps) {
  const { t } = useTranslation('common');
  const attemptsRemaining = exam.max_attempts - exam.attempts_used;
  const isExhausted = exam.attempts_used >= exam.max_attempts && !exam.last_passed;

  const ctaLabel = (() => {
    if (exam.last_passed) return t('learn.view_results');
    if (isExhausted) return t('learn.no_attempts_remaining');
    if (exam.attempts_used === 0 || exam.status === 'in_progress') return t('learn.start_exam');
    return t('learn.retake');
  })();

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{exam.title}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {exam.time_limit_mins !== null
              ? `${exam.time_limit_mins} min`
              : t('learn.no_limit')}
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw size={12} />
            {attemptsRemaining > 0
              ? t('learn.attempts_remaining_other', { count: attemptsRemaining })
              : t('learn.no_attempts_remaining')}
          </span>
          {exam.last_score !== null && (
            <Badge className={exam.last_passed
              ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
            }>
              {exam.last_score}%
            </Badge>
          )}
        </div>
      </div>
      {/* CTA disabled — exam UI is Batch 3B */}
      <Button
        size="sm"
        variant={isExhausted ? 'ghost' : 'default'}
        disabled
        className="shrink-0"
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
