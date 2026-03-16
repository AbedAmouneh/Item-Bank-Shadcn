import {
  Box,
  Button,
  Chip,
  TextField,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONE_W = 80;
const ZONE_H = 36;

// ─── Local types ──────────────────────────────────────────────────────────────

type DragDropImageItem = NonNullable<QuestionRow['dragDropImageItems']>[number];
type DragDropImageGroup = NonNullable<QuestionRow['dragDropImageGroups']>[number];
type Zone = DragDropImageItem['zones'][number];

// ─── Styled ───────────────────────────────────────────────────────────────────

const PoolChip = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'groupColor' && prop !== 'isDragging',
})<{ groupColor?: string; isDragging?: boolean }>(({ theme, groupColor, isDragging }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 12px',
  borderRadius: theme.spacing(1),
  border: `1.5px solid ${groupColor ?? theme.palette.divider}`,
  backgroundColor: groupColor
    ? alpha(groupColor, 0.1)
    : theme.palette.action.selected,
  cursor: isDragging ? 'grabbing' : 'grab',
  userSelect: 'none',
  opacity: isDragging ? 0.4 : 1,
  touchAction: 'none',
  transition: theme.transitions.create(['opacity', 'background-color'], {
    duration: theme.transitions.duration.short,
  }),
  fontSize: '0.875rem',
  fontWeight: 500,
  gap: 6,
  whiteSpace: 'nowrap',
}));

const ZoneTarget = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'filled' && prop !== 'correct' && prop !== 'wrong' && prop !== 'groupColor',
})<{ filled?: boolean; correct?: boolean; wrong?: boolean; groupColor?: string }>(
  ({ theme, filled, correct, wrong, groupColor }) => {
    const isEmptyHint = !filled && !correct && !wrong;

    return {
    position: 'absolute',
    width: ZONE_W,
    height: ZONE_H,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    border: correct
      ? `2px solid ${theme.palette.success.main}`
      : wrong
      ? `2px solid ${theme.palette.error.main}`
      : filled
      ? `2px solid ${groupColor ?? theme.palette.primary.main}`
      : `1.5px dashed ${alpha(theme.palette.common.white, 0.62)}`,
    backgroundColor: correct
      ? alpha(theme.palette.success.main, 0.12)
      : wrong
      ? alpha(theme.palette.error.main, 0.12)
      : filled
      ? alpha(groupColor ?? theme.palette.primary.main, 0.1)
      : alpha(theme.palette.common.white, 0.2),
    backgroundImage: 'none',
    fontSize: '0.75rem',
    color: correct
      ? theme.palette.success.main
      : wrong
      ? theme.palette.error.main
      : alpha(theme.palette.common.black, 0.54),
    fontStyle: filled ? 'normal' : 'italic',
    overflow: 'hidden',
    cursor: filled ? 'pointer' : 'default',
    boxShadow: isEmptyHint
      ? `inset 0 0 0 1px ${alpha(theme.palette.common.black, 0.14)}`
      : 'none',
    transition: theme.transitions.create(['border-color', 'background-color'], {
      duration: theme.transitions.duration.short,
    }),
    };
  }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  primary: '#1976d2',
  secondary: '#9c27b0',
  success: '#2e7d32',
  warning: '#ed6c02',
  error: '#d32f2f',
  info: '#0288d1',
};

function resolveGroupColor(groups: DragDropImageGroup[], groupId: string): string | undefined {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return undefined;
  return COLOR_MAP[group.color] ?? group.color;
}

// ─── Component ────────────────────────────────────────────────────────────────

type DragDropImageViewProps = {
  question: QuestionRow;
};

export default function DragDropImageView({ question }: DragDropImageViewProps) {
  const { t } = useTranslation('questions');
  const theme = useTheme();
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

  return (
    <Box
      ref={containerRef}
      className="flex flex-col gap-4"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {/* Image with zones */}
      {bgImage && (
        <Box className="relative inline-block max-w-full select-none">
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
                  <Typography variant="caption" sx={{ fontStyle: 'normal', opacity: 0.7 }}>
                    {items.find((i) => i.id === draggingItemId)?.answer ?? '…'}
                  </Typography>
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
                    <Typography variant="caption" noWrap className="not-italic px-1">
                      {placedItem.answer}
                    </Typography>
                  )
                ) : (
                  <Typography
                    variant="caption"
                    sx={{
                      fontStyle: 'normal',
                      fontWeight: 600,
                      letterSpacing: 0.2,
                      color: alpha(theme.palette.common.black, 0.6),
                    }}
                  >
                    {t('drag_drop_text.slot_hint')}
                  </Typography>
                )}
              </ZoneTarget>
            );
          })}
        </Box>
      )}

      {/* Pool */}
      <Box>
        <Typography variant="caption" className="block mb-2" sx={{ color: 'text.secondary' }}>
          {t('editor.drag_drop_image.pool_label')}
        </Typography>
        <Box className="flex flex-wrap gap-2">
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
                  {groupColor && <CircleIcon sx={{ fontSize: 8, color: groupColor }} />}
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
        </Box>
      </Box>

      {justificationMode !== 'disabled' && (
        <Box>
          <TextField
            label={t('drag_drop_image.justification_response_label', {
              defaultValue: 'Justification',
            })}
            placeholder={t('drag_drop_image.justification_response_placeholder', {
              defaultValue: 'Write your justification...',
            })}
            value={justificationText}
            onChange={(e) => {
              const nextValue = e.target.value;
              setJustificationText(nextValue);
              if (nextValue.trim()) setJustificationError(false);
            }}
            required={justificationMode === 'required'}
            error={justificationError}
            helperText={
              justificationError
                ? t('drag_drop_image.error_justification_required', {
                    defaultValue: 'Justification is required.',
                  })
                : `${justificationFraction}%`
            }
            multiline
            minRows={3}
            fullWidth
            size="small"
          />
        </Box>
      )}

      {/* Ghost element */}
      {ghostItem && (
        <Box
          ref={ghostRef}
          className="fixed flex items-center justify-center rounded pointer-events-none overflow-hidden whitespace-nowrap text-xs font-medium"
          style={{
            width: ZONE_W,
            height: ZONE_H,
            zIndex: 9999,
            paddingLeft: 4,
            paddingRight: 4,
          }}
          sx={{
            border: `1.5px solid ${theme.palette.primary.main}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.15),
            color: theme.palette.primary.main,
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
        </Box>
      )}

      {/* Score */}
      {score !== null && (
        <Box className="flex items-center gap-2">
          <Chip
            label={`${Math.round(score * question.mark * 10) / 10} / ${question.mark}`}
            color={score >= 1 ? 'success' : score > 0 ? 'warning' : 'error'}
            size="small"
          />
        </Box>
      )}

      {/* Actions */}
      <Box className="flex gap-2 flex-wrap">
        {!checked ? (
          <Button
            variant="contained"
            size="small"
            startIcon={<CheckIcon />}
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
            {t('check')}
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReplayIcon />}
            onClick={handleRetry}
          >
            {t('retry')}
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<LightbulbIcon />}
          onClick={() => {
            setShowSolution((v) => !v);
            setChecked(false);
          }}
        >
          {t('show_solution')}
        </Button>
      </Box>
    </Box>
  );
}
