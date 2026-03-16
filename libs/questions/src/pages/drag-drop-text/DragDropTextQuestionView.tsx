import {
  Box,
  Button,
  Chip,
  Typography,
  alpha,
  styled,
  useTheme,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CircleIcon from '@mui/icons-material/Circle';
import type { QuestionRow } from '../../components/QuestionsTable';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DragDropItem = NonNullable<QuestionRow['dragDropItems']>[number];
type DragDropGroup = NonNullable<QuestionRow['dragDropGroups']>[number];

type Segment =
  | { type: 'text'; content: string }
  | { type: 'slot'; key: string; slotId: string };

const SLOT_RE_SRC = '\\[\\[([^\\]]+)\\]\\]';

function unwrapBracketToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const wrapped = trimmed.match(/^\[\[([\s\S]+)\]\]$/);
  return (wrapped?.[1] ?? trimmed).trim();
}

function isBogusEditorNode(node: Element | null): boolean {
  if (!node) return false;
  if (node.getAttribute('data-mce-bogus') === '1') return true;
  return node.closest('[data-mce-bogus="1"]') !== null;
}

function getKeyFromWrapper(wrapper: Element): string {
  const keyNode = wrapper.querySelector('.fill-in-blank-key');
  const candidates = [
    keyNode?.textContent ?? '',
    keyNode?.getAttribute('data-key') ?? '',
    wrapper.getAttribute('data-key') ?? '',
  ];

  for (const candidate of candidates) {
    const key = unwrapBracketToken(candidate);
    if (key) return key;
  }
  return '';
}

function sanitizeQuestionHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  if (typeof DOMParser === 'undefined') {
    return rawHtml;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  doc.querySelectorAll('.key-actions, .key-action-btn, .edit-icon, .delete-icon').forEach((node) => {
    node.remove();
  });

  doc.querySelectorAll('.key-wrapper').forEach((wrapper) => {
    if (isBogusEditorNode(wrapper)) {
      wrapper.remove();
      return;
    }
    const key = getKeyFromWrapper(wrapper);
    if (!key) {
      wrapper.remove();
      return;
    }
    wrapper.replaceWith(doc.createTextNode(`[[${key}]]`));
  });

  doc.querySelectorAll('.fill-in-blank-key').forEach((node) => {
    if (isBogusEditorNode(node)) {
      node.remove();
      return;
    }
    const key = unwrapBracketToken(
      (node.textContent ?? '').trim() || node.getAttribute('data-key') || ''
    );
    if (!key) {
      node.remove();
      return;
    }
    node.replaceWith(doc.createTextNode(`[[${key}]]`));
  });

  return doc.body.innerHTML;
}

function htmlToInlineText(html: string): string {
  if (!html) return '';

  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  const re = new RegExp(SLOT_RE_SRC, 'g');
  let slotIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'text', content: text.slice(last, m.index) });
    segments.push({ type: 'slot', key: m[1].trim(), slotId: `slot_${slotIndex}` });
    slotIndex += 1;
    last = re.lastIndex;
  }
  if (last < text.length) segments.push({ type: 'text', content: text.slice(last) });
  return segments;
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPoolOrder(items: DragDropItem[]): string[] {
  const byGroup = new Map<string, string[]>();
  const ungrouped: string[] = [];
  for (const item of items) {
    if (item.groupId) {
      if (!byGroup.has(item.groupId)) byGroup.set(item.groupId, []);
      byGroup.get(item.groupId)?.push(item.id);
    } else {
      ungrouped.push(item.id);
    }
  }
  const result = [...ungrouped];
  byGroup.forEach((ids) => result.push(...shuffleArr(ids)));
  return result;
}

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

const PoolContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
  alignContent: 'flex-start',
  gap: theme.spacing(1),
  padding: theme.spacing(1.25, 1.5),
  border: `1px solid ${alpha(theme.palette.divider, 0.34)}`,
  borderRadius: theme.spacing(2),
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.62)
      : alpha(theme.palette.primary.main, 0.03),
  minHeight: theme.spacing(10),
  touchAction: 'none',
}));

type DragDropTextQuestionViewProps = { question: QuestionRow };

const DragDropTextQuestionView = ({ question }: DragDropTextQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');
  const theme = useTheme();

  const items: DragDropItem[] = useMemo(() => question.dragDropItems ?? [], [question.dragDropItems]);
  const groups: DragDropGroup[] = useMemo(() => question.dragDropGroups ?? [], [question.dragDropGroups]);
  const sanitizedQuestionHtml = useMemo(
    () => sanitizeQuestionHtml(question.question_text ?? ''),
    [question.question_text]
  );
  const inlineQuestionText = useMemo(
    () => htmlToInlineText(sanitizedQuestionHtml),
    [sanitizedQuestionHtml]
  );
  const segments = useMemo(
    () => parseSegments(inlineQuestionText),
    [inlineQuestionText]
  );

  const poolOrder = useMemo(() => buildPoolOrder(items), [items]);
  const [slotValues, setSlotValues] = useState<Record<string, string | null>>({});
  const [checked, setChecked] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    itemId: string;
    source: 'pool' | string;
    grabOffset: { x: number; y: number };
  } | null>(null);
  const hoverSlotRef = useRef<string | null>(null);
  const hoverSlotKeyRef = useRef<string | null>(null);

  const [ghost, setGhost] = useState<{ itemId: string; x: number; y: number } | null>(null);
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'pool' | string | null>(null);

  const getItemById = useCallback(
    (id: string) => items.find((i) => i.id === id),
    [items]
  );

  const getGroupColor = useCallback(
    (groupId: string): string | undefined => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return undefined;
      switch (group.color) {
        case 'primary':
          return theme.palette.primary.main;
        case 'secondary':
          return theme.palette.secondary.main;
        case 'success':
          return theme.palette.success.main;
        case 'warning':
          return theme.palette.warning.main;
        case 'error':
          return theme.palette.error.main;
        case 'info':
          return theme.palette.info.main;
        default:
          return undefined;
      }
    },
    [groups, theme]
  );

  const canDrop = useCallback(
    (itemId: string, slotKey: string): boolean => {
      const dragged = items.find((i) => i.id === itemId);
      if (!dragged) return false;
      if (!dragged.groupId) return true;
      const slotCorrect = items.find((i) => i.key.toLowerCase() === slotKey.toLowerCase());
      if (!slotCorrect?.groupId) return false;
      return dragged.groupId === slotCorrect.groupId;
    },
    [items]
  );

  const poolItemIds = useMemo(() => {
    const placedIds = new Set(Object.values(slotValues).filter(Boolean) as string[]);
    return poolOrder.filter((id) => {
      const item = getItemById(id);
      if (!item) return false;
      return item.unlimitedReuse || !placedIds.has(id);
    });
  }, [poolOrder, slotValues, getItemById]);

  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (checked) return;

      const poolChip = (e.target as Element).closest('[data-pool-item-id]') as HTMLElement | null;
      const slotChip = (e.target as Element).closest('[data-slot-placed-id]') as HTMLElement | null;

      let itemId: string | null = null;
      let source: 'pool' | string = 'pool';

      if (poolChip) {
        itemId = poolChip.dataset.poolItemId ?? null;
        source = 'pool';
      } else if (slotChip) {
        const placedId = slotChip.dataset.slotPlacedId ?? null;
        const slotId = slotChip.dataset.slotId ?? null;
        if (placedId && slotId) {
          itemId = placedId;
          source = slotId;
        }
      }

      const chipEl: HTMLElement | null = poolChip ?? slotChip;
      if (!chipEl || !itemId) return;
      e.preventDefault();
      const rect = chipEl.getBoundingClientRect();
      const grabOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      dragRef.current = { itemId, source, grabOffset };
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragSource(source);
      setGhost({ itemId, x: rect.left, y: rect.top });
    },
    [checked]
  );

  const handleContainerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;

      const nx = e.clientX - drag.grabOffset.x;
      const ny = e.clientY - drag.grabOffset.y;
      setGhost((prev) =>
        prev && prev.x === nx && prev.y === ny
          ? prev
          : { itemId: drag.itemId, x: nx, y: ny }
      );

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = el?.closest('[data-slot-id]') as HTMLElement | null;
      const rawSlotId = slotEl?.dataset.slotId ?? null;
      const rawSlotKey = slotEl?.dataset.slotKey ?? null;
      const canDropToSlot =
        rawSlotId !== null && rawSlotKey !== null && canDrop(drag.itemId, rawSlotKey);
      const validSlotId =
        canDropToSlot
          ? rawSlotId
          : null;
      const validSlotKey =
        canDropToSlot
          ? rawSlotKey
          : null;

      if (validSlotId !== hoverSlotRef.current) {
        hoverSlotRef.current = validSlotId;
        hoverSlotKeyRef.current = validSlotKey;
        setHoverSlot(validSlotId);
      }
    },
    [canDrop]
  );

  const handleContainerPointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) {
      setGhost(null);
      setHoverSlot(null);
      setDragSource(null);
      hoverSlotRef.current = null;
      hoverSlotKeyRef.current = null;
      return;
    }

    const { itemId, source } = drag;
    const targetSlotId = hoverSlotRef.current;
    const targetSlotKey = hoverSlotKeyRef.current;

    setSlotValues((prev) => {
      const next = { ...prev };
      if (source !== 'pool') {
        next[source] = null;
      }
      if (targetSlotId && targetSlotKey && canDrop(itemId, targetSlotKey)) {
        next[targetSlotId] = itemId;
      }
      return next;
    });

    dragRef.current = null;
    hoverSlotRef.current = null;
    hoverSlotKeyRef.current = null;
    setGhost(null);
    setHoverSlot(null);
    setDragSource(null);
  }, [canDrop]);

  const score = useMemo(() => {
    if (!checked) return null;
    let earnedPercent = 0;
    segments
      .filter((segment): segment is { type: 'slot'; key: string; slotId: string } => segment.type === 'slot')
      .forEach(({ key, slotId }) => {
        const itemId = slotValues[slotId];
        if (!itemId) return;
        const item = getItemById(itemId);
        if (item && item.key.toLowerCase() === key.toLowerCase()) {
          earnedPercent += item.markPercent;
        }
      });
    const earned = Math.round((earnedPercent / 100) * question.mark * 100) / 100;
    return { earned, earnedPercent, isFullyCorrect: earnedPercent >= 100 };
  }, [checked, slotValues, getItemById, question.mark, segments]);

  const handleCheck = useCallback(() => setChecked(true), []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setSlotValues({});
  }, []);

  const handleShowSolution = useCallback(() => {
    const solution: Record<string, string | null> = {};
    segments
      .filter((s): s is { type: 'slot'; key: string; slotId: string } => s.type === 'slot')
      .forEach(({ key, slotId }) => {
        const correct = items.find((i) => i.key.toLowerCase() === key.toLowerCase());
        solution[slotId] = correct?.id ?? null;
      });
    setSlotValues(solution);
    setChecked(true);
  }, [segments, items]);

  const formatNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language).format(n),
    [i18n.language]
  );

  const hasAnyPlaced = Object.values(slotValues).some(Boolean);

  const ghostItem = ghost ? getItemById(ghost.itemId) : null;
  const ghostGroupColor = ghostItem?.groupId ? getGroupColor(ghostItem.groupId) : undefined;

  return (
    <Box
      ref={containerRef}
      className="flex flex-col gap-5"
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerCancel={handleContainerPointerUp}
    >
      <Box
        className="text-base"
        sx={{
          lineHeight: 1.8,
          '& p': {
            margin: 0,
          },
        }}
      >
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            return <span key={idx}>{seg.content}</span>;
          }

          const slotKey = seg.key;
          const slotId = seg.slotId;
          const isDraggedFromThisSlot = dragSource === slotId;
          const rawPlacedId = slotValues[slotId] ?? null;
          const effectivePlacedId = isDraggedFromThisSlot ? null : rawPlacedId;
          const placedItem = effectivePlacedId ? getItemById(effectivePlacedId) : null;
          const isHover = hoverSlot === slotId;
          const isCorrect = checked && !!effectivePlacedId && placedItem?.key.toLowerCase() === slotKey.toLowerCase();
          const isWrong = checked && !!effectivePlacedId && placedItem?.key.toLowerCase() !== slotKey.toLowerCase();
          const groupColor = placedItem?.groupId ? getGroupColor(placedItem.groupId) : undefined;

          return (
            <Box
              key={idx}
              component="span"
              data-slot-id={slotId}
              data-slot-key={slotKey}
              className="inline-flex items-center justify-center min-w-28 min-h-10 mx-1 my-0.5 px-3 py-1.5"
              sx={{
                borderRadius: 1.5,
                border: `2px solid ${
                  isCorrect
                    ? theme.palette.success.main
                    : isWrong
                    ? theme.palette.error.main
                    : isHover
                    ? theme.palette.primary.main
                    : alpha(theme.palette.divider, 0.5)
                }`,
                backgroundColor: isCorrect
                  ? alpha(theme.palette.success.main, 0.1)
                  : isWrong
                  ? alpha(theme.palette.error.main, 0.1)
                  : isHover
                  ? alpha(theme.palette.primary.main, 0.08)
                  : alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.56 : 0.68),
                verticalAlign: 'middle',
                cursor: 'default',
                transition: 'border-color 0.12s ease, background-color 0.12s ease',
                userSelect: 'none',
              }}
            >
              {placedItem ? (
                <Box
                  component="span"
                  data-slot-id={slotId}
                  data-slot-placed-id={placedItem.id}
                  className="inline-flex items-center gap-1"
                  sx={{
                    cursor: checked ? 'default' : 'grab',
                    touchAction: 'none',
                  }}
                >
                  {groupColor && (
                    <CircleIcon className="shrink-0" sx={{ fontSize: 8, color: groupColor }} />
                  )}
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: isCorrect
                        ? 'success.main'
                        : isWrong
                        ? 'error.main'
                        : 'text.primary',
                    }}
                  >
                    {placedItem.answer}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: 0.2,
                  }}
                >
                  ______
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      <Box>
        <Typography variant="body1" className="mb-2" sx={{ color: 'text.primary', fontWeight: 500 }}>
          {t('drag_drop_text.pool_label')}
        </Typography>
        <PoolContainer>
          {poolItemIds.length === 0 && !ghost && (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              —
            </Typography>
          )}
          {poolItemIds.map((id) => {
            const item = getItemById(id);
            if (!item) return null;
            const isDimmed = ghost?.itemId === id && dragSource === 'pool';
            const groupColor = item.groupId ? getGroupColor(item.groupId) : undefined;
            return (
              <Box
                key={id}
                data-pool-item-id={id}
                className="inline-flex items-center gap-1 px-4 py-2"
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${
                    groupColor
                      ? alpha(groupColor, 0.5)
                      : alpha(theme.palette.divider, 0.4)
                  }`,
                  backgroundColor: groupColor
                    ? alpha(groupColor, 0.1)
                    : theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.7)
                    : alpha(theme.palette.primary.main, 0.04),
                  cursor: checked ? 'default' : isDimmed ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  touchAction: 'none',
                  opacity: isDimmed ? 0.35 : 1,
                  transition: 'opacity 0.12s ease',
                }}
              >
                {groupColor && (
                  <CircleIcon className="shrink-0" sx={{ fontSize: 10, color: groupColor }} />
                )}
                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                  {item.answer}
                </Typography>
              </Box>
            );
          })}
        </PoolContainer>
      </Box>

      {ghost && ghostItem && (
        <Box
          className="fixed inline-flex items-center gap-1 px-3 py-1.5"
          style={{ left: ghost.x, top: ghost.y }}
          sx={{
            borderRadius: 9999,
            border: `1px solid ${
              ghostGroupColor
                ? alpha(ghostGroupColor, 0.6)
                : alpha(theme.palette.primary.main, 0.5)
            }`,
            backgroundColor:
              theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.95)
                : theme.palette.background.paper,
            pointerEvents: 'none',
            boxShadow: theme.shadows[8],
            transform: 'scale(1.06)',
            zIndex: 9999,
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {ghostGroupColor && (
            <CircleIcon className="shrink-0" sx={{ fontSize: 10, color: ghostGroupColor }} />
          )}
          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
            {ghostItem.answer}
          </Typography>
        </Box>
      )}

      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Box className="flex items-center gap-3 flex-wrap">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            onClick={checked ? handleRetry : handleCheck}
            disabled={!checked && !hasAnyPlaced}
            className="normal-case font-semibold min-w-[104px] py-2 px-2.5"
            sx={(th) => ({ borderRadius: th.spacing(1.5) })}
          >
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && score && !score.isFullyCorrect && (
            <Button
              variant="contained"
              startIcon={<LightbulbIcon />}
              onClick={handleShowSolution}
              className="normal-case font-semibold"
              sx={(th) => ({ borderRadius: th.spacing(1.5) })}
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
    </Box>
  );
};

export default DragDropTextQuestionView;
