import { memo, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Checkbox,
  styled,
  alpha,
  useTheme,
  Collapse,
  SelectChangeEvent,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';

type ResponseFormat = 'html' | 'html_with_file_picker' | 'plain_text';

const FILE_SIZE_OPTIONS = [
  { value: '10KB', labelKey: 'editor.file_size_10_kb' },
  { value: '50KB', labelKey: 'editor.file_size_50_kb' },
  { value: '100KB', labelKey: 'editor.file_size_100_kb' },
  { value: '500KB', labelKey: 'editor.file_size_500_kb' },
  { value: '1MB', labelKey: 'editor.file_size_1_mb' },
  { value: '2MB', labelKey: 'editor.file_size_2_mb' },
  { value: '4MB', labelKey: 'editor.file_size_4_mb' },
  { value: '8MB', labelKey: 'editor.file_size_8_mb' },
  { value: '16MB', labelKey: 'editor.file_size_16_mb' },
  { value: '32MB', labelKey: 'editor.file_size_32_mb' },
  { value: '64MB', labelKey: 'editor.file_size_64_mb' },
];

const FILE_FORMAT_CATEGORIES = [
  { categoryKey: 'editor.file_category_documents', formats: ['.doc', '.docx', '.dot', '.list', '.log', '.odt', '.pdf', '.rtf', '.text', '.txt'] },
  { categoryKey: 'editor.file_category_spreadsheets', formats: ['.csv', '.ods', '.xla', '.xlc', '.xlm', '.xls', '.xlsx', '.xlt', '.xlw'] },
  { categoryKey: 'editor.file_category_presentations', formats: ['.odp', '.pot', '.pps', '.ppt', '.pptx'] },
  { categoryKey: 'editor.file_category_images', formats: ['.bmp', '.dib', '.gif', '.jpe', '.jpeg', '.jpg', '.odg', '.png', '.svg', '.svgz', '.tif', '.tiff', '.webp'] },
  { categoryKey: 'editor.file_category_video', formats: ['.avi', '.mov', '.mp4', '.mp4v', '.mpg4', '.qt', '.webm', '.wmv'] },
];

const ResponseConfigurationSection = styled(Box)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  },
}));

const AttachmentSettingsPanel = styled(Box)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.4),
  boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.08)}`,
}));

const CheckboxFieldContainer = styled(FormControl)(({ theme }) => ({
  border: `1px solid ${alpha(theme.palette.divider, 0.23)}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  transition: 'border-color 0.2s, box-shadow 0.2s',
  '&:hover': {
    borderColor: theme.palette.text.primary,
  },
}));

function AddEssay() {
  const theme = useTheme();
  const { watch, setValue } = useFormContext();
  const { t } = useTranslation('questions');

  const responseFormat: ResponseFormat = watch('responseFormat') || 'html';
  const minLimit = watch('minLimit') ?? '';
  const maxLimit = watch('maxLimit') ?? '';
  const allowAttachments: boolean = watch('allowAttachments') || false;
  const numberOfAttachments: number = watch('numberOfAttachments') ?? 1;
  const requiredAttachments: boolean = watch('requiredAttachments') || false;
  const maxFileSize: string = watch('maxFileSize') ?? '2MB';
  const attachmentsFormat: string[] = watch('attachmentsFormat') || ['.pdf', '.doc', '.docx'];

  const minLimitValidationError = useMemo(() => {
    if (minLimit !== '' && (isNaN(minLimit) || minLimit < 0)) {
      return t('editor.error_min_words_non_negative');
    }
    return null;
  }, [minLimit, t]);

  const maxLimitValidationError = useMemo(() => {
    if (maxLimit !== '' && (isNaN(maxLimit) || maxLimit < 0)) {
      return t('editor.error_max_words_non_negative');
    }
    return null;
  }, [maxLimit, t]);

  const limitRangeValidationError = useMemo(() => {
    if (
      minLimit !== '' &&
      maxLimit !== '' &&
      !isNaN(minLimit) &&
      !isNaN(maxLimit) &&
      minLimit > maxLimit
    ) {
      return t('editor.error_min_words_lte_max_words');
    }
    return null;
  }, [minLimit, maxLimit, t]);

  const handleResponseFormatChange = useCallback(
    (event: SelectChangeEvent<ResponseFormat>) => {
      setValue('responseFormat', event.target.value);
    },
    [setValue]
  );

  const handleMinLimitChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (value === '') {
        setValue('minLimit', '');
      } else {
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
          setValue('minLimit', num);
        }
      }
    },
    [setValue]
  );

  const handleMaxLimitChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (value === '') {
        setValue('maxLimit', '');
      } else {
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
          setValue('maxLimit', num);
        }
      }
    },
    [setValue]
  );

  const handleAllowAttachmentsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue('allowAttachments', event.target.checked);
    },
    [setValue]
  );

  const handleNumberOfAttachmentsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(event.target.value, 10);
      if (!isNaN(value) && value > 0) {
        setValue('numberOfAttachments', value);
      }
    },
    [setValue]
  );

  const handleRequiredAttachmentsChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue('requiredAttachments', event.target.checked);
    },
    [setValue]
  );

  const handleMaxFileSizeChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      setValue('maxFileSize', event.target.value);
    },
    [setValue]
  );

  const handleAttachmentsFormatChange = useCallback(
    (event: SelectChangeEvent<string[]>) => {
      const value = event.target.value;
      setValue('attachmentsFormat', typeof value === 'string' ? value.split(',') : value);
    },
    [setValue]
  );

  const minLimitLabel = t('editor.min_words');
  const maxLimitLabel = t('editor.max_words');

  return (
    <Box className="flex flex-col gap-6">
      <ResponseConfigurationSection className="flex flex-col sm:flex-row items-start gap-4 p-4">
        <FormControl required size="small" className="flex-[2] min-w-[200px]">
          <InputLabel id="response-format-label">{t('editor.response_format')}</InputLabel>
          <Select
            labelId="response-format-label"
            id="response-format"
            value={responseFormat}
            label={t('editor.response_format')}
            onChange={handleResponseFormatChange}
          >
            <MenuItem value="html">{t('editor.response_format_html')}</MenuItem>
            <MenuItem value="html_with_file_picker">
              {t('editor.response_format_html_with_file_picker')}
            </MenuItem>
            <MenuItem value="plain_text">{t('editor.response_format_plain_text')}</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label={minLimitLabel}
          type="number"
          size="small"
          value={minLimit}
          onChange={handleMinLimitChange}
          error={!!(minLimitValidationError || limitRangeValidationError)}
          helperText={minLimitValidationError || limitRangeValidationError || ' '}
          inputProps={{ min: 0 }}
          className="flex-1 min-w-[120px]"
        />

        <TextField
          label={maxLimitLabel}
          type="number"
          size="small"
          value={maxLimit}
          onChange={handleMaxLimitChange}
          error={!!(maxLimitValidationError && !limitRangeValidationError)}
          helperText={maxLimitValidationError || ' '}
          inputProps={{ min: 0 }}
          className="flex-1 min-w-[120px]"
        />
      </ResponseConfigurationSection>

      <Box className="flex items-center gap-4 flex-wrap">
        <FormControlLabel
          className="m-0"
          control={
            <Switch
              size="small"
              checked={allowAttachments}
              onChange={handleAllowAttachmentsChange}
            />
          }
          label={t('editor.allow_attachments')}
          sx={(theme) => ({
            '& .MuiFormControlLabel-label': {
              fontSize: '0.875rem',
              color: theme.palette.text.secondary,
            },
          })}
        />
      </Box>

      <Collapse in={allowAttachments}>
        <AttachmentSettingsPanel className="flex flex-col gap-6 p-6 mt-2">
          <Box className="grid grid-cols-2 md:grid-cols-1 gap-5">
            <TextField
              label={t('editor.number_of_attachments')}
              type="number"
              size="small"
              required
              value={numberOfAttachments}
              onChange={handleNumberOfAttachmentsChange}
              inputProps={{ min: 1, max: 10 }}
            />

            <CheckboxFieldContainer size="small" className="relative flex flex-row items-center h-10 px-3.5">
              <FormControlLabel
                className="m-0"
                control={
                  <span className="mr-2">
                    <Checkbox
                      size="small"
                      checked={requiredAttachments}
                      onChange={handleRequiredAttachmentsChange}
                    />
                  </span>
                }
                label={t('editor.required_attachments')}
                sx={(theme) => ({
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.875rem',
                    color: theme.palette.text.secondary,
                  },
                })}
              />
            </CheckboxFieldContainer>

            <FormControl size="small" required>
              <InputLabel id="max-file-size-label">
                {t('editor.maximum_file_size')}
              </InputLabel>
              <Select
                labelId="max-file-size-label"
                value={maxFileSize}
                label={t('editor.maximum_file_size')}
                onChange={handleMaxFileSizeChange}
              >
                {FILE_SIZE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl
              size="small"
              required
              sx={{ [theme.breakpoints.up('md')]: { gridColumn: 'span 2' } }}
            >
              <InputLabel id="attachments-format-label">
                {t('editor.attachments_format')}
              </InputLabel>
              <Select
                labelId="attachments-format-label"
                multiple
                value={attachmentsFormat}
                label={t('editor.attachments_format')}
                onChange={handleAttachmentsFormatChange}
                renderValue={(selected) => (
                  <Box className="flex flex-wrap gap-1">
                    {selected.slice(0, 3).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                    {selected.length > 3 && (
                      <Chip label={`+${selected.length - 3}`} size="small" />
                    )}
                  </Box>
                )}
                MenuProps={{
                  PaperProps: {
                    sx: (t) => ({ maxHeight: t.spacing(50) }),
                  },
                }}
              >
                {FILE_FORMAT_CATEGORIES.map((category) => [
                  <MenuItem
                    key={category.categoryKey}
                    disabled
                    className="font-semibold text-sm opacity-100"
                    sx={(theme) => ({ color: theme.palette.text.primary })}
                  >
                    {t(category.categoryKey)}
                  </MenuItem>,
                  ...category.formats.map((format) => (
                    <MenuItem key={format} value={format} className="pl-8">
                      {format}
                    </MenuItem>
                  )),
                ])}
              </Select>
            </FormControl>
          </Box>
        </AttachmentSettingsPanel>
      </Collapse>
    </Box>
  );
}

export default memo(AddEssay);
