import { useCallback, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw, Lightbulb, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, Button } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

type DragDropItem = NonNullable<QuestionRow['dragDropItems']>[number];
type DragDropGroup = NonNullable<QuestionRow['dragDropGroups']>[number];

type Segment =
  | { type: 'text'; content: string }
  | { type: 'slot'; key: string; slotId: string };

const SLOT_RE_SRC = '\\[\\[([^\\]]+)\\]\\]';

/** Maps the semantic group color name to a concrete hex value used for inline styles. */
const GROUP_COLOR_HEX: Record<string, string> = {
  primary:   '#6366f1',
  secondary: '#8b5cf6',
  success:   '#22c55e',
  warning:   '#f59e0b',
  error:     '#ef4444',
  info:      '#3b82f6',
};

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

type DragDropTextQuestionViewProps = { question: QuestionRow };

const DragDropTextQuestionView = ({ question }: DragDropTextQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');

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

  /** Resolves the hex color for a group by its id. */
  const getGroupColor = useCallback(
    (groupId: string): string | undefined => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return undefined;
      return GROUP_COLOR_HEX[group.color];
    },
    [groups]
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
      const validSlotId = canDropToSlot ? rawSlotId : null;
      const validSlotKey = canDropToSlot ? rawSlotKey : null;

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
    <div
      ref={containerRef}
      className="flex flex-col gap-5"
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerCancel={handleContainerPointerUp}
    >
      {/* Question text with inline drop slots */}
      <div className="text-base leading-relaxed">
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
            <span
              key={idx}
              data-slot-id={slotId}
              data-slot-key={slotKey}
              className={cn(
                'inline-flex items-center justify-center min-w-28 min-h-10 mx-1 my-0.5 px-3 py-1.5 rounded-md border-2 align-middle cursor-default select-none transition-[border-color,background-color] duration-150',
                isCorrect && 'border-green-500 bg-green-500/10',
                isWrong && 'border-destructive bg-destructive/10',
                isHover && !isCorrect && !isWrong && 'border-primary bg-primary/8',
                !isCorrect && !isWrong && !isHover && 'border-border/50 bg-muted/40'
              )}
            >
              {placedItem ? (
                <span
                  data-slot-id={slotId}
                  data-slot-placed-id={placedItem.id}
                  className={cn(
                    'inline-flex items-center gap-1',
                    checked ? 'cursor-default' : 'cursor-grab'
                  )}
                  style={{ touchAction: 'none' }}
                >
                  {groupColor && (
                    <Circle size={8} style={{ color: groupColor }} className="fill-current shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isCorrect ? 'text-green-600 dark:text-green-400' : isWrong ? 'text-destructive' : 'text-foreground'
                    )}
                  >
                    {placedItem.answer}
                  </span>
                </span>
              ) : (
                <span className="text-[0.72rem] font-semibold tracking-[0.2px] text-muted-foreground">
                  ______
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Answer pool */}
      <div>
        <p className="mb-2 text-base font-medium text-foreground">
          {t('drag_drop_text.pool_label')}
        </p>
        <div className="flex flex-wrap justify-center items-center content-start gap-2 px-3 py-2.5 min-h-10 rounded-2xl border border-border/34 bg-primary/3 dark:bg-card/62 touch-none">
          {poolItemIds.length === 0 && !ghost && (
            <span className="text-sm text-muted-foreground">—</span>
          )}
          {poolItemIds.map((id) => {
            const item = getItemById(id);
            if (!item) return null;
            const isDimmed = ghost?.itemId === id && dragSource === 'pool';
            const groupColor = item.groupId ? getGroupColor(item.groupId) : undefined;
            return (
              <div
                key={id}
                data-pool-item-id={id}
                className={cn(
                  'inline-flex items-center gap-1 px-4 py-2 rounded-2xl border select-none transition-opacity duration-150',
                  checked ? 'cursor-default' : isDimmed ? 'cursor-grabbing' : 'cursor-grab',
                  isDimmed && 'opacity-35'
                )}
                style={{
                  borderColor: groupColor ? `${groupColor}80` : undefined,
                  backgroundColor: groupColor ? `${groupColor}1a` : undefined,
                  touchAction: 'none',
                }}
              >
                {groupColor && (
                  <Circle size={10} style={{ color: groupColor }} className="fill-current shrink-0" />
                )}
                <span className="text-sm text-foreground">{item.answer}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag ghost — follows pointer absolutely */}
      {ghost && ghostItem && (
        <div
          className="fixed inline-flex items-center gap-1 px-3 py-1.5 rounded-full border pointer-events-none shadow-lg scale-[1.06] select-none whitespace-nowrap z-[9999] bg-background dark:bg-card"
          style={{
            insetInlineStart: ghost.x,
            top: ghost.y,
            borderColor: ghostGroupColor ? `${ghostGroupColor}99` : 'hsl(var(--primary) / 0.5)',
          }}
        >
          {ghostGroupColor && (
            <Circle size={10} style={{ color: ghostGroupColor }} className="fill-current shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground">{ghostItem.answer}</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            onClick={checked ? handleRetry : handleCheck}
            disabled={!checked && !hasAnyPlaced}
            className="font-semibold min-w-[104px]"
          >
            {checked ? (
              <>
                <RotateCcw size={15} className="me-1.5" />
                {t('retry')}
              </>
            ) : (
              <>
                <Check size={15} className="me-1.5" />
                {t('check')}
              </>
            )}
          </Button>

          {checked && score && !score.isFullyCorrect && (
            <Button
              type="button"
              onClick={handleShowSolution}
              className="font-semibold"
            >
              <Lightbulb size={15} className="me-1.5" />
              {t('show_solution')}
            </Button>
          )}

          {checked && score && (
            <span
              className={cn(
                'inline-flex items-center px-3 py-1 rounded-xl border text-sm font-semibold',
                score.isFullyCorrect
                  ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'border-border bg-muted text-muted-foreground'
              )}
            >
              {formatNum(score.earned)} / {formatNum(question.mark)}
            </span>
          )}
        </div>

        {/* Mark badge */}
        <div className="py-2 px-4 font-semibold text-[0.95rem] rounded-xl border border-border bg-background text-foreground">
          {formatNum(question.mark)}
        </div>
      </div>
    </div>
  );
};

export default DragDropTextQuestionView;
