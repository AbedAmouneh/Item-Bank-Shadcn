import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Typography,
  alpha,
  styled,
  useTheme,
} from '@mui/material';
import JustificationInput from '../../components/JustificationInput';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CircleIcon from '@mui/icons-material/Circle';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Transformer } from 'react-konva';
import type Konva from 'konva';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { useTranslation } from 'react-i18next';
import type { QuestionFormData } from '../../components/QuestionEditorShell';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BG_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_CANVAS_WIDTH = 800;
const ZONE_W = 80;
const ZONE_H = 36;
const MIN_ZONE_W = 24;
const MIN_ZONE_H = 24;
const GROUP_COLORS = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const;
type GroupColor = (typeof GROUP_COLORS)[number];

// ─── Local types ──────────────────────────────────────────────────────────────

type Zone = { id: string; left: number; top: number; width: number; height: number };

type WizardItem = {
  id: string;
  itemType: 'text' | 'image';
  answer: string;
  image?: string;
  groupId: string;
  markPercent: number;
  unlimitedReuse: boolean;
  zones: Zone[];
};

type WizardGroup = {
  id: string;
  name: string;
  color: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function distributeMarks(items: WizardItem[]): WizardItem[] {
  if (items.length === 0) return items;
  const even = parseFloat((100 / items.length).toFixed(4));
  return items.map((item, i) => ({
    ...item,
    markPercent:
      i < items.length - 1
        ? even
        : parseFloat((100 - even * (items.length - 1)).toFixed(4)),
  }));
}

// ─── Styled components ────────────────────────────────────────────────────────

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'dragOver',
})<{ dragOver?: boolean }>(({ theme, dragOver }) => ({
  border: `2px dashed ${dragOver ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: dragOver ? theme.palette.action.hover : theme.palette.action.selected,
  cursor: 'pointer',
  borderRadius: theme.spacing(1.5),
  transition: theme.transitions.create(['border-color', 'background-color'], {
    duration: theme.transitions.duration.short,
  }),
}));

const ItemCard = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ theme, selected }) => ({
  border: `1.5px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  backgroundColor: selected
    ? alpha(theme.palette.primary.main, 0.06)
    : theme.palette.background.paper,
  cursor: 'pointer',
  transition: theme.transitions.create(['border-color', 'background-color'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}));

// ─── Props ────────────────────────────────────────────────────────────────────

type DragDropImageWizardProps = {
  onSave: (data: QuestionFormData) => void;
  onCancel: () => void;
  initialData?: QuestionFormData;
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

function DragDropImageWizard({ onSave, onCancel, initialData }: DragDropImageWizardProps) {
  const { t, i18n } = useTranslation('questions');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // ── Step 1 state ─────────────────────────────────────────────────────────

  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialData?.name ?? '');
  const [mark, setMark] = useState<number>(initialData?.mark ?? 1);
  const [text, setText] = useState(initialData?.text ?? '');
  const [justificationMode, setJustificationMode] = useState<'disabled' | 'optional' | 'required'>(
    initialData?.justificationMode ?? 'disabled'
  );
  const [justificationFraction, setJustificationFraction] = useState<number>(
    initialData?.justificationFraction ?? 20
  );
  const [bgImageDataUrl, setBgImageDataUrl] = useState<string | null>(
    initialData?.background_image ?? null
  );
  const [step1Errors, setStep1Errors] = useState<string[]>([]);

  // ── Step 2 state ─────────────────────────────────────────────────────────

  const [items, setItems] = useState<WizardItem[]>(() =>
    ((initialData?.dragDropImageItems ?? []) as WizardItem[]).map((item) => ({
      ...item,
      zones: (item.zones ?? []).slice(0, 1).map((zone) => ({
        ...zone,
        width: zone.width ?? ZONE_W,
        height: zone.height ?? ZONE_H,
      })),
    }))
  );
  const [groups, setGroups] = useState<WizardGroup[]>(
    (initialData?.dragDropImageGroups ?? []) as WizardGroup[]
  );
  const [autoDistribute, setAutoDistribute] = useState<boolean>(
    initialData?.autoDistributeMarks ?? true
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<GroupColor>('primary');
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);

  // Canvas / background image element
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(MAX_CANVAS_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(400);
  const stageRef = useRef<Konva.Stage>(null);
  const zoneNodeRefs = useRef<Record<string, Konva.Rect | null>>({});
  const zoneTransformerRef = useRef<Konva.Transformer | null>(null);
  const [selectedCanvasZone, setSelectedCanvasZone] = useState<{ itemId: string; zoneId: string } | null>(null);

  const bgFileRef = useRef<HTMLInputElement>(null);
  const [bgDragOver, setBgDragOver] = useState(false);
  const [bgImageError, setBgImageError] = useState('');
  const [itemImageErrors, setItemImageErrors] = useState<Record<string, string>>({});

  // ── TinyMCE ref ──────────────────────────────────────────────────────────

  const editorRef = useRef<TinyMCEEditor | null>(null);

  // ── Load background image ─────────────────────────────────────────────────

  useEffect(() => {
    if (!bgImageDataUrl) {
      setBgImg(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const scale = img.naturalWidth > MAX_CANVAS_WIDTH ? MAX_CANVAS_WIDTH / img.naturalWidth : 1;
      setCanvasWidth(Math.round(img.naturalWidth * scale));
      setCanvasHeight(Math.round(img.naturalHeight * scale));
      setBgImg(img);
    };
    img.src = bgImageDataUrl;
  }, [bgImageDataUrl]);

  // ── Auto-distribute marks ────────────────────────────────────────────────

  const itemsCount = items.length;
  useEffect(() => {
    if (!autoDistribute || itemsCount === 0) return;
    setItems((prev) => distributeMarks(prev));
  }, [autoDistribute, itemsCount]);

  // ── Group color helpers ──────────────────────────────────────────────────

  const resolveColor = useCallback(
    (colorKey: string): string => {
      type PaletteKey = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
      const key = colorKey as PaletteKey;
      if (theme.palette[key]) return theme.palette[key].main;
      return theme.palette.primary.main;
    },
    [theme]
  );

  const getItemColor = useCallback(
    (item: WizardItem): string => {
      const group = groups.find((g) => g.id === item.groupId);
      return group ? resolveColor(group.color) : theme.palette.grey[400];
    },
    [groups, resolveColor, theme]
  );

  const normalizeZone = useCallback(
    (zone: Zone): Zone => {
      const width = Math.max(MIN_ZONE_W, Math.round(zone.width || ZONE_W));
      const height = Math.max(MIN_ZONE_H, Math.round(zone.height || ZONE_H));
      const left = Math.min(Math.max(0, Math.round(zone.left)), Math.max(0, canvasWidth - width));
      const top = Math.min(Math.max(0, Math.round(zone.top)), Math.max(0, canvasHeight - height));
      return { ...zone, left, top, width, height };
    },
    [canvasWidth, canvasHeight]
  );

  // ── Background image upload ──────────────────────────────────────────────

  const handleBgFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setBgImageError(t('editor.drag_drop_image.error_invalid_file_type'));
        return;
      }
      if (file.size > MAX_BG_SIZE_BYTES) {
        setBgImageError(t('editor.drag_drop_image.error_image_too_large'));
        return;
      }
      setBgImageError('');
      const url = await fileToDataUrl(file);
      setBgImageDataUrl(url);
    },
    [t]
  );

  // ── Step 1 next ──────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push(t('question_name'));
    const textContent = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!textContent) {
      errs.push(
        t('editor.drag_drop_image.error_question_text_required', {
          defaultValue: 'Question text is required.',
        })
      );
    }
    if (!mark || mark <= 0) errs.push(t('editor.drag_drop_image.error_mark_positive'));
    if (!bgImageDataUrl) errs.push(t('editor.drag_drop_image.error_no_background_image'));
    if (justificationMode !== 'disabled') {
      const clamped = Math.max(0, Math.min(100, justificationFraction));
      if (clamped !== justificationFraction) setJustificationFraction(clamped);
    }
    setStep1Errors(errs);
    if (errs.length === 0) setStep(1);
  }, [name, text, mark, bgImageDataUrl, justificationMode, justificationFraction, t]);

  // ── Item management ──────────────────────────────────────────────────────

  const addItem = useCallback(
    (itemType: 'text' | 'image') => {
      const newItem: WizardItem = {
        id: crypto.randomUUID(),
        itemType,
        answer: '',
        image: undefined,
        groupId: '',
        markPercent: 0,
        unlimitedReuse: false,
        zones: [],
      };
      setItems((prev) => {
        const next = [...prev, newItem];
        return autoDistribute ? distributeMarks(next) : next;
      });
      setSelectedItemId(newItem.id);
      setAddItemDialogOpen(false);
    },
    [autoDistribute]
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        return autoDistribute && next.length > 0 ? distributeMarks(next) : next;
      });
      setSelectedItemId((prev) => (prev === id ? null : prev));
      setSelectedCanvasZone((prev) => (prev && prev.itemId === id ? null : prev));
    },
    [autoDistribute]
  );

  const updateItem = useCallback(
    <K extends keyof WizardItem>(id: string, field: K, value: WizardItem[K]) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  // ── Zone management ──────────────────────────────────────────────────────

  const handleCanvasClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const target = e.target as Konva.Node;
      const isBackgroundClick =
        target === stage || target.getAttr('name') === 'bg-image';
      if (!isBackgroundClick) return;
      if (!selectedItemId) {
        setSelectedCanvasZone(null);
        return;
      }
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const newZone = normalizeZone({
        id: crypto.randomUUID(),
        left: Math.round(pos.x - ZONE_W / 2),
        top: Math.round(pos.y - ZONE_H / 2),
        width: ZONE_W,
        height: ZONE_H,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId
            ? { ...item, zones: [newZone] }
            : item
        )
      );
      setSelectedCanvasZone({ itemId: selectedItemId, zoneId: newZone.id });
      e.cancelBubble = true;
    },
    [selectedItemId, normalizeZone]
  );

  const deleteZone = useCallback((itemId: string, zoneId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, zones: item.zones.filter((z) => z.id !== zoneId) }
          : item
      )
    );
    setSelectedCanvasZone((prev) =>
      prev && prev.itemId === itemId && prev.zoneId === zoneId ? null : prev
    );
  }, []);

  const addZoneToItem = useCallback((itemId: string) => {
    const newZone = normalizeZone({
      id: crypto.randomUUID(),
      left: 0,
      top: 0,
      width: ZONE_W,
      height: ZONE_H,
    });
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, zones: [newZone] } : item
      )
    );
    setSelectedCanvasZone({ itemId, zoneId: newZone.id });
  }, [normalizeZone]);

  const patchZone = useCallback(
    (itemId: string, zoneId: string, patch: Partial<Zone>) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            zones: item.zones.map((zone) =>
              zone.id === zoneId
                ? normalizeZone({ ...zone, ...patch })
                : zone
            ),
          };
        })
      );
    },
    [normalizeZone]
  );

  const updateZonePosition = useCallback(
    (
      itemId: string,
      zoneId: string,
      field: 'left' | 'top' | 'width' | 'height',
      value: number
    ) => {
      patchZone(itemId, zoneId, { [field]: value } as Partial<Zone>);
    },
    [patchZone]
  );

  // ── Group management ─────────────────────────────────────────────────────

  const handleAddGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    const group: WizardGroup = {
      id: crypto.randomUUID(),
      name: newGroupName.trim(),
      color: newGroupColor,
    };
    setGroups((prev) => [...prev, group]);
    setNewGroupName('');
    setNewGroupColor('primary');
    setGroupDialogOpen(false);
  }, [newGroupName, newGroupColor]);

  const deleteGroup = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setItems((prev) =>
      prev.map((item) => (item.groupId === groupId ? { ...item, groupId: '' } : item))
    );
  }, []);

  // ── Item image upload ────────────────────────────────────────────────────

  const handleItemImageFile = useCallback(
    async (itemId: string, file: File) => {
      if (!file.type.startsWith('image/')) return;
      const url = await fileToDataUrl(file);
      const img = new window.Image();
      img.onload = () => {
        if (
          img.naturalWidth < 24 || img.naturalHeight < 24 ||
          img.naturalWidth > 512 || img.naturalHeight > 512
        ) {
          setItemImageErrors((prev) => ({
            ...prev,
            [itemId]: t('editor.drag_drop_image.error_image_dimensions'),
          }));
        } else {
          setItemImageErrors((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
          updateItem(itemId, 'image', url);
        }
      };
      img.src = url;
    },
    [updateItem, t]
  );

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const errs: string[] = [];
    if (!bgImageDataUrl) errs.push(t('editor.drag_drop_image.error_no_background_image'));
    if (items.length === 0) errs.push(t('editor.drag_drop_image.error_no_items'));
    if (items.some((item) => !item.answer.trim()))
      errs.push(t('editor.drag_drop_image.error_empty_answers'));
    if (items.some((item) => item.itemType === 'image' && !item.image))
      errs.push(t('editor.drag_drop_image.error_missing_image'));
    if (items.some((item) => item.zones.length !== 1))
      errs.push(t('editor.drag_drop_image.error_no_zones'));

    const finalItems = autoDistribute ? distributeMarks(items) : items;
    const normalizedItems = finalItems.map((item) => ({
      ...item,
      zones: item.zones.slice(0, 1),
    }));
    const total = Math.round(finalItems.reduce((s, i) => s + i.markPercent, 0) * 100) / 100;
    if (total !== 100) errs.push(t('editor.drag_drop_image.error_total_not_100', { total }));

    setSaveErrors(errs);
    if (errs.length > 0) return;

    onSave({
      id: initialData?.id,
      type: 'drag_drop_image',
      name: name.trim(),
      mark,
      text,
      background_image: bgImageDataUrl,
      justificationMode,
      justificationFraction,
      autoDistributeMarks: autoDistribute,
      dragDropImageItems: normalizedItems,
      dragDropImageGroups: groups,
      correctAnswerFeedback: initialData?.correctAnswerFeedback ?? '',
      partiallyCorrectAnswerFeedback: initialData?.partiallyCorrectAnswerFeedback ?? '',
      incorrectAnswerFeedback: initialData?.incorrectAnswerFeedback ?? '',
    });
  }, [
    bgImageDataUrl, items, autoDistribute, name, mark, text,
    justificationMode, justificationFraction, groups,
    initialData, onSave, t,
  ]);

  // ── TinyMCE init ─────────────────────────────────────────────────────────

  const editorInit = useMemo(
    () => ({
      height: 300,
      menubar: false,
      skin: isDark ? 'oxide-dark' : 'oxide',
      content_css: isDark ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      plugins: ['lists', 'link'],
      toolbar: 'bold italic underline | bullist numlist | outdent indent | undo redo | link',
      toolbar_mode: 'floating' as const,
      statusbar: false,
      placeholder: t('question_text_placeholder'),
      content_style: isDark
        ? `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; background-color: ${theme.palette.background.default}; color: ${alpha(theme.palette.text.primary, 0.9)}; } p:first-child { margin-top: 0; } .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { top: 16px !important; left: 16px !important; right: 16px !important; }`
        : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; } p:first-child { margin-top: 0; } .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { top: 16px !important; left: 16px !important; right: 16px !important; }',
    }),
    [isDark, i18n.language, t, theme]
  );

  // ── Rendered zones for Konva ─────────────────────────────────────────────

  const renderedZones = useMemo(
    () =>
      items.flatMap((item, itemIndex) =>
        item.zones.map((zone) => ({
          zoneId: zone.id,
          itemId: item.id,
          left: zone.left,
          top: zone.top,
          width: zone.width || ZONE_W,
          height: zone.height || ZONE_H,
          color: getItemColor(item),
          label: String(itemIndex + 1),
        }))
      ),
    [items, getItemColor]
  );

  useEffect(() => {
    const transformer = zoneTransformerRef.current;
    if (!transformer) return;
    if (!selectedCanvasZone) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    const node = zoneNodeRefs.current[selectedCanvasZone.zoneId];
    if (!node) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }
    transformer.nodes([node]);
    transformer.getLayer()?.batchDraw();
  }, [selectedCanvasZone, renderedZones]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box className="flex flex-col gap-6 p-6">
      {/* Stepper */}
      <Stepper activeStep={step} alternativeLabel>
        <Step>
          <StepLabel>{t('editor.drag_drop_image.step_1_label')}</StepLabel>
        </Step>
        <Step>
          <StepLabel>{t('editor.drag_drop_image.step_2_label')}</StepLabel>
        </Step>
      </Stepper>

      {/* ── STEP 1 ───────────────────────────────────────────────────── */}
      {step === 0 && (
        <Box className="flex flex-col gap-5">
          {step1Errors.length > 0 && (
            <Alert severity="error">
              <ul className="m-0 ps-4">
                {step1Errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Name + Mark row */}
          <Box className="flex gap-4 flex-wrap">
            <TextField
              label={t('question_name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              size="small"
              className="flex-1 min-w-[200px]"
            />
            <TextField
              label={t('mark')}
              type="number"
              value={mark}
              onChange={(e) => setMark(Number(e.target.value))}
              size="small"
              inputProps={{ min: 0, step: 0.5 }}
              style={{ width: 120 }}
            />
          </Box>

          {/* Question text */}
          <Box>
            <Typography
              variant="caption"
              className="block mb-1"
              sx={{ color: 'text.secondary' }}
            >
              {t('question_text')} <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <Box
              className="overflow-hidden"
              sx={{
                borderRadius: 3,
                border: isDark
                  ? `1.5px solid ${alpha(theme.palette.primary.main, 0.6)}`
                  : `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Editor
                tinymceScriptSrc="/tinymce/tinymce.min.js"
                licenseKey="gpl"
                onInit={(_evt, editor) => {
                  editorRef.current = editor;
                }}
                initialValue={initialData?.text ?? ''}
                onEditorChange={(val) => setText(val)}
                init={editorInit}
              />
            </Box>
          </Box>

          {/* Justification */}
          <JustificationInput
            mode={justificationMode}
            fraction={justificationFraction}
            onModeChange={setJustificationMode}
            onFractionChange={setJustificationFraction}
          />

          {/* Background image upload */}
          <Box>
            <Typography
              variant="caption"
              className="block mb-1"
              sx={{ color: 'text.secondary' }}
            >
              {t('editor.background_image')} *
            </Typography>
            {bgImageError && (
              <Alert severity="error" className="mb-2">
                {bgImageError}
              </Alert>
            )}
            {bgImageDataUrl ? (
              <Box className="inline-block">
                <img
                  src={bgImageDataUrl}
                  alt={t('editor.background_image')}
                  className="max-w-full block rounded-lg"
                  style={{ maxHeight: 240 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  className="mt-2"
                  onClick={() => setBgImageDataUrl(null)}
                >
                  {t('editor.remove_image')}
                </Button>
              </Box>
            ) : (
              <DropZone
                dragOver={bgDragOver}
                className="flex flex-col items-center justify-center p-8 gap-2"
                onClick={() => bgFileRef.current?.click()}
                onDragOver={(e: React.DragEvent) => {
                  e.preventDefault();
                  setBgDragOver(true);
                }}
                onDragLeave={() => setBgDragOver(false)}
                onDrop={(e: React.DragEvent) => {
                  e.preventDefault();
                  setBgDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleBgFile(file);
                }}
              >
                <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('editor.drag_and_drop')}
                </Typography>
              </DropZone>
            )}
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleBgFile(file);
                e.target.value = '';
              }}
            />
          </Box>

          {/* Nav */}
          <Box className="flex justify-end gap-3 pt-2">
            <Button variant="outlined" color="inherit" onClick={onCancel}>
              {t('cancel')}
            </Button>
            <Button variant="contained" onClick={handleNext}>
              {t('editor.drag_drop_image.step_2_label')} →
            </Button>
          </Box>
        </Box>
      )}

      {/* ── STEP 2 ───────────────────────────────────────────────────── */}
      {step === 1 && (
        <Box className="flex flex-col gap-4">
          {saveErrors.length > 0 && (
            <Alert severity="error">
              <ul className="m-0 ps-4">
                {saveErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Alert>
          )}

          {selectedItemId ? (
            <Alert severity="info" className="py-1">
              {t('editor.drag_drop_image.placement_mode_hint', {
                answer: items.find((i) => i.id === selectedItemId)?.answer || '…',
              })}
            </Alert>
          ) : (
            <Alert severity="info" className="py-1">
              {t('editor.drag_drop_image.select_item_hint')}
            </Alert>
          )}

          {/* Canvas */}
          {bgImg && (
            <Box
              className="overflow-auto max-w-full rounded"
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                cursor: selectedItemId ? 'crosshair' : 'default',
              }}
            >
              <Stage
                ref={stageRef}
                width={canvasWidth}
                height={canvasHeight}
                onClick={handleCanvasClick}
              >
                <Layer>
                  <KonvaImage image={bgImg} width={canvasWidth} height={canvasHeight} name="bg-image" />
                  {renderedZones.map((zone) => (
                    <Group key={zone.zoneId}>
                      <Rect
                        ref={(node) => {
                          zoneNodeRefs.current[zone.zoneId] = node;
                        }}
                        x={zone.left}
                        y={zone.top}
                        width={zone.width}
                        height={zone.height}
                        fill={alpha(zone.color, 0.3)}
                        stroke={zone.color}
                        strokeWidth={2}
                        cornerRadius={4}
                        draggable
                        onClick={(e) => {
                          e.cancelBubble = true;
                          setSelectedItemId(zone.itemId);
                          setSelectedCanvasZone({ itemId: zone.itemId, zoneId: zone.zoneId });
                        }}
                        onTap={(e) => {
                          e.cancelBubble = true;
                          setSelectedItemId(zone.itemId);
                          setSelectedCanvasZone({ itemId: zone.itemId, zoneId: zone.zoneId });
                        }}
                        onDragStart={(e) => {
                          e.cancelBubble = true;
                          setSelectedItemId(zone.itemId);
                          setSelectedCanvasZone({ itemId: zone.itemId, zoneId: zone.zoneId });
                        }}
                        onDragEnd={(e) => {
                          e.cancelBubble = true;
                          patchZone(zone.itemId, zone.zoneId, {
                            left: e.target.x(),
                            top: e.target.y(),
                          });
                        }}
                        onTransformStart={(e) => {
                          e.cancelBubble = true;
                          setSelectedItemId(zone.itemId);
                          setSelectedCanvasZone({ itemId: zone.itemId, zoneId: zone.zoneId });
                        }}
                        onTransformEnd={(e) => {
                          e.cancelBubble = true;
                          const node = e.target as Konva.Rect;
                          const nextWidth = Math.max(MIN_ZONE_W, node.width() * node.scaleX());
                          const nextHeight = Math.max(MIN_ZONE_H, node.height() * node.scaleY());
                          patchZone(zone.itemId, zone.zoneId, {
                            left: node.x(),
                            top: node.y(),
                            width: nextWidth,
                            height: nextHeight,
                          });
                          node.scaleX(1);
                          node.scaleY(1);
                        }}
                      />
                      <Text
                        x={zone.left + 4}
                        y={zone.top + zone.height / 2 - 7}
                        text={zone.label}
                        fontSize={12}
                        fontStyle="bold"
                        fill={zone.color}
                        listening={false}
                      />
                    </Group>
                  ))}
                  <Transformer
                    ref={zoneTransformerRef}
                    rotateEnabled={false}
                    enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (newBox.width < MIN_ZONE_W || newBox.height < MIN_ZONE_H) return oldBox;
                      return newBox;
                    }}
                  />
                </Layer>
              </Stage>
            </Box>
          )}

          {/* Groups + auto-distribute row */}
          <Box className="flex flex-wrap gap-4">
            <Box className="flex-1 min-w-[220px]">
              <Box className="flex items-center justify-between mb-2">
                <Typography variant="subtitle2">
                  {t('editor.drag_drop_image.groups_label')}
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setGroupDialogOpen(true)}
                  disabled={groups.length >= GROUP_COLORS.length}
                >
                  {t('editor.drag_drop_image.add_group')}
                </Button>
              </Box>
              <Box className="flex flex-col gap-1">
                {groups.map((group) => (
                  <Box key={group.id} className="flex items-center gap-2">
                    <CircleIcon sx={{ color: resolveColor(group.color), fontSize: 14 }} />
                    <Typography variant="body2" className="flex-1">
                      {group.name}
                    </Typography>
                    <IconButton size="small" onClick={() => deleteGroup(group.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box className="flex items-start pt-1">
              <FormControlLabel
                control={
                  <Switch
                    checked={autoDistribute}
                    onChange={(e) => setAutoDistribute(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {t('editor.drag_drop_image.auto_distribute')}
                  </Typography>
                }
              />
            </Box>
          </Box>

          {/* Items */}
          <Box>
            <Box className="flex items-center justify-between mb-2">
              <Typography variant="subtitle2">
                {t('editor.drag_drop_image.items_label')}
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setAddItemDialogOpen(true)}
              >
                {t('editor.drag_drop_image.add_item')}
              </Button>
            </Box>

            <Box className="flex flex-col gap-2">
              {items.map((item, idx) => (
                <ItemCard
                  key={item.id}
                  selected={selectedItemId === item.id}
                  onClick={() =>
                    setSelectedItemId((prev) => (prev === item.id ? null : item.id))
                  }
                >
                  <Box className="flex items-start gap-3 flex-wrap">
                    {/* Index circle */}
                    <Box
                      className="flex items-center justify-center shrink-0 rounded-full"
                      style={{ width: 24, height: 24, backgroundColor: getItemColor(item) }}
                    >
                      <Typography variant="caption" className="text-white font-bold">
                        {idx + 1}
                      </Typography>
                    </Box>

                    {/* Answer / image */}
                    <Box className="flex-1 min-w-[160px]">
                      {item.itemType === 'text' ? (
                        <TextField
                          size="small"
                          placeholder={t('editor.drag_drop_image.answer_placeholder')}
                          value={item.answer}
                          onChange={(e) => updateItem(item.id, 'answer', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          fullWidth
                        />
                      ) : (
                        <Box className="flex flex-col gap-2">
                          <TextField
                            size="small"
                            placeholder={t('editor.drag_drop_image.answer_placeholder')}
                            value={item.answer}
                            onChange={(e) => updateItem(item.id, 'answer', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            fullWidth
                          />
                          {item.image ? (
                            <Box className="flex items-center gap-2">
                              <img
                                src={item.image}
                                alt={item.answer}
                                style={{ height: 40, objectFit: 'contain', borderRadius: 4 }}
                              />
                              <Button
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateItem(item.id, 'image', undefined);
                                  setItemImageErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[item.id];
                                    return next;
                                  });
                                }}
                              >
                                {t('editor.remove_image')}
                              </Button>
                            </Box>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddPhotoAlternateOutlinedIcon />}
                              component="label"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t('editor.drag_drop_image.upload_item_image')}
                              <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleItemImageFile(item.id, file);
                                  e.target.value = '';
                                }}
                              />
                            </Button>
                          )}
                          {itemImageErrors[item.id] && (
                            <Typography variant="caption" color="error">
                              {itemImageErrors[item.id]}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* Group */}
                    <FormControl size="small" style={{ minWidth: 120 }}>
                      <InputLabel shrink>{t('editor.drag_drop_image.col_group')}</InputLabel>
                      <Select
                        label={t('editor.drag_drop_image.col_group')}
                        value={item.groupId}
                        onChange={(e) => updateItem(item.id, 'groupId', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        displayEmpty
                        renderValue={(value) => {
                          if (!value) {
                            return (
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                {t('editor.drag_drop_image.no_group')}
                              </Typography>
                            );
                          }
                          const selectedGroup = groups.find((g) => g.id === value);
                          if (!selectedGroup) {
                            return (
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                {t('editor.drag_drop_image.no_group')}
                              </Typography>
                            );
                          }
                          return (
                            <Box className="flex items-center gap-1">
                              <CircleIcon sx={{ fontSize: 10, color: resolveColor(selectedGroup.color) }} />
                              <Typography variant="body2">{selectedGroup.name}</Typography>
                            </Box>
                          );
                        }}
                      >
                        <MenuItem value="">
                          {t('editor.drag_drop_image.no_group')}
                        </MenuItem>
                        {groups.map((g) => (
                          <MenuItem key={g.id} value={g.id}>
                            <Box className="flex items-center gap-1">
                              <CircleIcon
                                sx={{ fontSize: 10, color: resolveColor(g.color) }}
                              />
                              {g.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Mark % */}
                    <TextField
                      size="small"
                      label={t('editor.drag_drop_image.col_mark')}
                      type="number"
                      value={item.markPercent}
                      onChange={(e) =>
                        updateItem(item.id, 'markPercent', Number(e.target.value))
                      }
                      onClick={(e) => e.stopPropagation()}
                      inputProps={{ min: 0, max: 100, step: 1 }}
                      disabled={autoDistribute}
                      style={{ width: 90 }}
                    />

                    {/* Unlimited */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={item.unlimitedReuse}
                          onChange={(e) =>
                            updateItem(item.id, 'unlimitedReuse', e.target.checked)
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                      label={
                        <Typography variant="caption">
                          {t('editor.drag_drop_image.col_unlimited')}
                        </Typography>
                      }
                    />

                    {/* Zones count */}
                    <Chip
                      size="small"
                      label={t(
                        item.zones.length === 1
                          ? 'editor.drag_drop_image.zones_count_one'
                          : 'editor.drag_drop_image.zones_count_other',
                        { count: item.zones.length }
                      )}
                      sx={{
                        backgroundColor: alpha(getItemColor(item), 0.15),
                        color: getItemColor(item),
                      }}
                    />

                    {/* Delete */}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box className="mt-3 pt-3 border-t border-solid" sx={{ borderColor: 'divider' }}>
                    <Box className="flex items-center justify-between gap-2 mb-2">
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {t('editor.drag_drop_image.col_zones')}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          addZoneToItem(item.id);
                        }}
                        disabled={item.zones.length >= 1}
                      >
                        {t('editor.drag_drop_image.add_zone')}
                      </Button>
                    </Box>

                    <Box className="flex flex-col gap-2">
                      {item.zones.map((zone, zoneIndex) => (
                        <Box
                          key={zone.id}
                          className="flex items-center gap-2 flex-wrap rounded-md p-2"
                          sx={{ backgroundColor: alpha(theme.palette.action.hover, 0.35) }}
                        >
                          <Typography variant="caption" className="min-w-[54px]" sx={{ color: 'text.secondary' }}>
                            {t('editor.drag_drop_image.zone_label', { index: zoneIndex + 1 })}
                          </Typography>
                          <TextField
                            size="small"
                            label={t('editor.drag_drop_image.left_label')}
                            type="number"
                            value={zone.left}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateZonePosition(item.id, zone.id, 'left', Number(e.target.value) || 0)
                            }
                            inputProps={{ step: 1 }}
                            style={{ width: 110 }}
                          />
                          <TextField
                            size="small"
                            label={t('editor.drag_drop_image.top_label')}
                            type="number"
                            value={zone.top}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateZonePosition(item.id, zone.id, 'top', Number(e.target.value) || 0)
                            }
                            inputProps={{ step: 1 }}
                            style={{ width: 110 }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteZone(item.id, zone.id);
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </ItemCard>
              ))}
              {items.length === 0 && (
                <Typography
                  variant="body2"
                  className="py-4 text-center"
                  sx={{ color: 'text.secondary' }}
                >
                  {t('editor.drag_drop_image.add_item')}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Nav */}
          <Box className="flex justify-between pt-2">
            <Button variant="outlined" color="inherit" onClick={() => setStep(0)}>
              ← {t('editor.drag_drop_image.step_1_label')}
            </Button>
            <Box className="flex gap-3">
              <Button variant="outlined" color="inherit" onClick={onCancel}>
                {t('cancel')}
              </Button>
              <Button variant="contained" onClick={handleSave}>
                {t('editor.drag_drop_image.step_2_label')} ✓
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Add Group Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('editor.drag_drop_image.add_group_dialog_title')}</DialogTitle>
        <DialogContent>
          <Box className="flex flex-col gap-3 pt-2">
            <TextField
              autoFocus
              label={t('editor.drag_drop_image.group_name_label')}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              size="small"
              fullWidth
            />
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('editor.drag_drop_image.group_color_label')}
              </Typography>
              <Box className="flex gap-2 flex-wrap mt-1">
                {GROUP_COLORS.map((c) => (
                  <Box
                    key={c}
                    onClick={() => setNewGroupColor(c)}
                    className="rounded-full cursor-pointer"
                    style={{ width: 28, height: 28, backgroundColor: resolveColor(c) }}
                    sx={{
                      border:
                        newGroupColor === c
                          ? `3px solid ${theme.palette.text.primary}`
                          : '3px solid transparent',
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialogOpen(false)} color="inherit">
            {t('cancel')}
          </Button>
          <Button
            onClick={handleAddGroup}
            variant="contained"
            disabled={!newGroupName.trim()}
          >
            {t('editor.drag_drop_image.add_group_confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Item Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={addItemDialogOpen}
        onClose={() => setAddItemDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('editor.drag_drop_image.add_item')}</DialogTitle>
        <DialogContent>
          <Box className="flex gap-3 justify-center pt-2">
            <Button variant="outlined" onClick={() => addItem('text')}>
              {t('editor.drag_drop_image.add_item_text')}
            </Button>
            <Button variant="outlined" onClick={() => addItem('image')}>
              {t('editor.drag_drop_image.add_item_image')}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)} color="inherit">
            {t('cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default memo(DragDropImageWizard);
