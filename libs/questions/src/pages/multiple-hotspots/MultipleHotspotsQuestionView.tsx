import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stage, Layer, Rect, Circle, Image as KonvaImage } from 'react-konva';
import { useTranslation } from 'react-i18next';
import { Check, RotateCcw, Lightbulb } from 'lucide-react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { cn, Button } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

type MultipleHotspotsQuestionViewProps = {
  question: QuestionRow;
};

type HotspotShape = NonNullable<QuestionRow['hotspots']>[number];

const MAX_CANVAS_WIDTH = 800;
const MIN_SELECTION_RING_RADIUS = 16;

// Hardcoded hex values matching CSS vars:
// --primary #6366F1, --success #22c55e (green-500), --destructive #F43F5E
const RING_PRIMARY = '#6366F1';
const RING_PRIMARY_FILL = 'rgba(99,102,241,0.18)';
const RING_SUCCESS = '#22c55e';
const RING_SUCCESS_FILL = 'rgba(34,197,94,0.18)';
const RING_ERROR = '#F43F5E';
const RING_ERROR_FILL = 'rgba(244,63,94,0.18)';

function isPointInPolygon(x: number, y: number, points: number[]): boolean {
  let inside = false;
  const count = Math.floor(points.length / 2);
  if (count < 3) return false;

  for (let i = 0, j = count - 1; i < count; j = i++) {
    const xi = points[i * 2];
    const yi = points[i * 2 + 1];
    const xj = points[j * 2];
    const yj = points[j * 2 + 1];

    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function isPointInsideHotspot(shape: HotspotShape, x: number, y: number): boolean {
  if (shape.type === 'rectangle') {
    const width = shape.width ?? 0;
    const height = shape.height ?? 0;
    return x >= shape.x && x <= shape.x + width && y >= shape.y && y <= shape.y + height;
  }

  if (shape.type === 'circle') {
    const radius = shape.radius ?? 0;
    return (x - shape.x) ** 2 + (y - shape.y) ** 2 <= radius ** 2;
  }

  if (shape.type === 'polygon') {
    return !!shape.points?.length && isPointInPolygon(x, y, shape.points);
  }

  return false;
}

const MultipleHotspotsQuestionView = ({ question }: MultipleHotspotsQuestionViewProps) => {
  const { t, i18n } = useTranslation('questions');

  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(MAX_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [selectedAnchors, setSelectedAnchors] = useState<Record<number, { x: number; y: number }>>({});
  const [checked, setChecked] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const hotspots = question.hotspots ?? [];
  const minSelections = Math.max(1, question.minSelections ?? 1);
  const maxSelections = Math.max(minSelections, question.maxSelections ?? 1);
  const allowPartialCredit = question.hotspotsAllowPartialCredit ?? false;
  const selectedCount = Object.keys(selectedAnchors).length;

  const getShapeAnchor = useCallback((shape: HotspotShape): { x: number; y: number } => {
    if (shape.type === 'rectangle') {
      return {
        x: shape.x + (shape.width ?? 0) / 2,
        y: shape.y + (shape.height ?? 0) / 2,
      };
    }
    if (shape.type === 'circle') {
      return { x: shape.x, y: shape.y };
    }
    if (shape.type === 'polygon' && shape.points && shape.points.length >= 6) {
      const pointCount = Math.floor(shape.points.length / 2);
      let sx = 0;
      let sy = 0;
      for (let i = 0; i < pointCount; i += 1) {
        sx += shape.points[i * 2];
        sy += shape.points[i * 2 + 1];
      }
      return { x: sx / pointCount, y: sy / pointCount };
    }
    return { x: shape.x, y: shape.y };
  }, []);

  const getHotspotWeight = useCallback((shape: HotspotShape): number => {
    if (allowPartialCredit) {
      const rawMark = Math.max(0, shape.mark ?? 0);
      // Editor may persist partial-credit marks as either 0..1 or 0..100.
      // Normalize both forms to a ratio before grading.
      return rawMark > 1 ? rawMark / 100 : rawMark;
    }
    return shape.isCorrect ? 1 : 0;
  }, [allowPartialCredit]);

  const correctIndices = useMemo(
    () =>
      hotspots
        .map((shape, index) => ({ index, weight: getHotspotWeight(shape) }))
        .filter((entry) => entry.weight > 0)
        .map((entry) => entry.index),
    [hotspots, getHotspotWeight]
  );

  const score = useMemo(() => {
    if (!checked) return null;

    const selectedIndices = Object.keys(selectedAnchors).map(Number);
    const isSelectionCountValid = selectedIndices.length >= minSelections && selectedIndices.length <= maxSelections;

    if (!isSelectionCountValid) {
      return { earned: 0, isFullyCorrect: false };
    }

    if (allowPartialCredit) {
      const earnedWeight = selectedIndices.reduce((sum, idx) => sum + getHotspotWeight(hotspots[idx]), 0);
      const ratio = Math.max(0, Math.min(1, earnedWeight));
      const earned = Math.round(question.mark * ratio * 100) / 100;

      const isSameSelection =
        selectedIndices.length === correctIndices.length &&
        selectedIndices.every((idx) => correctIndices.includes(idx));

      return { earned, isFullyCorrect: isSameSelection };
    }

    const isSameSelection =
      selectedIndices.length === correctIndices.length &&
      selectedIndices.every((idx) => correctIndices.includes(idx));

    const hasAnyIncorrectSelection = selectedIndices.some((idx) => !correctIndices.includes(idx));
    if (hasAnyIncorrectSelection) {
      return { earned: 0, isFullyCorrect: false };
    }

    return { earned: isSameSelection ? question.mark : 0, isFullyCorrect: isSameSelection };
  }, [
    allowPartialCredit,
    checked,
    correctIndices,
    getHotspotWeight,
    hotspots,
    maxSelections,
    minSelections,
    question.mark,
    selectedAnchors,
  ]);

  const formatNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language).format(n),
    [i18n.language]
  );

  useEffect(() => {
    setSelectedAnchors({});
    setChecked(false);
    setShowSolution(false);
  }, [question.id]);

  useEffect(() => {
    const src = question.background_image;
    if (!src) {
      setBackgroundImg(null);
      setCanvasWidth(MAX_CANVAS_WIDTH);
      setCanvasHeight(600);
      return;
    }

    const img = new window.Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      setBackgroundImg(img);
      if (img.naturalWidth > MAX_CANVAS_WIDTH) {
        const ratio = MAX_CANVAS_WIDTH / img.naturalWidth;
        setCanvasWidth(MAX_CANVAS_WIDTH);
        setCanvasHeight(Math.round(img.naturalHeight * ratio));
      } else {
        setCanvasWidth(img.naturalWidth || MAX_CANVAS_WIDTH);
        setCanvasHeight(img.naturalHeight || 600);
      }
    };
    img.onerror = () => setBackgroundImg(null);
    img.src = src;
  }, [question.background_image]);

  const handleHit = useCallback(
    (x: number, y: number) => {
      if (checked) return;
      if (hotspots.length === 0) return;

      let hitIndex = -1;
      for (let i = hotspots.length - 1; i >= 0; i -= 1) {
        if (isPointInsideHotspot(hotspots[i], x, y)) {
          hitIndex = i;
          break;
        }
      }
      if (hitIndex < 0) return;

      setSelectedAnchors((prev) => {
        if (prev[hitIndex]) {
          const next = { ...prev };
          delete next[hitIndex];
          return next;
        }
        if (Object.keys(prev).length >= maxSelections) {
          return prev;
        }
        return { ...prev, [hitIndex]: { x, y } };
      });
    },
    [checked, hotspots, maxSelections]
  );

  const handlePointer = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const ptr = stage.getPointerPosition();
    if (!ptr) return;
    handleHit(ptr.x, ptr.y);
  }, [handleHit]);

  const handleCheck = useCallback(() => {
    setChecked(true);
  }, []);

  const handleRetry = useCallback(() => {
    setChecked(false);
    setShowSolution(false);
    setSelectedAnchors({});
  }, []);

  const handleShowSolution = useCallback(() => {
    const next: Record<number, { x: number; y: number }> = {};
    for (const index of correctIndices) {
      const shape = hotspots[index];
      if (shape) next[index] = getShapeAnchor(shape);
    }
    setSelectedAnchors(next);
    setShowSolution(true);
  }, [correctIndices, getShapeAnchor, hotspots]);

  const rings = useMemo(
    () =>
      Object.entries(selectedAnchors).map(([index, point]) => {
        const numericIndex = Number(index);
        const shape = hotspots[numericIndex];
        if (!shape) return null;

        const isCorrect = correctIndices.includes(numericIndex);
        const ringRadius =
          shape.type === 'circle'
            ? Math.max(shape.radius ?? MIN_SELECTION_RING_RADIUS, MIN_SELECTION_RING_RADIUS)
            : MIN_SELECTION_RING_RADIUS;

        const strokeColor = !checked
          ? RING_PRIMARY
          : isCorrect
            ? RING_SUCCESS
            : RING_ERROR;
        const fillColor = !checked
          ? RING_PRIMARY_FILL
          : isCorrect
            ? RING_SUCCESS_FILL
            : RING_ERROR_FILL;

        return (
          <Circle
            key={`selected-ring-${index}`}
            x={point.x}
            y={point.y}
            radius={ringRadius}
            stroke={strokeColor}
            strokeWidth={3}
            fill={fillColor}
            listening={false}
          />
        );
      }),
    [
      checked,
      correctIndices,
      hotspots,
      selectedAnchors,
    ]
  );

  if (!question.background_image) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('editor.background_image', { defaultValue: 'Background image' })}: {t('common:not_available', { defaultValue: 'Not available' })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded border border-border w-fit max-w-full">
        <Stage
          width={canvasWidth}
          height={canvasHeight}
          onClick={handlePointer}
          onTap={handlePointer}
          style={{ touchAction: 'manipulation', maxWidth: '100%', height: 'auto', cursor: 'pointer' }}
        >
          <Layer>
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="#ffffff"
            />
            {backgroundImg && (
              <KonvaImage
                image={backgroundImg}
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
              />
            )}
            {rings}
          </Layer>
        </Stage>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            disabled={!checked && selectedCount === 0}
            onClick={checked ? handleRetry : handleCheck}
            className="gap-2 font-semibold"
          >
            {checked ? <RotateCcw size={16} /> : <Check size={16} />}
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && score && !score.isFullyCorrect && !showSolution && (
            <Button
              onClick={handleShowSolution}
              className="gap-2 font-semibold"
            >
              <Lightbulb size={16} />
              {t('show_solution')}
            </Button>
          )}

          {checked && score && (
            <span
              className={cn(
                'inline-flex items-center px-3 py-1 rounded-xl text-sm font-semibold border',
                score.isFullyCorrect
                  ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                  : 'bg-transparent text-foreground border-border'
              )}
            >
              {formatNum(score.earned)} / {formatNum(question.mark)}
            </span>
          )}
        </div>

        {/* Mark display box */}
        <div className="py-2 px-4 font-semibold text-[0.95rem] rounded-2xl border border-border bg-card text-foreground">
          {formatNum(question.mark)}
        </div>
      </div>
    </div>
  );
};

export default MultipleHotspotsQuestionView;
