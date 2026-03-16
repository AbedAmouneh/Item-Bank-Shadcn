import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  Select,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  styled,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LinkIcon from '@mui/icons-material/Link';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { useTranslation } from 'react-i18next';
import type { QuestionFormData } from '../../components/QuestionEditorShell';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const JUSTIFICATION_FRACTION_OPTIONS = [
  100, 90, 80, 75, 70, 60, 50, 40, 33.3, 30, 25, 20, 15, 10, 5, 0,
];

// ─── Local types ──────────────────────────────────────────────────────────────

type LeftItem = {
  id: string;
  text: string;
  imageUrl: string;
  multipleAnswers: boolean;
  linkedRightIds: string[];
  markPercent: number;
};

type RightItem = {
  id: string;
  text: string;
  imageUrl: string;
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

function createEmptyLeftItems(count: number): LeftItem[] {
  return Array.from({ length: count }, () => ({
    id: crypto.randomUUID(),
    text: '',
    imageUrl: '',
    multipleAnswers: false,
    linkedRightIds: [],
    markPercent: 0,
  }));
}

function createEmptyRightItems(count: number): RightItem[] {
  return Array.from({ length: count }, () => ({
    id: crypto.randomUUID(),
    text: '',
    imageUrl: '',
  }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// ─── Styled components ───────────────────────────────────────────────────────

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'hasImage' && prop !== 'hasError',
})<{ hasImage?: boolean; hasError?: boolean }>(({ theme, hasImage, hasError }) => ({
  position: 'relative',
  width: '100%',
  height: 140,
  borderRadius: theme.shape.borderRadius,
  border: hasImage
    ? 'none'
    : `2px dashed ${hasError ? theme.palette.error.main : theme.palette.divider}`,
  backgroundColor: hasImage
    ? 'transparent'
    : alpha(theme.palette.action.hover, 0.5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  gap: theme.spacing(0.5),
  transition: theme.transitions.create(['border-color', 'background-color'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    backgroundColor: hasImage
      ? alpha(theme.palette.action.hover, 0.3)
      : alpha(theme.palette.action.hover, 0.7),
  },
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    borderRadius: theme.shape.borderRadius,
  },
}));

// ─── Props ────────────────────────────────────────────────────────────────────

type MatchingWizardProps = {
  onSave: (data: QuestionFormData) => void;
  onCancel: () => void;
  initialData?: QuestionFormData;
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

function MatchingWizard({ onSave, onCancel, initialData }: MatchingWizardProps) {
  const { t, i18n } = useTranslation('questions');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // ── Step state ────────────────────────────────────────────────────────────

  const [step, setStep] = useState(0);

  // ── Step 1 state ──────────────────────────────────────────────────────────

  const [name, setName] = useState(initialData?.name ?? '');
  const [mark, setMark] = useState<number>(initialData?.mark ?? 1);
  const [instructions, setInstructions] = useState(initialData?.text ?? '');
  const [justification, setJustification] = useState<'disabled' | 'optional' | 'required'>(
    (initialData as Record<string, unknown>)?.matchingJustification as 'disabled' | 'optional' | 'required' ?? 'disabled',
  );
  const [justificationFraction, setJustificationFraction] = useState<number>(
    ((initialData as Record<string, unknown>)?.matchingJustificationFraction as number) ?? 30,
  );
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [correctFeedback, setCorrectFeedback] = useState(initialData?.correctAnswerFeedback ?? '');
  const [partialFeedback, setPartialFeedback] = useState(initialData?.partiallyCorrectAnswerFeedback ?? '');
  const [incorrectFeedback, setIncorrectFeedback] = useState(initialData?.incorrectAnswerFeedback ?? '');
  const [leftMode, setLeftMode] = useState<'text' | 'image'>(
    ((initialData as Record<string, unknown>)?.matchingLeftMode as 'text' | 'image') ?? 'text',
  );
  const [rightMode, setRightMode] = useState<'text' | 'image'>(
    ((initialData as Record<string, unknown>)?.matchingRightMode as 'text' | 'image') ?? 'text',
  );
  const [leftItems, setLeftItems] = useState<LeftItem[]>(
    () => ((initialData as Record<string, unknown>)?.matchingLeftItems as LeftItem[] | undefined) ?? createEmptyLeftItems(3),
  );
  const [rightItems, setRightItems] = useState<RightItem[]>(
    () => ((initialData as Record<string, unknown>)?.matchingRightItems as RightItem[] | undefined) ?? createEmptyRightItems(3),
  );
  const [step1Errors, setStep1Errors] = useState<string[]>([]);
  const [leftModeSwitchWarning, setLeftModeSwitchWarning] = useState(false);
  const [rightModeSwitchWarning, setRightModeSwitchWarning] = useState(false);

  // ── Step 2 state ──────────────────────────────────────────────────────────

  const [penalty, setPenalty] = useState<number>(
    ((initialData as Record<string, unknown>)?.matchingPenalty as number) ?? 0,
  );
  const [allowRightReuse, setAllowRightReuse] = useState<boolean>(
    ((initialData as Record<string, unknown>)?.matchingAllowRightReuse as boolean) ?? false,
  );
  const [autoDistribute, setAutoDistribute] = useState<boolean>(
    ((initialData as Record<string, unknown>)?.matchingAutoDistribute as boolean) ?? true,
  );
  const [step2Errors, setStep2Errors] = useState<string[]>([]);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserLeftIdx, setChooserLeftIdx] = useState<number | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────

  const editorRef = useRef<TinyMCEEditor | null>(null);
  const leftFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rightFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Pending mode switch target
  const pendingLeftMode = useRef<'text' | 'image'>('text');
  const pendingRightMode = useRef<'text' | 'image'>('text');

  // ── TinyMCE init ──────────────────────────────────────────────────────────

  const editorInit = useMemo(() => ({
    height: 250,
    menubar: false,
    skin: isDark ? 'oxide-dark' : 'oxide',
    content_css: isDark ? 'dark' : 'default',
    directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    plugins: ['lists', 'link', 'image'],
    toolbar: 'styles | bold italic underline | bullist numlist | link image | removeformat',
    toolbar_mode: 'floating' as const,
    statusbar: false,
  }), [isDark, i18n.language]);

  const feedbackEditorInit = useMemo(() => ({
    height: 180,
    menubar: false,
    skin: isDark ? 'oxide-dark' : 'oxide',
    content_css: isDark ? 'dark' : 'default',
    directionality: (i18n.language === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    plugins: ['lists', 'link'],
    toolbar: 'bold italic underline | bullist numlist | link',
    toolbar_mode: 'floating' as const,
    statusbar: false,
  }), [isDark, i18n.language]);

  // ── Computed: auto-distributed mark ───────────────────────────────────────

  const autoDistributedMark = useMemo(() => {
    if (leftItems.length === 0) return 0;
    return Math.round((100 / leftItems.length) * 100) / 100;
  }, [leftItems.length]);

  // ── Chooser temp selection state ──────────────────────────────────────────

  const [chooserSelection, setChooserSelection] = useState<string[]>([]);

  // ── Left item handlers ────────────────────────────────────────────────────

  const handleAddLeftItem = useCallback(() => {
    setLeftItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      text: '',
      imageUrl: '',
      multipleAnswers: false,
      linkedRightIds: [],
      markPercent: 0,
    }]);
  }, []);

  const handleDeleteLeftItem = useCallback((idx: number) => {
    setLeftItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleUpdateLeftItemText = useCallback((idx: number, text: string) => {
    setLeftItems((prev) => prev.map((item, i) => i === idx ? { ...item, text } : item));
  }, []);

  const handleLeftImageUpload = useCallback(async (idx: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_SIZE) return;
    const dataUrl = await fileToDataUrl(file);
    setLeftItems((prev) => prev.map((item, i) => i === idx ? { ...item, imageUrl: dataUrl } : item));
  }, []);

  // ── Right item handlers ───────────────────────────────────────────────────

  const handleAddRightItem = useCallback(() => {
    setRightItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      text: '',
      imageUrl: '',
    }]);
  }, []);

  const handleDeleteRightItem = useCallback((idx: number) => {
    const removedId = rightItems[idx]?.id;
    setRightItems((prev) => prev.filter((_, i) => i !== idx));
    if (removedId) {
      setLeftItems((prev) =>
        prev.map((item) => ({
          ...item,
          linkedRightIds: item.linkedRightIds.filter((rid) => rid !== removedId),
        })),
      );
    }
  }, [rightItems]);

  const handleUpdateRightItemText = useCallback((idx: number, text: string) => {
    setRightItems((prev) => prev.map((item, i) => i === idx ? { ...item, text } : item));
  }, []);

  const handleRightImageUpload = useCallback(async (idx: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_SIZE) return;
    const dataUrl = await fileToDataUrl(file);
    setRightItems((prev) => prev.map((item, i) => i === idx ? { ...item, imageUrl: dataUrl } : item));
  }, []);

  // ── Mode switch handlers ──────────────────────────────────────────────────

  const handleLeftModeChange = useCallback((_: unknown, val: 'text' | 'image' | null) => {
    if (!val || val === leftMode) return;
    pendingLeftMode.current = val;
    setLeftModeSwitchWarning(true);
  }, [leftMode]);

  const confirmLeftModeSwitch = useCallback(() => {
    setLeftMode(pendingLeftMode.current);
    setLeftItems(createEmptyLeftItems(3));
    setLeftModeSwitchWarning(false);
  }, []);

  const cancelLeftModeSwitch = useCallback(() => {
    setLeftModeSwitchWarning(false);
  }, []);

  const handleRightModeChange = useCallback((_: unknown, val: 'text' | 'image' | null) => {
    if (!val || val === rightMode) return;
    pendingRightMode.current = val;
    setRightModeSwitchWarning(true);
  }, [rightMode]);

  const confirmRightModeSwitch = useCallback(() => {
    setRightMode(pendingRightMode.current);
    setRightItems(createEmptyRightItems(3));
    setRightModeSwitchWarning(false);
    // Clear links since right items are reset
    setLeftItems((prev) => prev.map((item) => ({ ...item, linkedRightIds: [] })));
  }, []);

  const cancelRightModeSwitch = useCallback(() => {
    setRightModeSwitchWarning(false);
  }, []);

  // ── Step 1 validation + next ──────────────────────────────────────────────

  const handleNext = useCallback(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push(t('question_name'));
    if (!stripHtml(instructions)) {
      errs.push(t('editor.matching.error_instructions_required', { defaultValue: 'Question instructions are required.' }));
    }
    if (leftItems.length < 2) {
      errs.push(t('editor.matching.error_min_left_items', { defaultValue: 'At least 2 left items are required.' }));
    }
    if (rightItems.length < 2) {
      errs.push(t('editor.matching.error_min_right_items', { defaultValue: 'At least 2 right items are required.' }));
    }
    if (leftMode === 'text') {
      if (leftItems.some((item) => !item.text.trim())) {
        errs.push(t('editor.matching.error_empty_left_text', { defaultValue: 'All left items must have text.' }));
      }
    } else {
      if (leftItems.some((item) => !item.imageUrl)) {
        errs.push(t('editor.matching.error_empty_left_image', { defaultValue: 'All left items must have an image.' }));
      }
    }
    if (rightMode === 'text') {
      if (rightItems.some((item) => !item.text.trim())) {
        errs.push(t('editor.matching.error_empty_right_text', { defaultValue: 'All right items must have text.' }));
      }
    } else {
      if (rightItems.some((item) => !item.imageUrl)) {
        errs.push(t('editor.matching.error_empty_right_image', { defaultValue: 'All right items must have an image.' }));
      }
    }
    setStep1Errors(errs);
    if (errs.length === 0) setStep(1);
  }, [name, instructions, leftItems, rightItems, leftMode, rightMode, t]);

  // ── Step 2: chooser handlers ──────────────────────────────────────────────

  const openChooser = useCallback((leftIdx: number) => {
    setChooserLeftIdx(leftIdx);
    setChooserSelection([...leftItems[leftIdx].linkedRightIds]);
    setChooserOpen(true);
  }, [leftItems]);

  const handleChooserDone = useCallback(() => {
    if (chooserLeftIdx === null) return;
    setLeftItems((prev) =>
      prev.map((item, i) =>
        i === chooserLeftIdx ? { ...item, linkedRightIds: chooserSelection } : item,
      ),
    );
    setChooserOpen(false);
    setChooserLeftIdx(null);
  }, [chooserLeftIdx, chooserSelection]);

  const handleChooserCancel = useCallback(() => {
    setChooserOpen(false);
    setChooserLeftIdx(null);
  }, []);

  const toggleMultipleAnswers = useCallback((leftIdx: number) => {
    setLeftItems((prev) =>
      prev.map((item, i) => {
        if (i !== leftIdx) return item;
        const newMultiple = !item.multipleAnswers;
        return {
          ...item,
          multipleAnswers: newMultiple,
          linkedRightIds: newMultiple ? item.linkedRightIds : item.linkedRightIds.slice(0, 1),
        };
      }),
    );
  }, []);

  const removeLinkFromLeft = useCallback((leftIdx: number, rightId: string) => {
    setLeftItems((prev) =>
      prev.map((item, i) =>
        i === leftIdx
          ? { ...item, linkedRightIds: item.linkedRightIds.filter((id) => id !== rightId) }
          : item,
      ),
    );
  }, []);

  // ── Right items already linked (for disabling in chooser) ─────────────────

  const linkedRightIdsByOtherLeftItems = useMemo(() => {
    if (chooserLeftIdx === null) return new Set<string>();
    const ids = new Set<string>();
    leftItems.forEach((item, i) => {
      if (i !== chooserLeftIdx) {
        item.linkedRightIds.forEach((rid) => ids.add(rid));
      }
    });
    return ids;
  }, [leftItems, chooserLeftIdx]);

  // ── Save handler ──────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const errs: string[] = [];
    if (leftItems.some((item) => item.linkedRightIds.length === 0)) {
      errs.push(t('editor.matching.error_unlinked_items', { defaultValue: 'All left items must be linked to at least one right item.' }));
    }
    if (!autoDistribute) {
      const total = Math.round(leftItems.reduce((sum, item) => sum + item.markPercent, 0) * 100) / 100;
      if (Math.abs(total - 100) > 0.01) {
        errs.push(t('editor.matching.error_total_not_100', { defaultValue: 'Mark percentages must sum to 100.', total: Math.round(total * 100) / 100 }));
      }
    }
    if (penalty < 0) {
      errs.push(t('editor.matching.error_penalty_negative', { defaultValue: 'Penalty must be zero or positive.' }));
    }
    setStep2Errors(errs);
    if (errs.length > 0) return;

    const finalLeftItems = autoDistribute
      ? leftItems.map((item, i) => ({
          ...item,
          markPercent:
            i < leftItems.length - 1
              ? autoDistributedMark
              : Math.round((100 - autoDistributedMark * (leftItems.length - 1)) * 100) / 100,
        }))
      : leftItems;

    onSave({
      type: 'matching',
      name,
      mark,
      text: instructions,
      id: initialData?.id,
      matchingLeftItems: finalLeftItems,
      matchingRightItems: rightItems,
      matchingLeftMode: leftMode,
      matchingRightMode: rightMode,
      matchingAllowRightReuse: allowRightReuse,
      matchingAutoDistribute: autoDistribute,
      matchingPenalty: penalty,
      matchingJustification: justification,
      matchingJustificationFraction: justificationFraction,
      correctAnswerFeedback: correctFeedback,
      partiallyCorrectAnswerFeedback: partialFeedback,
      incorrectAnswerFeedback: incorrectFeedback,
    } as QuestionFormData);
  }, [
    leftItems, autoDistribute, autoDistributedMark, penalty, name, mark, instructions,
    rightItems, leftMode, rightMode, allowRightReuse, justification, justificationFraction,
    correctFeedback, partialFeedback, incorrectFeedback, initialData, onSave, t,
  ]);

  // ── Stepper click handler ─────────────────────────────────────────────────

  const handleStepClick = useCallback((targetStep: number) => {
    if (targetStep === step) return;
    if (targetStep === 0) {
      setStep(0);
    } else {
      handleNext();
    }
  }, [step, handleNext]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box className="flex flex-col gap-6 p-6">
      {/* Stepper */}
      <Stepper activeStep={step} alternativeLabel>
        <Step onClick={() => handleStepClick(0)} sx={{ cursor: 'pointer' }}>
          <StepLabel
            StepIconComponent={() => (
              <ListAltIcon color={step === 0 ? 'primary' : 'disabled'} />
            )}
          >
            {t('editor.matching.step_1_label', { defaultValue: 'Content' })}
          </StepLabel>
        </Step>
        <Step onClick={() => handleStepClick(1)} sx={{ cursor: 'pointer' }}>
          <StepLabel
            StepIconComponent={() => (
              <LinkIcon color={step === 1 ? 'primary' : 'disabled'} />
            )}
          >
            {t('editor.matching.step_2_label', { defaultValue: 'Matching' })}
          </StepLabel>
        </Step>
      </Stepper>

      {/* ── STEP 1 ──────────────────────────────────────────────────────── */}
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
              inputProps={{ min: 1, step: 1 }}
              style={{ width: 120 }}
            />
          </Box>

          {/* Question instructions */}
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
                onEditorChange={(val) => setInstructions(val)}
                init={editorInit}
              />
            </Box>
            {step1Errors.length > 0 && !stripHtml(instructions) && (
              <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
                {t('editor.matching.error_instructions_required', { defaultValue: 'Question instructions are required.' })}
              </Typography>
            )}
          </Box>

          {/* Justification */}
          <Box className="flex items-center gap-3 flex-wrap">
            <Box className="flex items-center gap-1">
              <Typography variant="body2" fontWeight={500}>
                {t('editor.text_classification.justification_label', { defaultValue: 'Justification' })}
              </Typography>
              <Select
                size="small"
                value={justification}
                onChange={(e) => setJustification(e.target.value as 'disabled' | 'optional' | 'required')}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="disabled">{t('editor.text_classification.justification_disabled', { defaultValue: 'Disabled' })}</MenuItem>
                <MenuItem value="optional">{t('editor.text_classification.justification_optional', { defaultValue: 'Optional' })}</MenuItem>
                <MenuItem value="required">{t('editor.text_classification.justification_required', { defaultValue: 'Required' })}</MenuItem>
              </Select>
            </Box>
            {justification !== 'disabled' && (
              <Box className="flex items-center gap-1">
                <Typography variant="body2" fontWeight={500}>
                  {t('editor.text_classification.justification_fraction_label', { defaultValue: 'Fraction' })}
                </Typography>
                <Select
                  size="small"
                  value={justificationFraction}
                  onChange={(e) => setJustificationFraction(Number(e.target.value))}
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

          {/* Feedback Settings */}
          <Accordion
            expanded={feedbackOpen}
            onChange={() => setFeedbackOpen((prev) => !prev)}
            disableGutters
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              '&::before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" fontWeight={500}>
                {t('editor.feedback_settings', { defaultValue: 'Feedback Settings' })}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Correct feedback */}
              <Box>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary' }}>
                  {t('editor.correct_feedback', { defaultValue: 'Correct feedback' })}
                </Typography>
                <Box
                  className="overflow-hidden"
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  }}
                >
                  <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    licenseKey="gpl"
                    value={correctFeedback}
                    onEditorChange={(val) => setCorrectFeedback(val)}
                    init={feedbackEditorInit}
                  />
                </Box>
              </Box>
              {/* Partial feedback */}
              <Box>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary' }}>
                  {t('editor.partial_feedback', { defaultValue: 'Partially correct feedback' })}
                </Typography>
                <Box
                  className="overflow-hidden"
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  }}
                >
                  <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    licenseKey="gpl"
                    value={partialFeedback}
                    onEditorChange={(val) => setPartialFeedback(val)}
                    init={feedbackEditorInit}
                  />
                </Box>
              </Box>
              {/* Incorrect feedback */}
              <Box>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary' }}>
                  {t('editor.incorrect_feedback', { defaultValue: 'Incorrect feedback' })}
                </Typography>
                <Box
                  className="overflow-hidden"
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  }}
                >
                  <Editor
                    tinymceScriptSrc="/tinymce/tinymce.min.js"
                    licenseKey="gpl"
                    value={incorrectFeedback}
                    onEditorChange={(val) => setIncorrectFeedback(val)}
                    init={feedbackEditorInit}
                  />
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Side-by-side panels */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            {/* ── Left choices panel ────────────────────────────────────── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box className="flex items-center justify-between">
                <Typography variant="subtitle2">
                  {t('editor.matching.left_choices', { defaultValue: 'Left choices' })}
                </Typography>
                <ToggleButtonGroup
                  value={leftMode}
                  exclusive
                  onChange={handleLeftModeChange}
                  size="small"
                >
                  <ToggleButton value="text">
                    {t('editor.matching.mode_text', { defaultValue: 'Text' })}
                  </ToggleButton>
                  <ToggleButton value="image">
                    {t('editor.matching.mode_media', { defaultValue: 'Media' })}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {leftModeSwitchWarning && (
                <Alert
                  severity="warning"
                  action={
                    <Box className="flex gap-1">
                      <Button size="small" color="inherit" onClick={cancelLeftModeSwitch}>
                        {t('no', { defaultValue: 'No' })}
                      </Button>
                      <Button size="small" color="warning" onClick={confirmLeftModeSwitch}>
                        {t('yes', { defaultValue: 'Yes' })}
                      </Button>
                    </Box>
                  }
                >
                  {t('editor.matching.mode_switch_warning', { defaultValue: 'Switching mode will clear all items on this side. Continue?' })}
                </Alert>
              )}

              {leftItems.map((item, idx) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '& .delete-btn': { opacity: 0, transition: 'opacity 0.2s' },
                    '&:hover .delete-btn': { opacity: 1 },
                  }}
                >
                  {leftMode === 'text' ? (
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={t('editor.matching.left_item_placeholder', { defaultValue: `Left item ${idx + 1}`, index: idx + 1 })}
                      value={item.text}
                      onChange={(e) => handleUpdateLeftItemText(idx, e.target.value)}
                    />
                  ) : (
                    <DropZone
                      hasImage={!!item.imageUrl}
                      onClick={() => leftFileRefs.current[item.id]?.click()}
                      onDragOver={(e: React.DragEvent) => e.preventDefault()}
                      onDrop={(e: React.DragEvent) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) handleLeftImageUpload(idx, file);
                      }}
                      sx={{ flex: 1 }}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={`Left ${idx + 1}`} />
                      ) : (
                        <>
                          <ImageOutlinedIcon sx={{ color: 'text.secondary', fontSize: 32 }} />
                          <Typography variant="caption" color="text.secondary">
                            {t('editor.image_classification.upload_placeholder', { defaultValue: 'Drop image or click to browse' })}
                          </Typography>
                        </>
                      )}
                      <input
                        ref={(el) => { leftFileRefs.current[item.id] = el; }}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLeftImageUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                    </DropZone>
                  )}
                  <IconButton
                    className="delete-btn"
                    size="small"
                    disabled={leftItems.length <= 2}
                    onClick={() => handleDeleteLeftItem(idx)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Button
                startIcon={<AddIcon />}
                size="small"
                variant="text"
                onClick={handleAddLeftItem}
              >
                {t('editor.matching.add_left_item', { defaultValue: '+ Add left item' })}
              </Button>
            </Box>

            {/* ── Right choices panel ───────────────────────────────────── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box className="flex items-center justify-between">
                <Typography variant="subtitle2">
                  {t('editor.matching.right_choices', { defaultValue: 'Right choices' })}
                </Typography>
                <ToggleButtonGroup
                  value={rightMode}
                  exclusive
                  onChange={handleRightModeChange}
                  size="small"
                >
                  <ToggleButton value="text">
                    {t('editor.matching.mode_text', { defaultValue: 'Text' })}
                  </ToggleButton>
                  <ToggleButton value="image">
                    {t('editor.matching.mode_media', { defaultValue: 'Media' })}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {rightModeSwitchWarning && (
                <Alert
                  severity="warning"
                  action={
                    <Box className="flex gap-1">
                      <Button size="small" color="inherit" onClick={cancelRightModeSwitch}>
                        {t('no', { defaultValue: 'No' })}
                      </Button>
                      <Button size="small" color="warning" onClick={confirmRightModeSwitch}>
                        {t('yes', { defaultValue: 'Yes' })}
                      </Button>
                    </Box>
                  }
                >
                  {t('editor.matching.mode_switch_warning', { defaultValue: 'Switching mode will clear all items on this side. Continue?' })}
                </Alert>
              )}

              {rightItems.map((item, idx) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '& .delete-btn': { opacity: 0, transition: 'opacity 0.2s' },
                    '&:hover .delete-btn': { opacity: 1 },
                  }}
                >
                  {rightMode === 'text' ? (
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={t('editor.matching.right_item_placeholder', { defaultValue: `Right item ${idx + 1}`, index: idx + 1 })}
                      value={item.text}
                      onChange={(e) => handleUpdateRightItemText(idx, e.target.value)}
                    />
                  ) : (
                    <DropZone
                      hasImage={!!item.imageUrl}
                      onClick={() => rightFileRefs.current[item.id]?.click()}
                      onDragOver={(e: React.DragEvent) => e.preventDefault()}
                      onDrop={(e: React.DragEvent) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) handleRightImageUpload(idx, file);
                      }}
                      sx={{ flex: 1 }}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={`Right ${idx + 1}`} />
                      ) : (
                        <>
                          <ImageOutlinedIcon sx={{ color: 'text.secondary', fontSize: 32 }} />
                          <Typography variant="caption" color="text.secondary">
                            {t('editor.image_classification.upload_placeholder', { defaultValue: 'Drop image or click to browse' })}
                          </Typography>
                        </>
                      )}
                      <input
                        ref={(el) => { rightFileRefs.current[item.id] = el; }}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleRightImageUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                    </DropZone>
                  )}
                  <IconButton
                    className="delete-btn"
                    size="small"
                    disabled={rightItems.length <= 2}
                    onClick={() => handleDeleteRightItem(idx)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Button
                startIcon={<AddIcon />}
                size="small"
                variant="text"
                onClick={handleAddRightItem}
              >
                {t('editor.matching.add_right_item', { defaultValue: '+ Add right item' })}
              </Button>
            </Box>
          </Box>

          {/* Nav */}
          <Box className="flex justify-end gap-3 pt-2">
            <Button variant="outlined" color="inherit" onClick={onCancel}>
              {t('cancel')}
            </Button>
            <Button variant="contained" onClick={handleNext}>
              {t('editor.matching.step_2_label', { defaultValue: 'Matching' })} →
            </Button>
          </Box>
        </Box>
      )}

      {/* ── STEP 2 ──────────────────────────────────────────────────────── */}
      {step === 1 && (
        <Box className="flex flex-col gap-4">
          {step2Errors.length > 0 && (
            <Alert severity="error">
              <ul className="m-0 ps-4">
                {step2Errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Global options row */}
          <Box className="flex items-center gap-4 flex-wrap">
            <TextField
              label={t('editor.matching.penalty_label', { defaultValue: 'Penalty per wrong pair (%)' })}
              type="number"
              size="small"
              value={penalty}
              onChange={(e) => setPenalty(Number(e.target.value))}
              inputProps={{ min: 0, step: 1 }}
              sx={{ width: 220 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={allowRightReuse}
                  onChange={(e) => setAllowRightReuse(e.target.checked)}
                  size="small"
                />
              }
              label={t('editor.matching.allow_right_reuse', { defaultValue: 'Allow right items to be reused' })}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={autoDistribute}
                  onChange={(e) => setAutoDistribute(e.target.checked)}
                  size="small"
                />
              }
              label={t('editor.matching.auto_distribute', { defaultValue: 'Auto-distribute marks equally' })}
            />
          </Box>

          {/* Per-left-item rows */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {leftItems.map((leftItem, leftIdx) => {
              const linkedRights = rightItems.filter((r) => leftItem.linkedRightIds.includes(r.id));
              const hasLinks = linkedRights.length > 0;

              return (
                <Box
                  key={leftItem.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    p: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.background.paper, 0.5),
                  }}
                >
                  {/* Left item preview */}
                  <Box
                    sx={{
                      minWidth: 100,
                      maxWidth: 140,
                      p: 1,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      backgroundColor: theme.palette.background.paper,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {leftMode === 'text' ? (
                      <Typography variant="body2" noWrap>
                        {leftItem.text || `Item ${leftIdx + 1}`}
                      </Typography>
                    ) : (
                      leftItem.imageUrl ? (
                        <img
                          src={leftItem.imageUrl}
                          alt={`Left ${leftIdx + 1}`}
                          style={{ width: 60, height: 50, objectFit: 'contain' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {t('editor.matching.no_image', { defaultValue: 'No image' })}
                        </Typography>
                      )
                    )}
                  </Box>

                  {/* Link / Edit button */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' }}>
                    <Button
                      variant={hasLinks ? 'outlined' : 'contained'}
                      size="small"
                      onClick={() => openChooser(leftIdx)}
                    >
                      {hasLinks
                        ? t('editor.matching.edit_links', { defaultValue: 'Edit links' })
                        : t('editor.matching.link_items', { defaultValue: 'Link items' })}
                    </Button>

                    {/* Multiple answers toggle */}
                    <Tooltip title={t('editor.matching.multiple_answers_toggle_tooltip', { defaultValue: 'Toggle multiple answers' })}>
                      <IconButton
                        size="small"
                        color={leftItem.multipleAnswers ? 'primary' : 'default'}
                        onClick={() => toggleMultipleAnswers(leftIdx)}
                      >
                        <AccountTreeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Connection visualization */}
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {!hasLinks ? (
                      <Box
                        sx={{
                          border: `1px dashed ${theme.palette.grey[400]}`,
                          borderRadius: 1,
                          p: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {t('editor.matching.no_links_hint', { defaultValue: 'No right items linked yet' })}
                        </Typography>
                      </Box>
                    ) : (
                      linkedRights.map((rightItem) => (
                        <Box
                          key={rightItem.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 1,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            backgroundColor: theme.palette.background.paper,
                          }}
                        >
                          {rightMode === 'text' ? (
                            <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                              {rightItem.text}
                            </Typography>
                          ) : (
                            rightItem.imageUrl ? (
                              <img
                                src={rightItem.imageUrl}
                                alt={rightItem.text || 'Right item'}
                                style={{ width: 60, height: 50, objectFit: 'contain', flex: '0 0 auto' }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                                {t('editor.matching.no_image', { defaultValue: 'No image' })}
                              </Typography>
                            )
                          )}
                          <IconButton
                            size="small"
                            onClick={() => removeLinkFromLeft(leftIdx, rightItem.id)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))
                    )}
                  </Box>

                  {/* Mark % field (only when autoDistribute OFF) */}
                  {!autoDistribute && (
                    <TextField
                      size="small"
                      type="number"
                      label={t('mark', { defaultValue: 'Mark' }) + ' %'}
                      value={leftItem.markPercent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setLeftItems((prev) =>
                          prev.map((item, i) => i === leftIdx ? { ...item, markPercent: val } : item),
                        );
                      }}
                      inputProps={{ min: 0, max: 100, step: 0.01 }}
                      sx={{ width: 100 }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Nav */}
          <Box className="flex justify-between pt-2">
            <Button variant="outlined" color="inherit" onClick={() => setStep(0)}>
              ← {t('editor.matching.step_1_label')}
            </Button>
            <Button variant="contained" onClick={handleSave}>
              {t('editor.matching.step_2_label')} ✓
            </Button>
          </Box>
        </Box>
      )}

      {/* ── Choose matching items dialog ────────────────────────────────── */}
      <Dialog
        open={chooserOpen}
        onClose={handleChooserCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { maxWidth: 400 } }}
      >
        <DialogTitle>
          {t('editor.matching.choose_matching_title', { defaultValue: 'Choose matching items' })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('editor.matching.choose_matching_hint', { defaultValue: 'Select the right item(s) that match this left item.' })}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {rightItems.map((rightItem) => {
              const currentLeft = chooserLeftIdx !== null ? leftItems[chooserLeftIdx] : null;
              const isMultiple = currentLeft?.multipleAnswers ?? false;
              const isSelected = chooserSelection.includes(rightItem.id);
              const isLinkedElsewhere = linkedRightIdsByOtherLeftItems.has(rightItem.id);
              const isDisabled = !allowRightReuse && isLinkedElsewhere && !isSelected;

              return (
                <Box
                  key={rightItem.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    border: `1px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
                    borderRadius: 1,
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    backgroundColor: isSelected
                      ? alpha(theme.palette.primary.main, 0.06)
                      : 'transparent',
                  }}
                  onClick={() => {
                    if (isDisabled) return;
                    if (isMultiple) {
                      setChooserSelection((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== rightItem.id)
                          : [...prev, rightItem.id],
                      );
                    } else {
                      setChooserSelection(isSelected ? [] : [rightItem.id]);
                    }
                  }}
                >
                  {isMultiple ? (
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      size="small"
                      sx={{ p: 0.5 }}
                    />
                  ) : (
                    <Radio
                      checked={isSelected}
                      disabled={isDisabled}
                      size="small"
                      sx={{ p: 0.5 }}
                    />
                  )}
                  {rightMode === 'text' ? (
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {rightItem.text}
                    </Typography>
                  ) : (
                    rightItem.imageUrl ? (
                      <img
                        src={rightItem.imageUrl}
                        alt={rightItem.text || 'Right item'}
                        style={{ width: 60, height: 50, objectFit: 'contain' }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {t('editor.matching.no_image', { defaultValue: 'No image' })}
                      </Typography>
                    )
                  )}
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleChooserCancel} color="inherit">
            {t('cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            onClick={handleChooserDone}
            variant="contained"
            disabled={chooserSelection.length === 0}
          >
            {t('done', { defaultValue: 'Done' })}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default memo(MatchingWizard);
