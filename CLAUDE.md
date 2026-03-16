worktree-dir: .worktrees/

# Project: Item Bank (Nx Monorepo)

---

## Stack

- **Monorepo**: Nx v22
- **App**: `apps/item-bank` — React 19 + TypeScript (strict) + Vite
- **Libs**: `libs/ui`, `libs/auth`, `libs/questions`, `libs/profile`, `libs/i18n`, `libs/types`, `libs/api`, `libs/config`
- **Styling**: Tailwind CSS 3.4 + shadcn/ui + Radix UI primitives
- **Package manager**: pnpm — never use npm or yarn
- **Forms**: react-hook-form + Zod — never replace, restructure, or modify this logic
- **Rich text / canvas / DnD**: TinyMCE, Konva, dnd-kit — never touch their internals, only replace MUI wrapper shells
- **Server state**: TanStack Query (`useQuery` / `useMutation`)
- **UI state**: React Context

---

## Architecture & Library Boundaries

### Lib Layer Order (lower libs cannot import from higher ones)

```
apps/item-bank          ← top: imports anything
  libs/questions
  libs/profile
  libs/auth
    libs/ui             ← shared primitives (shadcn, hooks, utils)
    libs/api            ← all API calls centralized here
    libs/types          ← all shared TypeScript types/interfaces/DTOs
    libs/config         ← env vars and typed config constants
    libs/i18n           ← NEVER TOUCH — translation infrastructure only
```

- A lib may only import from libs **at or below its own layer**
- `libs/questions` cannot import from `libs/auth` or `libs/profile`
- All libs import shadcn primitives via `@item-bank/ui` — never from a local `components/ui/`

### Folder Structure Inside Each Lib

```
libs/<name>/src/
  features/
    <feature-name>/
      index.ts          ← barrel re-exports everything from this feature
      <Feature>.tsx     ← main component
      <SubComponent>.tsx
      hooks/
        use<HookName>.ts
      types.ts          ← feature-local types (or use libs/types for shared)
  index.ts              ← lib-level barrel (re-exports all features)
```

### Shared Component Location

- shadcn/Radix primitives → **always** `libs/ui/src/components/ui/` — no exceptions
- Shared hooks → `libs/ui/src/hooks/`
- App-level components (NavBar, Sidebar) → `libs/ui/src/components/`

### Types

- All shared interfaces and DTOs → `libs/types`
- Inline `type Props = {...}` is allowed only for component-local prop types in the same file
- Never define a shared type inside a feature component

### API Layer

- All fetch/mutation logic lives in `libs/api`
- Feature components consume API via TanStack Query hooks wrapping `libs/api` functions
- TanStack Query error states (`isError`, `error`) provide inline error UI — no separate error handling layer for API errors

### Routing

- Each lib owns its route definitions
- `apps/item-bank` assembles routes from lib exports
- `ProtectedRoute` in `libs/auth` acts as layout wrapper with `<Outlet />`

### Config & Environment

- Env variables: `import.meta.env.VITE_*` (Vite convention)
- All constants flow through a typed config module in `libs/config` — never hard-code env values in components

### New Libs

- Create with: `pnpm nx generate @nx/react:library`
- Never scaffold a new lib without explicit task requirement

---

## Language

Always respond in **English only**, regardless of what language the user writes in.

---

## Verbosity

Walk through every notable decision. Explain the approach, flag risks, and summarize changes in a table when multiple files are touched.

---

## Commit Messages

**Imperative short** format — no conventional prefix:

```
Add login page
Fix table border in dark mode
Remove MUI Box from ProtectedRoute
```

No `feat:`, `fix:`, `chore:` prefixes.

---

## Branching

- `feat/description` for new features and migrations
- `fix/description` for bug fixes
- Never push directly to `main` without completing the task

---

## After Every Task

Always run `pnpm nx build item-bank` to verify nothing broke before considering the task complete. If the build fails, fix it — do not leave a broken build.

---

## TypeScript

- **Strict** — no implicit `any`, no `@ts-ignore`, no `as unknown as X` casts
- Always fix type errors properly; never suppress them
- Use `UseFormRegisterReturn` for RHF register spreads, not `any`
- All component prop types defined explicitly — no inferred untyped props

---

## File Naming

- `PascalCase.tsx` for all files (components, pages, hooks, utils)
- Exception: `index.ts` barrels are always lowercase

---

## Import Order (inside every file)

1. React and React hooks
2. Third-party packages (lucide-react, react-hook-form, zod, @tanstack/*, etc.)
3. Workspace packages (`@item-bank/*`)
4. Relative imports (`./`, `../`)

Enforce this order; reorganize imports in any file you touch.

---

## Component Size & Extraction

- Extract sub-components when a file exceeds **~150 lines** or when logic is reused
- Each feature folder exposes an **index barrel** (`index.ts`) re-exporting everything

---

## CSS & Styling

- **Always** use logical CSS properties: `start-*`, `end-*`, `ps-*`, `pe-*`, `ms-*`, `me-*`
- Never use `left-*`, `right-*`, `pl-*`, `pr-*`, `ml-*`, `mr-*`
- Dark mode via **`dark:` Tailwind prefix** (`darkMode: 'class'`, `.dark` on `<html>`)
- CSS custom property naming: `--component-role` (e.g. `--choice-item-background`)
- New tokens must be added to **both** `:root` (light) and `.dark` blocks in `apps/item-bank/src/styles.css`
- CSS variable values are bare HSL: `239 68% 68%` — consumed as `hsl(var(--token))`
- Exception: gradient tokens use the full `linear-gradient(...)` value and are consumed with `background: var(--token)` directly

---

## i18n

- Always add translation keys to **both** `public/locales/en/*.json` and `public/locales/ar/*.json`
- Reuse existing keys wherever possible before adding new ones
- Never leave a `t('...')` call in code without the corresponding JSON entry

---

## Component Migration Rules (MUI → Tailwind)

- Full freedom to redesign prop APIs — MUI-specific types (`SelectChangeEvent`, `SxProps`, etc.) must be removed
- Never leave `styled()`, `alpha()`, `useTheme()`, or any `@mui/*` import
- TinyMCE, Konva, dnd-kit internals are **never touched** — only their MUI shell wrappers are replaced
- react-hook-form + Zod logic is **never modified**

---

## Accessibility

Follow **WCAG AA** standards:

- Always add `aria-label` on icon-only buttons
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, etc.)
- Ensure keyboard navigation works (focus rings, tab order)
- Manage focus explicitly when modals open/close

---

## Hooks

- Shared hooks → `libs/ui/src/hooks/`
- Feature-specific hooks → `hooks/` subfolder inside the feature folder
- Hook files named `use<HookName>.tsx` (PascalCase after `use`)

---

## Comments & Documentation

- Add `//` comments for any non-obvious logic
- JSDoc for all exported functions and components
- Variables and functions must be self-explanatory — no single-letter names outside of standard map/filter callbacks

---

## TODOs

Never leave `TODO`, `FIXME`, or `HACK` comments. Either implement it or don't — no placeholders.

---

## console.log

Remove all `console.log` statements before finishing a task. No debug logging in committed code.

---

## Tests

- Always update or add tests when modifying component logic
- Do not leave existing tests broken
- Run `pnpm nx test item-bank` after changes that affect tested code

---

## Error Handling

- API errors handled via TanStack Query `isError` / `error` states
- Display inline error UI in the component — no global error toast for query failures
- Use React Error Boundaries at the route level for unexpected runtime errors

---

## Bug Discovery

If a pre-existing bug is found while working on something else, fix it **in the same commit** — don't leave known bugs.

---

## Off-Limits Files

Never modify these regardless of context:

- `libs/i18n/` — translation infrastructure is stable
- `tsconfig.base.json` — path aliases; changes break all workspace imports
- `node_modules/`, `.nx/` — never touch generated or cache directories

## Commit Rules

- Never commit `.md` files — documentation and notes stay out of version control
- Exception: `CLAUDE.md` itself is the only `.md` file that may be committed
- Never add `Co-Authored-By` trailers to commit messages — keep Abed as the sole author
