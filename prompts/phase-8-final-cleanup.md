# Phase 8 — Final Cleanup
## Remove MUI · Reset Tailwind · Final Audit

---

## CONTEXT

**Prerequisite:** ALL of Phases 0–7 must be complete.

This phase removes all MUI packages from the project, resets Tailwind to full-power mode (no coexistence scaffolding), and runs a complete audit to confirm the migration is done.

---

## STEP 1 — Pre-flight: confirm zero MUI references

Run every command below. If ANY returns results, stop and fix those files before continuing.

```bash
# Check for any MUI imports remaining in source files
grep -rn "from '@mui" apps/item-bank/src/ libs/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v ".d.ts"

# Check for material-react-table
grep -rn "from 'material-react-table'" apps/ libs/ --include="*.tsx" --include="*.ts"

# Check for styled() from MUI (not from other packages)
grep -rn "from '@mui/material/styles'" apps/item-bank/src/ libs/ --include="*.tsx" --include="*.ts"

# Check for any remaining emotion/MUI theme usage
grep -rn "useTheme\(\)" apps/item-bank/src/ libs/ --include="*.tsx" --include="*.ts"
grep -rn "theme\.palette\." apps/item-bank/src/ libs/ --include="*.tsx" --include="*.ts"
grep -rn "theme\.spacing\(" apps/item-bank/src/ libs/ --include="*.tsx" --include="*.ts"
```

Expected: **0 results** in every command above.

---

## STEP 2 — Remove MUI packages

Run:
```bash
pnpm remove \
  @mui/material \
  @mui/icons-material \
  @mui/lab \
  @emotion/react \
  @emotion/styled \
  @emotion/cache \
  stylis-plugin-rtl \
  material-react-table
```

If any of those packages are not in `package.json` root, check:
```bash
cat apps/item-bank/package.json 2>/dev/null | grep -E "@mui|@emotion|material-react"
cat libs/ui/package.json 2>/dev/null | grep -E "@mui|@emotion|material-react"
```

If found in a nested `package.json`, remove from there too.

After removal, run:
```bash
pnpm install
```

Confirm no MUI-related peer dependency warnings appear.

---

## STEP 3 — Update `apps/item-bank/tailwind.config.js`

Open the file. Remove these two lines from the config object:

```js
// REMOVE THIS LINE:
important: true,

// REMOVE THIS LINE (and the corePlugins object if it only contained preflight):
corePlugins: { preflight: false },
```

The Tailwind config should now look clean — no coexistence scaffolding.

Verify the file still has:
```js
darkMode: 'class',
content: [...],
theme: { extend: { ... } },
plugins: [require('tailwindcss-animate')],
```

---

## STEP 4 — Update `apps/item-bank/src/styles.css`

Open the file. Confirm it starts with all three Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

If `@tailwind base;` was previously missing (because `preflight: false` was set), add it now as the first line. This enables the CSS reset.

Check for any stale MUI or Emotion CSS imports in this file and remove them. Look for:
```css
/* Lines to remove if present */
@import url(...emotion...);
@import url(...mui...);
```

---

## STEP 5 — TypeScript check

```bash
npx nx typecheck item-bank
```

Expected: **0 errors**

If errors appear, read them carefully — they may be caused by:
- Missing type imports now that MUI types are gone (e.g. `SvgIconProps` — replace with `{ className?: string; size?: number }`)
- `SelectChangeEvent` type still referenced somewhere — replace with `React.ChangeEvent<HTMLSelectElement>` or `(value: string) => void`
- Component prop types that previously used MUI types

Fix all errors before continuing.

---

## STEP 6 — Build check

```bash
npx nx build item-bank
```

Expected: successful build, no MUI warnings in output.

After build completes:
```bash
# Verify no MUI chunks in bundle
ls dist/apps/item-bank/assets/ | grep -i mui
# Expected: no output

# Check approximate bundle size reduction
du -sh dist/apps/item-bank/
```

MUI + Emotion typically adds 300-500KB gzipped. The bundle should be noticeably smaller.

---

## STEP 7 — Visual regression check (browser)

Start dev server:
```bash
npx nx serve item-bank
```

Navigate to every route and verify:

**Auth routes:**
- [ ] `/login` — page loads, form works, dark/light, RTL
- [ ] `/signup` — page loads, form works, validation shows errors
- [ ] `/forgot-password` — page loads, success alert shows

**Main app (requires login):**
- [ ] `/home` — questions table renders, badges correct, pagination works
- [ ] Add question modal opens, search works, all 19 tiles visible
- [ ] Row actions: preview, edit, delete all work
- [ ] Delete confirmation dialog works

**Profile routes:**
- [ ] `/profile/edit` — sidebar + avatar renders
- [ ] `/profile/change-password` — sidebar nav item highlights
- [ ] `/profile/file-manager` — sidebar nav item highlights

**Question editors (open each via Add Question modal or edit):**
- [ ] True/False editor — two choice buttons
- [ ] Short Answer — answer rows
- [ ] Essay — response format select, word limit toggle
- [ ] Multiple Choice — choices with TinyMCE, correct/feedback toggles
- [ ] FillInBlanks — TinyMCE with blank insertion
- [ ] SelectCorrectWord — word tokens
- [ ] TextSequencing — draggable items
- [ ] Numerical — answer/unit rows
- [ ] RecordAudio — record button
- [ ] TextClassification — category cards
- [ ] Matching — wizard with left/right items

**Dark mode (toggle with theme button):**
- [ ] All pages look correct in dark mode
- [ ] No MUI-specific light/white bleed-through visible

**RTL (switch to Arabic):**
- [ ] `dir="rtl"` on `<html>`
- [ ] All layouts flip correctly (sidebar, navbar, form icons)

---

## STEP 8 — Optional: Clean up apps/item-bank/src/components/ui/

The shadcn files in `apps/item-bank/src/components/ui/` are now duplicates of what's in `libs/ui/src/components/ui/`. You have two options:

**Option A (Recommended now):** Keep both copies. The app imports from `@/components/ui/` for its own use, and libs import from `@item-bank/ui`. No risk.

**Option B (Do later):** Update all imports in `apps/item-bank/src/` that reference `@/components/ui/...` to instead import from `@item-bank/ui`. Then delete `apps/item-bank/src/components/ui/`. Cleaner but more risk — do this in a separate PR.

---

## STEP 9 — Final commit

```bash
git add .
git commit -m "Phase 8: remove MUI packages, reset Tailwind config, migration complete

- Removed @mui/material, @mui/icons-material, @emotion/*, material-react-table
- Removed Tailwind important: true and preflight: false coexistence flags
- Enabled @tailwind base; CSS reset
- Full build verified, zero MUI references in source"
git push origin main
```

---

## POST-MIGRATION AUDIT CHECKLIST

Run this final audit script after the commit:

```bash
echo "=== MUI import scan ===" && \
grep -rn "from '@mui" apps/item-bank/src/ libs/ --include="*.tsx" --include="*.ts" | grep -v node_modules | wc -l && \
echo "=== Emotion import scan ===" && \
grep -rn "from '@emotion" apps/item-bank/src/ libs/ --include="*.tsx" --include="*.ts" | grep -v node_modules | wc -l && \
echo "=== material-react-table scan ===" && \
grep -rn "from 'material-react-table'" apps/ libs/ --include="*.tsx" --include="*.ts" | wc -l && \
echo "=== styled() from MUI scan ===" && \
grep -rn "styled(" apps/item-bank/src/ libs/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep "from '@mui" | wc -l && \
echo "Done — all counts should be 0"
```

Expected output:
```
=== MUI import scan ===
0
=== Emotion import scan ===
0
=== material-react-table scan ===
0
=== styled() from MUI scan ===
0
Done — all counts should be 0
```

If all four are `0`, the migration is complete. 🎉

---

## WHAT'S LEFT AFTER THIS PHASE

Nothing — the migration is done. Future improvements (separate PRs, not this migration):

1. **Consolidate shadcn components** (Option B above) — remove duplication between `apps/item-bank/src/components/ui/` and `libs/ui/src/components/ui/`
2. **Polish design tokens** — now that MUI is fully gone, refine the CSS variable palette (you can freely adjust colors in `styles.css` without worrying about MUI overrides)
3. **Add shadcn Form components** — replace the raw `AuthField` input with shadcn `<FormField>` pattern for full form accessibility
4. **Dark mode TinyMCE** — configure TinyMCE `skin: 'oxide-dark'` when `.dark` class is present for consistent editor appearance
