import { Box, Button, Chip, Typography, alpha, styled, useTheme } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ReplayIcon from '@mui/icons-material/Replay';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { Stage, Layer, Rect, Circle, Image as KonvaImage } from 'react-konva';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { QuestionRow } from '../../components/QuestionsTable';

type MultipleHotspotsQuestionViewProps = {
  question: QuestionRow;
};

type HotspotShape = NonNullable<QuestionRow['hotspots']>[number];

const MAX_CANVAS_WIDTH = 800;
const MIN_SELECTION_RING_RADIUS = 16;

const MarkBox = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
}));

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
  const theme = useTheme();
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
          ? theme.palette.primary.main
          : isCorrect
            ? theme.palette.success.main
            : theme.palette.error.main;
        const fillColor = !checked
          ? alpha(theme.palette.primary.main, 0.18)
          : isCorrect
            ? alpha(theme.palette.success.main, 0.18)
            : alpha(theme.palette.error.main, 0.18);

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
      theme.palette.error.main,
      theme.palette.primary.main,
      theme.palette.success.main,
    ]
  );

  if (!question.background_image) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('editor.background_image', { defaultValue: 'Background image' })}: {t('common:not_available', { defaultValue: 'Not available' })}
      </Typography>
    );
  }

  return (
    <Box className="flex flex-col gap-3">
      <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }} className="overflow-hidden w-fit max-w-full">
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
              fill={theme.palette.background.paper}
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
      </Box>

      <Box className="flex items-center justify-between flex-wrap gap-4">
        <Box className="flex items-center gap-3 flex-wrap">
          <Button
            variant="contained"
            startIcon={checked ? <ReplayIcon /> : <CheckIcon />}
            disabled={!checked && selectedCount === 0}
            onClick={checked ? handleRetry : handleCheck}
            className="normal-case font-semibold"
            sx={(muiTheme) => ({ borderRadius: muiTheme.spacing(1.5) })}
          >
            {checked ? t('retry') : t('check')}
          </Button>

          {checked && score && !score.isFullyCorrect && !showSolution && (
            <Button
              variant="contained"
              startIcon={<LightbulbIcon />}
              onClick={handleShowSolution}
              className="normal-case font-semibold"
              sx={(muiTheme) => ({ borderRadius: muiTheme.spacing(1.5) })}
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

export default MultipleHotspotsQuestionView;
