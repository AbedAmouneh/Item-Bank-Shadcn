import { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle, XCircle, Eye } from 'lucide-react';

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@item-bank/ui';
import { getQuestions, publishQuestion, rejectQuestion } from '@item-bank/api';
import type { Question } from '@item-bank/api';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const approveSchema = z.object({
  notes: z.string().optional(),
});

const rejectSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

type ApproveFields = z.infer<typeof approveSchema>;
type RejectFields = z.infer<typeof rejectSchema>;

// ---------------------------------------------------------------------------
// Dialog state — one discriminated union drives all modals
// ---------------------------------------------------------------------------

type DialogState =
  | { type: 'idle' }
  | { type: 'approve'; questionId: number }
  | { type: 'reject'; questionId: number }
  | { type: 'bulk-reject' };

// ---------------------------------------------------------------------------
// TanStack Query hooks
// ---------------------------------------------------------------------------

/** Fetch all questions currently awaiting review. */
function useReviewQueue() {
  return useQuery({
    queryKey: ['questions', { status: 'in_review' }],
    queryFn: () => getQuestions({ status: 'in_review', limit: 100 }),
  });
}

/** Publish (approve) a single question and invalidate the review list. */
function useApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      publishQuestion(id, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['questions', { status: 'in_review' }],
      });
    },
  });
}

/** Reject a single question and invalidate the review list. */
function useReject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      rejectQuestion(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['questions', { status: 'in_review' }],
      });
    },
  });
}

// ---------------------------------------------------------------------------
// ApproveDialog — optional reviewer notes
// ---------------------------------------------------------------------------

interface ApproveDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (notes?: string) => void;
  isPending: boolean;
}

function ApproveDialog({ open, onClose, onSubmit, isPending }: ApproveDialogProps) {
  const { register, handleSubmit, reset } = useForm<ApproveFields>({
    resolver: zodResolver(approveSchema),
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      onClose();
    }
  };

  // React 19 delegates events to the #root container, but Radix renders this
  // dialog in a portal appended to document.body (outside #root). The native
  // form "submit" event therefore never bubbles through the React root, so
  // react-hook-form's handleSubmit is never called. Using onClick on a
  // type="button" instead routes the action through React's click delegation,
  // which Radix already supports for portal containers.
  const handleApproveClick = handleSubmit(({ notes }) => onSubmit(notes || undefined));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve this question?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="approve-notes">
              Reviewer Notes{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="approve-notes"
              {...register('notes')}
              placeholder="Any feedback for the author…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApproveClick} disabled={isPending}>
              {isPending ? 'Approving…' : 'Approve'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// RejectDialog — required reason, min 10 chars; reused for single + bulk
// ---------------------------------------------------------------------------

interface RejectDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isPending: boolean;
}

function RejectDialog({ open, title, onClose, onSubmit, isPending }: RejectDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFields>({ resolver: zodResolver(rejectSchema) });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      onClose();
    }
  };

  // Same portal/root event delegation issue as ApproveDialog — use onClick.
  const handleRejectClick = handleSubmit(({ reason }) => onSubmit(reason));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              {...register('reason')}
              placeholder="Explain why the question is being rejected (min 10 characters)…"
              rows={4}
              aria-invalid={!!errors.reason}
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleRejectClick} disabled={isPending}>
              {isPending ? 'Rejecting…' : 'Reject'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// SkeletonRows — animated placeholders shown while the query loads
// ---------------------------------------------------------------------------

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <TableRow key={i} className="animate-pulse">
          <TableCell><div className="h-4 w-4 rounded bg-muted" /></TableCell>
          <TableCell><div className="h-4 w-40 rounded bg-muted" /></TableCell>
          <TableCell><div className="h-4 w-20 rounded bg-muted" /></TableCell>
          <TableCell><div className="h-4 w-24 rounded bg-muted" /></TableCell>
          <TableCell><div className="h-4 w-24 rounded bg-muted" /></TableCell>
          <TableCell />
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// AdminReview — main page
// ---------------------------------------------------------------------------

const AdminReview = () => {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<DialogState>({ type: 'idle' });

  const { data, isLoading, isError } = useReviewQueue();
  const questions: Question[] = data?.items ?? [];
  // Use the server's total count for the badge; fall back to local length.
  const pendingCount = data?.total ?? questions.length;

  const { mutate: approve, isPending: isApproving } = useApprove();
  const { mutate: reject, isPending: isRejecting } = useReject();

  // ── Selection helpers ────────────────────────────────────────────────────

  const allSelected = questions.length > 0 && selectedIds.size === questions.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(questions.map((q) => q.id)));
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Single approve ───────────────────────────────────────────────────────

  const handleApproveSubmit = (notes?: string) => {
    if (dialog.type !== 'approve') return;
    const { questionId } = dialog;
    approve(
      { id: questionId, notes },
      {
        onSuccess: () => {
          setDialog({ type: 'idle' });
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(questionId);
            return next;
          });
        },
      },
    );
  };

  // ── Single reject ────────────────────────────────────────────────────────

  const handleRejectSubmit = (reason: string) => {
    if (dialog.type !== 'reject') return;
    const { questionId } = dialog;
    reject(
      { id: questionId, reason },
      {
        onSuccess: () => {
          setDialog({ type: 'idle' });
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(questionId);
            return next;
          });
        },
      },
    );
  };

  // ── Bulk approve (no dialog — direct action) ─────────────────────────────

  const handleBulkApprove = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    // Fire all approvals concurrently; clear selection once the last one lands.
    let remaining = ids.length;
    ids.forEach((id) => {
      approve(
        { id },
        {
          onSuccess: () => {
            remaining -= 1;
            if (remaining === 0) setSelectedIds(new Set());
          },
        },
      );
    });
  };

  // ── Bulk reject ──────────────────────────────────────────────────────────

  const handleBulkRejectSubmit = (reason: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    let remaining = ids.length;
    ids.forEach((id) => {
      reject(
        { id, reason },
        {
          onSuccess: () => {
            remaining -= 1;
            if (remaining === 0) {
              setDialog({ type: 'idle' });
              setSelectedIds(new Set());
            }
          },
        },
      );
    });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString() : '—';

  // Converts snake_case question type values (e.g. "select_correct_word") into
  // readable Title Case ("Select Correct Word") for display in the Type column.
  const formatQuestionType = (type: string) =>
    type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page heading */}
      <div className="flex items-center gap-4 flex-wrap">
        <ClipboardList className="text-primary" size={28} />
        <h1 className="font-semibold text-xl text-foreground">Review Queue</h1>
        {!isLoading && (
          <Badge variant="secondary">{pendingCount}</Badge>
        )}
      </div>

      <Separator />

      {/* Bulk action bar — visible only when at least one row is selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBulkApprove}
            disabled={isApproving || isRejecting}
          >
            <CheckCircle size={15} className="me-1.5" />
            Approve Selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => setDialog({ type: 'bulk-reject' })}
            disabled={isApproving || isRejecting}
          >
            <XCircle size={15} className="me-1.5" />
            Reject Selected
          </Button>
        </div>
      )}

      {/* Fetch error */}
      {isError && (
        <p className="text-sm text-destructive">Failed to load questions.</p>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all questions"
                  disabled={questions.length === 0}
                />
              </TableHead>
              <TableHead>Question Name</TableHead>
              <TableHead>Type</TableHead>
              {/* submitted_by is not yet a field on the Question type — shows — until API adds it */}
              <TableHead>Submitted By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <SkeletonRows />}

            {!isLoading && !isError && questions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  No questions pending review.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              questions.map((q) => (
                <TableRow
                  key={q.id}
                  data-state={selectedIds.has(q.id) ? 'selected' : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(q.id)}
                      onCheckedChange={() => toggleSelectOne(q.id)}
                      aria-label={`Select ${q.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{q.name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatQuestionType(q.type)}</TableCell>
                  {/* submitted_by not yet on Question type */}
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(q.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void navigate(`/questions/${q.id}/preview`)}
                        aria-label={`Preview ${q.name}`}
                      >
                        <Eye size={15} className="me-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                        onClick={() => setDialog({ type: 'approve', questionId: q.id })}
                        aria-label={`Approve ${q.name}`}
                      >
                        <CheckCircle size={15} className="me-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDialog({ type: 'reject', questionId: q.id })}
                        aria-label={`Reject ${q.name}`}
                      >
                        <XCircle size={15} className="me-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Single approve dialog */}
      <ApproveDialog
        open={dialog.type === 'approve'}
        onClose={() => setDialog({ type: 'idle' })}
        onSubmit={handleApproveSubmit}
        isPending={isApproving}
      />

      {/* Single reject dialog */}
      <RejectDialog
        open={dialog.type === 'reject'}
        title="Reject this question?"
        onClose={() => setDialog({ type: 'idle' })}
        onSubmit={handleRejectSubmit}
        isPending={isRejecting}
      />

      {/* Bulk reject dialog — same component, dynamic title */}
      <RejectDialog
        open={dialog.type === 'bulk-reject'}
        title={`Reject ${selectedIds.size} selected question${selectedIds.size === 1 ? '' : 's'}?`}
        onClose={() => setDialog({ type: 'idle' })}
        onSubmit={handleBulkRejectSubmit}
        isPending={isRejecting}
      />
    </div>
  );
};

export default AdminReview;
