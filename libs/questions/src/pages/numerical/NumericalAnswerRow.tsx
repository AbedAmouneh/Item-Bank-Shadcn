import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@item-bank/ui';
import { type NumericalAnswerEntry, MARK_OPTIONS } from './types';

type NumericalAnswerRowProps = {
  answer: NumericalAnswerEntry;
  index: number;
  onChange: (id: string, field: keyof NumericalAnswerEntry, value: unknown) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
};

const NumericalAnswerRow = memo(function NumericalAnswerRow({
  answer,
  index,
  onChange,
  onRemove,
  canRemove,
}: NumericalAnswerRowProps) {
  const { t } = useTranslation('questions');
  const id = answer.id;

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20 flex-wrap">
      <Input
        type="number"
        value={answer.answer}
        onChange={(e) => onChange(id, 'answer', e.target.value)}
        className="w-28 text-sm"
        placeholder={`${t('editor.numerical.answer')} ${index + 1}`}
        step="any"
      />

      <span className="text-xs text-muted-foreground shrink-0">±</span>

      <Input
        type="number"
        value={answer.error}
        onChange={(e) => onChange(id, 'error', e.target.value)}
        className="w-24 text-sm"
        placeholder={t('editor.numerical.error_margin')}
        step="any"
        min={0}
      />

      <Select
        value={String(answer.mark)}
        onValueChange={(value) => onChange(id, 'mark', Number(value))}
      >
        <SelectTrigger className="w-24 text-sm h-9">
          <SelectValue placeholder={t('mark')} />
        </SelectTrigger>
        <SelectContent>
          {MARK_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={String(opt)}>
              {opt} %
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Named peer toggle for feedback */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none ms-auto">
        <input
          type="checkbox"
          className="sr-only peer/feedback"
          checked={answer.feedback}
          onChange={(e) => onChange(id, 'feedback', e.target.checked)}
        />
        <div className="w-9 h-5 rounded-full bg-muted peer-checked/feedback:bg-primary relative transition-colors">
          <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked/feedback:translate-x-4 rtl:peer-checked/feedback:-translate-x-4" />
        </div>
        <span className="text-xs text-foreground">{t('editor.feedback')}</span>
      </label>

      {canRemove ? (
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          aria-label={t('editor.numerical.delete_answer')}
        >
          <Trash2 size={14} />
        </button>
      ) : (
        <div className="w-8 shrink-0" />
      )}
    </div>
  );
});

export default NumericalAnswerRow;
