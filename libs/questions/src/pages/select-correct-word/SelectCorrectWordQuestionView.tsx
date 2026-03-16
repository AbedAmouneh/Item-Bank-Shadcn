import { useCallback, useMemo, useState } from 'react';
import { Check, RotateCcw, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@item-bank/ui';
import type { SelectCorrectWordQuestionViewProps } from './types';
import { decodeGroups, sanitizeKeyHtml, parseQuestionText } from './utils';

/** Resolves the Tailwind colour variant for an option chip based on interaction state. */
function getOptionChipClass(
  isSelected: boolean,
  isCorrect: boolean,
  isChecked: boolean,
  showSolution: boolean
): string {
  if (showSolution && isCorrect) {
    return 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-400 font-semibold';
  }
  if (isChecked && isSelected) {
    return isCorrect
      ? 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-400 font-semibold'
      : 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400 font-semibold';
  }
  if (isSelected) {
    return 'bg-primary/12 border-primary text-primary font-semibold';
  }
  return 'bg-transparent border-border/50 text-foreground';
}

const SelectCorrectWordQuestionView = ({ question }: SelectCorrectWordQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');
  const allowPartialCredit = question.selectWordAllowPartialCredit ?? false;

  const groups = useMemo(() => decodeGroups(question.choices), [question.choices]);
  const parsedParts = useMemo(
    () => parseQuestionText(sanitizeKeyHtml(question.question_text ?? '')),
    [question.question_text]
  );

  const [selectedByKey, setSelectedByKey] = useState<Record<string, number | null>>({});
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const allKeys = useMemo(() => Object.keys(groups), [groups]);

  const score = useMemo(() => {
    if (!checked) return null;
    if (allKeys.length === 0) return { earned: 0, isFullyCorrect: false };
    const correctCount = allKeys.filter((key) => {
      const selected = selectedByKey[key];
      const correctOpt = groups[key]?.options.find((o) => o.isCorrect);
      return selected !== null && selected !== undefined && correctOpt && selected === correctOpt.id;
    }).length;
    if (allowPartialCredit) {
      const earned = Math.round((correctCount / allKeys.length) * question.mark * 100) / 100;
      return { earned, isFullyCorrect: correctCount === allKeys.length };
    }
    const isFullyCorrect = correctCount === allKeys.length;
    return { earned: isFullyCorrect ? question.mark : 0, isFullyCorrect };
  }, [checked, selectedByKey, groups, allKeys, allowPartialCredit, question.mark]);

  const isAllCorrect = score?.isFullyCorrect ?? false;

  const handleSelect = useCallback(
    (key: string, optId: number) => {
      if (checked) return;
      setSelectedByKey((prev) => ({ ...prev, [key]: optId }));
    },
    [checked]
  );

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setShowSolution(false);
    setSelectedByKey({});
  }, []);

  const handleShowSolution = useCallback(() => {
    setShowSolution(true);
  }, []);

  const hasAllSelections =
    allKeys.length > 0 &&
    allKeys.every((key) => selectedByKey[key] !== null && selectedByKey[key] !== undefined);

  const formatNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language).format(n),
    [i18n.language]
  );

  return (
    <>
      <div className="text-base leading-[2] mb-6 text-foreground">
        {parsedParts.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index} dangerouslySetInnerHTML={{ __html: part.content }} />;
          }
          const keyOptions = groups[part.key]?.options ?? [];
          return (
            <span
              key={index}
              className="inline-flex items-center flex-wrap gap-0.5 ms-1 me-1"
            >
              {keyOptions.map((opt, i) => (
                <span
                  key={opt.id}
                  className="inline-flex items-center gap-0.5"
                >
                  {i > 0 && (
                    <span className="ps-0.5 pe-0.5 text-xs text-muted-foreground/60">|</span>
                  )}
                  <button
                    type="button"
                    tabIndex={checked ? -1 : 0}
                    onClick={() => handleSelect(part.key, opt.id)}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(part.key, opt.id);
                      }
                    }}
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-lg border text-sm transition-all duration-150 select-none',
                      checked ? 'cursor-default' : 'cursor-pointer',
                      !checked && 'hover:bg-primary/[0.08] hover:border-primary/50',
                      checked && 'pointer-events-none',
                      getOptionChipClass(
                        selectedByKey[part.key] === opt.id,
                        opt.isCorrect,
                        checked,
                        showSolution
                      )
                    )}
                  >
                    {opt.text}
                  </button>
                </span>
              ))}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={checked ? handleRetry : handleCheck}
            disabled={!checked && !hasAllSelections}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {checked ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {checked ? t('retry') : t('check')}
          </button>

          {checked && !isAllCorrect && !showSolution && (
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
                score.isFullyCorrect
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

export default SelectCorrectWordQuestionView;
