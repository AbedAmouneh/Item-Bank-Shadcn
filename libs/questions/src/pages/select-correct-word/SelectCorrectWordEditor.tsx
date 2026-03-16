import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { cn, Input } from '@item-bank/ui';

type SelectWordOption = { id: string; text: string; isCorrect: boolean };
type SelectWordGroup = { key: string; options: SelectWordOption[] };

const KEY_REGEX = /\[\[([^\]]+)\]\]/g;

function parseKeysFromText(text: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  KEY_REGEX.lastIndex = 0;
  while ((m = KEY_REGEX.exec(text)) !== null) {
    const key = m[1].trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

function createDefaultGroup(key: string): SelectWordGroup {
  return {
    key,
    options: [
      { id: crypto.randomUUID(), text: '', isCorrect: true },
      { id: crypto.randomUUID(), text: '', isCorrect: false },
    ],
  };
}

function SelectCorrectWordEditor({ questionText }: { questionText?: string }) {
  const { watch, setValue, register, unregister } = useFormContext();
  const { t } = useTranslation('questions');

  const watchedGroups = watch('selectWordGroups');
  const groups: SelectWordGroup[] = useMemo(() => watchedGroups ?? [], [watchedGroups]);
  const allowPartialCredit: boolean = watch('allowPartialCreditScoring') ?? false;

  const parsedKeys = useMemo(() => parseKeysFromText(questionText ?? ''), [questionText]);
  const lastSyncedSig = useRef<string | null>(null);

  useEffect(() => {
    register('selectWordGroups', {
      validate: {
        minOptions: (vals: SelectWordGroup[]) =>
          (vals ?? []).every((g) => g.options.length >= 2) ||
          t('editor.select_correct_word.error_min_options', { defaultValue: 'Each key must have at least 2 options.' }),
        exactlyOneCorrect: (vals: SelectWordGroup[]) =>
          (vals ?? []).every((g) => g.options.filter((o) => o.isCorrect).length === 1) ||
          t('editor.select_correct_word.error_no_correct', { defaultValue: 'Each key must have exactly one correct option.' }),
        noEmptyOptions: (vals: SelectWordGroup[]) =>
          (vals ?? []).every((g) => g.options.every((o) => o.text.trim())) ||
          t('editor.select_correct_word.error_empty_options', { defaultValue: 'All options must have text before saving.' }),
      },
    });
    return () => {
      unregister('selectWordGroups', { keepValue: true });
    };
  }, [register, unregister, t]);

  useEffect(() => {
    const sig = JSON.stringify(parsedKeys);
    if (sig === lastSyncedSig.current) return;

    const existingByKey = new Map(groups.map((g) => [g.key, g.options]));
    const newGroups: SelectWordGroup[] = parsedKeys.map((key) => {
      const existing = existingByKey.get(key);
      if (existing && existing.length >= 2) return { key, options: existing };
      return createDefaultGroup(key);
    });

    const unchanged =
      newGroups.length === groups.length &&
      newGroups.every((g, i) => {
        const cur = groups[i];
        return cur?.key === g.key && cur?.options === g.options;
      });

    lastSyncedSig.current = sig;
    if (!unchanged) setValue('selectWordGroups', newGroups);
  }, [parsedKeys, groups, setValue]);

  const handleOptionText = useCallback(
    (groupKey: string, optId: string, text: string) => {
      setValue(
        'selectWordGroups',
        groups.map((g) =>
          g.key !== groupKey
            ? g
            : { ...g, options: g.options.map((o) => (o.id === optId ? { ...o, text } : o)) }
        )
      );
    },
    [groups, setValue]
  );

  const handleSetCorrect = useCallback(
    (groupKey: string, optId: string) => {
      setValue(
        'selectWordGroups',
        groups.map((g) =>
          g.key !== groupKey
            ? g
            : { ...g, options: g.options.map((o) => ({ ...o, isCorrect: o.id === optId })) }
        )
      );
    },
    [groups, setValue]
  );

  const handleAddOption = useCallback(
    (groupKey: string) => {
      setValue(
        'selectWordGroups',
        groups.map((g) =>
          g.key !== groupKey
            ? g
            : {
                ...g,
                options: [...g.options, { id: crypto.randomUUID(), text: '', isCorrect: false }],
              }
        )
      );
    },
    [groups, setValue]
  );

  const handleDeleteOption = useCallback(
    (groupKey: string, optId: string) => {
      setValue(
        'selectWordGroups',
        groups.map((g) => {
          if (g.key !== groupKey || g.options.length <= 2) return g;
          const filtered = g.options.filter((o) => o.id !== optId);
          const hasCorrect = filtered.some((o) => o.isCorrect);
          return {
            ...g,
            options: hasCorrect
              ? filtered
              : filtered.map((o, i) => (i === 0 ? { ...o, isCorrect: true } : o)),
          };
        })
      );
    },
    [groups, setValue]
  );

  const hasKeys = parsedKeys.length >= 1;
  const hasGroupErrors = groups.some(
    (g) => g.options.length < 2 || g.options.filter((o) => o.isCorrect).length !== 1
  );
  const hasEmptyOptions = groups.some((g) => g.options.some((o) => !o.text.trim()));

  if (!hasKeys) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('editor.select_correct_word.error_no_keys', { defaultValue: 'Use [[key]] in the question text to add selectable word groups.' })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <p className="text-sm font-semibold text-foreground">
          {t('editor.select_correct_word.options_label', { defaultValue: 'Options by key' })} *
        </p>

        {/* Partial credit toggle using named peer pattern */}
        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm">
          <input
            type="checkbox"
            className="sr-only peer/toggle"
            checked={allowPartialCredit}
            onChange={(e) => setValue('allowPartialCreditScoring', e.target.checked)}
          />
          <div className="w-9 h-5 rounded-full bg-muted peer-checked/toggle:bg-primary relative transition-colors">
            <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked/toggle:translate-x-4 rtl:peer-checked/toggle:-translate-x-4" />
          </div>
          {t('editor.select_correct_word.partial_credit', { defaultValue: 'Allow partial credit' })}
        </label>
      </div>

      {groups.map((group) => (
        <div
          key={group.key}
          className="flex flex-col gap-2 p-4 rounded-2xl border border-border/15 bg-muted/30"
        >
          <p className="text-sm font-semibold text-muted-foreground">{group.key}</p>

          {group.options.map((option, optIndex) => (
            <div key={option.id} className="flex items-center gap-2">
              {/* Radio input — marks an option as the correct answer */}
              <input
                type="radio"
                name={`correct-${group.key}`}
                checked={option.isCorrect}
                onChange={() => handleSetCorrect(group.key, option.id)}
                className="shrink-0 w-4 h-4 accent-primary cursor-pointer"
                title={t('editor.select_correct_word.correct_label', { defaultValue: 'Mark as correct' })}
              />

              <Input
                value={option.text}
                onChange={(e) => handleOptionText(group.key, option.id, e.target.value)}
                placeholder={t('editor.select_correct_word.option_placeholder', {
                  index: optIndex + 1,
                  defaultValue: 'Option {{index}}...',
                })}
                className={cn('flex-1 h-8 text-sm', !option.text.trim() && 'border-destructive focus-visible:ring-destructive')}
              />

              <button
                type="button"
                onClick={() => handleDeleteOption(group.key, option.id)}
                disabled={group.options.length <= 2}
                aria-label={t('editor.select_correct_word.delete_option', { defaultValue: 'Delete option' })}
                className="shrink-0 p-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => handleAddOption(group.key)}
            className="self-start inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('editor.select_correct_word.add_option', { defaultValue: 'Add option' })}
          </button>
        </div>
      ))}

      {hasGroupErrors && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t('editor.select_correct_word.error_no_correct')}
        </div>
      )}
      {hasEmptyOptions && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {t('editor.select_correct_word.error_empty_options')}
        </div>
      )}
    </div>
  );
}

export default memo(SelectCorrectWordEditor);
