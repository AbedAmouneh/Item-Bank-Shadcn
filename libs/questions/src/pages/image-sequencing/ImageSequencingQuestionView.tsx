import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw, Lightbulb, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, cn } from '@item-bank/ui';
import type { QuestionRow, QuestionChoice } from '../../components/QuestionsTable';

type ImageSequencingQuestionViewProps = {
  question: QuestionRow;
};

type DisplayItem = {
  canonicalId: number;
  image: string;
  markPercent: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
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
      image: c.answer,
      markPercent: parseFloat(c.fraction),
    }));
}

const ImageSequencingQuestionView = ({ question }: ImageSequencingQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');
  const allowPartialCredit = question.sequencingAllowPartialCredit ?? false;

  const canonicalItems = useMemo(
    () => buildCanonicalItems(question.choices),
    [question.choices]
  );
  const [items, setItems] = useState<DisplayItem[]>(() =>
    shuffleUnique(buildCanonicalItems(question.choices), buildCanonicalItems(question.choices))
  );
  const [checked, setChecked] = useState(false);
  const [flashWrong, setFlashWrong] = useState(false);
  const dragSource = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const dragStartPoint = useRef<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const grabOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const chipListRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusRef = useRef<number | null>(null);
  const chipRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const previousRectsRef = useRef<Map<number, DOMRect>>(new Map());
  const rafIdsRef = useRef<number[]>([]);
  const timerIdsRef = useRef<number[]>([]);
  const lastSwapRef = useRef<{ from: number; to: number; time: number } | null>(null);

  useEffect(() => {
    if (!flashWrong) return;
    const id = setTimeout(() => setFlashWrong(false), 820);
    return () => clearTimeout(id);
  }, [flashWrong]);

  useEffect(
    () => () => {
      rafIdsRef.current.forEach((id) => window.cancelAnimationFrame(id));
      timerIdsRef.current.forEach((id) => window.clearTimeout(id));
      rafIdsRef.current = [];
      timerIdsRef.current = [];
    },
    []
  );

  useEffect(() => {
    if (pendingFocusRef.current !== null) {
      const idx = pendingFocusRef.current;
      pendingFocusRef.current = null;
      const el = chipListRef.current?.querySelector(
        `[data-chip-index="${idx}"]`
      ) as HTMLElement | null;
      el?.focus();
    }
  });

  useLayoutEffect(() => {
    rafIdsRef.current.forEach((id) => window.cancelAnimationFrame(id));
    timerIdsRef.current.forEach((id) => window.clearTimeout(id));
    rafIdsRef.current = [];
    timerIdsRef.current = [];
    chipRefs.current.forEach((el) => {
      if (el.dataset.dragging === 'true') return;
      el.style.transition = 'none';
      el.style.transform = '';
    });
    void chipListRef.current?.getBoundingClientRect();

    const previousRects = previousRectsRef.current;
    const nextRects = new Map<number, DOMRect>();
    chipRefs.current.forEach((el, id) => {
      nextRects.set(id, el.getBoundingClientRect());
    });

    if (dragSource.current !== null && grabOffsetRef.current) {
      const draggedItem = items[dragSource.current];
      const draggedRect = draggedItem ? nextRects.get(draggedItem.canonicalId) : undefined;
      if (draggedRect) {
        const naturalLeft = draggedRect.left - dragOffsetRef.current.x;
        const naturalTop = draggedRect.top - dragOffsetRef.current.y;
        dragStartPoint.current = {
          x: naturalLeft + grabOffsetRef.current.x,
          y: naturalTop + grabOffsetRef.current.y,
        };
      }
    }

    chipRefs.current.forEach((el, id) => {
      if (el.dataset.dragging === 'true') return;
      const prevRect = previousRects.get(id);
      const nextRect = nextRects.get(id);
      if (!prevRect || !nextRect) {
        el.style.transition = '';
        return;
      }

      const deltaX = prevRect.left - nextRect.left;
      const deltaY = prevRect.top - nextRect.top;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) {
        el.style.transition = '';
        return;
      }
      el.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;

      const rafId = window.requestAnimationFrame(() => {
        el.style.transition = 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)';
        el.style.transform = '';
        const timerId = window.setTimeout(() => {
          if (el.dataset.dragging !== 'true') el.style.transition = '';
        }, 220);
        timerIdsRef.current.push(timerId);
      });
      rafIdsRef.current.push(rafId);
    });

    previousRectsRef.current = nextRects;
  }, [items]);

  const formatNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language).format(n),
    [i18n.language]
  );

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

  const handleCheck = useCallback(() => {
    setChecked(true);
    const isCorrect = allowPartialCredit
      ? items.reduce((sum, item, i) => (item.canonicalId === i ? sum + item.markPercent : sum), 0) >= 100
      : items.every((item, i) => item.canonicalId === i);
    if (!isCorrect) setFlashWrong(true);
  }, [items, allowPartialCredit]);

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

  const handleChipKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (checked) return;
      let newIndex: number | null = null;
      if (e.key === 'ArrowLeft') newIndex = Math.max(0, index - 1);
      else if (e.key === 'ArrowRight') newIndex = Math.min(items.length - 1, index + 1);
      else if (e.key === 'Home') newIndex = 0;
      else if (e.key === 'End') newIndex = items.length - 1;
      if (newIndex === null || newIndex === index) return;
      e.preventDefault();
      setItems((prev) => {
        return moveItem(prev, index, newIndex);
      });
      pendingFocusRef.current = newIndex;
    },
    [checked, items.length]
  );

  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (checked) return;
      const chip = (e.target as Element).closest('[data-chip-index]') as HTMLElement | null;
      if (!chip) return;
      const idx = parseInt(chip.dataset.chipIndex ?? '-1', 10);
      if (idx === -1) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const chipRect = chip.getBoundingClientRect();
      grabOffsetRef.current = { x: e.clientX - chipRect.left, y: e.clientY - chipRect.top };
      dragOffsetRef.current = { x: 0, y: 0 };
      dragSource.current = idx;
      dragOverIndexRef.current = idx;
      setDragOverIndex(idx);
      setDragSourceIndex(idx);
      dragStartPoint.current = { x: e.clientX, y: e.clientY };
      setDragOffset({ x: 0, y: 0 });
    },
    [checked]
  );

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
    const chip = el?.closest('[data-chip-index]') as HTMLElement | null;
    if (!chip) return;
    const idx = parseInt(chip.dataset.chipIndex ?? '-1', 10);
    const src = dragSource.current;
    if (src === null || idx === -1 || idx === src) return;
    const last = lastSwapRef.current;
    if (last && last.to === src && last.from === idx && Date.now() - last.time < 220) return;

    if (idx !== dragOverIndexRef.current) {
      setItems((prev) => moveItem(prev, src, idx));
      lastSwapRef.current = { from: src, to: idx, time: Date.now() };
      dragSource.current = idx;
      setDragSourceIndex(idx);
      dragOverIndexRef.current = idx;
      setDragOverIndex(idx);
    }
  }, []);

  const handleContainerPointerUp = useCallback(() => {
    dragSource.current = null;
    dragOverIndexRef.current = null;
    lastSwapRef.current = null;
    grabOffsetRef.current = null;
    dragOffsetRef.current = { x: 0, y: 0 };
    setDragOverIndex(null);
    setDragSourceIndex(null);
    dragStartPoint.current = null;
    setDragOffset({ x: 0, y: 0 });
  }, []);

  return (
    <>
      {/* Draggable image chip list */}
      <div
        className={cn(
          'flex flex-wrap gap-2 p-4 rounded-2xl mb-6 border touch-none transition-colors',
          'border-border bg-card',
          flashWrong && 'animate-wrong-flash'
        )}
        ref={chipListRef}
        role="list"
        data-flash-wrong={flashWrong ? 'true' : undefined}
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
              key={item.canonicalId}
              data-chip-index={index}
              data-dragging={isDragging ? 'true' : undefined}
              role="listitem"
              tabIndex={0}
              aria-label={`${t('image_sequencing.image_sequence', { number: index + 1 })} — ${t('image_sequencing.chip_hint')}`}
              onKeyDown={(e) => handleChipKeyDown(e, index)}
              ref={(el: HTMLDivElement | null) => {
                if (el) {
                  chipRefs.current.set(item.canonicalId, el);
                } else {
                  chipRefs.current.delete(item.canonicalId);
                }
              }}
              className={cn(
                'inline-flex items-center gap-2 p-2 rounded-lg border select-none touch-none will-change-transform',
                'cursor-grab active:cursor-grabbing',
                'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
                isDragOver
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 bg-card dark:bg-card/70',
                isDragging && 'opacity-[0.82] shadow-lg z-30 pointer-events-none'
              )}
              style={
                isDragging
                  ? {
                      transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.08)`,
                      transition: 'border-color 0.12s ease, background-color 0.12s ease, opacity 0.1s ease, box-shadow 0.1s ease',
                    }
                  : {
                      transform: 'translate3d(0, 0, 0) scale(1)',
                      transition: 'border-color 0.12s ease, background-color 0.12s ease, opacity 0.15s ease, transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.15s ease',
                    }
              }
            >
              <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
              <div className="w-36 h-28 rounded overflow-hidden shrink-0 bg-muted/40">
                <img
                  src={item.image}
                  alt=""
                  className="w-full h-full object-cover block"
                />
              </div>
            </div>
          );
        })}
      </div>

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
                  : 'border-border text-foreground'
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

export default ImageSequencingQuestionView;
