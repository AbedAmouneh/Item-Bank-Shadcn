import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Eye, MoreVertical } from 'lucide-react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@item-bank/ui';
import { type QuestionRow } from '../../components/QuestionsTable';
import { type QuestionType } from '../../domain/types';
import QuestionViewShell from '../../components/QuestionViewShell';

// ---------------------------------------------------------------------------
// Shared colour maps (same palette as QuestionsTable)
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<QuestionType, string> = {
  multiple_choice: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
  short_answer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  essay: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  true_false: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  fill_in_blanks: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  record_audio: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  drag_drop_image: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  drag_drop_text: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  free_hand_drawing: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  image_sequencing: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  multiple_hotspots: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  numerical: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  select_correct_word: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  text_sequencing: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  fill_in_blanks_image: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  highlight_correct_word: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  text_classification: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  image_classification: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  matching: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

type QuestionStatus = 'Draft' | 'Published' | 'In Review';

const STATUS_COLORS: Record<QuestionStatus, string> = {
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'In Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type QuestionCardProps = {
  question: QuestionRow;
  /** 1-based display index shown in the number badge. */
  index: number;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onDuplicate?: (id: number) => void;
  onPreview?: (id: number) => void;
  onMarkChange?: (id: number, mark: number) => void;
  onSubmitForReview?: (id: number) => void;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
};

// ---------------------------------------------------------------------------
// InlineMarkEditor — the "10 pts" badge that flips into an <input>
// ---------------------------------------------------------------------------

type InlineMarkEditorProps = {
  id: number;
  mark: number;
  name: string;
  onMarkChange?: (id: number, mark: number) => void;
};

function InlineMarkEditor({ id, mark, name, onMarkChange }: InlineMarkEditorProps) {
  const { t } = useTranslation('questions');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(mark));
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    setDraft(String(mark));
    setEditing(true);
    // Focus is applied after re-render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [mark]);

  const commit = useCallback(() => {
    const parsed = Number(draft);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onMarkChange?.(id, parsed);
    }
    setEditing(false);
  }, [draft, id, onMarkChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  }, [commit]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-16 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={t('card.mark_aria', { name })}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className="rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      aria-label={t('card.mark_aria', { name })}
    >
      {mark} {t('card.pts')}
    </button>
  );
}

// ---------------------------------------------------------------------------
// QuestionCard
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  index,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  onMarkChange,
  onSubmitForReview,
  isSelected = false,
  onSelect,
}: QuestionCardProps) {
  const { t } = useTranslation('questions');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const id = Number(question.id);
  const typeKey = question.type.toLowerCase().replace(/ /g, '_');
  const statusKey = question.status.toLowerCase().replace(/ /g, '_') as Lowercase<QuestionStatus>;

  const handleConfirmDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    onDelete?.(id);
  }, [id, onDelete]);

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-card shadow-sm transition-shadow',
        'hover:shadow-md',
        isSelected && 'ring-2 ring-primary ring-offset-2',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Header row: number badge + checkbox + type chip ── */}
      <div className="relative flex items-start justify-between px-3 pt-3 pb-1">
        {/* Checkbox — visible on hover or when selected */}
        <div
          className={cn(
            'absolute start-3 top-3 transition-opacity',
            hovered || isSelected ? 'opacity-100' : 'opacity-0',
          )}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect?.(id)}
            aria-label={t('card.select_aria', { name: question.questionName })}
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          />
        </div>

        {/* Number badge — shifts right when checkbox is visible */}
        <span
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold text-muted-foreground transition-all',
            (hovered || isSelected) && 'ms-6',
          )}
        >
          {index}
        </span>

        {/* Type chip */}
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
            TYPE_COLORS[question.type],
          )}
        >
          {t(`types.${typeKey}`)}
        </span>
      </div>

      {/* ── Inline question preview (scaled) ── */}
      <div className="mx-3 overflow-hidden rounded-xl border border-border bg-muted/30" style={{ height: 340 }}>
        <div
          style={{
            transform: 'scale(0.74)',
            transformOrigin: 'top left',
            width: 'calc(100% / 0.74)',
            pointerEvents: 'none',
          }}
        >
          <QuestionViewShell question={question} />
        </div>
      </div>

      {/* ── Question title ── */}
      <p className="px-3 pt-2 text-sm font-medium text-foreground line-clamp-2">
        {question.questionName}
      </p>

      {/* ── Footer: status chip + last modified ── */}
      <div className="flex items-center justify-between px-3 pt-1 pb-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] font-medium',
            STATUS_COLORS[question.status],
          )}
        >
          {t(`statuses.${statusKey}`)}
        </span>
        <span className="text-[0.65rem] text-muted-foreground">{question.lastModified}</span>
      </div>

      {/* ── Actions row: edit, preview, mark editor, 3-dot menu ── */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <div className="flex items-center gap-1">
          {/* Edit */}
          <button
            type="button"
            aria-label={t('edit')}
            onClick={() => onEdit?.(id)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Pencil size={14} />
          </button>

          {/* Preview */}
          <button
            type="button"
            aria-label={t('preview')}
            onClick={() => onPreview?.(id)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Eye size={14} />
          </button>

          {/* Inline mark editor */}
          <InlineMarkEditor
            id={id}
            mark={question.mark}
            name={question.questionName}
            onMarkChange={onMarkChange}
          />
        </div>

        {/* 3-dot dropdown */}
        <DropdownMenuPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuPrimitive.Trigger asChild>
            <button
              type="button"
              aria-label={t('row_menu')}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <MoreVertical size={14} />
            </button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-[140px] rounded-xl border border-border bg-card shadow-lg p-1 text-sm"
            >
              <DropdownMenuPrimitive.Item
                className="px-3 py-2 rounded-lg cursor-pointer text-foreground hover:bg-muted outline-none"
                onSelect={() => onDuplicate?.(id)}
              >
                {t('card.duplicate')}
              </DropdownMenuPrimitive.Item>
              {question.status === 'Draft' && (
                <DropdownMenuPrimitive.Item
                  className="px-3 py-2 rounded-lg cursor-pointer text-foreground hover:bg-muted outline-none"
                  onSelect={() => onSubmitForReview?.(id)}
                >
                  {t('submit_for_review')}
                </DropdownMenuPrimitive.Item>
              )}
              <DropdownMenuPrimitive.Item
                className="px-3 py-2 rounded-lg cursor-pointer text-destructive hover:bg-destructive/10 outline-none"
                onSelect={() => {
                  setMenuOpen(false);
                  setDeleteDialogOpen(true);
                }}
              >
                {t('delete')}
              </DropdownMenuPrimitive.Item>
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
      </div>

      {/* ── Delete confirmation AlertDialog ── */}
      <AlertDialogPrimitive.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0" />
          <AlertDialogPrimitive.Content className="fixed start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
            <AlertDialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {t('delete_confirm_title')}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              {t('delete_confirm_message', { name: question.questionName })}
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
    </div>
  );
}

export { QuestionCard, type QuestionCardProps };
export default memo(QuestionCard);
