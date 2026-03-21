import { useCallback, useMemo, useState } from 'react';
import { Check, RotateCcw, Lightbulb, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, cn } from '@item-bank/ui';
import type { QuestionRow, QuestionChoice } from '../../components/QuestionsTable';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TextSequencingQuestionViewProps = {
  question: QuestionRow;
};

type DisplayItem = {
  canonicalId: number;
  text: string;
  markPercent: number;
};

// ---------------------------------------------------------------------------
// Shuffle helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleUnique(arr: DisplayItem[], current: DisplayItem[]): DisplayItem[] {
  if (arr.length <= 1) return [...arr];
  if (arr.length === 2) {
    const [a, b] = arr;
    return current[0]?.canonicalId === a.canonicalId ? [b, a] : [a, b];
  }

  const currentSig = current.map((x) => x.canonicalId).join(',');
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = shuffle([...arr]);
    if (result.map((x) => x.canonicalId).join(',') !== currentSig) return result;
  }
  return [...current.slice(1), current[0]];
}

function buildCanonicalItems(choices: QuestionChoice[] | undefined): DisplayItem[] {
  return [...(choices ?? [])]
    .sort((a, b) => a.id - b.id)
    .map((c) => ({
      canonicalId: c.id,
      text: c.answer,
      markPercent: parseFloat(c.fraction),
    }));
}

// ---------------------------------------------------------------------------
// SortableItem — one draggable row
// ---------------------------------------------------------------------------

type SortableItemProps = {
  item: DisplayItem;
  index: number;
  /** Whether the answer has been submitted. Locks dragging and shows colors. */
  checked: boolean;
  /** True = this item is in the correct position; false = wrong; null = not yet checked. */
  isCorrect: boolean | null;
};

function SortableItem({ item, index, checked, isCorrect }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.canonicalId,
    disabled: checked,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-colors',
        isDragging && 'opacity-50 shadow-lg',
        !checked && 'border-border bg-muted/30',
        checked && isCorrect === true && 'border-emerald-500/50 bg-emerald-500/10',
        checked && isCorrect === false && 'border-red-500/50 bg-red-500/10',
      )}
    >
      {/* Drag handle — hidden once checked */}
      {!checked && (
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Drag to reorder"
          className="p-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical size={14} />
        </button>
      )}

      {/* Position badge */}
      <span
        className={cn(
          'w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center shrink-0',
          !checked && 'bg-primary/10 text-primary',
          checked && isCorrect === true && 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
          checked && isCorrect === false && 'bg-red-500/20 text-red-700 dark:text-red-400',
        )}
      >
        {index + 1}
      </span>

      <span className="text-sm text-foreground">{item.text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TextSequencingQuestionView
// ---------------------------------------------------------------------------

const TextSequencingQuestionView = ({ question }: TextSequencingQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');
  const allowPartialCredit = question.sequencingAllowPartialCredit ?? false;

  const canonicalItems = useMemo(
    () => buildCanonicalItems(question.choices),
    [question.choices],
  );

  const [items, setItems] = useState<DisplayItem[]>(() =>
    shuffleUnique(buildCanonicalItems(question.choices), buildCanonicalItems(question.choices)),
  );
  const [checked, setChecked] = useState(false);
  const [flashWrong, setFlashWrong] = useState(false);

  // dnd-kit sensors — PointerSensor for mouse/touch, KeyboardSensor for a11y
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const triggerFlashWrong = useCallback(() => {
    setFlashWrong(true);
    const id = setTimeout(() => setFlashWrong(false), 800);
    return id;
  }, []);

  const formatNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language).format(n),
    [i18n.language],
  );

  // Reorder items when a drag completes
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((item) => item.canonicalId === active.id);
        const newIndex = prev.findIndex((item) => item.canonicalId === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const score = useMemo(() => {
    if (!checked) return null;
    if (allowPartialCredit) {
      let earnedPercent = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i].canonicalId === i) earnedPercent += items[i].markPercent;
      }
      const earned = Math.round((earnedPercent / 100) * question.mark * 100) / 100;
      return { earned, isFullyCorrect: earnedPercent >= 100 };
    }
    const allCorrect = items.every((item, i) => item.canonicalId === i);
    return { earned: allCorrect ? question.mark : 0, isFullyCorrect: allCorrect };
  }, [checked, items, allowPartialCredit, question.mark]);

  /** Per-item correctness — null when not yet checked. */
  const itemCorrectness = useMemo(
    () => (checked ? items.map((item, i) => item.canonicalId === i) : null),
    [checked, items],
  );

  const handleCheck = useCallback(() => {
    setChecked(true);
    const isCorrect = allowPartialCredit
      ? items.reduce((sum, item, i) => (item.canonicalId === i ? sum + item.markPercent : sum), 0) >= 100
      : items.every((item, i) => item.canonicalId === i);
    if (!isCorrect) triggerFlashWrong();
  }, [items, allowPartialCredit, triggerFlashWrong]);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setFlashWrong(false);
    setItems((prev) => shuffleUnique(canonicalItems, prev));
  }, [canonicalItems]);

  const handleShowSolution = useCallback(() => {
    setFlashWrong(false);
    setItems([...canonicalItems]);
    setChecked(true);
  }, [canonicalItems]);

  return (
    <>
      {/* Sortable list */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((item) => item.canonicalId)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={cn(
              'flex flex-col gap-2 mb-6 p-4 rounded-2xl border transition-colors',
              'border-border bg-card',
              flashWrong && 'animate-wrong-flash',
            )}
          >
            {items.map((item, index) => (
              <SortableItem
                key={item.canonicalId}
                item={item}
                index={index}
                checked={checked}
                isCorrect={itemCorrectness ? itemCorrectness[index] : null}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="default"
            className="rounded-xl font-semibold gap-1.5"
            onClick={checked ? handleRetry : handleCheck}
          >
            {checked ? <RotateCcw size={15} /> : <Check size={15} />}
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && score && !score.isFullyCorrect && (
            <Button
              variant="default"
              className="rounded-xl font-semibold gap-1.5"
              onClick={handleShowSolution}
            >
              <Lightbulb size={15} />
              {t('show_solution')}
            </Button>
          )}

          {checked && score && (
            <span
              className={cn(
                'inline-flex items-center rounded-xl border ps-3 pe-3 py-1 text-sm font-semibold',
                score.isFullyCorrect
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'border-border text-foreground',
              )}
            >
              {formatNum(score.earned)} / {formatNum(question.mark)}
            </span>
          )}
        </div>

        {/* Mark badge */}
        <div className="py-2 ps-4 pe-4 rounded-xl border border-border bg-card text-foreground font-semibold text-[0.95rem]">
          {formatNum(question.mark)}
        </div>
      </div>
    </>
  );
};

export default TextSequencingQuestionView;
