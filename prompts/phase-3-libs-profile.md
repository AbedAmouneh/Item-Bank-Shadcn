# Phase 3 — libs/profile Migration
## MUI → Tailwind CSS

---

## CONTEXT — READ THIS FIRST

You are working in the Item Bank Nx monorepo. The design system foundation is already complete.

**Scope of this phase**: 1 file
- `libs/profile/src/components/ProfileSidebar.tsx`

**Dependencies that are already migrated:**
- `Sidebar` component from `@item-bank/ui` — already a pure Tailwind component
- `SidebarItem` icon type: `ComponentType<{ className?: string; size?: number }>` — lucide-compatible

**The MUI icon components currently used in this file:**
- `PersonOutlineIcon` from `@mui/icons-material/PersonOutline`
- `LockIcon` from `@mui/icons-material/Lock`
- `FolderIcon` from `@mui/icons-material/Folder`
- `EditNoteIcon` from `@mui/icons-material/EditNote`

**The MUI structural components used:**
- `Avatar` from `@mui/material`
- `Box` from `@mui/material`
- `Typography` from `@mui/material`
- `styled` from `@mui/material/styles`
- `StyledAvatar = styled(Avatar)(...)` — custom styled Avatar

**DO NOT TOUCH:**
- `useTranslation`, `useLocation`, `useNavigate` — leave exactly as-is
- `Outlet` from react-router-dom — leave exactly as-is
- `Sidebar, type SidebarItem` from `@item-bank/ui` — leave exactly as-is
- The `items` array — leave the structure, just swap the icon references
- `selectedId` logic — leave exactly as-is

---

## STEP 1 — Add missing CSS token (if not already present)

Open `apps/item-bank/src/styles.css`. Check if `--avatar-background` exists.

If missing, add:
```css
/* Inside :root { } */
--avatar-background: 239 68% 90%;

/* Inside .dark { } */
--avatar-background: 239 50% 25%;
```

---

## STEP 2 — Rewrite `libs/profile/src/components/ProfileSidebar.tsx`

Here is the complete replacement file. Write this exactly:

```tsx
// libs/profile/src/components/ProfileSidebar.tsx
import { UserCircle, Lock, Folder, FileEdit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, type SidebarItem } from '@item-bank/ui';

export default function ProfileSidebar() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const selectedId = location.pathname.split('/')[2] || 'edit';
  const navigate = useNavigate();

  const items: SidebarItem[] = [
    {
      id: 'edit',
      label: t('profile.edit_profile'),
      icon: UserCircle,
      selected: selectedId === 'edit',
      onClick: () => navigate('/profile/edit'),
    },
    {
      id: 'change-password',
      label: t('profile.change_password'),
      icon: Lock,
      selected: selectedId === 'change-password',
      onClick: () => navigate('/profile/change-password'),
    },
    {
      id: 'file-manager',
      label: t('profile.file_manager'),
      icon: Folder,
      selected: selectedId === 'file-manager',
      onClick: () => navigate('/profile/file-manager'),
    },
    {
      id: 'my-annotations',
      label: t('profile.my_annotations'),
      icon: FileEdit,
      selected: selectedId === 'my-annotations',
      onClick: () => navigate('/profile/my-annotations'),
    },
  ];

  const header = (
    <div className="flex items-center p-4 gap-4">
      {/* Avatar circle — replaces MUI Avatar + StyledAvatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'hsl(var(--avatar-background))' }}
      >
        <UserCircle className="w-7 h-7 text-primary" />
      </div>

      {/* User info */}
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

  return <Sidebar header={header} items={items}><Outlet /></Sidebar>;
}
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
grep -rn "from '@mui" libs/profile/src/
```
Expected: **0 results**

### 3. Browser checklist

Navigate to `/profile/edit` (requires being logged in).

**Light mode:**
- [ ] Sidebar renders on the left (or right in RTL)
- [ ] Avatar circle is a soft indigo/purple circle with a UserCircle icon inside
- [ ] Username placeholder and role text render below/beside avatar
- [ ] All 4 nav items render with lucide icons and labels

**Dark mode:**
- [ ] Avatar circle color shifts to dark indigo
- [ ] Text colors correct (foreground / muted-foreground)
- [ ] Selected item shows primary background

**RTL (Arabic):**
- [ ] Sidebar border flips to left side (handled by Sidebar component)
- [ ] Avatar + text row reads right-to-left
- [ ] Selected item highlighting still correct

**Navigation:**
- [ ] Clicking each item changes `selectedId` and highlights the correct item
- [ ] URL changes correctly on each click
- [ ] `<Outlet />` renders the correct sub-page

### 4. Commit
```bash
git add libs/profile/ apps/item-bank/src/styles.css
git commit -m "Phase 3: migrate libs/profile to Tailwind (ProfileSidebar)"
git push origin main
```
