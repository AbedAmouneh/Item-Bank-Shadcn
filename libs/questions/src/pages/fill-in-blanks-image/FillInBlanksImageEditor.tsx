import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  IconButton,
  Chip,
  Typography,
  useTheme,
  styled,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Circle } from 'react-konva';
import type Konva from 'konva';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutline';
import { createEmptyAnswer } from '../../domain/factory';
import type { AnswerEntry } from '../../domain/types';

type TextInputArea = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  answers: AnswerEntry[];
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


const MARK_OPTIONS = [0, 5, 10, 15, 20, 25, 33.3, 30, 40, 50, 60, 75, 80, 90, 100];

const MAX_CANVAS_WIDTH = 800;
const ACTION_BUTTON_OFFSET_Y = 10;
const DEFAULT_ZONE_WIDTH = 140;
const DEFAULT_ZONE_HEIGHT = 36;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function FillInBlanksImageEditor() {
  const { t } = useTranslation('questions');
  const theme = useTheme();
  const { watch, setValue } = useFormContext();

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
        const dataUrl = await fileToDataUrl(file);
        setValue('background_image', dataUrl);
        setInputAreas([]);
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
    setValue('inputAreas', []);
    setInputAreas([]);
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


      <Box
        className="overflow-hidden rounded"
        sx={{ border: `1px solid ${theme.palette.divider}` }}
      >
        <Box className="flex justify-center p-4 overflow-auto">
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
                      text={`Zone ${i + 1}`}
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
                      fill={theme.palette.error.main}
                      stroke={theme.palette.error.dark}
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
        </Box>
      </Box>

      <Box className="flex flex-col gap-2">
        <Box className="flex items-center justify-between">
          <Typography
            variant="body2"
            className="text-[0.8125rem]"
            sx={{ color: theme.palette.text.secondary }}
          >
            Zones
          </Typography>
          <Button
            variant="text"
            startIcon={<AddIcon />}
            onClick={handleAddZone}
            className="normal-case text-sm"
          >
            Add zone
          </Button>
        </Box>
        {inputAreas.map((zone, zoneIndex) => (
          <Accordion
            key={zone.id}
            expanded={expandedZoneId === zone.id}
            onChange={(_, expanded) => {
              setExpandedZoneId(expanded ? zone.id : false);
              if (expanded) setSelectedId(zone.id);
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box className="flex items-center gap-2">
                <Typography className="font-medium">
                  Zone {zoneIndex + 1}
                </Typography>
                <Chip
                  size="small"
                  label={`${Math.round(zone.x)},${Math.round(zone.y)}`}
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box className="flex flex-col gap-3">
                {zone.answers.map((answer) => (
                  <Box key={answer.id} className="flex items-center gap-3 p-3 border border-solid border-gray-300 rounded">
                    <TextField
                      placeholder={t('editor.add_answer')}
                      value={answer.text}
                      onChange={(e) => handleAnswerChange(zone.id, answer.id, 'text', e.target.value)}
                      size="small"
                      className="flex-1"
                      sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.8125rem' } }}
                    />
                    <FormControl size="small" className="min-w-[82px]">
                      <InputLabel>{t('mark')} *</InputLabel>
                      <Select
                        value={answer.mark}
                        label={`${t('mark')} *`}
                        onChange={(e) => handleAnswerChange(zone.id, answer.id, 'mark', Number(e.target.value))}
                        sx={{ fontSize: '0.8125rem' }}
                      >
                        {MARK_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt} %
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={answer.ignoreCasing}
                          onChange={(e) => handleAnswerChange(zone.id, answer.id, 'ignoreCasing', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={t('editor.ignore_casing')}
                      sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                    />
                    {zone.answers.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveAnswer(zone.id, answer.id)}
                        className="p-1"
                      >
                        <DeleteOutlinedIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    )}
                  </Box>
                ))}
                <Box className="flex items-center gap-2">
                  <Button
                    variant="text"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddAnswer(zone.id)}
                    className="self-start normal-case font-medium text-sm"
                  >
                    {t('editor.add_answer')}
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    startIcon={<DeleteOutlinedIcon />}
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
                    className="normal-case text-sm"
                  >
                    Delete zone
                  </Button>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
}