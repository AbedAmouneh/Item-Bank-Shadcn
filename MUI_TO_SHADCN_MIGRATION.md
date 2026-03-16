# MUI → shadcn/ui Migration Plan
### Item Bank — Nx Monorepo
**Author:** Engineering Leadership
**Last Updated:** 2026-03-16
**Status:** Phase 0 ✅ · Phase 1 ✅ · Phases 2–8 Pending

---

## Executive Summary

This document is the single source of truth for migrating the Item Bank platform from MUI v7 + Emotion to shadcn/ui + Tailwind CSS 3.4. The migration is **UI layer only** — all routing, data fetching, form validation (React Hook Form + Zod), TinyMCE editors, canvas/drawing primitives, and i18n are untouched.

**Total surface area:** 8 phases, ~55 files across 4 libraries.
**Strategy:** Each phase is independently shippable. Phases 0 and 1 are already live on `main`.

---

## Architectural Decisions (Non-Negotiable)

### 1. shadcn components live in `libs/ui`, not `apps/`
`libs/questions`, `libs/auth`, and `libs/profile` cannot import from `apps/item-bank`. As of Phase 4, all shadcn UI primitives (Button, Input, Select, Dialog, etc.) must be **moved from `apps/item-bank/src/components/ui/` into `libs/ui/src/components/ui/`** and exported from `libs/ui/src/index.ts`. The app then imports them via `@item-bank/ui`.

### 2. TinyMCE is not touched
Every `<Editor>` from `@tinymce/tinymce-react` stays exactly as-is. Only its wrapper `styled(Box)` is replaced with a plain `<div className="...">`.

### 3. `material-react-table` is replaced with TanStack Table v8
`material-react-table` depends on MUI. It is replaced with `@tanstack/react-table` + a custom headless table shell. This is the highest-risk change in the entire migration.

### 4. No `important: true` / `preflight: false` after Phase 8
These Tailwind config flags are coexistence scaffolding only. Phase 8 removes them once MUI is fully gone.

### 5. RTL stays on `dir="rtl"` attribute, dark mode stays on `.dark` class
Both set by `AppShell` in `App.tsx`. Never use `theme.direction` or `theme.palette.mode` again.

---

## Phase Status Overview

| Phase | Scope | Files | Risk | Status |
|-------|-------|-------|------|--------|
| 0 | Setup: Tailwind, CSS vars, AppShell, FOUC | 6 | Low | ✅ Done |
| 1 | `libs/ui`: NavBar, Sidebar, ActionButton | 3 | Low | ✅ Done |
| 2 | `libs/auth`: Login, SignUp, ForgotPassword, ProtectedRoute | 4 | Low | 🔲 |
| 3 | `libs/profile`: ProfileSidebar | 1 | Low | 🔲 |
| 4 | `libs/questions/components`: Move shadcn to libs/ui + migrate 7 shared components | 7+shadow | **High** | 🔲 |
| 5 | `libs/questions/pages` Group 1: TrueFalse, ShortAnswer, Essay, MultipleChoice (6 files) | 6 | Medium | 🔲 |
| 6 | `libs/questions/pages` Group 2: FillInBlanks, Numerical, Sequencing, SelectCorrectWord, HighlightCorrectWord (10 files) | 10 | Medium | 🔲 |
| 7 | `libs/questions/pages` Group 3: DragDrop, Hotspots, FreeHand, RecordAudio, Classification, Matching (16 files) | 16 | Medium | 🔲 |
| 8 | Final cleanup: remove MUI packages, reset Tailwind config | 4 | Low | 🔲 |

---

---

## ✅ Phase 0 — Foundation (DONE)

Already committed. Reference only.

**What was done:**
- Tailwind configured: `darkMode: 'class'`, full CSS variable color system, RTL variants
- `apps/item-bank/src/styles.css`: 80+ HSL CSS variable tokens for light + dark
- `AppShell` in `App.tsx`: toggles `.dark` class and `dir` attribute on `<html>`
- FOUC prevention inline script in `index.html`
- Inter font, `@/` alias, `components.json` for shadcn CLI

---

## ✅ Phase 1 — libs/ui (DONE)

Already committed. Reference only.

**What was done:**
- `NavBar.tsx`: Full rewrite, Radix Tooltip + Radix DropdownMenu, lucide icons, RTL support
- `Sidebar.tsx`: Full rewrite, lucide icon type, Tailwind border/color tokens
- `ActionButton.tsx`: Full rewrite, CVA button variants, Radix DropdownMenu
- `libs/ui/src/lib/utils.ts`: `cn()` utility (clsx + tailwind-merge)
- `libs/ui/src/index.ts`: added `cn` export

---

---

## 🔲 Phase 2 — libs/auth

**Scope:** `libs/auth/src/pages/` (Login, SignUp, ForgotPassword) + `libs/auth/src/guards/ProtectedRoute.tsx`
**Risk:** Low — pure UI rewrite, React Hook Form + Zod untouched
**Prerequisite:** Phase 0 ✅ Phase 1 ✅
**Deploy checkpoint:** Auth pages render, form validation works, language toggle works, dark mode toggle works

---

### Phase 2 — Claude Code Prompt

```
You are migrating libs/auth from MUI to Tailwind CSS + shadcn/ui in the Item Bank Nx monorepo.

## CONTEXT

The design system is already set up:
- CSS variables are in apps/item-bank/src/styles.css
- Tailwind config is in apps/item-bank/tailwind.config.js
- Dark mode: .dark class on <html>; use dark: variants
- RTL: dir="rtl" on <html>; use rtl: variants
- cn() utility: import { cn } from '../../../libs/ui/src/lib/utils' (or use relative path)
- Lucide icons replace @mui/icons-material

## DO NOT TOUCH

- React Hook Form registration, useForm, zodResolver, schema definitions — leave exactly as-is
- useNavigate, Link, RouterLink, i18n calls — leave exactly as-is
- useSwitchTheme hook — leave exactly as-is
- GuestRoute.tsx and NotFoundRedirect.tsx — already MUI-free, skip them

## STEP 1 — Create shared auth components

### Create libs/auth/src/components/AuthPageWrapper.tsx

This is the full-page background container plus the top-right utility buttons (language + theme toggle). Extract this pattern from Login/SignUp/ForgotPassword.

Props:
  children: React.ReactNode

Implementation:
- <div className="min-h-screen flex items-center justify-center relative bg-[hsl(var(--auth-page-background))]">
- Top-right absolute div: "absolute top-5 end-5 flex gap-2" (use end-5 instead of right-5 for RTL)
- Language button: icon Globe from lucide, calls switchLanguage
- Theme button: Sun/Moon from lucide, calls switchTheme (import useSwitchTheme from '@item-bank/ui')
- Wraps {children}

switchLanguage logic (replicate from Login.tsx):
  const { i18n } = useTranslation();
  const switchLanguage = () => {
    const next = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

Utility button styling (a <button> element, not MUI):
  className="p-2 rounded-full bg-[hsl(var(--auth-utility-button-bg))] border border-border backdrop-blur-[10px] hover:bg-[hsl(var(--surface-default))] transition-colors text-muted-foreground"

If --auth-utility-button-bg token does not exist in styles.css, add it:
  :root  → --auth-utility-button-bg: 0 0% 100% / 0.7
  .dark  → --auth-utility-button-bg: 222 47% 15%

### Create libs/auth/src/components/AuthCard.tsx

Props: children: React.ReactNode; className?: string

className:
  "w-full max-w-[480px] mx-4 backdrop-blur-[20px] rounded-3xl p-10 bg-[hsl(var(--auth-card-background))] border border-border shadow-[hsl(var(--auth-card-shadow))]"

If --auth-card-background or --auth-card-shadow don't exist:
  :root  → --auth-card-background: 0 0% 100% / 0.95; --auth-card-shadow: 0 0% 0% / 0.08
  .dark  → --auth-card-background: 217 33% 13%; --auth-card-shadow: 0 0% 0% / 0.4

### Create libs/auth/src/components/AuthField.tsx

Replaces StyledTextField. Wraps a native <input> with an icon slot and error display.

Props:
  type: string
  placeholder: string
  error?: string
  icon: React.ReactNode  // lucide icon element
  register: ReturnType<UseFormRegister<any>>  // spread onto input
  endAdornment?: React.ReactNode  // for show/hide password button

Implementation:
  <div className="relative">
    {/* Icon left */}
    <div className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 flex items-center justify-center">
      {icon}
    </div>
    <input
      type={type}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-2xl border border-border bg-[hsl(var(--auth-field-background))]",
        "ps-10 pe-10 py-3 text-sm text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary",
        "transition-colors",
        error && "border-destructive focus:ring-destructive"
      )}
      {...register}
    />
    {endAdornment && (
      <div className="absolute end-3 top-1/2 -translate-y-1/2">
        {endAdornment}
      </div>
    )}
    {error && (
      <p className="mt-1 text-xs text-destructive">{error}</p>
    )}
  </div>

If --auth-field-background token does not exist:
  :root → --auth-field-background: 210 40% 98%
  .dark → --auth-field-background: 217 33% 17%

## STEP 2 — Rewrite Login.tsx

Remove ALL of these imports:
  Box, TextField, Button, IconButton, InputAdornment, Typography, Stack
  Visibility, VisibilityOff, Language, LightMode, DarkMode, Email as EmailIcon, Lock as LockIcon
  styled, alpha from @mui/material/styles
  LinkBehavior, PageRoot, UtilityButton, AuthCard (styled), StyledTextField, PrimaryButton, StyledLink, InlineLink

Keep:
  useState, useForm, useNavigate, RouterLink, useTranslation, zodResolver, z, useSwitchTheme (but move logic to AuthPageWrapper)

Add:
  import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
  import AuthPageWrapper from '../components/AuthPageWrapper';
  import AuthCard from '../components/AuthCard';
  import AuthField from '../components/AuthField';

New JSX structure:
  <AuthPageWrapper>
    <AuthCard>
      <form onSubmit={login} className="flex flex-col items-center gap-6">
        {/* Logo */}
        <img className="h-20 object-contain" src="/images/york-press.png" alt="York Press logo" />

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground">{t('common:AuthorApp')}</h1>

        {/* Fields */}
        <div className="w-full flex flex-col gap-3">
          <AuthField
            type="email"
            placeholder={t('auth:Email')}
            icon={<Mail size={16} />}
            error={errors.email ? t('auth:invalid_email') : undefined}
            register={register('email', { required: true })}
          />
          <AuthField
            type={showPassword ? 'text' : 'password'}
            placeholder={t('auth:Password')}
            icon={<Lock size={16} />}
            error={errors.password ? t('auth:password_required') : undefined}
            register={register('password', { required: true })}
            endAdornment={
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          {/* Submit */}
          <button
            type="submit"
            data-testid="login-btn"
            className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_14px_0_hsl(var(--primary)/0.35)] transition-all"
          >
            {t('auth:Login')}
          </button>
        </div>

        {/* Footer links */}
        <div className="flex justify-between items-center w-full rtl:flex-row-reverse">
          <RouterLink to="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            {t('auth:forgot_password')}
          </RouterLink>
          <span className="text-sm text-muted-foreground">
            {t('auth:no_account')}{' '}
            <RouterLink to="/signup" className="font-semibold text-foreground hover:underline">
              {t('auth:sign_up')}
            </RouterLink>
          </span>
        </div>
      </form>
    </AuthCard>
  </AuthPageWrapper>

## STEP 3 — Rewrite SignUp.tsx

Same pattern as Login. Extra field: fullName with PersonIcon → User from lucide.
Additional password field: confirmPassword with show/hide toggle.
Footer link points back to /login.

## STEP 4 — Rewrite ForgotPassword.tsx

Same AuthPageWrapper + AuthCard pattern. Single email field.
Replace Alert (MUI) with a plain div:
  className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm border border-green-200 dark:border-green-800"
Back button uses ArrowLeft from lucide + RouterLink to="/login"

## STEP 5 — Fix ProtectedRoute.tsx

Replace:
  import { Box } from '@mui/material'
  <Box className="w-full min-w-0 overflow-hidden">

With:
  <div className="w-full min-w-0 overflow-hidden">

## VERIFICATION CHECKLIST

Run: npx nx typecheck item-bank (or tsc --noEmit from root)
  ✓ Zero MUI imports remain in libs/auth/

Browser check — for each page (Login, SignUp, ForgotPassword):
  ✓ Light mode renders correctly (white card on gradient background)
  ✓ Dark mode renders correctly (.dark class present on <html>)
  ✓ Language toggle switches EN ↔ AR and dir flips
  ✓ RTL: utility buttons stay top-right (end-5), icon positions flip, link row reverses
  ✓ Form validation shows error text below field on submit with empty/invalid values
  ✓ Password show/hide toggle works
  ✓ Login submits → stores token → navigates to /home
  ✓ ProtectedRoute without token redirects to /login (check NavBar renders when token exists)
```

---

---

## 🔲 Phase 3 — libs/profile

**Scope:** `libs/profile/src/components/ProfileSidebar.tsx` (1 file)
**Risk:** Low — thin wrapper, icon type already compatible
**Prerequisite:** Phase 1 ✅ (Sidebar component already migrated)
**Deploy checkpoint:** Profile sidebar renders with avatar, user info, correct nav highlighting

---

### Phase 3 — Claude Code Prompt

```
You are migrating libs/profile/src/components/ProfileSidebar.tsx from MUI to Tailwind CSS.

## CONTEXT

- The Sidebar component from @item-bank/ui is already migrated to Tailwind
- SidebarItem.icon type is: ComponentType<{ className?: string; size?: number }>
- MUI icons (PersonOutlineIcon, LockIcon, FolderIcon, EditNoteIcon) must be replaced with lucide equivalents
- Do not touch: useTranslation, useLocation, useNavigate, Outlet — leave exactly as-is

## WHAT TO CHANGE

Remove:
  import { Avatar, Box, Typography } from '@mui/material';
  import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
  import LockIcon from '@mui/icons-material/Lock';
  import FolderIcon from '@mui/icons-material/Folder';
  import EditNoteIcon from '@mui/icons-material/EditNote';
  import { styled } from '@mui/material/styles';
  const StyledAvatar = styled(Avatar)(...)

Add:
  import { UserCircle, Lock, Folder, FileEdit } from 'lucide-react';

Icon mapping:
  PersonOutlineIcon → UserCircle
  LockIcon          → Lock
  FolderIcon        → Folder
  EditNoteIcon      → FileEdit

## HEADER REWRITE

Replace the StyledAvatar + Box + Typography header with plain Tailwind:

  const header = (
    <div className="flex items-center p-4 gap-4">
      {/* Avatar circle */}
      <div className="w-12 h-12 rounded-full bg-[hsl(var(--avatar-background))] flex items-center justify-center flex-shrink-0">
        <UserCircle className="w-7 h-7 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-[0.9375rem] leading-[1.3] text-foreground truncate">
          {t('profile.username_placeholder')}
        </p>
        <p className="text-[0.8125rem] text-muted-foreground truncate">
          {t('profile.role_admin')}
        </p>
      </div>
    </div>
  );

If --avatar-background token does not exist in apps/item-bank/src/styles.css, add it:
  :root → --avatar-background: 239 68% 90%   (indigo-100)
  .dark → --avatar-background: 239 50% 25%   (indigo-900)

## VERIFICATION

Run: npx nx typecheck item-bank
  ✓ Zero MUI imports in libs/profile/

Browser:
  ✓ Avatar circle renders with icon in light + dark mode
  ✓ Username and role text render with correct colors
  ✓ Sidebar nav items highlight correctly on route change
  ✓ RTL: sidebar border flips (already handled by Sidebar component)
```

---

---

## 🔲 Phase 4 — libs/questions/components (Shared Infrastructure)

**Scope:** 7 components + shadcn relocation
**Risk:** HIGH — `material-react-table` replacement, largest single-phase change
**Prerequisite:** Phase 1 ✅
**Deploy checkpoint:** Questions list renders with pagination, "Add Question" modal opens and filters, editor shell wraps all question editors

**Key decisions for this phase:**
1. Move all shadcn components from `apps/item-bank/src/components/ui/` to `libs/ui/src/components/ui/`
2. Export them all from `libs/ui/src/index.ts`
3. Replace `material-react-table` with `@tanstack/react-table` (headless) styled with Tailwind

---

### Phase 4 — Claude Code Prompt

```
You are doing Phase 4 of the MUI → shadcn migration for Item Bank. This is the highest-risk phase.
Work methodically. Do NOT proceed to the next step until the current one compiles without errors.

## STEP 1 — Move shadcn components into libs/ui

The shadcn components currently in apps/item-bank/src/components/ui/ cannot be imported by libs.
Move them to libs/ui/src/components/ui/ so all libs can import from @item-bank/ui.

Action:
1. Create libs/ui/src/components/ui/ directory
2. Copy ALL files from apps/item-bank/src/components/ui/ to libs/ui/src/components/ui/
3. In each copied file, fix the utils import:
   BEFORE: import { cn } from '@/lib/utils'  OR  import { cn } from '../../lib/utils'
   AFTER:  import { cn } from '../../lib/utils'   (relative path within libs/ui)

4. Update libs/ui/src/index.ts to add exports:
   export { Button, buttonVariants } from './components/ui/button';
   export { Input } from './components/ui/input';
   export { Label } from './components/ui/label';
   export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
   export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/ui/dialog';
   export { Badge } from './components/ui/badge';
   export { Separator } from './components/ui/separator';
   export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
   export { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
   export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './components/ui/command';
   export { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
   export { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet';
   export { Textarea } from './components/ui/textarea';
   export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
   export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './components/ui/alert-dialog';
   export { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';

5. The files in apps/item-bank/src/components/ui/ can stay as-is (they're used by the app itself).
   Do NOT delete them.

Verify after step 1: npx nx typecheck item-bank  → 0 errors

## STEP 2 — Install @tanstack/react-table

Run: pnpm add @tanstack/react-table

Do NOT install material-react-table or any replacement table library.
We are building a headless table with Tailwind styling.

## STEP 3 — Rewrite QuestionsTable.tsx

This file currently uses material-react-table. Replace it entirely.

### New imports (keep all business logic imports)
Remove:
  MaterialReactTable, useMaterialReactTable, MRT_ColumnDef (and all MRT types)
  MRT_Localization_AR
  useTheme, alpha, styled, Paper, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
  Chip, IconButton, Typography, Box
  MoreVertIcon

Add:
  import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortingRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
  import { MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
  import { cn } from '../../../libs/ui/src/lib/utils';
  import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
  import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
  (NOTE: these are already installed as shadcn deps)

### Column definitions
Keep EXACTLY the same columns: questionName, type, mark, status, lastModified, actions
Column type: ColumnDef<QuestionRow>[] (TanStack type)

For type badge (replaces StyledChip + getTypeChipSx):
  Use a <span> with Tailwind. Map QuestionType to a fixed color class:
  Create const TYPE_COLORS: Record<QuestionType, string> = {
    multiple_choice: 'bg-primary/10 text-primary dark:bg-primary/20',
    short_answer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    essay: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    true_false: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    fill_in_blanks: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    record_audio: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    numerical: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    text_classification: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    image_classification: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    matching: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    // remaining types: use slate
    ... all other types: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }

  Badge JSX: <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-[0.6875rem] font-medium', TYPE_COLORS[type])}>{label}</span>

For status badge — same pattern with STATUS_COLORS:
  Draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  Published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  'In Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'

Actions column: 3-dot icon button → Radix DropdownMenu with Preview / Edit / Delete items

### Table shell JSX structure:
  <div className="w-full rounded-3xl overflow-hidden border border-border bg-[hsl(var(--surface-card))] dark:bg-[hsl(var(--surface-dark-card))]">
    {/* Header bar */}
    <div className="pt-6 px-6 pb-4 flex justify-between items-center">
      <h2 className="font-semibold text-xl text-foreground">{t('questions')}</h2>
      <ActionButton btnLabel={t('add_question')} onClick={() => setAddModalOpen(true)} />
    </div>

    {/* Table scroll container */}
    <div className="w-full px-6 pb-4 overflow-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id}
                  className="text-left text-[0.6875rem] font-semibold uppercase tracking-[0.8px] text-[hsl(var(--table-head-color))] px-3 py-3 border-b border-border"
                  style={{ width: header.getSize() }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}
              className="border-b border-border cursor-pointer hover:bg-primary/5 transition-colors"
              onClick={() => handleQuestionViewOpen?.(row.original)}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-3 text-foreground">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Pagination bar */}
    <div className="flex items-center justify-between px-6 py-3 border-t border-border text-sm text-muted-foreground">
      <span>{t('page')} {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
      <div className="flex gap-1">
        <button disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft size={16} />
        </button>
        <button disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </div>

### Replace MUI Menu (3-dot row actions) with Radix DropdownMenu:
  Use the same pattern as ActionButton.tsx (already migrated in Phase 1).
  DropdownMenu opens anchored to the MoreVertical icon button in the actions cell.

### Replace MUI Dialog (delete confirmation) with Radix AlertDialog:
  <AlertDialogPrimitive.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
      <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl">
        <AlertDialogPrimitive.Title className="text-lg font-semibold text-foreground">
          {t('delete_confirm_title')}
        </AlertDialogPrimitive.Title>
        <AlertDialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
          {t('delete_confirm_message', { name: questionToDelete?.questionName ?? '' })}
        </AlertDialogPrimitive.Description>
        <div className="mt-6 flex justify-end gap-3">
          <AlertDialogPrimitive.Cancel className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors">
            {t('cancel')}
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Action onClick={confirmDelete}
            className="px-4 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
            {t('delete')}
          </AlertDialogPrimitive.Action>
        </div>
      </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
  </AlertDialogPrimitive.Root>

## STEP 4 — Rewrite AddQuestionModal.tsx

Remove:
  Dialog, DialogTitle, DialogContent, Box, TextField, IconButton, Typography, InputAdornment, alpha, styled
  All 20 MUI icon imports (CheckCircleOutlineIcon, PlaylistAddCheckIcon, ShortTextIcon, etc.)
  ModalHeader, SearchField, TileGrid (styled components)

Add:
  import * as DialogPrimitive from '@radix-ui/react-dialog';
  import { Search, X } from 'lucide-react';
  import { cn } from '@item-bank/ui';

TILE_ICONS: Replace all 20 MUI React elements with lucide equivalents:
  true_false: <CheckCheck />
  multiple_choice: <ListChecks />
  short_answer: <AlignLeft />
  essay: <FileText />
  drag_drop_text: <GripHorizontal />
  drag_drop_image: <Image />
  free_hand_drawing: <Pen />
  image_sequencing: <GalleryHorizontal />
  multiple_hotspots: <MapPin />
  numerical: <Calculator />
  fill_in_blanks: <PenLine />
  select_correct_word: <SpellCheck />
  text_sequencing: <List />
  fill_in_blanks_image: <ScanSearch />
  highlight_correct_word: <Highlighter />
  record_audio: <Mic />
  text_classification: <Tags />
  image_classification: <Images />
  matching: <GitMerge />

New modal structure:
  <DialogPrimitive.Root open={open} onOpenChange={(open) => !open && onClose()}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
            {t('add_questions_title')}
          </DialogPrimitive.Title>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="ps-8 pe-3 py-1.5 text-sm rounded-xl border border-border bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary w-52"
                placeholder={t('search_question_types')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <DialogPrimitive.Close className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
        </div>

        {/* Grid */}
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

## STEP 5 — Rewrite QuestionTypeTile.tsx

Remove: styled, Box, Typography, alpha
Replace TileRoot styled component with inline Tailwind:

  <button
    type="button"
    role="button"
    aria-pressed={selected}
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-3 py-5 px-3 rounded-2xl cursor-pointer transition-colors duration-150 select-none outline-none',
      'border-2 focus-visible:border-primary focus-visible:bg-primary/5',
      selected
        ? 'border-primary bg-primary/10 dark:bg-primary/20'
        : 'border-transparent hover:bg-primary/5 dark:hover:bg-primary/10'
    )}
  >
    {/* Icon circle */}
    <div className="w-[72px] h-[72px] rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary-dark dark:text-primary flex-shrink-0">
      {/* clone icon with size 32 */}
      {React.cloneElement(icon as React.ReactElement, { size: 32, strokeWidth: 1.5 })}
    </div>
    <span className="text-[0.8125rem] font-medium leading-[1.35] text-foreground text-center max-w-[100px]">
      {label}
    </span>
  </button>

Import React at top: import React from 'react';

## STEP 6 — Rewrite JustificationInput.tsx

Remove: Box, FormControl, InputLabel, MenuItem, Select, TextField

Use shadcn Select + Input from @item-bank/ui:
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '@item-bank/ui';

  <div className="flex gap-4 flex-wrap items-end">
    <div className="min-w-[200px]">
      <Select value={mode} onValueChange={(v) => onModeChange(v as JustificationMode)}>
        <SelectTrigger>
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
        min={0} max={100} step={1}
        className="w-40"
      />
    )}
  </div>

## STEP 7 — Rewrite BackgroundImageSettings.tsx

Remove all styled() wrappers, Box, Typography, TextField, Switch, FormControlLabel, Button, IconButton
Replace with Tailwind. Keep all useFormContext, useRef, useState, drag-drop file logic exactly as-is.

Key mappings:
  ToggleLabel (FormControlLabel + Switch) → native <label> + <input type="checkbox" role="switch"> styled as toggle:
    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-foreground">
      <span className="text-sm">{label}</span>
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={...} />
      <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors relative after:absolute after:top-0.5 after:start-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-4 rtl:peer-checked:after:-translate-x-4" />
    </label>

  DropZone → <div className={cn("border-2 border-dashed rounded-2xl ...", dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30")} ...>

  DimensionField → <Input type="number" className="h-9 text-sm" ... />

  Add photo button → <button type="button" className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors">
    <ImagePlus size={16} /> {label}
  </button>

  Delete button → <button type="button" className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
    <Trash2 size={16} />
  </button>

## STEP 8 — Rewrite QuestionEditorShell.tsx

This is the largest component. Read the full file first before making changes.

Remove: Box, TextField, Typography, Paper, Popover, Button, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Accordion, AccordionSummary, AccordionDetails, ExpandMoreIcon, CampaignIcon, useTheme, alpha, styled

Keep: Editor (TinyMCE), useForm, FormProvider, useTranslation, createEmptyAnswer, all question editor imports

Structure after rewrite:
  - Paper wrapper → <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
  - TextField for question name → shadcn Input from @item-bank/ui
  - Accordion (question type-specific settings) → shadcn Accordion from @item-bank/ui
    Import: import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@item-bank/ui';
  - Popover (background image settings) → shadcn Popover from @item-bank/ui
  - Dialog (solution) → Radix Dialog primitive (same pattern as AddQuestionModal)
  - CampaignIcon (solution button) → Megaphone from lucide
  - ExpandMoreIcon → ChevronDown from lucide (used inside AccordionTrigger automatically)
  - TinyMCE Editor div wrapper: replace styled(Box) with <div className="border border-border rounded-xl overflow-hidden bg-[hsl(var(--editor-background))]">

## STEP 9 — Rewrite QuestionViewShell.tsx

Same approach as EditorShell. Read the file first.
This is a read-only view shell. Replace Paper, Box, Typography, Divider, Button with Tailwind divs.
Keep TinyMCE viewer (Editor in readonly mode) exactly as-is.

## VERIFICATION CHECKLIST

After each step, run: npx nx typecheck item-bank
Final check after all 9 steps:
  ✓ grep -r "from '@mui" libs/questions/src/components/ → 0 results
  ✓ grep -r "from 'material-react-table'" libs/ → 0 results

Browser checks:
  ✓ Questions table renders with data, badges colored correctly
  ✓ Pagination next/prev works
  ✓ Row click opens question view
  ✓ 3-dot menu opens with Preview / Edit / Delete items
  ✓ Delete confirmation dialog opens and cancels/confirms
  ✓ Add Question button opens modal
  ✓ Search filters question type tiles
  ✓ Selecting a tile calls onSelectType and closes modal
  ✓ All above work in dark mode
  ✓ All above work in RTL (Arabic)
```

---

---

## 🔲 Phase 5 — libs/questions/pages (Group 1: Simple Editors)

**Scope:** TrueFalse, ShortAnswer, Essay, MultipleChoice + 4 sub-components
**Risk:** Medium — these editors use RadioGroup, Switch, Checkbox patterns
**Prerequisite:** Phase 4 ✅ (shadcn in libs/ui)

---

### Phase 5 — Claude Code Prompt

```
You are migrating Group 1 question editors in libs/questions/src/pages/ from MUI to Tailwind + shadcn.
All of these are child components rendered inside QuestionEditorShell (already migrated in Phase 4).
React Hook Form useFormContext() is the data layer — touch nothing about form state.

## GENERAL RULES FOR ALL FILES

Remove: Box, Stack, Typography, styled, alpha, useTheme from @mui/material
Replace:
  Box/Stack → <div className="...">
  Typography variant="h6" → <h3 className="text-base font-semibold text-foreground">
  Typography variant="body2" → <p className="text-sm text-muted-foreground">
  Divider → <hr className="border-border my-4" />
  Button → shadcn Button or native <button> with cn() classes
  TextField → shadcn Input from @item-bank/ui
  Select+FormControl+InputLabel+MenuItem → shadcn Select from @item-bank/ui
  Switch+FormControlLabel → native toggle (same pattern as BackgroundImageSettings Step 7)
  Checkbox → native <input type="checkbox" className="..."> or shadcn Checkbox if available
  Alert → <div className="flex gap-2 p-3 rounded-xl border text-sm ..."> (variant-colored)
  Collapse → conditional render OR CSS transition class
  IconButton → <button className="p-1.5 rounded-lg hover:bg-muted ...">
  AddIcon → Plus from lucide
  DeleteOutlineIcon → Trash2 from lucide

Import pattern for all files:
  import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@item-bank/ui';
  import { Plus, Trash2, ... } from 'lucide-react';

## FILE 1 — true-false/Add.tsx

Current: MUI RadioGroup + Radio + FormControlLabel
Replace with two styled button-style radio options:

  <div className="flex gap-3">
    {(['True', 'False'] as const).map((val) => (
      <button
        key={val}
        type="button"
        onClick={() => setValue('correctAnswer', val)}
        className={cn(
          'flex-1 py-4 rounded-2xl border-2 text-sm font-semibold transition-all',
          correctAnswer === val
            ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
            : 'border-border text-muted-foreground hover:border-primary/50'
        )}
      >
        {t(`editor.true_false.${val.toLowerCase()}`)}
      </button>
    ))}
  </div>

## FILE 2 — short-answer/Add.tsx

Current: Box + Typography + TextField + FormControl/Select + Switch + Button + IconButton

Rewrite maintaining these sections:
  1. Answer rows (id + text input + mark select + delete button)
  2. "Add answer" button (Plus icon)
  3. Case sensitivity toggle (native toggle switch)
  4. Unique answers toggle (native toggle switch)

Mark select: use shadcn Select with MARK_OPTIONS as items
TextField for answer text: use shadcn Input

Answer row layout:
  <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/30">
    <Input value={answer.text} onChange={...} className="flex-1 text-sm" placeholder={t('editor.short_answer.answer_placeholder')} />
    <Select value={String(answer.mark)} onValueChange={...}>
      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
      <SelectContent>
        {MARK_OPTIONS.map(m => <SelectItem key={m} value={String(m)}>{m}%</SelectItem>)}
      </SelectContent>
    </Select>
    <button type="button" onClick={() => deleteAnswer(answer.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10">
      <Trash2 size={15} />
    </button>
  </div>

## FILE 3 — essay/EssayEditor.tsx

Current: Box + TextField + Select + FormControlLabel + Switch + Checkbox + Chip + Collapse

Sections to rewrite:
  1. Response format Select (html / html_with_file_picker / plain_text) → shadcn Select
  2. Word limit toggle (Switch) + min/max fields (Input) → native toggle + Input
  3. File types allowed (Checkbox group) → native checkboxes styled as pill badges:
     <button type="button" onClick={toggle}
       className={cn('px-3 py-1 text-xs rounded-full border transition-colors',
         active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
       )}>
       {label}
     </button>
  4. Collapse (conditional render) → use {showWordLimit && (...)}

## FILE 4 — multiple-choice/MultipleChoiceEditor.tsx

Current: Box + Stack + Switch + FormControlLabel + Button + Divider + Snackbar + Alert

Rewrite maintaining:
  1. Allow partial credit toggle → native toggle
  2. List of ChoiceItem components → unchanged (those are rewritten in Files 5-7)
  3. "Add choice" button → <button className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary">
  4. SelectionControls component → unchanged (rewritten in File 8)
  5. Snackbar (max choices warning) → replace with a temporary top toast:
     Use a local useState for visible, with useEffect timeout to auto-hide after 3s:
     <div className={cn('fixed top-4 end-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border shadow-lg text-sm transition-all', visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none')}>
       <AlertTriangle size={16} className="text-amber-500 shrink-0" />
       <span className="text-foreground">{message}</span>
     </div>

## FILE 5 — multiple-choice/components/ChoiceItem.tsx

Current: Box + Switch + FormControlLabel + IconButton + styled

Each choice has: correct toggle + ChoiceEditor (TinyMCE) + feedback toggle + ChoiceFeedback (TinyMCE)

Rewrite wrapper:
  <div className={cn('rounded-2xl border-2 transition-colors p-4', isCorrect ? 'border-primary/60 bg-primary/5' : 'border-border')}>
    {/* Top row: correct toggle + delete */}
    <div className="flex items-center justify-between mb-3">
      {/* native toggle for isCorrect */}
      {canDelete && <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"><Trash2 size={15} /></button>}
    </div>
    <ChoiceEditor ... />  {/* keep exactly */}
    {/* feedback toggle */}
    <ChoiceFeedback ... />  {/* keep exactly */}
  </div>

## FILE 6 — multiple-choice/components/ChoiceEditor.tsx

Current: styled(Box) wrapper around TinyMCE Editor

The TinyMCE Editor MUST NOT be touched.
Only replace the styled Box wrapper with:
  <div className={cn('rounded-xl border overflow-hidden',
    variant === 'feedback' ? 'border-border bg-[hsl(var(--choice-feedback-background))]' : 'border-border bg-[hsl(var(--choice-editor-background))]'
  )}>
    <Editor ... /> {/* exactly as-is */}
  </div>

Add CSS tokens if missing:
  :root  → --choice-editor-background: 0 0% 100%; --choice-feedback-background: 210 40% 98%
  .dark  → --choice-editor-background: 217 33% 13%; --choice-feedback-background: 217 33% 15%

## FILE 7 — multiple-choice/components/ChoiceFeedback.tsx

Read file first. Pattern will be similar to ChoiceItem — replace MUI wrappers with divs.

## FILE 8 — multiple-choice/components/SelectionControls.tsx

Current: Box + TextField + Select + FormControl + InputLabel + Typography + Divider + Alert + Collapse

Sections:
  1. Choice numbering Select → shadcn Select
  2. Min/max selections Input → shadcn Input (two side-by-side fields)
  3. Validation Alert (shown when min > max) → inline error div
  4. Collapse → conditional render

## VERIFICATION

Run: npx nx typecheck item-bank
  ✓ grep -r "from '@mui" libs/questions/src/pages/true-false/ → 0
  ✓ grep -r "from '@mui" libs/questions/src/pages/short-answer/ → 0
  ✓ grep -r "from '@mui" libs/questions/src/pages/essay/ → 0
  ✓ grep -r "from '@mui" libs/questions/src/pages/multiple-choice/ → 0

Browser:
  ✓ True/False: correct answer highlights on click, both light/dark
  ✓ Short Answer: add/delete rows, mark select, toggles work
  ✓ Essay: format select, word limit toggle shows/hides fields
  ✓ Multiple Choice: add/delete choices, correct toggle, feedback toggle, TinyMCE renders in each choice
  ✓ All in RTL (Arabic)
```

---

---

## 🔲 Phase 6 — libs/questions/pages (Group 2: Form-Heavy Editors)

**Scope:** FillInBlanks, FillInBlanksImage, SelectCorrectWord, HighlightCorrectWord, TextSequencing, ImageSequencing, Numerical (10 files)
**Risk:** Medium — complex layouts but no canvas
**Prerequisite:** Phase 4 ✅ Phase 5 ✅

---

### Phase 6 — Claude Code Prompt

```
You are migrating Group 2 question editors from MUI to Tailwind + shadcn.
Apply the same general rules from Phase 5. This prompt focuses on the specific patterns in each file.

BEFORE starting each file, run: grep "from '@mui" <filepath> to see exact imports.
Remove ONLY what is imported from @mui. Touch nothing else.

## GENERAL RULES (same as Phase 5 — repeat for your context)
Box/Stack → div, Typography → p/h3/span, Divider → <hr className="border-border">,
Button → shadcn Button, TextField → shadcn Input, Select → shadcn Select,
Switch+FormControlLabel → native toggle, IconButton → <button>, Chip → badge span,
Add/Delete icons → Plus/Trash2 from lucide. Alert → styled div.

## FILE GROUP A — fill-in-blanks/FillInBlanksEditor.tsx + FillInBlanksQuestionView.tsx

FillInBlanks uses a custom TinyMCE plugin that injects blank placeholders. DO NOT touch:
  - The Editor component and its init config
  - The custom plugin registration code
  - Any refs or callbacks that interact with the editor DOM

Only replace the structural wrapper components (Box → div, Paper → div, Typography → heading/span).

## FILE GROUP B — fill-in-blanks-image/FillInBlanksImageEditor.tsx + FillInBlanksImageView.tsx

This editor overlays HTML input areas on top of an image.
The canvas/position logic (absolute positioning of input zones) is NOT MUI — do not touch it.
Replace only: Box → div, Typography, Paper wrappers, action buttons.

## FILE GROUP C — select-correct-word/SelectCorrectWordEditor.tsx + QuestionView.tsx

Pattern: TinyMCE for question text, then interactive word-selection UI.
The word-selection UI uses React state arrays — leave that logic alone.
Replace: Box wrappers, Typography, styled spans with Tailwind variants.

Word token (selectable word) styling:
  Unselected: className="inline-block px-1 py-0.5 mx-0.5 rounded cursor-pointer text-sm hover:bg-primary/10 transition-colors"
  Selected correct: className="... bg-primary/15 text-primary border border-primary/40 font-medium"

## FILE GROUP D — highlight-correct-word/HighlightCorrectWordEditor.tsx + QuestionView.tsx

Same pattern as SelectCorrectWord. Penalty percent field: shadcn Input type="number".

## FILE GROUP E — text-sequencing/TextSequencingEditor.tsx + QuestionView.tsx

Drag-to-reorder list. The @dnd-kit or similar drag library is NOT MUI — leave it completely alone.
Replace only the visual shell (Paper → div.rounded-2xl.border.border-border.bg-card, Box → div, Typography, styled list item wrapper).

Draggable item wrapper (the reorderable row):
  <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 cursor-grab active:cursor-grabbing transition-colors">
    <GripVertical size={16} className="text-muted-foreground shrink-0" />
    {/* item content */}
  </div>

## FILE GROUP F — image-sequencing/ImageSequencingEditor.tsx + QuestionView.tsx

Same as text-sequencing but items are images. Same approach.

## FILE GROUP G — numerical/NumericalEditor.tsx + NumericalAnswerRow.tsx + NumericalUnitRow.tsx

Multiple rows of answer entries (value + error margin + mark + feedback toggle + delete).
Unit rows (unit string + multiplier + delete).
Unit handling Select + unit input method Select.

Use the answer row pattern from ShortAnswer (Phase 5, File 2) as reference for styling.
Use shadcn Select for all select fields, shadcn Input for all text/number fields.

NumericalAnswerRow columns: answer (Input) | error margin (Input) | mark (Input) | feedback toggle | delete (Trash2)
NumericalUnitRow columns: unit text (Input) | multiplier (Input) | delete (Trash2)

Row wrapper:
  <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20">

## VERIFICATION

Run: npx nx typecheck item-bank
  ✓ grep -r "from '@mui" libs/questions/src/pages/fill-in-blanks → 0 (both dirs)
  ✓ grep -r "from '@mui" libs/questions/src/pages/select-correct-word → 0
  ✓ grep -r "from '@mui" libs/questions/src/pages/highlight-correct-word → 0
  ✓ grep -r "from '@mui" libs/questions/src/pages/text-sequencing → 0
  ✓ grep -r "from '@mui" libs/questions/src/pages/image-sequencing → 0
  ✓ grep -r "from '@mui" libs/questions/src/pages/numerical → 0

Browser:
  ✓ FillInBlanks: TinyMCE renders, blank placeholders inserted from toolbar button
  ✓ SelectCorrectWord: words clickable, selected words highlight
  ✓ TextSequencing: items draggable and reorder correctly
  ✓ Numerical: add/delete answer rows, select dropdowns work
  ✓ All in dark mode + RTL
```

---

---

## 🔲 Phase 7 — libs/questions/pages (Group 3: Canvas & Specialized)

**Scope:** DragDropText, DragDropImage, MultipleHotspots, FreeHandDrawing, RecordAudio, TextClassification, ImageClassification, Matching (16 files)
**Risk:** Medium-High — canvas-heavy components, but MUI is only the shell layer
**Prerequisite:** Phase 4 ✅ Phase 5 ✅ Phase 6 ✅

---

### Phase 7 — Claude Code Prompt

```
You are migrating Group 3 question editors from MUI to Tailwind + shadcn.

CRITICAL RULE: These editors contain canvas elements, Konva stages, audio recording APIs,
and custom drag-and-drop implementations. These are NOT MUI. Do NOT touch:
  - Any <canvas> element or Konva Stage/Layer/Shape
  - Any MediaRecorder, AudioContext, or Web Audio API code
  - Any ref that touches a canvas or media element
  - @dnd-kit drag handles or useSortable hooks
  - The JustificationInput component (already migrated in Phase 4)
  - The BackgroundImageSettings component (already migrated in Phase 4)

Your job: replace only the MUI structural shell (Box, Paper, Typography, styled wrappers,
MUI Dialog/Menu, MUI Button/TextField) with Tailwind equivalents.

Before editing each file, run:
  grep -n "from '@mui" <filepath>
  grep -n "from '@mui/material/styles'" <filepath>
This shows exactly what needs to be removed.

## GENERAL PATTERN FOR ALL FILES

Imports to remove (common across all):
  Box, Stack, Paper, Typography, Divider, Chip, styled, alpha, useTheme

Replacements:
  Paper wrapper → <div className="rounded-3xl border border-border bg-card overflow-hidden">
  Section heading → <h3 className="text-sm font-semibold text-foreground mb-3">
  Descriptive text → <p className="text-sm text-muted-foreground">
  Horizontal rule → <hr className="border-border my-4" />
  Chip/Badge → <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
  Button variants → same pattern used throughout migration

## FILE GROUP A — drag-drop-text/DragDropTextEditor.tsx + QuestionView.tsx

The drag-drop mechanics (@dnd-kit or similar) stay untouched.
Groups panel: color swatch circles stay as-is, just replace Box wrappers.
Item rows: replace MUI list wrappers with div rows.

Group card (colored left border accent):
  <div className="rounded-xl border border-border overflow-hidden" style={{ borderLeftColor: group.color, borderLeftWidth: 3 }}>

Item tag (draggable chip):
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-muted/50 cursor-grab text-sm font-medium text-foreground select-none">
    <GripHorizontal size={12} className="text-muted-foreground" />
    {item.answer}
  </div>

## FILE GROUP B — drag-drop-image/DragDropImageWizard.tsx + DragDropImageView.tsx

The Konva canvas is off-limits.
Replace only: Dialog shell (step wizard), Box wrappers, MUI Stepper (if present).
MUI Stepper → custom step indicator:
  <div className="flex items-center gap-2">
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold',
          i < currentStep ? 'bg-primary text-primary-foreground' :
          i === currentStep ? 'bg-primary/20 text-primary border-2 border-primary' :
          'bg-muted text-muted-foreground')}>
          {i < currentStep ? <Check size={12} /> : i + 1}
        </div>
        {i < steps.length - 1 && <div className={cn('flex-1 h-0.5', i < currentStep ? 'bg-primary' : 'bg-border')} />}
      </React.Fragment>
    ))}
  </div>

## FILE GROUP C — multiple-hotspots/MultipleHotspotsEditor.tsx + QuestionView.tsx

Canvas (Konva) is untouched.
Replace: toolbar MUI buttons above canvas with Tailwind buttons, side panel Box wrappers.
Hotspot list item:
  <div className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50">
    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: hotspot.color }} />
    <span className="text-sm text-foreground flex-1">{hotspot type label}</span>
    <button type="button" onClick={...} className="p-1 rounded text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
  </div>

## FILE GROUP D — free-hand-drawing/FreeHandDrawingQuestionView.tsx

Canvas only — very thin MUI usage.
Replace: any Box wrappers around the canvas with div, any Typography with span/p.

## FILE GROUP E — record-audio/RecordAudioEditor.tsx + QuestionView.tsx + RecordedAudioPlayer.tsx

Audio recording logic (MediaRecorder, blobs, timers) is untouched.
Replace:
  Record button (MUI Fab or Button) → circular button with recording state:
    <button onClick={toggleRecord} className={cn('w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md',
      isRecording ? 'bg-destructive text-white animate-pulse' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
      {isRecording ? <Square size={20} /> : <Mic size={20} />}
    </button>
  Audio player (RecordedAudioPlayer): Replace Paper wrapper with div, keep <audio> element as-is.
  Time display → <span className="font-mono text-lg tabular-nums text-foreground">

## FILE GROUP F — text-classification/TextClassificationEditor.tsx + View.tsx

Category management: color picker input, category name input, item text inputs.
Replace Box/Paper/styled with div + cn(). Keep color: keep <input type="color"> as-is.
Category card:
  <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: category.color }}>
    <div className="px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: category.color }}>
      {category.name}
    </div>
    <div className="p-3 space-y-2 bg-card">
      {/* answer items */}
    </div>
  </div>

## FILE GROUP G — image-classification/ImageClassificationEditor.tsx + View.tsx

Same category card pattern as text-classification but items are image thumbnails.
Image upload button: same pattern as BackgroundImageSettings (Phase 4 Step 7).

## FILE GROUP H — matching/MatchingWizard.tsx + MatchingView.tsx

Two-column matching (left items → right items, connected by lines or dropdowns).
Replace Box/Paper/Stack wrappers with div grid/flex.
Connection line rendering (SVG): NOT MUI, leave untouched.
Left item / Right item cards:
  <div className="p-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground min-h-[48px] flex items-center">

## VERIFICATION

Run: npx nx typecheck item-bank
  ✓ grep -r "from '@mui" libs/questions/src/pages/ → 0 results across ALL question pages

Browser — spot check one from each group:
  ✓ DragDropText: groups render, items draggable between groups
  ✓ DragDropImage: canvas visible, step wizard navigates
  ✓ MultipleHotspots: hotspot type buttons work, canvas renders
  ✓ RecordAudio: record button triggers, timer counts, playback works
  ✓ TextClassification: categories render with colors, items add/delete
  ✓ Matching: left/right columns render, connections work
  ✓ All in dark mode + RTL
```

---

---

## 🔲 Phase 8 — Final Cleanup

**Scope:** Remove MUI packages, reset Tailwind config, final verification
**Risk:** Low (all MUI references already gone after Phase 7)
**Prerequisite:** All Phases 0–7 ✅

---

### Phase 8 — Claude Code Prompt

```
You are doing the final cleanup of the MUI → shadcn migration for Item Bank.

## PRE-FLIGHT CHECK

Before removing anything, verify zero MUI references remain:
  grep -r "from '@mui" apps/ libs/ --include="*.tsx" --include="*.ts" | grep -v node_modules
  grep -r "from 'material-react-table'" apps/ libs/ --include="*.tsx" --include="*.ts"
  grep -r "styled(" apps/item-bank/src libs/ --include="*.tsx" --include="*.ts" | grep -v ".d.ts"

If ANY results appear, stop and fix those files before proceeding.

## STEP 1 — Remove MUI packages from package.json

Run:
  pnpm remove @mui/material @mui/icons-material @emotion/react @emotion/styled @emotion/cache stylis-plugin-rtl material-react-table

If any of these are listed in nested package.json files (e.g. libs/*/package.json or apps/*/package.json), remove them there too.

After removal: pnpm install (to update lockfile)

## STEP 2 — Update apps/item-bank/tailwind.config.js

Remove the coexistence scaffolding flags:
  REMOVE: important: true
  REMOVE: corePlugins: { preflight: false }

Tailwind can now own the full CSS reset.

## STEP 3 — Update apps/item-bank/src/styles.css

Remove any @import or CSS rules that referenced MUI/Emotion.
Add Tailwind base layer (now safe to enable since preflight is enabled):
  Verify the file starts with:
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
  If @tailwind base; is missing, add it at the top before the :root block.

## STEP 4 — Final TypeScript check

  npx nx typecheck item-bank

Expected: 0 errors

## STEP 5 — Full build check

  npx nx build item-bank

Expected: successful build with no MUI references in bundle.
Check dist/ bundle size — should be significantly smaller than before migration.

## STEP 6 — Clean up apps/item-bank/src/components/ui/

These files were installed by the shadcn CLI but are now duplicated in libs/ui/src/components/ui/.
You have two options:
  A. Keep both copies (apps/ uses local imports, libs/ uses @item-bank/ui) — simpler
  B. Update apps/ to import from @item-bank/ui for everything — cleaner

Recommendation: Option A for now. Option B can be a separate refactor.

## STEP 7 — Commit

  git add .
  git commit -m "Phase 8: Remove MUI, clean up Tailwind config, migration complete"
  git push origin main

## FINAL VERIFICATION MATRIX

  ✓ pnpm install — no peer dependency warnings from @mui/*
  ✓ npx nx typecheck item-bank — 0 errors
  ✓ npx nx build item-bank — successful
  ✓ All routes load in browser (light + dark mode)
  ✓ Language toggle switches EN ↔ AR on all pages
  ✓ All 20 question type editors open and function
  ✓ All 20 question type views render correctly
  ✓ Questions table loads, filters, paginates, row actions work
  ✓ Auth flow: login → home → logout → redirect to login
  ✓ Profile sidebar navigates between sections
```

---

## Dependency Map

```
Phase 0 (Foundation)
  └─► Phase 1 (libs/ui)
        └─► Phase 2 (libs/auth)      ← independent of Phase 3+
        └─► Phase 3 (libs/profile)   ← independent of Phase 2
        └─► Phase 4 (libs/questions/components + shadcn in libs/ui)
              └─► Phase 5 (questions Group 1)
              └─► Phase 6 (questions Group 2)
              └─► Phase 7 (questions Group 3)
                    └─► Phase 8 (Final Cleanup) ← requires ALL above
```

Phases 2 and 3 can be done in parallel.
Phases 5, 6, and 7 can be done in parallel (all depend on Phase 4).
Phase 8 requires all phases complete.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| TanStack Table missing feature (e.g. column resize, full-screen) | Medium | Medium | Phase 4 — implement manually in headless shell |
| TinyMCE dark mode bleeding through (editor chrome stays light) | Low | Low | Wrap in .dark-aware container, override `tox-` CSS vars |
| RTL input adornments misaligned | Low | Low | Use `ps-` / `pe-` / `start-` / `end-` Tailwind classes throughout |
| Emotion CSS residue in bundle after removal | Low | Low | Run `grep -r "emotion" dist/` post-build |
| Canvas components broken by div wrapper change | Low | High | Never change canvas wrapper dimensions — preserve `width`/`height` props exactly |

---

*This document is living. Update phase status as each phase completes.*
