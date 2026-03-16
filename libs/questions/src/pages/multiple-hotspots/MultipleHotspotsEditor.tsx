import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  Typography,
  useTheme,
  alpha,
  styled,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  TextField,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Stage, Layer, Rect, Circle, Text, Image as KonvaImage, Transformer, Group, Line } from 'react-konva';
import type Konva from 'konva';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import {
  CropFree as RectangleIcon,
  RadioButtonUnchecked as CircleIcon,
  Pentagon as PolygonIcon,
  PanTool as PanIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Refresh as ResetIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';

type HotspotTool = 'rectangle' | 'circle' | 'polygon' | 'pan';

type HotspotShape = {
  type: 'rectangle' | 'circle' | 'polygon';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  color: string;
  strokeWidth: number;
  opacity?: number;
  isCorrect: boolean;
  mark?: number;
};

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'dragOver',
})<{ dragOver?: boolean }>(({ theme, dragOver }) => ({
  border: `2px dashed ${dragOver ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: dragOver ? theme.palette.action.hover : theme.palette.action.selected,
  cursor: 'pointer',
  transition: theme.transitions.create(['border-color', 'background-color'], {
    duration: theme.transitions.duration.short,
  }),
}));

const ToolbarContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const ToolbarGroup = styled(Box)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
  '&:last-child': { borderRight: 'none' },
}));

const StyledIconButton = styled(IconButton)<{ selected?: boolean }>(({ theme, selected }) => ({
  backgroundColor: selected
    ? theme.palette.mode === 'dark'
      ? alpha(theme.palette.primary.main, 0.2)
      : alpha(theme.palette.primary.main, 0.1)
    : 'transparent',
  color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.primary.main, 0.3)
        : alpha(theme.palette.primary.main, 0.15),
  },
}));

const CanvasContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
}));

const MAX_CANVAS_WIDTH = 800;
const POLYGON_CLOSE_THRESHOLD = 12;
const MAX_TOTAL_PARTIAL_MARK = 1;
const MARK_EPSILON = 1e-4;

function normalizeHotspotMark(mark: number | undefined): number {
  const raw = Math.max(0, mark ?? 0);
  return raw > 1 ? raw / 100 : raw;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function MultipleHotspotsEditor() {
  const { t } = useTranslation('questions');
  const theme = useTheme();
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const background_image: string | null = watch('background_image') ?? null;
  const savedHotspots: HotspotShape[] | undefined = watch('hotspots');
  const savedAllowPartialCredit: boolean | undefined = watch('allowPartialCredit');
  const savedMinSelections: number | undefined = watch('minSelections');
  const savedMaxSelections: number | undefined = watch('maxSelections');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(MAX_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const [tool, setTool] = useState<HotspotTool>('pan');
  const [shapes, setShapes] = useState<HotspotShape[]>(() => savedHotspots ?? []);
  const [currentShape, setCurrentShape] = useState<Partial<HotspotShape> | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<number[]>([]);

  const isDrawing = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<HotspotShape[][]>([]);
  const historyIndex = useRef(-1);

  const [zoom, setZoom] = useState(100);
  const [stagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState({ x: 1, y: 1 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShapeIndex, setEditingShapeIndex] = useState<number | null>(null);
  const [editingIsCorrect, setEditingIsCorrect] = useState(true);
  const [editingMark, setEditingMark] = useState<number>(0);
  const [editingError, setEditingError] = useState<string>('');

  const [allowPartialCredit, setAllowPartialCredit] = useState(() => savedAllowPartialCredit ?? false);
  const [minSelections, setMinSelections] = useState<number>(() => savedMinSelections ?? 1);
  const [maxSelections, setMaxSelections] = useState<number>(() => savedMaxSelections ?? 1);

  const nodeRefs = useRef<Record<string, Konva.Node>>({});
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue('hotspots', shapes);
  }, [shapes, setValue]);

  useEffect(() => {
    setValue('allowPartialCredit', allowPartialCredit);
  }, [allowPartialCredit, setValue]);

  useEffect(() => {
    setValue('minSelections', minSelections);
  }, [minSelections, setValue]);

  useEffect(() => {
    setValue('maxSelections', maxSelections);
  }, [maxSelections, setValue]);

  useEffect(() => {
    if (!background_image) {
      setBackgroundImg(null);
      return;
    }
    const img = new window.Image();
    if (!background_image.startsWith('data:') && !background_image.startsWith('blob:')) {
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
    img.src = background_image;
  }, [background_image]);

  useEffect(() => {
    if (tool !== 'polygon') setPolygonPoints([]);
  }, [tool]);

  useEffect(() => {
    const resetToPan = () => setTool('pan');
    window.addEventListener('focus', resetToPan);
    window.addEventListener('blur', resetToPan);
    return () => {
      window.removeEventListener('focus', resetToPan);
      window.removeEventListener('blur', resetToPan);
    };
  }, []);

  useEffect(() => {
    if (tool !== 'pan') {
      setSelectedId(null);
      transformerRef.current?.nodes([]);
      setButtonPos(null);
      return;
    }
    if (!selectedId) {
      transformerRef.current?.nodes([]);
      setButtonPos(null);
      return;
    }
    const node = nodeRefs.current[selectedId];
    if (node) {
      transformerRef.current?.nodes([node]);
      setTimeout(updateButtonPosition, 0);
    } else {
      transformerRef.current?.nodes([]);
      setButtonPos(null);
    }
  }, [tool, selectedId, shapes.length]);

  useEffect(() => {
    if (!transformerRef.current || !selectedId) return;
    const transformer = transformerRef.current;
    const handleTransform = () => updateButtonPosition();
    transformer.on('transform', handleTransform);
    transformer.on('dragmove', handleTransform);
    return () => {
      transformer.off('transform', handleTransform);
      transformer.off('dragmove', handleTransform);
    };
  }, [selectedId]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (history.current.length === 0) saveToHistory();
  }, []);

  const updateButtonPosition = useCallback(() => {
    if (!selectedId || tool !== 'pan') { setButtonPos(null); return; }
    const transformer = transformerRef.current;
    if (!transformer) { setButtonPos(null); return; }
    const box = transformer.getClientRect();
    setButtonPos({ x: box.x + box.width / 2, y: box.y + box.height + 20 });
  }, [selectedId, tool]);

  const saveToHistory = useCallback(
    (override?: HotspotShape[]) => {
      const snap = override ?? [...shapes];
      const newHistory = history.current.slice(0, historyIndex.current + 1);
      newHistory.push(snap);
      history.current = newHistory;
      historyIndex.current = newHistory.length - 1;
    },
    [shapes]
  );

  const updateShapeAt = useCallback((index: number, patch: Partial<HotspotShape>) => {
    setShapes((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedId || !selectedId.startsWith('shape-')) return;
    const index = parseInt(selectedId.replace('shape-', ''), 10);
    setShapes((prev) => {
      const next = prev.filter((_, i) => i !== index);
      saveToHistory(next);
      return next;
    });
    setSelectedId(null);
    setButtonPos(null);
  }, [selectedId, saveToHistory]);

  const handleEditOpen = useCallback((shapeIndex: number) => {
    setEditingShapeIndex(shapeIndex);
    setEditingIsCorrect(shapes[shapeIndex]?.isCorrect ?? true);
    setEditingMark(normalizeHotspotMark(shapes[shapeIndex]?.mark ?? 1));
    setEditingError('');
    setEditDialogOpen(true);
  }, [shapes]);

  const handleEditSave = useCallback(() => {
    if (editingShapeIndex === null) return;
    if (allowPartialCredit) {
      const nextMark = Number(normalizeHotspotMark(editingMark).toFixed(4));
      const othersTotal = shapes.reduce((sum, shape, index) => {
        if (index === editingShapeIndex) return sum;
        return sum + normalizeHotspotMark(shape.mark);
      }, 0);
      const allowedForEdited = MAX_TOTAL_PARTIAL_MARK - othersTotal;

      if (nextMark - allowedForEdited > MARK_EPSILON) {
        setEditingError('Total hotspot marks cannot exceed 100%.');
        return;
      }

      updateShapeAt(editingShapeIndex, { mark: nextMark });
    } else {
      updateShapeAt(editingShapeIndex, { isCorrect: editingIsCorrect });
    }
    setEditingError('');
    setEditDialogOpen(false);
    setEditingShapeIndex(null);
  }, [editingShapeIndex, editingIsCorrect, editingMark, allowPartialCredit, updateShapeAt, shapes]);

  const handleEditClose = useCallback(() => {
    setEditDialogOpen(false);
    setEditingShapeIndex(null);
    setEditingError('');
  }, []);

  useEffect(() => {
    if (!allowPartialCredit) return;

    setShapes((prev) => {
      let changed = false;
      const normalized = prev.map((shape) => {
        const normalizedMark = normalizeHotspotMark(shape.mark);
        if (shape.mark !== normalizedMark) changed = true;
        return { ...shape, mark: normalizedMark };
      });

      const total = normalized.reduce((sum, shape) => sum + (shape.mark ?? 0), 0);
      if (total - MAX_TOTAL_PARTIAL_MARK <= MARK_EPSILON || total <= 0) {
        return changed ? normalized : prev;
      }

      changed = true;
      const scaled = normalized.map((shape) => ((shape.mark ?? 0) / total) * MAX_TOTAL_PARTIAL_MARK);
      const next = scaled.map((mark) => Number(mark.toFixed(4)));
      const subtotal = next.slice(0, -1).reduce((sum, mark) => sum + mark, 0);
      const lastIndex = next.length - 1;
      if (lastIndex >= 0) {
        next[lastIndex] = Number(Math.max(0, MAX_TOTAL_PARTIAL_MARK - subtotal).toFixed(4));
      }

      return normalized.map((shape, index) => ({
        ...shape,
        mark: next[index],
      }));
    });
  }, [allowPartialCredit]);

  const checkDeselect = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool !== 'pan') return;
      const clickedOnEmpty =
        e.target === e.target.getStage() ||
        (e.target as Konva.Node).getAttr('name') === 'bg';
      const clickedOnDeleteButton = (e.target as Konva.Node).getAttr('name') === 'delete-button';
      if (clickedOnDeleteButton) { handleDelete(); return; }
      if (clickedOnEmpty) { setSelectedId(null); setButtonPos(null); }
    },
    [tool, handleDelete]
  );

  const closePolygon = useCallback(() => {
    if (polygonPoints.length >= 6) {
      saveToHistory();
      setShapes((prev) => [
        ...prev,
        { type: 'polygon', x: 0, y: 0, points: [...polygonPoints], color: '#000000', strokeWidth: 2, isCorrect: true, mark: 1 } as HotspotShape,
      ]);
    }
    setPolygonPoints([]);
  }, [polygonPoints, saveToHistory]);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool === 'pan') return;
      const stage = e.target.getStage();
      if (!stage) return;
      const ptr = stage.getPointerPosition();
      if (!ptr) return;
      const x = (ptr.x - stagePos.x) / (stageScale.x || 1);
      const y = (ptr.y - stagePos.y) / (stageScale.y || 1);

      if (tool === 'polygon') {
        if (polygonPoints.length >= 6) {
          const [fx, fy] = [polygonPoints[0], polygonPoints[1]];
          if (Math.sqrt((x - fx) ** 2 + (y - fy) ** 2) <= POLYGON_CLOSE_THRESHOLD) {
            closePolygon();
            return;
          }
        }
        setPolygonPoints((prev) => [...prev, x, y]);
        return;
      }

      isDrawing.current = true;
      startPosRef.current = { x, y };

      if (tool === 'rectangle') {
        setCurrentShape({ type: 'rectangle', x, y, width: 0, height: 0, color: '#000000', strokeWidth: 2, isCorrect: true, mark: 1 });
      } else if (tool === 'circle') {
        setCurrentShape({ type: 'circle', x, y, radius: 0, color: '#000000', strokeWidth: 2, isCorrect: true, mark: 1 });
      }
    },
    [tool, stagePos, stageScale, polygonPoints, closePolygon]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool === 'pan' || tool === 'polygon') return;
      const startPos = startPosRef.current;
      if (!isDrawing.current || !startPos) return;
      const stage = e.target.getStage();
      if (!stage) return;
      const ptr = stage.getPointerPosition();
      if (!ptr) return;
      const x = (ptr.x - stagePos.x) / (stageScale.x || 1);
      const y = (ptr.y - stagePos.y) / (stageScale.y || 1);

      if (tool === 'rectangle' && currentShape) {
        setCurrentShape({
          ...currentShape,
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          width: Math.abs(x - startPos.x),
          height: Math.abs(y - startPos.y),
        });
      } else if (tool === 'circle' && currentShape) {
        setCurrentShape({
          ...currentShape,
          radius: Math.sqrt((x - startPos.x) ** 2 + (y - startPos.y) ** 2),
        });
      }
    },
    [tool, currentShape, stagePos, stageScale]
  );

  const handleMouseUp = useCallback(() => {
    if (tool === 'pan' || !isDrawing.current) return;
    isDrawing.current = false;

    if (currentShape) {
      saveToHistory();
      if (tool === 'rectangle') {
        setShapes((prev) => [...prev, { ...currentShape, type: 'rectangle' } as HotspotShape]);
      } else if (tool === 'circle') {
        setShapes((prev) => [...prev, { ...currentShape, type: 'circle' } as HotspotShape]);
      }
      setCurrentShape(null);
    }
    startPosRef.current = null;
  }, [tool, currentShape, saveToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current -= 1;
      setShapes(history.current[historyIndex.current]);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current += 1;
      setShapes(history.current[historyIndex.current]);
    }
  }, []);

  const handleReset = useCallback(() => {
    setShapes([]);
    setPolygonPoints([]);
    setZoom(100);
    setStageScale({ x: 1, y: 1 });
    saveToHistory([]);
  }, [saveToHistory]);

  const handleZoomIn = useCallback(() => {
    const next = Math.min(zoom + 25, 400);
    setZoom(next);
    setStageScale({ x: next / 100, y: next / 100 });
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const next = Math.max(zoom - 25, 25);
    setZoom(next);
    setStageScale({ x: next / 100, y: next / 100 });
  }, [zoom]);

  const handleZoomChange = useCallback((value: number) => {
    setZoom(value);
    setStageScale({ x: value / 100, y: value / 100 });
  }, []);

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch((err: Error) => console.error(err));
    } else {
      document.exitFullscreen?.().catch((err: Error) => console.error(err));
    }
  }, []);

  const setBackgroundImageFromFile = useCallback(
    async (file: File | null) => {
      if (!file?.type.startsWith('image/')) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        setValue('background_image', dataUrl);
        setShapes([]);
        history.current = [];
        historyIndex.current = -1;
      } catch (err) {
        console.error('Failed to read image', err);
      }
    },
    [setValue]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBackgroundImageFromFile(e.target.files?.[0] ?? null);
      e.target.value = '';
    },
    [setBackgroundImageFromFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith('image/')) setBackgroundImageFromFile(file);
    },
    [setBackgroundImageFromFile]
  );

  const handleRemoveImage = useCallback(() => {
    setValue('background_image', null);
    setValue('hotspots', []);
    setShapes([]);
    history.current = [];
    historyIndex.current = -1;
  }, [setValue]);

  if (!background_image) {
    return (
      <Box className="flex flex-col gap-4">
        <Typography
          className="block text-[0.8125rem] font-normal leading-tight"
          sx={(theme) => ({ color: theme.palette.text.secondary })}
          variant="body2"
          component="label"
        >
          {t('editor.background_image')}
        </Typography>
        {(errors as any)?.background_image && (
          <Typography
            variant="caption"
            color="error"
            className="mt-1 block"
          >
            {(errors as any).background_image.message}
          </Typography>
        )}
        <DropZone
          className="cursor-pointer min-h-[160px] flex flex-col items-center justify-center gap-2 rounded-lg"
          dragOver={dragOver}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          <AddPhotoAlternateOutlinedIcon
            className="text-5xl"
            sx={(theme) => ({ color: theme.palette.text.secondary })}
          />
          <Typography
            className="text-sm"
            sx={(theme) => ({ color: theme.palette.text.secondary })}
            variant="body2"
          >
            {t('editor.drag_and_drop')}
          </Typography>
          <Button
            className="font-medium normal-case"
            variant="contained"
            color="primary"
            size="small"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            {t('editor.browse')}
          </Button>
        </DropZone>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-4">

      <Box className="flex items-center justify-between">
        <Typography
          className="text-[0.8125rem] font-normal leading-tight"
          sx={(theme) => ({ color: theme.palette.text.secondary })}
          variant="body2"
        >
          {t('editor.background_image')}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlinedIcon fontSize="small" />}
          className="normal-case text-xs"
          onClick={handleRemoveImage}
        >
          {t('editor.remove_image')}
        </Button>
      </Box>

      <Box className="flex items-center justify-between gap-4 mb-4">
        <FormControlLabel
          control={
            <Switch
              checked={allowPartialCredit}
              onChange={(e) => {
                setAllowPartialCredit(e.target.checked);
                setTool('pan');
              }}
              color="primary"
            />
          }
          label="Allow partial credit"
        />
        <Box className="flex gap-2">
          <TextField
            label="Min selections"
            type="number"
            size="small"
            value={minSelections}
            onChange={(e) => {
              const value = Math.max(1, Number(e.target.value) || 1);
              setMinSelections(value);
            }}
            inputProps={{ min: 1 }}
            className="w-[140px]"
              error={!!(errors as any)?.minSelections}
              helperText={(errors as any)?.minSelections?.message || ''}
          />
          <TextField
            label="Max selections"
            type="number"
            size="small"
            value={maxSelections}
            onChange={(e) => {
              const value = Math.max(1, Number(e.target.value) || 1);
              setMaxSelections(value);
            }}
            inputProps={{ min: 1 }}
            className="w-[140px]"
              error={!!(errors as any)?.maxSelections}
              helperText={(errors as any)?.maxSelections?.message || ''}
          />
        </Box>
      </Box>

      <Box
        ref={containerRef}
        className="overflow-hidden rounded"
        sx={{ border: `1px solid ${theme.palette.divider}` }}
      >
        <ToolbarContainer className="flex items-center flex-wrap gap-1 p-2">

          <ToolbarGroup className="flex items-center gap-1 py-0 px-2">
            <Tooltip title="Rectangle">
              <StyledIconButton size="small" selected={tool === 'rectangle'} onClick={() => setTool('rectangle')}>
                <RectangleIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
            <Tooltip title="Circle">
              <StyledIconButton size="small" selected={tool === 'circle'} onClick={() => setTool('circle')}>
                <CircleIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
            <Tooltip title="Polygon">
              <StyledIconButton size="small" selected={tool === 'polygon'} onClick={() => setTool('polygon')}>
                <PolygonIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
          </ToolbarGroup>

          <ToolbarGroup className="flex items-center gap-1 py-0 px-2">
            <Tooltip title="Pan / Select">
              <StyledIconButton size="small" selected={tool === 'pan'} onClick={() => setTool('pan')}>
                <PanIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
            <Tooltip title="Undo">
              <StyledIconButton size="small" onClick={handleUndo} disabled={historyIndex.current <= 0}>
                <UndoIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
            <Tooltip title="Redo">
              <StyledIconButton size="small" onClick={handleRedo} disabled={historyIndex.current >= history.current.length - 1}>
                <RedoIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
            <Tooltip title="Reset">
              <StyledIconButton size="small" onClick={handleReset}>
                <ResetIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
          </ToolbarGroup>

          <ToolbarGroup className="flex items-center gap-1 py-0 px-2">
            <Tooltip title="Zoom Out">
              <StyledIconButton size="small" onClick={handleZoomOut}>
                <ZoomOutIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
            <Select
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              size="small"
              MenuProps={{
                container: isFullscreen ? containerRef.current : undefined,
                disablePortal: isFullscreen,
              }}
              className="min-w-[80px] h-8"
              sx={{ '& .MuiSelect-select': { py: 0.5, fontSize: '0.875rem' } }}
            >
              {[25, 50, 75, 100, 125, 150, 200, 300, 400].map((v) => (
                <MenuItem key={v} value={v}>{v}%</MenuItem>
              ))}
            </Select>
            <Tooltip title="Zoom In">
              <StyledIconButton size="small" onClick={handleZoomIn}>
                <ZoomInIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <StyledIconButton size="small" onClick={handleFullscreen}>
                <FullscreenIcon fontSize="small" />
              </StyledIconButton>
            </Tooltip>
          </ToolbarGroup>

        </ToolbarContainer>

        <CanvasContainer className="flex justify-center p-4 overflow-auto">
          <Stage
            ref={stageRef}
            width={canvasWidth}
            height={canvasHeight}
            scaleX={stageScale.x}
            scaleY={stageScale.y}
            x={stagePos.x}
            y={stagePos.y}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            onClick={checkDeselect}
            onTap={checkDeselect}
            style={{ cursor: tool === 'polygon' ? 'crosshair' : 'default' }}
          >
            <Layer>
              <Rect
                name="bg"
                x={0} y={0}
                width={canvasWidth}
                height={canvasHeight}
                fill="#ffffff"
                stroke={theme.palette.divider}
                strokeWidth={1}
              />

              {backgroundImg && (
                <KonvaImage
                  image={backgroundImg}
                  x={0} y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  listening={false}
                />
              )}

              {shapes.map((shape, i) => {
                const key = `shape-${i}`;
                let strokeColor: string;
                let fillColor: string;

                if (allowPartialCredit) {
                  // When partial credit is enabled, use different colors based on mark
                  const mark = shape.mark ?? 0;
                  if (mark === 0) {
                    strokeColor = '#e05252'; // red
                    fillColor = 'rgba(224,82,82,0.7)';
                  } else if (mark > 0 && mark < 1) {
                    strokeColor = '#ff9800'; // orange
                    fillColor = 'rgba(255,152,0,0.7)';
                  } else if (mark === 1) {
                    strokeColor = '#549380'; // green
                    fillColor = 'rgba(84,147,128,0.7)';
                  } else {
                    strokeColor = '#549380'; // fallback to green
                    fillColor = 'rgba(84,147,128,0.7)';
                  }
                } else {
                  // When partial credit is disabled, use isCorrect boolean
                  strokeColor = shape.isCorrect ? '#549380' : '#e05252';
                  fillColor = shape.isCorrect ? 'rgba(84,147,128,0.7)' : 'rgba(224,82,82,0.7)';
                }

                const setRef = (node: Konva.Node | null) => {
                  if (node) nodeRefs.current[key] = node;
                  else delete nodeRefs.current[key];
                };
                const handleShapeDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
                  const node = e.target;
                  updateShapeAt(i, { x: node.x(), y: node.y() });
                  setTimeout(updateButtonPosition, 0);
                };
                const handleRectTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
                  const node = e.target as Konva.Rect;
                  const sx = node.scaleX(); const sy = node.scaleY();
                  node.scaleX(1); node.scaleY(1);
                  updateShapeAt(i, {
                    x: node.x(), y: node.y(),
                    width: Math.max(5, node.width() * sx),
                    height: Math.max(5, node.height() * sy),
                  });
                  setTimeout(updateButtonPosition, 0);
                };
                const handleCircleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
                  const node = e.target as Konva.Circle;
                  const sx = node.scaleX(); const sy = node.scaleY();
                  node.scaleX(1); node.scaleY(1);
                  updateShapeAt(i, {
                    x: node.x(), y: node.y(),
                    radius: Math.max(5, node.radius() * Math.max(sx, sy)),
                  });
                  setTimeout(updateButtonPosition, 0);
                };
                const selectProps =
                  tool === 'pan'
                    ? {
                        draggable: true,
                        onClick: () => setSelectedId(key),
                        onTap: () => setSelectedId(key),
                        ref: setRef,
                        onDragEnd: handleShapeDragEnd,
                      }
                    : { ref: setRef };

                if (shape.type === 'rectangle') {
                  return (
                    <Rect
                      key={key}
                      x={shape.x} y={shape.y}
                      width={shape.width || 0}
                      height={shape.height || 0}
                      stroke={strokeColor}
                      strokeWidth={shape.strokeWidth}
                      fill={fillColor}
                      {...selectProps}
                      onTransformEnd={tool === 'pan' ? handleRectTransformEnd : undefined}
                    />
                  );
                }
                if (shape.type === 'circle') {
                  return (
                    <Circle
                      key={key}
                      x={shape.x} y={shape.y}
                      radius={shape.radius || 0}
                      stroke={strokeColor}
                      strokeWidth={shape.strokeWidth}
                      fill={fillColor}
                      {...selectProps}
                      onTransformEnd={tool === 'pan' ? handleCircleTransformEnd : undefined}
                    />
                  );
                }
                if (shape.type === 'polygon' && shape.points && shape.points.length >= 6) {
                  return (
                    <Line
                      key={key}
                      points={shape.points}
                      stroke={strokeColor}
                      strokeWidth={shape.strokeWidth}
                      fill={fillColor}
                      closed
                      {...selectProps}
                    />
                  );
                }
                return null;
              })}

              {tool === 'polygon' && polygonPoints.length >= 2 && (
                <Line points={polygonPoints} stroke="#000000" strokeWidth={2} closed={false} />
              )}
              {tool === 'polygon' &&
                Array.from({ length: Math.floor(polygonPoints.length / 2) }, (_, i) => (
                  <Circle
                    key={`poly-pt-${i}`}
                    x={polygonPoints[i * 2]}
                    y={polygonPoints[i * 2 + 1]}
                    radius={4}
                    fill="#000000"
                    stroke="#fff"
                    strokeWidth={1}
                  />
                ))}

              {isDrawing.current && currentShape && tool === 'rectangle' && (
                <Rect
                  x={currentShape.x || 0} y={currentShape.y || 0}
                  width={currentShape.width || 0}
                  height={currentShape.height || 0}
                  stroke="#000000"
                  strokeWidth={2}
                  fill="transparent"
                />
              )}

              {isDrawing.current && currentShape && tool === 'circle' && (
                <Circle
                  x={currentShape.x || 0} y={currentShape.y || 0}
                  radius={currentShape.radius || 0}
                  stroke="#000000"
                  strokeWidth={2}
                  fill="transparent"
                />
              )}

              {tool === 'pan' && (
                <Transformer
                  ref={transformerRef}
                  flipEnabled={false}
                  boundBoxFunc={(oldBox, newBox) =>
                    Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5 ? oldBox : newBox
                  }
                />
              )}

              {tool === 'pan' && selectedId && buttonPos && (() => {
                const shapeIndex = selectedId.startsWith('shape-')
                  ? parseInt(selectedId.replace('shape-', ''), 10)
                  : -1;
                const cursorEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'pointer';
                };
                const cursorLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'default';
                };
                return (
                  <>
                    <Group
                      x={buttonPos.x - 18}
                      y={buttonPos.y}
                      onClick={() => shapeIndex >= 0 && handleEditOpen(shapeIndex)}
                      onTap={() => shapeIndex >= 0 && handleEditOpen(shapeIndex)}
                      onMouseEnter={cursorEnter}
                      onMouseLeave={cursorLeave}
                    >
                      <Circle
                        radius={12}
                        fill={theme.palette.primary.main}
                        stroke={theme.palette.primary.dark}
                        strokeWidth={2}
                      />
                      <Text
                        text="✎" fontSize={14} fill="white"
                        align="center" verticalAlign="middle"
                        x={-6} y={-8} width={12} height={16}
                      />
                    </Group>

                    <Group
                      name="delete-button"
                      x={buttonPos.x + 18}
                      y={buttonPos.y}
                      onClick={handleDelete}
                      onTap={handleDelete}
                      onMouseEnter={cursorEnter}
                      onMouseLeave={cursorLeave}
                    >
                      <Circle
                        radius={12}
                        fill={theme.palette.error.main}
                        stroke={theme.palette.error.dark}
                        strokeWidth={2}
                      />
                      <Text
                        text="×" fontSize={18} fontStyle="bold" fill="white"
                        align="center" verticalAlign="middle"
                        x={-6} y={-9} width={12} height={18}
                      />
                    </Group>
                  </>
                );
              })()}
            </Layer>
          </Stage>
        </CanvasContainer>
      </Box>

      {(errors as any)?.hotspots && (
        <Typography
          variant="caption"
          color="error"
          className="mt-1 block"
        >
          {(errors as any).hotspots.message}
        </Typography>
      )}

      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Hotspot</DialogTitle>
        <DialogContent>
          {allowPartialCredit ? (
            <FormControl fullWidth className="mt-2">
              <InputLabel>Mark %</InputLabel>
              <Select
                value={editingMark * 100}
                label="Mark %"
                onChange={(e) => {
                  setEditingMark(Number(e.target.value) / 100);
                  setEditingError('');
                }}
              >
                <MenuItem value={0}>0%</MenuItem>
                <MenuItem value={5}>5%</MenuItem>
                <MenuItem value={10}>10%</MenuItem>
                <MenuItem value={15}>15%</MenuItem>
                <MenuItem value={20}>20%</MenuItem>
                <MenuItem value={25}>25%</MenuItem>
                <MenuItem value={30}>30%</MenuItem>
                <MenuItem value={33.3}>33.3%</MenuItem>
                <MenuItem value={40}>40%</MenuItem>
                <MenuItem value={50}>50%</MenuItem>
                <MenuItem value={60}>60%</MenuItem>
                <MenuItem value={75}>75%</MenuItem>
                <MenuItem value={80}>80%</MenuItem>
                <MenuItem value={90}>90%</MenuItem>
                <MenuItem value={100}>100%</MenuItem>
              </Select>
              {editingError && (
                <Typography variant="caption" color="error" className="mt-2 block">
                  {editingError}
                </Typography>
              )}
            </FormControl>
          ) : (
            <FormControlLabel
              className="mt-2"
              control={
                <Switch
                  checked={editingIsCorrect}
                  onChange={(e) => setEditingIsCorrect(e.target.checked)}
                  color="primary"
                />
              }
              label="Mark as correct"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
