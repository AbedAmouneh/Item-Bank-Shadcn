import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { cn } from '@item-bank/ui';

function Add() {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation('questions');

  const correctAnswer = watch('correctAnswer') || 'True';

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-foreground">
        {t('editor.correct_answer')} *
      </p>
      <div className="flex gap-3">
        {(['True', 'False'] as const).map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => setValue('correctAnswer', val)}
            className={cn(
              'flex-1 py-4 rounded-2xl border-2 text-sm font-semibold transition-all duration-150',
              correctAnswer === val
                ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/[0.04]'
            )}
          >
            {t(`editor.${val.toLowerCase()}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(Add);
