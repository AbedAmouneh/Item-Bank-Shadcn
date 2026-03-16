# Phase 4 — libs/questions/components Migration
## Highest-Risk Phase — Work Step by Step

---

## CONTEXT — READ THIS FIRST

**This is the most complex phase.** It has two distinct sub-goals:

1. **Relocate shadcn components** from `apps/item-bank/src/components/ui/` into `libs/ui/src/components/ui/` so that `libs/questions` (and any other lib) can import them. Libraries cannot import from `apps/`.

2. **Migrate 7 shared components** in `libs/questions/src/components/`:
   - `QuestionsTable.tsx` — replace `material-react-table` with `@tanstack/react-table`
   - `AddQuestionModal.tsx` — replace MUI Dialog + MUI icons with Radix Dialog + lucide
   - `QuestionTypeTile.tsx` — replace `styled(Box)` with Tailwind
   - `JustificationInput.tsx` — replace MUI Select/TextField with shadcn Select/Input
   - `BackgroundImageSettings.tsx` — replace MUI form components with Tailwind
   - `QuestionEditorShell.tsx` — replace MUI Paper/Accordion/Popover/Dialog with shadcn/Radix
   - `QuestionViewShell.tsx` — replace MUI Paper/Typography/styled with Tailwind

**DO NOT TOUCH — EVER:**
- Any `<canvas>` element
- Any `Editor` component from `@tinymce/tinymce-react`
- Any `useForm`, `FormProvider`, `useFormContext` from react-hook-form
- Any drag-and-drop handlers or ref callbacks
- All business logic, domain types, factory functions, and question editor imports inside `QuestionEditorShell`

---

## STEP 1 — Move shadcn components into `libs/ui`

This step unlocks all subsequent steps that import shadcn primitives.

### 1a. Create the target directory
```bash
mkdir -p libs/ui/src/components/ui
```

### 1b. Copy all shadcn component files
```bash
cp apps/item-bank/src/components/ui/*.tsx libs/ui/src/components/ui/
```

### 1c. Fix the `cn()` import path in every copied file

Each copied file has an import like:
```ts
import { cn } from '@/lib/utils'
```
or
```ts
import { cn } from '../../lib/utils'
```

In `libs/ui/src/components/ui/`, the correct relative path to the utils is:
```ts
import { cn } from '../../lib/utils'
```

Run a search-replace across all copied files:
```bash
# Check what import pattern exists
grep -rn "from '.*utils'" libs/ui/src/components/ui/

# Replace @/lib/utils references
sed -i "s|from '@/lib/utils'|from '../../lib/utils'|g" libs/ui/src/components/ui/*.tsx
```

Manually verify a couple of files to confirm the import path is correct.

### 1d. Update `libs/ui/src/index.ts`

Open `libs/ui/src/index.ts`. Add these exports **after** the existing exports — do not remove anything that is already there:

```ts
// shadcn UI primitives — available to all libs via @item-bank/ui
export { Button, buttonVariants } from './components/ui/button';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from './components/ui/select';
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';
export { Badge, badgeVariants } from './components/ui/badge';
export { Separator } from './components/ui/separator';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card';
export { Textarea } from './components/ui/textarea';
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip';
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/ui/alert-dialog';
export {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from './components/ui/avatar';
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './components/ui/accordion';
export {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './components/ui/popover';
export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './components/ui/sheet';
```

> If any of those component files don't exist in `libs/ui/src/components/ui/` (because they weren't installed in the app), skip that export line — do not create empty files.

### 1e. Verify step 1 compiles
```bash
npx nx typecheck item-bank
```
Fix any import path errors before continuing. Do NOT proceed to Step 2 until this passes.

---

## STEP 2 — Install @tanstack/react-table

```bash
pnpm add @tanstack/react-table
```

Verify it appears in `package.json` dependencies.

---

## STEP 3 — Add CSS tokens for table and editor (if missing)

Open `apps/item-bank/src/styles.css`. Add any missing tokens:

```css
/* Inside :root { } */
--table-head-color: 215 16% 47%;
--surface-card: 0 0% 100%;
--editor-background: 0 0% 100%;
--choice-editor-background: 0 0% 100%;
--choice-editor-border: 214 32% 91%;
--choice-feedback-background: 210 40% 98%;
--choice-item-background: 210 40% 98%;
--choice-item-border: 214 32% 91%;
--question-view-background: 0 0% 100%;
--question-view-border: 214 32% 91%;
--question-view-question-text: 215 16% 47%;

/* Inside .dark { } */
--table-head-color: 215 20% 65%;
--surface-card: 217 33% 13%;
--editor-background: 217 33% 13%;
--choice-editor-background: 217 33% 15%;
--choice-editor-border: 217 33% 20%;
--choice-feedback-background: 217 33% 17%;
--choice-item-background: 217 33% 15%;
--choice-item-border: 217 33% 22%;
--question-view-background: 217 33% 13%;
--question-view-border: 217 33% 20%;
--question-view-question-text: 215 20% 65%;
```

---

## STEP 4 — Rewrite `libs/questions/src/components/QuestionsTable.tsx`

This is the highest-risk change. Read the entire existing file before starting.

### Imports — remove all of these:
```ts
import { Box, Typography, Chip, IconButton, Paper, useTheme, alpha, styled, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import { MaterialReactTable, useMaterialReactTable, type MRT_ColumnDef } from 'material-react-table'
import { MRT_Localization_AR } from 'material-react-table/locales/ar'
import MoreVertIcon from '@mui/icons-material/MoreVert'
```

### Imports — keep all of these (untouched):
```ts
import { useTranslation } from 'react-i18next'
import { ActionButton } from '@item-bank/ui'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { type QuestionType } from '../domain/types'
import AddQuestionModal from './AddQuestionModal'
```

### Imports — add these:
```ts
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortingRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { MoreVertical, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@item-bank/ui'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
```

### Keep ALL type definitions and interface declarations untouched:
`QuestionStatus`, `QuestionChoice`, `QuestionRow` (the large interface), `QuestionsTableProps` — do not touch these.

### Replace the two styled components at the top:
Remove `StyledPaper = styled(Paper)(...)` and `StyledChip = styled(Chip)(...)`.

### Add color map constants after the type definitions:

```tsx
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
```

### New component body (replace from `const QuestionsTable = ` to the end):

```tsx
const QuestionsTable = ({ questions = [], onQuestionTypeChange, handleQuestionViewOpen, onEditQuestion, onDeleteQuestion }: QuestionsTableProps) => {
  const { t, i18n } = useTranslation('questions')

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
    [t, rowMenuOpen, openRowMenu, closeRowMenu, viewQuestion, openEdit, openDeleteDialog]
  )

  const table = useReactTable({
    data: questions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortingRowModel: getSortingRowModel(),
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
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
          >
            <ChevronLeft size={16} className="rtl:rotate-180" />
          </button>
          <button
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
```

---

## STEP 5 — Rewrite `libs/questions/src/components/AddQuestionModal.tsx`

### Imports — remove all of these:
```ts
import { Dialog, DialogTitle, DialogContent, Box, TextField, IconButton, Typography, InputAdornment, alpha, styled } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import ShortTextIcon from '@mui/icons-material/ShortText'
import ArticleIcon from '@mui/icons-material/Article'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import ImageIcon from '@mui/icons-material/Image'
import GestureIcon from '@mui/icons-material/Gesture'
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel'
import PlaceIcon from '@mui/icons-material/Place'
import CalculateIcon from '@mui/icons-material/Calculate'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import SpellcheckIcon from '@mui/icons-material/Spellcheck'
import ReorderIcon from '@mui/icons-material/Reorder'
import FindInPageIcon from '@mui/icons-material/FindInPage'
import HighlightIcon from '@mui/icons-material/Highlight'
import MicIcon from '@mui/icons-material/Mic'
import CategoryIcon from '@mui/icons-material/Category'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
// And the two styled components: ModalHeader, SearchField, TileGrid
```

### Imports — keep:
```ts
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import QuestionTypeTile from './QuestionTypeTile'
import { PICKER_QUESTION_TYPES } from './questionTypePickerData'
import type { QuestionType } from '../domain/types'
```

### Imports — add:
```ts
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  CheckCheck, ListChecks, AlignLeft, FileText, GripHorizontal, Image,
  Pen, GalleryHorizontal, MapPin, Calculator, PenLine, SpellCheck,
  List, ScanSearch, Highlighter, Mic, Tags, Images, GitMerge, X, Search
} from 'lucide-react'
import { cn } from '@item-bank/ui'
```

### Replace `TILE_ICONS`:
```tsx
const TILE_ICONS: Record<QuestionType, React.ReactElement> = {
  true_false: <CheckCheck />,
  multiple_choice: <ListChecks />,
  short_answer: <AlignLeft />,
  essay: <FileText />,
  drag_drop_text: <GripHorizontal />,
  drag_drop_image: <Image />,
  free_hand_drawing: <Pen />,
  image_sequencing: <GalleryHorizontal />,
  multiple_hotspots: <MapPin />,
  numerical: <Calculator />,
  fill_in_blanks: <PenLine />,
  select_correct_word: <SpellCheck />,
  text_sequencing: <List />,
  fill_in_blanks_image: <ScanSearch />,
  highlight_correct_word: <Highlighter />,
  record_audio: <Mic />,
  text_classification: <Tags />,
  image_classification: <Images />,
  matching: <GitMerge />,
}
```

### New JSX return (replace from `return (` to end):
```tsx
return (
  <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-xl flex flex-col animate-in fade-in-0 zoom-in-95 focus:outline-none">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
            {t('add_questions_title')}
          </DialogPrimitive.Title>

          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                className="ps-8 pe-3 py-1.5 text-sm rounded-xl border border-border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-52 placeholder:text-muted-foreground text-foreground"
                placeholder={t('search_question_types')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <DialogPrimitive.Close className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
        </div>

        {/* Tile grid */}
        <div className="p-6 overflow-y-auto">
          {filteredTypes.length > 0 ? (
            <div className="grid grid-cols-4 gap-1">
              {filteredTypes.map((type) => (
                <QuestionTypeTile
                  key={type}
                  label={t(`types.${type}`)}
                  icon={TILE_ICONS[type]}
                  onClick={() => handleSelect(type)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('no_types_found')}
            </div>
          )}
        </div>

      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
)
```

---

## STEP 6 — Rewrite `libs/questions/src/components/QuestionTypeTile.tsx`

Complete replacement:

```tsx
import React from 'react'
import { cn } from '@item-bank/ui'

interface QuestionTypeTileProps {
  label: string
  icon: React.ReactNode
  onClick: () => void
  selected?: boolean
}

export default function QuestionTypeTile({ label, icon, onClick, selected }: QuestionTypeTileProps) {
  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'flex flex-col items-center gap-3 py-5 px-3 rounded-2xl cursor-pointer transition-colors duration-150 select-none',
        'outline-none border-2 focus-visible:border-primary',
        selected
          ? 'border-primary bg-primary/10 dark:bg-primary/20'
          : 'border-transparent hover:bg-primary/[0.06] dark:hover:bg-primary/[0.12]'
      )}
    >
      {/* Icon circle */}
      <div className="w-[72px] h-[72px] rounded-full bg-primary/[0.08] dark:bg-primary/[0.15] flex items-center justify-center text-primary-dark dark:text-primary flex-shrink-0">
        {React.isValidElement(icon)
          ? React.cloneElement(icon as React.ReactElement<{ size?: number; strokeWidth?: number }>, {
              size: 32,
              strokeWidth: 1.5,
            })
          : icon}
      </div>

      <span className="text-[0.8125rem] font-medium leading-[1.35] text-foreground text-center max-w-[100px]">
        {label}
      </span>
    </button>
  )
}
```

---

## STEP 7 — Rewrite `libs/questions/src/components/JustificationInput.tsx`

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '@item-bank/ui'
import { useTranslation } from 'react-i18next'
import { memo } from 'react'

export type JustificationMode = 'disabled' | 'optional' | 'required'

type JustificationInputProps = {
  mode: JustificationMode
  fraction: number
  onModeChange: (mode: JustificationMode) => void
  onFractionChange: (fraction: number) => void
}

function JustificationInput({ mode, fraction, onModeChange, onFractionChange }: JustificationInputProps) {
  const { t } = useTranslation('questions')

  return (
    <div className="flex gap-4 flex-wrap items-end">
      <div className="min-w-[200px]">
        <Select value={mode} onValueChange={(v) => onModeChange(v as JustificationMode)}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder={t('editor.drag_drop_image.justification_mode_label')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="disabled">{t('editor.drag_drop_image.justification_mode_disabled')}</SelectItem>
            <SelectItem value="optional">{t('editor.drag_drop_image.justification_mode_optional')}</SelectItem>
            <SelectItem value="required">{t('editor.drag_drop_image.justification_mode_required')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode !== 'disabled' && (
        <Input
          type="number"
          value={fraction}
          onChange={(e) => onFractionChange(Number(e.target.value))}
          min={0}
          max={100}
          step={1}
          className="w-40 text-sm"
          placeholder={t('editor.drag_drop_image.justification_fraction_label')}
        />
      )}
    </div>
  )
}

export default memo(JustificationInput)
```

---

## STEP 8 — Rewrite `libs/questions/src/components/BackgroundImageSettings.tsx`

Read the full file first. The key things to preserve:
- All `useRef`, `useState`, `useFormContext` usage
- `fileToDataUrl` helper function
- All drag-and-drop file handling logic (`handleDragOver`, `handleDrop`, `handleDragLeave`)
- `handleFileChange` handler and the hidden `<input type="file">` ref
- All `register`, `watch`, `setValue` calls

**Remove**: `Box, Typography, TextField, Switch, FormControlLabel, Button, IconButton` from `@mui/material`, `AddPhotoAlternateOutlinedIcon`, `DeleteOutlinedIcon` from `@mui/icons-material`, `styled` from `@mui/material/styles`, `ToggleLabel`, `DropZone`, `DimensionField`, `ImagePreviewWrapper` styled components.

**Add**:
```ts
import { Input } from '@item-bank/ui'
import { ImagePlus, Trash2 } from 'lucide-react'
import { cn } from '@item-bank/ui'
```

**Replace styled wrappers with Tailwind:**

`DropZone` → use `cn()`:
```tsx
<div
  className={cn(
    'border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors duration-200',
    dragOver
      ? 'border-primary bg-primary/[0.05]'
      : 'border-border bg-muted/30 hover:border-primary/50'
  )}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
  onDragLeave={handleDragLeave}
  onClick={() => fileInputRef.current?.click()}
>
  <ImagePlus size={32} className="text-muted-foreground" />
  <p className="text-sm text-muted-foreground text-center">{t('editor.background_image.drop_zone_hint')}</p>
</div>
```

`DimensionField` (width/height inputs) → shadcn `Input`:
```tsx
<Input
  type="number"
  value={width}
  onChange={(e) => setValue('canvasWidth', Number(e.target.value))}
  className="w-28 h-9 text-sm"
/>
```

`ToggleLabel` (Switch + FormControlLabel) → native toggle:
```tsx
<label className="flex items-center gap-2.5 cursor-pointer select-none">
  <span className="text-sm text-foreground">{label}</span>
  <div className="relative">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <div className="w-9 h-5 bg-muted rounded-full transition-colors peer-checked:bg-primary" />
    <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
  </div>
</label>
```

`ImagePreviewWrapper` → plain div:
```tsx
<div className="w-[480px] h-[360px] rounded-2xl bg-muted/30 border border-border overflow-hidden flex items-center justify-center">
  <img className="w-full h-full object-contain" src={previewUrl} alt="background preview" />
</div>
```

Add photo button:
```tsx
<button
  type="button"
  onClick={() => fileInputRef.current?.click()}
  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors text-foreground"
>
  <ImagePlus size={15} />
  {t('editor.background_image.upload_btn')}
</button>
```

Delete button:
```tsx
<button
  type="button"
  onClick={handleDelete}
  className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
>
  <Trash2 size={16} />
</button>
```

---

## STEP 9 — Rewrite `libs/questions/src/components/QuestionEditorShell.tsx`

Read the full file. The internal component is `QuestionEditorShellForm`. The exported `QuestionEditorShell` routes to `DragDropImageWizard` or `MatchingWizard` for those types, and to `QuestionEditorShellForm` for everything else. Keep this routing logic exactly.

**Remove from imports**:
```ts
Box, TextField, Typography, Paper, useTheme, alpha, styled, Popover, Button,
Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
Accordion, AccordionSummary, AccordionDetails
```
```ts
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CampaignIcon from '@mui/icons-material/Campaign'
```

**Keep ALL other imports** (TinyMCE, react-hook-form, all question editor imports, i18n, domain types).

**Add**:
```ts
import { Input, Accordion, AccordionContent, AccordionItem, AccordionTrigger, Popover, PopoverContent, PopoverTrigger } from '@item-bank/ui'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Megaphone, X } from 'lucide-react'
import { cn } from '@item-bank/ui'
```

**Replace styled components** (remove `StyledPaper`, `EditorWrapper`, `PopoverTextField`):

`StyledPaper` → `<div className="rounded-3xl border border-border bg-card overflow-hidden">`

`EditorWrapper` → `<div className="rounded-xl border border-border overflow-hidden bg-[hsl(var(--editor-background))]">`

`PopoverTextField` → shadcn `Input` from `@item-bank/ui`

**Replace Accordion** (the feedback settings section):
```tsx
<Accordion type="single" collapsible className="rounded-xl border border-border overflow-hidden">
  <AccordionItem value="feedback" className="border-none">
    <AccordionTrigger className="px-4 py-3 hover:no-underline">
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {t('editor.feedback_settings', { defaultValue: t('editor.feedback') })}
        </span>
      </div>
    </AccordionTrigger>
    <AccordionContent className="px-4 pb-4 flex flex-col gap-4">
      {/* Correct answer feedback */}
      <div>
        <span className="block text-xs font-medium text-muted-foreground mb-2">
          {t('editor.correct_answer_feedback')}
        </span>
        <div className="rounded-xl border border-border overflow-hidden bg-[hsl(var(--editor-background))]">
          <Editor ... /> {/* keep exactly as-is */}
        </div>
      </div>
      {/* Partially correct + incorrect — same pattern */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

**Replace MUI Popover** (key insert dialog) with shadcn Popover:
```tsx
<Popover open={isKeyDialogOpen} onOpenChange={(open) => { if (!open) handleKeyDialogClose() }}>
  <PopoverTrigger asChild>
    {/* This trigger is programmatically opened — wrap a hidden span as anchor */}
    <span ref={anchorEl} />
  </PopoverTrigger>
  <PopoverContent className="w-72 p-4 flex flex-col gap-3" side="bottom" align="center">
    <Input
      autoFocus
      placeholder={...} /* keep existing t() call */
      value={keyInputValue}
      onChange={(e) => setKeyInputValue(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleKeyInsert() }}}
      className="text-sm"
    />
    <div className="flex gap-2 justify-end">
      <button type="button" onClick={handleKeyDialogClose}
        className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-foreground">
        {t('editor.fill_in_blanks.dialog_cancel_btn')}
      </button>
      <button type="button" onClick={handleKeyInsert}
        className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        {t('editor.fill_in_blanks.dialog_insert_btn')}
      </button>
    </div>
  </PopoverContent>
</Popover>
```

> Note: The existing Popover is anchored to `anchorEl` state (an HTMLElement ref). Adapt the trigger anchor to use a `ref` on a wrapper span positioned near the TinyMCE toolbar button that opens it.

**Replace both MUI Dialogs** (rename key dialog, delete key dialog) with Radix Dialog:
```tsx
<DialogPrimitive.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
    <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-xl focus:outline-none">
      <DialogPrimitive.Title className="text-base font-semibold text-foreground mb-4">
        {t('rename_key')}
      </DialogPrimitive.Title>
      <Input
        autoFocus
        value={newKeyName}
        onChange={(e) => { setNewKeyName(e.target.value); setKeyNameError('') }}
        className={cn('text-sm', keyNameError && 'border-destructive')}
        placeholder={t('new_key_name')}
      />
      {keyNameError && <p className="text-xs text-destructive mt-1">{keyNameError}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={handleCloseRenameDialog}
          className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors">
          {t('cancel')}
        </button>
        <button type="button" onClick={handleConfirmRename}
          className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          {t('rename_key')}
        </button>
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>
```

Apply the same pattern for the delete key dialog.

**Replace action buttons** (Cancel + Save at bottom of form):
```tsx
<div className="flex justify-end gap-4 mt-8 pt-6 border-t border-border">
  <button
    type="button"
    onClick={onCancel}
    className="px-6 py-2.5 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors text-foreground"
  >
    {t('common:profile.cancel')}
  </button>
  <button
    type="submit"
    className="px-6 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
  >
    {t('common:profile.save')}
  </button>
</div>
```

**Replace question name TextField**:
```tsx
<Input
  placeholder={t('editor.question_name_placeholder')}
  value={questionName}
  onChange={(e) => setValue('name', e.target.value)}
  className="text-base font-medium"
/>
```

**Replace mark TextField**:
```tsx
<Input
  type="number"
  placeholder={t('editor.mark')}
  value={mark}
  onChange={(e) => setValue('mark', Number(e.target.value))}
  min={0}
  className="w-28 text-sm"
/>
```

---

## STEP 10 — Rewrite `libs/questions/src/components/QuestionViewShell.tsx`

This file is simple. Remove `Typography, Paper, styled` from MUI. Replace `ViewCard = styled(Paper)(...)` with:

```tsx
import { cn } from '@item-bank/ui'

// Remove ViewCard styled component entirely
// Replace <ViewCard className="p-6 rounded-xl" elevation={0}> with:
<div className="p-6 rounded-xl border border-[hsl(var(--question-view-border))] bg-[hsl(var(--question-view-background))]">
```

Replace `<Typography className="text-[1.25rem] font-semibold py-4 px-0" sx={...}>` with:
```tsx
<h2 className="text-[1.25rem] font-semibold py-4 text-foreground">{question?.questionName}</h2>
```

Replace the `dangerouslySetInnerHTML` Typography with:
```tsx
<div
  className="text-[0.95rem] font-medium mb-2 text-[hsl(var(--question-view-question-text))]"
  dangerouslySetInnerHTML={{ __html: question.question_text }}
/>
```

Everything else in this file (the type switch, all view component imports) stays exactly as-is.

---

## VERIFICATION

### 1. TypeScript check after each step
After steps 1, 4, 5, 6, 7, 8, 9, 10 — run:
```bash
npx nx typecheck item-bank
```
Fix errors before proceeding. Do NOT accumulate errors across steps.

### 2. Final grep check
```bash
grep -rn "from '@mui" libs/questions/src/components/
grep -rn "from 'material-react-table'" libs/
```
Expected: **0 results**

### 3. Browser checklist

**Questions table:**
- [ ] Table renders with correct columns (name, type, mark, status, last modified, actions)
- [ ] Type badges are colored correctly per question type
- [ ] Status badges: Draft=gray, Published=green, In Review=amber
- [ ] Column header sort arrows appear, clicking sorts ascending/descending
- [ ] Pagination: prev/next buttons, page counter shows correctly
- [ ] Row click opens `QuestionViewShell`
- [ ] 3-dot menu opens dropdown with Preview / Edit / Delete
- [ ] Delete dialog opens, Cancel dismisses, Confirm calls `onDeleteQuestion`
- [ ] All above in dark mode
- [ ] RTL: pagination arrows flip direction

**Add Question Modal:**
- [ ] Opens when "Add Question" button clicked
- [ ] 19 question type tiles render in a 4-column grid
- [ ] Search input filters tiles
- [ ] Clicking a tile calls `onSelectType` and closes modal
- [ ] Dark mode renders correctly
- [ ] Close button (X) works

**QuestionEditorShell:**
- [ ] Question name input renders
- [ ] TinyMCE question text editor renders (do NOT touch its init)
- [ ] Feedback accordion expands/collapses
- [ ] For fill_in_blanks / select_correct_word / drag_drop_text: Popover appears when key insert triggered
- [ ] Rename + Delete key dialogs open and close correctly
- [ ] Cancel and Save buttons work

**QuestionViewShell:**
- [ ] Question name renders as heading
- [ ] Question text HTML renders
- [ ] Correct view component renders per question type

### 4. Commit
```bash
git add libs/questions/src/components/ libs/ui/src/ apps/item-bank/src/styles.css
git commit -m "Phase 4: move shadcn to libs/ui, migrate questions/components (QuestionsTable→TanStack, AddQuestionModal, EditorShell, ViewShell, etc.)"
git push origin main
```
