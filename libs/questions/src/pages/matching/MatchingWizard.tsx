import React, {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, Image as ImageIcon, ChevronDown, GitBranch } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import type { Editor as TinyMCEEditor } from 'tinymce';
import { useTranslation } from 'react-i18next';
import {
  cn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@item-bank/ui';
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

// ─── Props ────────────────────────────────────────────────────────────────────

type MatchingWizardProps = {
  onSave: (data: QuestionFormData) => void;
  onCancel: () => void;
  initialData?: QuestionFormData;
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

function MatchingWizard({ onSave, onCancel, initialData }: MatchingWizardProps) {
  const { t, i18n } = useTranslation('questions');
  const isDark = document.documentElement.classList.contains('dark');

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

  const handleLeftModeChange = useCallback((val: 'text' | 'image') => {
    if (val === leftMode) return;
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

  const handleRightModeChange = useCallback((val: 'text' | 'image') => {
    if (val === rightMode) return;
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
      errs.push(t('editor.matching.error_instructions_required'));
    }
    if (leftItems.length < 2) {
      errs.push(t('editor.matching.error_min_left_items'));
    }
    if (rightItems.length < 2) {
      errs.push(t('editor.matching.error_min_right_items'));
    }
    if (leftMode === 'text') {
      if (leftItems.some((item) => !item.text.trim())) {
        errs.push(t('editor.matching.error_empty_left_text'));
      }
    } else {
      if (leftItems.some((item) => !item.imageUrl)) {
        errs.push(t('editor.matching.error_empty_left_image'));
      }
    }
    if (rightMode === 'text') {
      if (rightItems.some((item) => !item.text.trim())) {
        errs.push(t('editor.matching.error_empty_right_text'));
      }
    } else {
      if (rightItems.some((item) => !item.imageUrl)) {
        errs.push(t('editor.matching.error_empty_right_image'));
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
      errs.push(t('editor.matching.error_unlinked_items'));
    }
    if (!autoDistribute) {
      const total = Math.round(leftItems.reduce((sum, item) => sum + item.markPercent, 0) * 100) / 100;
      if (Math.abs(total - 100) > 0.01) {
        errs.push(t('editor.matching.error_total_not_100', { total: Math.round(total * 100) / 100 }));
      }
    }
    if (penalty < 0) {
      errs.push(t('editor.matching.error_penalty_negative'));
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

  // ── Steps definition ──────────────────────────────────────────────────────

  const steps = [
    t('editor.matching.step_1_label'),
    t('editor.matching.step_2_label'),
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Step bar */}
      <div className="flex items-center gap-0 mb-6">
        {steps.map((stepLabel, i) => (
          <React.Fragment key={i}>
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleStepClick(i)}
            >
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'border-2 border-primary bg-primary/10 text-primary' :
                'border-2 border-border bg-muted text-muted-foreground'
              )}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span className={cn(
                'text-xs font-medium hidden sm:block',
                i === step ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {stepLabel}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2 rounded-full',
                i < step ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1 ──────────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="flex flex-col gap-5">
          {step1Errors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
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
              min={1}
              step={1}
              className="w-[120px]"
            />
          </div>

          {/* Question instructions */}
          <div>
            <span className="block mb-1 text-xs font-medium text-muted-foreground">
              {t('question_text')} <span className="text-destructive">*</span>
            </span>
            <div className={cn(
              'overflow-hidden rounded-xl border',
              isDark ? 'border-primary/60' : 'border-border'
            )}>
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
            </div>
            {step1Errors.length > 0 && !stripHtml(instructions) && (
              <span className="mt-0.5 block text-xs text-destructive">
                {t('editor.matching.error_instructions_required')}
              </span>
            )}
          </div>

          {/* Justification */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <p className="text-sm font-medium text-foreground">
                {t('editor.text_classification.justification_label')}
              </p>
              <Select
                value={justification}
                onValueChange={(val) => setJustification(val as 'disabled' | 'optional' | 'required')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">{t('editor.text_classification.justification_disabled')}</SelectItem>
                  <SelectItem value="optional">{t('editor.text_classification.justification_optional')}</SelectItem>
                  <SelectItem value="required">{t('editor.text_classification.justification_required')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {justification !== 'disabled' && (
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-foreground">
                  {t('editor.text_classification.justification_fraction_label')}
                </p>
                <Select
                  value={String(justificationFraction)}
                  onValueChange={(val) => setJustificationFraction(Number(val))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JUSTIFICATION_FRACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt} %
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Feedback Settings accordion */}
          <div className="rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setFeedbackOpen((prev) => !prev)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('editor.feedback_settings')}
              <ChevronDown
                size={16}
                className={cn('transition-transform text-muted-foreground', feedbackOpen && 'rotate-180')}
              />
            </button>
            {feedbackOpen && (
              <div className="flex flex-col gap-4 px-4 pb-4 border-t border-border pt-4">
                {/* Correct feedback */}
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t('editor.correct_feedback')}
                  </span>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Editor
                      tinymceScriptSrc="/tinymce/tinymce.min.js"
                      licenseKey="gpl"
                      value={correctFeedback}
                      onEditorChange={(val) => setCorrectFeedback(val)}
                      init={feedbackEditorInit}
                    />
                  </div>
                </div>
                {/* Partial feedback */}
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t('editor.partial_feedback')}
                  </span>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Editor
                      tinymceScriptSrc="/tinymce/tinymce.min.js"
                      licenseKey="gpl"
                      value={partialFeedback}
                      onEditorChange={(val) => setPartialFeedback(val)}
                      init={feedbackEditorInit}
                    />
                  </div>
                </div>
                {/* Incorrect feedback */}
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">
                    {t('editor.incorrect_feedback')}
                  </span>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Editor
                      tinymceScriptSrc="/tinymce/tinymce.min.js"
                      licenseKey="gpl"
                      value={incorrectFeedback}
                      onEditorChange={(val) => setIncorrectFeedback(val)}
                      init={feedbackEditorInit}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side-by-side panels */}
          <div className="grid grid-cols-2 gap-6">
            {/* ── Left choices panel ────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  {t('editor.matching.left_choices')}
                </h3>
                {/* Mode toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => handleLeftModeChange('text')}
                    className={cn(
                      'px-3 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      leftMode === 'text'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {t('editor.matching.mode_text')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLeftModeChange('image')}
                    className={cn(
                      'px-3 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      leftMode === 'image'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {t('editor.matching.mode_media')}
                  </button>
                </div>
              </div>

              {leftModeSwitchWarning && (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
                  <p className="text-foreground mb-2">
                    {t('editor.matching.mode_switch_warning')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelLeftModeSwitch}
                      className="px-3 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t('no')}
                    </button>
                    <button
                      type="button"
                      onClick={confirmLeftModeSwitch}
                      className="px-3 py-1 text-xs font-medium rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t('yes')}
                    </button>
                  </div>
                </div>
              )}

              {leftItems.map((item, idx) => (
                <div key={item.id} className="group flex items-center gap-2">
                  {leftMode === 'text' ? (
                    <Input
                      placeholder={t('editor.matching.left_item_placeholder', { index: idx + 1 })}
                      value={item.text}
                      onChange={(e) => handleUpdateLeftItemText(idx, e.target.value)}
                      className="flex-1"
                    />
                  ) : (
                    /* Drop zone for image mode */
                    <div
                      className={cn(
                        'relative flex-1 h-[140px] rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors',
                        item.imageUrl
                          ? 'border-none'
                          : 'border-2 border-dashed border-border hover:border-primary/40 bg-muted/50'
                      )}
                      onClick={() => leftFileRefs.current[item.id]?.click()}
                      onDragOver={(e: React.DragEvent) => e.preventDefault()}
                      onDrop={(e: React.DragEvent) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) handleLeftImageUpload(idx, file);
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={`Left ${idx + 1}`}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <>
                          <ImageIcon size={32} className="text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {t('editor.image_classification.upload_placeholder')}
                          </span>
                        </>
                      )}
                      <input
                        ref={(el) => { leftFileRefs.current[item.id] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLeftImageUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={leftItems.length <= 2}
                    onClick={() => handleDeleteLeftItem(idx)}
                    aria-label={t('delete')}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={15} className="text-muted-foreground" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddLeftItem}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus size={15} />
                {t('editor.matching.add_left_item')}
              </button>
            </div>

            {/* ── Right choices panel ───────────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  {t('editor.matching.right_choices')}
                </h3>
                {/* Mode toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => handleRightModeChange('text')}
                    className={cn(
                      'px-3 py-1.5 font-medium transition-colors',
                      rightMode === 'text'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {t('editor.matching.mode_text')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRightModeChange('image')}
                    className={cn(
                      'px-3 py-1.5 font-medium transition-colors',
                      rightMode === 'image'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {t('editor.matching.mode_media')}
                  </button>
                </div>
              </div>

              {rightModeSwitchWarning && (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
                  <p className="text-foreground mb-2">
                    {t('editor.matching.mode_switch_warning')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelRightModeSwitch}
                      className="px-3 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t('no')}
                    </button>
                    <button
                      type="button"
                      onClick={confirmRightModeSwitch}
                      className="px-3 py-1 text-xs font-medium rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t('yes')}
                    </button>
                  </div>
                </div>
              )}

              {rightItems.map((item, idx) => (
                <div key={item.id} className="group flex items-center gap-2">
                  {rightMode === 'text' ? (
                    <Input
                      placeholder={t('editor.matching.right_item_placeholder', { index: idx + 1 })}
                      value={item.text}
                      onChange={(e) => handleUpdateRightItemText(idx, e.target.value)}
                      className="flex-1"
                    />
                  ) : (
                    /* Drop zone for image mode */
                    <div
                      className={cn(
                        'relative flex-1 h-[140px] rounded-lg cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors',
                        item.imageUrl
                          ? 'border-none'
                          : 'border-2 border-dashed border-border hover:border-primary/40 bg-muted/50'
                      )}
                      onClick={() => rightFileRefs.current[item.id]?.click()}
                      onDragOver={(e: React.DragEvent) => e.preventDefault()}
                      onDrop={(e: React.DragEvent) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) handleRightImageUpload(idx, file);
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={`Right ${idx + 1}`}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <>
                          <ImageIcon size={32} className="text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {t('editor.image_classification.upload_placeholder')}
                          </span>
                        </>
                      )}
                      <input
                        ref={(el) => { rightFileRefs.current[item.id] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleRightImageUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={rightItems.length <= 2}
                    onClick={() => handleDeleteRightItem(idx)}
                    aria-label={t('delete')}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={15} className="text-muted-foreground" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddRightItem}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus size={15} />
                {t('editor.matching.add_right_item')}
              </button>
            </div>
          </div>

          {/* Step 1 nav */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('editor.matching.step_2_label')}
              <ChevronRight size={15} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ──────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {step2Errors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <ul className="m-0 ps-4">
                {step2Errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Global options row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('editor.matching.penalty_label')}
              </label>
              <Input
                type="number"
                value={penalty}
                onChange={(e) => setPenalty(Number(e.target.value))}
                min={0}
                step={1}
                className="w-[220px]"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={allowRightReuse}
                onChange={(e) => setAllowRightReuse(e.target.checked)}
              />
              <div className="w-9 h-5 rounded-full transition-colors bg-[hsl(var(--toggle-track))] peer-checked:bg-primary relative shrink-0">
                <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
              </div>
              <span className="text-sm text-foreground">
                {t('editor.matching.allow_right_reuse')}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoDistribute}
                onChange={(e) => setAutoDistribute(e.target.checked)}
              />
              <div className="w-4 h-4 rounded border border-border peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center shrink-0">
                {autoDistribute && <Check size={10} className="text-primary-foreground" />}
              </div>
              <span className="text-sm text-foreground">
                {t('editor.matching.auto_distribute')}
              </span>
            </label>
          </div>

          {/* Per-left-item rows */}
          <div className="flex flex-col gap-3">
            {leftItems.map((leftItem, leftIdx) => {
              const linkedRights = rightItems.filter((r) => leftItem.linkedRightIds.includes(r.id));
              const hasLinks = linkedRights.length > 0;

              return (
                <div
                  key={leftItem.id}
                  className="flex items-start gap-3 p-3 border border-border rounded-xl bg-muted/20"
                >
                  {/* Left item preview */}
                  <div className="min-w-[100px] max-w-[140px] p-2 border border-border rounded-lg bg-card flex items-center justify-center">
                    {leftMode === 'text' ? (
                      <p className="text-sm text-foreground truncate">
                        {leftItem.text || `Item ${leftIdx + 1}`}
                      </p>
                    ) : (
                      leftItem.imageUrl ? (
                        <img
                          src={leftItem.imageUrl}
                          alt={`Left ${leftIdx + 1}`}
                          className="w-[60px] h-[50px] object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t('editor.matching.no_image')}
                        </span>
                      )
                    )}
                  </div>

                  {/* Link / Edit button + multiple answers toggle */}
                  <div className="flex flex-col gap-2 items-start">
                    <button
                      type="button"
                      onClick={() => openChooser(leftIdx)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                        hasLinks
                          ? 'border-primary text-primary hover:bg-primary/10'
                          : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                      )}
                    >
                      {hasLinks
                        ? t('editor.matching.edit_links')
                        : t('editor.matching.link_items')}
                    </button>

                    {/* Multiple answers toggle */}
                    <button
                      type="button"
                      title={t('editor.matching.multiple_answers_toggle_tooltip')}
                      aria-label={t('editor.matching.multiple_answers_toggle_tooltip')}
                      onClick={() => toggleMultipleAnswers(leftIdx)}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        leftItem.multipleAnswers
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <GitBranch size={15} />
                    </button>
                  </div>

                  {/* Connection visualization */}
                  <div className="flex-1 flex flex-col gap-2">
                    {!hasLinks ? (
                      <div className="border border-dashed border-border rounded-lg p-4 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          {t('editor.matching.no_links_hint')}
                        </span>
                      </div>
                    ) : (
                      linkedRights.map((rightItem) => (
                        <div
                          key={rightItem.id}
                          className="flex items-center gap-2 p-2 border border-border rounded-lg bg-card"
                        >
                          {rightMode === 'text' ? (
                            <p className="text-sm text-foreground flex-1 truncate">
                              {rightItem.text}
                            </p>
                          ) : (
                            rightItem.imageUrl ? (
                              <img
                                src={rightItem.imageUrl}
                                alt={rightItem.text || 'Right item'}
                                className="w-[60px] h-[50px] object-contain shrink-0"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground flex-1">
                                {t('editor.matching.no_image')}
                              </span>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => removeLinkFromLeft(leftIdx, rightItem.id)}
                            aria-label={t('delete')}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                          >
                            <Trash2 size={13} className="text-muted-foreground" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Mark % field (only when autoDistribute OFF) */}
                  {!autoDistribute && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <label className="text-xs font-medium text-muted-foreground">
                        {t('mark')} %
                      </label>
                      <Input
                        type="number"
                        value={leftItem.markPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setLeftItems((prev) =>
                            prev.map((item, i) => i === leftIdx ? { ...item, markPercent: val } : item),
                          );
                        }}
                        min={0}
                        max={100}
                        step={0.01}
                        className="w-[100px]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 2 nav */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ChevronLeft size={15} className="rtl:rotate-180" />
              {t('editor.matching.step_1_label')}
            </button>
            <button
              type="submit"
              onClick={handleSave}
              className="px-6 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('common:save')}
            </button>
          </div>
        </div>
      )}

      {/* ── Choose matching items dialog ────────────────────────────────── */}
      <Dialog open={chooserOpen} onOpenChange={(open) => { if (!open) handleChooserCancel(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('editor.matching.choose_matching_title')}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground mb-2">
            {t('editor.matching.choose_matching_hint')}
          </p>

          <div className="flex flex-col gap-2">
            {rightItems.map((rightItem) => {
              const currentLeft = chooserLeftIdx !== null ? leftItems[chooserLeftIdx] : null;
              const isMultiple = currentLeft?.multipleAnswers ?? false;
              const isSelected = chooserSelection.includes(rightItem.id);
              const isLinkedElsewhere = linkedRightIdsByOtherLeftItems.has(rightItem.id);
              const isDisabled = !allowRightReuse && isLinkedElsewhere && !isSelected;

              return (
                <div
                  key={rightItem.id}
                  role={isMultiple ? 'checkbox' : 'radio'}
                  aria-checked={isSelected}
                  tabIndex={isDisabled ? -1 : 0}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSelected ? 'border-primary bg-primary/6' : 'border-border',
                    isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  )}
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
                  onKeyDown={(e) => {
                    if ((e.key === ' ' || e.key === 'Enter') && !isDisabled) {
                      e.preventDefault();
                      if (isMultiple) {
                        setChooserSelection((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== rightItem.id)
                            : [...prev, rightItem.id],
                        );
                      } else {
                        setChooserSelection(isSelected ? [] : [rightItem.id]);
                      }
                    }
                  }}
                >
                  {/* Radio/checkbox indicator */}
                  {isMultiple ? (
                    <div className={cn(
                      'w-4 h-4 rounded border shrink-0 flex items-center justify-center',
                      isSelected ? 'bg-primary border-primary' : 'border-border'
                    )}>
                      {isSelected && <Check size={10} className="text-primary-foreground" />}
                    </div>
                  ) : (
                    <div className={cn(
                      'w-4 h-4 rounded-full border shrink-0 flex items-center justify-center',
                      isSelected ? 'border-primary' : 'border-border'
                    )}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                  )}
                  {rightMode === 'text' ? (
                    <p className="text-sm text-foreground flex-1">
                      {rightItem.text}
                    </p>
                  ) : (
                    rightItem.imageUrl ? (
                      <img
                        src={rightItem.imageUrl}
                        alt={rightItem.text || 'Right item'}
                        className="w-[60px] h-[50px] object-contain"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t('editor.matching.no_image')}
                      </span>
                    )
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={handleChooserCancel}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleChooserDone}
              disabled={chooserSelection.length === 0}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('done')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(MatchingWizard);
