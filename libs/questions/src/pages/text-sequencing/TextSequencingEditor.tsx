import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, Plus, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Input, cn } from '@item-bank/ui';

type SequencingItem = {
  id: string;
  text: string;
  markPercent: number;
};
function distributeMarks(count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor((100 / count) * 100) / 100;
  const remainder = Math.round((100 - base * (count - 1)) * 100) / 100;
  return [...Array(count - 1).fill(base), remainder];
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function TextSequencingEditor() {
  const { watch, setValue, register, unregister, getValues } = useFormContext();
  const { t, i18n } = useTranslation('questions');

  const watchedItems = watch('sequencingItems');
  const items: SequencingItem[] = useMemo(() => watchedItems ?? [], [watchedItems]);
  const autoDistribute: boolean = watch('autoDistributeMarks') ?? true;
  const allowPartialCredit: boolean = watch('allowPartialCreditScoring') ?? false;
  const itemsRef = useRef<SequencingItem[]>(items);
  const dragSource = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const dragStartPoint = useRef<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const grabOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const rowListRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusRef = useRef<number | null>(null);

  const totalMark = useMemo(
    () => Math.round(items.reduce((sum, it) => sum + (it.markPercent ?? 0), 0) * 100) / 100,
    [items]
  );
  const isTotalValid = totalMark === 100 || items.length === 0;
  const hasEmptyText = items.some((it) => !it.text.trim());
  const hasTooFewRows = items.length < 2;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    register('sequencingItems', {
      validate: {
        minRows: (vals: SequencingItem[]) =>
          (vals ?? []).length >= 2 || t('editor.text_sequencing.error_min_rows'),
        noEmpty: (vals: SequencingItem[]) =>
          !(vals ?? []).some((it) => !it.text.trim()) ||
          t('editor.text_sequencing.error_empty_rows'),
        totalIs100: (vals: SequencingItem[]) => {
          if (getValues('autoDistributeMarks')) return true;
          const total =
            Math.round((vals ?? []).reduce((s, it) => s + it.markPercent, 0) * 100) / 100;
          return (
            total === 100 ||
            t('editor.text_sequencing.error_total_not_100', {
              total: new Intl.NumberFormat(i18n.language).format(total),
            })
          );
        },
      },
    });
    return () => {
      unregister('sequencingItems', { keepValue: true });
    };
  }, [register, unregister, getValues, t, i18n.language]);
  useEffect(() => {
    if (pendingFocusRef.current !== null) {
      const idx = pendingFocusRef.current;
      pendingFocusRef.current = null;
      const handle = rowListRef.current?.querySelector(
        `[data-row-index="${idx}"] [data-drag-handle]`
      ) as HTMLElement | null;
      handle?.focus();
    }
  });
  useLayoutEffect(() => {
    if (dragSource.current === null || !grabOffsetRef.current) return;
    const draggedEl = rowListRef.current?.querySelector(
      '[data-dragging="true"]'
    ) as HTMLElement | null;
    if (!draggedEl) return;
    const rect = draggedEl.getBoundingClientRect();
    const naturalLeft = rect.left - dragOffsetRef.current.x;
    const naturalTop = rect.top - dragOffsetRef.current.y;
    dragStartPoint.current = {
      x: naturalLeft + grabOffsetRef.current.x,
      y: naturalTop + grabOffsetRef.current.y,
    };
  }, [items]);

  const applyAutoDistribute = useCallback((newItems: SequencingItem[]) => {
    const marks = distributeMarks(newItems.length);
    return newItems.map((it, i) => ({ ...it, markPercent: marks[i] }));
  }, []);

  const reorderItems = useCallback(
    (from: number, to: number, focusAfter?: number) => {
      const base = itemsRef.current;
      const next = moveItem(base, from, to);
      const nextValue = autoDistribute ? applyAutoDistribute(next) : next;
      itemsRef.current = nextValue;
      setValue('sequencingItems', nextValue);
      if (focusAfter !== undefined) pendingFocusRef.current = focusAfter;
    },
    [setValue, autoDistribute, applyAutoDistribute]
  );

  const handleTextChange = useCallback(
    (id: string, value: string) => {
      setValue(
        'sequencingItems',
        items.map((it) => (it.id === id ? { ...it, text: value } : it))
      );
    },
    [setValue, items]
  );

  const handleMarkChange = useCallback(
    (id: string, raw: string) => {
      const value = parseFloat(raw);
      if (isNaN(value)) return;
      setValue(
        'sequencingItems',
        items.map((it) => (it.id === id ? { ...it, markPercent: value } : it))
      );
    },
    [setValue, items]
  );

  const handleAddRow = useCallback(() => {
    const newItem: SequencingItem = { id: crypto.randomUUID(), text: '', markPercent: 0 };
    const updated = [...items, newItem];
    setValue('sequencingItems', autoDistribute ? applyAutoDistribute(updated) : updated);
  }, [setValue, items, autoDistribute, applyAutoDistribute]);

  const handleDeleteRow = useCallback(
    (id: string) => {
      if (items.length <= 2) return;
      const updated = items.filter((it) => it.id !== id);
      setValue('sequencingItems', autoDistribute ? applyAutoDistribute(updated) : updated);
    },
    [setValue, items, autoDistribute, applyAutoDistribute]
  );

  const handleAutoDistributeChange = useCallback(
    (checked: boolean) => {
      setValue('autoDistributeMarks', checked);
      if (checked) setValue('sequencingItems', applyAutoDistribute(items));
    },
    [setValue, items, applyAutoDistribute]
  );

  const handlePartialCreditChange = useCallback(
    (checked: boolean) => setValue('allowPartialCreditScoring', checked),
    [setValue]
  );

  const handleHandleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (index > 0) reorderItems(index, index - 1, index - 1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (index < items.length - 1) reorderItems(index, index + 1, index + 1);
      }
    },
    [items.length, reorderItems]
  );

  const handleContainerPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as Element;
    const dragHandle = target.closest('[data-drag-handle="true"]') as HTMLElement | null;
    if (!dragHandle) return;
    const card = dragHandle.closest('[data-row-index]') as HTMLElement | null;
    if (!card) return;
    const idx = parseInt(card.dataset.rowIndex ?? '-1', 10);
    if (idx === -1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const cardRect = card.getBoundingClientRect();
    grabOffsetRef.current = { x: e.clientX - cardRect.left, y: e.clientY - cardRect.top };
    dragOffsetRef.current = { x: 0, y: 0 };
    dragSource.current = idx;
    dragOverIndexRef.current = idx;
    setDragOverIndex(idx);
    setDragSourceIndex(idx);
    dragStartPoint.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const handleContainerPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (dragSource.current === null) return;
    const start = dragStartPoint.current;
    if (start) {
      const nextOffset = { x: e.clientX - start.x, y: e.clientY - start.y };
      dragOffsetRef.current = nextOffset;
      setDragOffset((prev) =>
        prev.x === nextOffset.x && prev.y === nextOffset.y ? prev : nextOffset
      );
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const card = el?.closest('[data-row-index]') as HTMLElement | null;
    if (!card) return;
    const idx = parseInt(card.dataset.rowIndex ?? '-1', 10);
    const src = dragSource.current;
    if (src === null || idx === -1 || idx === src) return;
    if (idx !== dragOverIndexRef.current) {
      reorderItems(src, idx);
      dragSource.current = idx;
      setDragSourceIndex(idx);
      dragOverIndexRef.current = idx;
      setDragOverIndex(idx);
    }
  }, [reorderItems]);

  const handleContainerPointerUp = useCallback(() => {
    dragSource.current = null;
    dragOverIndexRef.current = null;
    grabOffsetRef.current = null;
    dragOffsetRef.current = { x: 0, y: 0 };
    setDragOverIndex(null);
    setDragSourceIndex(null);
    dragStartPoint.current = null;
    setDragOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div className="flex flex-col gap-6">

      {/* Header row: label + toggles */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <span className="text-sm font-semibold text-foreground">
          {t('editor.text_sequencing.rows_label')} *
        </span>
        <div className="flex gap-4 items-center flex-wrap">
          {/* Auto-distribute toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only peer/auto"
              checked={autoDistribute}
              onChange={(e) => handleAutoDistributeChange(e.target.checked)}
            />
            <div className="w-9 h-5 rounded-full bg-muted peer-checked/auto:bg-primary relative transition-colors">
              <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked/auto:translate-x-4 rtl:peer-checked/auto:-translate-x-4" />
            </div>
            <span className="text-sm text-foreground">
              {t('editor.text_sequencing.auto_distribute')}
            </span>
          </label>

          {/* Partial credit toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only peer/partial"
              checked={allowPartialCredit}
              onChange={(e) => handlePartialCreditChange(e.target.checked)}
            />
            <div className="w-9 h-5 rounded-full bg-muted peer-checked/partial:bg-primary relative transition-colors">
              <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked/partial:translate-x-4 rtl:peer-checked/partial:-translate-x-4" />
            </div>
            <span className="text-sm text-foreground">
              {t('editor.text_sequencing.partial_credit')}
            </span>
          </label>
        </div>
      </div>

      {/* Draggable row list */}
      <div
        className="flex flex-col gap-3 touch-none"
        ref={rowListRef}
        role="list"
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
        onPointerCancel={handleContainerPointerUp}
      >
        {items.map((item, index) => {
          const isDragging = dragSourceIndex === index;
          const isDragOver = dragOverIndex === index && dragSource.current !== index;

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-2 p-3 rounded-2xl border bg-card transition-colors',
                isDragging
                  ? 'opacity-80 shadow-lg border-primary/30 z-20 pointer-events-none'
                  : isDragOver
                    ? 'border-primary bg-primary/[0.07]'
                    : 'border-border hover:border-primary/20'
              )}
              role="listitem"
              data-row-index={index}
              data-drag-over={isDragOver ? 'true' : undefined}
              data-dragging={isDragging ? 'true' : undefined}
              style={
                isDragging
                  ? {
                      transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.015)`,
                      transition: 'box-shadow 0.18s ease, border-color 0.12s ease, background-color 0.12s ease',
                    }
                  : undefined
              }
            >
              {/* Drag handle */}
              <div
                className="flex items-center p-1 rounded-lg shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 focus-visible:text-primary"
                data-drag-handle="true"
                tabIndex={0}
                aria-label={t('editor.text_sequencing.drag_handle_label', { index: index + 1 })}
                onKeyDown={(e) => handleHandleKeyDown(e, index)}
              >
                <GripVertical size={16} />
              </div>

              <span className="text-center shrink-0 min-w-5 text-xs text-muted-foreground">
                {index + 1}
              </span>

              <Input
                value={item.text}
                onChange={(e) => handleTextChange(item.id, e.target.value)}
                placeholder={t('editor.text_sequencing.row_placeholder', { index: index + 1 })}
                className={cn('flex-1 h-8', !item.text.trim() && 'border-destructive')}
                required
              />

              {/* Mark percent input */}
              <div className="relative w-20 shrink-0">
                <input
                  type="number"
                  value={item.markPercent}
                  onChange={(e) => handleMarkChange(item.id, e.target.value)}
                  min={0}
                  max={100}
                  step={0.01}
                  disabled={autoDistribute}
                  className="w-full h-8 rounded-md border border-input bg-background pe-6 ps-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-xs text-muted-foreground">
                  %
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteRow(item.id)}
                disabled={items.length <= 2}
                className="shrink-0 p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t('editor.text_sequencing.drag_handle_label', { index: index + 1 })}
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="self-start flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        onClick={handleAddRow}
      >
        <Plus size={15} />
        {t('editor.text_sequencing.add_row')}
      </button>

      {/* Validation alerts */}
      {hasTooFewRows && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/[0.05] p-3 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{t('editor.text_sequencing.error_min_rows')}</span>
        </div>
      )}
      {hasEmptyText && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/[0.05] p-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{t('editor.text_sequencing.error_empty_rows')}</span>
        </div>
      )}
      {!autoDistribute && !isTotalValid && items.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/[0.05] p-3 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            {t('editor.text_sequencing.error_total_not_100', {
              total: new Intl.NumberFormat(i18n.language).format(totalMark),
            })}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(TextSequencingEditor);
