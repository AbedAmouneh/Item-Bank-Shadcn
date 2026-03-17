import { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Plus, Trash2, Info } from 'lucide-react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@item-bank/ui';
import { createEmptyAnswer } from '../../domain/factory';
import { type AnswerEntry } from '../../domain/types';

const MARK_OPTIONS = [0, 5, 10, 15, 20, 25, 33.3, 30, 40, 50, 60, 75, 80, 90, 100];

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

function hasMeaningfulHtmlContent(html: string): boolean {
  const plainText = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return plainText.length > 0;
}

export type AnswerGroup = { key: string; answers: AnswerEntry[] };

type FillInBlanksEditorProps = {
  questionContent?: string;
  contentError?: string;
  layout?: 'full' | 'content' | 'answers';
};

function FillInBlanksEditor({
  questionContent = '',
  contentError,
  layout = 'full',
}: FillInBlanksEditorProps) {
  const { watch, setValue } = useFormContext();
  const { t, i18n } = useTranslation('questions');

  const watchedAnswerGroups = watch('answerGroups');
  const answerGroups = useMemo<AnswerGroup[]>(
    () => watchedAnswerGroups ?? [],
    [watchedAnswerGroups]
  );
  const manualMarking = watch('manualMarking') ?? false;
  const requireUniqueKeyAnswers = watch('requireUniqueKeyAnswers') ?? false;
  const content = watch('content') ?? '';

  const parsedKeys = useMemo(
    () => parseKeysFromText(questionContent || content),
    [questionContent, content]
  );
  const hasKeys = parsedKeys.length >= 1;
  const showNoKeyError = hasMeaningfulHtmlContent(content) && !hasKeys;
  const showContentSection = layout !== 'answers';
  const showAnswersSection = layout !== 'content';
  const lastSyncedKeysSignature = useRef<string | null>(null);

  const editorInit = useMemo(
    () => {
      const isDark = document.documentElement.classList.contains('dark');
      return {
        height: 240,
        menubar: false,
        directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
        plugins: ['advlist', 'lists', 'link', 'wordcount', 'help'],
        toolbar:
          'undo redo | blocks fontfamily fontsize | bullist numlist | key | bold italic underline strikethrough | superscript subscript | outdent indent | link',
        toolbar_mode: 'floating' as const,
        statusbar: true,
        placeholder: t('editor.fill_in_blanks.content_placeholder'),
        setup: (editor: TinyMCEEditor) => {
          editor.ui.registry.addButton('key', {
            text: t('editor.fill_in_blanks.toolbar_key'),
            onAction: () => {
              const defaultKey = t('editor.fill_in_blanks.key_default', {
                defaultValue: 'KeyText',
              });
              editor.insertContent(`[[${defaultKey}]]`);
              editor.focus();
            },
          });
        },
        skin: isDark ? 'oxide-dark' : 'oxide',
        content_css: isDark ? 'dark' : 'default',
        content_style: isDark
          ? 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; background-color: #0f172a; color: rgba(248, 250, 252, 0.9); }'
          : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; }',
      };
    },
    [i18n.language, t]
  );

  useEffect(() => {
    if (!showAnswersSection) {
      return;
    }

    const keysSignature = JSON.stringify(parsedKeys);
    if (keysSignature === lastSyncedKeysSignature.current) {
      return;
    }

    const existingByKey = new Map(answerGroups.map((g) => [g.key, g.answers]));
    const newGroups: AnswerGroup[] = parsedKeys.map((key) => {
      const existing = existingByKey.get(key);
      return {
        key,
        answers: existing && existing.length > 0 ? existing : [createEmptyAnswer()],
      };
    });

    const isUnchanged =
      newGroups.length === answerGroups.length &&
      newGroups.every((group, index) => {
        const currentGroup = answerGroups[index];
        return currentGroup?.key === group.key && currentGroup?.answers === group.answers;
      });

    lastSyncedKeysSignature.current = keysSignature;
    if (isUnchanged) {
      return;
    }

    setValue('answerGroups', newGroups);
  }, [showAnswersSection, parsedKeys, answerGroups, setValue]);

  const handleManualMarkingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue('manualMarking', e.target.checked);
    },
    [setValue]
  );

  const handleRequireUniqueKeyAnswersChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue('requireUniqueKeyAnswers', e.target.checked);
    },
    [setValue]
  );

  const handleGroupAnswersChange = useCallback(
    (key: string, nextAnswers: AnswerEntry[]) => {
      setValue(
        'answerGroups',
        answerGroups.map((g) => (g.key === key ? { ...g, answers: nextAnswers } : g))
      );
    },
    [setValue, answerGroups]
  );

  const handleAddAnswer = useCallback(
    (key: string) => {
      const group = answerGroups.find((g) => g.key === key);
      if (!group) return;
      handleGroupAnswersChange(key, [...group.answers, createEmptyAnswer()]);
    },
    [answerGroups, handleGroupAnswersChange]
  );

  const handleRemoveAnswer = useCallback(
    (key: string, id: string) => {
      const group = answerGroups.find((g) => g.key === key);
      if (!group || group.answers.length <= 1) return;
      handleGroupAnswersChange(
        key,
        group.answers.filter((a) => a.id !== id)
      );
    },
    [answerGroups, handleGroupAnswersChange]
  );

  const handleAnswerFieldChange = useCallback(
    (key: string, answerId: string, field: keyof AnswerEntry, value: unknown) => {
      const group = answerGroups.find((g) => g.key === key);
      if (!group) return;
      handleGroupAnswersChange(
        key,
        group.answers.map((a) => (a.id === answerId ? { ...a, [field]: value } : a))
      );
    },
    [answerGroups, handleGroupAnswersChange]
  );

  const answersLocked = manualMarking;

  return (
    <div className="flex flex-col gap-6">
      {showContentSection && (
        <div>
          <p className="text-sm mb-3 font-medium text-foreground/75">
            {t('editor.fill_in_blanks.question_content')}
            <span className="ms-1 font-bold text-destructive">*</span>
          </p>
          {/* ContentEditorWrapper — overflow hidden so TinyMCE border stays inside rounded container */}
          <div className="rounded-xl overflow-hidden border border-border/35 [&_.tox-tinymce]:!border-none">
            <Editor
              tinymceScriptSrc="/tinymce/tinymce.min.js"
              licenseKey="gpl"
              value={content}
              onEditorChange={(newValue) => setValue('content', newValue, { shouldValidate: true })}
              init={editorInit}
            />
          </div>
          {contentError && (
            <span className="text-xs font-medium text-destructive mt-1 block">
              {contentError}
            </span>
          )}
        </div>
      )}

      {showAnswersSection && (
        <>
          {/* Toggle switches row */}
          <div className="flex items-center mb-2 flex-wrap gap-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={manualMarking}
                onChange={handleManualMarkingChange}
              />
              <div className="w-9 h-5 rounded-full transition-colors bg-[hsl(var(--toggle-track))] peer-checked:bg-primary relative">
                <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
              </div>
              <span className="text-sm text-foreground">
                {t('editor.fill_in_blanks.manual_marking_mode', {
                  defaultValue: t('editor.fill_in_blanks.manual_marking'),
                })}
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={requireUniqueKeyAnswers}
                onChange={handleRequireUniqueKeyAnswersChange}
              />
              <div className="w-9 h-5 rounded-full transition-colors bg-[hsl(var(--toggle-track))] peer-checked:bg-primary relative">
                <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
              </div>
              <span className="text-sm text-foreground">
                {t('editor.fill_in_blanks.require_unique_answers', {
                  defaultValue: t('editor.fill_in_blanks.require_unique_key_answers'),
                })}
              </span>
            </label>
          </div>

          {manualMarking && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 mb-2">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>{t('editor.fill_in_blanks.manual_marking_answers_locked')}</span>
            </div>
          )}

          {showNoKeyError && (
            <p role="alert" className="text-sm mb-2 text-destructive">
              {t('editor.fill_in_blanks.error_no_key')}
            </p>
          )}

          {hasKeys && (
            <>
              <span className="block text-[0.8125rem] font-normal mb-2 text-muted-foreground">
                {t('editor.fill_in_blanks.answers_by_key')}
              </span>

              {answerGroups.map((group) => (
                <div key={group.key} className="mb-6">
                  <p className="font-semibold text-sm mb-4 text-muted-foreground">
                    {group.key}
                  </p>
                  {group.answers.map((answer) => (
                    <div
                      key={answer.id}
                      className={cn(
                        'flex items-center gap-3 p-3 w-full box-border min-w-0',
                        'rounded-lg border border-border bg-muted/30 mb-2'
                      )}
                    >
                      <Input
                        placeholder={t('editor.add_answer')}
                        value={answer.text}
                        onChange={(e) =>
                          handleAnswerFieldChange(group.key, answer.id, 'text', e.target.value)
                        }
                        disabled={answersLocked}
                        className="flex-[0_0_36%] min-w-0 h-[34px] text-[0.8125rem]"
                      />
                      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                        <Select
                          value={String(answer.mark)}
                          disabled={answersLocked || requireUniqueKeyAnswers}
                          onValueChange={(val) =>
                            handleAnswerFieldChange(group.key, answer.id, 'mark', Number(val))
                          }
                        >
                          <SelectTrigger className="min-w-[82px] h-[34px] text-[0.8125rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MARK_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)}>
                                {opt} %
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <label className="shrink-0 flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={answer.ignoreCasing}
                            disabled={answersLocked}
                            onChange={(e) =>
                              handleAnswerFieldChange(
                                group.key,
                                answer.id,
                                'ignoreCasing',
                                e.target.checked
                              )
                            }
                          />
                          <div className="w-9 h-5 rounded-full transition-colors bg-[hsl(var(--toggle-track))] peer-checked:bg-primary relative peer-disabled:opacity-50">
                            <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
                          </div>
                          <span className="text-xs text-foreground">{t('editor.ignore_casing')}</span>
                        </label>

                        {group.answers.length > 1 ? (
                          <button
                            type="button"
                            className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={() => handleRemoveAnswer(group.key, answer.id)}
                            disabled={answersLocked}
                            aria-label={t('editor.remove_answer')}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <div className="w-8 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddAnswer(group.key)}
                    disabled={answersLocked}
                    className="self-start flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium mt-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={15} />
                    {t('editor.add_answer')}
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default memo(FillInBlanksEditor);
