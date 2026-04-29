# Design System Prompt

Use the following design system when building this web app. Apply it consistently across all pages and components.

---

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Icons: Lucide React
- Forms: react-hook-form

---

## Tailwind Config

Extend the default Tailwind theme with a custom `brand` color scale in `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      brand: {
        50:  '#eef3fb',
        100: '#d5e0f4',
        200: '#abbfe9',
        500: '#3a6abf',
        600: '#1F4923',
        700: '#1a3d7c',
        900: '#122860',
      },
    },
  },
},
```

---

## Global CSS

Add these utility classes to `globals.css` under `@layer components`:

```css
@layer components {
  .btn-primary {
    @apply inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
  }
  .btn-secondary {
    @apply inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
  }
  .btn-ghost {
    @apply inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors;
  }
  .req {
    @apply text-red-500 ml-0.5;
  }
}
```

---

## Layout

The app uses a **fixed dark sidebar + light main content** pattern.

```
┌──────────────┬────────────────────────────────┐
│  Sidebar     │  Main Content                  │
│  w-60        │  ml-60                         │
│  bg-black    │  bg-gray-50 or white           │
│  h-screen    │  flex flex-col                 │
│  fixed       │                                │
└──────────────┴────────────────────────────────┘
```

**Sidebar:**
- `fixed left-0 top-0 h-screen w-60 bg-black flex flex-col`
- Logo at top, nav links in the middle, user info at bottom
- Nav items: `flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-white/10 hover:text-white transition-colors`
- Active nav item: `bg-white/10 text-white`
- Collapsible nav groups with nested sub-links

**Main content wrapper:**
- `ml-60 flex flex-col min-h-screen`
- Page header: `px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between`
- Page body: `flex-1 px-6 py-6`

---

## Color Usage

| Purpose | Class |
|---|---|
| Primary action button | `bg-brand-600 hover:bg-brand-700` |
| Active/selected state | `bg-brand-600 text-white` |
| Subtle brand background | `bg-brand-50` |
| Body text | `text-gray-900` |
| Secondary text | `text-gray-500` |
| Muted/meta text | `text-gray-400` |
| Borders | `border-gray-200` or `border-gray-300` |
| Page background | `bg-gray-50` |
| Card/panel background | `bg-white` |
| Error/destructive | `text-red-600`, `bg-red-50`, `border-red-300` |
| Success | `bg-emerald-600 hover:bg-emerald-700 text-white` |
| Warning | `text-amber-600`, `bg-amber-50` |

---

## Typography

No custom font — use the system default (Tailwind's `font-sans`).

| Use | Classes |
|---|---|
| Page title | `text-xl font-bold text-gray-900` |
| Section title | `text-base font-semibold text-gray-900` |
| Body / table cells | `text-sm text-gray-700` |
| Labels | `text-sm font-medium text-gray-700` |
| Meta / timestamps | `text-xs text-gray-400` |
| Table headers | `text-xs font-semibold text-gray-500 uppercase tracking-wide` |

---

## Cards & Panels

```
rounded-xl border border-gray-200 bg-white shadow-sm
```

Inner padding: `p-5` or `px-6 py-5`.

---

## Modals & Dialogs

- Backdrop: `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center`
- Panel: `relative bg-white rounded-xl shadow-2xl w-full max-w-lg` (adjust max-w as needed)
- Sticky header: `sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 px-6 py-4`
- Sticky footer: `sticky bottom-0 border-t border-gray-100 bg-white px-6 py-4 flex justify-end gap-3`
- Close button: `rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600`
- z-index stacking: base modal `z-50`, nested modal `z-60`

---

## Tables

- Container: `overflow-x-auto` with `max-h-[calc(100vh-300px)] overflow-y-auto`
- Table: `w-full table-fixed text-sm`
- Header row: `bg-[#F5F9FF] border-b border-[#D6E4FF]`
- Header cell: `px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide`
- Body rows: `divide-y divide-gray-100 hover:bg-gray-50 transition-colors`
- Body cell: `px-4 py-3 text-sm text-gray-700`
- Sticky header: `sticky top-0 z-10`
- Pagination at the bottom of the table container

---

## Forms

**Input field:**
```
rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900
placeholder:text-gray-400
focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
disabled:bg-gray-100 disabled:text-gray-500
w-full
```

**Label:**
```
block text-sm font-medium text-gray-700 mb-1
```

**Required marker:** `<span class="req">*</span>` (red asterisk via `.req` utility)

**Select / dropdown:** same classes as input field.

**Form section heading:** `text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200`

---

## Status Badges

```
inline-flex items-center rounded px-2 py-0.5 text-xs font-medium
```

Color pairs (background + text) vary by status — define a `STATUS_STYLES` lookup object and apply dynamically.

---

## Login Page

Centered card on a light gray background:

- Page: `min-h-screen bg-[#ECEEF3] flex items-center justify-center`
- Card: `w-full max-w-[400px] bg-white rounded-2xl shadow-md px-8 py-10`

Card contents top to bottom:
1. Logo — centered, `max-h-[60px]`, from `/public/logo.png`
2. App title — `text-xl font-bold text-gray-900 text-center mt-4`
3. Subtitle — `text-sm text-gray-500 text-center mt-1`
4. Label: `Pritchard email address`
5. Email input — full width, `placeholder="you@pritchards.com"`
6. Continue button — full width, `bg-[#6B7FA3] hover:bg-[#5A6E93] text-white`, disabled until valid email
7. Error message — `text-sm text-red-600 text-center mt-2`

Error message for access denied (both "not found" and "access_granted = false" cases — never reveal which):
```
Access denied. Reach out to hill.mugisha@pritchards.com to get access.
```
Render the email as a `mailto:` link.

---

## Spacing & Radius Reference

| Token | Value | Common use |
|---|---|---|
| `rounded-md` | 6px | Inputs, buttons, dropdowns |
| `rounded-lg` | 8px | Filter chips, small cards |
| `rounded-xl` | 12px | Modals, large cards |
| `rounded-2xl` | 16px | Login card |
| `gap-1.5` / `gap-2` | 6–8px | Tight icon+label pairs |
| `gap-3` / `gap-4` | 12–16px | Form fields, button groups |
| `px-4 py-2` | — | Standard button padding |
| `px-6 py-4` | — | Modal / page header padding |
| `px-6 py-5` | — | Card body padding |

---

## Icons

Use **Lucide React** for all icons. Import individually:

```ts
import { FileText, Download, Truck, X, ChevronDown } from 'lucide-react'
```

Standard sizes: `size={16}` (inline), `size={18}` (buttons), `size={20}` (section icons).
