import { useTranslation } from 'react-i18next'
import {
  ActionButton,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@item-bank/ui'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { GetQuestionsParams } from '@item-bank/api'
import { type QuestionType } from '../domain/types'
import { useSubmitForReview } from '../domain'
import AddQuestionModal from './AddQuestionModal'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { MoreVertical, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Download } from 'lucide-react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'

type QuestionStatus = 'Draft' | 'Published' | 'In Review'

export type QuestionChoice = {
  id: number,
  answer: string,
  fraction: string,
  feedback: string | null,
  ignore_casing: boolean,
}

export interface QuestionRow {
  id: number | string
  questionName: string
  type: QuestionType
  mark: number
  status: QuestionStatus
  lastModified: string
  question_text: string
  correct_choice?: boolean
  choices?: QuestionChoice[]
  multipleChoiceAllowPartialCredit?: boolean
  essayResponseFormat?: 'html' | 'html_with_file_picker' | 'plain_text'
  fillInBlanksContent?: string
  fillInBlanksRequireUniqueKeyAnswers?: boolean
  sequencingAllowPartialCredit?: boolean
  selectWordAllowPartialCredit?: boolean
  canvas_width?: number
  canvas_height?: number
  background_image?: string | null
  hotspots?: Array<{
    type: 'rectangle' | 'circle' | 'polygon'
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
    points?: number[]
    color: string
    strokeWidth: number
    isCorrect: boolean
    mark?: number
  }>
  minSelections?: number
  maxSelections?: number
  hotspotsAllowPartialCredit?: boolean
  inputAreas?: Array<{
    id: string
    x: number
    y: number
    width: number
    height: number
    answers: Array<{
      id: string
      text: string
      mark: number
      ignoreCasing: boolean
    }>
  }>
  // Record audio specific
  numberOfRecordingsMin?: number
  numberOfRecordingsMax?: number
  recordingDurationMinSeconds?: number
  recordingDurationMaxSeconds?: number
  // Highlight correct word specific
  highlightPenaltyPercent?: number
  // Drag-drop-text specific
  dragDropItems?: Array<{
    id: string;
    key: string;
    answer: string;
    groupId: string;
    markPercent: number;
    unlimitedReuse: boolean;
  }>
  dragDropGroups?: Array<{
    id: string;
    name: string;
    color: string;
  }>
  // Drag-drop-image specific
  dragDropImageItems?: Array<{
    id: string;
    itemType: 'text' | 'image';
    answer: string;
    image?: string;
    groupId: string;
    markPercent: number;
    unlimitedReuse: boolean;
    zones: Array<{ id: string; left: number; top: number; width?: number; height?: number }>;
  }>
  dragDropImageGroups?: Array<{
    id: string;
    name: string;
    color: string;
  }>
  justificationMode?: 'required' | 'optional' | 'disabled';
  justificationFraction?: number;
  // Numerical specific
  numericalAnswers?: Array<{
    id: string;
    answer: number;
    error: number;
    mark: number;
    feedback: boolean;
  }>
  numericalUnitHandling?: 'required' | 'optional' | 'disabled';
  numericalUnitInputMethod?: 'multiple_choice_selection' | 'drop_down' | 'text_input';
  numericalUnitPenalty?: number;
  numericalUnits?: Array<{
    id: string;
    unit: string;
    multiplier: number;
  }>
  // Text classification specific
  textClassificationCategories?: Array<{
    id: string;
    name: string;
    color: string;
    answers: Array<{
      id: string;
      text: string;
      feedback?: string;
      markPercent: number;
    }>;
  }>
  textClassificationLayout?: 'columns' | 'rows';
  textClassificationJustification?: 'disabled' | 'optional' | 'required';
  textClassificationJustificationFraction?: number;
  // Image classification specific
  imageClassificationCategories?: Array<{
    id: string;
    name: string;
    color: string;
    answers: Array<{
      id: string;
      imageUrl: string;
      feedback?: string;
      markPercent: number;
    }>;
  }>
  // Matching specific
  matchingLeftItems?: Array<{
    id: string;
    text: string;
    imageUrl: string;
    multipleAnswers: boolean;
    linkedRightIds: string[];
    markPercent: number;
  }>
  matchingRightItems?: Array<{
    id: string;
    text: string;
    imageUrl: string;
  }>
  matchingLeftMode?: 'text' | 'image';
  matchingRightMode?: 'text' | 'image';
  matchingJustification?: 'disabled' | 'optional' | 'required';
}

type QuestionsTableProps = {
  questions?: QuestionRow[]
  onQuestionTypeChange?: (questionType: QuestionType) => void
  handleQuestionViewOpen?: (row: QuestionRow) => void
  onEditQuestion?: (row: QuestionRow) => void
  onDeleteQuestion?: (row: QuestionRow) => void
  onSubmitForReview?: (id: number) => void
  /** Active filter params forwarded to the export URL so the download respects the current view. */
  exportParams?: GetQuestionsParams
}

/**
 * Constructs the export URL with active filter params.
 */
function buildExportUrl(format: 'xlsx' | 'pdf', params?: GetQuestionsParams): string {
  const base = import.meta.env.VITE_API_BASE_URL as string;
  const query = new URLSearchParams({ format });
  if (params?.type) query.set('type', params.type);
  if (params?.status) query.set('status', params.status);
  if (params?.item_bank_id !== undefined) query.set('item_bank_id', String(params.item_bank_id));
  if (params?.search) query.set('search', params.search);
  return `${base}/questions/export?${query.toString()}`;
}

/**
 * Downloads the export file using fetch + Blob so that the auth cookie is
 * sent correctly on cross-origin requests (frontend port 4200 → API port 3000).
 * window.location.href navigation does not reliably forward httpOnly cookies
 * across different ports, causing 503 auth failures.
 */
async function downloadExport(format: 'xlsx' | 'pdf', params?: GetQuestionsParams): Promise<void> {
  const url = buildExportUrl(format, params);
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = format === 'xlsx' ? 'questions.xlsx' : 'questions.pdf';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

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
}

const STATUS_COLORS: Record<QuestionStatus, string> = {
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  Published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'In Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

const QuestionsTable = ({ questions = [], onQuestionTypeChange, handleQuestionViewOpen, onEditQuestion, onDeleteQuestion, onSubmitForReview, exportParams }: QuestionsTableProps) => {
  const { t } = useTranslation('questions')
  const submitForReview = useSubmitForReview()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [rowMenuOpen, setRowMenuOpen] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<QuestionRow | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const selectedRow = useRef<QuestionRow | null>(null)

  const openRowMenu = useCallback((id: string, row: QuestionRow) => {
    setRowMenuOpen(id)
    selectedRow.current = row
  }, [])

  const closeRowMenu = useCallback(() => {
    setRowMenuOpen(null)
    selectedRow.current = null
  }, [])

  const viewQuestion = useCallback(() => {
    if (!selectedRow.current) return
    handleQuestionViewOpen?.(selectedRow.current)
    closeRowMenu()
  }, [closeRowMenu, handleQuestionViewOpen])

  const openEdit = useCallback(() => {
    if (!selectedRow.current) return
    onEditQuestion?.(selectedRow.current)
    closeRowMenu()
  }, [closeRowMenu, onEditQuestion])

  const openDeleteDialog = useCallback(() => {
    if (!selectedRow.current) return
    setQuestionToDelete(selectedRow.current)
    setDeleteDialogOpen(true)
    closeRowMenu()
  }, [closeRowMenu])

  const confirmDelete = useCallback(() => {
    if (!questionToDelete) return
    onDeleteQuestion?.(questionToDelete)
    setDeleteDialogOpen(false)
    setQuestionToDelete(null)
  }, [questionToDelete, onDeleteQuestion])

  const submitForReviewAction = useCallback(() => {
    if (!selectedRow.current) return
    const id = Number(selectedRow.current.id)
    submitForReview.mutate(id)
    onSubmitForReview?.(id)
    closeRowMenu()
  }, [submitForReview, onSubmitForReview, closeRowMenu])

  const columns = useMemo<ColumnDef<QuestionRow>[]>(
    () => [
      {
        accessorKey: 'questionName',
        header: t('question_name'),
        size: 300,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground">{getValue<string>() ?? ''}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: t('type'),
        size: 180,
        cell: ({ getValue }) => {
          const type = getValue<QuestionType>()
          const typeKey = type.toLowerCase().replace(/ /g, '_')
          return (
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-lg text-[0.6875rem] font-medium',
              TYPE_COLORS[type]
            )}>
              {t(`types.${typeKey}`)}
            </span>
          )
        },
      },
      {
        accessorKey: 'mark',
        header: t('mark'),
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('status'),
        size: 130,
        cell: ({ getValue }) => {
          const status = getValue<QuestionStatus>()
          const statusKey = status.toLowerCase().replace(/ /g, '_')
          return (
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-lg text-[0.6875rem] font-medium',
              STATUS_COLORS[status]
            )}>
              {t(`statuses.${statusKey}`)}
            </span>
          )
        },
      },
      {
        accessorKey: 'lastModified',
        header: t('last_modified'),
        size: 140,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground">{getValue<string>()}</span>
        ),
      },
      {
        id: 'actions',
        header: t('actions'),
        size: 70,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <DropdownMenuPrimitive.Root
              open={rowMenuOpen === row.id}
              onOpenChange={(open) => {
                if (open) openRowMenu(row.id, row.original)
                else closeRowMenu()
              }}
            >
              <DropdownMenuPrimitive.Trigger asChild>
                <button
                  aria-label={t('row_menu')}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical size={16} />
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
                    onSelect={viewQuestion}
                  >
                    {t('preview')}
                  </DropdownMenuPrimitive.Item>
                  <DropdownMenuPrimitive.Item
                    className="px-3 py-2 rounded-lg cursor-pointer text-foreground hover:bg-muted outline-none"
                    onSelect={openEdit}
                  >
                    {t('edit')}
                  </DropdownMenuPrimitive.Item>
                  {row.original.status === 'Draft' && (
                    <DropdownMenuPrimitive.Item
                      className="px-3 py-2 rounded-lg cursor-pointer text-foreground hover:bg-muted outline-none"
                      onSelect={submitForReviewAction}
                    >
                      {t('submit_for_review')}
                    </DropdownMenuPrimitive.Item>
                  )}
                  <DropdownMenuPrimitive.Item
                    className="px-3 py-2 rounded-lg cursor-pointer text-destructive hover:bg-destructive/10 outline-none"
                    onSelect={openDeleteDialog}
                  >
                    {t('delete')}
                  </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
              </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>
          </div>
        ),
      },
    ],
    [t, rowMenuOpen, openRowMenu, closeRowMenu, viewQuestion, openEdit, openDeleteDialog, submitForReviewAction]
  )

  const table = useReactTable({
    data: questions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
    getRowId: (row) => String(row.id),
  })

  return (
    <div className="w-full rounded-3xl overflow-hidden border border-border bg-[hsl(var(--surface-card))]">

      {/* Header bar */}
      <div className="pt-6 px-6 pb-4 flex justify-between items-center">
        <h2 className="font-semibold text-xl text-foreground">{t('questions')}</h2>
        <div className="flex gap-2 items-center">
          {/* Export dropdown — triggers a server-side file download */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <Download size={14} />
                {t('export')}
                <ChevronDown size={14} className="opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => { void downloadExport('xlsx', exportParams); }}
              >
                {t('export_excel')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => { void downloadExport('pdf', exportParams); }}
              >
                {t('export_pdf')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ActionButton
            btnLabel={t('add_question')}
            onClick={() => setAddModalOpen(true)}
          />
        </div>
      </div>

      {/* Table scroll container */}
      <div className="w-full px-6 pb-4 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-start text-[0.6875rem] font-semibold uppercase tracking-[0.8px] text-[hsl(var(--table-head-color))] px-3 py-3 border-b border-border"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="flex flex-col">
                            <ChevronUp size={10} className={header.column.getIsSorted() === 'asc' ? 'text-primary' : 'opacity-30'} />
                            <ChevronDown size={10} className={header.column.getIsSorted() === 'desc' ? 'text-primary' : 'opacity-30'} />
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border cursor-pointer hover:bg-primary/[0.04] transition-colors"
                  onClick={() => handleQuestionViewOpen?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-muted-foreground">
                  {t('no_questions')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border">
        <span className="text-sm text-muted-foreground">
          {t('page')} {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
        </span>
        <div className="flex items-center gap-1">
          <button
            aria-label={t('previous_page')}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
          >
            <ChevronLeft size={16} className="rtl:rotate-180" />
          </button>
          <button
            aria-label={t('next_page')}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
          >
            <ChevronRight size={16} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* Add Question Modal */}
      <AddQuestionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSelectType={(type) => onQuestionTypeChange?.(type)}
      />

      {/* Delete confirmation dialog */}
      <AlertDialogPrimitive.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0" />
          <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
            <AlertDialogPrimitive.Title className="text-lg font-semibold text-foreground">
              {t('delete_confirm_title')}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              {t('delete_confirm_message', { name: questionToDelete?.questionName ?? '' })}
            </AlertDialogPrimitive.Description>
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialogPrimitive.Cancel className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors text-foreground">
                {t('cancel')}
              </AlertDialogPrimitive.Cancel>
              <AlertDialogPrimitive.Action
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                {t('delete')}
              </AlertDialogPrimitive.Action>
            </div>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

    </div>
  )
}

export default memo(QuestionsTable)
