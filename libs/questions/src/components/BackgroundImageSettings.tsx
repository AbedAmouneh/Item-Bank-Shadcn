import { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { styled } from '@mui/material/styles';

const ToggleLabel = styled(FormControlLabel)(({ theme }) => ({
  '& .MuiFormControlLabel-label': {
    fontSize: '0.875rem',
  },
}));

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

const DimensionField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    fontSize: '0.875rem',
    height: 36,
    backgroundColor: theme.palette.background.paper,
  },
}));

const IMAGE_PREVIEW_WIDTH = 480;
const IMAGE_PREVIEW_HEIGHT = 360;

const ImagePreviewWrapper = styled(Box)(({ theme }) => ({
  width: IMAGE_PREVIEW_WIDTH,
  height: IMAGE_PREVIEW_HEIGHT,
  borderRadius: typeof theme.shape.borderRadius === 'number' ? theme.shape.borderRadius * 2 : 16,
  backgroundColor: theme.palette.action.hover,
  border: `1px solid ${theme.palette.divider}`,
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
}));

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

  if (enableBackgroundImage && background_image) {
    return (
      <Box className="flex flex-col gap-8">
        <ToggleLabel
          control={
            <Switch
              size="small"
              checked={enableBackgroundImage}
              onChange={(e) => handleToggleBackgroundImage(e.target.checked)}
              color="primary"
            />
          }
          label={t('editor.enable_background_image')}
        />
        <ImagePreviewWrapper className="relative max-w-full overflow-hidden">
          <img src={background_image} alt="" />
          <IconButton
            size="small"
            onClick={handleRemoveImage}
            aria-label={t('editor.remove_image')}
            className="absolute top-2 right-2"
            sx={{
              backgroundColor: 'background.paper',
              color: 'error.main',
              boxShadow: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </ImagePreviewWrapper>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-8">
      <ToggleLabel
        control={
          <Switch
            size="small"
            checked={enableBackgroundImage}
            onChange={(e) => handleToggleBackgroundImage(e.target.checked)}
            color="primary"
          />
        }
        label={t('editor.enable_background_image')}
      />

      {enableBackgroundImage ? (
        <>
          <Typography className="block text-[0.8125rem] font-normal leading-tight" sx={(theme) => ({ color: theme.palette.text.secondary })} variant="body2" component="label">
            {t('editor.background_image')}
          </Typography>
          <DropZone
            className="cursor-pointer min-h-[160px] flex flex-col items-center justify-center gap-2 rounded-lg"
            dragOver={dragOver}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
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
            <AddPhotoAlternateOutlinedIcon className='text-5xl' sx={(theme) => ({ color: theme.palette.text.secondary })} />
            <Typography className='text-sm' sx={(theme) => ({ color: theme.palette.text.secondary })} variant="body2">
              {t('editor.drag_and_drop')}
            </Typography>

            <Button
              className='font-medium normal-case'
              variant="contained"
              color="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              {t('editor.browse')}
            </Button>
          </DropZone>
        </>
      ) : (
        <Box className="flex flex-wrap gap-4">
          <DimensionField
            className="flex-[1_1_140px] min-w-[120px]"
            label={t('editor.drawing_width')}
            type="number"
            required
            value={canvasWidth ?? ''}
            onChange={(e) => handleDrawingWidthChange(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, width: true }))}
            error={
              !!widthError ||
              ((touched.width || canvasWidth !== undefined) && widthInvalid)
            }
            helperText={
              widthError ??
              ((touched.width || canvasWidth !== undefined) && widthInvalid
                ? t('editor.required_gte_zero')
                : undefined)
            }
            size="small"
            slotProps={{ htmlInput: { min: 0, step: 1 }}}
          />
          <DimensionField
            className="flex-[1_1_140px] min-w-[120px]"
            label={t('editor.drawing_height')}
            type="number"
            required
            value={canvasHeight ?? ''}
            onChange={(e) => handleDrawingHeightChange(e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, height: true }))}
            error={
              !!heightError ||
              ((touched.height || canvasHeight !== undefined) && heightInvalid)
            }
            helperText={
              heightError ??
              ((touched.height || canvasHeight !== undefined) && heightInvalid
                ? t('editor.required_gte_zero')
                : undefined)
            }
            size="small"
            slotProps={{ htmlInput: { min: 0, step: 1 }}}
          />
        </Box>
      )}
    </Box>
  );
}
