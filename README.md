# Item Bank

A full-featured educational question bank platform built as an **Nx monorepo** with **React 19** and **TypeScript**. It provides a rich authoring environment for educators to create, manage, and preview 20+ question types, with full support for **English/Arabic (RTL)** and **light/dark theming**.

---

## 🚧 Active Migration: MUI → shadcn/ui

This project is currently undergoing a full UI layer migration from **Material UI (MUI) v7** to **shadcn/ui + Tailwind CSS**. All business logic, routing, data fetching, forms, and i18n remain untouched — only the UI layer is being replaced.

| Area | From | To |
|---|---|---|
| Component library | `@mui/material` v7 | `shadcn/ui` |
| Icons | `@mui/icons-material` | `lucide-react` |
| Data grid | `material-react-table`, `@mui/x-data-grid` | TanStack Table (headless) |
| CSS-in-JS | `@emotion/react`, `@emotion/styled` | Removed entirely |
| RTL support | `@mui/stylis-plugin-rtl` + stylis | Tailwind `rtl:` variant |
| Theming | MUI `ThemeProvider` + `createTheme` | CSS variables + Tailwind config |

**Migration order:**
1. ✅ Setup — Tailwind config with RTL + dark mode, CSS variable tokens
2. 🔄 `libs/ui` — NavBar, Sidebar, ActionButton
3. ⏳ `libs/auth` — Login, SignUp, ForgotPassword
4. ⏳ `libs/profile` — Profile forms and sidebar
5. ⏳ `libs/questions/components` — Shell, Table, Modal, QuestionTypeTile
6. ⏳ `libs/questions/pages` — All 20 question editors and views

**What is NOT being changed:** `libs/questions/src/domain/`, IndexedDB layer, routing, i18next setup, translation files, react-hook-form + zod, Konva canvas, TinyMCE, MathLive, TanStack Query.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript 5.9 |
| Bundler | Vite 7 |
| Monorepo | Nx 22 |
| Routing | React Router v7 |
| Data Fetching | TanStack Query v5 |
| Forms & Validation | React Hook Form v7 + Zod v4 |
| UI Components | shadcn/ui + Tailwind CSS 3.4 |
| Icons | lucide-react |
| Rich Text | TinyMCE 8 |
| Canvas / Drawing | Konva 10 + react-konva |
| Math Input | MathLive |
| Tables | TanStack Table (headless) |
| Internationalization | i18next 25 + react-i18next |
| Local Storage | IndexedDB |
| Testing | Jest 30, Vitest 4, Playwright 1.58 |
| Linting / Formatting | ESLint 9 + Prettier 3 |

---

## Monorepo Structure

```
Item-Bank-Shadcn/
├── apps/
│   └── item-bank/                  ← Main application
│       ├── src/
│       │   ├── main.tsx            ← Entry point (QueryClient, i18n, IndexedDB init)
│       │   ├── app/
│       │   │   ├── App.tsx         ← Theme provider, RTL cache, BrowserRouter, all routes
│       │   │   └── pages/          ← Home, Profile (General, ChangePassword)
│       │   └── db/                 ← IndexedDB layer (useIndexedDbQuery, useIndexedDbMutation)
│       └── tailwind.config.js
│
├── libs/
│   ├── ui/                         ← Shared UI primitives
│   │   └── src/components/
│   │       ├── NavBar.tsx          ← Top navigation bar
│   │       ├── Sidebar.tsx         ← 280px fixed sidebar
│   │       ├── ActionButton.tsx
│   │       └── hooks/theme.ts      ← ThemeModeContext, useSwitchTheme, useThemeMode
│   │
│   ├── auth/                       ← Authentication
│   │   └── src/
│   │       ├── pages/              ← Login, SignUp, ForgotPassword
│   │       └── guards/             ← ProtectedRoute, GuestRoute, NotFoundRedirect
│   │
│   ├── questions/                  ← Question editors & student previews
│   │   └── src/
│   │       ├── components/         ← QuestionEditorShell, QuestionViewShell,
│   │       │                         QuestionsTable, AddQuestionModal, ...
│   │       ├── domain/             ← Types, DTOs, mappers, factory (pure logic)
│   │       └── pages/              ← One folder per question type (editor + view)
│   │
│   ├── profile/                    ← Profile sidebar + edit forms
│   └── i18n/                       ← i18next configuration
│
├── public/
│   └── locales/
│       ├── en/                     ← common.json, auth.json, questions.json
│       └── ar/                     ← Same keys in Arabic
│
├── nx.json
├── tsconfig.base.json
└── package.json
```

---

## Path Aliases

```typescript
@item-bank/auth       → libs/auth/src/index.ts
@item-bank/questions  → libs/questions/src/index.ts
@item-bank/i18n       → libs/i18n/src/index.ts
@item-bank/ui         → libs/ui/src/index.ts
@item-bank/profile    → libs/profile/src/index.ts
```

---

## Question Types

The platform supports **20 question types**, each with a dedicated **editor** and **student-facing preview**:

| # | Type | Key Capability |
|---|---|---|
| 1 | True / False | Simple binary answer |
| 2 | Multiple Choice | Single or multi-select with partial credit |
| 3 | Short Answer | Free-text with model answer |
| 4 | Essay | TinyMCE rich text response |
| 5 | Fill in the Blanks | Inline blank fields in text |
| 6 | Fill in the Blanks (Image) | Blanks overlaid on an image |
| 7 | Select Correct Word | Click the correct word in a passage |
| 8 | Highlight Correct Word | Highlight words in a passage |
| 9 | Drag & Drop (Text) | Drag text tokens into drop zones |
| 10 | Drag & Drop (Image) | Drag images into labeled zones |
| 11 | Text Sequencing | Order text items |
| 12 | Image Sequencing | Order images |
| 13 | Text Classification | Sort text into categories |
| 14 | Image Classification | Sort images into categories |
| 15 | Matching | Match left items to right items |
| 16 | Numerical | Numeric answer with unit handling |
| 17 | Multiple Hotspots | Click correct regions on an image (Konva canvas) |
| 18 | Free-Hand Drawing | Open canvas drawing response (Konva) |
| 19 | Record Audio | Record and playback audio responses |
| 20 | (Extensible) | Factory pattern supports adding new types |

---

## Key Features

**Authoring**
- Full WYSIWYG question editor per type
- Rich text via TinyMCE, math input via MathLive, canvas via Konva
- Configurable scoring, feedback, and validation per question

**Question Management**
- Sortable, paginated table (10 / 20 / 50 rows)
- Status lifecycle: Draft → In Review → Published
- Per-row actions: Preview, Edit, Delete (with confirmation)
- Color-coded type and status chips

**Internationalization**
- English (LTR) and Arabic (RTL) fully supported
- Language stored in `localStorage('lang')`, toggleable from the navbar
- Translation namespaces: `common`, `auth`, `questions` (420+ keys)

**Theming**
- Light and dark mode with `ThemeModeContext`
- Theme stored in `localStorage('theme-mode')`, toggleable from the navbar
- Brand colors: Primary `#00509D` (light) / `#5D8CE8` (dark)

**Routing & Auth**
- `ProtectedRoute` / `GuestRoute` guards
- Mock auth during development (token stored in `localStorage('token')`)

**Data Layer**
- TanStack Query for server state caching
- IndexedDB for offline-capable local storage

---

## Application Routes

```
/login                    → Login (Guest only)
/signup                   → Sign Up (Guest only)
/forgot-password          → Forgot Password (Guest only)

/home                     → Dashboard (Protected)
/profile                  → Profile layout (Protected)
  /profile/edit           → General profile settings
  /profile/change-password → Change password form

*                         → Redirect (NotFoundRedirect)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/AbedAmouneh/Item-Bank-Shadcn.git
cd Item-Bank-Shadcn
npm install
```

### Dev Commands

```bash
npm start        # Serve app at http://localhost:4200
npm run build    # Production build
npm test         # Run unit tests
```

### Using Nx directly

```bash
npx nx serve item-bank          # Dev server
npx nx build item-bank          # Build
npx nx test item-bank           # Unit tests
npx nx lint item-bank           # Lint
npx nx graph                    # Visualise dependency graph
```

---

## Theme & RTL Architecture

**Dark Mode** — toggled by adding/removing the `dark` class on the root element. CSS variables defined in `:root` (light) and `.dark` (dark).

**RTL** — when Arabic is selected, `dir="rtl"` is set on the root element. Tailwind's `rtl:` variant handles directional class flipping (e.g. `rtl:flex-row-reverse`, `rtl:text-right`). The `rtl: true` flag is enabled in `tailwind.config.js`.

**Color tokens** used across the app:

```
surface.default / subtle / card / input
border.subtle / card / field
text.muted / faint
auth.pageBackground / cardBackground / fieldBackground
sidebar.background
questionView.background / border / questionTextColor
table.headColor / rowBorder / headBorder
editor.asteriskColor / wrapperBackground
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request on [GitHub](https://github.com/AbedAmouneh/Item-Bank-Shadcn)

---

## License

Private — all rights reserved.
