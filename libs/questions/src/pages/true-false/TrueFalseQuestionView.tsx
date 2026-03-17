import { useCallback, useState } from 'react';
import { Check, RotateCcw, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

type TrueFalseQuestionViewProps = {
  question: QuestionRow;
};

type OptionPillFeedback = 'correct' | 'wrong' | undefined;

type OptionPillProps = {
  selected: boolean;
  feedback: OptionPillFeedback;
  onClick: () => void;
  children: React.ReactNode;
};

/** Renders a single True/False choice pill with feedback-aware colors. */
const OptionPill = ({ selected, feedback, onClick, children }: OptionPillProps) => {
  const bgColor =
    feedback === 'correct'
      ? 'rgba(34,197,94,0.25)'
      : feedback === 'wrong'
        ? 'rgba(239,68,68,0.25)'
        : selected
          ? 'hsl(var(--primary) / 0.15)'
          : 'transparent';

  const borderColor =
    feedback === 'correct'
      ? '#22c55e'
      : feedback === 'wrong'
        ? '#ef4444'
        : selected
          ? 'transparent'
          : 'hsl(var(--border))';

  const textColor =
    feedback === 'correct'
      ? '#22c55e'
      : feedback === 'wrong'
        ? '#ef4444'
        : selected
          ? 'white'
          : 'hsl(var(--muted-foreground))';

  return (
    <div
      className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-base mb-1 border"
      style={{
        backgroundColor: bgColor,
        borderColor,
        color: textColor,
        cursor: feedback ? 'default' : 'pointer',
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

const TrueFalseQuestionView = ({ question }: TrueFalseQuestionViewProps) => {
  const [selectedOption, setSelectedOption] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation('questions');

  const correctAnswer = question.correct_choice ?? true;
  const isCorrect = selectedOption === correctAnswer;

  const getFeedback = (value: boolean): OptionPillFeedback => {
    if (!checked || selectedOption !== value) return undefined;
    return isCorrect ? 'correct' : 'wrong';
  };

  const handleShowSolution = useCallback(() => {
    setSelectedOption(correctAnswer);
    setChecked(true);
  }, [correctAnswer]);

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setSelectedOption(null);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-0 mb-6">
        <OptionPill
          selected={selectedOption === true && !checked}
          feedback={getFeedback(true)}
          onClick={() => !checked && setSelectedOption(true)}
        >
          <span className="opacity-90">•</span>
          <span>{t('editor.true')}</span>
        </OptionPill>
        <OptionPill
          selected={selectedOption === false && !checked}
          feedback={getFeedback(false)}
          onClick={() => !checked && setSelectedOption(false)}
        >
          <span className="opacity-90">•</span>
          <span>{t('editor.false')}</span>
        </OptionPill>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            disabled={!checked && selectedOption === null}
            onClick={checked ? handleRetry : handleCheck}
            className="rounded-xl font-semibold"
          >
            {checked ? <RotateCcw className="me-2 h-4 w-4" /> : <Check className="me-2 h-4 w-4" />}
            {checked ? t('retry') : t('check')}
          </Button>
          {checked && !isCorrect && (
            <Button
              onClick={handleShowSolution}
              className="rounded-xl font-semibold"
            >
              <Lightbulb className="me-2 h-4 w-4" />
              {t('show_solution')}
            </Button>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card text-foreground py-2 px-4 font-semibold text-[0.95rem]">
          {question.mark}
        </div>
      </div>
    </>
  );
};

export default TrueFalseQuestionView;
