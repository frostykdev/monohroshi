---
name: mobile-ui-conventions
description: Coding conventions for the Monohroshi Expo mobile app. Covers imports, styling, colors, i18n, Typography, Button, ScreenHeader, icons, forms, dates, and reusable component extraction. Use whenever writing or reviewing any mobile/*.tsx file, creating screens, components, hooks, or stores in the mobile app.
---

# Mobile UI Conventions

## 1. Path Aliases — Never Use Relative `../` Paths

| Alias | Resolves to |
|---|---|
| `@components/*` | `src/components/*` |
| `@constants/*` | `src/constants/*` |
| `@stores/*` | `src/stores/*` |
| `@services/*` | `src/services/*` |
| `@hooks/*` | `src/hooks/*` |
| `@utils/*` | `src/utils/*` |
| `@i18n` | `src/i18n/index.ts` |

Same-folder sibling imports may use `./`.

## 2. Styles — Always `StyleSheet.create`

```tsx
// ❌ BAD
<View style={{ flex: 1, padding: 16 }}>

// ✅ GOOD
const s = StyleSheet.create({ container: { flex: 1, padding: 16 } });
<View style={s.container}>
```

Dynamic styles from `pressed` state are the only exception.

## 3. Colors — Always from `colors` Constant

All colors come from `mobile/src/constants/colors.ts`. Never use raw hex/rgba.

```tsx
import { colors } from "@constants/colors";
style={{ color: colors.textPrimary, backgroundColor: colors.background }}
```

## 4. i18n — All User-Visible Text Must Be Translated

Add keys to both `en.json` and `uk.json`.

```tsx
// ❌ BAD
<Text>Розпочати</Text>

// ✅ GOOD
<Typography variant="button" i18nKey="onboarding.welcome.getStarted" />
```

Never put `t` in hook dependency arrays — it's stable. Use `i18n.language` if the hook must react to language changes.

## 5. Typography — Use for All Text

`@components/ui/Typography` — never use raw `<Text>` for user-visible content.

| Variant | Use for |
|---|---|
| `h1` | Screen titles |
| `h2` | Section headings |
| `h3` | Sub-headings |
| `body` | Default body text |
| `bodySmall` | Secondary/supporting text |
| `label` | Form labels |
| `caption` | Metadata, timestamps, hints |
| `button` / `buttonSmall` | Button labels |

Props: `i18nKey`, `color` (AppColor token), `children` (dynamic content), `style`.

## 6. Button — Use for All Tappable Actions

`@components/ui/Button` — never build custom `Pressable` + `Text` combos for standard actions.

| Variant | Use for |
|---|---|
| `primary` | Main CTA — accent background |
| `secondary` | Secondary action — elevated bg |
| `ghost` | Subtle — no background |
| `outline` | Bordered — transparent bg |
| `danger` | Destructive — red background |

Props: `variant`, `size` (`md` 58pt / `sm` 44pt), `i18nKey`, `disabled`, `loading`.

## 7. ScreenHeader — Every Screen's Top Bar

`@components/ui/ScreenHeader` — never build a custom header row.

- **Stack screens**: `chevron-back` on left, `onLeftPress={() => router.back()}`
- **Modal screens**: `close` (×) on left
- Apply `paddingTop: insets.top` on the screen's root `View`, not on the header
- If no right action, omit `right`/`onRightPress` — header auto-centers the title

```tsx
<ScreenHeader
  title={t("accounts.title")}
  left={<Ionicons name="chevron-back" size={24} color={colors.textPrimary} />}
  onLeftPress={() => router.back()}
  right={<Ionicons name="add" size={26} color={colors.textPrimary} />}
  onRightPress={handleAdd}
/>
```

## 8. Icons — Always `@expo/vector-icons`

Prefer `Ionicons`. Use `size` and `color` directly — never wrap in Typography.

```tsx
import { Ionicons } from "@expo/vector-icons";
<Ionicons name="search" size={18} color={colors.textTertiary} />
```

## 9. Forms — Formik + Yup

- `validateOnChange: false`, `validateOnBlur: false` — validate only on submit
- Show errors after first submit: `formik.submitCount > 0 && formik.errors.field`
- Clear error on type: call `formik.setFieldError("name", undefined)` in `onChangeText`
- Error UI: `<Typography variant="caption" color="error">` below input, no red border/tint
- All validation messages must be i18n keys

## 10. Dates — Use Luxon

```tsx
import { DateTime } from "luxon";
const month = DateTime.now().toFormat("yyyy-MM");
```

Never use native `Date` for app/business logic.

## 11. Extract Reusable Components

If a UI element is used in more than one screen, extract it to `src/components/`.

| Component type | Location |
|---|---|
| Generic UI (sheets, pickers, buttons) | `src/components/ui/` |
| Transaction-specific | `src/components/transactions/` |
| Category-specific | `src/components/categories/` |

Check `mobile/src/components/ui/` before building a new primitive. Local one-off components (used in exactly one screen) can stay inline.

**Existing reusable components:** `DatePickerSheet`, `FabAddButton`, `AnimatedBalance`, `ScreenHeader`, `Typography`, `Button`, `SearchBar`, `SegmentedControl`, `Skeleton`, `Dropdown`.
