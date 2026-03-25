import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Clock, RotateCcw, Target, ShieldAlert } from 'lucide-react';

import { Button } from '@item-bank/ui';
import { useAssessmentBrief, useStartAttempt } from '../../../features/learn/hooks';

/**
 * Pre-exam briefing page.
 *
 * Fetches AssessmentBrief on mount and displays:
 *   - Title and description
 *   - Info grid: time limit, question count, passing score, attempts remaining
 *   - Anti-cheat warning (only when anti_cheat_enabled === true)
 *   - "Start Exam" button → calls startAttempt → navigates to /take with state
 *
 * If attempts_remaining === 0, the Start button is disabled.
 */
export default function PreExamPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const id = parseInt(assessmentId ?? '0', 10);
  const { data: brief, isLoading, isError } = useAssessmentBrief(id);
  const { mutate: start, isPending } = useStartAttempt();

  const handleStart = () => {
    start(id, {
      onSuccess: (session) => {
        navigate(`/learn/exams/${id}/take`, {
          state: {
            attemptId: session.attempt_id,
            questions: session.questions,
            deadlineAt: session.deadline_at,
            antiCheatEnabled: brief?.anti_cheat_enabled ?? false,
            assessmentTitle: brief?.title ?? '',
          },
        });
      },
    });
  };

  if (isLoading) {
    return (
      <main className="w-full max-w-2xl mx-auto px-6 py-12 flex flex-col gap-6">
        <div className="h-8 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (isError || !brief) {
    return (
      <main className="w-full max-w-2xl mx-auto px-6 py-12">
        <p className="text-destructive">{t('learn.loading_error')}</p>
      </main>
    );
  }

  const attemptsExhausted = brief.attempts_remaining <= 0;

  return (
    <main className="w-full max-w-2xl mx-auto px-6 py-12 flex flex-col gap-8">
      {/* Back link */}
      <Link
        to="/learn/dashboard"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        {t('learn.back_to_dashboard')}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">{brief.title}</h1>
        {brief.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{brief.description}</p>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard
          icon={<Clock size={18} className="text-primary" />}
          label={t('learn.time_limit')}
          value={
            brief.time_limit_mins !== null
              ? t('learn.time_limit_minutes', { count: brief.time_limit_mins })
              : t('learn.no_limit')
          }
        />
        <InfoCard
          icon={<Target size={18} className="text-primary" />}
          label={t('learn.question_count')}
          value={String(brief.question_count)}
        />
        <InfoCard
          icon={<Target size={18} className="text-primary" />}
          label={t('learn.passing_score')}
          value={`${brief.passing_score_percent}%`}
        />
        <InfoCard
          icon={<RotateCcw size={18} className="text-primary" />}
          label={t('learn.attempts_remaining_label')}
          value={
            attemptsExhausted
              ? t('learn.no_attempts_remaining')
              : t('learn.attempts_remaining', { count: brief.attempts_remaining })
          }
        />
      </div>

      {/* Anti-cheat warning */}
      {brief.anti_cheat_enabled && (
        <div className="flex gap-3 rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
          <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('learn.anti_cheat_title')}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              {t('learn.anti_cheat_description')}
            </p>
          </div>
        </div>
      )}

      {/* No attempts remaining */}
      {attemptsExhausted && (
        <p className="text-sm text-destructive font-medium">
          {t('learn.no_attempts_remaining_detail')}
        </p>
      )}

      {/* CTA */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleStart}
          disabled={attemptsExhausted || isPending}
          className="flex items-center gap-2"
        >
          {isPending ? t('learn.starting') : t('learn.start_exam')}
          {!isPending && <ArrowRight size={16} />}
        </Button>
      </div>
    </main>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
