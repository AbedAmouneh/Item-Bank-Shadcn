import 'mathlive';
import { useState, useCallback, useMemo, useRef, useEffect, createElement } from 'react';
import { Check, RotateCcw, Lightbulb, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  cn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@item-bank/ui';
import { type QuestionRow } from '../../components/QuestionsTable';

type NumericalQuestionViewProps = {
  question: QuestionRow;
};

type MathFieldElement = HTMLElement & {
  value: string;
  mathVirtualKeyboardPolicy?: 'auto' | 'manual' | 'sandboxed';
};

type UnitMathProps = {
  latex: string;
  size?: string;
};

const UnitMath = ({ latex, size = '0.95rem' }: UnitMathProps) => {
  const mathFieldRef = useRef<MathFieldElement | null>(null);

  useEffect(() => {
    if (!mathFieldRef.current) return;
    mathFieldRef.current.value = latex;
    mathFieldRef.current.mathVirtualKeyboardPolicy = 'manual';
  }, [latex]);

  return createElement('math-field', {
    ref: (node: MathFieldElement | null) => {
      mathFieldRef.current = node;
      if (!node) return;
      node.value = latex;
      node.mathVirtualKeyboardPolicy = 'manual';
    },
    'read-only': true,
    style: {
      display: 'inline-block',
      minHeight: '1.2rem',
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      fontSize: size,
      pointerEvents: 'none',
      verticalAlign: 'middle',
    },
  });
};

const NumericalQuestionView = ({ question }: NumericalQuestionViewProps) => {
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [unitValue, setUnitValue] = useState('');
  const { t } = useTranslation('questions');

  const numericalAnswers = useMemo(() => question.numericalAnswers ?? [], [question.numericalAnswers]);
  const numericalUnits = useMemo(() => question.numericalUnits ?? [], [question.numericalUnits]);
  const hasUnits = numericalUnits.length > 0;
  const unitHandling = question.numericalUnitHandling ?? 'disabled';
  const unitInputMethod = question.numericalUnitInputMethod ?? 'text_input';
  const unitPenaltyNum = Math.min(
    100,
    Math.max(0, Number(question.numericalUnitPenalty) || 0)
  );

  const normalizeUnit = useCallback((value: string) => {
    let s = value.trim().toLowerCase();
    s = s.replace(/\\?exponentiale/g, 'e');
    return s;
  }, []);

  const selectedUnit = useMemo(() => {
    if (!hasUnits) return undefined;
    const normalized = normalizeUnit(unitValue);
    if (!normalized) return undefined;
    return numericalUnits.find((u) => normalizeUnit(u.unit) === normalized);
  }, [hasUnits, normalizeUnit, numericalUnits, unitValue]);

  const parsedValue = useMemo(() => {
    if (inputValue === '') return undefined;
    const num = parseFloat(inputValue);
    return Number.isNaN(num) ? undefined : num;
  }, [inputValue]);

  const effectiveAnswerValue = useMemo(() => {
    if (parsedValue === undefined) return undefined;
    if (!hasUnits || !selectedUnit) return parsedValue;

    const multiplier = typeof selectedUnit.multiplier === 'number'
      ? selectedUnit.multiplier
      : (parseFloat(String(selectedUnit.multiplier)) || 1);
    return parsedValue / multiplier;
  }, [hasUnits, parsedValue, selectedUnit]);

  const matchedAnswer = useMemo(() => {
    if (!checked || effectiveAnswerValue === undefined) return undefined;
    return numericalAnswers.find(
      (a) => Math.abs(effectiveAnswerValue - a.answer) <= a.error
    );
  }, [checked, effectiveAnswerValue, numericalAnswers]);

  const hasUnitInput = useMemo(() => normalizeUnit(unitValue) !== '', [normalizeUnit, unitValue]);

  const unitIsValidForHandling = useMemo(() => {
    if (!hasUnits || unitHandling === 'disabled') return true;
    if (unitHandling === 'optional' && !hasUnitInput) return true;
    return !!selectedUnit;
  }, [hasUnitInput, hasUnits, selectedUnit, unitHandling]);

  const earnedMark = useMemo(() => {
    if (!checked || !matchedAnswer) return 0;
    if (
      hasUnits &&
      unitHandling === 'required' &&
      !unitIsValidForHandling &&
      unitInputMethod !== 'text_input'
    ) {
      return 0;
    }
    const shouldApplyUnitPenalty =
      hasUnits &&
      unitHandling === 'required' &&
      unitInputMethod === 'text_input' &&
      !unitIsValidForHandling;
    const markPercent = shouldApplyUnitPenalty
      ? Math.max(0, matchedAnswer.mark - unitPenaltyNum)
      : matchedAnswer.mark;
    return (markPercent / 100) * question.mark;
  }, [
    checked,
    hasUnits,
    matchedAnswer,
    question.mark,
    unitHandling,
    unitInputMethod,
    unitIsValidForHandling,
    unitPenaltyNum,
  ]);

  const isCorrect = checked && earnedMark >= question.mark;
  const isPartial = checked && earnedMark > 0 && earnedMark < question.mark;
  const isWrong = checked && earnedMark === 0;

  const handleCheck = useCallback(() => setChecked(true), []);

  const handleRetry = useCallback(() => {
    setInputValue('');
    setUnitValue('');
    setChecked(false);
    setShowSolution(false);
  }, []);

  const handleShowSolution = useCallback(() => setShowSolution(true), []);

  return (
    <>
      <div>

        {showSolution && numericalAnswers.length > 0 && (
          <div
            className="p-4 mt-4 mb-4 rounded-xl border"
            style={{
              backgroundColor: 'hsl(var(--solution-background))',
              borderColor: 'hsl(var(--solution-border))',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <Info
                size={18}
                className="mt-1 shrink-0 text-blue-600 dark:text-blue-400"
              />
              <span className="font-semibold text-[0.95rem] text-foreground">
                {t('correct_answers_are')}
              </span>
            </div>
            <ul className="m-0 ps-9 list-none">
              {numericalAnswers.flatMap((a, i) => {
                const mult = (u: { multiplier: number | string }) =>
                  typeof u.multiplier === 'number' ? u.multiplier : (parseFloat(String(u.multiplier)) || 1);
                if (hasUnits && numericalUnits.length > 0) {
                  return numericalUnits.map((u) => (
                    <li
                      key={`${a.id ?? i}-${u.id}`}
                      className="text-[0.95rem] mb-1 last:mb-0 flex items-center flex-wrap gap-x-[0.25em] text-blue-600 dark:text-blue-400"
                    >
                      <span className="inline-flex items-center gap-[0.15em]">
                        {a.mark}% {a.answer * mult(u)} <UnitMath latex={u.unit} size="0.9rem" />
                      </span>
                      {a.error ? (
                        <span className="inline-flex items-center gap-[0.15em]">
                          ± {a.error * mult(u)} <UnitMath latex={u.unit} size="0.9rem" />
                        </span>
                      ) : null}
                    </li>
                  ));
                }
                return [
                  <li
                    key={a.id ?? i}
                    className="text-[0.95rem] mb-1 last:mb-0 text-blue-600 dark:text-blue-400"
                  >
                    {a.mark}% {a.answer}
                    {a.error ? ` ± ${a.error}` : ''}
                  </li>,
                ];
              })}
            </ul>
          </div>
        )}

        <div className="flex gap-[0.375rem] items-start flex-wrap">
          <Input
            placeholder={t('editor.add_answer')}
            type="number"
            disabled={checked}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            step="any"
            className={cn(
              'text-sm',
              hasUnits ? 'flex-[1_1_260px]' : 'w-full',
              isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/30' :
              isPartial ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' :
              isWrong ? 'border-destructive bg-destructive/10' : ''
            )}
          />

          {hasUnits && unitInputMethod === 'drop_down' && (
            <div className="flex-[0_0_200px] min-w-[200px]">
              <Select
                disabled={checked}
                value={unitValue}
                onValueChange={(value) => setUnitValue(value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={<em>{t('editor.numerical.select_unit')}</em>} />
                </SelectTrigger>
                <SelectContent>
                  {numericalUnits.map((u) => (
                    <SelectItem key={u.id} value={u.unit}>
                      <UnitMath latex={u.unit} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasUnits && unitInputMethod === 'text_input' && (
            <Input
              placeholder={t('editor.numerical.unit')}
              disabled={checked}
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
              className="text-sm min-w-[200px] flex-[0_0_200px]"
            />
          )}

          {hasUnits && unitInputMethod === 'multiple_choice_selection' && (
            <div className="flex flex-wrap gap-3 flex-[1_1_260px] min-w-[240px]">
              {numericalUnits.map((u) => (
                <label key={u.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    value={u.unit}
                    checked={unitValue === u.unit}
                    onChange={(e) => setUnitValue(e.target.value)}
                    disabled={checked}
                    className="accent-primary"
                  />
                  <UnitMath latex={u.unit} />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4 mt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={
              inputValue === '' ||
              (hasUnits &&
                unitHandling === 'required' &&
                (unitInputMethod === 'text_input' ? !unitValue.trim() : !unitIsValidForHandling))
            }
            onClick={checked ? handleRetry : handleCheck}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checked ? (
              <>
                <RotateCcw size={16} />
                {t('retry')}
              </>
            ) : (
              <>
                <Check size={16} />
                {t('check')}
              </>
            )}
          </button>
          {checked && !isCorrect && !showSolution && (
            <button
              type="button"
              onClick={handleShowSolution}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lightbulb size={16} />
              {t('show_solution')}
            </button>
          )}
        </div>
        <div className="py-2 ps-4 pe-4 font-semibold text-[0.95rem] rounded-xl border border-border bg-card text-foreground">
          {checked
            ? `${Number.isInteger(earnedMark) ? earnedMark : Number(earnedMark.toFixed(1))}/${question.mark}`
            : question.mark}
        </div>
      </div>
    </>
  );
};

export default NumericalQuestionView;
