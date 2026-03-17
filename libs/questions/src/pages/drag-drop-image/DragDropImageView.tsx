import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, Badge } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_W = 80;
const ZONE_H = 36;

// ─── Local types ──────────────────────────────────────────────────────────────

type DragDropImageItem = NonNullable<QuestionRow['dragDropImageItems']>[number];
type DragDropImageGroup = NonNullable<QuestionRow['dragDropImageGroups']>[number];
type Zone = DragDropImageItem['zones'][number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

function resolveGroupColor(groups: DragDropImageGroup[], groupId: string): string | undefined {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return undefined;
  return COLOR_MAP[group.color] ?? group.color;
}

// ─── Zone target ──────────────────────────────────────────────────────────────

type ZoneTargetProps = {
  filled: boolean;
  correct: boolean;
  wrong: boolean;
  groupColor?: string;
  style: React.CSSProperties;
  'data-zone-id': string;
  onClick: () => void;
  children: React.ReactNode;
};

/** Absolute-positioned drop zone overlay rendered on top of the background image. */
function ZoneTarget({
  filled,
  correct,
  wrong,
  groupColor,
  style,
  children,
  onClick,
  ...rest
}: ZoneTargetProps) {
  const borderColor = correct
    ? '#22c55e'
    : wrong
    ? '#ef4444'
    : filled
    ? (groupColor ?? 'hsl(var(--primary))')
    : 'rgba(255,255,255,0.62)';

  const bgColor = correct
    ? 'rgba(34,197,94,0.12)'
    : wrong
    ? 'rgba(239,68,68,0.12)'
    : filled
    ? (groupColor ? groupColor + '1a' : 'hsl(var(--primary)/0.1)')
    : 'rgba(255,255,255,0.2)';

  const textColor = correct
    ? '#22c55e'
    : wrong
    ? '#ef4444'
    : 'rgba(0,0,0,0.54)';

  return (
    <div
      {...rest}
      onClick={onClick}
      className={cn(
        'absolute flex items-center justify-center overflow-hidden text-xs font-medium transition-[border-color,background-color]',
        filled ? 'cursor-pointer' : 'cursor-default',
        !filled && !correct && !wrong ? 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]' : ''
      )}
      style={{
        ...style,
        borderRadius: 6,
        border: `${filled || correct || wrong ? '2px' : '1.5px'} ${filled || correct || wrong ? 'solid' : 'dashed'} ${borderColor}`,
        backgroundColor: bgColor,
        color: textColor,
        fontStyle: filled ? 'normal' : 'italic',
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
}

// ─── Pool chip ────────────────────────────────────────────────────────────────

type PoolChipProps = {
  groupColor?: string;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  children: React.ReactNode;
};

/** Draggable pool chip shown beneath the image canvas. */
function PoolChip({
  groupColor,
  isDragging,
  children,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PoolChipProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-sm font-medium whitespace-nowrap touch-none select-none transition-[opacity,background-color]"
      style={{
        borderColor: groupColor ?? 'hsl(var(--border))',
        backgroundColor: groupColor ? groupColor + '1a' : 'hsl(var(--muted))',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type DragDropImageViewProps = {
  question: QuestionRow;
};

export default function DragDropImageView({ question }: DragDropImageViewProps) {
  const { t } = useTranslation('questions');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const items: DragDropImageItem[] = useMemo(
    () =>
      (question.dragDropImageItems ?? []).map((item) => ({
        ...item,
        zones: (item.zones ?? []).slice(0, 1),
      })),
    [question.dragDropImageItems]
  );
  const groups: DragDropImageGroup[] = useMemo(
    () => question.dragDropImageGroups ?? [],
    [question.dragDropImageGroups]
  );
  const bgImage = question.background_image ?? null;
  const justificationMode = question.justificationMode ?? 'disabled';
  const justificationFraction = question.justificationFraction ?? 0;

  // placements: zoneId → itemId
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [justificationText, setJustificationText] = useState('');
  const [justificationError, setJustificationError] = useState(false);

  // Dragging state
  const draggingItemIdRef = useRef<string | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null); // zoneId
  const [shuffledIds, setShuffledIds] = useState<string[]>(() =>
    [...(question.dragDropImageItems ?? []).map((i) => i.id)].sort(() => Math.random() - 0.5)
  );

  // ── Pointer-capture drag ─────────────────────────────────────────────────

  const moveGhost = useCallback((x: number, y: number) => {
    if (!ghostRef.current) return;
    ghostRef.current.style.left = `${x - ZONE_W / 2}px`;
    ghostRef.current.style.top = `${y - ZONE_H / 2}px`;
  }, []);

  const getZoneIdFromPoint = useCallback((clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const zoneEl = el?.closest('[data-zone-id]') as HTMLElement | null;
    return zoneEl?.dataset.zoneId ?? null;
  }, []);

  const handleItemPointerDown = useCallback(
    (e: React.PointerEvent, itemId: string) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failures; fallback still updates via window handlers.
      }
      draggingItemIdRef.current = itemId;
      setDraggingItemId(itemId);
      moveGhost(e.clientX, e.clientY);
      setDragOver(getZoneIdFromPoint(e.clientX, e.clientY));
    },
    [moveGhost, getZoneIdFromPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingItemIdRef.current) return;
      moveGhost(e.clientX, e.clientY);
      setDragOver(getZoneIdFromPoint(e.clientX, e.clientY));
    },
    [moveGhost, getZoneIdFromPoint]
  );

  const applyDrop = useCallback(
    (itemId: string, zoneId: string | null) => {
      if (!zoneId) return;

      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      setPlacements((prev) => {
        const next = { ...prev };
        const maxPlacementsForItem = item.unlimitedReuse
          ? Number.POSITIVE_INFINITY
          : 1;

        next[zoneId] = itemId;

        if (maxPlacementsForItem !== Number.POSITIVE_INFINITY) {
          const placedZonesForItem = Object.entries(next)
            .filter(([, id]) => id === itemId)
            .map(([zid]) => zid);

          let overflow = placedZonesForItem.length - maxPlacementsForItem;
          if (overflow > 0) {
            for (const placedZoneId of placedZonesForItem) {
              if (placedZoneId === zoneId) continue;
              delete next[placedZoneId];
              overflow -= 1;
              if (overflow <= 0) break;
            }
          }
        }

        return next;
      });
    },
    [items]
  );

  const clearDraggingState = useCallback(() => {
    draggingItemIdRef.current = null;
    setDraggingItemId(null);
    setDragOver(null);
  }, []);

  const finalizeDrag = useCallback(
    (clientX: number, clientY: number) => {
      const itemId = draggingItemIdRef.current;
      if (!itemId) return;
      const zoneId = getZoneIdFromPoint(clientX, clientY);
      clearDraggingState();
      applyDrop(itemId, zoneId);
    },
    [getZoneIdFromPoint, clearDraggingState, applyDrop]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      finalizeDrag(e.clientX, e.clientY);
      e.preventDefault();
    },
    [finalizeDrag]
  );

  const handlePointerCancel = useCallback(() => {
    clearDraggingState();
  }, [clearDraggingState]);

  useEffect(() => {
    if (!draggingItemId) return;

    const onWindowPointerUp = (event: PointerEvent) => {
      finalizeDrag(event.clientX, event.clientY);
    };
    const onWindowPointerCancel = () => {
      clearDraggingState();
    };
    const onWindowBlur = () => {
      clearDraggingState();
    };

    window.addEventListener('pointerup', onWindowPointerUp, true);
    window.addEventListener('pointercancel', onWindowPointerCancel, true);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('pointerup', onWindowPointerUp, true);
      window.removeEventListener('pointercancel', onWindowPointerCancel, true);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [draggingItemId, finalizeDrag, clearDraggingState]);

  // ── Zone pointer events ──────────────────────────────────────────────────

  const handleZoneClick = useCallback((zoneId: string) => {
    if (draggingItemIdRef.current) return;
    setPlacements((prev) => {
      if (!prev[zoneId]) return prev;
      const next = { ...prev };
      delete next[zoneId];
      return next;
    });
  }, []);

  // ── Scoring ──────────────────────────────────────────────────────────────

  const score = useMemo(() => {
    if (!checked) return null;
    let earned = 0;
    for (const item of items) {
      const itemPlacedCorrectly = item.zones.some((z) => placements[z.id] === item.id);
      if (itemPlacedCorrectly) earned += item.markPercent;
    }
    return Math.round(earned) / 100;
  }, [checked, items, placements]);

  // ── Zone state for display ───────────────────────────────────────────────

  const getZoneState = useCallback(
    (zone: Zone, ownerItem: DragDropImageItem) => {
      const placedItemId = placements[zone.id] ?? null;
      const filled = placedItemId !== null;

      if (!checked && !showSolution) {
        return { filled, correct: false, wrong: false, placedItemId };
      }
      if (showSolution) {
        return { filled: true, correct: true, wrong: false, placedItemId: ownerItem.id };
      }
      const correct = filled && placedItemId === ownerItem.id;
      const wrong = filled && placedItemId !== ownerItem.id;
      return { filled, correct, wrong, placedItemId };
    },
    [placements, checked, showSolution]
  );

  // ── Pool visibility ──────────────────────────────────────────────────────

  const isInPool = useCallback(
    (itemId: string) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return false;
      if (item.unlimitedReuse) return true;
      const maxPlacementsForItem = 1;
      const currentPlacementsForItem = Object.values(placements).filter((id) => id === itemId).length;
      return currentPlacementsForItem < maxPlacementsForItem;
    },
    [items, placements]
  );

  const handleRetry = useCallback(() => {
    setPlacements({});
    setChecked(false);
    setShowSolution(false);
    setJustificationError(false);
    setShuffledIds((prev) => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  // ── All zones with owner items ───────────────────────────────────────────

  const allZones = useMemo(() => {
    return items.flatMap((item) =>
      item.zones.map((zone) => ({
        zone,
        ownerItem: item,
        groupColor: resolveGroupColor(groups, item.groupId),
      }))
    );
  }, [items, groups]);

  // ── Ghost item content ───────────────────────────────────────────────────

  const ghostItem = useMemo(
    () => (draggingItemId ? items.find((i) => i.id === draggingItemId) : null),
    [draggingItemId, items]
  );

  // ── Score badge variant ───────────────────────────────────────────────────

  const scoreBadgeClass =
    score !== null
      ? score >= 1
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700'
        : score > 0
        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700'
      : '';

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-4"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Image with zones */}
      {bgImage && (
        <div className="relative inline-block max-w-full select-none">
          <img
            src={bgImage}
            alt="background"
            className="max-w-full block rounded-lg"
            draggable={false}
          />
          {allZones.map(({ zone, ownerItem, groupColor }) => {
            const state = getZoneState(zone, ownerItem);
            const placedItem = state.placedItemId
              ? items.find((i) => i.id === state.placedItemId)
              : null;
            return (
              <ZoneTarget
                key={zone.id}
                data-zone-id={zone.id}
                style={{
                  left: zone.left,
                  top: zone.top,
                  width: zone.width ?? ZONE_W,
                  height: zone.height ?? ZONE_H,
                }}
                filled={state.filled}
                correct={state.correct}
                wrong={state.wrong}
                groupColor={groupColor}
                onClick={() => handleZoneClick(zone.id)}
              >
                {dragOver === zone.id && draggingItemId ? (
                  <span className="not-italic opacity-70 text-xs">
                    {items.find((i) => i.id === draggingItemId)?.answer ?? '…'}
                  </span>
                ) : placedItem ? (
                  placedItem.itemType === 'image' && placedItem.image ? (
                    <img
                      src={placedItem.image}
                      alt={placedItem.answer}
                      style={{
                        maxHeight: (zone.height ?? ZONE_H) - 8,
                        maxWidth: (zone.width ?? ZONE_W) - 8,
                        objectFit: 'contain',
                      }}
                      draggable={false}
                    />
                  ) : (
                    <span className="not-italic truncate px-1 text-xs font-medium">
                      {placedItem.answer}
                    </span>
                  )
                ) : (
                  <span className="not-italic font-semibold text-xs tracking-wide text-foreground/60">
                    {t('drag_drop_text.slot_hint')}
                  </span>
                )}
              </ZoneTarget>
            );
          })}
        </div>
      )}

      {/* Pool */}
      <div>
        <span className="block text-xs font-medium text-muted-foreground mb-2">
          {t('editor.drag_drop_image.pool_label')}
        </span>
        <div className="flex flex-wrap gap-2">
          {shuffledIds
            .filter((id) => isInPool(id))
            .map((id) => {
              const item = items.find((i) => i.id === id);
              if (!item) return null;
              const groupColor = resolveGroupColor(groups, item.groupId);
              return (
                <PoolChip
                  key={item.id}
                  groupColor={groupColor}
                  isDragging={draggingItemId === item.id}
                  onPointerDown={(e: React.PointerEvent) => handleItemPointerDown(e, item.id)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                >
                  {groupColor && (
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: groupColor }}
                    />
                  )}
                  {item.itemType === 'image' && item.image ? (
                    <img
                      src={item.image}
                      alt={item.answer}
                      style={{ height: 24, objectFit: 'contain' }}
                      draggable={false}
                    />
                  ) : (
                    <span>{item.answer}</span>
                  )}
                </PoolChip>
              );
            })}
        </div>
      </div>

      {justificationMode !== 'disabled' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('drag_drop_image.justification_response_label', {
              defaultValue: 'Justification',
            })}
            {justificationMode === 'required' && (
              <span className="text-destructive ms-0.5">*</span>
            )}
          </label>
          <textarea
            className={cn(
              'w-full min-h-[80px] rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y',
              justificationError ? 'border-destructive' : 'border-border'
            )}
            placeholder={t('drag_drop_image.justification_response_placeholder', {
              defaultValue: 'Write your justification...',
            })}
            value={justificationText}
            onChange={(e) => {
              const nextValue = e.target.value;
              setJustificationText(nextValue);
              if (nextValue.trim()) setJustificationError(false);
            }}
            rows={3}
          />
          {justificationError ? (
            <p className="mt-1 text-xs text-destructive">
              {t('drag_drop_image.error_justification_required', {
                defaultValue: 'Justification is required.',
              })}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{justificationFraction}%</p>
          )}
        </div>
      )}

      {/* Ghost element */}
      {ghostItem && (
        <div
          ref={ghostRef}
          className="fixed flex items-center justify-center rounded pointer-events-none overflow-hidden whitespace-nowrap text-xs font-medium border-2 border-primary bg-primary/15 text-primary"
          style={{
            width: ZONE_W,
            height: ZONE_H,
            zIndex: 9999,
            paddingInlineStart: 4,
            paddingInlineEnd: 4,
          }}
        >
          {ghostItem.itemType === 'image' && ghostItem.image ? (
            <img
              src={ghostItem.image}
              alt={ghostItem.answer}
              style={{ height: ZONE_H - 8, objectFit: 'contain' }}
              draggable={false}
            />
          ) : (
            <span>{ghostItem.answer}</span>
          )}
        </div>
      )}

      {/* Score */}
      {score !== null && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
              scoreBadgeClass
            )}
          >
            {Math.round(score * question.mark * 10) / 10} / {question.mark}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!checked ? (
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={justificationMode === 'required' && !justificationText.trim()}
            onClick={() => {
              if (justificationMode === 'required' && !justificationText.trim()) {
                setJustificationError(true);
                return;
              }
              setJustificationError(false);
              setChecked(true);
            }}
          >
            <Check size={15} />
            {t('check')}
          </button>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            onClick={handleRetry}
          >
            <RotateCcw size={15} />
            {t('retry')}
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          onClick={() => {
            setShowSolution((v) => !v);
            setChecked(false);
          }}
        >
          <Lightbulb size={15} />
          {t('show_solution')}
        </button>
      </div>
    </div>
  );
}
