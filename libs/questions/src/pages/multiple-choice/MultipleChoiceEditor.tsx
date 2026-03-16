import { memo, useCallback, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import SelectionControls from './components/SelectionControls';
import ChoiceItem from './components/ChoiceItem';
import { useChoiceValidation } from './hooks/useChoiceValidation';
import { cn } from '@item-bank/ui';
import { Plus } from 'lucide-react';

type ChoiceNumbering = 'none' | 'numeric' | 'upper_alpha' | 'lower_alpha' | 'roman';

type Choice = {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackEnabled: boolean;
  feedbackText: string;
};

function AddMultipleChoice() {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation('questions');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const watchedChoices = watch('choices');
  const choices: Choice[] = useMemo(() => watchedChoices || [], [watchedChoices]);
  const choiceNumbering: ChoiceNumbering = watch('choiceNumbering') || 'none';
  const minSelections: number = watch('minSelections') || 1;
  const maxSelections: number = watch('maxSelections') || 1;
  const allowPartialCredit: boolean = watch('allowPartialCredit') || false;
  const allowShuffle: boolean = watch('allowShuffle') || false;

  const validation = useChoiceValidation(choices, minSelections, maxSelections);

  const canDelete = useMemo(() => choices.length > 2, [choices.length]);
  const canAdd = useMemo(() => choices.length < 8, [choices.length]);

  const handleChoiceNumberingChange = useCallback(
    (value: string) => {
      setValue('choiceNumbering', value);
    },
    [setValue]
  );

  const handleMinSelectionsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setValue('minSelections', value);
    },
    [setValue]
  );

  const handleMaxSelectionsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let value = Number(event.target.value);
      if (allowPartialCredit && value < 2) {
        value = 2;
      }
      setValue('maxSelections', value);
    },
    [allowPartialCredit, setValue]
  );

  const handleAllowPartialCreditChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setValue('allowPartialCredit', checked);

      // Partial credit implies multi-answer authoring; ensure max selections allows >1.
      if (checked) {
        const nextMax = Math.max(2, Math.min(Math.max(maxSelections, 2), choices.length));
        if (nextMax !== maxSelections) {
          setValue('maxSelections', nextMax);
        }
        if (minSelections > nextMax) {
          setValue('minSelections', nextMax);
        }
      }
    },
    [choices.length, maxSelections, minSelections, setValue]
  );

  const handleAllowShuffleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue('allowShuffle', event.target.checked);
    },
    [setValue]
  );

  const handleChoiceTextChange = useCallback(
    (id: string, value: string) => {
      setValue(
        'choices',
        choices.map((c) => (c.id === id ? { ...c, text: value } : c))
      );
    },
    [setValue, choices]
  );

  const handleChoiceCorrectToggle = useCallback(
    (id: string, checked: boolean) => {
      if (checked) {
        const effectiveMaxSelections = allowPartialCredit ? choices.length : maxSelections;
        const currentCorrectCount = choices.filter((c) => c.isCorrect).length;
        if (currentCorrectCount >= effectiveMaxSelections) {
          setToastMessage(
            t('editor.error_max_selections_exceeded', {
              max: effectiveMaxSelections,
              count: effectiveMaxSelections,
            })
          );
          return;
        }

        if (!allowPartialCredit && maxSelections === 1) {
          setValue(
            'choices',
            choices.map((c) => ({
              ...c,
              isCorrect: c.id === id,
            }))
          );
        } else {
          setValue(
            'choices',
            choices.map((c) => (c.id === id ? { ...c, isCorrect: true } : c))
          );
        }
      } else {
        setValue(
          'choices',
          choices.map((c) => (c.id === id ? { ...c, isCorrect: false } : c))
        );
      }
    },
    [allowPartialCredit, setValue, choices, maxSelections, t]
  );

  const handleChoiceFeedbackToggle = useCallback(
    (id: string, checked: boolean) => {
      setValue(
        'choices',
        choices.map((c) => (c.id === id ? { ...c, feedbackEnabled: checked } : c))
      );
    },
    [setValue, choices]
  );

  const handleChoiceFeedbackTextChange = useCallback(
    (id: string, value: string) => {
      setValue(
        'choices',
        choices.map((c) => (c.id === id ? { ...c, feedbackText: value } : c))
      );
    },
    [setValue, choices]
  );

  const handleDeleteChoice = useCallback(
    (id: string) => {
      if (choices.length <= 2) {
        return;
      }
      setValue(
        'choices',
        choices.filter((c) => c.id !== id)
      );
    },
    [setValue, choices]
  );

  const handleAddChoice = useCallback(() => {
    if (choices.length >= 8) {
      return;
    }
    setValue('choices', [
      ...choices,
      {
        id: crypto.randomUUID(),
        text: '',
        isCorrect: false,
        feedbackEnabled: false,
        feedbackText: '',
      },
    ]);
  }, [setValue, choices]);

  return (
    <div className="flex flex-col gap-6">

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border shadow-lg text-sm text-foreground animate-in fade-in-0 slide-in-from-bottom-2">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {toastMessage}
        </div>
      )}

      <SelectionControls
        choiceNumbering={choiceNumbering}
        minSelections={minSelections}
        maxSelections={maxSelections}
        onChoiceNumberingChange={handleChoiceNumberingChange}
        onMinSelectionsChange={handleMinSelectionsChange}
        onMaxSelectionsChange={handleMaxSelectionsChange}
        minError={validation.minError}
        maxError={validation.maxError}
        rangeError={validation.rangeError}
        validationErrors={validation.validationErrors}
      />

      {/* Choices header row */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <p className="text-sm font-semibold text-foreground">
          {t('editor.choices')} *
        </p>
        <div className="flex gap-4 items-center flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="sr-only peer" checked={allowPartialCredit} onChange={handleAllowPartialCreditChange} />
            <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
              <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
            </div>
            <span className="text-sm text-foreground">{t('editor.allow_partial_credit')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="sr-only peer" checked={allowShuffle} onChange={handleAllowShuffleChange} />
            <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
              <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
            </div>
            <span className="text-sm text-foreground">{t('editor.allow_shuffle')}</span>
          </label>
        </div>
      </div>

      {/* Choice list */}
      <div className="flex flex-col gap-3">
        {choices.map((choice, index) => (
          <ChoiceItem
            key={choice.id}
            choice={choice}
            index={index}
            canDelete={canDelete}
            onTextChange={handleChoiceTextChange}
            onCorrectToggle={handleChoiceCorrectToggle}
            onFeedbackToggle={handleChoiceFeedbackToggle}
            onFeedbackTextChange={handleChoiceFeedbackTextChange}
            onDelete={handleDeleteChoice}
          />
        ))}
      </div>

      {/* Add choice */}
      <button
        type="button"
        onClick={handleAddChoice}
        disabled={!canAdd}
        className="self-start flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={15} />
        {t('editor.add_choice')}
      </button>

    </div>
  );
}

export default memo(AddMultipleChoice);
