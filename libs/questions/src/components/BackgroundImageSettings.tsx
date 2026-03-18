import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { Input } from '@item-bank/ui';
import { ImagePlus, Trash2 } from 'lucide-react';
import { cn } from '@item-bank/ui';

const IMAGE_PREVIEW_WIDTH = 480;
const IMAGE_PREVIEW_HEIGHT = 360;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function BackgroundImageSettings() {
  const { t } = useTranslation('questions');
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const enableBackgroundImage = watch('enableBackgroundImage') ?? true;
  const canvasWidth = watch('canvasWidth');
  const canvasHeight = watch('canvasHeight');
  const background_image = watch('background_image');

  const [dragOver, setDragOver] = useState(false);
  const [touched, setTouched] = useState({ width: false, height: false });

  const handleToggleBackgroundImage = useCallback(
    (enabled: boolean) => {
      setValue('enableBackgroundImage', enabled);
      if (!enabled) {
        setValue('background_image', null);
      }
    },
    [setValue]
  );

  const setBackgroundImageFromFile = useCallback(
    async (file: File | null) => {
      if (!file?.type.startsWith('image/')) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        setValue('background_image', dataUrl);
      } catch (err) {
        console.error('Failed to read image', err);
      }
    },
    [setValue]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      setBackgroundImageFromFile(file);
      e.target.value = '';
    },
    [setBackgroundImageFromFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!enableBackgroundImage) return;
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith('image/')) {
        setBackgroundImageFromFile(file);
      }
    },
    [enableBackgroundImage, setBackgroundImageFromFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrawingWidthChange = useCallback(
    (raw: string) => {
      const value = raw === '' ? undefined : Number(raw);
      setValue('canvasWidth', value);
    },
    [setValue]
  );

  const handleDrawingHeightChange = useCallback(
    (raw: string) => {
      const value = raw === '' ? undefined : Number(raw);
      setValue('canvasHeight', value);
    },
    [setValue]
  );

  const handleRemoveImage = useCallback(() => {
    setValue('background_image', null);
  }, [setValue]);

  const widthInvalid =
    !enableBackgroundImage &&
    (canvasWidth === undefined || canvasWidth <= 0);
  const heightInvalid =
    !enableBackgroundImage &&
    (canvasHeight === undefined || canvasHeight <= 0);

  const widthError =
    (errors as { canvasWidth?: { message?: string } })?.canvasWidth
      ?.message ?? undefined;
  const heightError =
    (errors as { canvasHeight?: { message?: string } })?.canvasHeight
      ?.message ?? undefined;

  const Toggle = (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <span className="text-sm text-foreground">{t('editor.enable_background_image')}</span>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={enableBackgroundImage}
          onChange={(e) => handleToggleBackgroundImage(e.target.checked)}
        />
        <div className="w-9 h-5 bg-[hsl(var(--toggle-track))] rounded-full transition-colors peer-checked:bg-primary" />
        <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
      </div>
    </label>
  );

  if (enableBackgroundImage && background_image) {
    return (
      <div className="flex flex-col gap-8">
        {Toggle}
        <div
          className="relative max-w-full overflow-hidden"
          style={{ width: IMAGE_PREVIEW_WIDTH, height: IMAGE_PREVIEW_HEIGHT }}
        >
          <div className="w-full h-full rounded-2xl bg-muted/30 border border-border overflow-hidden flex items-center justify-center">
            <img className="w-full h-full object-contain" src={background_image} alt="" />
          </div>
          <button
            type="button"
            onClick={handleRemoveImage}
            aria-label={t('editor.remove_image')}
            className="absolute top-2 end-2 p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors bg-card shadow"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {Toggle}

      {enableBackgroundImage ? (
        <>
          <p className="block text-[0.8125rem] font-normal leading-tight text-muted-foreground">
            {t('editor.background_image')}
          </p>
          <div
            className={cn(
              'border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors duration-200',
              dragOver
                ? 'border-primary bg-primary/[0.05]'
                : 'border-border bg-muted/30 hover:border-primary/50'
            )}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <ImagePlus size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">{t('editor.drag_and_drop')}</p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors text-foreground"
            >
              <ImagePlus size={15} />
              {t('editor.browse')}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-4">
          <div className="flex-[1_1_140px] min-w-[120px] flex flex-col gap-1">
            <Input
              type="number"
              required
              value={canvasWidth ?? ''}
              onChange={(e) => handleDrawingWidthChange(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, width: true }))}
              className={cn(
                'w-28 h-9 text-sm',
                (!!widthError || ((touched.width || canvasWidth !== undefined) && widthInvalid)) && 'border-destructive'
              )}
              min={0}
              step={1}
              placeholder={t('editor.drawing_width')}
            />
            {(widthError || ((touched.width || canvasWidth !== undefined) && widthInvalid)) && (
              <p className="text-xs text-destructive">
                {widthError ?? t('editor.required_gte_zero')}
              </p>
            )}
          </div>
          <div className="flex-[1_1_140px] min-w-[120px] flex flex-col gap-1">
            <Input
              type="number"
              required
              value={canvasHeight ?? ''}
              onChange={(e) => handleDrawingHeightChange(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, height: true }))}
              className={cn(
                'w-28 h-9 text-sm',
                (!!heightError || ((touched.height || canvasHeight !== undefined) && heightInvalid)) && 'border-destructive'
              )}
              min={0}
              step={1}
              placeholder={t('editor.drawing_height')}
            />
            {(heightError || ((touched.height || canvasHeight !== undefined) && heightInvalid)) && (
              <p className="text-xs text-destructive">
                {heightError ?? t('editor.required_gte_zero')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
