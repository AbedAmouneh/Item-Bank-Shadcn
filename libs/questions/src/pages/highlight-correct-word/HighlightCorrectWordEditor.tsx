import { memo, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@item-bank/ui';
import { extractHighlightedPhrases, PENALTY_OPTIONS } from './utils';

function HighlightCorrectWordEditor({ questionText }: { questionText?: string }) {
  const { watch, setValue, register, unregister } = useFormContext();
  const { t } = useTranslation('questions');

  const phrases: string[] = useMemo(
    () => extractHighlightedPhrases(questionText ?? ''),
    [questionText]
  );

  const lastSyncedSig = useRef<string | null>(null);

  // Keep form state in sync when TinyMCE content changes
  useEffect(() => {
    const sig = JSON.stringify(phrases);
    if (sig === lastSyncedSig.current) return;
    lastSyncedSig.current = sig;
    setValue('highlightCorrectPhrases', phrases);
  }, [phrases, setValue]);

  useEffect(() => {
    register('highlightCorrectPhrases', {
      validate: {
        atLeastOne: (vals: string[]) =>
          (vals ?? []).length >= 1 ||
          t('editor.highlight_correct_word.error_no_phrases', {
            defaultValue: 'Highlight at least one word or phrase before saving.',
          }),
      },
    });
    return () => {
      unregister('highlightCorrectPhrases', { keepValue: true });
    };
  }, [register, unregister, t]);

  const penaltyPercent: number = watch('highlightPenaltyPercent') ?? 25;

  const hasPhrases = phrases.length >= 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Penalty dropdown */}
      <div className="flex flex-col gap-1.5 max-w-[260px]">
        <label className="text-sm font-medium text-foreground">
          {t('editor.highlight_correct_word.penalty_label')}
        </label>
        <Select
          value={String(penaltyPercent)}
          onValueChange={(val) => setValue('highlightPenaltyPercent', Number(val))}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PENALTY_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Highlighted phrases list */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">
          {t('editor.highlight_correct_word.phrases_label')}{' '}
          <span className="text-xs font-normal text-muted-foreground">
            ({t('editor.highlight_correct_word.remove_hint')})
          </span>
        </p>

        {hasPhrases ? (
          <div className="flex flex-wrap gap-2">
            {phrases.map((phrase, i) => (
              <span
                key={`${phrase}-${i}`}
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium',
                  'bg-green-500/[0.12] text-green-600 border border-green-500/35',
                  'dark:text-green-400'
                )}
              >
                {phrase}
              </span>
            ))}
          </div>
        ) : (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
          >
            {t('editor.highlight_correct_word.error_no_phrases', {
              defaultValue: 'Highlight at least one word or phrase before saving.',
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(HighlightCorrectWordEditor);
