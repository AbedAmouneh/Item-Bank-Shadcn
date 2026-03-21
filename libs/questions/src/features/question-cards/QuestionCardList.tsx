import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getQuestion } from '@item-bank/api';
import { type QuestionRow } from '../../components/QuestionsTable';
import { type QuestionType } from '../../domain/types';
import {
  useDeleteQuestion,
  useUpdateQuestion,
  useCreateQuestion,
  useSubmitForReview,
} from '../../domain/hooks';
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
  const { mutate: createQuestion } = useCreateQuestion();
  const submitForReview = useSubmitForReview();

  // ── Toolbar state ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<QuestionType | 'all'>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // ── Selection state ───────────────────────────────────────────────────────
  // IDs are normalised to numbers to avoid Set membership mismatches
  // when QuestionRow.id arrives as a string from IndexedDB.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Sidebar order state ───────────────────────────────────────────────────
  // Tracks manual reorder. Initialised from incoming questions; kept in sync
  // when the questions prop changes (e.g. after a server re-fetch).
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
  // Snapshot the rows being deleted so Undo can restore them.
  const pendingDeleteRowsRef = useRef<QuestionRow[]>([]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const orderedQuestions = useMemo(() => {
    const idToQuestion = new Map(questions.map((q) => [q.id, q]));
    // Ordered questions matching current server list; filter out any stale IDs.
    const ordered = orderedIds.flatMap((id) => {
      const q = idToQuestion.get(id);
      return q ? [q] : [];
    });
    // Append any questions whose IDs aren't in orderedIds yet (newly created).
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

  const handleDelete = useCallback(
    (id: number) => {
      deleteQuestion(id);
    },
    [deleteQuestion],
  );

  const handleMarkChange = useCallback(
    (id: number, mark: number) => {
      updateQuestion({ id, data: { mark } });
    },
    [updateQuestion],
  );

  const handleDuplicate = useCallback(
    (id: number) => {
      getQuestion(id)
        .then((full) => {
          createQuestion({
            name: `${t('card.copy_of')}${full.name}`,
            type: full.type,
            text: full.text,
            mark: full.mark,
            content: full.content,
          });
        })
        .catch(() => {
          // Silently ignore — server errors surface via TanStack Query error state.
        });
    },
    [createQuestion, t],
  );

  const handleSubmitForReview = useCallback(
    (id: number) => {
      submitForReview.mutate(id);
    },
    [submitForReview],
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

    // Snapshot rows for potential undo
    pendingDeleteRowsRef.current = questions.filter((q) => ids.includes(Number(q.id)));
    setPendingDeleteIds(new Set(ids));
    setSelectedIds(new Set());

    // Clear any prior timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const count = ids.length;

    undoTimerRef.current = setTimeout(() => {
      // Timer fired — commit deletes to the server
      for (const id of ids) {
        deleteQuestion(Number(id));
      }
      setPendingDeleteIds(new Set());
      pendingDeleteRowsRef.current = [];
    }, UNDO_DELAY_MS);

    toast(t('card.bulk_deleted', { count }), {
      duration: UNDO_DELAY_MS,
      action: {
        label: t('card.undo'),
        onClick: () => {
          // Cancel the pending deletes
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
          setPendingDeleteIds(new Set());
          pendingDeleteRowsRef.current = [];
        },
      },
    });
  }, [selectedIds, questions, deleteQuestion, t]);

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
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onPreview={handlePreview}
                onMarkChange={handleMarkChange}
                onSubmitForReview={handleSubmitForReview}
                isSelected={selectedIds.has(Number(q.id))}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}

        {/* Bulk delete bar — floats at the bottom when items are selected */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-xl">
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
