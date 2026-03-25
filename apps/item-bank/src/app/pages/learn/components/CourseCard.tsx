import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button, Badge } from '@item-bank/ui';
import type { LearnerCourse } from '@item-bank/types';

/** Five deterministic gradient classes picked by course.id % 5. */
const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-400 to-rose-500',
  'from-violet-500 to-purple-700',
  'from-sky-400 to-cyan-600',
] as const;

function dueDateVariant(dateStr: string): 'overdue' | 'soon' | 'normal' {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 72 * 60 * 60 * 1000) return 'soon';
  return 'normal';
}

type CourseCardProps = { course: LearnerCourse };

/**
 * Displays a single learner course as a card with thumbnail, progress bar,
 * due-date badge, and a CTA button.
 */
export function CourseCard({ course }: CourseCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const gradient = GRADIENTS[course.id % GRADIENTS.length];
  const ctaLabel =
    course.status === 'not_started'
      ? t('learn.start')
      : course.status === 'completed'
        ? t('learn.review')
        : t('learn.continue');

  // Completed courses never show overdue/soon — the work is already done.
  const variant =
    course.due_date && course.status !== 'completed' ? dueDateVariant(course.due_date) : null;

  return (
    <div
      className="flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden cursor-pointer transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring"
      onClick={() => navigate(`/learn/courses/${course.id}`)}
      role="article"
      aria-label={course.title}
    >
      {course.thumbnail_url ? (
        <img src={course.thumbnail_url} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className={`h-36 w-full bg-gradient-to-br ${gradient}`} aria-hidden="true" />
      )}

      <div className="flex flex-col gap-3 p-4 flex-1">
        <p className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
          {course.title}
        </p>

        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${course.progress_percent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{course.progress_percent}%</p>
        </div>

        {variant && course.due_date && (
          <Badge
            className={
              variant === 'overdue'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 w-fit'
                : variant === 'soon'
                  ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 w-fit'
                  : 'w-fit'
            }
          >
            {variant === 'overdue'
              ? t('learn.overdue')
              : variant === 'soon'
                ? t('learn.due_soon')
                : new Date(course.due_date).toLocaleDateString()}
          </Badge>
        )}

        <Button
          size="sm"
          className="mt-auto"
          onClick={(e) => { e.stopPropagation(); navigate(`/learn/courses/${course.id}`); }}
          aria-label={`${ctaLabel}: ${course.title}`}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
