import { useState, useCallback, useMemo } from 'react';
import { Check, RotateCcw, Lightbulb, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, cn } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

type ShortAnswerQuestionViewProps = {
  question: QuestionRow;
};

const ShortAnswerQuestionView = ({ question }: ShortAnswerQuestionViewProps) => {
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [answer, setAnswer] = useState('');
  const { t } = useTranslation('questions');

  const correctChoiceMatch = useMemo(() => {
    if (answer.length === 0) return undefined;
    return question.choices?.find((choice) =>
      choice.ignore_casing
        ? choice.answer.toLowerCase() === answer.toLowerCase()
        : choice.answer === answer,
    );
  }, [answer, question.choices]);

  const earnedMark = useMemo(() => {
    if (!checked) return 0;
    if (!correctChoiceMatch) return 0;
    return Math.round(parseFloat(correctChoiceMatch.fraction) * question.mark);
  }, [checked, correctChoiceMatch, question.mark]);

  const handleShowSolution = useCallback(() => {
    setShowSolution(true);
  }, []);

  const handleRetry = useCallback(() => {
    setAnswer('');
    setChecked(false);
    setShowSolution(false);
  }, []);

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  // Determine background color for the answer input after checking
  const inputBgColor = (() => {
    if (!checked) return undefined;
    if (correctChoiceMatch && +correctChoiceMatch.fraction >= 1) return '#22c55e';
    if (correctChoiceMatch && +correctChoiceMatch.fraction < 1) return '#f59e0b';
    return '#ef4444';
  })();

  return (
    <>
      <div>
        <Input
          placeholder={t('editor.add_answer')}
          disabled={checked}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className={cn('rounded-[10px]')}
          style={inputBgColor ? { backgroundColor: inputBgColor } : undefined}
        />
      </div>

      {showSolution && question.choices && question.choices.length > 0 && (
        <div
          className="p-4 mt-4 mb-4 rounded-xl border"
          style={{
            backgroundColor: 'hsl(var(--muted))',
            borderColor: 'hsl(var(--border))',
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <Info
              className="text-xl mt-1 shrink-0"
              style={{ color: 'hsl(var(--primary))' }}
            />
            <span
              className="font-semibold text-[0.95rem]"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {t('correct_answers_are')}
            </span>
          </div>
          <ul className="m-0 ps-9 list-none">
            {question.choices.map((choice) => {
              const percent = Math.round(parseFloat(choice.fraction) * 100);
              return (
                <li
                  key={choice.id}
                  className="text-[0.95rem] mb-1 last:mb-0"
                  style={{ color: 'hsl(var(--primary))' }}
                >
                  {percent}% {choice.answer}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4 mt-6">
        <div className="flex items-center gap-3">
          <Button
            disabled={answer.length === 0}
            onClick={checked ? handleRetry : handleCheck}
            className="rounded-xl font-semibold"
          >
            {checked ? <RotateCcw className="me-2 h-4 w-4" /> : <Check className="me-2 h-4 w-4" />}
            {checked ? t('retry') : t('check')}
          </Button>
          {checked &&
            (!correctChoiceMatch || +correctChoiceMatch.fraction < 1) &&
            !showSolution && (
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
          {checked ? `${earnedMark}/${question.mark}` : question.mark}
        </div>
      </div>
    </>
  );
};

export default ShortAnswerQuestionView;
