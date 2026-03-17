import { memo, useCallback, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@item-bank/ui';
import NumericalAnswerRow from './NumericalAnswerRow';
import NumericalUnitRow from './NumericalUnitRow';
import {
  type NumericalAnswerEntry,
  type NumericalUnit,
  type NumericalUnitHandling,
  type NumericalUnitInputMethod,
  UNIT_HANDLING_OPTIONS,
  UNIT_INPUT_METHOD_OPTIONS,
  createEmptyNumericalAnswer,
  createEmptyNumericalUnit,
  latexUnitToPlainText,
} from './types';

function NumericalEditor() {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation('questions');

  const answers = (watch('numericalAnswers') || [createEmptyNumericalAnswer()]) as NumericalAnswerEntry[];
  const unitHandling = (watch('numericalUnitHandling') || 'disabled') as NumericalUnitHandling;
  const unitInputMethod = (watch('numericalUnitInputMethod') || 'text_input') as NumericalUnitInputMethod;
  const unitPenalty = watch('numericalUnitPenalty') ?? '0';
  const units = (watch('numericalUnits') || [createEmptyNumericalUnit()]) as NumericalUnit[];

  const answersRef = useRef<NumericalAnswerEntry[]>(answers);
  answersRef.current = answers;
  const unitsRef = useRef<NumericalUnit[]>(units);
  unitsRef.current = units;

  const showUnits = unitHandling === 'optional' || unitHandling === 'required';
  const showCalculatorIcon = unitInputMethod !== 'text_input';

  const prevUnitInputMethodRef = useRef<NumericalUnitInputMethod>(unitInputMethod);
  useEffect(() => {
    if (prevUnitInputMethodRef.current !== 'text_input' && unitInputMethod === 'text_input') {
      const converted = unitsRef.current.map((u) => ({
        ...u,
        unit: latexUnitToPlainText(u.unit),
      }));
      setValue('numericalUnits', converted);
    }
    prevUnitInputMethodRef.current = unitInputMethod;
  }, [unitInputMethod, setValue]);

  // --- Answer handlers ---
  const onAnswerChange = useCallback(
    (id: string, field: keyof NumericalAnswerEntry, newValue: unknown) => {
      setValue(
        'numericalAnswers',
        answersRef.current.map((a) => (a.id === id ? { ...a, [field]: newValue } : a))
      );
    },
    [setValue]
  );

  const onAnswerRemove = useCallback(
    (id: string) => {
      setValue('numericalAnswers', answersRef.current.filter((a) => a.id !== id));
    },
    [setValue]
  );

  const handleAddAnswer = useCallback(() => {
    setValue('numericalAnswers', [...answersRef.current, createEmptyNumericalAnswer()]);
  }, [setValue]);

  // --- Unit handlers ---
  const onUnitChange = useCallback(
    (id: string, field: keyof NumericalUnit, newValue: string) => {
      setValue(
        'numericalUnits',
        unitsRef.current.map((u) => (u.id === id ? { ...u, [field]: newValue } : u))
      );
    },
    [setValue]
  );

  const onUnitRemove = useCallback(
    (id: string) => {
      setValue('numericalUnits', unitsRef.current.filter((u) => u.id !== id));
    },
    [setValue]
  );

  const handleAddUnit = useCallback(() => {
    setValue('numericalUnits', [...unitsRef.current, createEmptyNumericalUnit()]);
  }, [setValue]);

  const canRemoveAnswer = answers.length > 1;
  const canRemoveUnit = units.length > 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Answers section */}
      <h4 className="text-sm font-semibold text-foreground">
        {t('editor.answers')} <span className="text-destructive">*</span>
      </h4>

      {answers.map((answer, index) => (
        <NumericalAnswerRow
          key={answer.id}
          answer={answer}
          index={index}
          onChange={onAnswerChange}
          onRemove={onAnswerRemove}
          canRemove={canRemoveAnswer}
        />
      ))}

      <button
        type="button"
        onClick={handleAddAnswer}
        className="flex items-center gap-1.5 self-start text-sm text-primary hover:text-primary/80 font-medium transition-colors"
      >
        <Plus size={15} />
        {t('editor.add_answer')}
      </button>

      <hr className="border-border my-2" />

      {/* Unit handling row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={unitHandling}
          onValueChange={(value) => setValue('numericalUnitHandling', value as NumericalUnitHandling)}
        >
          <SelectTrigger className="w-[200px] text-sm">
            <SelectValue placeholder={t('editor.numerical.unit_handling')} />
          </SelectTrigger>
          <SelectContent>
            {UNIT_HANDLING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div>
                  <p className="font-medium leading-snug text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{opt.description}</p>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {unitHandling === 'required' && (
          <>
            <Select
              value={unitInputMethod}
              onValueChange={(value) => setValue('numericalUnitInputMethod', value as NumericalUnitInputMethod)}
            >
              <SelectTrigger className="w-[240px] text-sm">
                <SelectValue placeholder={t('editor.numerical.unit_input_method')} />
              </SelectTrigger>
              <SelectContent>
                {UNIT_INPUT_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                {t('editor.numerical.unit_penalty')}
              </label>
              <Input
                type="number"
                value={unitPenalty}
                onChange={(e) => setValue('numericalUnitPenalty', e.target.value)}
                className="w-36 text-sm h-9"
                step={1}
                min={0}
                max={100}
              />
            </div>
          </>
        )}
      </div>

      {/* Units list */}
      {showUnits && (
        <div className="flex flex-col gap-4">
          <h4 className="text-sm font-semibold text-foreground">
            {t('editor.numerical.units')} <span className="text-destructive">*</span>
          </h4>

          {units.map((unit, index) => (
            <NumericalUnitRow
              key={unit.id}
              unit={unit}
              index={index}
              showCalculatorIcon={showCalculatorIcon}
              onChange={onUnitChange}
              onRemove={onUnitRemove}
              canRemove={canRemoveUnit}
            />
          ))}

          <button
            type="button"
            onClick={handleAddUnit}
            className="flex items-center gap-1.5 self-start text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Plus size={15} />
            {t('editor.numerical.add_unit')}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(NumericalEditor);
