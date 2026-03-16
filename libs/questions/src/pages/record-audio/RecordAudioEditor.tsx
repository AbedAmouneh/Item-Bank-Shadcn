import { memo, useCallback, useMemo } from 'react';
import { Box, TextField, Typography, styled, alpha, useTheme } from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';

const Section = styled(Box)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
}));

const GraderEditorWrapper = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  overflow: 'hidden',
  border: theme.palette.mode === 'dark'
    ? `1.5px solid ${alpha(theme.palette.primary.main, 0.6)}`
    : `1px solid ${alpha(theme.palette.divider, 0.12)}`,
  boxShadow: theme.palette.mode === 'dark'
    ? `0 0 12px ${alpha(theme.palette.primary.main, 0.25)}, inset 0 2px 8px ${alpha(theme.palette.background.default, 0.4)}`
    : `inset 0 1px 4px ${alpha(theme.palette.text.primary, 0.06)}`,
  transition: 'all 0.2s ease',
  '& .tox-tinymce': { border: 'none !important', borderRadius: 0 },
  '&:focus-within': {
    borderColor: alpha(theme.palette.primary.main, 0.6),
  },
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  color: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.9 : 0.75),
}));

const MinMaxRow = styled(Box)(({ theme }) => ({
  '& > *': {
    flex: '1 1 120px',
    minWidth: 120,
  },
}));

const defaultToolbar = 'bold italic underline | bullist numlist | outdent indent | undo redo | link';

function RecordAudioEditor() {
  const theme = useTheme();
  const { watch, setValue } = useFormContext();
  const { t, i18n } = useTranslation('questions');

  const informationForGraders = watch('informationForGraders') ?? '';
  const numberOfRecordingsMin = watch('numberOfRecordingsMin') ?? 1;
  const numberOfRecordingsMax = watch('numberOfRecordingsMax') ?? 1;
  const recordingDurationMinSeconds = watch('recordingDurationMinSeconds') ?? 10;
  const recordingDurationMaxSeconds = watch('recordingDurationMaxSeconds') ?? 30;

  const recordingsRangeError = useMemo(() => {
    const min = Number(numberOfRecordingsMin);
    const max = Number(numberOfRecordingsMax);
    if (min > max) return t('editor.record_audio.min_lte_max_recordings') ?? 'Min must be ≤ max';
    return null;
  }, [numberOfRecordingsMin, numberOfRecordingsMax, t]);

  const durationRangeError = useMemo(() => {
    const min = Number(recordingDurationMinSeconds);
    const max = Number(recordingDurationMaxSeconds);
    if (min > max) return t('editor.record_audio.min_lte_max_duration') ?? 'Min must be ≤ max';
    return null;
  }, [recordingDurationMinSeconds, recordingDurationMaxSeconds, t]);

  const handleRecordingsMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
      if (v === undefined || (!isNaN(v) && v >= 0)) setValue('numberOfRecordingsMin', v ?? 1);
    },
    [setValue]
  );

  const handleRecordingsMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
      if (v === undefined || (!isNaN(v) && v >= 0)) setValue('numberOfRecordingsMax', v ?? 1);
    },
    [setValue]
  );

  const handleDurationMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
      if (v === undefined || (!isNaN(v) && v >= 0)) setValue('recordingDurationMinSeconds', v ?? 10);
    },
    [setValue]
  );

  const handleDurationMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
      if (v === undefined || (!isNaN(v) && v >= 0)) setValue('recordingDurationMaxSeconds', v ?? 30);
    },
    [setValue]
  );

  const recordingsLabel = t('editor.record_audio.number_of_recordings_allowed') ?? 'Number of recordings allowed';
  const durationLabel = t('editor.record_audio.recording_duration_seconds') ?? 'Recording duration (in seconds)';
  const minLabel = t('editor.record_audio.min') ?? 'min';
  const maxLabel = t('editor.record_audio.max') ?? 'max';
  const informationForGradersLabel = t('editor.record_audio.information_for_graders') ?? 'Information for graders';

  const graderEditorInit = useMemo(() => {
    const isDarkMode = theme.palette.mode === 'dark';
    const contentStyle = isDarkMode
      ? `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; background-color: ${theme.palette.background.default}; color: ${alpha(theme.palette.text.primary, 0.9)}; }`
      : 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.6; padding: 16px; }';
    return {
      height: 200,
      menubar: false,
      skin: isDarkMode ? 'oxide-dark' : 'oxide',
      content_css: isDarkMode ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      plugins: ['lists', 'link'],
      toolbar: defaultToolbar,
      toolbar_mode: 'floating' as const,
      statusbar: false,
      content_style: contentStyle,
    };
  }, [theme, i18n.language]);

  return (
    <Box className="flex flex-col gap-4">
      <Box>
        <Typography
          className="text-sm mb-3 font-medium"
          sx={{ color: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.9 : 0.75) }}
          variant="body2"
        >
          {informationForGradersLabel}
        </Typography>
        <GraderEditorWrapper>
          <Editor
            tinymceScriptSrc="/tinymce/tinymce.min.js"
            licenseKey="gpl"
            value={informationForGraders}
            onEditorChange={(value) => setValue('informationForGraders', value, { shouldValidate: false })}
            init={graderEditorInit}
          />
        </GraderEditorWrapper>
      </Box>

      <Section className="p-6 mb-6">
        <SectionTitle className="text-sm font-medium mb-4">{recordingsLabel}</SectionTitle>
        <MinMaxRow className="flex flex-wrap gap-4 items-start">
          <TextField
            label={minLabel}
            type="number"
            size="small"
            required
            value={numberOfRecordingsMin}
            onChange={handleRecordingsMinChange}
            error={!!recordingsRangeError}
            helperText={recordingsRangeError ?? ' '}
            inputProps={{ min: 0 }}
            fullWidth
          />
          <TextField
            label={maxLabel}
            type="number"
            size="small"
            required
            value={numberOfRecordingsMax}
            onChange={handleRecordingsMaxChange}
            error={!!recordingsRangeError}
            helperText={' '}
            inputProps={{ min: 0 }}
            fullWidth
          />
        </MinMaxRow>
      </Section>

      <Section className="p-6 mb-6">
        <SectionTitle className="text-sm font-medium mb-4">{durationLabel}</SectionTitle>
        <MinMaxRow className="flex flex-wrap gap-4 items-start">
          <TextField
            label={minLabel}
            type="number"
            size="small"
            required
            value={recordingDurationMinSeconds}
            onChange={handleDurationMinChange}
            error={!!durationRangeError}
            helperText={durationRangeError ?? ' '}
            inputProps={{ min: 0 }}
            fullWidth
          />
          <TextField
            label={maxLabel}
            type="number"
            size="small"
            required
            value={recordingDurationMaxSeconds}
            onChange={handleDurationMaxChange}
            error={!!durationRangeError}
            helperText={' '}
            inputProps={{ min: 0 }}
            fullWidth
          />
        </MinMaxRow>
      </Section>
    </Box>
  );
}

export default memo(RecordAudioEditor);
