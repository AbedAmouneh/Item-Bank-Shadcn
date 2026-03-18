import { useState, useRef, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Image as KonvaImage, Transformer, Group, Line } from 'react-konva';
import type Konva from 'konva';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Square,
  CircleDashed,
  Pentagon,
  Hand,
  Undo2,
  Redo2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import {
  cn,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@item-bank/ui';

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

const MAX_CANVAS_WIDTH = 800;
const POLYGON_CLOSE_THRESHOLD = 12;
const MAX_TOTAL_PARTIAL_MARK = 1;
const MARK_EPSILON = 1e-4;

// Hardcoded hex values matching CSS vars: --primary #6366F1, --primary-dark #4F46E5
// --destructive #F43F5E, --destructive-dark (darker rose) #e11d48
const KONVA_PRIMARY = '#6366F1';
const KONVA_PRIMARY_DARK = '#4F46E5';
const KONVA_DESTRUCTIVE = '#F43F5E';
const KONVA_DESTRUCTIVE_DARK = '#e11d48';

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

  const handleZoomChange = useCallback((value: string) => {
    const numValue = Number(value);
    setZoom(numValue);
    setStageScale({ x: numValue / 100, y: numValue / 100 });
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

  /** Shared icon button class builder for toolbar buttons */
  const toolbarBtnClass = (selected?: boolean) =>
    cn(
      'p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      selected
        ? 'bg-primary/10 text-primary dark:bg-primary/20'
        : 'text-muted-foreground hover:bg-muted'
    );

  if (!background_image) {
    return (
      <div className="flex flex-col gap-4">
        <label className="block text-[0.8125rem] font-normal leading-tight text-muted-foreground">
          {t('editor.background_image')}
        </label>
        {(errors as Record<string, { message?: string }>)?.background_image && (
          <span className="mt-1 block text-xs font-medium text-destructive">
            {(errors as Record<string, { message?: string }>).background_image.message}
          </span>
        )}
        <div
          className={cn(
            'cursor-pointer min-h-[160px] flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/30 hover:border-primary/50'
          )}
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
          <ImagePlus className="text-muted-foreground" size={48} />
          <p className="text-sm text-muted-foreground">{t('editor.drag_and_drop')}</p>
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            {t('editor.browse')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Header row: label + remove button */}
      <div className="flex items-center justify-between">
        <span className="text-[0.8125rem] font-normal leading-tight text-muted-foreground">
          {t('editor.background_image')}
        </span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleRemoveImage}
          className="gap-1.5"
        >
          <Trash2 size={14} />
          {t('editor.remove_image')}
        </Button>
      </div>

      {/* Partial credit toggle + min/max selections */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={allowPartialCredit}
            onClick={() => {
              setAllowPartialCredit((prev) => !prev);
              setTool('pan');
            }}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              allowPartialCredit ? 'bg-primary' : 'bg-input'
            )}
          >
            <span
              className={cn(
                'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                allowPartialCredit ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
          <span className="text-sm text-foreground">Allow partial credit</span>
        </label>
        <div className="flex gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Min selections</label>
            <Input
              type="number"
              value={minSelections}
              min={1}
              onChange={(e) => {
                const value = Math.max(1, Number(e.target.value) || 1);
                setMinSelections(value);
              }}
              className="w-[140px] h-8 text-sm"
            />
            {(errors as Record<string, { message?: string }>)?.minSelections && (
              <span className="text-xs text-destructive">
                {(errors as Record<string, { message?: string }>).minSelections.message}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Max selections</label>
            <Input
              type="number"
              value={maxSelections}
              min={1}
              onChange={(e) => {
                const value = Math.max(1, Number(e.target.value) || 1);
                setMaxSelections(value);
              }}
              className="w-[140px] h-8 text-sm"
            />
            {(errors as Record<string, { message?: string }>)?.maxSelections && (
              <span className="text-xs text-destructive">
                {(errors as Record<string, { message?: string }>).maxSelections.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="overflow-hidden rounded border border-border"
      >
        {/* Toolbar */}
        <div className="flex items-center flex-wrap gap-1 p-2 bg-muted/60 border-b border-border dark:bg-muted/30">

          {/* Drawing tools group */}
          <TooltipProvider>
            <div className="flex items-center gap-1 py-0 pe-2 border-e border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Rectangle"
                    className={toolbarBtnClass(tool === 'rectangle')}
                    onClick={() => setTool('rectangle')}
                  >
                    <Square size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Rectangle</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Circle"
                    className={toolbarBtnClass(tool === 'circle')}
                    onClick={() => setTool('circle')}
                  >
                    <CircleDashed size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Circle</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Polygon"
                    className={toolbarBtnClass(tool === 'polygon')}
                    onClick={() => setTool('polygon')}
                  >
                    <Pentagon size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Polygon</TooltipContent>
              </Tooltip>
            </div>

            {/* Actions group */}
            <div className="flex items-center gap-1 py-0 pe-2 border-e border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Pan / Select"
                    className={toolbarBtnClass(tool === 'pan')}
                    onClick={() => setTool('pan')}
                  >
                    <Hand size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Pan / Select</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Undo"
                    className={toolbarBtnClass()}
                    onClick={handleUndo}
                    disabled={historyIndex.current <= 0}
                  >
                    <Undo2 size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Redo"
                    className={toolbarBtnClass()}
                    onClick={handleRedo}
                    disabled={historyIndex.current >= history.current.length - 1}
                  >
                    <Redo2 size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Reset"
                    className={toolbarBtnClass()}
                    onClick={handleReset}
                  >
                    <RotateCcw size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Reset</TooltipContent>
              </Tooltip>
            </div>

            {/* Zoom group */}
            <div className="flex items-center gap-1 py-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Zoom Out"
                    className={toolbarBtnClass()}
                    onClick={handleZoomOut}
                  >
                    <ZoomOut size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
              <Select value={String(zoom)} onValueChange={handleZoomChange}>
                <SelectTrigger className="min-w-[80px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[25, 50, 75, 100, 125, 150, 200, 300, 400].map((v) => (
                    <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Zoom In"
                    className={toolbarBtnClass()}
                    onClick={handleZoomIn}
                  >
                    <ZoomIn size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    className={toolbarBtnClass()}
                    onClick={handleFullscreen}
                  >
                    <Maximize2 size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

        </div>

        {/* Canvas area */}
        <div className="flex justify-center p-4 overflow-auto bg-muted/20 dark:bg-muted/10">
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
                stroke="#e2e8f0"
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
                        fill={KONVA_PRIMARY}
                        stroke={KONVA_PRIMARY_DARK}
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
                        fill={KONVA_DESTRUCTIVE}
                        stroke={KONVA_DESTRUCTIVE_DARK}
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
        </div>
      </div>

      {(errors as Record<string, { message?: string }>)?.hotspots && (
        <span className="mt-1 block text-xs font-medium text-destructive">
          {(errors as Record<string, { message?: string }>).hotspots.message}
        </span>
      )}

      {/* Edit hotspot dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) handleEditClose(); }}>
        <DialogContent className="max-w-xs max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Hotspot</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {allowPartialCredit ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm text-muted-foreground">Mark %</label>
                <Select
                  value={String(editingMark * 100)}
                  onValueChange={(val) => {
                    setEditingMark(Number(val) / 100);
                    setEditingError('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 5, 10, 15, 20, 25, 30, 33.3, 40, 50, 60, 75, 80, 90, 100].map((v) => (
                      <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingError && (
                  <span className="mt-1 block text-xs font-medium text-destructive">{editingError}</span>
                )}
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer select-none mt-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={editingIsCorrect}
                  onClick={() => setEditingIsCorrect((prev) => !prev)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    editingIsCorrect ? 'bg-primary' : 'bg-input'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                      editingIsCorrect ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm text-foreground">Mark as correct</span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditClose}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
