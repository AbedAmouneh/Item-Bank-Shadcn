import { useCallback, useMemo, useState } from 'react';

import { Check, CheckCircle, Lightbulb, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@item-bank/ui';

import type { QuestionRow } from '../../components/QuestionsTable';

type MultipleChoiceQuestionViewProps = {
  question: QuestionRow;
};

type ChoiceFeedback = 'correct' | 'wrong' | undefined;

function parseFraction(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMark(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/** Derive inline style values for a choice pill based on selection and feedback state. */
function getChoicePillStyles(
  selected: boolean,
  feedback: ChoiceFeedback
): { backgroundColor: string | undefined; border: string; color: string; cursor: string } {
  const isCorrect = feedback === 'correct';
  const isWrong = feedback === 'wrong';

  const backgroundColor = isCorrect
    ? '#22c55e33'
    : isWrong
      ? '#ef444433'
      : selected
        ? 'hsl(var(--primary) / 0.15)'
        : undefined;

  const borderColor = isCorrect
    ? '#22c55e'
    : isWrong
      ? '#ef4444'
      : selected
        ? 'transparent'
        : 'hsl(var(--border))';

  const color = isCorrect
    ? '#22c55e'
    : isWrong
      ? '#ef4444'
      : selected
        ? 'white'
        : 'hsl(var(--muted-foreground))';

  return {
    backgroundColor,
    border: `1px solid ${borderColor}`,
    color,
    cursor: feedback ? 'default' : 'pointer',
  };
}

const MultipleChoiceQuestionView = ({ question }: MultipleChoiceQuestionViewProps) => {
  const [selectedChoices, setSelectedChoices] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation('questions');

  const choices = question.choices ?? [];
  const allowPartialCredit = question.multipleChoiceAllowPartialCredit ?? false;
  const configuredMaxSelections = question.maxSelections ?? 1;

  const choiceWeights = useMemo(
    () =>
      choices.map((choice) => ({
        id: choice.id,
        weight: Math.max(0, parseFraction(choice.fraction)),
      })),
    [choices]
  );

  const correctChoiceIds = useMemo(
    () => choiceWeights.filter((choice) => choice.weight > 0).map((choice) => choice.id),
    [choiceWeights]
  );

  const totalCorrectWeight = useMemo(
    () => choiceWeights.reduce((sum, choice) => sum + choice.weight, 0),
    [choiceWeights]
  );

  const allowMultipleSelection =
    allowPartialCredit || configuredMaxSelections > 1 || correctChoiceIds.length > 1;

  const toggleChoice = useCallback(
    (choiceId: number) => {
      if (checked) return;

      setSelectedChoices((prev) => {
        const newSet = new Set(prev);
        if (allowMultipleSelection) {
          if (newSet.has(choiceId)) {
            newSet.delete(choiceId);
          } else {
            const maxSelectable = allowPartialCredit
              ? choices.length
              : Math.max(1, configuredMaxSelections);
            if (newSet.size >= maxSelectable) return prev;
            newSet.add(choiceId);
          }
        } else {
          newSet.clear();
          newSet.add(choiceId);
        }
        return newSet;
      });
    },
    [allowMultipleSelection, allowPartialCredit, checked, choices.length, configuredMaxSelections]
  );

  const getChoiceFeedback = (choiceId: number): ChoiceFeedback => {
    if (!checked || !selectedChoices.has(choiceId)) return undefined;
    const isCorrect = correctChoiceIds.includes(choiceId);
    return isCorrect ? 'correct' : 'wrong';
  };

  const isAnswerCorrect = useMemo(() => {
    if (selectedChoices.size !== correctChoiceIds.length) return false;
    return correctChoiceIds.every((id) => selectedChoices.has(id));
  }, [selectedChoices, correctChoiceIds]);

  const earnedMark = useMemo(() => {
    if (!checked) return null;
    if (!allowPartialCredit) return isAnswerCorrect ? question.mark : 0;
    if (totalCorrectWeight <= 0) return 0;

    const selectedWeight = choiceWeights.reduce(
      (sum, choice) => (selectedChoices.has(choice.id) ? sum + choice.weight : sum),
      0
    );
    const ratio = Math.max(0, Math.min(1, selectedWeight / totalCorrectWeight));
    return Math.round(question.mark * ratio * 100) / 100;
  }, [
    allowPartialCredit,
    checked,
    choiceWeights,
    isAnswerCorrect,
    question.mark,
    selectedChoices,
    totalCorrectWeight,
  ]);

  const markLabel =
    checked && earnedMark !== null
      ? `${formatMark(earnedMark)} / ${formatMark(question.mark)}`
      : formatMark(question.mark);

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setSelectedChoices(new Set());
  }, []);

  const handleShowSolution = useCallback(() => {
    setSelectedChoices(new Set(correctChoiceIds));
    setChecked(true);
  }, [correctChoiceIds]);

  const getFeedbackIcon = (feedback: ChoiceFeedback) => {
    if (feedback === 'correct') return <CheckCircle size={16} />;
    if (feedback === 'wrong') return <X size={16} />;
    return null;
  };

  return (
    <>
      <div className="flex flex-col gap-0 mb-6">
        {choices.map((choice) => {
          const feedback = getChoiceFeedback(choice.id);
          const isSelected = selectedChoices.has(choice.id);
          const pillStyles = getChoicePillStyles(isSelected && !checked, feedback);

          return (
            <div key={choice.id}>
              <div
                className="flex items-center gap-3 py-3 px-4 text-base w-full mb-1 rounded-full"
                style={pillStyles}
                onClick={() => toggleChoice(choice.id)}
              >
                <span className="opacity-90">•</span>
                <span
                  className="[&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_ul]:[padding-inline-start:20px] [&_ol]:[padding-inline-start:20px]"
                  dangerouslySetInnerHTML={{ __html: choice.answer }}
                />
                {feedback && <span className="ms-auto">{getFeedbackIcon(feedback)}</span>}
              </div>
              {checked && choice.feedback && isSelected && (
                <div
                  className="text-sm mt-1 ms-8 italic opacity-90 [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: choice.feedback }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            disabled={!checked && selectedChoices.size === 0}
            onClick={checked ? handleRetry : handleCheck}
            className="normal-case font-semibold rounded-2xl"
          >
            {checked ? <RotateCcw size={16} className="me-2" /> : <Check size={16} className="me-2" />}
            {checked ? t('retry') : t('check')}
          </Button>
          {checked && !isAnswerCorrect && (
            <Button
              onClick={handleShowSolution}
              className="normal-case font-semibold rounded-2xl"
            >
              <Lightbulb size={16} className="me-2" />
              {t('show_solution')}
            </Button>
          )}
        </div>
        <div className="py-2 px-4 font-semibold text-[0.95rem] rounded-2xl bg-card border border-border text-foreground">
          {markLabel}
        </div>
      </div>
    </>
  );
};

export default MultipleChoiceQuestionView;
