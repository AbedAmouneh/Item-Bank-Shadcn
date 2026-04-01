import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Shield,
  Clock,
  RotateCcw,
  Target,
  ListChecks,
  Shuffle,
} from 'lucide-react';

import {
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Checkbox,
  Switch,
  Separator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@item-bank/ui';

import { getQuestions } from '@item-bank/api';
import type { Question } from '@item-bank/api';

import {
  useAssessment,
  useCreateAssessment,
  useUpdateAssessment,
  useQuestionPool,
  useAddToPool,
  useRemoveFromPool,
} from '../../../features/assessments/hooks';

// ─── Form schema ──────────────────────────────────────────────────────────────

/**
 * Zod schema for the settings form.
 * This mirrors the CreateAssessmentSchema on the backend — any change there
 * should be reflected here too.
 */
const settingsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  type: z.enum(['exam', 'quiz']),
  status: z.enum(['draft', 'published', 'archived']),
  // Optional number — we use setValueAs in the register call so react-hook-form
  // converts the empty string to undefined before validation runs.
  time_limit_mins: z.number().int().positive().optional(),
  max_attempts: z.number().int().min(1),
  passing_score_percent: z.number().min(0).max(100),
  question_count: z.number().int().min(1),
  randomize_questions: z.boolean(),
  anti_cheat_enabled: z.boolean(),
});

type SettingsFields = z.infer<typeof settingsSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PillLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      {children}
    </span>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border-2 border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ─── Question picker dialog ───────────────────────────────────────────────────

interface AddQuestionsDialogProps {
  open: boolean;
  onClose: () => void;
  pooledIds: Set<number>;
  onAdd: (ids: number[]) => void;
  isPending: boolean;
}

function AddQuestionsDialog({
  open,
  onClose,
  pooledIds,
  onAdd,
  isPending,
}: AddQuestionsDialogProps) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['questions', { search, limit: 40, status: 'published' }],
    queryFn: () => getQuestions({ search: search || undefined, limit: 40, status: 'published' }),
    enabled: open,
  });

  const questions = data?.items ?? [];

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    onAdd([...selected]);
    setSelected(new Set());
    setSearch('');
  };

  const handleClose = () => {
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('assessments.add_questions_title')}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('assessments.search_questions_placeholder')}
            className="ps-8"
          />
        </div>

        {/* Question list */}
        <div className="max-h-72 overflow-y-auto flex flex-col gap-1 rounded-xl border border-border p-2">
          {isLoading && (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && questions.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {t('assessments.no_questions_found')}
            </p>
          )}

          {!isLoading && questions.map((q: Question) => {
            const inPool = pooledIds.has(q.id);
            const isSelected = selected.has(q.id);
            return (
              <label
                key={q.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                  inPool
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-muted/60'
                }`}
              >
                <Checkbox
                  checked={inPool || isSelected}
                  disabled={inPool}
                  onCheckedChange={() => { if (!inPool) toggle(q.id); }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{q.name}</p>
                  <p className="text-xs text-muted-foreground">{q.type}</p>
                </div>
                {inPool && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {t('assessments.already_in_pool')}
                  </Badge>
                )}
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selected.size === 0 || isPending}
          >
            {isPending
              ? t('common.saving')
              : t('assessments.add_selected', { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

interface SettingsTabProps {
  defaultValues: Partial<SettingsFields>;
  onSave: (data: SettingsFields) => void;
  isPending: boolean;
  isNew: boolean;
}

function SettingsTab({ defaultValues, onSave, isPending, isNew }: SettingsTabProps) {
  const { t } = useTranslation('common');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SettingsFields>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      type: 'exam',
      status: 'draft',
      max_attempts: 1,
      passing_score_percent: 70,
      question_count: 10,
      randomize_questions: true,
      anti_cheat_enabled: false,
      ...defaultValues,
    },
  });

  const antiCheat = watch('anti_cheat_enabled');
  const randomize = watch('randomize_questions');
  const currentType = watch('type');
  const currentStatus = watch('status');

  return (
    <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-6">
      {/* Basic info */}
      <section className="flex flex-col gap-4">
        <FieldRow label={t('assessments.field_title')}>
          <Input
            {...register('title')}
            placeholder={t('assessments.field_title_placeholder')}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </FieldRow>

        <FieldRow label={t('assessments.field_description')}>
          <Textarea
            {...register('description')}
            rows={3}
            placeholder={t('assessments.field_description_placeholder')}
          />
        </FieldRow>

        <div className="grid grid-cols-2 gap-4">
          <FieldRow label={t('assessments.field_type')}>
            <Select
              value={currentType}
              onValueChange={(v) => setValue('type', v as 'exam' | 'quiz')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exam">{t('assessments.type_exam')}</SelectItem>
                <SelectItem value="quiz">{t('assessments.type_quiz')}</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label={t('assessments.field_status')}>
            <Select
              value={currentStatus}
              onValueChange={(v) =>
                setValue('status', v as 'draft' | 'published' | 'archived')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('assessments.status_draft')}</SelectItem>
                <SelectItem value="published">{t('assessments.status_published')}</SelectItem>
                <SelectItem value="archived">{t('assessments.status_archived')}</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
      </section>

      <Separator />

      {/* Scoring & limits */}
      <section className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Target size={14} className="text-primary" />
          {t('assessments.section_scoring')}
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <FieldRow
            label={t('assessments.field_passing_score')}
            hint={t('assessments.field_passing_score_hint')}
          >
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                {...register('passing_score_percent', { valueAsNumber: true })}
                className="pe-7"
              />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            {errors.passing_score_percent && (
              <p className="text-xs text-destructive">
                {errors.passing_score_percent.message}
              </p>
            )}
          </FieldRow>

          <FieldRow
            label={t('assessments.field_question_count')}
            hint={t('assessments.field_question_count_hint')}
          >
            <Input
              type="number"
              min={1}
              {...register('question_count', { valueAsNumber: true })}
            />
            {errors.question_count && (
              <p className="text-xs text-destructive">
                {errors.question_count.message}
              </p>
            )}
          </FieldRow>

          <FieldRow
            label={t('assessments.field_max_attempts')}
            hint={t('assessments.field_max_attempts_hint')}
          >
            <Input
              type="number"
              min={1}
              {...register('max_attempts', { valueAsNumber: true })}
            />
            {errors.max_attempts && (
              <p className="text-xs text-destructive">
                {errors.max_attempts.message}
              </p>
            )}
          </FieldRow>
        </div>

        <FieldRow
          label={t('assessments.field_time_limit')}
          hint={t('assessments.field_time_limit_hint')}
        >
          <div className="relative w-48">
            <Clock
              size={14}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="number"
              min={1}
              placeholder={t('assessments.field_time_limit_placeholder')}
              {...register('time_limit_mins', {
                setValueAs: (v: string) =>
                  v === '' || v === undefined ? undefined : parseInt(v, 10),
              })}
              className="ps-8"
            />
          </div>
          {errors.time_limit_mins && (
            <p className="text-xs text-destructive">
              {errors.time_limit_mins.message}
            </p>
          )}
        </FieldRow>
      </section>

      <Separator />

      {/* Behaviour toggles */}
      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shuffle size={14} className="text-primary" />
          {t('assessments.section_behaviour')}
        </p>

        <SwitchRow
          label={t('assessments.field_randomize')}
          hint={t('assessments.field_randomize_hint')}
          checked={randomize}
          onCheckedChange={(v) => setValue('randomize_questions', v)}
        />

        <SwitchRow
          label={t('assessments.field_anti_cheat')}
          hint={t('assessments.field_anti_cheat_hint')}
          checked={antiCheat}
          onCheckedChange={(v) => setValue('anti_cheat_enabled', v)}
        />
      </section>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? t('common.saving')
            : isNew
            ? t('assessments.create_exam')
            : t('assessments.save_settings')}
        </Button>
      </div>
    </form>
  );
}

// ─── Question pool tab ────────────────────────────────────────────────────────

interface PoolTabProps {
  assessmentId: number;
}

function PoolTab({ assessmentId }: PoolTabProps) {
  const { t } = useTranslation('common');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: pool = [], isLoading } = useQuestionPool(assessmentId);
  const { mutate: doAdd, isPending: isAdding } = useAddToPool(assessmentId);
  const { mutate: doRemove } = useRemoveFromPool(assessmentId);

  const pooledIds = new Set(pool.map((q) => q.question_id));

  const handleAdd = (ids: number[]) => {
    doAdd(
      { question_ids: ids },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={i} className="h-14 rounded-2xl border-2 border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Pool header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">
            {t('assessments.pool_count', { count: pool.length })}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus size={14} />
          {t('assessments.add_questions')}
        </Button>
      </div>

      {/* Empty pool state */}
      {pool.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-xl">
            📚
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {t('assessments.pool_empty_title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('assessments.pool_empty_description')}
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus size={14} />
            {t('assessments.add_questions')}
          </Button>
        </div>
      )}

      {/* Pool list */}
      {pool.length > 0 && (
        <div className="flex flex-col gap-2">
          {pool.map((q) => (
            <div
              key={q.question_id}
              className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{q.name}</p>
                <p className="text-xs text-muted-foreground">{q.type}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('common.remove')}
                onClick={() => doRemove(q.question_id)}
                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AddQuestionsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        pooledIds={pooledIds}
        onAdd={handleAdd}
        isPending={isAdding}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Assessment editor page — handles both create and edit modes.
 *
 * Create mode (/exams/new):
 *   - Shows the settings form; saving creates the record and
 *     navigates to the edit URL (/exams/:id/edit) so the question
 *     pool tab becomes available immediately.
 *
 * Edit mode (/exams/:id/edit):
 *   - Pre-populates the settings form from the existing record.
 *   - Question pool tab is active and allows adding/removing questions.
 */
export default function AssessmentEditor() {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  // id === 0 means "new" — no record exists yet.
  const id = idParam ? parseInt(idParam, 10) : 0;
  const isNew = id === 0;

  const { data: assessment, isLoading } = useAssessment(id);
  const { mutate: doCreate, isPending: isCreating } = useCreateAssessment();
  const { mutate: doUpdate, isPending: isUpdating } = useUpdateAssessment(id);

  // Keeps the form pre-populated from the server once data arrives.
  const [defaultValues, setDefaultValues] = useState<Partial<SettingsFields>>({});
  useEffect(() => {
    if (!assessment) return;
    setDefaultValues({
      title: assessment.title,
      description: assessment.description ?? '',
      type: assessment.type,
      status: assessment.status,
      time_limit_mins: assessment.time_limit_mins ?? undefined,
      max_attempts: assessment.max_attempts,
      passing_score_percent: assessment.passing_score_percent,
      question_count: assessment.question_count,
      randomize_questions: assessment.randomize_questions,
      anti_cheat_enabled: assessment.anti_cheat_enabled,
    });
  }, [assessment]);

  const handleSave = (data: SettingsFields) => {
    // time_limit_mins is already undefined when the field was left empty
    // (setValueAs converts empty string → undefined before validation).
    const payload = { ...data };

    if (isNew) {
      doCreate(payload, {
        onSuccess: (created) => navigate(`/exams/${created.id}/edit`),
      });
    } else {
      doUpdate(payload);
    }
  };

  if (!isNew && isLoading) {
    return (
      <main className="w-full max-w-3xl mx-auto px-6 py-10 flex flex-col gap-6">
        <div className="h-5 w-24 rounded-full bg-muted animate-pulse" />
        <div className="h-8 w-1/2 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-2xl border-2 border-border bg-card animate-pulse" />
      </main>
    );
  }

  const pageTitle = isNew
    ? t('assessments.new_exam')
    : (assessment?.title ?? t('assessments.edit_exam'));

  return (
    <main className="w-full max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">
      {/* Back link */}
      <Link
        to="/exams"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        {t('assessments.back_to_list')}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3">
        <PillLabel>
          {isNew ? `✏️ ${t('assessments.new_exam')}` : `📋 ${t('assessments.edit_exam')}`}
        </PillLabel>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {pageTitle}
        </h1>
        {!isNew && assessment && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {assessment.type === 'exam'
                ? t('assessments.type_exam')
                : t('assessments.type_quiz')}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RotateCcw size={10} />
              {t('assessments.updated_at', {
                date: new Date(assessment.updated_at).toLocaleDateString(),
              })}
            </span>
          </div>
        )}
      </div>

      {/* Tabs — pool tab only shown when editing an existing record */}
      <Tabs defaultValue="settings">
        <TabsList className={isNew ? 'w-auto' : 'grid w-full grid-cols-2'}>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Shield size={13} />
            {t('assessments.tab_settings')}
          </TabsTrigger>
          {!isNew && (
            <TabsTrigger value="pool" className="flex items-center gap-2">
              <ListChecks size={13} />
              {t('assessments.tab_question_pool')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          {isNew || Object.keys(defaultValues).length > 0 ? (
            <SettingsTab
              key={id}
              defaultValues={defaultValues}
              onSave={handleSave}
              isPending={isCreating || isUpdating}
              isNew={isNew}
            />
          ) : null}
        </TabsContent>

        {!isNew && (
          <TabsContent value="pool" className="mt-6">
            <PoolTab assessmentId={id} />
          </TabsContent>
        )}
      </Tabs>
    </main>
  );
}
