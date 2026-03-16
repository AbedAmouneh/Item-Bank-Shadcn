import { memo, useState, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
  Collapse,
  Alert,
  alpha,
  styled,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tinymce/tinymce-react';
import type { QuestionFormData } from '../../components/QuestionEditorShell';

type TextClassificationColor =
  | 'blue' | 'orange' | 'green' | 'red'
  | 'purple' | 'pink' | 'dark-orange' | 'cyan';

const COLOR_MAP: Record<TextClassificationColor, string> = {
  'blue':        '#1565c0',
  'orange':      '#e65100',
  'green':       '#2e7d32',
  'red':         '#c62828',
  'purple':      '#6a1b9a',
  'pink':        '#ad1457',
  'dark-orange': '#bf360c',
  'cyan':        '#00838f',
};

/* colorOptions moved inside component so labels are reactive to language */

const JUSTIFICATION_FRACTION_OPTIONS = [
  100, 90, 80, 75, 70, 60, 50, 40, 33.3, 30, 25, 20, 15, 10, 5, 0,
];

const CategoryCard = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
  marginBottom: theme.spacing(2),
}));

const CategoryHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5, 2),
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.4)
      : alpha(theme.palette.action.hover, 0.3),
}));

const AnswerRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 2),
  '&:not(:last-of-type)': {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  },
}));

const EditorWrapper = styled(Box)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  overflow: 'hidden',
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  '& .tox-tinymce': {
    border: 'none !important',
  },
}));

function TextClassificationEditor() {
  const { watch, setValue, register, formState: { errors, isSubmitted } } = useFormContext<QuestionFormData>();
  const { t, i18n } = useTranslation(['questions', 'common']);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const colorOptions: { value: TextClassificationColor; label: string }[] = [
    { value: 'blue', label: t('editor.text_classification.color_blue') },
    { value: 'orange', label: t('editor.text_classification.color_orange') },
    { value: 'green', label: t('editor.text_classification.color_green') },
    { value: 'red', label: t('editor.text_classification.color_red') },
    { value: 'purple', label: t('editor.text_classification.color_purple') },
    { value: 'pink', label: t('editor.text_classification.color_pink') },
    { value: 'dark-orange', label: t('editor.text_classification.color_dark_orange') },
  ];

  const categories = watch('textClassificationCategories') ?? [];
  const layout = watch('textClassificationLayout') ?? 'columns';
  const autoDistribute = watch('textClassificationAutoDistribute') ?? true;
  const justification = watch('textClassificationJustification') ?? 'disabled';
  const justificationFraction = watch('textClassificationJustificationFraction') ?? 30;
  // Local UI state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach((cat) => { initial[cat.id] = true; });
    return initial;
  });
  const [feedbackToggles, setFeedbackToggles] = useState<Record<string, boolean>>({});

  // Validation errors (only shown after first submit attempt)
  const validationErrors = useMemo(() => {
    if (!isSubmitted) return [];
    const errs: string[] = [];
    const totalAnswers = categories.reduce((sum, cat) => sum + cat.answers.length, 0);
    if (totalAnswers < 2) {
      errs.push(t('editor.text_classification.error_min_categories'));
    }
    if (!autoDistribute) {
      const total = categories.flatMap(c => c.answers).reduce((sum, a) => sum + a.markPercent, 0);
      if (Math.abs(total - 100) > 0.01) {
        errs.push(t('editor.text_classification.error_total_not_100', { total: Math.round(total * 100) / 100 }));
      }
    }
    // Check category names
    categories.forEach((cat) => {
      if (!cat.name?.trim()) {
        errs.push(t('editor.text_classification.error_empty_categories'));
      }
    });
    return errs;
  }, [isSubmitted, categories, autoDistribute, t]);

  const toggleCategoryExpanded = useCallback((catId: string) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  }, []);

  const toggleAnswerFeedback = useCallback((answerId: string) => {
    setFeedbackToggles(prev => ({ ...prev, [answerId]: !prev[answerId] }));
  }, []);

  const updateCategory = useCallback((index: number, field: string, value: unknown) => {
    const updated = [...categories];
    (updated[index] as Record<string, unknown>)[field] = value;
    setValue('textClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const updateAnswer = useCallback((catIndex: number, ansIndex: number, field: string, value: unknown) => {
    const updated = [...categories];
    const answers = [...updated[catIndex].answers];
    (answers[ansIndex] as Record<string, unknown>)[field] = value;
    updated[catIndex] = { ...updated[catIndex], answers };
    setValue('textClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const addCategory = useCallback(() => {
    const newCat = {
      id: crypto.randomUUID(),
      name: '',
      color: 'blue' as const,
      answers: [],
    };
    const updated = [...categories, newCat];
    setValue('textClassificationCategories', updated, { shouldDirty: true });
    setExpandedCategories(prev => ({ ...prev, [newCat.id]: true }));
  }, [categories, setValue]);

  const removeCategory = useCallback((index: number) => {
    const updated = categories.filter((_, i) => i !== index);
    setValue('textClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const addAnswer = useCallback((catIndex: number) => {
    const updated = [...categories];
    const newAnswer = {
      id: crypto.randomUUID(),
      text: '',
      feedback: '',
      markPercent: 0,
    };
    updated[catIndex] = {
      ...updated[catIndex],
      answers: [...updated[catIndex].answers, newAnswer],
    };
    setValue('textClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const removeAnswer = useCallback((catIndex: number, ansIndex: number) => {
    const updated = [...categories];
    updated[catIndex] = {
      ...updated[catIndex],
      answers: updated[catIndex].answers.filter((_, i) => i !== ansIndex),
    };
    setValue('textClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const feedbackEditorInit = useMemo(
    () => ({
      height: 180,
      menubar: false,
      skin: isDarkMode ? 'oxide-dark' : 'oxide',
      content_css: isDarkMode ? 'dark' : 'default',
      directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
      plugins: ['lists', 'link'],
      toolbar: 'bold italic underline | bullist numlist | undo redo | link',
      toolbar_mode: 'floating' as const,
      statusbar: false,
    }),
    [isDarkMode, i18n.language],
  );

  return (
    <Box className="flex flex-col gap-5">
      {/* Justification */}
      <Box className="flex items-center gap-3 flex-wrap">
        <Box className="flex items-center gap-1">
          <Typography variant="body2" fontWeight={500}>
            {t('editor.text_classification.justification_label')}
          </Typography>
          <Select
            size="small"
            value={justification}
            onChange={(e) =>
              setValue('textClassificationJustification', e.target.value as 'disabled' | 'optional' | 'required', { shouldDirty: true })
            }
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="disabled">{t('editor.text_classification.justification_disabled')}</MenuItem>
            <MenuItem value="optional">{t('editor.text_classification.justification_optional')}</MenuItem>
            <MenuItem value="required">{t('editor.text_classification.justification_required')}</MenuItem>
          </Select>
        </Box>
        {justification !== 'disabled' && (
          <Box className="flex items-center gap-1">
            <Typography variant="body2" fontWeight={500}>
              {t('editor.text_classification.justification_fraction_label')}
            </Typography>
            <Select
              size="small"
              value={justificationFraction}
              onChange={(e) =>
                setValue('textClassificationJustificationFraction', Number(e.target.value), { shouldDirty: true })
              }
              sx={{ minWidth: 100 }}
            >
              {JUSTIFICATION_FRACTION_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt} %
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
      </Box>

      {/* Layout + Auto-distribute row */}
      <Box className="flex items-center justify-between flex-wrap gap-3">
        <Box className="flex items-center gap-2">
          <Typography variant="body2" fontWeight={500}>
            {t('editor.text_classification.layout_label')}
          </Typography>
          <RadioGroup
            row
            value={layout}
            onChange={(e) => setValue('textClassificationLayout', e.target.value as 'columns' | 'rows', { shouldDirty: true })}
          >
            <FormControlLabel value="columns" control={<Radio size="small" />} label={t('editor.text_classification.layout_columns')} />
            <FormControlLabel value="rows" control={<Radio size="small" />} label={t('editor.text_classification.layout_rows')} />
          </RadioGroup>
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={autoDistribute}
              onChange={(e) => setValue('textClassificationAutoDistribute', e.target.checked, { shouldDirty: true })}
              size="small"
            />
          }
          label={t('editor.text_classification.auto_distribute')}
        />
      </Box>

      {/* Validation error banner */}
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {validationErrors.map((err, i) => (
            <Typography key={i} variant="body2">{err}</Typography>
          ))}
        </Alert>
      )}

      {/* Categories list */}
      {categories.map((category, catIndex) => (
        <CategoryCard key={category.id}>
          <CategoryHeader>
            <IconButton
              size="small"
              onClick={() => toggleCategoryExpanded(category.id)}
            >
              {expandedCategories[category.id] !== false ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </IconButton>

            <TextField
              size="small"
              placeholder={t('editor.text_classification.category_name_placeholder')}
              value={category.name}
              onChange={(e) => updateCategory(catIndex, 'name', e.target.value)}
              error={isSubmitted && !category.name?.trim()}
              helperText={isSubmitted && !category.name?.trim() ? t('editor.text_classification.category_field_required') : ''}
              sx={{ flex: 1 }}
            />

            <Box className="flex items-center gap-1">
              <Typography variant="caption" color="text.secondary">
                {t('editor.text_classification.color_label')}
              </Typography>
              <Select
                size="small"
                value={category.color}
                onChange={(e) => updateCategory(catIndex, 'color', e.target.value)}
                sx={{ minWidth: 130 }}
                renderValue={(value) => {
                  const color = value as TextClassificationColor;
                  return (
                    <Box className="flex items-center gap-1">
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: '3px',
                          backgroundColor: COLOR_MAP[color] ?? COLOR_MAP.blue,
                        }}
                      />
                      <Typography variant="body2">
                        {colorOptions.find(o => o.value === color)?.label ?? color}
                      </Typography>
                    </Box>
                  );
                }}
              >
                {colorOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box className="flex items-center gap-2">
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: '3px',
                          backgroundColor: COLOR_MAP[opt.value],
                        }}
                      />
                      {opt.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {categories.length > 2 && (
              <IconButton
                size="small"
                onClick={() => removeCategory(catIndex)}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </CategoryHeader>

          <Collapse in={expandedCategories[category.id] !== false}>
            <Box className="px-2 py-1">
              {category.answers.map((answer, ansIndex) => (
                <Box key={answer.id}>
                  <AnswerRow>
                    <TextField
                      size="small"
                      placeholder={t('editor.text_classification.answer_placeholder', { index: ansIndex + 1 })}
                      value={answer.text}
                      onChange={(e) => updateAnswer(catIndex, ansIndex, 'text', e.target.value)}
                      sx={{ flex: 1 }}
                    />

                    {!autoDistribute && (
                      <Box className="flex items-center gap-0.5">
                        <TextField
                          size="small"
                          type="number"
                          value={answer.markPercent}
                          onChange={(e) => updateAnswer(catIndex, ansIndex, 'markPercent', parseFloat(e.target.value) || 0)}
                          sx={{ width: 80 }}
                          slotProps={{
                            htmlInput: { min: 0, max: 100, step: 0.01 },
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">%</Typography>
                      </Box>
                    )}

                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={feedbackToggles[answer.id] ?? false}
                          onChange={() => toggleAnswerFeedback(answer.id)}
                        />
                      }
                      label={<Typography variant="caption">{t('editor.feedback')}</Typography>}
                      sx={{ mr: 0 }}
                    />

                    <IconButton
                      size="small"
                      onClick={() => removeAnswer(catIndex, ansIndex)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </AnswerRow>

                  {/* Answer feedback TinyMCE */}
                  <Collapse in={feedbackToggles[answer.id] ?? false}>
                    <Box sx={{ px: 2, pb: 2 }}>
                      <Box className="flex items-center gap-1 mb-1 mt-1">
                        <CampaignIcon sx={{ fontSize: 16 }} color="action" />
                        <Typography variant="caption" fontWeight={500}>
                          {t('editor.choice_feedback')}
                        </Typography>
                      </Box>
                      <EditorWrapper>
                        <Editor
                          tinymceScriptSrc="/tinymce/tinymce.min.js"
                          licenseKey="gpl"
                          value={answer.feedback ?? ''}
                          onEditorChange={(value) => updateAnswer(catIndex, ansIndex, 'feedback', value)}
                          init={feedbackEditorInit}
                        />
                      </EditorWrapper>
                    </Box>
                  </Collapse>
                </Box>
              ))}

              <Box className="py-2 px-2">
                <Button
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={() => addAnswer(catIndex)}
                  variant="text"
                >
                  {t('editor.add_answer')}
                </Button>
              </Box>
            </Box>
          </Collapse>
        </CategoryCard>
      ))}

      {/* Add category button */}
      <Box className="flex justify-center">
        <Button
          startIcon={<AddIcon />}
          onClick={addCategory}
          variant="outlined"
          size="small"
        >
          {t('editor.text_classification.add_category')}
        </Button>
      </Box>
    </Box>
  );
}

export default memo(TextClassificationEditor);
