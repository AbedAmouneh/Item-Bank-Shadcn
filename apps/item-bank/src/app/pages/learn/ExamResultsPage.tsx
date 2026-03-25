import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw, BookOpen, Download } from 'lucide-react';

import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@item-bank/ui';
import { useAttemptResult } from '../../../features/learn/hooks';

/**
 * Exam results page — fetches the graded result for one attempt.
 *
 * Displays:
 *   - Pass / Fail indicator
 *   - Score percentage (large)
 *   - Stats: correct count, time taken, attempt number
 *   - Download Certificate (disabled, coming soon)
 *   - Review Answers link
 *   - Retake button (when attempts_remaining > 0)
 *   - Back to My Learning link
 */
export default function ExamResultsPage() {
  const { assessmentId, attemptId } = useParams<{
    assessmentId: string;
    attemptId: string;
  }>();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const assessmentIdNum = parseInt(assessmentId ?? '0', 10);
  const attemptIdNum = parseInt(attemptId ?? '0', 10);

  const { data: result, isLoading, isError } = useAttemptResult(attemptIdNum);

  if (isLoading) {
    return (
      <main className="w-full max-w-xl mx-auto px-6 py-12 flex flex-col gap-6 items-center">
        <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
        <div className="h-10 w-32 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-3 gap-4 w-full">
          {Array.from({ length: 3 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !result) {
    return (
      <main className="w-full max-w-xl mx-auto px-6 py-12">
        <p className="text-destructive">{t('learn.loading_error')}</p>
      </main>
    );
  }

  const minutesTaken = Math.floor(result.time_taken_seconds / 60);
  const secondsTaken = result.time_taken_seconds % 60;
  const timeTakenFormatted = t('learn.time_taken_format', { minutes: minutesTaken, seconds: secondsTaken });

  return (
    <main className="w-full max-w-xl mx-auto px-6 py-12 flex flex-col gap-8 items-center text-center">
      {/* Pass / Fail indicator */}
      {result.passed ? (
        <CheckCircle2 size={72} className="text-green-500" aria-hidden />
      ) : (
        <XCircle size={72} className="text-destructive" aria-hidden />
      )}

      {/* Score */}
      <div className="flex flex-col gap-1">
        <p className="text-5xl font-bold text-foreground">{result.score_percent}%</p>
        <p
          className={`text-lg font-semibold ${
            result.passed ? 'text-green-600 dark:text-green-400' : 'text-destructive'
          }`}
        >
          {result.passed ? t('learn.passed') : t('learn.not_passed')}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 w-full">
        <StatCard
          label={t('learn.correct')}
          value={`${result.correct_count}/${result.total_count}`}
        />
        <StatCard label={t('learn.time_taken')} value={timeTakenFormatted} />
        <StatCard label={t('learn.attempt_number')} value={String(result.attempt_number)} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full">
        {/* Download Certificate — coming soon */}
        {result.passed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="w-full">
                  <Button variant="outline" disabled className="w-full gap-2">
                    <Download size={16} />
                    {t('learn.download_certificate')}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('learn.coming_soon')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Review Answers */}
        <Button
          variant="outline"
          onClick={() =>
            navigate(`/learn/exams/${assessmentIdNum}/review/${attemptIdNum}`)
          }
          className="w-full gap-2"
        >
          <BookOpen size={16} />
          {t('learn.review_answers')}
        </Button>

        {/* Retake */}
        {result.attempts_remaining > 0 && (
          <Button
            onClick={() => navigate(`/learn/exams/${assessmentIdNum}`)}
            className="w-full gap-2"
          >
            <RotateCcw size={16} />
            {t('learn.retake_exam')}
          </Button>
        )}
      </div>

      {/* Back to My Learning */}
      <Link
        to="/learn/dashboard"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        {t('learn.back_to_dashboard')}
      </Link>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
