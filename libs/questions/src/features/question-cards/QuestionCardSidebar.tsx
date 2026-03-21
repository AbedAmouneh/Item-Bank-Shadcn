import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
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
import { cn } from '@item-bank/ui';
import { type QuestionRow } from '../../components/QuestionsTable';

// ---------------------------------------------------------------------------
// Single sortable row
// ---------------------------------------------------------------------------

type SortableRowProps = {
  question: QuestionRow;
  index: number;
};

function SortableRow({ question, index }: SortableRowProps) {
  const { t } = useTranslation('questions');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground',
        isDragging ? 'opacity-50 bg-muted' : 'hover:bg-muted/60',
      )}
    >
      {/* Number badge */}
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.6rem] font-semibold text-muted-foreground">
        {index}
      </span>

      {/* Question name */}
      <span className="flex-1 truncate">{question.questionName}</span>

      {/* Drag handle */}
      <button
        type="button"
        aria-label={t('card.drag_handle_aria', { name: question.questionName })}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

type QuestionCardSidebarProps = {
  /** Ordered list of questions (local order state). */
  questions: QuestionRow[];
  onReorder: (newOrder: QuestionRow[]) => void;
};

function QuestionCardSidebar({ questions, onReorder }: QuestionCardSidebarProps) {
  const { t } = useTranslation('questions');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(questions, oldIndex, newIndex));
  };

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('card.sidebar_title')}
      </h3>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="flex flex-col gap-0.5 overflow-y-auto">
            {questions.map((q, i) => (
              <SortableRow key={q.id} question={q} index={i + 1} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </aside>
  );
}

export default memo(QuestionCardSidebar);
