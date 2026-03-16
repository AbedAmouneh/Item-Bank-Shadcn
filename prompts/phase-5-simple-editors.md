# Phase 5 — libs/questions/pages Group 1: Simple Editors
## TrueFalse · ShortAnswer · Essay · MultipleChoice

---

## CONTEXT — READ THIS FIRST

**Prerequisite:** Phase 4 complete. shadcn components are now in `libs/ui` and exported from `@item-bank/ui`.

**Scope:** 8 files
1. `libs/questions/src/pages/true-false/Add.tsx`
2. `libs/questions/src/pages/short-answer/Add.tsx`
3. `libs/questions/src/pages/essay/EssayEditor.tsx`
4. `libs/questions/src/pages/multiple-choice/MultipleChoiceEditor.tsx`
5. `libs/questions/src/pages/multiple-choice/components/ChoiceItem.tsx`
6. `libs/questions/src/pages/multiple-choice/components/ChoiceEditor.tsx`
7. `libs/questions/src/pages/multiple-choice/components/ChoiceFeedback.tsx`
8. `libs/questions/src/pages/multiple-choice/components/SelectionControls.tsx`

**DO NOT TOUCH — EVER:**
- `<Editor>` from `@tinymce/tinymce-react` in `ChoiceEditor.tsx` — only replace its wrapper `styled(Box)`
- `useFormContext`, `watch`, `setValue`, `register` calls — leave all form logic exactly as-is
- `useChoiceValidation` hook — leave as-is
- `SelectChangeEvent` type — keep imported from `@mui/material` IF it is needed for prop types that cannot be changed (only if the prop type is part of a public component interface passed from a migrated parent). If `SelectChangeEvent` is only used as an event type for an internal MUI Select, replace it with React.ChangeEvent or a plain string value.
- All business logic, choice state management, and validation logic

**Available imports from `@item-bank/ui`**:
```ts
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Button, cn } from '@item-bank/ui'
```

**Global replacement rules for ALL files in this phase:**

| MUI | Tailwind/shadcn |
|-----|-----------------|
| `<Box className="...">` | `<div className="...">` |
| `<Stack spacing={2}>` | `<div className="flex flex-col gap-2">` or `<div className="flex flex-col gap-3">` |
| `<Stack spacing={4}>` | `<div className="flex flex-col gap-4">` |
| `<Typography variant="h6">` | `<h3 className="text-base font-semibold text-foreground">` |
| `<Typography variant="body2">` | `<p className="text-sm text-muted-foreground">` |
| `<Typography variant="caption">` | `<span className="text-xs text-muted-foreground">` |
| `<Divider />` | `<hr className="border-border" />` |
| `<Button variant="text" startIcon={<AddIcon />}>` | `<button type="button" className="flex items-center gap-1.5 text-sm ...">` |
| `<IconButton size="small">` | `<button type="button" className="p-1.5 rounded-lg ...">` |
| `<TextField>` | `<Input>` from `@item-bank/ui` |
| `<Select>` (MUI) | `<Select>` from `@item-bank/ui` |
| `<FormControl>` + `<InputLabel>` + `<MenuItem>` | shadcn `<Select>` with `<SelectTrigger>`, `<SelectContent>`, `<SelectItem>` |
| `<Switch>` + `<FormControlLabel>` | native toggle (see pattern below) |
| `<Snackbar>` + `<Alert>` | in-component toast (see pattern below) |
| `<Alert severity="error">` | `<div className="flex gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">` |
| `<Collapse in={condition}>` | `{condition && (...)}` |
| `AddIcon` | `Plus` from lucide |
| `DeleteOutlineIcon` | `Trash2` from lucide |

**Native toggle pattern** (reuse across all files):
```tsx
<label className="flex items-center gap-2.5 cursor-pointer select-none">
  <input
    type="checkbox"
    className="sr-only peer"
    checked={checked}
    onChange={(e) => onChange(e.target.checked)}
  />
  <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
    <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
  </div>
  <span className="text-sm text-foreground">{label}</span>
</label>
```

**In-component toast pattern** (replaces `<Snackbar>` + `<Alert>`):
```tsx
// In component state:
const [toastMessage, setToastMessage] = useState<string | null>(null)

// In useEffect or after state change:
useEffect(() => {
  if (toastMessage) {
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }
}, [toastMessage])

// JSX (place at root of return, outside the main layout div):
{toastMessage && (
  <div className="fixed bottom-6 end-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border shadow-lg text-sm text-foreground animate-in fade-in-0 slide-in-from-bottom-2">
    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
    {toastMessage}
  </div>
)}
```

---

## FILE 1 — `libs/questions/src/pages/true-false/Add.tsx`

**Current MUI imports to remove:**
```ts
import { Box, FormControl, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material'
```

**Keep:**
```ts
import { useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormContext } from 'react-hook-form'
```

**Add:**
```ts
import { cn } from '@item-bank/ui'
```

**Replace the entire JSX return** (keep all logic above the return unchanged):

```tsx
return (
  <div className="flex flex-col gap-4">
    <p className="text-sm font-medium text-foreground">
      {t('editor.true_false.correct_answer_label')} *
    </p>
    <div className="flex gap-3">
      {(['True', 'False'] as const).map((val) => (
        <button
          key={val}
          type="button"
          onClick={() => setValue('correctAnswer', val)}
          className={cn(
            'flex-1 py-4 rounded-2xl border-2 text-sm font-semibold transition-all duration-150',
            correctAnswer === val
              ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/[0.04]'
          )}
        >
          {t(`editor.true_false.${val.toLowerCase()}`)}
        </button>
      ))}
    </div>
  </div>
)
```

---

## FILE 2 — `libs/questions/src/pages/short-answer/Add.tsx`

**Current MUI imports to remove:**
```ts
import { Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, Button, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
```

**Keep:**
```ts
import { memo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormContext } from 'react-hook-form'
```

**Add:**
```ts
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@item-bank/ui'
import { Plus, Trash2 } from 'lucide-react'
```

**Keep `MARK_OPTIONS` const and `AnswerEntry` type exactly as-is.**

**Keep all logic** (`watch`, `setValue`, `useRef`, `handleAddAnswer`, `handleDeleteAnswer`, `handleAnswerChange`, `handleMarkChange`, `handleCasingToggle`, `handleUniqueToggle`) exactly as-is.

> Note: `SelectChangeEvent` is used in the prop type for `handleMarkChange`. Replace with: `(answerId: string, value: string) => void` and update the Select `onValueChange` call accordingly.

**Replace JSX return:**

```tsx
return (
  <div className="flex flex-col gap-6">

    {/* Answer rows */}
    <div className="flex flex-col gap-3">
      {answers.map((answer, index) => (
        <div
          key={answer.id}
          className="flex items-start gap-2 p-3 rounded-xl border border-border bg-muted/20"
        >
          {/* Answer index badge */}
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-2">
            {index + 1}
          </span>

          {/* Answer text input */}
          <Input
            value={answer.text}
            onChange={(e) => handleAnswerChange(answer.id, e.target.value)}
            placeholder={t('editor.short_answer.answer_placeholder')}
            className="flex-1 text-sm"
          />

          {/* Mark select */}
          <Select
            value={String(answer.mark)}
            onValueChange={(val) => handleMarkChange(answer.id, val)}
          >
            <SelectTrigger className="w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARK_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Delete */}
          <button
            type="button"
            onClick={() => handleDeleteAnswer(answer.id)}
            disabled={answers.length <= 1}
            className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-0.5"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>

    {/* Add answer button */}
    <button
      type="button"
      onClick={handleAddAnswer}
      className="self-start flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
    >
      <Plus size={15} />
      {t('editor.short_answer.add_answer')}
    </button>

    <hr className="border-border" />

    {/* Options toggles */}
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" className="sr-only peer" checked={ignoreCasing} onChange={(e) => handleCasingToggle(e.target.checked)} />
        <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
          <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
        </div>
        <span className="text-sm text-foreground">{t('editor.short_answer.ignore_casing')}</span>
      </label>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" className="sr-only peer" checked={requireUniqueAnswers} onChange={(e) => handleUniqueToggle(e.target.checked)} />
        <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
          <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
        </div>
        <span className="text-sm text-foreground">{t('editor.short_answer.require_unique_answers')}</span>
      </label>
    </div>

  </div>
)
```

---

## FILE 3 — `libs/questions/src/pages/essay/EssayEditor.tsx`

**Current MUI imports to remove:**
```ts
import { Box, TextField, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Switch, Checkbox, styled, alpha, useTheme, Collapse, SelectChangeEvent, Chip } from '@mui/material'
```

**Keep:**
```ts
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormContext } from 'react-hook-form'
```

**Add:**
```ts
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, cn } from '@item-bank/ui'
```

**Keep all logic** (`watch`, `setValue`, all handler functions) exactly as-is.

> `SelectChangeEvent` — replace `(event: SelectChangeEvent) =>` with `(value: string) =>` in `handleResponseFormatChange`. Update the shadcn Select's `onValueChange` prop accordingly.

**Replace JSX return:**

```tsx
return (
  <div className="flex flex-col gap-6">

    {/* Response format */}
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {t('editor.essay.response_format')} *
      </label>
      <Select value={responseFormat} onValueChange={handleResponseFormatChange}>
        <SelectTrigger className="text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="html">{t('editor.essay.format_html')}</SelectItem>
          <SelectItem value="html_with_file_picker">{t('editor.essay.format_html_file_picker')}</SelectItem>
          <SelectItem value="plain_text">{t('editor.essay.format_plain_text')}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Word limit toggle */}
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input type="checkbox" className="sr-only peer" checked={!!enableWordLimit} onChange={(e) => handleWordLimitToggle(e.target.checked)} />
      <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
        <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
      </div>
      <span className="text-sm text-foreground">{t('editor.essay.enable_word_limit')}</span>
    </label>

    {/* Word limit fields — conditional */}
    {enableWordLimit && (
      <div className="flex gap-4 items-end flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t('editor.essay.min_words')}</label>
          <Input
            type="number"
            value={minLimit}
            onChange={(e) => setValue('minLimit', e.target.value)}
            className="w-28 text-sm"
            min={0}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t('editor.essay.max_words')}</label>
          <Input
            type="number"
            value={maxLimit}
            onChange={(e) => setValue('maxLimit', e.target.value)}
            className="w-28 text-sm"
            min={0}
          />
        </div>
      </div>
    )}

    <hr className="border-border" />

    {/* Attachments toggle */}
    {responseFormat === 'html_with_file_picker' && (
      <>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" className="sr-only peer" checked={!!allowAttachments} onChange={(e) => handleAttachmentsToggle(e.target.checked)} />
          <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
            <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
          </div>
          <span className="text-sm text-foreground">{t('editor.essay.allow_attachments')}</span>
        </label>

        {allowAttachments && (
          <div className="flex flex-col gap-4">
            {/* Number of attachments + required toggle */}
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('editor.essay.number_of_attachments')}</label>
                <Input
                  type="number"
                  value={numberOfAttachments}
                  onChange={(e) => setValue('numberOfAttachments', Number(e.target.value))}
                  className="w-28 text-sm"
                  min={1}
                />
              </div>
            </div>

            {/* Allowed file types — pill badges */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t('editor.essay.attachment_formats')}</p>
              <div className="flex flex-wrap gap-2">
                {['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'].map((format) => {
                  const active = (attachmentsFormat ?? []).includes(format)
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => handleFormatToggle(format)}
                      className={cn(
                        'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                        active
                          ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      .{format}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </>
    )}

  </div>
)
```

---

## FILE 4 — `libs/questions/src/pages/multiple-choice/MultipleChoiceEditor.tsx`

**Current MUI imports to remove:**
```ts
import { Box, Stack, Switch, FormControlLabel, Button, Divider, Typography, Snackbar, Alert, SelectChangeEvent } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
```

**Keep:**
```ts
import { memo, useCallback, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormContext } from 'react-hook-form'
import SelectionControls from './components/SelectionControls'
import ChoiceItem from './components/ChoiceItem'
import { useChoiceValidation } from './hooks/useChoiceValidation'
```

**Add:**
```ts
import { cn } from '@item-bank/ui'
import { Plus } from 'lucide-react'
import { useEffect } from 'react'
```

**Keep ALL logic** (all `watch`, `setValue`, all handler functions) exactly as-is.

**Remove `SelectChangeEvent` type usage** — replace `handleChoiceNumberingChange(event: SelectChangeEvent)` with `handleChoiceNumberingChange(value: string)`. Update the call site in `SelectionControls` props accordingly.

> Note: `SelectionControls` receives `onChoiceNumberingChange` as a prop. After this change, its type will also change. Update both.

**Add toast state and effect** (replaces Snackbar):
```ts
const [toastMessage, setToastMessage] = useState<string | null>(null)
useEffect(() => {
  if (toastMessage) {
    const timer = setTimeout(() => setToastMessage(null), 3000)
    return () => clearTimeout(timer)
  }
}, [toastMessage])
```

**Inside the existing `handleChoiceCorrectToggle`**, replace the `setSnackbarMessage(...)` call with `setToastMessage(...)`.

**Replace JSX return:**

```tsx
return (
  <div className="flex flex-col gap-6">

    {/* Toast */}
    {toastMessage && (
      <div className="fixed bottom-6 end-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-card border border-border shadow-lg text-sm text-foreground animate-in fade-in-0 slide-in-from-bottom-2">
        <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        {toastMessage}
      </div>
    )}

    <SelectionControls
      choiceNumbering={choiceNumbering}
      minSelections={minSelections}
      maxSelections={maxSelections}
      onChoiceNumberingChange={handleChoiceNumberingChange}
      onMinSelectionsChange={handleMinSelectionsChange}
      onMaxSelectionsChange={handleMaxSelectionsChange}
      minError={validation.minError}
      maxError={validation.maxError}
      rangeError={validation.rangeError}
      validationErrors={validation.validationErrors}
    />

    {/* Choices header row */}
    <div className="flex justify-between items-center flex-wrap gap-4">
      <p className="text-sm font-semibold text-foreground">
        {t('editor.choices')} *
      </p>
      <div className="flex gap-4 items-center flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="sr-only peer" checked={allowPartialCredit} onChange={handleAllowPartialCreditChange} />
          <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
            <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
          </div>
          <span className="text-sm text-foreground">{t('editor.allow_partial_credit')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="sr-only peer" checked={allowShuffle} onChange={handleAllowShuffleChange} />
          <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
            <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
          </div>
          <span className="text-sm text-foreground">{t('editor.allow_shuffle')}</span>
        </label>
      </div>
    </div>

    {/* Choice list */}
    <div className="flex flex-col gap-3">
      {choices.map((choice, index) => (
        <ChoiceItem
          key={choice.id}
          choice={choice}
          index={index}
          canDelete={canDelete}
          onTextChange={handleChoiceTextChange}
          onCorrectToggle={handleChoiceCorrectToggle}
          onFeedbackToggle={handleChoiceFeedbackToggle}
          onFeedbackTextChange={handleChoiceFeedbackTextChange}
          onDelete={handleDeleteChoice}
        />
      ))}
    </div>

    {/* Add choice */}
    <button
      type="button"
      onClick={handleAddChoice}
      disabled={!canAdd}
      className="self-start flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Plus size={15} />
      {t('editor.add_choice')}
    </button>

  </div>
)
```

---

## FILE 5 — `libs/questions/src/pages/multiple-choice/components/ChoiceItem.tsx`

**Current MUI imports to remove:**
```ts
import { Box, Switch, FormControlLabel, IconButton, styled } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
```

**Keep:**
```ts
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import ChoiceEditor from './ChoiceEditor'
import ChoiceFeedback from './ChoiceFeedback'
```

**Add:**
```ts
import { cn } from '@item-bank/ui'
import { Trash2 } from 'lucide-react'
```

**Replace JSX return** (keep all props and types as-is):

```tsx
return (
  <div
    className={cn(
      'flex flex-col gap-4 p-5 rounded-2xl border-2 transition-colors duration-150',
      'bg-[hsl(var(--choice-item-background))]',
      choice.isCorrect
        ? 'border-primary/60'
        : 'border-[hsl(var(--choice-item-border))]'
    )}
  >
    {/* Choice editor (TinyMCE) */}
    <ChoiceEditor
      value={choice.text}
      onChange={(value) => onTextChange(choice.id, value)}
      height={120}
      placeholder={t('editor.choice_placeholder', { index: index + 1 })}
      variant="choice"
    />

    {/* Controls row */}
    <div className="flex justify-between items-center flex-wrap gap-2">
      <div className="flex gap-4 items-center">
        {/* Correct toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={choice.isCorrect}
            onChange={(e) => onCorrectToggle(choice.id, e.target.checked)}
          />
          <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
            <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
          </div>
          <span className="text-sm text-foreground">{t('editor.correct')}</span>
        </label>

        {/* Feedback toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={choice.feedbackEnabled}
            onChange={(e) => onFeedbackToggle(choice.id, e.target.checked)}
          />
          <div className="w-9 h-5 rounded-full transition-colors bg-muted peer-checked:bg-primary relative">
            <div className="absolute top-0.5 start-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
          </div>
          <span className="text-sm text-foreground">{t('editor.feedback')}</span>
        </label>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(choice.id)}
        disabled={!canDelete}
        aria-label={t('editor.delete_choice')}
        className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-destructive hover:bg-destructive/10"
      >
        <Trash2 size={15} />
      </button>
    </div>

    {/* Conditional feedback editor */}
    {choice.feedbackEnabled && (
      <ChoiceFeedback
        feedbackText={choice.feedbackText}
        onChange={(value) => onFeedbackTextChange(choice.id, value)}
        choiceId={choice.id}
      />
    )}
  </div>
)
```

---

## FILE 6 — `libs/questions/src/pages/multiple-choice/components/ChoiceEditor.tsx`

**This file wraps TinyMCE. The `<Editor>` component is completely untouched.**

**Current MUI imports to remove:**
```ts
import { Box, styled, alpha } from '@mui/material'
```

**Keep:**
```ts
import { memo } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { useEditorConfig } from '../hooks/useEditorConfig'
```

**Add:**
```ts
import { cn } from '@item-bank/ui'
```

**Remove `ChoiceEditorWrapper = styled(Box)(...)` entirely.**

**Replace JSX** (the entire return block — wrap TinyMCE with a plain div):

```tsx
return (
  <div
    className={cn(
      'rounded-xl border overflow-hidden',
      variant === 'feedback'
        ? 'border-[hsl(var(--choice-editor-border))] bg-[hsl(var(--choice-feedback-background))]'
        : 'border-[hsl(var(--choice-editor-border))] bg-[hsl(var(--choice-editor-background))]'
    )}
  >
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      licenseKey="gpl"
      value={value}
      onEditorChange={onChange}
      init={{
        ...editorConfig,
        height,
        placeholder,
      }}
    />
  </div>
)
```

> Keep `useEditorConfig` exactly as-is. Keep all props exactly as-is. Only the wrapper div changes.

---

## FILE 7 — `libs/questions/src/pages/multiple-choice/components/ChoiceFeedback.tsx`

**Current MUI imports to remove:**
```ts
import { Box, Typography } from '@mui/material'
```

**Keep:**
```ts
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import ChoiceEditor from './ChoiceEditor'
```

**Replace JSX** (minimal change — just the structural wrapper):

```tsx
return (
  <div className="mt-1">
    <span className="block mb-2 text-xs font-medium text-muted-foreground">
      {t('editor.choice_feedback')}
    </span>
    <ChoiceEditor
      value={feedbackText}
      onChange={onChange}
      height={90}
      placeholder={t('editor.feedback_placeholder')}
      variant="feedback"
    />
  </div>
)
```

---

## FILE 8 — `libs/questions/src/pages/multiple-choice/components/SelectionControls.tsx`

**Current MUI imports to remove:**
```ts
import { Box, TextField, Select, MenuItem, FormControl, InputLabel, Typography, Divider, Alert, Collapse, SelectChangeEvent } from '@mui/material'
```

**Keep:**
```ts
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
```

**Add:**
```ts
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@item-bank/ui'
```

**Update prop type for `onChoiceNumberingChange`:**
Change from `(event: SelectChangeEvent) => void` to `(value: string) => void`

**Replace JSX:**

```tsx
return (
  <div className="flex flex-col gap-6">

    {/* Validation errors */}
    {validationErrors.length > 0 && (
      <div className="flex flex-col gap-1 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        <p className="font-semibold text-xs">{t('editor.validation_errors')}</p>
        <ul className="list-disc ps-5 space-y-0.5">
          {validationErrors.map((error, index) => (
            <li key={index} className="text-xs">{error}</li>
          ))}
        </ul>
      </div>
    )}

    <div className="flex gap-6 flex-wrap items-end justify-between">

      {/* Choice numbering select */}
      <div className="min-w-[200px] flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t('editor.choice_numbering')} *
        </label>
        <Select value={choiceNumbering} onValueChange={onChoiceNumberingChange}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('editor.no_numbering')}</SelectItem>
            <SelectItem value="numeric">{t('editor.numbering_numeric')}</SelectItem>
            <SelectItem value="upper_alpha">{t('editor.numbering_upper_alpha')}</SelectItem>
            <SelectItem value="lower_alpha">{t('editor.numbering_lower_alpha')}</SelectItem>
            <SelectItem value="roman">{t('editor.numbering_roman')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Min/max selections */}
      <div className="flex items-end gap-4">
        <span className="text-sm text-muted-foreground whitespace-nowrap pb-2">
          {t('editor.num_selections_allowed')}
        </span>
        <div className="flex gap-3 items-start">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{t('editor.min')} *</label>
            <Input
              type="number"
              value={minSelections}
              onChange={onMinSelectionsChange}
              min={1}
              step={1}
              className={`w-20 text-sm ${(minError || rangeError) ? 'border-destructive' : ''}`}
            />
            {(minError || rangeError) && (
              <p className="text-xs text-destructive">
                {minError ? t('editor.error_min_gte_one') : t('editor.error_min_lte_max')}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{t('editor.max')} *</label>
            <Input
              type="number"
              value={maxSelections}
              onChange={onMaxSelectionsChange}
              min={1}
              step={1}
              className={`w-20 text-sm ${(maxError || rangeError) ? 'border-destructive' : ''}`}
            />
            {(maxError || rangeError) && (
              <p className="text-xs text-destructive">
                {maxError ? t('editor.error_max_gte_one') : t('editor.error_max_gte_min')}
              </p>
            )}
          </div>
        </div>
      </div>

    </div>

    <hr className="border-border" />

  </div>
)
```

---

## VERIFICATION

### 1. TypeScript check
```bash
npx nx typecheck item-bank
```
Expected: **0 errors**

### 2. Grep check
```bash
grep -rn "from '@mui" libs/questions/src/pages/true-false/
grep -rn "from '@mui" libs/questions/src/pages/short-answer/
grep -rn "from '@mui" libs/questions/src/pages/essay/
grep -rn "from '@mui" libs/questions/src/pages/multiple-choice/
```
Expected: **0 results** in all four

### 3. Browser checklist

**True/False editor:**
- [ ] Two large buttons render: True and False
- [ ] Clicking one highlights it with primary color border + background
- [ ] Dark mode colors correct
- [ ] RTL: buttons same width, correct padding

**Short Answer editor:**
- [ ] Answer rows render with index badge, text input, mark select, delete button
- [ ] "Add answer" button adds a new row
- [ ] Delete disabled when only 1 answer
- [ ] Mark select shows percentage options
- [ ] Ignore casing + Require unique answers toggles work

**Essay editor:**
- [ ] Response format select works
- [ ] Word limit toggle shows/hides min/max inputs
- [ ] File picker section only shows when `html_with_file_picker` selected
- [ ] File format pill badges toggle on/off

**Multiple Choice editor:**
- [ ] Validation errors show above SelectionControls when triggered
- [ ] Choice numbering select works
- [ ] Min/max selection inputs with inline error messages
- [ ] Allow partial credit + Allow shuffle toggles work
- [ ] Each ChoiceItem renders with TinyMCE editor
- [ ] Correct toggle highlights the card with primary border
- [ ] Feedback toggle shows/hides ChoiceFeedback editor
- [ ] Delete button removes a choice (disabled when only 2 choices)
- [ ] Add choice button adds a new choice (disabled at 8)
- [ ] Toast appears when max selections exceeded, auto-dismisses after 3s

### 4. Commit
```bash
git add libs/questions/src/pages/true-false/ libs/questions/src/pages/short-answer/ libs/questions/src/pages/essay/ libs/questions/src/pages/multiple-choice/
git commit -m "Phase 5: migrate simple question editors to Tailwind (TrueFalse, ShortAnswer, Essay, MultipleChoice)"
git push origin main
```
