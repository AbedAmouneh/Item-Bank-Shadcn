import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { cn, ActionButton } from '@item-bank/ui';
import { type QuestionType } from '../../domain/types';

type QuestionCardToolbarProps = {
  /** Total count of visible (filtered) questions. */
  visibleCount: number;
  /** Sum of marks across all visible questions. */
  totalScore: number;
  search: string;
  onSearchChange: (value: string) => void;
  /** The currently active type filter, or 'all' for no filter. */
  activeType: QuestionType | 'all';
  onTypeChange: (type: QuestionType | 'all') => void;
  /** All question types present in the current unfiltered list. */
  availableTypes: QuestionType[];
  onAddQuestion: () => void;
};

function QuestionCardToolbar({
  visibleCount,
  totalScore,
  search,
  onSearchChange,
  activeType,
  onTypeChange,
  availableTypes,
  onAddQuestion,
}: QuestionCardToolbarProps) {
  const { t } = useTranslation('questions');

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Top row: stats on the left, Add Question on the right */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            {t('card.question_count', { count: visibleCount })}
          </span>
          <span className="text-xs text-muted-foreground">
            {t('card.total_score', { score: totalScore })}
          </span>
        </div>
        <ActionButton btnLabel={t('add_question')} onClick={onAddQuestion} />
      </div>

      {/* Search + filter chips row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search input */}
        <div className="relative">
          <Search
            size={14}
            className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('card.search_placeholder')}
            className="h-8 rounded-xl border border-border bg-background ps-8 pe-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
          />
        </div>

        {/* Type filter chips */}
        <button
          type="button"
          onClick={() => onTypeChange('all')}
          className={cn(
            'inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors',
            activeType === 'all'
              ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
              : 'border-border bg-transparent text-muted-foreground hover:bg-muted',
          )}
        >
          {t('card.filter_all')}
        </button>

        {availableTypes.map((type) => {
          const typeKey = type.toLowerCase().replace(/ /g, '_');
          return (
            <button
              key={type}
              type="button"
              onClick={() => onTypeChange(type)}
              className={cn(
                'inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors',
                activeType === type
                  ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                  : 'border-border bg-transparent text-muted-foreground hover:bg-muted',
              )}
            >
              {t(`types.${typeKey}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(QuestionCardToolbar);
