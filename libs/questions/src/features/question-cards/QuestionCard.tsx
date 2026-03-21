import { memo, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Eye, MoreVertical } from 'lucide-react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@item-bank/ui';
import { type QuestionRow } from '../../components/QuestionsTable';
import QuestionViewShell from '../../components/QuestionViewShell';
import { TYPE_COLORS, STATUS_COLORS, type QuestionStatus } from './questionCardConstants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type QuestionCardProps = {
  question: QuestionRow;
  /** 1-based display index shown in the number badge. */
  index: number;
  onEdit?: (id: number) => void;
  /**
   * Called when the user selects "Delete" from the card's action menu.
   * The parent is responsible for showing a confirmation dialog before
   * committing the delete — this card does not contain one.
   */
  onDelete?: (id: number) => void;
  onDuplicate?: (id: number) => void;
  onPreview?: (id: number) => void;
  onMarkChange?: (id: number, mark: number) => void;
  onSubmitForReview?: (id: number) => void;
  onStatusChange?: (id: number, status: 'Draft' | 'In Review' | 'Published') => void;
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
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [mark]);

  const commit = useCallback(() => {
    const parsed = Number(draft);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onMarkChange?.(id, parsed);
    }
    setEditing(false);
  }, [draft, id, onMarkChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') setEditing(false);
    },
    [commit],
  );

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
  onStatusChange,
  isSelected = false,
  onSelect,
}: QuestionCardProps) {
  const { t } = useTranslation('questions');
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const id = Number(question.id);

  // question.type is already snake_case — the key maps directly to i18n + colour maps.
  const typeKey = question.type;
  // Guard against unexpected runtime values arriving from the server.
  const statusColor = STATUS_COLORS[question.status as QuestionStatus] ?? '';

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
      <div
        className="mx-3 overflow-hidden rounded-xl border border-border bg-muted/30"
        style={{ height: 340 }}
      >
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
            statusColor,
          )}
        >
          {t(`statuses.${question.status.toLowerCase().replace(/ /g, '_')}`)}
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
              {/* Change Status submenu */}
              <DropdownMenuPrimitive.Sub>
                <DropdownMenuPrimitive.SubTrigger className="px-3 py-2 rounded-lg cursor-pointer text-foreground hover:bg-muted outline-none flex items-center justify-between">
                  {t('card.change_status')}
                  <span className="ms-2 opacity-50">›</span>
                </DropdownMenuPrimitive.SubTrigger>
                <DropdownMenuPrimitive.Portal>
                  <DropdownMenuPrimitive.SubContent
                    sideOffset={4}
                    className="z-50 min-w-[130px] rounded-xl border border-border bg-card shadow-lg p-1 text-sm"
                  >
                    {(['Draft', 'In Review', 'Published'] as const).map((s) => (
                      <DropdownMenuPrimitive.Item
                        key={s}
                        className="px-3 py-2 rounded-lg cursor-pointer text-foreground hover:bg-muted outline-none"
                        onSelect={() => onStatusChange?.(id, s)}
                      >
                        {t(`card.status_${s.toLowerCase().replace(' ', '_')}` as Parameters<typeof t>[0])}
                      </DropdownMenuPrimitive.Item>
                    ))}
                  </DropdownMenuPrimitive.SubContent>
                </DropdownMenuPrimitive.Portal>
              </DropdownMenuPrimitive.Sub>
              {/* Calls onDelete without internal confirmation — parent shows the dialog. */}
              <DropdownMenuPrimitive.Item
                className="px-3 py-2 rounded-lg cursor-pointer text-destructive hover:bg-destructive/10 outline-none"
                onSelect={() => onDelete?.(id)}
              >
                {t('delete')}
              </DropdownMenuPrimitive.Item>
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
      </div>
    </div>
  );
}

export { QuestionCard, type QuestionCardProps };
export default memo(QuestionCard);
