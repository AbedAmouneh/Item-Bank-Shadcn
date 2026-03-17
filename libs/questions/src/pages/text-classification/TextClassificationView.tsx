import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn, Button } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

const COLOR_MAP: Record<string, string> = {
  'blue':        '#1565c0',
  'orange':      '#e65100',
  'green':       '#2e7d32',
  'red':         '#c62828',
  'purple':      '#6a1b9a',
  'pink':        '#ad1457',
  'dark-orange': '#bf360c',
  'cyan':        '#00838f',
};

type CategoryData = {
  id: string;
  name: string;
  color: string;
  answers: Array<{
    id: string;
    text: string;
    feedback?: string;
    markPercent: number;
  }>;
};

type TextClassificationViewProps = {
  question: QuestionRow;
};

const TextClassificationView = ({ question }: TextClassificationViewProps) => {
  const { t } = useTranslation('questions');

  const categories: CategoryData[] = question.textClassificationCategories ?? [];
  const layout = question.textClassificationLayout ?? 'columns';
  const justification = question.textClassificationJustification ?? 'disabled';

  // Collect all answers from all categories
  const allItems = useMemo(() => {
    return categories.flatMap((cat) =>
      cat.answers.map((ans) => ({
        ...ans,
        correctCategoryId: cat.id,
      }))
    );
  }, [categories]);

  // State: which items are in which zone (categoryId -> answerId[])
  const [placements, setPlacements] = useState<Record<string, string[]>>({});
  const [justificationText, setJustificationText] = useState('');
  const [checked, setChecked] = useState(false);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  // Items currently in the pool (not placed in any category)
  const placedIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(placements).forEach((arr) => arr.forEach((id) => ids.add(id)));
    return ids;
  }, [placements]);

  const poolItems = useMemo(
    () => allItems.filter((item) => !placedIds.has(item.id)),
    [allItems, placedIds],
  );

  const hasPlacedItems = placedIds.size > 0;

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, answerId: string) => {
      e.dataTransfer.setData('text/plain', answerId);
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropOnCategory = useCallback(
    (e: React.DragEvent, categoryId: string) => {
      e.preventDefault();
      const answerId = e.dataTransfer.getData('text/plain');
      if (!answerId) return;

      setPlacements((prev) => {
        const next = { ...prev };
        // Remove from any existing category
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter((id) => id !== answerId);
        }
        // Add to target category
        next[categoryId] = [...(next[categoryId] ?? []), answerId];
        return next;
      });
      setDragOverZone(null);
    },
    [],
  );

  const handleDropOnPool = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const answerId = e.dataTransfer.getData('text/plain');
      if (!answerId) return;

      setPlacements((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter((id) => id !== answerId);
        }
        return next;
      });
      setDragOverZone(null);
    },
    [],
  );

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setPlacements({});
    setChecked(false);
  }, []);

  // Compute score
  const score = useMemo(() => {
    if (!checked) return 0;
    let correct = 0;
    const total = allItems.length;
    categories.forEach((cat) => {
      const placed = placements[cat.id] ?? [];
      const correctIds = new Set(cat.answers.map((a) => a.id));
      placed.forEach((id) => {
        if (correctIds.has(id)) correct++;
      });
    });
    return total > 0 ? Math.round((correct / total) * question.mark) : 0;
  }, [checked, categories, placements, allItems.length, question.mark]);

  const getAnswerById = useCallback(
    (id: string) => allItems.find((item) => item.id === id),
    [allItems],
  );

  const isCorrectPlacement = useCallback(
    (answerId: string, categoryId: string) => {
      const item = allItems.find((i) => i.id === answerId);
      return item?.correctCategoryId === categoryId;
    },
    [allItems],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Item pool */}
      <div
        className="rounded-2xl bg-muted/40 dark:bg-muted/30 p-3 min-h-[60px] flex flex-wrap gap-2"
        onDragOver={handleDragOver}
        onDrop={handleDropOnPool}
      >
        {poolItems.length > 0 ? (
          poolItems.map((item) => (
            <span
              key={item.id}
              draggable={!checked}
              onDragStart={(e) => handleDragStart(e, item.id)}
              className={cn(
                'px-2.5 py-1 text-sm rounded-lg border border-border bg-background text-foreground',
                checked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
              )}
            >
              {item.text}
            </span>
          ))
        ) : (
          <p className="self-center w-full text-center text-sm text-muted-foreground">
            {allItems.length === 0 ? 'No items' : 'All items placed'}
          </p>
        )}
      </div>

      {/* Category drop zones */}
      <div
        className={cn(
          'flex gap-3',
          layout === 'columns' ? 'flex-row flex-wrap' : 'flex-col',
        )}
      >
        {categories.map((cat) => {
          const colorHex = COLOR_MAP[cat.color] ?? COLOR_MAP.blue;
          const placedAnswerIds = placements[cat.id] ?? [];

          return (
            <div key={cat.id} className="flex-1 min-w-[180px]">
              {/* Category header bar */}
              <div
                className="px-4 py-2 text-sm font-semibold rounded-t-xl"
                style={{ backgroundColor: colorHex, color: '#ffffff' }}
              >
                {cat.name}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  handleDragOver(e);
                  setDragOverZone(cat.id);
                }}
                onDragLeave={() => setDragOverZone(null)}
                onDrop={(e) => handleDropOnCategory(e, cat.id)}
                className={cn(
                  'min-h-[120px] border-2 rounded-b-xl p-3 flex flex-wrap gap-2 content-start transition-all duration-200 bg-card',
                  dragOverZone === cat.id
                    ? 'border-solid'
                    : 'border-dashed',
                )}
                style={{
                  borderColor: dragOverZone === cat.id
                    ? colorHex
                    : `${colorHex}66`,
                  backgroundColor: dragOverZone === cat.id
                    ? `${colorHex}14`
                    : undefined,
                }}
              >
                {placedAnswerIds.map((answerId) => {
                  const answer = getAnswerById(answerId);
                  if (!answer) return null;
                  const isCorrect = checked ? isCorrectPlacement(answerId, cat.id) : undefined;
                  return (
                    <span
                      key={answerId}
                      draggable={!checked}
                      onDragStart={(e) => handleDragStart(e, answerId)}
                      className={cn(
                        'px-2.5 py-1 text-sm rounded-lg border',
                        checked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
                        isCorrect === true && 'bg-green-50 border-green-400 text-green-800 dark:bg-green-900/20 dark:border-green-600 dark:text-green-300',
                        isCorrect === false && 'bg-red-50 border-red-400 text-red-800 dark:bg-red-900/20 dark:border-red-600 dark:text-red-300',
                        isCorrect === undefined && 'bg-background border-border text-foreground',
                      )}
                    >
                      {answer.text}
                    </span>
                  );
                })}
                {placedAnswerIds.length === 0 && (
                  <span className="self-center w-full text-center py-4 text-xs text-muted-foreground">
                    Drop items here
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Justification field */}
      {justification !== 'disabled' && (
        <div>
          <p className="text-sm font-medium text-foreground mb-1">
            Justify your answer{justification === 'required' ? ' *' : ''}
          </p>
          <textarea
            value={justificationText}
            onChange={(e) => setJustificationText(e.target.value)}
            disabled={checked}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
          />
        </div>
      )}

      {/* Check/Retry + Mark */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!checked ? (
            <Button
              variant="default"
              onClick={handleCheck}
              disabled={!hasPlacedItems}
            >
              {t('check')}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleRetry}>
              {t('retry')}
            </Button>
          )}
        </div>

        {/* Score badge */}
        <span
          className={cn(
            'px-3 py-1 text-sm font-medium rounded-full border',
            !checked && 'border-border text-foreground bg-background',
            checked && score === question.mark && 'border-green-400 text-green-800 bg-green-50 dark:border-green-600 dark:text-green-300 dark:bg-green-900/20',
            checked && score > 0 && score < question.mark && 'border-yellow-400 text-yellow-800 bg-yellow-50 dark:border-yellow-600 dark:text-yellow-300 dark:bg-yellow-900/20',
            checked && score === 0 && 'border-red-400 text-red-800 bg-red-50 dark:border-red-600 dark:text-red-300 dark:bg-red-900/20',
          )}
        >
          {checked ? `${score} / ${question.mark}` : `${question.mark}`}
        </span>
      </div>
    </div>
  );
};

export default TextClassificationView;
