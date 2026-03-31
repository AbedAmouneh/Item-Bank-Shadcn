import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

import { useAttemptResult } from '../../../features/learn/hooks';
import type { AttemptResultQuestion } from '@item-bank/types';

/** Pill label — small rounded tag used above section headings. */
function PillLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      {children}
    </span>
  );
}

/**
 * Answer review page — shows all questions with learner answers vs correct answers.
 *
 * For each question displays:
 *   - Question number badge (pill style) and text
 *   - Learner's answer (formatted)
 *   - Correct answer (formatted)
 *   - ✅ or ❌ indicator
 *   - Explanation (when present in content)
 *   - Points awarded / possible
 */
export default function AnswerReviewPage() {
  const { assessmentId, attemptId } = useParams<{
    assessmentId: string;
    attemptId: string;
  }>();
  const { t } = useTranslation('common');

  const attemptIdNum = parseInt(attemptId ?? '0', 10);
  const assessmentIdNum = parseInt(assessmentId ?? '0', 10);

  const { data: result, isLoading, isError } = useAttemptResult(attemptIdNum);

  if (isLoading) {
    return (
      <main className="w-full max-w-3xl mx-auto px-6 py-10 flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="h-36 rounded-2xl border-2 border-border bg-card animate-pulse" />
        ))}
      </main>
    );
  }

  if (isError || !result) {
    return (
      <main className="w-full max-w-3xl mx-auto px-6 py-10">
        <p className="text-destructive">{t('learn.loading_error')}</p>
      </main>
    );
  }

  const sorted = [...result.questions].sort((a, b) => a.position - b.position);

  return (
    <main className="w-full max-w-3xl mx-auto px-6 py-10 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <PillLabel>📖 {t('learn.answer_review_title')}</PillLabel>
          <Link
            to={`/learn/exams/${assessmentIdNum}/results/${attemptIdNum}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
            {t('learn.back_to_results')}
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('learn.answer_review_title')}
        </h1>
      </div>

      {/* Question list */}
      <div className="flex flex-col gap-4">
        {sorted.map((q) => (
          <ReviewQuestionCard key={q.id} question={q} t={t} />
        ))}
      </div>
    </main>
  );
}

function formatAnswer(question: AttemptResultQuestion, answer: unknown): string {
  if (answer === null || answer === undefined) return '—';

  if (question.type === 'multiple_choice' && question.content.choices) {
    const choice = question.content.choices.find((c) => c.id === String(answer));
    return choice?.text ?? String(answer);
  }

  if (question.type === 'true_false') {
    return String(answer) === 'true' ? 'True' : 'False';
  }

  return String(answer);
}

interface ReviewQuestionCardProps {
  question: AttemptResultQuestion;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function ReviewQuestionCard({ question, t }: ReviewQuestionCardProps) {
  return (
    <div
      className={`rounded-2xl border-2 bg-card p-5 flex flex-col gap-4 ${
        question.is_correct ? 'border-green-500/30' : 'border-destructive/30'
      }`}
    >
      {/* Question header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Pill-style question number badge */}
          <span className="inline-flex self-start items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {t('learn.question_number', { number: question.position })}
          </span>
          <p className="text-sm font-medium text-foreground leading-relaxed">
            {question.content.text}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {question.is_correct ? (
            <CheckCircle2
              size={20}
              className="text-green-500"
              aria-label={t('learn.correct')}
            />
          ) : (
            <XCircle
              size={20}
              className="text-destructive"
              aria-label={t('learn.incorrect')}
            />
          )}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {question.points_awarded}/{question.points_possible} {t('learn.points')}
          </span>
        </div>
      </div>

      {/* Answers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">{t('learn.your_answer')}</p>
          <p
            className={`text-sm px-3 py-2 rounded-xl ${
              question.is_correct
                ? 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-300'
                : 'bg-destructive/5 text-destructive'
            }`}
          >
            {formatAnswer(question, question.learner_answer?.value)}
          </p>
        </div>
        {!question.is_correct && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t('learn.correct_answer')}
            </p>
            <p className="text-sm px-3 py-2 rounded-xl bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-300">
              {formatAnswer(question, question.correct_answer.value)}
            </p>
          </div>
        )}
      </div>

      {/* Explanation */}
      {question.content.explanation && (
        <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium">{t('learn.explanation')}: </span>
          {question.content.explanation}
        </div>
      )}
    </div>
  );
}
