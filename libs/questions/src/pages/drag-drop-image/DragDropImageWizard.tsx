import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, ImagePlus } from 'lucide-react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Transformer } from 'react-konva';
import type Konva from 'konva';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { useTranslation } from 'react-i18next';
import { cn, Input, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@item-bank/ui';
import JustificationInput from '../../components/JustificationInput';
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

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR_HEX: Record<string, string> = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

function resolveColor(colorKey: string): string {
  return COLOR_HEX[colorKey] ?? COLOR_HEX['primary'];
}

// ─── Props ────────────────────────────────────────────────────────────────────

type DragDropImageWizardProps = {
  onSave: (data: QuestionFormData) => void;
  onCancel: () => void;
  initialData?: QuestionFormData;
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

function DragDropImageWizard({ onSave, onCancel, initialData }: DragDropImageWizardProps) {
  const { t, i18n } = useTranslation('questions');
  const isDark = document.documentElement.classList.contains('dark');

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

  const getItemColor = useCallback(
    (item: WizardItem): string => {
      const group = groups.find((g) => g.id === item.groupId);
      return group ? resolveColor(group.color) : '#9ca3af';
    },
    [groups]
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
        ? 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; } p:first-child { margin-top: 0; } .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { top: 16px !important; left: 16px !important; right: 16px !important; }'
        : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; } p:first-child { margin-top: 0; } .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { top: 16px !important; left: 16px !important; right: 16px !important; }',
    }),
    [isDark, i18n.language, t]
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

  // ── Step labels ───────────────────────────────────────────────────────────

  const steps = [
    t('editor.drag_drop_image.step_1_label'),
    t('editor.drag_drop_image.step_2_label'),
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-6">
        {steps.map((stepLabel, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                    ? 'border-2 border-primary bg-primary/10 text-primary'
                    : 'border-2 border-border bg-muted text-muted-foreground'
                )}
              >
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  i === step ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {stepLabel}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 rounded-full',
                  i < step ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1 ───────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="flex flex-col gap-5">
          {step1Errors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <ul className="m-0 ps-4">
                {step1Errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Name + Mark row */}
          <div className="flex gap-4 flex-wrap">
            <Input
              placeholder={t('question_name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex-1 min-w-[200px]"
            />
            <Input
              type="number"
              placeholder={t('mark')}
              value={mark}
              onChange={(e) => setMark(Number(e.target.value))}
              min={0}
              step={0.5}
              style={{ width: 120 }}
            />
          </div>

          {/* Question text */}
          <div>
            <span className="block text-xs font-medium text-muted-foreground mb-1">
              {t('question_text')} <span className="text-destructive">*</span>
            </span>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
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
            </div>
          </div>

          {/* Justification */}
          <JustificationInput
            mode={justificationMode}
            fraction={justificationFraction}
            onModeChange={setJustificationMode}
            onFractionChange={setJustificationFraction}
          />

          {/* Background image upload */}
          <div>
            <span className="block text-xs font-medium text-muted-foreground mb-1">
              {t('editor.background_image')} *
            </span>
            {bgImageError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive mb-2">
                {bgImageError}
              </div>
            )}
            {bgImageDataUrl ? (
              <div className="inline-block">
                <img
                  src={bgImageDataUrl}
                  alt={t('editor.background_image')}
                  className="max-w-full block rounded-lg"
                  style={{ maxHeight: 240 }}
                />
                <button
                  type="button"
                  className="mt-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => setBgImageDataUrl(null)}
                >
                  {t('editor.remove_image')}
                </button>
              </div>
            ) : (
              <div
                className={cn(
                  'flex flex-col items-center justify-center p-8 gap-2 rounded-xl cursor-pointer border-2 border-dashed transition-colors',
                  bgDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60'
                )}
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
                <ImagePlus size={40} className="text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">{t('editor.drag_and_drop')}</p>
              </div>
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
          </div>

          {/* Nav */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t('common:next')}
              <ChevronRight size={15} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ───────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {saveErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <ul className="m-0 ps-4">
                {saveErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedItemId ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-2 text-sm text-blue-700 dark:text-blue-300">
              {t('editor.drag_drop_image.placement_mode_hint', {
                answer: items.find((i) => i.id === selectedItemId)?.answer || '…',
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-2 text-sm text-blue-700 dark:text-blue-300">
              {t('editor.drag_drop_image.select_item_hint')}
            </div>
          )}

          {/* Canvas */}
          {bgImg && (
            <div
              className={cn(
                'overflow-auto max-w-full rounded border border-border',
                selectedItemId ? 'cursor-crosshair' : 'cursor-default'
              )}
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
                        fill={zone.color + '4d'}
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
            </div>
          )}

          {/* Groups + auto-distribute row */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[220px]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {t('editor.drag_drop_image.groups_label')}
                </h4>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => setGroupDialogOpen(true)}
                  disabled={groups.length >= GROUP_COLORS.length}
                >
                  <Plus size={13} />
                  {t('editor.drag_drop_image.add_group')}
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center gap-2">
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: resolveColor(group.color) }}
                    />
                    <p className="text-sm text-muted-foreground flex-1">{group.name}</p>
                    <button
                      type="button"
                      aria-label={t('editor.drag_drop_image.delete_group')}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => deleteGroup(group.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoDistribute}
                  onClick={() => setAutoDistribute((v) => !v)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    autoDistribute ? 'bg-primary' : 'bg-input'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                      autoDistribute ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </button>
                <span className="text-sm text-muted-foreground">
                  {t('editor.drag_drop_image.auto_distribute')}
                </span>
              </label>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground">
                {t('editor.drag_drop_image.items_label')}
              </h4>
              <button
                type="button"
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors"
                onClick={() => setAddItemDialogOpen(true)}
              >
                <Plus size={13} />
                {t('editor.drag_drop_image.add_item')}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-xl border p-3 cursor-pointer transition-colors',
                    selectedItemId === item.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-primary/[0.03]'
                  )}
                  onClick={() =>
                    setSelectedItemId((prev) => (prev === item.id ? null : item.id))
                  }
                >
                  <div className="flex items-start gap-3 flex-wrap">
                    {/* Index circle */}
                    <div
                      className="flex items-center justify-center shrink-0 rounded-full text-white text-xs font-bold"
                      style={{ width: 24, height: 24, backgroundColor: getItemColor(item) }}
                    >
                      {idx + 1}
                    </div>

                    {/* Answer / image */}
                    <div className="flex-1 min-w-[160px]">
                      {item.itemType === 'text' ? (
                        <Input
                          placeholder={t('editor.drag_drop_image.answer_placeholder')}
                          value={item.answer}
                          onChange={(e) => updateItem(item.id, 'answer', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Input
                            placeholder={t('editor.drag_drop_image.answer_placeholder')}
                            value={item.answer}
                            onChange={(e) => updateItem(item.id, 'answer', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {item.image ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={item.image}
                                alt={item.answer}
                                style={{ height: 40, objectFit: 'contain', borderRadius: 4 }}
                              />
                              <button
                                type="button"
                                className="px-2 py-1 text-xs font-medium rounded-lg text-destructive border border-destructive/40 hover:bg-destructive/10 transition-colors"
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
                              </button>
                            </div>
                          ) : (
                            <label
                              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer w-fit"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ImagePlus size={13} />
                              {t('editor.drag_drop_image.upload_item_image')}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleItemImageFile(item.id, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                          {itemImageErrors[item.id] && (
                            <span className="text-xs text-destructive">
                              {itemImageErrors[item.id]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Group selector */}
                    <select
                      className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ minWidth: 120 }}
                      value={item.groupId}
                      onChange={(e) => updateItem(item.id, 'groupId', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">{t('editor.drag_drop_image.no_group')}</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>

                    {/* Mark % */}
                    <Input
                      type="number"
                      placeholder={t('editor.drag_drop_image.col_mark')}
                      value={item.markPercent}
                      onChange={(e) =>
                        updateItem(item.id, 'markPercent', Number(e.target.value))
                      }
                      onClick={(e) => e.stopPropagation()}
                      min={0}
                      max={100}
                      step={1}
                      disabled={autoDistribute}
                      style={{ width: 90 }}
                    />

                    {/* Unlimited reuse */}
                    <label
                      className="flex items-center gap-1.5 cursor-pointer select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border accent-primary"
                        checked={item.unlimitedReuse}
                        onChange={(e) =>
                          updateItem(item.id, 'unlimitedReuse', e.target.checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs text-muted-foreground">
                        {t('editor.drag_drop_image.col_unlimited')}
                      </span>
                    </label>

                    {/* Zones count badge */}
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: getItemColor(item) + '26',
                        color: getItemColor(item),
                      }}
                    >
                      {t(
                        item.zones.length === 1
                          ? 'editor.drag_drop_image.zones_count_one'
                          : 'editor.drag_drop_image.zones_count_other',
                        { count: item.zones.length }
                      )}
                    </span>

                    {/* Delete item */}
                    <button
                      type="button"
                      aria-label={t('editor.drag_drop_image.delete_item')}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Zones section */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {t('editor.drag_drop_image.col_zones')}
                      </span>
                      <button
                        type="button"
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={(e) => {
                          e.stopPropagation();
                          addZoneToItem(item.id);
                        }}
                        disabled={item.zones.length >= 1}
                      >
                        <Plus size={12} />
                        {t('editor.drag_drop_image.add_zone')}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {item.zones.map((zone, zoneIndex) => (
                        <div
                          key={zone.id}
                          className="flex items-center gap-2 flex-wrap rounded-lg p-2 bg-muted/40"
                        >
                          <span className="text-xs text-muted-foreground min-w-[54px]">
                            {t('editor.drag_drop_image.zone_label', { index: zoneIndex + 1 })}
                          </span>
                          <Input
                            type="number"
                            placeholder={t('editor.drag_drop_image.left_label')}
                            value={zone.left}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateZonePosition(item.id, zone.id, 'left', Number(e.target.value) || 0)
                            }
                            step={1}
                            style={{ width: 110 }}
                          />
                          <Input
                            type="number"
                            placeholder={t('editor.drag_drop_image.top_label')}
                            value={zone.top}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              updateZonePosition(item.id, zone.id, 'top', Number(e.target.value) || 0)
                            }
                            step={1}
                            style={{ width: 110 }}
                          />
                          <button
                            type="button"
                            aria-label={t('editor.drag_drop_image.delete_zone')}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteZone(item.id, zone.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('editor.drag_drop_image.add_item')}
                </p>
              )}
            </div>
          </div>

          {/* Nav */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <ChevronLeft size={15} className="rtl:rotate-180" />
              {t('common:back')}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('common:save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Group Dialog ─────────────────────────────────────────── */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t('editor.drag_drop_image.add_group_dialog_title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Input
              autoFocus
              placeholder={t('editor.drag_drop_image.group_name_label')}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                {t('editor.drag_drop_image.group_color_label')}
              </span>
              <div className="flex gap-2 flex-wrap mt-1">
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    className="rounded-full transition-[box-shadow]"
                    style={{
                      width: 28,
                      height: 28,
                      backgroundColor: resolveColor(c),
                      boxShadow:
                        newGroupColor === c
                          ? '0 0 0 3px hsl(var(--foreground))'
                          : '0 0 0 3px transparent',
                    }}
                    onClick={() => setNewGroupColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setGroupDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
            >
              {t('cancel')}
            </button>
            <Button
              onClick={handleAddGroup}
              disabled={!newGroupName.trim()}
            >
              {t('editor.drag_drop_image.add_group_confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Item Dialog ──────────────────────────────────────────── */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t('editor.drag_drop_image.add_item')}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => addItem('text')}>
              {t('editor.drag_drop_image.add_item_text')}
            </Button>
            <Button variant="outline" onClick={() => addItem('image')}>
              {t('editor.drag_drop_image.add_item_image')}
            </Button>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAddItemDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors"
            >
              {t('cancel')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(DragDropImageWizard);
