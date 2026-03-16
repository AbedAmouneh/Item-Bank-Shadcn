import { Box, Button, Chip, Typography, alpha, styled } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import type { QuestionRow, QuestionChoice } from '../../components/QuestionsTable';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TextSequencingQuestionViewProps = {
  question: QuestionRow;
};

type DisplayItem = {
  canonicalId: number;
  text: string;
  markPercent: number;
};

const ChipList = styled(Box)(({ theme }) => ({
  border: `1px solid ${alpha(theme.palette.divider, 0.25)}`,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.4)
      : alpha(theme.palette.primary.main, 0.02),
  minHeight: theme.spacing(6),
  touchAction: 'none',
  '@keyframes wrongFlash': {
    '0%': { borderColor: alpha(theme.palette.divider, 0.25), boxShadow: 'none' },
    '20%': {
      borderColor: theme.palette.error.main,
      boxShadow: `0 0 0 2px ${alpha(theme.palette.error.main, 0.3)}`,
    },
    '70%': {
      borderColor: theme.palette.error.main,
      boxShadow: `0 0 0 2px ${alpha(theme.palette.error.main, 0.3)}`,
    },
    '100%': { borderColor: alpha(theme.palette.divider, 0.25), boxShadow: 'none' },
  },
  '&[data-flash-wrong="true"]': {
    animation: 'wrongFlash 0.75s cubic-bezier(0.4, 0, 0.2, 1) forwards',
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      borderColor: theme.palette.error.main,
      boxShadow: `0 0 0 2px ${alpha(theme.palette.error.main, 0.3)}`,
    },
  },
}));

const DraggableChip = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'isDragOver' &&
    prop !== 'isDragging' &&
    prop !== 'dragOffsetX' &&
    prop !== 'dragOffsetY',
})<{
  isDragOver?: boolean;
  isDragging?: boolean;
  dragOffsetX?: number;
  dragOffsetY?: number;
}>(({ theme, isDragOver, isDragging, dragOffsetX = 0, dragOffsetY = 0 }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.75, 1.5, 0.75, 0.75),
  borderRadius: 9999,
  border: `1px solid ${
    isDragOver ? theme.palette.primary.main : alpha(theme.palette.divider, 0.5)
  }`,
  backgroundColor: isDragOver
    ? alpha(theme.palette.primary.main, 0.1)
    : theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.7)
      : alpha(theme.palette.primary.main, 0.05),
  cursor: isDragging ? 'grabbing' : 'grab',
  userSelect: 'none',
  touchAction: 'none',
  willChange: 'transform',
  opacity: isDragging ? 0.82 : 1,
  boxShadow: isDragging ? theme.shadows[8] : 'none',
  transform: isDragging
    ? `translate3d(${dragOffsetX}px, ${dragOffsetY}px, 0) scale(1.08)`
    : 'translate3d(0, 0, 0) scale(1)',
  zIndex: isDragging ? 30 : undefined,
  pointerEvents: isDragging ? 'none' : undefined,
  transition: isDragging
    ? 'border-color 0.12s ease, background-color 0.12s ease, opacity 0.1s ease, box-shadow 0.1s ease'
    : 'border-color 0.12s ease, background-color 0.12s ease, opacity 0.15s ease, transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.15s ease',
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

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
      text: c.answer,
      markPercent: parseFloat(c.fraction),
    }));
}

const TextSequencingQuestionView = ({ question }: TextSequencingQuestionViewProps) => {
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
      <ChipList
        className="flex flex-wrap gap-2 p-4 rounded-2xl mb-6"
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
            <DraggableChip
              key={item.canonicalId}
              data-chip-index={index}
              data-dragging={isDragging ? 'true' : undefined}
              isDragOver={isDragOver}
              isDragging={isDragging}
              dragOffsetX={isDragging ? dragOffset.x : 0}
              dragOffsetY={isDragging ? dragOffset.y : 0}
              role="listitem"
              tabIndex={0}
              aria-label={`${item.text} — ${t('text_sequencing.chip_hint')}`}
              onKeyDown={(e) => handleChipKeyDown(e as React.KeyboardEvent, index)}
              ref={(el: HTMLDivElement | null) => {
                if (el) {
                  chipRefs.current.set(item.canonicalId, el);
                } else {
                  chipRefs.current.delete(item.canonicalId);
                }
              }}
            >
              <DragIndicatorIcon sx={{ fontSize: '0.875rem', color: 'text.disabled' }} />
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {item.text}
              </Typography>
            </DraggableChip>
          );
        })}
      </ChipList>

      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Box className="flex items-center gap-3 flex-wrap">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            onClick={checked ? handleRetry : handleCheck}
            className="normal-case font-semibold"
            sx={(theme) => ({ borderRadius: theme.spacing(1.5) })}
          >
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && score && !score.isFullyCorrect && (
            <Button
              variant="contained"
              startIcon={<LightbulbIcon />}
              onClick={handleShowSolution}
              className="normal-case font-semibold"
              sx={(theme) => ({ borderRadius: theme.spacing(1.5) })}
            >
              {t('show_solution')}
            </Button>
          )}

          {checked && score && (
            <Chip
              className="font-semibold text-sm rounded-xl"
              label={`${formatNum(score.earned)} / ${formatNum(question.mark)}`}
              color={score.isFullyCorrect ? 'success' : 'default'}
              variant={score.isFullyCorrect ? 'filled' : 'outlined'}
            />
          )}
        </Box>

        <MarkBox className="py-2 px-4 font-semibold text-[0.95rem]">
          {formatNum(question.mark)}
        </MarkBox>
      </Box>
    </>
  );
};

export default TextSequencingQuestionView;
