import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import ChoiceEditor from './ChoiceEditor';
import ChoiceFeedback from './ChoiceFeedback';
import { cn } from '@item-bank/ui';
import { Trash2 } from 'lucide-react';

type Choice = {
  id: string;
  text: string;
  isCorrect: boolean;
  feedbackEnabled: boolean;
  feedbackText: string;
};

type ChoiceItemProps = {
  choice: Choice;
  index: number;
  canDelete: boolean;
  onTextChange: (id: string, value: string) => void;
  onCorrectToggle: (id: string, checked: boolean) => void;
  onFeedbackToggle: (id: string, checked: boolean) => void;
  onFeedbackTextChange: (id: string, value: string) => void;
  onDelete: (id: string) => void;
};

function ChoiceItem({
  choice,
  index,
  canDelete,
  onTextChange,
  onCorrectToggle,
  onFeedbackToggle,
  onFeedbackTextChange,
  onDelete,
}: ChoiceItemProps) {
  const { t } = useTranslation('questions');

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-5 rounded-2xl border-2 transition-colors duration-150',
        'bg-[hsl(var(--choice-item-background))]',
        choice.isCorrect
          ? 'border-primary/60'
          : 'border-[hsl(var(--choice-item-border))]'
      )}
    >
      {/* Choice editor (TinyMCE) */}
      <ChoiceEditor
        value={choice.text}
        onChange={(value) => onTextChange(choice.id, value)}
        height={120}
        placeholder={t('editor.choice_placeholder', { index: index + 1 })}
        variant="choice"
      />

      {/* Controls row */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-4 items-center">
          {/* Correct toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={choice.isCorrect}
              onChange={(e) => onCorrectToggle(choice.id, e.target.checked)}
            />
            <div className="w-9 h-5 rounded-full transition-colors bg-[hsl(var(--toggle-track))] peer-checked:bg-primary relative">
              <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
            </div>
            <span className="text-sm text-foreground">{t('editor.correct')}</span>
          </label>

          {/* Feedback toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={choice.feedbackEnabled}
              onChange={(e) => onFeedbackToggle(choice.id, e.target.checked)}
            />
            <div className="w-9 h-5 rounded-full transition-colors bg-[hsl(var(--toggle-track))] peer-checked:bg-primary relative">
              <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
            </div>
            <span className="text-sm text-foreground">{t('editor.feedback')}</span>
          </label>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => onDelete(choice.id)}
          disabled={!canDelete}
          aria-label={t('editor.delete_choice')}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Conditional feedback editor */}
      {choice.feedbackEnabled && (
        <ChoiceFeedback
          feedbackText={choice.feedbackText}
          onChange={(value) => onFeedbackTextChange(choice.id, value)}
          choiceId={choice.id}
        />
      )}
    </div>
  );
}

export default memo(ChoiceItem);
