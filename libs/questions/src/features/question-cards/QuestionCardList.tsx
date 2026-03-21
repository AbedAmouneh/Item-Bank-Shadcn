import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { type QuestionRow } from '../../components/QuestionsTable';
import { type QuestionType } from '../../domain/types';
import {
  useDeleteQuestion,
  useUpdateQuestion,
  useDuplicateQuestion,
  useSubmitForReview,
} from '../../domain';
import AddQuestionModal from '../../components/AddQuestionModal';
import QuestionCard from './QuestionCard';
import QuestionCardToolbar from './QuestionCardToolbar';
import QuestionCardSidebar from './QuestionCardSidebar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Duration in ms before a pending bulk-delete is committed to the server. */
const UNDO_DELAY_MS = 5000;

type QuestionCardListProps = {
  questions: QuestionRow[];
  onEditQuestion: (row: QuestionRow) => void;
  onPreviewQuestion: (row: QuestionRow | null) => void;
  onQuestionTypeChange: (type: QuestionType) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deduplicate question types preserving their first-seen order. */
function uniqueTypes(questions: QuestionRow[]): QuestionType[] {
  const seen = new Set<QuestionType>();
  const result: QuestionType[] = [];
  for (const q of questions) {
    if (!seen.has(q.type)) {
      seen.add(q.type);
      result.push(q.type);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// QuestionCardList
// ---------------------------------------------------------------------------

function QuestionCardList({
  questions,
  onEditQuestion,
  onPreviewQuestion,
  onQuestionTypeChange,
}: QuestionCardListProps) {
  const { t } = useTranslation('questions');

  // ── Server mutations ──────────────────────────────────────────────────────
  const { mutate: deleteQuestion } = useDeleteQuestion();
  const { mutate: updateQuestion } = useUpdateQuestion();
  const { mutate: duplicateQuestion } = useDuplicateQuestion();
  const submitForReview = useSubmitForReview();

  // ── Toolbar state ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<QuestionType | 'all'>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // ── Single-item delete confirmation (one shared dialog for the whole grid) ─
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const confirmDeleteQuestion = questions.find((q) => Number(q.id) === confirmDeleteId) ?? null;

  // ── Selection state ───────────────────────────────────────────────────────
  // IDs are normalised to numbers to avoid Set membership mismatches
  // when QuestionRow.id arrives as a string from IndexedDB.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Sidebar order state ───────────────────────────────────────────────────
  // Tracks manual reorder. Kept in sync when the questions prop changes
  // (e.g. after a server re-fetch).
  const [orderedIds, setOrderedIds] = useState<Array<number | string>>(() =>
    questions.map((q) => q.id),
  );

  useEffect(() => {
    setOrderedIds(questions.map((q) => q.id));
  }, [questions]);

  // ── Pending bulk-delete ───────────────────────────────────────────────────
  // While the timer is running, these questions are hidden from the grid but
  // not yet deleted on the server. IDs are normalised to numbers.
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived data ──────────────────────────────────────────────────────────
  const orderedQuestions = useMemo(() => {
    const idToQuestion = new Map(questions.map((q) => [q.id, q]));
    const ordered = orderedIds.flatMap((id) => {
      const q = idToQuestion.get(id);
      return q ? [q] : [];
    });
    // Append newly-created questions whose IDs aren't in orderedIds yet.
    const orderedSet = new Set(orderedIds);
    const extras = questions.filter((q) => !orderedSet.has(q.id));
    return [...ordered, ...extras];
  }, [questions, orderedIds]);

  const visibleQuestions = useMemo(() => {
    return orderedQuestions.filter((q) => {
      if (pendingDeleteIds.has(Number(q.id))) return false;
      if (activeType !== 'all' && q.type !== activeType) return false;
      if (search.trim()) {
        const needle = search.trim().toLowerCase();
        if (!q.questionName.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [orderedQuestions, pendingDeleteIds, activeType, search]);

  const availableTypes = useMemo(() => uniqueTypes(orderedQuestions), [orderedQuestions]);

  const totalScore = useMemo(
    () => visibleQuestions.reduce((sum, q) => sum + (q.mark ?? 0), 0),
    [visibleQuestions],
  );

  // Sidebar shows all ordered questions (no filter applied) minus pending deletes.
  const sidebarQuestions = useMemo(
    () => orderedQuestions.filter((q) => !pendingDeleteIds.has(Number(q.id))),
    [orderedQuestions, pendingDeleteIds],
  );

  // ── Selection helpers ─────────────────────────────────────────────────────
  // QuestionCard always passes Number(q.id), so id is always a number here.
  const handleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Single card actions ───────────────────────────────────────────────────
  const handleEdit = useCallback(
    (id: number) => {
      const row = questions.find((q) => Number(q.id) === id);
      if (row) onEditQuestion(row);
    },
    [questions, onEditQuestion],
  );

  const handlePreview = useCallback(
    (id: number) => {
      const row = questions.find((q) => Number(q.id) === id) ?? null;
      onPreviewQuestion(row);
    },
    [questions, onPreviewQuestion],
  );

  // Opens the single shared delete-confirmation dialog.
  const handleDeleteRequest = useCallback((id: number) => {
    setConfirmDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (confirmDeleteId === null) return;
    deleteQuestion(confirmDeleteId);
    setConfirmDeleteId(null);
  }, [confirmDeleteId, deleteQuestion]);

  const handleMarkChange = useCallback(
    (id: number, mark: number) => {
      updateQuestion({ id, data: { mark } });
    },
    [updateQuestion],
  );

  const handleDuplicate = useCallback(
    (id: number) => {
      duplicateQuestion({ id, namePrefix: t('card.copy_of') });
    },
    [duplicateQuestion, t],
  );

  const handleSubmitForReview = useCallback(
    (id: number) => {
      submitForReview.mutate(id);
    },
    [submitForReview],
  );

  const handleStatusChange = useCallback(
    (id: number, status: 'Draft' | 'In Review' | 'Published') => {
      const apiStatus = status === 'Draft' ? 'draft' : status === 'In Review' ? 'in_review' : 'published';
      updateQuestion({ id, data: { status: apiStatus } });
    },
    [updateQuestion],
  );

  // ── Sidebar reorder ───────────────────────────────────────────────────────
  const handleReorder = useCallback((reordered: QuestionRow[]) => {
    setOrderedIds(reordered.map((q) => q.id));
    // No API call — no reorder endpoint exists yet.
  }, []);

  // ── Bulk delete with Undo ─────────────────────────────────────────────────
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds); // already numbers
    if (ids.length === 0) return;

    setPendingDeleteIds(new Set(ids));
    setSelectedIds(new Set());

    // Clear any prior timer before starting a new one.
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const count = ids.length;

    undoTimerRef.current = setTimeout(() => {
      for (const id of ids) {
        deleteQuestion(id);
      }
      setPendingDeleteIds(new Set());
    }, UNDO_DELAY_MS);

    toast(t('card.bulk_deleted', { count }), {
      duration: UNDO_DELAY_MS,
      action: {
        label: t('card.undo'),
        onClick: () => {
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
          setPendingDeleteIds(new Set());
        },
      },
    });
  }, [selectedIds, deleteQuestion, t]);

  // ── Cleanup timer on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-4 w-full">
      {/* Main content (toolbar + grid) */}
      <div className="flex-1 min-w-0">
        <QuestionCardToolbar
          visibleCount={visibleQuestions.length}
          totalScore={totalScore}
          search={search}
          onSearchChange={setSearch}
          activeType={activeType}
          onTypeChange={setActiveType}
          availableTypes={availableTypes}
          onAddQuestion={() => setAddModalOpen(true)}
        />

        {/* Card grid */}
        {visibleQuestions.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {search || activeType !== 'all' ? t('card.no_results') : t('no_questions')}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleQuestions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i + 1}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                onDuplicate={handleDuplicate}
                onPreview={handlePreview}
                onMarkChange={handleMarkChange}
                onSubmitForReview={handleSubmitForReview}
                onStatusChange={handleStatusChange}
                isSelected={selectedIds.has(Number(q.id))}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        {/* Bulk delete bar — floats at the bottom when items are selected.
            Uses inset-x-0 + mx-auto for logical centering that works in both LTR and RTL. */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 inset-x-0 mx-auto z-40 flex w-fit items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-xl">
            <span className="text-sm font-medium text-foreground">
              {t('card.selected_delete', { count: selectedIds.size })}
            </span>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="rounded-xl bg-destructive px-4 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              {t('delete')}
            </button>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <QuestionCardSidebar questions={sidebarQuestions} onReorder={handleReorder} />

      {/* ── Single shared delete-confirmation dialog for per-card deletes ──
          One instance for the whole grid — avoids mounting N dialogs simultaneously. */}
      <AlertDialogPrimitive.Root
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0" />
          <AlertDialogPrimitive.Content
            className={[
              'fixed inset-x-0 top-1/2 -translate-y-1/2 mx-auto z-50',
              'w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl',
              'animate-in fade-in-0 zoom-in-95',
            ].join(' ')}
          >
            <AlertDialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {t('delete_confirm_title')}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              {t('delete_confirm_message', { name: confirmDeleteQuestion?.questionName ?? '' })}
            </AlertDialogPrimitive.Description>
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialogPrimitive.Cancel className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors text-foreground">
                {t('cancel')}
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                {t('delete')}
              </AlertDialogPrimitive.Action>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

      {/* Add Question Modal */}
      <AddQuestionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSelectType={(type) => {
          setAddModalOpen(false);
          onQuestionTypeChange(type);
        }}
      />
    </div>
  );
}

export default memo(QuestionCardList);
