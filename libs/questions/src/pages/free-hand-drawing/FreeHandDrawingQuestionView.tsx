import { useRef, useState, useCallback, useEffect } from 'react';
import { Pencil, Minus, Square, Circle as CircleIcon, Pentagon, Type, Hand, Undo, Redo, RotateCcw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { Stage, Layer, Line, Rect, Circle, Text, Image as KonvaImage, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';

type FreeHandDrawingQuestionViewProps = {
  question: QuestionRow;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundImage?: string | null;
};

type Tool = 'pencil' | 'line' | 'rectangle' | 'circle' | 'polygon' | 'text' | 'pan';

type DrawingLine = {
  tool: Tool;
  points: number[];
  color: string;
  strokeWidth: number;
  opacity?: number;
  x?: number;
  y?: number;
};

type DrawingShape = {
  type: 'rectangle' | 'circle' | 'line' | 'text' | 'polygon';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  text?: string;
  color: string;
  strokeWidth: number;
  fontSize?: number;
  opacity?: number;
  useFill?: boolean;
  fillColor?: string;
};


const POLYGON_CLOSE_THRESHOLD = 12;
const POLYGON_MIN_POINTS = 6; // 3 vertices (x,y each)
const DEFAULT_STROKE_COLOR = '#000000';
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_FONT_SIZE = 23;

/** Shared icon button used throughout the toolbar. */
const ToolbarIconButton = ({
  selected,
  onClick,
  disabled,
  'aria-label': ariaLabel,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  'aria-label': string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40',
      selected
        ? 'bg-primary/10 text-primary dark:bg-primary/20'
        : 'bg-transparent text-muted-foreground hover:bg-primary/15 dark:hover:bg-primary/30',
    )}
  >
    {children}
  </button>
);

const FreeHandDrawingQuestionView = ({
  question,
  canvasWidth = 800,
  canvasHeight = 600,
  backgroundImage = null,
}: FreeHandDrawingQuestionViewProps) => {
  const [tool, setTool] = useState<Tool>('pencil');
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [shapes, setShapes] = useState<DrawingShape[]>([]);
  const isDrawing = useRef(false);
  const [currentLine, setCurrentLine] = useState<number[]>([]);
  const [currentShape, setCurrentShape] = useState<Partial<DrawingShape> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<number[]>([]);
  const history = useRef<{ lines: DrawingLine[]; shapes: DrawingShape[] }[]>([]);
  const historyIndex = useRef(-1);
  const [zoom, setZoom] = useState(100);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState({ x: 1, y: 1 });
  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteButtonPos, setDeleteButtonPos] = useState<{ x: number; y: number } | null>(null);
  const [openColorPicker, setOpenColorPicker] = useState<'stroke' | 'fill' | null>(null);
  const strokeColorSwatchRef = useRef<HTMLDivElement | null>(null);
  const strokeColorPickerRef = useRef<HTMLDivElement | null>(null);
  const fillColorSwatchRef = useRef<HTMLDivElement | null>(null);
  const fillColorPickerRef = useRef<HTMLDivElement | null>(null);

  const nodeRefs = useRef<Record<string, Konva.Node>>({});
  const transformerRef = useRef<Konva.Transformer>(null);

  const updateDeleteButtonPosition = useCallback(() => {
    if (!selectedId || tool !== 'pan') {
      setDeleteButtonPos(null);
      return;
    }
    const node = nodeRefs.current[selectedId];
    const transformer = transformerRef.current;
    if (!node || !transformer) {
      setDeleteButtonPos(null);
      return;
    }
    const box = transformer.getClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height + 20;
    setDeleteButtonPos({ x, y });
  }, [selectedId, tool]);

  useEffect(() => {
    if (tool !== 'pan' && tool !== 'text') {
      setSelectedId(null);
      transformerRef.current?.nodes([]);
      setDeleteButtonPos(null);
      return;
    }
    if (!selectedId) {
      transformerRef.current?.nodes([]);
      setDeleteButtonPos(null);
      return;
    }
    const node = nodeRefs.current[selectedId];
    if (node) {
      transformerRef.current?.nodes([node]);
      setTimeout(updateDeleteButtonPosition, 0);
    } else {
      transformerRef.current?.nodes([]);
      setDeleteButtonPos(null);
    }
  }, [tool, selectedId, lines.length, shapes.length, updateDeleteButtonPosition]);

  useEffect(() => {
    if (!transformerRef.current || !selectedId) return;
    const transformer = transformerRef.current;
    const handleTransform = () => {
      updateDeleteButtonPosition();
    };
    transformer.on('transform', handleTransform);
    transformer.on('dragmove', handleTransform);
    return () => {
      transformer.off('transform', handleTransform);
      transformer.off('dragmove', handleTransform);
    };
  }, [selectedId, updateDeleteButtonPosition]);



  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLineIndex =
    selectedId && selectedId.startsWith('line-') ? Number.parseInt(selectedId.replace('line-', ''), 10) : -1;
  const selectedLine = selectedLineIndex >= 0 ? lines[selectedLineIndex] : null;
  const selectedShapeIndex =
    selectedId && selectedId.startsWith('shape-') ? Number.parseInt(selectedId.replace('shape-', ''), 10) : -1;
  const selectedShape = selectedShapeIndex >= 0 ? shapes[selectedShapeIndex] : null;
  const selectedDrawable = selectedShape || selectedLine;
  const selectedTextShape = selectedShape?.type === 'text' ? selectedShape : null;
  const showShapeProperties = tool === 'pan' && !!selectedDrawable;
  const supportsFill =
    selectedShape?.type === 'rectangle' || selectedShape?.type === 'circle' || selectedShape?.type === 'polygon';
  const selectedStrokeColor = selectedDrawable?.color || DEFAULT_STROKE_COLOR;
  const selectedOpacity = selectedDrawable?.opacity ?? 1;
  const selectedStrokeWidth = selectedDrawable?.strokeWidth ?? DEFAULT_STROKE_WIDTH;

  const updateSelectedStrokeColor = (nextColor: string) => {
    if (selectedShapeIndex >= 0) {
      setShapes((prev) => {
        if (!prev[selectedShapeIndex]) return prev;
        const next = [...prev];
        next[selectedShapeIndex] = { ...next[selectedShapeIndex], color: nextColor };
        return next;
      });
      return;
    }
    if (selectedLineIndex >= 0) {
      setLines((prev) => {
        if (!prev[selectedLineIndex]) return prev;
        const next = [...prev];
        next[selectedLineIndex] = { ...next[selectedLineIndex], color: nextColor };
        return next;
      });
    }
  };

  const updateSelectedStrokeWidth = (nextWidth: number) => {
    if (selectedShapeIndex >= 0) {
      setShapes((prev) => {
        if (!prev[selectedShapeIndex]) return prev;
        const next = [...prev];
        next[selectedShapeIndex] = { ...next[selectedShapeIndex], strokeWidth: nextWidth };
        return next;
      });
      return;
    }
    if (selectedLineIndex >= 0) {
      setLines((prev) => {
        if (!prev[selectedLineIndex]) return prev;
        const next = [...prev];
        next[selectedLineIndex] = { ...next[selectedLineIndex], strokeWidth: nextWidth };
        return next;
      });
    }
  };

  const updateSelectedOpacity = (nextOpacity: number) => {
    if (selectedShapeIndex >= 0) {
      setShapes((prev) => {
        if (!prev[selectedShapeIndex]) return prev;
        const next = [...prev];
        next[selectedShapeIndex] = { ...next[selectedShapeIndex], opacity: nextOpacity };
        return next;
      });
      return;
    }
    if (selectedLineIndex >= 0) {
      setLines((prev) => {
        if (!prev[selectedLineIndex]) return prev;
        const next = [...prev];
        next[selectedLineIndex] = { ...next[selectedLineIndex], opacity: nextOpacity };
        return next;
      });
    }
  };

  const updateSelectedFillColor = useCallback((nextColor: string) => {
    setShapes((prev) => {
      if (selectedShapeIndex < 0 || !prev[selectedShapeIndex]) return prev;
      const next = [...prev];
      next[selectedShapeIndex] = { ...next[selectedShapeIndex], fillColor: nextColor, useFill: true };
      return next;
    });
  }, [selectedShapeIndex]);

  useEffect(() => {
    if (!showShapeProperties) {
      setOpenColorPicker(null);
    }
  }, [showShapeProperties]);

  const backgroundImageRef = useRef(backgroundImage);
  backgroundImageRef.current = backgroundImage;

  useEffect(() => {
    if (backgroundImage) {
      const img = new window.Image();
      const url = backgroundImage;

      if (!backgroundImage.startsWith('data:') && !backgroundImage.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        if (backgroundImageRef.current === url) setBackgroundImg(img);
      };
      img.onerror = () => {
        if (backgroundImageRef.current === url) setBackgroundImg(null);
      };
      img.src = backgroundImage;
    } else {
      setBackgroundImg(null);
    }
  }, [backgroundImage]);

  const saveToHistory = useCallback(
    (override?: { lines?: DrawingLine[]; shapes?: DrawingShape[] }) => {
      const newHistory = history.current.slice(0, historyIndex.current + 1);
      newHistory.push({
        lines: override?.lines ? [...override.lines] : [...lines],
        shapes: override?.shapes ? [...override.shapes] : [...shapes],
      });
      history.current = newHistory;
      historyIndex.current = newHistory.length - 1;
    },
    [lines, shapes]
  );

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    if (selectedId.startsWith('line-')) {
      const index = parseInt(selectedId.replace('line-', ''), 10);
      setLines((prev) => {
        const next = prev.filter((_, i) => i !== index);
        saveToHistory({ lines: next });
        return next;
      });
    } else if (selectedId.startsWith('shape-')) {
      const index = parseInt(selectedId.replace('shape-', ''), 10);
      setShapes((prev) => {
        const next = prev.filter((_, i) => i !== index);
        saveToHistory({ shapes: next });
        return next;
      });
    }
    setSelectedId(null);
    setDeleteButtonPos(null);
  }, [selectedId, saveToHistory]);

  const checkDeselect = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool !== 'pan') return;
      const stage = e.target.getStage();
      if (!stage) return;
      const clickedOnEmpty = e.target === stage || (e.target as Konva.Node).getAttr('name') === 'bg';
      const clickedOnDeleteButton = (e.target as Konva.Node).getAttr('name') === 'delete-button';
      if (clickedOnDeleteButton) {
        handleDelete();
        return;
      }
      if (clickedOnEmpty) {
        setSelectedId(null);
        setDeleteButtonPos(null);
      }
    },
    [tool, handleDelete]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current -= 1;
      const prevState = history.current[historyIndex.current];
      setLines(prevState.lines);
      setShapes(prevState.shapes);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current += 1;
      const nextState = history.current[historyIndex.current];
      setLines(nextState.lines);
      setShapes(nextState.shapes);
    }
  }, []);

  const handleReset = useCallback(() => {
    setLines([]);
    setShapes([]);
    setPolygonPoints([]);
    setZoom(100);
    setStagePos({ x: 0, y: 0 });
    setStageScale({ x: 1, y: 1 });
    saveToHistory();
  }, [saveToHistory]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + 25, 400);
    setZoom(newZoom);
    const scale = newZoom / 100;
    setStageScale({ x: scale, y: scale });
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 25, 25);
    setZoom(newZoom);
    const scale = newZoom / 100;
    setStageScale({ x: scale, y: scale });
  }, [zoom]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
    const scale = newZoom / 100;
    setStageScale({ x: scale, y: scale });
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch((err: Error) => console.error('Error attempting to enable fullscreen:', err));
    } else {
      document.exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch((err: Error) => console.error('Error attempting to exit fullscreen:', err));
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (tool !== 'polygon') {
      setPolygonPoints([]);
    }
  }, [tool]);

  const closePolygon = useCallback(() => {
    if (polygonPoints.length >= POLYGON_MIN_POINTS) {
      saveToHistory();
      setShapes((prev) => [
        ...prev,
        {
          type: 'polygon',
          x: 0,
          y: 0,
          points: [...polygonPoints],
          color: DEFAULT_STROKE_COLOR,
          strokeWidth: DEFAULT_STROKE_WIDTH,
        } as DrawingShape,
      ]);
    }
    setPolygonPoints([]);
  }, [polygonPoints, saveToHistory]);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool === 'pan') {
        return;
      }

      const stage = e.target.getStage();
      if (!stage) return;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const x = (pointerPos.x - stagePos.x) / (stageScale.x || 1);
      const y = (pointerPos.y - stagePos.y) / (stageScale.y || 1);

      if (tool === 'polygon') {
        if (polygonPoints.length >= POLYGON_MIN_POINTS) {
          const fx = polygonPoints[0];
          const fy = polygonPoints[1];
          const dist = Math.sqrt((x - fx) ** 2 + (y - fy) ** 2);
          if (dist <= POLYGON_CLOSE_THRESHOLD) {
            closePolygon();
            return;
          }
        }
        setPolygonPoints((prev) => [...prev, x, y]);
        return;
      }

      isDrawing.current = true;
      startPosRef.current = { x, y };

      if (tool === 'pencil') {
        setCurrentLine([x, y]);
      } else       if (tool === 'line') {
        setCurrentShape({ type: 'line', x, y, points: [x, y, x, y], color: DEFAULT_STROKE_COLOR, strokeWidth: DEFAULT_STROKE_WIDTH });
      } else if (tool === 'rectangle') {
        setCurrentShape({ type: 'rectangle', x, y, width: 0, height: 0, color: DEFAULT_STROKE_COLOR, strokeWidth: DEFAULT_STROKE_WIDTH });
      } else if (tool === 'circle') {
        setCurrentShape({ type: 'circle', x, y, radius: 0, color: DEFAULT_STROKE_COLOR, strokeWidth: DEFAULT_STROKE_WIDTH });
      } else if (tool === 'text') {
        saveToHistory();
        setShapes((prevShapes) => {
          const next = [
            ...prevShapes,
            { type: 'text', x, y, text: 'Hello', color: DEFAULT_STROKE_COLOR, strokeWidth: DEFAULT_STROKE_WIDTH, fontSize: DEFAULT_FONT_SIZE, opacity: 1 } as DrawingShape,
          ];
          setSelectedId(`shape-${prevShapes.length}`);
          return next;
        });
        isDrawing.current = false;
      }
    },
    [tool, stagePos, stageScale, saveToHistory, polygonPoints, closePolygon]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (tool === 'pan') return;
      if (tool === 'polygon') return;

      const startPos = startPosRef.current;
      if (!isDrawing.current || !startPos) return;

      const stage = e.target.getStage();
      if (!stage) return;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const x = (pointerPos.x - stagePos.x) / (stageScale.x || 1);
      const y = (pointerPos.y - stagePos.y) / (stageScale.y || 1);

      if (tool === 'pencil') {
        setCurrentLine([...currentLine, x, y]);
      } else if (tool === 'line' && currentShape) {
        setCurrentShape({ ...currentShape, points: [startPos.x, startPos.y, x, y] });
      } else if (tool === 'rectangle' && currentShape) {
        const width = x - startPos.x;
        const height = y - startPos.y;
        setCurrentShape({
          ...currentShape,
          x: Math.min(startPos.x, x),
          y: Math.min(startPos.y, y),
          width: Math.abs(width),
          height: Math.abs(height),
        });
      } else if (tool === 'circle' && currentShape) {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        setCurrentShape({ ...currentShape, radius });
      }
    },
    [tool, currentLine, currentShape, stagePos, stageScale]
  );

  const handleMouseUp = useCallback(() => {
    if (tool === 'pan') {
      return;
    }

    if (!isDrawing.current) return;

    isDrawing.current = false;

    if (tool === 'pencil' && currentLine.length > 0) {
      saveToHistory();
      setLines((prev) => [...prev, { tool: 'pencil', points: [...currentLine], color: DEFAULT_STROKE_COLOR, strokeWidth: DEFAULT_STROKE_WIDTH }]);
      setCurrentLine([]);
    } else if (currentShape) {
      saveToHistory();
      if (tool === 'line' && currentShape.points) {
        setShapes((prev) => [...prev, { ...currentShape, type: 'line' } as DrawingShape]);
      } else if (tool === 'rectangle') {
        setShapes((prev) => [...prev, { ...currentShape, type: 'rectangle' } as DrawingShape]);
      } else if (tool === 'circle') {
        setShapes((prev) => [...prev, { ...currentShape, type: 'circle' } as DrawingShape]);
      }
      setCurrentShape(null);
    }

    startPosRef.current = null;
  }, [tool, currentLine, currentShape, saveToHistory]);

  useEffect(() => {
    if (history.current.length === 0) {
      saveToHistory();
    }
  }, [saveToHistory]);

  // Void usage of question prop to satisfy TypeScript without modifying logic.
  void question;

  return (
    <TooltipProvider>
      <div ref={containerRef}>
        {/* Toolbar */}
        <div className="flex items-center flex-wrap gap-1 p-2 bg-muted border-b border-border dark:bg-muted/80">

          {/* Drawing tools group */}
          <div className="flex items-center gap-1 py-0 ps-2 pe-2 border-e border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Pencil" selected={tool === 'pencil'} onClick={() => setTool('pencil')}>
                  <Pencil className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Pencil</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Line" selected={tool === 'line'} onClick={() => setTool('line')}>
                  <Minus className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Line</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Rectangle" selected={tool === 'rectangle'} onClick={() => setTool('rectangle')}>
                  <Square className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Rectangle</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Circle" selected={tool === 'circle'} onClick={() => setTool('circle')}>
                  <CircleIcon className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Circle</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Polygon" selected={tool === 'polygon'} onClick={() => setTool('polygon')}>
                  <Pentagon className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Polygon</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Text" selected={tool === 'text'} onClick={() => setTool('text')}>
                  <Type className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Text</TooltipContent>
            </Tooltip>
          </div>

          {/* Pan / history group */}
          <div className="flex items-center gap-1 py-0 ps-2 pe-2 border-e border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Pan" selected={tool === 'pan'} onClick={() => setTool('pan')}>
                  <Hand className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Pan</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Undo" onClick={handleUndo} disabled={historyIndex.current <= 0}>
                  <Undo className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton
                  aria-label="Redo"
                  onClick={handleRedo}
                  disabled={historyIndex.current >= history.current.length - 1}
                >
                  <Redo className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Reset" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Reset</TooltipContent>
            </Tooltip>
          </div>

          {/* Zoom group */}
          <div className="flex items-center gap-1 py-0 ps-2 pe-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Zoom Out" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
            <Select
              value={String(zoom)}
              onValueChange={(val) => handleZoomChange(Number(val))}
            >
              <SelectTrigger className="h-8 w-20 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25%</SelectItem>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
                <SelectItem value="125">125%</SelectItem>
                <SelectItem value="150">150%</SelectItem>
                <SelectItem value="200">200%</SelectItem>
                <SelectItem value="300">300%</SelectItem>
                <SelectItem value="400">400%</SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label="Zoom In" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarIconButton aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onClick={handleFullscreen}>
                  <Maximize className="h-4 w-4" />
                </ToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex justify-center items-stretch gap-4 p-4 overflow-auto bg-muted/50 dark:bg-muted/20">
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
            style={{ cursor: tool === 'pencil' || tool === 'polygon' ? 'crosshair' : 'default' }}
          >
            <Layer>
              <Rect
                name="bg"
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                fill="#ffffff"
                stroke="#e5e7eb"
                strokeWidth={1}
              />

              {backgroundImg && (
                <KonvaImage
                  image={backgroundImg}
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  listening={false}
                  opacity={1}
                />
              )}

              {lines.map((line, i) => {
                const key = `line-${i}`;
                return (
                  <Line
                    key={key}
                    ref={(node) => {
                      if (node) nodeRefs.current[key] = node;
                      else delete nodeRefs.current[key];
                    }}
                    x={line.x ?? 0}
                    y={line.y ?? 0}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    opacity={line.opacity ?? 1}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    draggable={tool === 'pan'}
                    onClick={tool === 'pan' ? () => setSelectedId(key) : undefined}
                    onTap={tool === 'pan' ? () => setSelectedId(key) : undefined}
                    onDragEnd={
                      tool === 'pan'
                        ? (e) => {
                            const node = e.target;
                            setLines((prev) => {
                              const next = [...prev];
                              next[i] = { ...next[i], x: node.x(), y: node.y() };
                              saveToHistory({ lines: next });
                              return next;
                            });
                            setTimeout(updateDeleteButtonPosition, 0);
                          }
                        : undefined
                    }
                  />
                );
              })}


              {shapes.map((shape, i) => {
                const key = `shape-${i}`;
                const setRef = (node: Konva.Node | null) => {
                  if (node) nodeRefs.current[key] = node;
                  else delete nodeRefs.current[key];
                };
                const handleShapeDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
                  const node = e.target;
                  setShapes((prev) => {
                    const next = [...prev];
                    next[i] = { ...next[i], x: node.x(), y: node.y() };
                    saveToHistory({ shapes: next });
                    return next;
                  });
                  setTimeout(updateDeleteButtonPosition, 0);
                };
                const handleRectTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
                  const node = e.target as Konva.Rect;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  node.scaleX(1);
                  node.scaleY(1);
                  setShapes((prev) => {
                    const next = [...prev];
                    next[i] = {
                      ...next[i],
                      x: node.x(),
                      y: node.y(),
                      width: Math.max(5, node.width() * scaleX),
                      height: Math.max(5, node.height() * scaleY),
                    };
                    saveToHistory({ shapes: next });
                    return next;
                  });
                  setTimeout(updateDeleteButtonPosition, 0);
                };
                const handleCircleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
                  const node = e.target as Konva.Circle;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  node.scaleX(1);
                  node.scaleY(1);
                  const radius = Math.max(5, node.radius() * Math.max(scaleX, scaleY));
                  setShapes((prev) => {
                    const next = [...prev];
                    next[i] = { ...next[i], x: node.x(), y: node.y(), radius };
                    saveToHistory({ shapes: next });
                    return next;
                  });
                  setTimeout(updateDeleteButtonPosition, 0);
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
                if (shape.type === 'line' && shape.points) {
                  return (
                    <Line
                      key={key}
                      points={shape.points}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      opacity={shape.opacity ?? 1}
                      {...selectProps}
                    />
                  );
                }
                if (shape.type === 'rectangle') {
                  return (
                    <Rect
                      key={key}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width || 0}
                      height={shape.height || 0}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      fill={shape.useFill ? shape.fillColor || DEFAULT_STROKE_COLOR : 'transparent'}
                      opacity={shape.opacity ?? 1}
                      {...selectProps}
                      onTransformEnd={tool === 'pan' ? handleRectTransformEnd : undefined}
                    />
                  );
                }
                if (shape.type === 'circle') {
                  return (
                    <Circle
                      key={key}
                      x={shape.x}
                      y={shape.y}
                      radius={shape.radius || 0}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      fill={shape.useFill ? shape.fillColor || DEFAULT_STROKE_COLOR : 'transparent'}
                      opacity={shape.opacity ?? 1}
                      {...selectProps}
                      onTransformEnd={tool === 'pan' ? handleCircleTransformEnd : undefined}
                    />
                  );
                }
                if (shape.type === 'text') {
                  return (
                    <Text
                      key={key}
                      x={shape.x}
                      y={shape.y}
                      text={shape.text || ''}
                      fontSize={shape.fontSize || 23}
                      fill={shape.color}
                      opacity={shape.opacity ?? 1}
                      {...selectProps}
                    />
                  );
                }
                if (shape.type === 'polygon' && shape.points && shape.points.length >= POLYGON_MIN_POINTS) {
                  return (
                    <Line
                      key={key}
                      points={shape.points}
                      stroke={shape.color}
                      strokeWidth={shape.strokeWidth}
                      fill={shape.useFill ? shape.fillColor || DEFAULT_STROKE_COLOR : 'transparent'}
                      opacity={shape.opacity ?? 1}
                      closed
                      {...selectProps}
                    />
                  );
                }
                return null;
              })}

              {tool === 'polygon' && polygonPoints.length >= 2 && (
                <Line
                  points={polygonPoints}
                  stroke={DEFAULT_STROKE_COLOR}
                  strokeWidth={DEFAULT_STROKE_WIDTH}
                  closed={false}
                />
              )}
              {tool === 'polygon' &&
                polygonPoints.length >= 2 &&
                Array.from({ length: Math.floor(polygonPoints.length / 2) }, (_, i) => [polygonPoints[i * 2], polygonPoints[i * 2 + 1]]).map(([px, py], i) => (
                  <Circle key={`poly-pt-${i}`} x={px} y={py} radius={4} fill="#000000" stroke="#fff" strokeWidth={1} />
                ))}


              {isDrawing.current && tool === 'pencil' && currentLine.length > 0 && (
                <Line
                  points={currentLine}
                  stroke={DEFAULT_STROKE_COLOR}
                  strokeWidth={DEFAULT_STROKE_WIDTH}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {isDrawing.current && currentShape && tool === 'line' && currentShape.points && (
                <Line
                  points={currentShape.points}
                  stroke={currentShape.color || DEFAULT_STROKE_COLOR}
                  strokeWidth={currentShape.strokeWidth ?? DEFAULT_STROKE_WIDTH}
                />
              )}
              {isDrawing.current && currentShape && tool === 'rectangle' && (
                <Rect
                  x={currentShape.x || 0}
                  y={currentShape.y || 0}
                  width={currentShape.width || 0}
                  height={currentShape.height || 0}
                  stroke={currentShape.color || DEFAULT_STROKE_COLOR}
                  strokeWidth={currentShape.strokeWidth ?? DEFAULT_STROKE_WIDTH}
                  fill="transparent"
                />
              )}
              {isDrawing.current && currentShape && tool === 'circle' && (
                <Circle
                  x={currentShape.x || 0}
                  y={currentShape.y || 0}
                  radius={currentShape.radius || 0}
                  stroke={currentShape.color || DEFAULT_STROKE_COLOR}
                  strokeWidth={currentShape.strokeWidth ?? DEFAULT_STROKE_WIDTH}
                  fill="transparent"
                />
              )}

              {(tool === 'pan' || tool === 'text') && (
                <Transformer
                  ref={transformerRef}
                  borderDash={tool === 'text' ? [4, 4] : undefined}
                  enabledAnchors={tool === 'text' ? [] : undefined}
                  rotateEnabled={tool === 'text' ? false : undefined}
                  flipEnabled={false}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              )}

              {tool === 'pan' && selectedId && deleteButtonPos && (
                <Group
                  name="delete-button"
                  x={deleteButtonPos.x}
                  y={deleteButtonPos.y}
                  onClick={handleDelete}
                  onTap={handleDelete}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage) {
                      stage.container().style.cursor = 'pointer';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) {
                      stage.container().style.cursor = 'default';
                    }
                  }}
                >
                  <Circle
                    radius={12}
                    fill="#ef4444"
                    stroke="#b91c1c"
                    strokeWidth={2}
                  />
                  <Text
                    text="×"
                    fontSize={18}
                    fontStyle="bold"
                    fill="white"
                    align="center"
                    verticalAlign="middle"
                    x={-6}
                    y={-9}
                    width={12}
                    height={18}
                  />
                </Group>
              )}
            </Layer>
          </Stage>

          {/* Properties sidebar */}
          {showShapeProperties && selectedDrawable && (
            <div
              className="w-[280px] min-w-[280px] p-4 border-s border-border bg-background dark:bg-card"
              onMouseDownCapture={(e) => {
                if (!openColorPicker) return;
                const target = e.target as Node;
                if (openColorPicker === 'stroke') {
                  if (strokeColorPickerRef.current?.contains(target)) return;
                  if (strokeColorSwatchRef.current?.contains(target)) return;
                }
                if (openColorPicker === 'fill') {
                  if (fillColorPickerRef.current?.contains(target)) return;
                  if (fillColorSwatchRef.current?.contains(target)) return;
                }
                setOpenColorPicker(null);
              }}
            >
              <h3 className="text-base font-semibold text-foreground mb-2">Properties</h3>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">
                {selectedShape?.type === 'text' ? 'Text color' : 'Stroke color'}
              </p>
              <div className="mt-0.5 mb-2.5 flex items-center gap-1">
                <div
                  ref={strokeColorSwatchRef}
                  className="w-3.5 h-3.5 rounded-full border border-border cursor-pointer shrink-0"
                  style={{ backgroundColor: selectedStrokeColor }}
                  onClick={() => setOpenColorPicker((prev) => (prev === 'stroke' ? null : 'stroke'))}
                />
                <HexColorInput
                  prefixed
                  color={selectedStrokeColor}
                  onChange={updateSelectedStrokeColor}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    fontSize: '0.95rem',
                    width: 90,
                    outline: 'none',
                  }}
                />
              </div>
              {openColorPicker === 'stroke' && (
                <div ref={strokeColorPickerRef} className="mb-2.5">
                  <HexColorPicker
                    color={selectedStrokeColor}
                    onChange={updateSelectedStrokeColor}
                  />
                </div>
              )}

              {supportsFill && (
                <>
                  <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={!!selectedShape.useFill}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShapes((prev) => {
                          if (selectedShapeIndex < 0 || !prev[selectedShapeIndex]) {
                            return prev;
                          }
                          const next = [...prev];
                          next[selectedShapeIndex] = {
                            ...next[selectedShapeIndex],
                            useFill: checked,
                            fillColor: next[selectedShapeIndex].fillColor || DEFAULT_STROKE_COLOR,
                          };
                          return next;
                        });
                      }}
                    />
                    <span className="text-sm text-foreground">Fill color</span>
                  </label>
                  {!!selectedShape.useFill && (
                    <>
                      <div className="mt-0.5 mb-2.5 flex items-center gap-1">
                        <div
                          ref={fillColorSwatchRef}
                          className="w-3.5 h-3.5 rounded-full border border-border cursor-pointer shrink-0"
                          style={{ backgroundColor: selectedShape.fillColor || DEFAULT_STROKE_COLOR }}
                          onClick={() => setOpenColorPicker((prev) => (prev === 'fill' ? null : 'fill'))}
                        />
                        <HexColorInput
                          prefixed
                          color={selectedShape.fillColor || DEFAULT_STROKE_COLOR}
                          onChange={updateSelectedFillColor}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            fontSize: '0.95rem',
                            width: 90,
                            outline: 'none',
                          }}
                        />
                      </div>
                      {openColorPicker === 'fill' && (
                        <div ref={fillColorPickerRef} className="mb-2.5">
                          <HexColorPicker
                            color={selectedShape.fillColor || DEFAULT_STROKE_COLOR}
                            onChange={updateSelectedFillColor}
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {selectedShape?.type === 'text' && selectedTextShape && (
                <>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Text Content</p>
                  <Textarea
                    value={selectedTextShape.text || ''}
                    onChange={(e) => {
                      const nextText = e.target.value;
                      setShapes((prev) => {
                        if (selectedShapeIndex < 0 || !prev[selectedShapeIndex] || prev[selectedShapeIndex].type !== 'text') {
                          return prev;
                        }
                        const next = [...prev];
                        next[selectedShapeIndex] = { ...next[selectedShapeIndex], text: nextText };
                        return next;
                      });
                    }}
                    className="mb-2.5"
                  />
                </>
              )}

              <p className="text-sm font-medium text-muted-foreground mb-1">
                {selectedShape?.type === 'text'
                  ? `Font size: ${Math.round(selectedTextShape?.fontSize ?? DEFAULT_FONT_SIZE)}px`
                  : `Stroke width: ${Math.round(selectedStrokeWidth)}px`}
              </p>
              <input
                type="range"
                className="w-full mb-2.5 accent-primary"
                min={selectedShape?.type === 'text' ? 8 : 1}
                max={selectedShape?.type === 'text' ? 72 : 20}
                value={selectedShape?.type === 'text' ? selectedTextShape?.fontSize ?? DEFAULT_FONT_SIZE : selectedStrokeWidth}
                onChange={(e) => {
                  const nextValue = Number(e.target.value);
                  if (selectedShape?.type === 'text') {
                    setShapes((prev) => {
                      if (selectedShapeIndex < 0 || !prev[selectedShapeIndex]) {
                        return prev;
                      }
                      const next = [...prev];
                      if (next[selectedShapeIndex].type !== 'text') return prev;
                      next[selectedShapeIndex] = { ...next[selectedShapeIndex], fontSize: nextValue };
                      return next;
                    });
                    return;
                  }
                  updateSelectedStrokeWidth(nextValue);
                }}
              />

              <p className="text-sm font-medium text-muted-foreground mb-1">
                Opacity: {Math.round(selectedOpacity * 100)}%
              </p>
              <input
                type="range"
                className="w-full accent-primary"
                min={0}
                max={100}
                value={Math.round(selectedOpacity * 100)}
                onChange={(e) => {
                  const nextOpacityPercent = Number(e.target.value);
                  updateSelectedOpacity(nextOpacityPercent / 100);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default FreeHandDrawingQuestionView;
