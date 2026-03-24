import type { CSSProperties } from 'react';

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
import { GripVertical, Trash2, FileText, ClipboardList, BarChart2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@item-bank/ui';

import type { Activity, ActivityType } from '@item-bank/api/courses';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ActivityIcon({ type }: { type: ActivityType }) {
  switch (type) {
    case 'quiz':          return <ClipboardList size={15} className="text-blue-500" />;
    case 'survey':        return <BarChart2     size={15} className="text-purple-500" />;
    case 'practice_quiz': return <ClipboardList size={15} className="text-orange-500" />;
    case 'pdf_book':      return <FileText      size={15} className="text-red-500" />;
  }
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

interface SortableRowProps {
  activity: Activity;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableRow({ activity, isSelected, onSelect, onDelete }: SortableRowProps) {
  const { t } = useTranslation('common');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/60',
        isDragging ? 'opacity-50' : '',
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label={t('courses.drag_handle_aria')}
        className="shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      <ActivityIcon type={activity.type} />

      <span className="flex-1 truncate text-sm">{activity.title}</span>

      <button
        type="button"
        aria-label={t('courses.delete')}
        className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-1 focus:ring-ring"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}

// ─── ActivityList ─────────────────────────────────────────────────────────────

export interface ActivityListProps {
  activities: Activity[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onReorder: (newOrder: Activity[]) => void;
}

/**
 * Renders a drag-and-drop sortable list of course activities.
 * Each row can be selected, reordered via drag, or deleted.
 */
export function ActivityList({
  activities,
  selectedId,
  onSelect,
  onDelete,
  onReorder,
}: ActivityListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activities.findIndex((a) => a.id === active.id);
    const newIndex = activities.findIndex((a) => a.id === over.id);
    onReorder(arrayMove(activities, oldIndex, newIndex));
  };

  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No activities yet. Click &ldquo;Add Activity&rdquo; below.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-1">
          {activities.map((activity) => (
            <SortableRow
              key={activity.id}
              activity={activity}
              isSelected={selectedId === activity.id}
              onSelect={() => onSelect(activity.id)}
              onDelete={() => onDelete(activity.id)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
