# Phase 7 — libs/questions/pages Group 3: Canvas & Specialized
## DragDropText · DragDropImage · MultipleHotspots · FreeHandDrawing · RecordAudio · TextClassification · ImageClassification · Matching

---

## CONTEXT — READ THIS FIRST

**Prerequisite:** Phase 4 ✅ Phase 5 ✅ Phase 6 ✅

**Scope:** 16 files across 8 question type directories.

**ABSOLUTE RED LINES — These must NEVER be modified:**

1. **Canvas / Konva**: Any `<canvas>`, `<Stage>`, `<Layer>`, `<Rect>`, `<Circle>`, `<Line>`, `<Image>` from `react-konva` — do not touch their props, size, or event handlers
2. **Media APIs**: `MediaRecorder`, `AudioContext`, `AudioWorklet`, `getUserMedia`, blob URLs — leave exactly as-is
3. **DnD**: `@dnd-kit` imports, `useSortable`, `DndContext`, `useDraggable`, `useDroppable` — leave exactly as-is
4. **Form logic**: `useFormContext`, `watch`, `setValue` — leave exactly as-is
5. **TinyMCE**: any remaining `<Editor>` usage — leave exactly as-is
6. **`JustificationInput`** component imported inside these files — it's already migrated in Phase 4. Keep its usage unchanged.
7. **`BackgroundImageSettings`** component — already migrated in Phase 4. Keep its usage unchanged.

**Your only job**: Replace MUI structural shells (`Box`, `Paper`, `Typography`, `styled`, `alpha`, `useTheme`, MUI `Button`, MUI `IconButton`, MUI `TextField`, MUI `Select`, MUI `Dialog`, MUI `Stepper`) with Tailwind equivalents.

**Before editing each file**, run:
```bash
grep -n "from '@mui" <filepath>
grep -n "from '@mui/material/styles'" <filepath>
```
Only remove what is actually imported.

---

## GLOBAL REPLACEMENTS (same as Phase 5 & 6 — repeated for completeness)

| MUI | Replace with |
|-----|-------------|
| `<Box>` / `<Stack>` | `<div className="...">` |
| `<Paper elevation={0}>` | `<div className="rounded-2xl border border-border bg-card">` |
| `<Typography variant="h6">` | `<h3 className="text-base font-semibold text-foreground">` |
| `<Typography variant="body2">` | `<p className="text-sm text-muted-foreground">` |
| `<Typography variant="caption">` | `<span className="text-xs font-medium text-muted-foreground">` |
| `<Divider>` | `<hr className="border-border" />` |
| `<Chip label={x}>` | `<span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">{x}</span>` |
| `<Switch>` + `<FormControlLabel>` | native toggle (see Phase 5 pattern) |
| `<TextField>` | `<Input>` from `@item-bank/ui` |
| `<Select>` (MUI) | shadcn Select |
| `<IconButton>` | `<button className="p-1.5 rounded-lg ...">` |
| `styled(Box)(...)` | plain div + `cn()` |
| `alpha(color, 0.1)` | Tailwind opacity class (e.g. `bg-primary/10`) |
| `useTheme()` | delete — use CSS variable tokens or hardcoded Tailwind classes |
| `AddIcon` | `Plus` from lucide |
| `DeleteOutlineIcon` | `Trash2` from lucide |
| `EditIcon` | `Pencil` from lucide |
| `CloseIcon` | `X` from lucide |
| `CheckIcon` | `Check` from lucide |

---

## GROUP A — Drag Drop Text (2 files)

### File A1: `libs/questions/src/pages/drag-drop-text/DragDropTextEditor.tsx`

Read the full file. This editor has:
- A question text pane (may have TinyMCE or rendered HTML)
- A group management panel (add/edit/delete groups with color pickers)
- A draggable item list per group

**Do NOT touch**: DnD logic, `onAddKey`, `onRenameKey`, `onDeleteKey` callbacks passed in as props.

Replace:
- `<Paper>` group container → `<div className="rounded-2xl border border-border bg-card p-4">`
- Group card (colored border) → `<div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: group.color }}>`
- Group header → `<div className="px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: group.color }}>`
- `<TextField>` (group name input) → `<Input className="text-sm" />`
- Color picker wrapper — keep `<input type="color">` exactly as-is, just remove MUI wrapper
- Add group button → `<button type="button" className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"><Plus size={15} />{t('...')}</button>`

Draggable item chip:
```tsx
<div className={cn(
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-sm font-medium text-foreground select-none transition-colors',
  isDragging ? 'opacity-50 bg-primary/10 border-primary/30 shadow-lg cursor-grabbing' : 'bg-card hover:bg-muted cursor-grab'
)}>
  <GripHorizontal size={12} className="text-muted-foreground shrink-0" />
  {item.answer}
  <button type="button" onClick={() => handleDeleteItem(item.id)}
    className="ms-0.5 p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors">
    <X size={11} />
  </button>
</div>
```

### File A2: `libs/questions/src/pages/drag-drop-text/DragDropTextQuestionView.tsx`

Read the file. View-only — items rendered in their groups, not draggable.
Replace `<Paper>` / `<Box>` / `<Typography>` with Tailwind divs.

---

## GROUP B — Drag Drop Image (2 files)

### File B1: `libs/questions/src/pages/drag-drop-image/DragDropImageWizard.tsx`

Read the full file. This is a multi-step wizard with:
- A step indicator (may use MUI `Stepper`)
- Multiple step panels
- Konva canvas for image/drop zones

**CRITICAL**: Do NOT touch Konva Stage/Layer/Shape/Image components or their event handlers.

**Replace MUI Stepper** with a custom step bar:
```tsx
<div className="flex items-center gap-0 mb-6">
  {steps.map((stepLabel, i) => (
    <React.Fragment key={i}>
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
          i < currentStep ? 'bg-primary text-primary-foreground' :
          i === currentStep ? 'border-2 border-primary bg-primary/10 text-primary' :
          'border-2 border-border bg-muted text-muted-foreground'
        )}>
          {i < currentStep ? <Check size={13} /> : i + 1}
        </div>
        <span className={cn(
          'text-xs font-medium hidden sm:block',
          i === currentStep ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {stepLabel}
        </span>
      </div>
      {i < steps.length - 1 && (
        <div className={cn(
          'flex-1 h-0.5 mx-2 rounded-full',
          i < currentStep ? 'bg-primary' : 'bg-border'
        )} />
      )}
    </React.Fragment>
  ))}
</div>
```

Step navigation buttons (Back / Next / Save):
```tsx
<div className="flex justify-between mt-6 pt-4 border-t border-border">
  <button type="button" onClick={handleBack} disabled={currentStep === 0}
    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
    <ChevronLeft size={15} className="rtl:rotate-180" />
    {t('common:back')}
  </button>
  {currentStep < steps.length - 1 ? (
    <button type="button" onClick={handleNext}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
      {t('common:next')}
      <ChevronRight size={15} className="rtl:rotate-180" />
    </button>
  ) : (
    <button type="submit"
      className="px-6 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
      {t('common:save')}
    </button>
  )}
</div>
```

Replace all other `<Box>`, `<Typography>`, `<Paper>`, `<Button>`, `<TextField>` with Tailwind equivalents.

### File B2: `libs/questions/src/pages/drag-drop-image/DragDropImageView.tsx`

Read the file. Replace structural MUI wrappers. Keep Konva canvas as-is.

---

## GROUP C — Multiple Hotspots (2 files)

### File C1: `libs/questions/src/pages/multiple-hotspots/MultipleHotspotsEditor.tsx`

Read the full file.

**CRITICAL**: Do NOT touch Konva canvas. Do NOT touch hotspot event handlers, hit-testing logic, or coordinate calculations.

Toolbar above canvas (shape type buttons: rectangle, circle, polygon):
```tsx
<div className="flex gap-2 mb-3">
  {(['rectangle', 'circle', 'polygon'] as const).map((type) => (
    <button
      key={type}
      type="button"
      onClick={() => setSelectedTool(type)}
      className={cn(
        'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
        selectedTool === type
          ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
          : 'border-border text-muted-foreground hover:border-primary/50'
      )}
    >
      {t(`editor.hotspot.${type}`)}
    </button>
  ))}
</div>
```

Hotspot list item (side panel):
```tsx
<div className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: hotspot.color }} />
  <span className="text-xs text-foreground flex-1">{t(`editor.hotspot.${hotspot.type}`)}</span>
  <label className="flex items-center gap-1 cursor-pointer shrink-0">
    <input type="checkbox" className="sr-only peer" checked={hotspot.isCorrect} onChange={(e) => toggleCorrect(hotspot.id, e.target.checked)} />
    <div className="w-7 h-4 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
      <div className="absolute top-0.5 start-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-3 rtl:peer-checked:-translate-x-3" />
    </div>
  </label>
  <button type="button" onClick={() => deleteHotspot(hotspot.id)}
    className="opacity-0 group-hover:opacity-100 p-1 rounded text-destructive hover:bg-destructive/10 transition-all">
    <Trash2 size={12} />
  </button>
</div>
```

### File C2: `libs/questions/src/pages/multiple-hotspots/MultipleHotspotsQuestionView.tsx`

Read file. Replace MUI shells. Keep canvas as-is.

---

## GROUP D — Free Hand Drawing (1 file)

### File D1: `libs/questions/src/pages/free-hand-drawing/FreeHandDrawingQuestionView.tsx`

Read the file. This is almost entirely a canvas view with minimal MUI usage.
Replace any `<Box>` wrapper around canvas with `<div>`, any `<Typography>` with a `<p>`.
Keep `<canvas>` and all its props/refs exactly as-is.

---

## GROUP E — Record Audio (3 files)

### File E1: `libs/questions/src/pages/record-audio/RecordAudioEditor.tsx`

Read the full file. This uses `MediaRecorder` and blob recording logic.

**CRITICAL**: Do NOT touch `MediaRecorder`, `AudioContext`, recording state machine, blob handling, `useRef` for audio stream.

Record button (replaces MUI Fab or Button):
```tsx
<button
  type="button"
  onClick={toggleRecording}
  className={cn(
    'w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md',
    isRecording
      ? 'bg-destructive text-white animate-pulse shadow-destructive/40'
      : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30'
  )}
>
  {isRecording ? <Square size={20} /> : <Mic size={20} />}
</button>
```

Timer display:
```tsx
<span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
  {formatTime(elapsedSeconds)}
</span>
```

Settings inputs (min/max recordings, min/max duration):
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-medium text-muted-foreground">{t('editor.record_audio.min_recordings')}</label>
    <Input type="number" value={numberOfRecordingsMin} onChange={...} className="text-sm" min={1} />
  </div>
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-medium text-muted-foreground">{t('editor.record_audio.max_recordings')}</label>
    <Input type="number" value={numberOfRecordingsMax} onChange={...} className="text-sm" min={1} />
  </div>
</div>
```

Information for graders textarea → `<textarea className="w-full min-h-[80px] rounded-xl border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y" />`

### File E2: `libs/questions/src/pages/record-audio/RecordAudioQuestionView.tsx`

Replace MUI wrappers. Keep `<audio>` element as-is.

### File E3: `libs/questions/src/pages/record-audio/RecordedAudioPlayer.tsx`

Read file. Replace `<Paper>` wrapper with `<div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">`.
Keep `<audio>` element as-is.

---

## GROUP F — Text Classification (2 files)

### File F1: `libs/questions/src/pages/text-classification/TextClassificationEditor.tsx`

Read the full file. It has:
- A category management panel (add/rename/delete categories with color pickers)
- Per-category answer management (add/delete text answers)

Category card (colored top border + header):
```tsx
<div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: category.color }}>
  {/* Colored header bar */}
  <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: category.color }}>
    <span className="text-sm font-semibold text-white">{category.name}</span>
    <div className="flex items-center gap-1">
      {/* Color picker — keep <input type="color"> exactly */}
      <input type="color" value={category.color} onChange={(e) => handleColorChange(category.id, e.target.value)}
        className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0" />
      <button type="button" onClick={() => handleDeleteCategory(category.id)}
        className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors">
        <Trash2 size={13} />
      </button>
    </div>
  </div>
  {/* Answer items */}
  <div className="p-3 space-y-2 bg-card">
    {category.answers.map((answer) => (
      <div key={answer.id} className="flex items-center gap-2">
        <Input value={answer.text} onChange={(e) => handleAnswerChange(category.id, answer.id, e.target.value)}
          className="flex-1 text-sm h-8" />
        <Input type="number" value={answer.markPercent} onChange={(e) => handleMarkChange(category.id, answer.id, Number(e.target.value))}
          className="w-20 text-sm h-8" min={0} max={100} />
        <button type="button" onClick={() => handleDeleteAnswer(category.id, answer.id)}
          className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    ))}
    <button type="button" onClick={() => handleAddAnswer(category.id)}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
      <Plus size={12} /> {t('editor.text_classification.add_answer')}
    </button>
  </div>
</div>
```

Layout/justification select → shadcn Select.
Add category button → `<button type="button" className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"><Plus size={15} />{t(...)}</button>`

### File F2: `libs/questions/src/pages/text-classification/TextClassificationView.tsx`

Read file. Replace MUI wrappers. Category cards in view mode (read-only):
```tsx
<div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: category.color }}>
  <div className="px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: category.color }}>
    {category.name}
  </div>
  <div className="p-3 flex flex-wrap gap-2 bg-card min-h-[60px]">
    {category.answers.map((answer) => (
      <span key={answer.id} className="px-2 py-1 text-xs rounded-lg bg-muted text-foreground border border-border">
        {answer.text}
      </span>
    ))}
  </div>
</div>
```

---

## GROUP G — Image Classification (2 files)

### File G1: `libs/questions/src/pages/image-classification/ImageClassificationEditor.tsx`

Same category card pattern as TextClassification but answers are image thumbnails.

Image answer item in category:
```tsx
<div className="relative group rounded-xl overflow-hidden border border-border bg-muted/30 aspect-square">
  <img src={answer.imageUrl} alt="" className="w-full h-full object-cover" />
  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
    <button type="button" onClick={() => handleDeleteAnswer(category.id, answer.id)}
      className="p-1.5 rounded-lg bg-white/90 text-destructive">
      <Trash2 size={14} />
    </button>
  </div>
</div>
```

Image upload button per category → same pattern as `BackgroundImageSettings` upload button.

### File G2: `libs/questions/src/pages/image-classification/ImageClassificationView.tsx`

Read file. Replace MUI wrappers. Category cards with image grid.

---

## GROUP H — Matching (2 files)

### File H1: `libs/questions/src/pages/matching/MatchingWizard.tsx`

Read the full file. This is a wizard similar to DragDropImageWizard.

**Keep**: All matching logic (linkedRightIds, left/right item management). Do NOT touch `MatchingView` sub-component if it's rendered within the wizard.

Use the same step bar pattern from Group B.

Left item card:
```tsx
<div className={cn(
  'p-3 rounded-xl border-2 transition-colors cursor-pointer',
  selected ? 'border-primary bg-primary/10 dark:bg-primary/20' : 'border-border hover:border-primary/40'
)}>
  {item.imageUrl ? (
    <img src={item.imageUrl} alt="" className="w-full h-20 object-cover rounded-lg mb-2" />
  ) : null}
  <p className="text-sm text-foreground">{item.text}</p>
  <div className="flex items-center justify-between mt-2">
    <span className="text-xs text-muted-foreground">{item.linkedRightIds.length} {t('editor.matching.connections')}</span>
    <label className="flex items-center gap-1 cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={item.multipleAnswers} onChange={...} />
      <div className="w-7 h-4 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
        <div className="absolute top-0.5 start-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-3 rtl:peer-checked:-translate-x-3" />
      </div>
      <span className="text-xs text-muted-foreground">{t('editor.matching.multiple')}</span>
    </label>
  </div>
</div>
```

Right item card (simpler):
```tsx
<div className="p-3 rounded-xl border border-border bg-muted/30 min-h-[48px] flex items-center">
  {item.imageUrl ? (
    <img src={item.imageUrl} alt="" className="w-12 h-12 object-cover rounded-lg me-2 shrink-0" />
  ) : null}
  <p className="text-sm text-foreground">{item.text}</p>
</div>
```

Add left/right item buttons → standard `<button type="button" className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"><Plus size={15} />{label}</button>`

### File H2: `libs/questions/src/pages/matching/MatchingView.tsx`

Read file. Two-column layout showing left and right items with connection indicator.

Connection line (if using SVG): Leave exactly as-is.
Replace only `<Box>`, `<Paper>`, `<Typography>` structural wrappers.

View layout:
```tsx
<div className="grid grid-cols-2 gap-6">
  {/* Left column */}
  <div className="flex flex-col gap-3">
    {leftItems.map((item) => (
      <div key={item.id} className="p-3 rounded-xl border border-border bg-muted/30 min-h-[48px] flex items-center text-sm text-foreground">
        {item.text}
      </div>
    ))}
  </div>
  {/* Right column */}
  <div className="flex flex-col gap-3">
    {rightItems.map((item) => (
      <div key={item.id} className="p-3 rounded-xl border border-border bg-muted/30 min-h-[48px] flex items-center text-sm text-foreground">
        {item.text}
      </div>
    ))}
  </div>
</div>
```

---

## VERIFICATION

### 1. TypeScript check
```bash
npx nx typecheck item-bank
```
Expected: **0 errors**

### 2. Grep check — full scan
```bash
grep -rn "from '@mui" libs/questions/src/pages/
grep -rn "from '@mui/material/styles'" libs/questions/src/pages/
```
Expected: **0 results** — this should be the moment where ALL question pages are MUI-free.

Also check:
```bash
grep -rn "from '@mui" libs/
```
Expected: **0 results** across the entire libs directory.

### 3. Browser checklist

**DragDropText:**
- [ ] Groups render with colored headers
- [ ] Items render as chips in their groups
- [ ] Drag between groups works

**DragDropImage:**
- [ ] Step wizard renders with step indicator
- [ ] Back/Next navigation works
- [ ] Konva canvas visible on image step
- [ ] Drop zones drawn on canvas

**MultipleHotspots:**
- [ ] Toolbar with shape type buttons renders
- [ ] Konva canvas renders with background image
- [ ] Hotspot list shows drawn hotspots with correct/incorrect toggle
- [ ] Delete removes hotspot from canvas

**FreeHandDrawing:**
- [ ] Canvas renders
- [ ] Background image setting visible if configured

**RecordAudio:**
- [ ] Record button renders (large circular button)
- [ ] Clicking record starts recording (microphone permission required)
- [ ] Timer counts up during recording
- [ ] Stop button stops recording
- [ ] Recorded audio plays back

**TextClassification:**
- [ ] Categories render with colored headers
- [ ] Answers list within each category
- [ ] Color picker changes category color
- [ ] Add/delete categories and answers works

**ImageClassification:**
- [ ] Same as text classification but image thumbnails

**Matching:**
- [ ] Wizard steps work
- [ ] Left and right item management works
- [ ] View shows two-column layout

**All above in dark mode + RTL**

### 4. Commit
```bash
git add libs/questions/src/pages/drag-drop-text/ libs/questions/src/pages/drag-drop-image/ libs/questions/src/pages/multiple-hotspots/ libs/questions/src/pages/free-hand-drawing/ libs/questions/src/pages/record-audio/ libs/questions/src/pages/text-classification/ libs/questions/src/pages/image-classification/ libs/questions/src/pages/matching/
git commit -m "Phase 7: migrate canvas and specialized question editors to Tailwind (DragDrop, Hotspots, RecordAudio, Classification, Matching)"
git push origin main
```
