import { memo, useState, useCallback, useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus, Megaphone, ImagePlus } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Editor } from '@tinymce/tinymce-react';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@item-bank/ui';
import type { QuestionFormData } from '../../components/QuestionEditorShell';
import { useImageUpload } from '../../domain/hooks/useImageUpload';

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

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3 MB

const JUSTIFICATION_FRACTION_OPTIONS = [
  100, 90, 80, 75, 70, 60, 50, 40, 33.3, 30, 25, 20, 15, 10, 5, 0,
];

function ImageClassificationEditor() {
  const { watch, setValue, formState: { isSubmitted } } = useFormContext<QuestionFormData>();
  const { t, i18n } = useTranslation(['questions', 'common']);
  const { uploadFile, isUploading } = useImageUpload();

  // Determine dark mode from document class list
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const colorOptions: { value: TextClassificationColor; label: string }[] = [
    { value: 'blue', label: t('editor.text_classification.color_blue') },
    { value: 'orange', label: t('editor.text_classification.color_orange') },
    { value: 'green', label: t('editor.text_classification.color_green') },
    { value: 'red', label: t('editor.text_classification.color_red') },
    { value: 'purple', label: t('editor.text_classification.color_purple') },
    { value: 'pink', label: t('editor.text_classification.color_pink') },
    { value: 'dark-orange', label: t('editor.text_classification.color_dark_orange') },
  ];

  const categories = watch('imageClassificationCategories') ?? [];
  const layout = watch('textClassificationLayout') ?? 'columns';
  const autoDistribute = watch('textClassificationAutoDistribute') ?? true;
  const justification = watch('textClassificationJustification') ?? 'disabled';
  const justificationFraction = watch('textClassificationJustificationFraction') ?? 30;

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach((cat) => { initial[cat.id] = true; });
    return initial;
  });
  const [feedbackToggles, setFeedbackToggles] = useState<Record<string, boolean>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-distributed mark percent per answer
  const autoDistributedMark = useMemo(() => {
    const totalAnswers = categories.reduce((sum, cat) => sum + cat.answers.length, 0);
    if (totalAnswers === 0) return 0;
    return Math.round((100 / totalAnswers) * 100) / 100;
  }, [categories]);

  // Validation errors (only shown after first submit attempt)
  const validationErrors = useMemo(() => {
    if (!isSubmitted) return [];
    const errs: string[] = [];
    if (categories.length < 2) {
      errs.push(t('editor.text_classification.error_min_categories'));
    }
    categories.forEach((cat) => {
      if (!cat.name?.trim()) {
        errs.push(t('editor.text_classification.error_empty_categories'));
      }
    });
    const allAnswers = categories.flatMap(c => c.answers);
    if (allAnswers.some(a => !a.imageUrl)) {
      errs.push(t('editor.image_classification.error_image_required'));
    }
    if (!autoDistribute) {
      const total = allAnswers.reduce((sum, a) => sum + a.markPercent, 0);
      if (Math.abs(total - 100) > 0.01) {
        errs.push(t('editor.text_classification.error_total_not_100', { total: Math.round(total * 100) / 100 }));
      }
    }
    return [...new Set(errs)];
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
    setValue('imageClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const updateAnswer = useCallback((catIndex: number, ansIndex: number, field: string, value: unknown) => {
    const updated = [...categories];
    const answers = [...updated[catIndex].answers];
    (answers[ansIndex] as Record<string, unknown>)[field] = value;
    updated[catIndex] = { ...updated[catIndex], answers };
    setValue('imageClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const addCategory = useCallback(() => {
    const newCat = {
      id: crypto.randomUUID(),
      name: '',
      color: 'blue' as const,
      answers: [] as Array<{ id: string; imageUrl: string; feedback: string; markPercent: number }>,
    };
    const updated = [...categories, newCat];
    setValue('imageClassificationCategories', updated, { shouldDirty: true });
    setExpandedCategories(prev => ({ ...prev, [newCat.id]: true }));
  }, [categories, setValue]);

  const removeCategory = useCallback((index: number) => {
    const updated = categories.filter((_, i) => i !== index);
    setValue('imageClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const addAnswer = useCallback((catIndex: number) => {
    const updated = [...categories];
    const newAnswer = {
      id: crypto.randomUUID(),
      imageUrl: '',
      feedback: '',
      markPercent: 0,
    };
    updated[catIndex] = {
      ...updated[catIndex],
      answers: [...updated[catIndex].answers, newAnswer],
    };
    setValue('imageClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const removeAnswer = useCallback((catIndex: number, ansIndex: number) => {
    const updated = [...categories];
    updated[catIndex] = {
      ...updated[catIndex],
      answers: updated[catIndex].answers.filter((_, i) => i !== ansIndex),
    };
    setValue('imageClassificationCategories', updated, { shouldDirty: true });
  }, [categories, setValue]);

  const handleFileDrop = useCallback(
    async (catIndex: number, ansIndex: number, file: File, answerId: string) => {
      setAnswerErrors(prev => ({ ...prev, [answerId]: '' }));

      if (!file.type.startsWith('image/')) {
        setAnswerErrors(prev => ({
          ...prev,
          [answerId]: t('editor.image_classification.error_invalid_file_type'),
        }));
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setAnswerErrors(prev => ({
          ...prev,
          [answerId]: t('editor.image_classification.error_image_too_large'),
        }));
        return;
      }
      try {
        const cdnUrl = await uploadFile(file);
        updateAnswer(catIndex, ansIndex, 'imageUrl', cdnUrl);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Image upload failed';
        setAnswerErrors(prev => ({ ...prev, [answerId]: message }));
      }
    },
    [t, updateAnswer, uploadFile],
  );

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
    <div className="flex flex-col gap-5">
      {/* Justification */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {t('editor.text_classification.justification_label')}
          </p>
          <Select
            value={justification}
            onValueChange={(value) =>
              setValue('textClassificationJustification', value as 'disabled' | 'optional' | 'required', { shouldDirty: true })
            }
          >
            <SelectTrigger className="w-[160px]">
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
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {t('editor.text_classification.justification_fraction_label')}
            </p>
            <Select
              value={String(justificationFraction)}
              onValueChange={(value) =>
                setValue('textClassificationJustificationFraction', Number(value), { shouldDirty: true })
              }
            >
              <SelectTrigger className="w-[110px]">
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

      {/* Layout + Auto-distribute row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {t('editor.text_classification.layout_label')}
          </p>
          <div className="flex items-center gap-3" role="radiogroup">
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-foreground">
              <input
                type="radio"
                name="ic-layout"
                value="columns"
                checked={layout === 'columns'}
                onChange={() => setValue('textClassificationLayout', 'columns', { shouldDirty: true })}
                className="accent-primary"
              />
              {t('editor.text_classification.layout_columns')}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm text-foreground">
              <input
                type="radio"
                name="ic-layout"
                value="rows"
                checked={layout === 'rows'}
                onChange={() => setValue('textClassificationLayout', 'rows', { shouldDirty: true })}
                className="accent-primary"
              />
              {t('editor.text_classification.layout_rows')}
            </label>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
          <input
            type="checkbox"
            checked={autoDistribute}
            onChange={(e) => setValue('textClassificationAutoDistribute', e.target.checked, { shouldDirty: true })}
            className="accent-primary"
          />
          {t('editor.text_classification.auto_distribute')}
        </label>
      </div>

      {/* Validation error banner */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 flex flex-col gap-1">
          {validationErrors.map((err, i) => (
            <p key={i} className="text-sm text-destructive">{err}</p>
          ))}
        </div>
      )}

      {/* Categories list */}
      {categories.map((category, catIndex) => (
        <div key={category.id} className="rounded-2xl border border-border overflow-hidden">
          {/* Category header */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 dark:bg-muted/30">
            {/* Expand/collapse toggle */}
            <button
              type="button"
              onClick={() => toggleCategoryExpanded(category.id)}
              className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              aria-label={expandedCategories[category.id] !== false
                ? t('editor.text_classification.collapse_category')
                : t('editor.text_classification.expand_category')}
            >
              {expandedCategories[category.id] !== false ? (
                <ChevronUp size={15} />
              ) : (
                <ChevronDown size={15} />
              )}
            </button>

            {/* Category name input */}
            <div className="flex-1">
              <Input
                placeholder={t('editor.text_classification.category_name_placeholder')}
                value={category.name}
                onChange={(e) => updateCategory(catIndex, 'name', e.target.value)}
                className={cn(
                  'h-8 text-sm',
                  isSubmitted && !category.name?.trim() && 'border-destructive focus-visible:ring-destructive',
                )}
              />
              {isSubmitted && !category.name?.trim() && (
                <p className="text-xs text-destructive mt-0.5">
                  {t('editor.text_classification.category_field_required')}
                </p>
              )}
            </div>

            {/* Color selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t('editor.text_classification.color_label')}
              </span>
              <Select
                value={category.color}
                onValueChange={(value) => updateCategory(catIndex, 'color', value)}
              >
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-3.5 h-3.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: COLOR_MAP[category.color as TextClassificationColor] ?? COLOR_MAP.blue }}
                      />
                      <span className="text-sm">
                        {colorOptions.find(o => o.value === category.color)?.label ?? category.color}
                      </span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block w-3.5 h-3.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: COLOR_MAP[opt.value] }}
                        />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delete category (only shown when > 2 categories) */}
            {categories.length > 2 && (
              <button
                type="button"
                onClick={() => removeCategory(catIndex)}
                className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={t('editor.text_classification.delete_category')}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          {/* Category body — collapsible */}
          {expandedCategories[category.id] !== false && (
            <div className="px-2 py-1">
              {category.answers.map((answer, ansIndex) => (
                <div
                  key={answer.id}
                  className={cn(
                    'rounded-xl border border-border overflow-hidden m-2',
                  )}
                >
                  {/* Image upload drop zone */}
                  <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'relative w-full h-36 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors',
                      answer.imageUrl
                        ? 'bg-transparent'
                        : cn(
                            'border-2 border-dashed',
                            answerErrors[answer.id]
                              ? 'border-destructive bg-destructive/5'
                              : 'border-border bg-muted/50 hover:bg-muted/80',
                          ),
                    )}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileDrop(catIndex, ansIndex, file, answer.id);
                    }}
                    onClick={() => fileInputRefs.current[answer.id]?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRefs.current[answer.id]?.click();
                      }
                    }}
                  >
                    {answer.imageUrl ? (
                      <img
                        src={answer.imageUrl}
                        alt={`Answer ${ansIndex + 1}`}
                        className="w-full h-full object-contain rounded-t-xl"
                      />
                    ) : (
                      <>
                        <ImagePlus size={28} className="text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center px-4">
                          {t('editor.image_classification.upload_placeholder')}
                        </p>
                        <span className="text-xs text-destructive">
                          {t('editor.image_classification.upload_max_size')}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRefs.current[answer.id]?.click();
                          }}
                          className="mt-1 px-3 py-1 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          {t('editor.image_classification.upload_browse')}
                        </button>
                      </>
                    )}
                    <input
                      ref={(el) => { fileInputRefs.current[answer.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileDrop(catIndex, ansIndex, file, answer.id);
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {/* Inline error */}
                  {answerErrors[answer.id] && (
                    <span className="block px-3 py-1 text-xs text-destructive">
                      {answerErrors[answer.id]}
                    </span>
                  )}

                  {/* Bottom row: mark, feedback, delete */}
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('mark')} %
                      </span>
                      <Input
                        type="number"
                        value={autoDistribute ? autoDistributedMark : answer.markPercent}
                        onChange={(e) => updateAnswer(catIndex, ansIndex, 'markPercent', parseFloat(e.target.value) || 0)}
                        disabled={autoDistribute}
                        className="w-20 h-7 text-sm"
                        min={0}
                        max={100}
                        step={0.01}
                      />
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none ms-auto">
                      <input
                        type="checkbox"
                        checked={feedbackToggles[answer.id] ?? false}
                        onChange={() => toggleAnswerFeedback(answer.id)}
                        className="accent-primary"
                      />
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('editor.feedback')}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeAnswer(catIndex, ansIndex)}
                      disabled={category.answers.length <= 1}
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={t('editor.text_classification.delete_answer')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Answer feedback TinyMCE — collapsible */}
                  {(feedbackToggles[answer.id] ?? false) && (
                    <div className="px-2 pb-2">
                      <div className="flex items-center gap-1 mb-1 mt-1">
                        <Megaphone size={14} className="text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {t('editor.choice_feedback')}
                        </span>
                      </div>
                      <div className="rounded-xl overflow-hidden border border-border/20">
                        <Editor
                          tinymceScriptSrc="/tinymce/tinymce.min.js"
                          licenseKey="gpl"
                          value={answer.feedback ?? ''}
                          onEditorChange={(value) => updateAnswer(catIndex, ansIndex, 'feedback', value)}
                          init={feedbackEditorInit}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="py-2 px-2">
                <button
                  type="button"
                  onClick={() => addAnswer(catIndex)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus size={12} />
                  {t('editor.add_answer')}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add category button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={addCategory}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors border border-primary/30 hover:border-primary/60 rounded-lg px-4 py-1.5"
        >
          <Plus size={15} />
          {t('editor.text_classification.add_category')}
        </button>
      </div>
    </div>
  );
}

export default memo(ImageClassificationEditor);
