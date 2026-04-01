import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Clock, Shield, Users } from 'lucide-react';

import {
  Button,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@item-bank/ui';

import {
  useAssessments,
  useDeleteAssessment,
} from '../../../features/assessments/hooks';
import type { Assessment } from '@item-bank/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Maps a status value to a colour-coded badge. */
function StatusBadge({ status }: { status: Assessment['status'] }) {
  const { t } = useTranslation('common');
  if (status === 'published') {
    return (
      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 border">
        {t('assessments.status_published')}
      </Badge>
    );
  }
  if (status === 'archived') {
    return (
      <Badge variant="secondary" className="opacity-60">
        {t('assessments.status_archived')}
      </Badge>
    );
  }
  return <Badge variant="secondary">{t('assessments.status_draft')}</Badge>;
}

/** Maps a type value to a human-readable label. */
function TypeBadge({ type }: { type: Assessment['type'] }) {
  const { t } = useTranslation('common');
  return (
    <Badge variant="outline" className="text-xs">
      {type === 'exam' ? t('assessments.type_exam') : t('assessments.type_quiz')}
    </Badge>
  );
}

// ─── Delete dialog ────────────────────────────────────────────────────────────

interface DeleteDialogProps {
  assessment: Assessment | null;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

function DeleteDialog({ assessment, onCancel, onConfirm, isPending }: DeleteDialogProps) {
  const { t } = useTranslation('common');
  return (
    <AlertDialog open={assessment !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('assessments.delete_title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('assessments.delete_description', { title: assessment?.title ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isPending}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? t('common.deleting') : t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface RowProps {
  assessment: Assessment;
  onEdit: (a: Assessment) => void;
  onDelete: (a: Assessment) => void;
}

function AssessmentRow({ assessment, onEdit, onDelete }: RowProps) {
  const { t } = useTranslation('common');
  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card px-5 py-4">
      {/* Main info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">
            {assessment.title}
          </p>
          <TypeBadge type={assessment.type} />
          <StatusBadge status={assessment.status} />
        </div>
        {assessment.description && (
          <p className="text-xs text-muted-foreground truncate">
            {assessment.description}
          </p>
        )}
        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {assessment.time_limit_mins !== null && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {assessment.time_limit_mins} {t('assessments.mins')}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users size={11} />
            {assessment.max_attempts} {t('assessments.attempt_label', { count: assessment.max_attempts })}
          </span>
          {assessment.anti_cheat_enabled && (
            <span className="flex items-center gap-1 text-amber-600">
              <Shield size={11} />
              {t('assessments.anti_cheat_on')}
            </span>
          )}
          <span>{assessment.passing_score_percent}% {t('assessments.to_pass')}</span>
          <span>{assessment.question_count} {t('assessments.questions_label')}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('common.edit')}
          onClick={() => onEdit(assessment)}
        >
          <Pencil size={15} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('common.delete')}
          onClick={() => onDelete(assessment)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="h-20 rounded-2xl border-2 border-border bg-card animate-pulse" />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Assessments list page — shows all exams and quizzes for this organisation.
 *
 * From here an author can:
 *   - Create a new exam (→ /exams/new)
 *   - Edit an existing exam (→ /exams/:id/edit)
 *   - Delete a draft exam
 */
export default function AssessmentsList() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const { data, isLoading, isError } = useAssessments({ limit: 50 });
  const { mutate: doDelete, isPending: isDeleting } = useDeleteAssessment();

  const [toDelete, setToDelete] = useState<Assessment | null>(null);

  const handleConfirmDelete = () => {
    if (!toDelete) return;
    doDelete(toDelete.id, { onSuccess: () => setToDelete(null) });
  };

  const assessments = data?.items ?? [];

  return (
    <main className="w-full max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            📋 {t('assessments.page_label')}
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('assessments.page_title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('assessments.page_description')}
          </p>
        </div>
        <Button onClick={() => navigate('/exams/new')} className="shrink-0 gap-2">
          <Plus size={16} />
          {t('assessments.new_exam')}
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <RowSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-destructive text-sm">{t('common.loading_error')}</p>
      )}

      {/* Empty state */}
      {!isLoading && !isError && assessments.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
            📋
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">
              {t('assessments.empty_title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('assessments.empty_description')}
            </p>
          </div>
          <Button onClick={() => navigate('/exams/new')} className="gap-2">
            <Plus size={14} />
            {t('assessments.new_exam')}
          </Button>
        </div>
      )}

      {/* List */}
      {!isLoading && assessments.length > 0 && (
        <div className="flex flex-col gap-3">
          {assessments.map((a) => (
            <AssessmentRow
              key={a.id}
              assessment={a}
              onEdit={(item) => navigate(`/exams/${item.id}/edit`)}
              onDelete={(item) => setToDelete(item)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <DeleteDialog
        assessment={toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={handleConfirmDelete}
        isPending={isDeleting}
      />
    </main>
  );
}
