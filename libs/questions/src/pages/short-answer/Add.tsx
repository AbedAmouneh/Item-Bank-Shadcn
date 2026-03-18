import { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@item-bank/ui';
import { Plus, Trash2 } from 'lucide-react';

const MARK_OPTIONS = [0, 5, 10, 15, 20, 25, 33.3, 30, 40, 50, 60, 75, 80, 90, 100];

export type AnswerEntry = {
  id: string;
  text: string;
  mark: number;
  ignoreCasing: boolean;
  feedback: boolean;
};

export function createEmptyAnswer(id?: string): AnswerEntry {
  return {
    id: id ?? crypto.randomUUID(),
    text: '',
    mark: 100,
    ignoreCasing: true,
    feedback: false,
  };
}

function Add() {
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation('questions');

  const answers = (watch('answers') || [createEmptyAnswer()]) as AnswerEntry[];
  const ignoreCasing = watch('ignoreCasing') ?? true;
  const requireUniqueAnswers = watch('requireUniqueAnswers') ?? false;

  const answersRef = useRef<AnswerEntry[]>(answers);
  answersRef.current = answers;

  const handleAddAnswer = useCallback(() => {
    setValue('answers', [...answersRef.current, createEmptyAnswer()]);
  }, [setValue]);

  const handleDeleteAnswer = useCallback((id: string) => {
    setValue('answers', answersRef.current.filter((a) => a.id !== id));
  }, [setValue]);

  const handleAnswerChange = useCallback((id: string, text: string) => {
    setValue(
      'answers',
      answersRef.current.map((a) => (a.id === id ? { ...a, text } : a))
    );
  }, [setValue]);

  const handleMarkChange = useCallback((answerId: string, value: string) => {
    setValue(
      'answers',
      answersRef.current.map((a) =>
        a.id === answerId ? { ...a, mark: Number(value) } : a
      )
    );
  }, [setValue]);

  const handleCasingToggle = useCallback((checked: boolean) => {
    setValue('ignoreCasing', checked);
  }, [setValue]);

  const handleUniqueToggle = useCallback((checked: boolean) => {
    setValue('requireUniqueAnswers', checked);
  }, [setValue]);

  return (
    <div className="flex flex-col gap-6">

      {/* Answer rows */}
      <div className="flex flex-col gap-3">
        {answers.map((answer, index) => (
          <div
            key={answer.id}
            className="flex items-start gap-2 p-3 rounded-xl border border-border bg-muted/20"
          >
            {/* Answer index badge */}
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-2">
              {index + 1}
            </span>

            {/* Answer text input */}
            <Input
              value={answer.text}
              onChange={(e) => handleAnswerChange(answer.id, e.target.value)}
              placeholder={t('editor.answer_placeholder', { index: index + 1 })}
              className="flex-1 text-sm"
            />

            {/* Mark select */}
            <Select
              value={String(answer.mark)}
              onValueChange={(val) => handleMarkChange(answer.id, val)}
            >
              <SelectTrigger className="w-24 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARK_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Delete */}
            <button
              type="button"
              aria-label={t('editor.remove_answer')}
              onClick={() => handleDeleteAnswer(answer.id)}
              disabled={answers.length <= 1}
              className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-0.5"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Add answer button */}
      <button
        type="button"
        onClick={handleAddAnswer}
        className="self-start flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
      >
        <Plus size={15} />
        {t('editor.add_answer')}
      </button>

      <hr className="border-border" />

      {/* Options toggles */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" className="sr-only peer" checked={ignoreCasing} onChange={(e) => handleCasingToggle(e.target.checked)} />
          <div className="w-9 h-5 rounded-full transition-colors bg-[hsl(var(--toggle-track))] peer-checked:bg-primary relative">
            <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
          </div>
          <span className="text-sm text-foreground">{t('editor.ignore_casing')}</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" className="sr-only peer" checked={requireUniqueAnswers} onChange={(e) => handleUniqueToggle(e.target.checked)} />
          <div className="w-9 h-5 rounded-full transition-colors bg-[hsl(var(--toggle-track))] peer-checked:bg-primary relative">
            <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
          </div>
          <span className="text-sm text-foreground">{t('editor.require_unique_answers')}</span>
        </label>
      </div>

    </div>
  );
}

export default memo(Add);
