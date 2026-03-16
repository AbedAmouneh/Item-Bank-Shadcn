# Phase 2 — libs/auth Migration
## MUI → Tailwind CSS + shadcn/ui

---

## CONTEXT — READ THIS FIRST

You are working in the Item Bank Nx monorepo. The design system foundation is already complete:

- **CSS variables**: `apps/item-bank/src/styles.css` — all tokens defined as HSL values
- **Tailwind config**: `apps/item-bank/tailwind.config.js` — `darkMode: 'class'`, all color tokens wired
- **Dark mode**: `.dark` class on `<html>` element (set by `AppShell` in `App.tsx`)
- **RTL**: `dir="rtl"` attribute on `<html>` element (set by `AppShell` in `App.tsx`)
- **`cn()` utility**: exists at `libs/ui/src/lib/utils.ts` — import from `@item-bank/ui`
- **`useSwitchTheme` hook**: exported from `@item-bank/ui` — returns `{ switchTheme, mode }`

**Scope of this phase**: 4 files
1. `libs/auth/src/pages/Login.tsx`
2. `libs/auth/src/pages/SignUp.tsx`
3. `libs/auth/src/pages/ForgotPassword.tsx`
4. `libs/auth/src/guards/ProtectedRoute.tsx`

**DO NOT TOUCH**:
- `libs/auth/src/guards/GuestRoute.tsx` — already MUI-free
- `libs/auth/src/guards/NotFoundRedirect.tsx` — already MUI-free
- All `useForm`, `zodResolver`, schema definitions — leave exactly as-is
- All `useNavigate`, `RouterLink`, `useTranslation`, `i18n` calls — leave exactly as-is
- All `useSwitchTheme` usage — leave exactly as-is

---

## STEP 1 — Add missing CSS tokens to `apps/item-bank/src/styles.css`

Open `apps/item-bank/src/styles.css`. Find the `:root` block and `.dark` block.

Check if these tokens exist. If any are missing, add them:

```css
/* Inside :root { } */
--auth-page-background: linear-gradient(135deg, hsl(239 84% 97%) 0%, hsl(210 40% 96%) 100%);
--auth-card-background: 0 0% 100% / 0.95;
--auth-card-shadow: 220 13% 18% / 0.12;
--auth-field-background: 210 40% 98%;
--auth-utility-button-bg: 0 0% 100% / 0.75;
--avatar-background: 239 68% 90%;

/* Inside .dark { } */
--auth-page-background: linear-gradient(135deg, hsl(222 47% 9%) 0%, hsl(222 47% 12%) 100%);
--auth-card-background: 217 33% 13%;
--auth-card-shadow: 0 0% 0% / 0.5;
--auth-field-background: 217 33% 17%;
--auth-utility-button-bg: 222 47% 18%;
--avatar-background: 239 50% 25%;
```

> Note: `--auth-page-background` uses `linear-gradient` not HSL — it is used directly as `background: var(--auth-page-background)` not `hsl(var(...))`.

---

## STEP 2 — Create `libs/auth/src/components/AuthPageWrapper.tsx`

Create this file from scratch. This component is the full-page container with the utility buttons (language + theme toggle) in the top-right corner. It is extracted from the common pattern in Login, SignUp, and ForgotPassword.

```tsx
import { useTranslation } from 'react-i18next';
import { useSwitchTheme } from '@item-bank/ui';
import { Globe, Sun, Moon } from 'lucide-react';

interface AuthPageWrapperProps {
  children: React.ReactNode;
}

export default function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const { i18n } = useTranslation();
  const { switchTheme, mode } = useSwitchTheme();

  const switchLanguage = () => {
    const next = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ background: 'var(--auth-page-background)' }}
    >
      {/* Utility buttons — top-right, RTL-aware */}
      <div className="absolute top-5 end-5 flex gap-2">
        <button
          type="button"
          onClick={switchLanguage}
          aria-label="Switch language"
          className="p-2 rounded-full border border-border backdrop-blur-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          style={{ backgroundColor: 'hsl(var(--auth-utility-button-bg))' }}
        >
          <Globe size={18} />
        </button>
        <button
          type="button"
          onClick={switchTheme}
          aria-label="Switch theme"
          className="p-2 rounded-full border border-border backdrop-blur-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          style={{ backgroundColor: 'hsl(var(--auth-utility-button-bg))' }}
        >
          {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {children}
    </div>
  );
}
```

---

## STEP 3 — Create `libs/auth/src/components/AuthCard.tsx`

Create this file from scratch. Replaces `styled(Box)` AuthCard from all three pages.

```tsx
import { cn } from '@item-bank/ui';

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        'w-full max-w-[480px] mx-4',
        'backdrop-blur-[20px] rounded-[24px] p-10',
        'border border-border',
        className
      )}
      style={{
        backgroundColor: 'hsl(var(--auth-card-background))',
        boxShadow: '0 8px 40px 0 hsl(var(--auth-card-shadow))',
      }}
    >
      {children}
    </div>
  );
}
```

---

## STEP 4 — Create `libs/auth/src/components/AuthField.tsx`

Create this file from scratch. Replaces `StyledTextField` — a custom input with leading icon, trailing adornment slot, and inline error display. This is NOT a shadcn Input — it is a native `<input>` styled with Tailwind to match the auth page aesthetic.

```tsx
import { cn } from '@item-bank/ui';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface AuthFieldProps {
  type: string;
  placeholder: string;
  error?: string | null;
  icon: React.ReactNode;
  registration: UseFormRegisterReturn;
  endAdornment?: React.ReactNode;
}

export default function AuthField({
  type,
  placeholder,
  error,
  icon,
  registration,
  endAdornment,
}: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        {/* Leading icon */}
        <div className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground flex items-center justify-center w-5 h-5 pointer-events-none">
          {icon}
        </div>

        <input
          type={type}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-2xl border bg-[hsl(var(--auth-field-background))]',
            'ps-10 py-3 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary',
            'transition-colors duration-150',
            endAdornment ? 'pe-10' : 'pe-4',
            error
              ? 'border-destructive focus:ring-destructive focus:border-destructive'
              : 'border-border hover:border-border/70'
          )}
          {...registration}
        />

        {/* Trailing adornment (e.g. show/hide password button) */}
        {endAdornment && (
          <div className="absolute end-3 top-1/2 -translate-y-1/2">
            {endAdornment}
          </div>
        )}
      </div>

      {/* Inline error text */}
      {error && (
        <p className="text-xs text-destructive ps-1">{error}</p>
      )}
    </div>
  );
}
```

---

## STEP 5 — Rewrite `libs/auth/src/pages/Login.tsx`

**Remove every import from `@mui/material` and `@mui/icons-material` and `@mui/material/styles`.**

Specifically remove:
- `Box, TextField, Button, IconButton, InputAdornment, Typography, Stack` from `@mui/material`
- `Visibility, VisibilityOff, Language, LightMode, DarkMode, Email as EmailIcon, Lock as LockIcon` from `@mui/icons-material`
- `styled, alpha` from `@mui/material/styles`
- The entire `LinkBehavior` forwardRef component (it is no longer needed)
- All `const PageRoot = styled(...)`, `const UtilityButton = styled(...)`, `const AuthCard = styled(...)`, `const StyledTextField = styled(...)`, `const PrimaryButton = styled(...)`, `const StyledLink = styled(...)`, `const InlineLink = styled(...)` declarations

**Keep exactly as-is (do not touch):**
- `useState` from `react`
- `useForm` from `react-hook-form`
- `useNavigate, Link as RouterLink, type LinkProps as RouterLinkProps` from `react-router-dom`
- `useTranslation` from `react-i18next`
- `zodResolver` from `@hookform/resolvers/zod`
- `* as z` from `zod`
- `useSwitchTheme` from `@item-bank/ui`
- The `loginSchema` const
- All logic inside the `Login` component: `showPassword` state, `useForm`, `login` handler, `navigate`

**Add these new imports:**
```tsx
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import AuthPageWrapper from '../components/AuthPageWrapper';
import AuthCard from '../components/AuthCard';
import AuthField from '../components/AuthField';
```

**Remove `useSwitchTheme` import from Login** — it is now handled inside `AuthPageWrapper`.

**New JSX return value** (replace everything from `return (` to the closing `);`):

```tsx
return (
  <AuthPageWrapper>
    <AuthCard>
      <form onSubmit={login} className="flex flex-col items-center gap-6 w-full">

        {/* Logo */}
        <img
          className="h-20 object-contain"
          src="/images/york-press.png"
          alt="York Press logo"
        />

        {/* Title */}
        <h1 className="text-[1.75rem] font-bold text-foreground">
          {t('common:AuthorApp')}
        </h1>

        {/* Fields + submit */}
        <div className="w-full flex flex-col gap-3">

          <AuthField
            type="email"
            placeholder={t('auth:Email')}
            icon={<Mail size={16} />}
            error={errors.email ? t('auth:invalid_email') : null}
            registration={register('email', { required: true })}
          />

          <AuthField
            type={showPassword ? 'text' : 'password'}
            placeholder={t('auth:Password')}
            icon={<Lock size={16} />}
            error={errors.password ? t('auth:password_required') : null}
            registration={register('password', { required: true })}
            endAdornment={
              <button
                type="button"
                aria-label={showPassword ? t('auth:hide_password') : t('auth:show_password')}
                onClick={() => setShowPassword(!showPassword)}
                onMouseDown={(e) => e.preventDefault()}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          {/* Primary submit button */}
          <button
            type="submit"
            data-testid="login-btn"
            className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_hsl(var(--primary)/0.35)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.45)] mt-1"
          >
            {t('auth:Login')}
          </button>
        </div>

        {/* Footer links */}
        <div className="flex justify-between items-center w-full rtl:flex-row-reverse">
          <RouterLink
            to="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline whitespace-nowrap no-underline transition-colors"
          >
            {t('auth:forgot_password')}
          </RouterLink>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t('auth:no_account')}{' '}
            <RouterLink
              to="/signup"
              className="font-semibold text-foreground hover:underline no-underline transition-colors"
            >
              {t('auth:sign_up')}
            </RouterLink>
          </span>
        </div>

      </form>
    </AuthCard>
  </AuthPageWrapper>
);
```

---

## STEP 6 — Rewrite `libs/auth/src/pages/SignUp.tsx`

**Remove every import from `@mui/material`, `@mui/icons-material`, `@mui/material/styles`:**
- `Box, TextField, Button, IconButton, InputAdornment, Typography, Stack` from `@mui/material`
- `Visibility, VisibilityOff, Language, LightMode, DarkMode, Email as EmailIcon, Lock as LockIcon, Person as PersonIcon` from `@mui/icons-material`
- `styled, alpha` from `@mui/material/styles`
- `LinkBehavior` forwardRef
- All `styled(...)` component declarations

**Keep exactly as-is:**
- `useState` from `react`
- `useForm` from `react-hook-form`
- `useNavigate, RouterLink` from `react-router-dom`
- `useTranslation` from `react-i18next`
- `zodResolver`, `z`
- `useSwitchTheme` from `@item-bank/ui`
- `createSignUpSchema` const
- All logic in `SignUp`: `showPassword`, `showConfirmPassword`, `signUpSchema`, form registration, `signUp` handler

**Add:**
```tsx
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import AuthPageWrapper from '../components/AuthPageWrapper';
import AuthCard from '../components/AuthCard';
import AuthField from '../components/AuthField';
```

**Remove `useSwitchTheme`** — handled by `AuthPageWrapper`.

**New JSX return:**

```tsx
return (
  <AuthPageWrapper>
    <AuthCard>
      <form onSubmit={signUp} className="flex flex-col items-center gap-6 w-full">

        <img
          className="h-20 object-contain"
          src="/images/york-press.png"
          alt="York Press logo"
        />

        <h1 className="text-[1.75rem] font-bold text-foreground">
          {t('common:AuthorApp')}
        </h1>

        <div className="w-full flex flex-col gap-3">

          <AuthField
            type="text"
            placeholder={t('auth:full_name')}
            icon={<User size={16} />}
            error={errors.fullName ? t('auth:full_name_required') : null}
            registration={register('fullName', { required: true })}
          />

          <AuthField
            type="email"
            placeholder={t('auth:Email')}
            icon={<Mail size={16} />}
            error={errors.email ? t('auth:invalid_email') : null}
            registration={register('email', { required: true })}
          />

          <AuthField
            type={showPassword ? 'text' : 'password'}
            placeholder={t('auth:Password')}
            icon={<Lock size={16} />}
            error={errors.password ? t('auth:password_min_length') : null}
            registration={register('password', { required: true })}
            endAdornment={
              <button
                type="button"
                aria-label={showPassword ? t('auth:hide_password') : t('auth:show_password')}
                onClick={() => setShowPassword(!showPassword)}
                onMouseDown={(e) => e.preventDefault()}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <AuthField
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder={t('auth:confirm_password')}
            icon={<Lock size={16} />}
            error={errors.confirmPassword ? t('auth:passwords_not_match') : null}
            registration={register('confirmPassword', { required: true })}
            endAdornment={
              <button
                type="button"
                aria-label={showConfirmPassword ? t('auth:hide_password') : t('auth:show_password')}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                onMouseDown={(e) => e.preventDefault()}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <button
            type="submit"
            data-testid="signup-btn"
            className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_hsl(var(--primary)/0.35)] hover:shadow-[0_6px_20px_0_hsl(var(--primary)/0.45)] mt-1"
          >
            {t('auth:create_account')}
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          {t('auth:already_have_account')}{' '}
          <RouterLink
            to="/login"
            className="font-semibold text-foreground hover:underline no-underline transition-colors"
          >
            {t('auth:Login')}
          </RouterLink>
        </p>

      </form>
    </AuthCard>
  </AuthPageWrapper>
);
```

---

## STEP 7 — Rewrite `libs/auth/src/pages/ForgotPassword.tsx`

**Remove:**
- `Box, TextField, Button, IconButton, InputAdornment, Typography, Stack, Alert` from `@mui/material`
- `Language, LightMode, DarkMode, Email as EmailIcon, ArrowBack` from `@mui/icons-material`
- `styled, alpha` from `@mui/material/styles`
- `LinkBehavior` forwardRef
- All `styled(...)` component declarations

**Keep exactly as-is:**
- `useState` from `react`
- `useForm` from `react-hook-form`
- `RouterLink` from `react-router-dom`
- `useTranslation` from `react-i18next`
- `zodResolver`, `z`
- `useSwitchTheme` from `@item-bank/ui`
- `forgotPasswordSchema` const
- All logic: `submitted` state, form registration, `resetPassword` handler

**Add:**
```tsx
import { Mail, ArrowLeft } from 'lucide-react';
import AuthPageWrapper from '../components/AuthPageWrapper';
import AuthCard from '../components/AuthCard';
import AuthField from '../components/AuthField';
```

**Remove `useSwitchTheme`** — handled by `AuthPageWrapper`.

**New JSX return:**

```tsx
return (
  <AuthPageWrapper>
    <AuthCard>
      <form onSubmit={resetPassword} className="flex flex-col items-center gap-6 w-full">

        <img
          className="h-20 object-contain"
          src="/images/york-press.png"
          alt="York Press logo"
        />

        <h1 className="text-[1.75rem] font-bold text-foreground text-center">
          {t('forgot_password_title')}
        </h1>

        <p className="text-sm text-muted-foreground text-center px-4 leading-relaxed">
          {t('forgot_password_description')}
        </p>

        <div className="w-full flex flex-col gap-3">

          {/* Success alert — shown after submit */}
          {submitted && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t('reset_link_sent')}
            </div>
          )}

          <AuthField
            type="email"
            placeholder={t('Email')}
            icon={<Mail size={16} />}
            error={errors.email ? t('invalid_email') : null}
            registration={register('email', { required: true })}
          />

          <button
            type="submit"
            data-testid="reset-btn"
            className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_14px_0_hsl(var(--primary)/0.35)] mt-1"
          >
            {t('send_reset_link')}
          </button>
        </div>

        {/* Back to login link */}
        <RouterLink
          to="/login"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground no-underline transition-colors group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5 rtl:rotate-180" />
          {t('back_to_login')}
        </RouterLink>

      </form>
    </AuthCard>
  </AuthPageWrapper>
);
```

---

## STEP 8 — Fix `libs/auth/src/guards/ProtectedRoute.tsx`

This is a one-line change. The file currently is:

```tsx
import { Navigate, Outlet } from "react-router-dom"
import { Box } from "@mui/material"
import { NavBar } from "@item-bank/ui";

const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  if(!token) return <Navigate replace to={'/login'} />
  return (
    <Box className="w-full min-w-0 overflow-hidden">
      <NavBar />
      <Outlet />
    </Box>
  )
}

export default ProtectedRoute
```

Replace the entire file with:

```tsx
import { Navigate, Outlet } from "react-router-dom"
import { NavBar } from "@item-bank/ui";

const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  if(!token) return <Navigate replace to={'/login'} />
  return (
    <div className="w-full min-w-0 overflow-hidden">
      <NavBar />
      <Outlet />
    </div>
  )
}

export default ProtectedRoute
```

---

## STEP 9 — Update `libs/auth/src/index.ts`

Open `libs/auth/src/index.ts`. Check if it needs updating after the new component files are added.
The new shared components (`AuthPageWrapper`, `AuthCard`, `AuthField`) are internal — do NOT export them from the lib's public API. They are for internal use only.

---

## VERIFICATION — Run these in order, fix any errors before the next step

### 1. TypeScript check
```bash
npx nx typecheck item-bank
```
Expected: **0 errors**

### 2. Grep check — zero MUI references must remain
```bash
grep -rn "from '@mui" libs/auth/src/
grep -rn "from '@mui/material/styles'" libs/auth/src/
grep -rn "styled(" libs/auth/src/ --include="*.tsx"
```
Expected: **0 results** in all three commands

### 3. Browser verification checklist

Navigate to `/login`, `/signup`, `/forgot-password`.

For each page check:

**Light mode:**
- [ ] Page background is a soft indigo-to-slate gradient
- [ ] Card is white/near-white, rounded corners, subtle shadow
- [ ] Input fields have left icon, correct placeholder color
- [ ] Submit button is indigo with shadow
- [ ] All text readable

**Dark mode (add `.dark` class to `<html>` or use the toggle):**
- [ ] Page background is dark slate gradient
- [ ] Card is dark slate, border visible
- [ ] Input fields dark background, placeholder visible
- [ ] Submit button is slightly lighter indigo

**RTL (switch language to Arabic):**
- [ ] `dir="rtl"` on `<html>` element
- [ ] Utility buttons are top-LEFT (`end-5` = left in RTL)
- [ ] Input icons on the RIGHT side of each field
- [ ] Password show/hide button on the LEFT
- [ ] Footer links row is reversed on Login page
- [ ] "Back to login" arrow rotates 180°

**Form validation:**
- [ ] Submit empty Login form → email error + password error appear below fields
- [ ] Submit empty SignUp → all 4 fields show errors
- [ ] Mismatched passwords in SignUp → confirmPassword shows error
- [ ] Submit empty ForgotPassword → email error appears

**Functionality:**
- [ ] Language toggle: EN → AR → EN cycles correctly, `localStorage('lang')` updated
- [ ] Theme toggle: light → dark → light cycles correctly
- [ ] Login with any value → navigates to `/home`
- [ ] SignUp with valid data → navigates to `/home`
- [ ] ForgotPassword submit → green success alert appears
- [ ] ProtectedRoute without `localStorage('token')` → redirects to `/login`
- [ ] ProtectedRoute with token → NavBar renders, Outlet renders

### 4. Commit
```bash
git add libs/auth/ apps/item-bank/src/styles.css
git commit -m "Phase 2: migrate libs/auth to Tailwind (Login, SignUp, ForgotPassword, ProtectedRoute)"
git push origin main
```
