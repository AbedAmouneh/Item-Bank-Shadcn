# Phase 6 — libs/questions/pages Group 2: Form-Heavy Editors
## FillInBlanks · FillInBlanksImage · SelectCorrectWord · HighlightCorrectWord · TextSequencing · ImageSequencing · Numerical

---

## CONTEXT — READ THIS FIRST

**Prerequisite:** Phase 4 ✅ and Phase 5 ✅

**Scope:** 10 files across 7 question type directories

**DO NOT TOUCH — EVER:**
- `<Editor>` from `@tinymce/tinymce-react` and ALL its `init` config
- Any custom TinyMCE plugin registration code
- `@dnd-kit` imports and hooks (`useSortable`, `DndContext`, `closestCenter`, sensors, etc.)
- `useFormContext`, `watch`, `setValue` — all form logic untouched
- Canvas elements and their refs
- Any absolute-positioned input overlay code in `FillInBlanksImageEditor`

**Available from `@item-bank/ui`:**
```ts
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, cn } from '@item-bank/ui'
```

**Global replacement rules** (same as Phase 5 — repeated for context):

| MUI | Replace with |
|-----|-------------|
| `<Box>` / `<Stack>` | `<div className="...">` |
| `<Typography variant="h6">` | `<h3 className="text-base font-semibold text-foreground">` |
| `<Typography variant="body2">` | `<p className="text-sm text-muted-foreground">` |
| `<Typography variant="caption">` | `<span className="text-xs font-medium text-muted-foreground">` |
| `<Divider />` | `<hr className="border-border" />` |
| `<TextField>` | `<Input>` from `@item-bank/ui` |
| `<Select>` (MUI) | shadcn `<Select>` from `@item-bank/ui` |
| `<Switch>` + `<FormControlLabel>` | native toggle pattern (see Phase 5) |
| `<Button variant="contained">` | `<button className="... bg-primary text-primary-foreground ...">` |
| `<Button variant="outlined">` | `<button className="... border border-border hover:bg-muted ...">` |
| `<Button variant="text">` | `<button className="... text-primary hover:text-primary/80 ...">` |
| `<IconButton>` | `<button className="p-1.5 rounded-lg ...">` |
| `<Chip>` | `<span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">` |
| `<Paper>` | `<div className="rounded-2xl border border-border bg-card">` |
| `<Alert severity="error">` | `<div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">` |
| `<Alert severity="warning">` | `<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">` |
| `<Collapse in={x}>` | `{x && (...)}` |
| `SelectChangeEvent` | replace event type with `(value: string) => void` |
| `AddIcon` | `Plus` from lucide |
| `DeleteOutlineIcon` / `DeleteIcon` | `Trash2` from lucide |

---

## PREREQUISITE: Check each file's actual MUI imports first

Before editing each file, run:
```bash
grep -n "from '@mui" <filepath>
```
Only remove what is actually imported. Do not assume.

---

## GROUP A — Fill in Blanks (2 files)

### File A1: `libs/questions/src/pages/fill-in-blanks/FillInBlanksEditor.tsx`

Read the full file first.

**Critical rule**: This file has a TinyMCE editor with a custom plugin that inserts blank placeholders. The custom plugin code (likely in a `useFillInBlanksPlugin` hook or inline in `init`) is **completely untouched**.

**What to change**: Only the structural shell components around the editor.

Typical replacements in this file:
- `<Paper>` wrapper → `<div className="rounded-2xl border border-border bg-card overflow-hidden">`
- `<Box>` wrappers → `<div>`
- `<Typography>` heading → `<h3>` or `<p>`
- Answer list: each answer pill/chip → `<span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/50 text-sm font-medium text-foreground">`
- Delete answer button → `<button type="button" className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"><X size={12} /></button>`
- `styled()` wrappers around answer rows → replace with plain divs + `cn()`

After replacement: verify TinyMCE still renders and the blank insertion toolbar button still works.

### File A2: `libs/questions/src/pages/fill-in-blanks/FillInBlanksQuestionView.tsx`

Read the full file first. This is a read-only view.

Replace `<Box>`, `<Typography>`, `<Paper>`, `<Chip>` with plain Tailwind divs/spans.
Blank placeholders in the rendered HTML are styled spans — if they use MUI sx props, replace with inline Tailwind className.

---

## GROUP B — Fill in Blanks Image (2 files)

### File B1: `libs/questions/src/pages/fill-in-blanks-image/FillInBlanksImageEditor.tsx`

**EXTREME CAUTION**: This file overlays `<input>` elements on top of an image using absolute positioning calculated from canvas coordinates. The positioning logic (`left`, `top`, `width`, `height` style props set from state) is **NOT MUI** — it is custom layout. Do NOT touch it.

Read the full file. Identify ONLY these MUI structural wrappers:
- `<Paper>` → `<div className="rounded-2xl border border-border bg-card">`
- `<Box>` layout wrappers → `<div>`
- `<Typography>` → appropriate heading/paragraph
- `<Button>` (add input area) → `<button type="button" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-dashed border-border hover:border-primary hover:text-primary transition-colors">`
- `<IconButton>` (delete area) → `<button type="button" className="absolute top-1 end-1 p-1 rounded-lg bg-white/80 dark:bg-card/80 text-destructive hover:bg-destructive/10 transition-colors z-10"><X size={12} /></button>`

The answer input fields INSIDE each overlay area (text inputs for correct answers) — if they use MUI TextField, replace with: `<input className="text-sm border border-border rounded-lg px-2 py-1 bg-card text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary" />`

### File B2: `libs/questions/src/pages/fill-in-blanks-image/FillInBlanksImageView.tsx`

Read the full file. Replace structural MUI wrappers only. Same caution as B1 about absolute-positioned overlays.

---

## GROUP C — Select Correct Word (2 files)

### File C1: `libs/questions/src/pages/select-correct-word/SelectCorrectWordEditor.tsx`

Read the full file. This editor processes the question text into clickable word tokens.

**The word tokenization and click-handler logic is NOT MUI — do not touch.**

Replace:
- `<Box>` structural wrappers → `<div>`
- `<Typography>` → appropriate heading/paragraph
- `<Paper>` word token container → `<div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-wrap gap-1.5 min-h-[80px]">`

Word token button (unselected):
```tsx
<button
  type="button"
  key={token.id}
  onClick={() => handleTokenClick(token.id)}
  className={cn(
    'inline-flex items-center px-2 py-0.5 rounded-lg text-sm transition-colors cursor-pointer select-none',
    token.isSelected
      ? 'bg-primary/15 text-primary border border-primary/40 font-medium dark:bg-primary/25'
      : 'text-foreground hover:bg-primary/[0.06] hover:border-primary/20 border border-transparent'
  )}
>
  {token.text}
</button>
```

### File C2: `libs/questions/src/pages/select-correct-word/SelectCorrectWordQuestionView.tsx`

Read the file. Same word token pattern — in view mode tokens may not be clickable but use same visual styling with `pointer-events-none` on non-interactive tokens.

---

## GROUP D — Highlight Correct Word (2 files)

### File D1: `libs/questions/src/pages/highlight-correct-word/HighlightCorrectWordEditor.tsx`

Same pattern as SelectCorrectWordEditor. Additionally:
- Replace `<TextField type="number">` for penalty percent with: `<Input type="number" className="w-32 text-sm" min={0} max={100} />`

### File D2: `libs/questions/src/pages/highlight-correct-word/HighlightCorrectWordQuestionView.tsx`

Same pattern as SelectCorrectWordQuestionView.

---

## GROUP E — Text Sequencing (2 files)

### File E1: `libs/questions/src/pages/text-sequencing/TextSequencingEditor.tsx`

Read the full file. This uses `@dnd-kit` for drag-and-drop reordering.

**Do NOT touch**: `DndContext`, `SortableContext`, `useSortable`, `arrayMove`, sensor setup, `useFormContext`.

Replace:
- `<Paper>` list container → `<div className="rounded-2xl border border-border bg-card overflow-hidden">`
- `<Box>` wrappers → `<div>`
- `<Typography>` → heading/paragraph
- MUI drag handle icon → `GripVertical` from lucide
- `<Button>` (add item) → `<button type="button" className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"><Plus size={15} />{label}</button>`
- `<IconButton>` (delete item) → `<button type="button" className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={15} /></button>`

Each draggable item wrapper:
```tsx
<div
  className={cn(
    'flex items-center gap-3 p-3 rounded-xl border border-border bg-card transition-colors',
    isDragging ? 'opacity-50 shadow-lg border-primary/30' : 'hover:border-primary/20'
  )}
>
  <GripVertical size={16} className="text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
  {/* item content */}
</div>
```

Allow partial credit toggle → native toggle pattern.

### File E2: `libs/questions/src/pages/text-sequencing/TextSequencingQuestionView.tsx`

Read the file. View only — no drag handles. Each item in a numbered list:
```tsx
<div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
    {index + 1}
  </span>
  <span className="text-sm text-foreground">{item.text}</span>
</div>
```

---

## GROUP F — Image Sequencing (2 files)

### Files F1+F2: `ImageSequencingEditor.tsx` + `ImageSequencingQuestionView.tsx`

Same pattern as text sequencing but items are image thumbnails instead of text strings.

Draggable image item wrapper:
```tsx
<div className={cn(
  'relative rounded-xl border-2 overflow-hidden cursor-grab active:cursor-grabbing transition-colors',
  isDragging ? 'opacity-50 border-primary' : 'border-border hover:border-primary/40'
)}>
  <img src={item.image} alt="" className="w-full h-32 object-cover" />
  <div className="absolute top-1.5 end-1.5">
    <button type="button" onClick={() => handleDelete(item.id)}
      className="p-1 rounded-lg bg-white/80 dark:bg-card/80 text-destructive hover:bg-destructive/10 transition-colors">
      <Trash2 size={13} />
    </button>
  </div>
  <div className="absolute bottom-1.5 start-1.5">
    <GripVertical size={14} className="text-white drop-shadow" />
  </div>
</div>
```

---

## GROUP G — Numerical (3 files)

### File G1: `libs/questions/src/pages/numerical/NumericalEditor.tsx`

Read the full file. It renders:
1. A list of `NumericalAnswerRow` components
2. An "Add answer" button
3. Unit handling select
4. Unit input method select (conditional)
5. Unit penalty input (conditional)
6. A list of `NumericalUnitRow` components
7. An "Add unit" button

Replace:
- `<Box>` → `<div>`
- `<Typography>` section headings → `<h4 className="text-sm font-semibold text-foreground">`
- `<Divider>` → `<hr className="border-border my-2" />`
- `<Button>` (add answer) → `<button type="button" className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"><Plus size={15} />{t('editor.numerical.add_answer')}</button>`
- `<Button>` (add unit) → same pattern
- `<Select>` (unit handling) → shadcn Select
- `<Select>` (unit input method) → shadcn Select
- `<TextField>` (unit penalty) → `<Input type="number" className="w-36 text-sm" />`
- `SelectChangeEvent` → `(value: string) => void`

### File G2: `libs/questions/src/pages/numerical/NumericalAnswerRow.tsx`

Each row has: answer value input + error margin input + mark input + feedback toggle + delete button.

```tsx
<div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20 flex-wrap">
  <Input type="number" value={answer.answer} onChange={...} className="w-28 text-sm" placeholder={t('editor.numerical.answer')} />
  <span className="text-xs text-muted-foreground shrink-0">±</span>
  <Input type="number" value={answer.error} onChange={...} className="w-24 text-sm" placeholder={t('editor.numerical.error_margin')} />
  <Input type="number" value={answer.mark} onChange={...} className="w-24 text-sm" placeholder={t('editor.numerical.mark')} />
  {/* feedback toggle */}
  <label className="flex items-center gap-1.5 cursor-pointer select-none ms-auto">
    <input type="checkbox" className="sr-only peer" checked={answer.feedback} onChange={...} />
    <div className="w-8 h-4 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
      <div className="absolute top-0.5 start-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
    </div>
    <span className="text-xs text-foreground">{t('editor.numerical.feedback')}</span>
  </label>
  <button type="button" onClick={() => onDelete(answer.id)}
    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
    <Trash2 size={14} />
  </button>
</div>
```

### File G3: `libs/questions/src/pages/numerical/NumericalUnitRow.tsx`

Each row: unit text input + multiplier input + delete button.

```tsx
<div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20">
  <Input value={unit.unit} onChange={...} className="flex-1 text-sm" placeholder={t('editor.numerical.unit')} />
  <span className="text-xs text-muted-foreground shrink-0">×</span>
  <Input type="number" value={unit.multiplier} onChange={...} className="w-28 text-sm" placeholder={t('editor.numerical.multiplier')} />
  <button type="button" onClick={() => onDelete(unit.id)}
    className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
    <Trash2 size={14} />
  </button>
</div>
```

---

## VERIFICATION

### 1. TypeScript check
```bash
npx nx typecheck item-bank
```
Expected: **0 errors**

### 2. Grep checks
```bash
for dir in fill-in-blanks fill-in-blanks-image select-correct-word highlight-correct-word text-sequencing image-sequencing numerical; do
  echo "=== $dir ===" && grep -rn "from '@mui" "libs/questions/src/pages/$dir/"
done
```
Expected: **0 results** in all directories

### 3. Browser checklist

**FillInBlanks editor:**
- [ ] TinyMCE renders with custom blank-insertion button in toolbar
- [ ] Clicking the blank button inserts a placeholder token
- [ ] Answer list below editor shows inserted blanks

**FillInBlanksImage editor:**
- [ ] Background image displays
- [ ] Input area overlays render at correct absolute positions
- [ ] Clicking image creates new input area (if applicable)

**SelectCorrectWord editor:**
- [ ] Word tokens render from question text
- [ ] Clicking a word toggles its selected/correct state with primary highlight
- [ ] Selected words shown in a summary list

**HighlightCorrectWord editor:**
- [ ] Same as SelectCorrectWord
- [ ] Penalty percent input renders and accepts values

**TextSequencing editor:**
- [ ] Items render in numbered list with drag handles
- [ ] Dragging reorders items (DnD works)
- [ ] Add/delete buttons work

**ImageSequencing editor:**
- [ ] Image thumbnails render
- [ ] Drag reorder works
- [ ] Add image button works

**Numerical editor:**
- [ ] Answer rows render with all inputs
- [ ] Unit handling select works
- [ ] Unit rows render when units enabled
- [ ] Add/delete rows work

**All above in dark mode + RTL**

### 4. Commit
```bash
git add libs/questions/src/pages/fill-in-blanks/ libs/questions/src/pages/fill-in-blanks-image/ libs/questions/src/pages/select-correct-word/ libs/questions/src/pages/highlight-correct-word/ libs/questions/src/pages/text-sequencing/ libs/questions/src/pages/image-sequencing/ libs/questions/src/pages/numerical/
git commit -m "Phase 6: migrate form-heavy question editors to Tailwind (FillInBlanks, SelectCorrectWord, HighlightCorrectWord, Sequencing, Numerical)"
git push origin main
```
