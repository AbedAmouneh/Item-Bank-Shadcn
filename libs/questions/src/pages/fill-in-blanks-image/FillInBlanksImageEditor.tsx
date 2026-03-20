import { useState, useCallback, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Circle } from 'react-konva';
import type Konva from 'konva';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Trash2, Plus } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@item-bank/ui';
import { createEmptyAnswer } from '../../domain/factory';
import type { AnswerEntry } from '../../domain/types';
import { useImageUpload } from '../../domain/hooks/useImageUpload';

type TextInputArea = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  answers: AnswerEntry[];
};

const MARK_OPTIONS = [0, 5, 10, 15, 20, 25, 33.3, 30, 40, 50, 60, 75, 80, 90, 100];

const MAX_CANVAS_WIDTH = 800;
const ACTION_BUTTON_OFFSET_Y = 10;
const DEFAULT_ZONE_WIDTH = 140;
const DEFAULT_ZONE_HEIGHT = 36;

export default function FillInBlanksImageEditor() {
  const { t } = useTranslation('questions');
  const { watch, setValue } = useFormContext();
  const { uploadFile, isUploading, error: uploadError } = useImageUpload();

  const background_image: string | null = watch('background_image') ?? null;
  const savedInputAreas: TextInputArea[] | undefined = watch('inputAreas');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(MAX_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const [inputAreas, setInputAreas] = useState<TextInputArea[]>(() => savedInputAreas ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null);
  const [expandedZoneId, setExpandedZoneId] = useState<string | false>(false);

  const stageRef = useRef<Konva.Stage>(null);

  useEffect(() => {
    setValue('inputAreas', inputAreas);
  }, [inputAreas, setValue]);

  useEffect(() => {
    setInputAreas((prev) => {
      let changed = false;
      const next = prev.map((zone) => {
        if (zone.answers.length === 0) return zone;
        const hasFullMarkAnswer = zone.answers.some((answer) => answer.mark === 100);
        if (hasFullMarkAnswer) return zone;
        changed = true;
        return {
          ...zone,
          answers: zone.answers.map((answer, idx) =>
            idx === 0 ? { ...answer, mark: 100 } : answer
          ),
        };
      });
      return changed ? next : prev;
    });
  }, [inputAreas]);

  useEffect(() => {
    if (!background_image) {
      setBackgroundImg(null);
      setCanvasWidth(MAX_CANVAS_WIDTH);
      setCanvasHeight(600);
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
    if (!selectedId) {
      setButtonPos(null);
      return;
    }
    const selectedZone = inputAreas.find((zone) => zone.id === selectedId);
    if (!selectedZone) {
      setButtonPos(null);
      return;
    }
    setButtonPos({
      x: selectedZone.x + selectedZone.width / 2,
      y: selectedZone.y + selectedZone.height + ACTION_BUTTON_OFFSET_Y,
    });
  }, [inputAreas, selectedId]);

  const handleCanvasBackgroundClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty =
      e.target === e.target.getStage() ||
      (e.target as Konva.Node).getAttr('name') === 'bg';
    if (clickedOnEmpty) {
      setSelectedId(null);
      setButtonPos(null);
    }
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    setInputAreas(prev => prev.filter(area => area.id !== selectedId));
    if (expandedZoneId === selectedId) {
      setExpandedZoneId(false);
    }
    setSelectedId(null);
    setButtonPos(null);
  }, [expandedZoneId, selectedId]);

  const handleAddZone = useCallback(() => {
    const newArea: TextInputArea = {
      id: `input-${Date.now()}`,
      x: 24 + (inputAreas.length % 4) * 14,
      y: 24 + (inputAreas.length % 6) * 12,
      width: DEFAULT_ZONE_WIDTH,
      height: DEFAULT_ZONE_HEIGHT,
      answers: [createEmptyAnswer()],
    };
    setInputAreas((prev) => [...prev, newArea]);
    setSelectedId(newArea.id);
    setExpandedZoneId(newArea.id);
  }, [inputAreas.length]);

  const handleAddAnswer = useCallback((zoneId: string) => {
    setInputAreas((prev) =>
      prev.map((zone) =>
        zone.id === zoneId
          ? { ...zone, answers: [...zone.answers, createEmptyAnswer()] }
          : zone
      )
    );
  }, []);

  const handleRemoveAnswer = useCallback((zoneId: string, answerId: string) => {
    setInputAreas((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId || zone.answers.length <= 1) {
          return zone;
        }
        return {
          ...zone,
          answers: zone.answers.filter((answer) => answer.id !== answerId),
        };
      })
    );
  }, []);

  const handleAnswerChange = useCallback(
    (zoneId: string, answerId: string, field: keyof AnswerEntry, value: unknown) => {
      setInputAreas((prev) =>
        prev.map((zone) => {
          if (zone.id !== zoneId) return zone;
          return {
            ...zone,
            answers: zone.answers.map((answer) =>
              answer.id === answerId ? { ...answer, [field]: value } : answer
            ),
          };
        })
      );
    },
    []
  );

  const updateAreaAt = useCallback((index: number, patch: Partial<TextInputArea>) => {
    setInputAreas(prev => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const setBackgroundImageFromFile = useCallback(
    async (file: File | null) => {
      if (!file?.type.startsWith('image/')) return;
      try {
        const url = await uploadFile(file);
        setValue('background_image', url);
        setInputAreas([]);
      } catch {
        // uploadError state is set by the hook for reactive UI
      }
    },
    [setValue, uploadFile]
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
    setValue('inputAreas', []);
    setInputAreas([]);
  }, [setValue]);

  if (!background_image) {
    return (
      <div className="flex flex-col gap-4">
        <p className="block text-[0.8125rem] font-normal leading-tight text-muted-foreground">
          {t('editor.background_image')}
        </p>
        <div
          className={cn(
            'cursor-pointer min-h-[160px] flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors',
            isUploading ? 'pointer-events-none opacity-60 border-border bg-muted/40' :
            dragOver ? 'border-primary bg-accent' : 'border-border bg-muted/40'
          )}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <ImagePlus className="w-12 h-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isUploading ? t('editor.uploading') : t('editor.drag_and_drop')}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={isUploading}
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            {t('editor.browse')}
          </Button>
        </div>
        {uploadError && (
          <p className="text-sm text-destructive">{uploadError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[0.8125rem] font-normal leading-tight text-muted-foreground">
          {t('editor.background_image')}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive text-xs gap-1.5"
          onClick={handleRemoveImage}
        >
          <Trash2 size={14} />
          {t('editor.remove_image')}
        </Button>
      </div>

      <div className="overflow-hidden rounded border border-border">
        <div className="flex justify-center p-4 overflow-auto">
          <Stage
            ref={stageRef}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleCanvasBackgroundClick}
            onTap={handleCanvasBackgroundClick}
            style={{ touchAction: 'manipulation', maxWidth: '100%', height: 'auto', cursor: 'default' }}
          >
            <Layer>
              <Rect
                name="bg"
                x={0} y={0}
                width={canvasWidth}
                height={canvasHeight}
                fill="#ffffff"
                stroke="#e5e7eb"
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

              {inputAreas.map((area, i) => {
                const key = area.id;
                const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
                  const node = e.target;
                  updateAreaAt(i, { x: node.x(), y: node.y() });
                };

                return (
                  <Group key={key}>
                    <Rect
                      x={area.x} y={area.y}
                      width={area.width}
                      height={area.height}
                      fill="rgba(255, 255, 255, 0.9)"
                      stroke="#1976d2"
                      strokeWidth={2}
                      cornerRadius={4}
                      draggable
                      onClick={() => setSelectedId(key)}
                      onTap={() => setSelectedId(key)}
                      onDragEnd={handleDragEnd}
                    />
                    <Text
                      x={area.x + 8}
                      y={area.y + 6}
                      width={area.width - 16}
                      height={area.height - 12}
                      text={t('editor.drag_drop_image.zone_label', { index: i + 1 })}
                      fontSize={14}
                      fill="#0f172a"
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </Group>
                );
              })}

              {selectedId && buttonPos && (() => {
                const cursorEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'pointer';
                };
                const cursorLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = 'default';
                };
                return (
                  <Group
                    name="delete-button"
                    x={buttonPos.x - 12}
                    y={buttonPos.y}
                    onClick={handleDelete}
                    onTap={handleDelete}
                    onMouseEnter={cursorEnter}
                    onMouseLeave={cursorLeave}
                  >
                    <Circle
                      x={12}
                      y={12}
                      radius={12}
                      fill="#ef4444"
                      stroke="#dc2626"
                      strokeWidth={2}
                    />
                    <Text
                      text="×" fontSize={18} fontStyle="bold" fill="white"
                      align="center" verticalAlign="middle"
                      x={6} y={3} width={12} height={18}
                    />
                  </Group>
                );
              })()}
            </Layer>
          </Stage>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[0.8125rem] text-muted-foreground">{t('editor.fill_in_blanks_image.zones')}</p>
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            onClick={handleAddZone}
          >
            <Plus size={16} />
            {t('editor.drag_drop_image.add_zone')}
          </button>
        </div>

        <Accordion
          type="single"
          collapsible
          value={expandedZoneId !== false ? expandedZoneId : ''}
          onValueChange={(val) => {
            const next = val || false;
            setExpandedZoneId(next);
            if (next) setSelectedId(next);
          }}
        >
          {inputAreas.map((zone, zoneIndex) => (
            <AccordionItem key={zone.id} value={zone.id}>
              <AccordionTrigger className="py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('editor.drag_drop_image.zone_label', { index: zoneIndex + 1 })}</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(zone.x)},{Math.round(zone.y)}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3 pt-1">
                  {zone.answers.map((answer) => (
                    <div
                      key={answer.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg"
                    >
                      <Input
                        placeholder={t('editor.add_answer')}
                        value={answer.text}
                        onChange={(e) => handleAnswerChange(zone.id, answer.id, 'text', e.target.value)}
                        className="flex-1 h-[34px] text-[0.8125rem]"
                      />

                      <Select
                        value={String(answer.mark)}
                        onValueChange={(val) => handleAnswerChange(zone.id, answer.id, 'mark', Number(val))}
                      >
                        <SelectTrigger className="min-w-[82px] h-[34px] text-[0.8125rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MARK_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={String(opt)}>
                              {opt} %
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <label className="shrink-0 flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="sr-only peer/toggle"
                          checked={answer.ignoreCasing}
                          onChange={(e) => handleAnswerChange(zone.id, answer.id, 'ignoreCasing', e.target.checked)}
                        />
                        <div className="w-9 h-5 rounded-full transition-colors bg-[hsl(var(--toggle-track))] peer-checked/toggle:bg-primary relative">
                          <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked/toggle:translate-x-4 rtl:peer-checked/toggle:-translate-x-4" />
                        </div>
                        <span className="text-xs text-foreground">{t('editor.ignore_casing')}</span>
                      </label>

                      {zone.answers.length > 1 && (
                        <button
                          type="button"
                          aria-label="Remove answer"
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => handleRemoveAnswer(zone.id, answer.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1 self-start text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      onClick={() => handleAddAnswer(zone.id)}
                    >
                      <Plus size={14} />
                      {t('editor.add_answer')}
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
                      onClick={() => {
                        setInputAreas((prev) => prev.filter((entry) => entry.id !== zone.id));
                        if (selectedId === zone.id) {
                          setSelectedId(null);
                          setButtonPos(null);
                        }
                        if (expandedZoneId === zone.id) {
                          setExpandedZoneId(false);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                      {t('editor.fill_in_blanks_image.delete_zone')}
                    </button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
