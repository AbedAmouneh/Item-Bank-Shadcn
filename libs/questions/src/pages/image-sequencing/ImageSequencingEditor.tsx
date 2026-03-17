import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, Plus, Trash2, ImagePlus, AlertCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { cn } from '@item-bank/ui';

type SequencingItem = {
  id: string;
  text?: string;
  image?: string;
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ImageSequencingEditor() {
  const { watch, setValue, register, unregister, getValues } = useFormContext();
  const { t, i18n } = useTranslation('questions');

  const watchedItems = watch('sequencingItems');
  const items: SequencingItem[] = useMemo(() => watchedItems ?? [], [watchedItems]);
  const autoDistribute: boolean = watch('autoDistributeMarks') ?? true;
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
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const totalMark = useMemo(
    () => Math.round(items.reduce((sum, it) => sum + (it.markPercent ?? 0), 0) * 100) / 100,
    [items]
  );
  const isTotalValid = totalMark === 100 || items.length === 0;
  const hasEmptyImages = items.some((it) => !it.image?.trim());
  const hasTooFewRows = items.length < 2;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    register('sequencingItems', {
      validate: {
        minRows: (vals: SequencingItem[]) =>
          (vals ?? []).length >= 2 || t('editor.image_sequencing.error_min_rows'),
        noEmpty: (vals: SequencingItem[]) =>
          !(vals ?? []).some((it) => !it.image?.trim()) ||
          t('editor.image_sequencing.error_empty_images'),
        totalIs100: (vals: SequencingItem[]) => {
          if (getValues('autoDistributeMarks')) return true;
          const total =
            Math.round((vals ?? []).reduce((s, it) => s + it.markPercent, 0) * 100) / 100;
          return (
            total === 100 ||
            t('editor.image_sequencing.error_total_not_100', {
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

  const handleImageChange = useCallback(
    async (id: string, file: File | null) => {
      if (!file?.type.startsWith('image/')) return;
      const dataUrl = await fileToDataUrl(file);
      setValue(
        'sequencingItems',
        items.map((it) => (it.id === id ? { ...it, image: dataUrl } : it))
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
    const newItem: SequencingItem = { id: crypto.randomUUID(), image: '', markPercent: 0 };
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
    const handle = target.closest('[data-drag-handle="true"]') as HTMLElement | null;
    if (!handle) return;
    const card = handle.closest('[data-row-index]') as HTMLElement | null;
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

      {/* Header row: label + auto-distribute toggle */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <span className="text-sm font-semibold text-foreground">
          {t('editor.image_sequencing.rows_label')} *
        </span>
        <div className="flex gap-4 items-center flex-wrap">
          {/* Auto-distribute toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only peer/toggle"
              checked={autoDistribute}
              onChange={(e) => handleAutoDistributeChange(e.target.checked)}
            />
            <div className="w-9 h-5 rounded-full bg-muted peer-checked/toggle:bg-primary relative transition-colors">
              <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked/toggle:translate-x-4 rtl:peer-checked/toggle:-translate-x-4" />
            </div>
            <span className="text-sm text-foreground">
              {t('editor.image_sequencing.auto_distribute')}
            </span>
          </label>
        </div>
      </div>

      {/* Draggable row list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div
          className="flex flex-col gap-3 touch-none p-3"
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
                  'relative flex gap-3 p-3 rounded-2xl border bg-card transition-colors',
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
                {/* Content: image upload + mark field */}
                <div className="flex-1 flex flex-col gap-2">
                  {/* Image upload area with absolute overlays */}
                  <div
                    className={cn(
                      'relative w-full h-40 rounded-lg flex items-center justify-center overflow-hidden transition-colors',
                      item.image
                        ? 'border-0'
                        : 'border-2 border-dashed border-border bg-muted/40 hover:bg-muted/70'
                    )}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <ImagePlus size={28} className="text-muted-foreground" />
                    )}
                    <input
                      ref={(el) => {
                        fileInputRefs.current[item.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      aria-label={t('editor.browse')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        handleImageChange(item.id, file);
                        e.target.value = '';
                      }}
                    />

                    {/* Delete button — absolute overlay top-end */}
                    <div className="absolute top-1.5 end-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(item.id)}
                        disabled={items.length <= 2}
                        aria-label={t('editor.image_sequencing.delete_row')}
                        className="p-1 rounded-lg bg-white/80 dark:bg-card/80 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Drag grip — absolute overlay bottom-start */}
                    <div className="absolute bottom-1.5 start-1.5">
                      <div
                        className="cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                        data-drag-handle="true"
                        tabIndex={0}
                        aria-label={t('editor.image_sequencing.drag_handle_label', { index: index + 1 })}
                        onKeyDown={(e) => handleHandleKeyDown(e, index)}
                      >
                        <GripVertical size={14} className="text-white drop-shadow" />
                      </div>
                    </div>
                  </div>

                  {/* Mark percent field */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-[35px]">
                      {t('mark')}:
                    </span>
                    <div className="relative w-28 shrink-0">
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add image button */}
      <button
        type="button"
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-dashed border-border hover:border-primary hover:text-primary transition-colors"
        onClick={handleAddRow}
      >
        <Plus size={15} />
        {t('editor.image_sequencing.add_row')}
      </button>

      {/* Validation alerts */}
      {hasTooFewRows && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/[0.05] p-3 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{t('editor.image_sequencing.error_min_rows')}</span>
        </div>
      )}
      {hasEmptyImages && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/[0.05] p-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{t('editor.image_sequencing.error_empty_images')}</span>
        </div>
      )}
      {!autoDistribute && !isTotalValid && items.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/[0.05] p-3 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            {t('editor.image_sequencing.error_total_not_100', {
              total: new Intl.NumberFormat(i18n.language).format(totalMark),
            })}
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(ImageSequencingEditor);
