---
name: file-naming-conventions
description: File naming conventions for the Monohroshi mobile (Expo) and backend (Express) codebases. Use whenever creating new files, renaming files, or reviewing file names in either the mobile/ or backend/ directories.
---

# File Naming Conventions

## Mobile (`mobile/`)

| Directory | Convention | Example |
|---|---|---|
| `src/components/**` | **PascalCase** matching export name | `SearchBar.tsx`, `AccountTypePickerModal.tsx` |
| `src/hooks/` | **camelCase** with `use` prefix | `useAuthListener.ts` |
| `src/stores/` | **camelCase** with `use` prefix | `useSetupStore.ts` |
| `src/constants/` | **kebab-case** | `account-types.ts` |
| `src/services/` | **kebab-case** | `query-client.ts` |
| `src/utils/` | **kebab-case** | `date-presets.ts` |
| `app/**` (route files) | **kebab-case** (Expo Router convention) | `account-setup.tsx`, `creating-plan.tsx` |

## Backend (`backend/`)

| Directory | Convention | Example |
|---|---|---|
| `src/modules/**` | **kebab-case** | `auth.controller.ts`, `check-authenticated.ts` |
| `src/shared/` | **kebab-case** | `constants.ts`, `http-status.ts` |
| `src/middlewares/` | **kebab-case** | `check-authenticated.ts` |
| `src/config/` | **kebab-case** | `env.ts`, `firebase.ts` |
