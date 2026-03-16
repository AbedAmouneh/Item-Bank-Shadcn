import { useCallback, useMemo, useState } from 'react';
import { Check, RotateCcw, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@item-bank/ui';
import type { HighlightCorrectWordQuestionViewProps } from './types';
import {
  sanitizeHighlightHtml,
  extractPlainText,
  tokenizeText,
  buildRunsFromIndices,
  getCorrectTokenRuns,
  getSolutionTokenIndices,
  computeScore,
} from './utils';

/** Resolves Tailwind classes for a single token based on its interaction state. */
function getTokenClass(
  idx: number,
  checked: boolean,
  showSolution: boolean,
  selectedIndices: Set<number>,
  solutionIndices: Set<number>,
  runCorrectnessMap: Map<number, boolean>
): string {
  if (showSolution && solutionIndices.has(idx)) {
    return 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-400 font-semibold';
  }
  if (checked && runCorrectnessMap.has(idx)) {
    const isCorrect = runCorrectnessMap.get(idx) === true;
    return isCorrect
      ? 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-400 font-semibold'
      : 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400 font-semibold';
  }
  if (!checked && selectedIndices.has(idx)) {
    return 'bg-primary/[0.12] border-primary text-primary font-semibold';
  }
  return 'border-transparent text-foreground';
}

const HighlightCorrectWordQuestionView = ({ question }: HighlightCorrectWordQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');

  const penaltyPercent = question.highlightPenaltyPercent ?? 25;

  // Sanitize once: removes editor controls so tokens and solution are clean.
  const sanitizedHtml = useMemo(
    () => sanitizeHighlightHtml(question.question_text ?? ''),
    [question.question_text]
  );

  const tokens = useMemo(() => {
    const plain = extractPlainText(sanitizedHtml);
    return tokenizeText(plain);
  }, [sanitizedHtml]);

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const correctRuns = useMemo(
    () => getCorrectTokenRuns(sanitizedHtml),
    [sanitizedHtml]
  );

  // Build runs from current selection, split by authored highlight boundaries
  // so adjacent correct spans are scored independently.
  const selectedRuns = useMemo(
    () => buildRunsFromIndices(tokens, selectedIndices, correctRuns),
    [tokens, selectedIndices, correctRuns]
  );

  // Score (only computed after Check)
  const score = useMemo(() => {
    if (!checked) return null;
    return computeScore(question.mark, penaltyPercent, selectedRuns, correctRuns);
  }, [checked, selectedRuns, correctRuns, question.mark, penaltyPercent]);

  // Precompute: which token indices belong to authored correct highlights (for Show Solution).
  const solutionIndices = useMemo(
    () => getSolutionTokenIndices(sanitizedHtml),
    [sanitizedHtml]
  );

  // Precompute: for each selected token, whether its run is correct (post-check).
  // Exact position-based: a run is correct only when it exactly matches
  // one authored highlighted run token span.
  const runCorrectnessMap = useMemo(() => {
    const map = new Map<number, boolean>();
    if (!checked || !score) return map;
    for (let i = 0; i < selectedRuns.length; i++) {
      const run = selectedRuns[i];
      const isCorrect = score.selectedRunIsCorrect[i] === true;
      run.indices.forEach((idx) => map.set(idx, isCorrect));
    }
    return map;
  }, [checked, score, selectedRuns]);

  const handleTokenClick = useCallback(
    (idx: number) => {
      if (checked || showSolution) return;
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
    },
    [checked, showSolution]
  );

  const handleCheck = useCallback(() => setChecked(true), []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setShowSolution(false);
    setSelectedIndices(new Set());
  }, []);

  const handleShowSolution = useCallback(() => setShowSolution(true), []);

  const hasSelection = selectedIndices.size > 0;
  const isFullyCorrect = score?.isFullyCorrect ?? false;

  const formatNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language).format(n),
    [i18n.language]
  );

  return (
    <>
      {/* Clickable token text */}
      <div className="text-base leading-loose mb-6 text-foreground break-words">
        {tokens.map((token, idx) => {
          const isInteractive = !checked && !showSolution;
          const tokenClass = getTokenClass(
            idx,
            checked,
            showSolution,
            selectedIndices,
            solutionIndices,
            runCorrectnessMap
          );

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleTokenClick(idx)}
              tabIndex={isInteractive ? 0 : -1}
              onKeyDown={
                isInteractive
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTokenClick(idx);
                      }
                    }
                  : undefined
              }
              className={cn(
                'inline-block px-0.5 py-[0.125rem] ms-0.5 me-0.5 rounded-[0.1875rem] border',
                'transition-all duration-150 select-none leading-[1.8]',
                isInteractive
                  ? 'cursor-pointer hover:bg-primary/[0.08] hover:border-primary/50'
                  : 'cursor-default pointer-events-none',
                tokenClass
              )}
            >
              {token}
            </button>
          );
        })}

        {tokens.length === 0 && (
          <span className="text-sm text-muted-foreground italic">—</span>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={checked ? handleRetry : handleCheck}
            disabled={!checked && !hasSelection}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {checked ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {checked ? t('retry') : t('check')}
          </button>

          {checked && !isFullyCorrect && !showSolution && (
            <button
              type="button"
              onClick={handleShowSolution}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90"
            >
              <Lightbulb className="w-4 h-4" />
              {t('show_solution')}
            </button>
          )}

          {checked && score && (
            <span
              className={cn(
                'inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold border',
                isFullyCorrect
                  ? 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-400'
                  : 'bg-muted border-border text-muted-foreground'
              )}
            >
              {formatNum(score.earned)} / {formatNum(question.mark)}
            </span>
          )}
        </div>

        {/* Mark badge */}
        <div className="py-2 px-4 rounded-xl border border-border bg-background font-semibold text-[0.95rem] text-foreground">
          {formatNum(question.mark)}
        </div>
      </div>
    </>
  );
};

export default HighlightCorrectWordQuestionView;
