import { useState, useEffect } from 'react';

import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';

import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@item-bank/ui';
import type { ExamQuestion as ExamQuestionType, QuestionAnswer } from '@item-bank/types';
import { useSubmitAttempt } from '../../../features/learn/hooks';
import { useExam } from './hooks/useExam';
import { useExamTimer } from './hooks/useExamTimer';
import { useAntiCheat } from './hooks/useAntiCheat';
import { ExamQuestion } from './components/ExamQuestion';
import { QuestionMap } from './components/QuestionMap';
import { TimerDisplay } from './components/TimerDisplay';

interface ExamLocationState {
  attemptId: number;
  questions: ExamQuestionType[];
  deadlineAt: string | null;
  antiCheatEnabled: boolean;
  assessmentTitle: string;
}

/**
 * Full-screen exam page — rendered outside LearnerShell so it owns the viewport.
 *
 * Receives attempt context via React Router location state (set by PreExamPage).
 * If no valid state is present (e.g. direct URL navigation), redirects to the
 * pre-exam page.
 *
 * Key behaviours:
 *   - Timer counts down from deadline_at; auto-submits at zero
 *   - Answers are debounce-saved every 800 ms on change
 *   - "Save & Next" saves immediately then advances
 *   - Anti-cheat listeners attached when anti_cheat_enabled === true
 *   - Submit confirmation shows answered / total count
 */
export default function ExamPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');

  const state = location.state as ExamLocationState | null;
  const { mutate: submit, isPending: isSubmitting } = useSubmitAttempt();

  // Redirect if no valid attempt state (e.g. direct URL navigation).
  useEffect(() => {
    if (!state?.attemptId) {
      navigate(`/learn/exams/${assessmentId ?? ''}`, { replace: true });
    }
  }, [state, assessmentId, navigate]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const attemptId = state?.attemptId ?? 0;
  const questions = state?.questions ?? [];
  const deadlineAt = state?.deadlineAt ?? null;
  const antiCheatEnabled = state?.antiCheatEnabled ?? false;
  const assessmentTitle = state?.assessmentTitle ?? '';

  const { answers, flagged, saveAnswerDebounced, saveAnswerImmediate, toggleFlag, answeredCount } =
    useExam(attemptId);

  const handleSubmitConfirmed = () => {
    submit(attemptId, {
      onSuccess: (result) => {
        navigate(`/learn/exams/${assessmentId}/results/${result.attempt_id}`, { replace: true });
      },
      onError: () => {
        toast.error(t('learn.submit_error'));
      },
    });
  };

  const { secondsLeft, isWarning } = useExamTimer({
    deadlineAt,
    onExpire: handleSubmitConfirmed,
  });

  useAntiCheat({
    enabled: antiCheatEnabled,
    attemptId,
    onViolation: (type) => {
      const messages: Record<string, string> = {
        tab_switch: t('learn.violation_tab_switch'),
        copy_paste: t('learn.violation_copy'),
        fullscreen_exit: t('learn.violation_fullscreen'),
      };
      toast.warning(messages[type] ?? t('learn.violation_generic'));
    },
    onFullscreenExit: () => setShowFullscreenModal(true),
  });

  // Do not render exam content until state is confirmed valid.
  if (!state?.attemptId) return null;

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  const handleAnswerChange = (answer: QuestionAnswer) => {
    if (!currentQuestion) return;
    saveAnswerDebounced(currentQuestion.id, answer);
  };

  const handleSaveAndNext = async () => {
    if (currentQuestion && currentAnswer) {
      await saveAnswerImmediate(currentQuestion.id, currentAnswer).catch(() => undefined);
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleReenterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(() => undefined);
    setShowFullscreenModal(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-card shrink-0">
        <p className="font-semibold text-sm text-foreground truncate max-w-xs">
          {assessmentTitle}
        </p>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {t('learn.question_of', {
            current: currentIndex + 1,
            total: questions.length,
          })}
        </p>
        <TimerDisplay secondsLeft={secondsLeft} isWarning={isWarning} />
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          {currentQuestion && (
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('learn.question_number', { number: currentQuestion.position })}
                {currentQuestion.points > 0 && (
                  <span className="ms-2 text-muted-foreground/60">
                    ({currentQuestion.points} {t('learn.points')})
                  </span>
                )}
              </p>
              <ExamQuestion
                question={currentQuestion}
                answer={currentAnswer}
                onChange={handleAnswerChange}
              />
            </div>
          )}
        </main>

        {/* Question map panel */}
        <aside
          className={`relative shrink-0 border-s border-border bg-card overflow-y-auto transition-all duration-200 ${
            panelOpen ? 'w-52' : 'w-10'
          }`}
        >
          {panelOpen && (
            <QuestionMap
              questions={questions}
              currentIndex={currentIndex}
              answers={answers}
              flagged={flagged}
              onNavigate={setCurrentIndex}
              onToggleFlag={toggleFlag}
            />
          )}
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            className="absolute start-0 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-6 -translate-x-full rounded-s border border-e-0 border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label={panelOpen ? t('learn.collapse_map') : t('learn.expand_map')}
          >
            <ChevronRight
              size={14}
              className={`transition-transform ${panelOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </aside>
      </div>

      {/* ── Bottom bar ───────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card shrink-0">
        <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0}>
          <ArrowLeft size={16} className="me-1.5" />
          {t('learn.previous')}
        </Button>

        <div className="flex items-center gap-2">
          {/* Submit button + confirmation dialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isSubmitting}>
                {t('learn.submit_exam')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('learn.submit_confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('learn.submit_confirm_body', {
                    answered: answeredCount,
                    total: questions.length,
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('learn.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmitConfirmed} disabled={isSubmitting}>
                  {isSubmitting ? t('learn.submitting') : t('learn.confirm_submit')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={handleSaveAndNext}
            disabled={currentIndex === questions.length - 1}
          >
            {t('learn.save_next')}
            <ArrowRight size={16} className="ms-1.5" />
          </Button>
        </div>
      </footer>

      {/* ── Fullscreen-exit modal (anti-cheat) ───────────────────────────── */}
      <Dialog open={showFullscreenModal} onOpenChange={() => undefined}>
        <DialogContent
          className="sm:max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t('learn.fullscreen_exit_title')}</DialogTitle>
            <DialogDescription>{t('learn.fullscreen_exit_description')}</DialogDescription>
          </DialogHeader>
          <Button onClick={handleReenterFullscreen} className="w-full">
            {t('learn.return_fullscreen')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
