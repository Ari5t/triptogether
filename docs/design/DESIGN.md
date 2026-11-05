# TripTogether — DESIGN.md

Single source of truth for implementing the TripTogether UI in Next.js + Tailwind CSS 4.3 + shadcn/ui.
Source: the TripTogether design canvas (design-system boards `01 · Концепція та колір`, `02 · Типографіка`, `03 · Основи та іконки`, `04 · Компоненти`, and the screen boards) and the exported `globals.css` token file.

Conventions in this document:
- All px values are CSS px at 1× scale.
- `—` means "not defined in the design"; every such item is also listed in [§11 Gaps](#11-gaps-and-open-questions).
- Values marked **(export)** come from the token export (`globals.css`), not from a board. They were derived for dark mode and have been contrast-checked, but no board shows them.
- Values marked **(off-scale)** are used in the mockups but are not on the documented spacing/radius/type scale. Implement them as drawn unless §11 is resolved otherwise.

---

## 1. Design principles

1. **Field notebook.** Warm off-white paper (`#FAFAF7`), pure-white working surfaces, precise typography. References: Linear (density), Things 3 (calm), hiking maps (precision).
2. **The background stays quiet; people are the colour.** The only saturated colours on a working screen are participant colours (avatars, live cursors, selection rings) and the next useful action.
3. **Green is an accent with a purpose.** Pine green (`primary-600 #2C6248`) is for primary actions, active/selected states and brand moments only.
4. **Borders, not shadows.** Cards, rows and panels use a 1 px border. Shadows exist only for things that sit above the page layer (menus, popovers, toasts, modals, a stop being dragged).
5. **Hierarchy through type, not decoration.** Manrope 700 for headings, Inter for everything else, JetBrains Mono for money and codes. No icons beside headings.
6. **A working tool is dense; the landing page breathes.** The workspace uses 12–16 px internal padding and 8 px gaps between stops. The landing page uses 72–96 px section padding.
7. **Shape separates systems.** People = circles (avatars, presence dots) and arrow cursors. Days = rounded squares with a number (day markers, map pins).
8. **Ukrainian first.** Default copy is Ukrainian, which runs 15–25% longer than English. Size layouts for Ukrainian; never truncate mid-word.

### Do / Don't

| Do | Don't |
|---|---|
| Solid fills from the token palette | Gradients of any kind (backgrounds, buttons, text) |
| Opaque white surfaces with a 1 px `border` | Glassmorphism, backdrop blur, translucent panels (the one exception is the 80–82% white caption chip on photo placeholders and the map attribution) |
| Lucide line icons, 1.5 px stroke, in `text-secondary` / `primary` / `error` | Emoji as icons; multi-coloured or randomly coloured icons; an icon next to every heading |
| One level of containment: a card on a surface, or a white UI element on a `sunken` tile | Cards inside cards inside cards |
| Shadows only on overlays and the dragged stop | A shadow on every card, row or button |
| Green on primary buttons, active tab/nav, selected states, focus ring, the logo tile | Green page backgrounds, green section bands, green headings, green body text |
| Real-looking landscape photography, used sparingly, or a labelled placeholder until one exists | 3D illustrations, floating abstract shapes, glowing blobs, neon, stock "happy travellers" |
| Short, specific, human copy ("Плануйте подорож разом, а не в п’яти різних чатах.") | Marketing clichés ("Revolutionize…", "Seamless experience") |
| One clear focal point per screen | Equal visual weight for every element |
| Spacing from the 4 px scale | Arbitrary spacing |

---

## 2. Color tokens

Token names below are the design-system names. Their Tailwind 4 utility names are in §2.10.

### 2.1 Brand / primary scale (fixed: the same hex in light and dark)

| Token | Hex | On white | Used for |
|---|---|---|---|
| `primary-50` | `#F1F6F3` | 1.09:1 | Selected row/list item bg, active workspace nav bg, ghost-button hover bg, drop-zone bg, @mention bg |
| `primary-100` | `#DFEBE4` | 1.23:1 | Focus halo on inputs/select/radio cards (3 px), date-range band, poll option fill (own vote), own chat bubble, owner badge bg, ghost-button pressed bg |
| `primary-200` | `#BFD6C8` | 1.54:1 | "You owe" settlement row border, toast action text, dark-mode `primary-ink` |
| `primary-300` | `#94BAA5` | 2.14:1 | Toast success icon, spacing-scale bars (DS board), category bar segment 3 |
| `primary-400` | `#5F957A` | 3.46:1 | Drop indicator dashed border, category bar segment 2 |
| `primary-500` | `#3E795C` | 5.13:1 | — (documented on the scale only) |
| `primary-600` | `#2C6248` | 7.12:1 | **Primary**: primary buttons, active tab underline, focus outline, logo tile, count badges, links, category bar segment 1, day-1 colour |
| `primary-700` | `#234F3B` | 9.32:1 | Primary-button hover, link hover, ghost-button hover text |
| `primary-800` | `#1C3F30` | 11.65:1 | Primary-button pressed, ghost-button pressed text, text on `primary-50/100` (active nav, owner badge, date range) |
| `primary-900` | `#152F24` | 14.34:1 | Text in the own chat bubble, code-block bg (DS board) |

### 2.2 Surfaces

| Token | Light | Dark | Used for |
|---|---|---|---|
| `canvas` | `#FAFAF7` | `#0E1411` | App/page background, landing page, comment-thread aside, invite-modal footer |
| `surface` | `#FFFFFF` | `#151C18` | Cards, panels, top bar, itinerary list panel, chat column, tables |
| `surface-raised` | `#FFFFFF` | `#1C2520` | Popovers, menus, modal, dragged stop; dark: stop card (DS dark sample) |
| `sunken` | `#F2F4EF` | `#111814` **(export)** | Segmented-control track, stop note well, disabled/readonly input bg, avatar overflow "+N", module visual tiles (landing), poll option fill (others), balance bar track |

### 2.3 Borders

| Token | Light | Dark | Used for |
|---|---|---|---|
| `border` | `#E2E6E0` | `#2A3530` | All 1 px dividers, card and row borders, tab-list bottom rule, top-bar bottom border |
| `border-strong` | `#C9D0C8` | `#3A4740` **(export)** | Input, select and textarea borders; secondary-button border; dashed empty-state border; balance-bar centre tick; table header bottom rule (DS board) |

### 2.4 Text

| Token | Light | Dark | Used for |
|---|---|---|---|
| `text` | `#18211C` | `#E7ECE8` | Primary text, titles, values |
| `text-secondary` | `#47534C` | `#B4BFB8` | Meta lines, times, descriptions, icons (default), landing body copy |
| `text-muted` | `#5E6A63` | `#93A099` | Captions, Label style, inactive tabs/nav, timestamps, placeholder-level hints |
| `text-faint` | `#8A948E` | `#6B7871` **(export)** | Drag-grip icon, disabled text, out-of-month calendar days. **Never for readable text** (3.13:1) |

### 2.5 Semantic

| Token | Light | Dark | Used for |
|---|---|---|---|
| `success` | `#23784A` | `#5DBA86` | Online presence dot, positive balance bar, "live" dot |
| `success-subtle` | `#E8F3EC` | `#14271C` **(export)** | "Наживо" badge bg |
| `success-ink` | `#1D5A3A` | `#8FD3AC` **(export)** | "Наживо" badge text, positive balance amount |
| `warning` | `#9A5B00` | `#E0A345` | Idle presence ring |
| `warning-subtle` | `#FDF3E1` | `#2A2010` **(export)** | Warning banner bg (DS sample "Не всі проголосували") |
| `warning-ink` | `#7A4700` | `#F0C27A` **(export)** | Warning banner text |
| `error` | `#B83A2A` | `#EE7A68` | Destructive button, input error border, negative balance bar |
| `error-subtle` | `#FBECE9` | `#2E1714` **(export)** | Error banner bg (DS sample "Посилання протерміноване") |
| `error-ink` | `#9A2E21` | `#F5A496` **(export)** | Input error message, negative balance amount, destructive text button, destructive hover |
| `info` | `#2B5F8A` | `#72A7D6` | Map river label |
| `info-subtle` | `#E8F0F7` | `#13212D` **(export)** | Info banner bg ("Тарас змінює час цієї зупинки просто зараз") |
| `info-ink` | `#224E73` | `#A3C6E6` **(export)** | Info banner text |

Destructive pressed: `#7F2519` (light only; on the DS board, not tokenised).

### 2.6 Participant colours (avatars, live cursors, selection rings, cursor labels)

Assigned in join order. Text on a participant colour: white (light) / `#0E1411` (dark).

| Token | Light | Dark | Demo assignment |
|---|---|---|---|
| `p-blue` | `#2F67CF` | `#6F9BEA` | Оксана Мельник |
| `p-orange` | `#B54C15` | `#E3834F` | Тарас Бойко |
| `p-plum` | `#A13A85` | `#D27BBB` | Марта Левицька |
| `p-teal` | `#0F7A75` | `#4FB3AC` | Андрій Ковальчук |
| `p-ochre` | `#8F6400` | `#D1A23A` | Ірина (other trips) |
| `p-rose` | `#C23350` | `#EC7088` | Данило (other trips) |
| `p-indigo` | `#5B4FC4` | `#9A90F0` | Соломія (DS board only) |
| `p-olive` | `#5A7316` | `#9DB850` | Юрій (DS board only) |

Selection/edit ring: `0 0 0 3px` of the participant colour at 14% alpha (e.g. `rgba(181,76,21,0.14)` for `p-orange`) plus a 1 px solid border in the participant colour.

### 2.7 Day colours (day markers and map pins)

| Token | Light | Dark (export) | Text on it |
|---|---|---|---|
| `day-1` | `#2C6248` | `#5FAE85` | white (7.12:1) |
| `day-2` | `#A6402A` | `#E07A60` | white (6.20:1) |
| `day-3` | `#2E4A7D` | `#7E9BD0` | white (8.78:1) |
| `day-4` | `#7D5A00` | `#D1A23A` | white (6.30:1) |
| `day-5` | `#56636F` | `#9AA8B4` | white (6.16:1) |

Dark-mode day text: `#0E1411` (6.32–7.93:1, export).

### 2.8 Map palette

| Token | Light | Dark (export) | Used for |
|---|---|---|---|
| `map-land` | `#EEF1EA` | `#18201B` | Base land |
| `map-forest` | `#E1E8DC` | `#1D2820` | Forest areas |
| — | `#DCE5D6` | — | Ridge/mountain area (Чорногора) |
| — | `#CFD9C8`, `#D6DECF` | — | Contour lines, 1 px |
| `map-water` | `#C5D7E0` | `#24384A` | Rivers, 3–4 px |
| `map-road` | `#FFFFFF` | `#2F3A34` | Roads, 4–6 px, with `#D3D8CE` casing 7–9 px |
| Route | day colour | — | 2 px dashed, `stroke-dasharray: 5 4` (desktop), `6 5` (mobile) |

### 2.9 Contrast ratios (computed, WCAG 2.x)

AA requires 4.5:1 for normal text and 3:1 for large text and UI components. AAA requires 7:1.

**Light**

| Foreground | Background | Ratio | Level | Where |
|---|---|---|---|---|
| `text` #18211C | `surface` #FFFFFF | 16.49:1 | AAA | Body text, titles |
| `text` #18211C | `canvas` #FAFAF7 | 15.77:1 | AAA | Page text |
| `text` #18211C | `sunken` #F2F4EF | 14.89:1 | AAA | Note well, segmented active label |
| `text` #18211C | `primary-50` #F1F6F3 | 15.09:1 | AAA | Selected row, select item |
| `text-secondary` #47534C | `surface` #FFFFFF | 8.05:1 | AAA | Meta, times, descriptions |
| `text-secondary` #47534C | `canvas` #FAFAF7 | 7.70:1 | AAA | Landing body copy |
| `text-secondary` #47534C | `sunken` #F2F4EF | 7.27:1 | AAA | Avatar overflow "+2" |
| `text-secondary` #47534C | `primary-50` #F1F6F3 | 7.36:1 | AAA | Settlement "you" row subtitle |
| `text-muted` #5E6A63 | `surface` #FFFFFF | 5.65:1 | AA | Captions, labels, inactive tabs |
| `text-muted` #5E6A63 | `canvas` #FAFAF7 | 5.40:1 | AA | Labels, footer |
| `text-muted` #5E6A63 | `sunken` #F2F4EF | 5.10:1 | AA | Segmented inactive ("EN") |
| `text-muted` #5E6A63 | `primary-50` #F1F6F3 | 5.17:1 | AA | Selected expense row meta |
| white | `primary-600` #2C6248 | 7.12:1 | AAA | Primary button, count badge, logo |
| white | `primary-700` #234F3B | 9.32:1 | AAA | Primary hover |
| white | `primary-800` #1C3F30 | 11.65:1 | AAA | Primary pressed |
| `primary-600` #2C6248 | `surface` #FFFFFF | 7.12:1 | AAA | Ghost button, links |
| `primary-600` #2C6248 | `canvas` #FAFAF7 | 6.81:1 | AA | Landing eyebrow, links |
| `primary-600` #2C6248 | `primary-50` #F1F6F3 | 6.52:1 | AA | @mention chip |
| `primary-700` #234F3B | `primary-50` #F1F6F3 | 8.53:1 | AAA | Ghost hover |
| `primary-800` #1C3F30 | `primary-100` #DFEBE4 | 9.51:1 | AAA | Ghost pressed, owner badge, date range |
| `primary-800` #1C3F30 | `primary-50` #F1F6F3 | 10.66:1 | AAA | Active workspace nav item |
| `primary-900` #152F24 | `primary-100` #DFEBE4 | 11.71:1 | AAA | Own chat bubble |
| white | `error` #B83A2A | 5.71:1 | AA | Destructive button |
| white | `error-ink` #9A2E21 | 7.54:1 | AAA | Destructive hover |
| white | #7F2519 | 9.63:1 | AAA | Destructive pressed |
| `error-ink` #9A2E21 | `surface` #FFFFFF | 7.54:1 | AAA | Input error, negative balance |
| `error-ink` #9A2E21 | `canvas` #FAFAF7 | 7.21:1 | AAA | "Скинути посилання" |
| `success-ink` #1D5A3A | `surface` #FFFFFF | 8.15:1 | AAA | Positive balance |
| `success-ink` #1D5A3A | `success-subtle` #E8F3EC | 7.17:1 | AAA | "Наживо" badge |
| `warning-ink` #7A4700 | `warning-subtle` #FDF3E1 | 6.99:1 | AA | Warning banner |
| `error-ink` #9A2E21 | `error-subtle` #FBECE9 | 6.56:1 | AA | Error banner |
| `info-ink` #224E73 | `info-subtle` #E8F0F7 | 7.58:1 | AAA | Info banner |
| white | `text` #18211C | 16.49:1 | AAA | Toast |
| `primary-200` #BFD6C8 | `text` #18211C | 10.74:1 | AAA | Toast action |
| white | `p-blue` #2F67CF | 5.30:1 | AA | Avatar, cursor label |
| white | `p-orange` #B54C15 | 5.24:1 | AA | Avatar, cursor label, "Тарас редагує" |
| white | `p-plum` #A13A85 | 6.07:1 | AA | Avatar, cursor label |
| white | `p-teal` #0F7A75 | 5.17:1 | AA | Avatar |
| white | `p-ochre` #8F6400 | 5.26:1 | AA | Avatar |
| white | `p-rose` #C23350 | 5.41:1 | AA | Avatar |
| white | `p-indigo` #5B4FC4 | 6.25:1 | AA | Avatar |
| white | `p-olive` #5A7316 | 5.39:1 | AA | Avatar |
| `p-orange` #B54C15 | `surface` #FFFFFF | 5.24:1 | AA | Mobile "Тарас змінює час" (12/500) |
| white | `day-1…5` | 6.16–8.78:1 | AA / AAA | Day squares, pins (see §2.7) |
| `text` #18211C | `map-land` #EEF1EA | 14.46:1 | AAA | Map place labels |
| `text-secondary` #47534C | `map-land` #EEF1EA | 7.05:1 | AAA | Map secondary labels |
| `text-secondary` #47534C | #DCE5D6 | 6.22:1 | AA | "Говерла · 2061" |
| `info` #2B5F8A | `map-land` #EEF1EA | 5.92:1 | AA | River label "р. Прут" |
| `text-muted` #5E6A63 | white 80% on `map-land` (#FCFCFB) | 5.50:1 | AA | Map attribution |
| `text-secondary` #47534C | white 82% on cover #C9D5C5 (#F5F7F5) | 7.47:1 | AAA | Photo placeholder caption |
| `primary-100` #DFEBE4 | `primary-900` #152F24 | 11.71:1 | AAA | Code block (DS board) |
| `text-faint` #8A948E | `border` #E2E6E0 | 2.48:1 | Exempt (disabled) | Disabled button text |
| white | `p-teal` at 50% opacity on white | 2.11:1 | **FAIL** | Offline avatar (top bar). See §11 |

**Dark**

| Foreground | Background | Ratio | Level | Where |
|---|---|---|---|---|
| `text` #E7ECE8 | `canvas` #0E1411 | 15.58:1 | AAA | Page text |
| `text` #E7ECE8 | `surface` #151C18 | 14.50:1 | AAA | Card text |
| `text` #E7ECE8 | `surface-raised` #1C2520 | 13.16:1 | AAA | Stop card |
| `text-secondary` #B4BFB8 | `surface` #151C18 | 9.15:1 | AAA | Meta |
| `text-secondary` #B4BFB8 | `surface-raised` #1C2520 | 8.30:1 | AAA | Stop meta |
| `text-muted` #93A099 | `canvas` #0E1411 | 6.86:1 | AA | Labels |
| `text-muted` #93A099 | `surface` #151C18 | 6.38:1 | AA | Labels |
| #0E1411 | `primary` #6BB58E | 7.65:1 | AAA | Primary button, day square (dark sample) |
| #0E1411 | `primary-hover` #85C4A2 (export) | 9.24:1 | AAA | Primary hover |
| #0E1411 | `error` #EE7A68 | 6.76:1 | AA | Destructive button |
| `success-ink` #8FD3AC | `success-subtle` #14271C | 9.04:1 | AAA | (export) |
| `warning-ink` #F0C27A | `warning-subtle` #2A2010 | 9.68:1 | AAA | (export) |
| `error-ink` #F5A496 | `error-subtle` #2E1714 | 8.51:1 | AAA | (export) |
| `info-ink` #A3C6E6 | `info-subtle` #13212D | 9.18:1 | AAA | (export) |
| `primary-ink` #BFD6C8 | `primary-subtle` #16271E | 10.18:1 | AAA | (export) |
| #0E1411 | participant dark colours | 6.42–8.35:1 | AA / AAA | Avatar initials |

**Non-text contrast (WCAG 1.4.11, needs 3:1)**

| Element | Ratio vs white | Result |
|---|---|---|
| Focus outline `primary-600` | 7.12:1 | Pass |
| Online dot `success` | 5.44:1 | Pass |
| Edit/selection ring border (participant colour) | ≥ 5.17:1 | Pass |
| Drag grip `text-faint` | 3.13:1 | Pass |
| Input border `border-strong` #C9D0C8 | 1.57:1 | **Fail**. See §11 |
| Divider `border` #E2E6E0 | 1.26:1 | Decorative (exempt) |

### 2.10 Green: allowed vs not allowed

| Allowed | Not allowed |
|---|---|
| Primary button fill (one primary per region) | Page or section backgrounds |
| Active tab underline (2 px), active nav item (`primary-50` bg + `primary-800` text) | Headings or body text |
| Selected state (`primary-50/100` fills, `primary-600` border on selected radio card, poll option, day chip) | Decorative icons |
| Focus ring | Large fills behind content (except the 260 px brand swatch on the DS board) |
| Logo tile, count badges, links, ghost-button text | Status meaning: "success" uses `success`, not `primary` |
| Day 1 colour, category bar | Participant colour (no participant is green) |

### 2.11 CSS variables (shadcn/ui naming + custom). Paste into `app/globals.css`

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --radius: 8px;

  /* shadcn/ui */
  --background: #FAFAF7;            /* canvas */
  --foreground: #18211C;            /* text */
  --card: #FFFFFF;                  /* surface */
  --card-foreground: #18211C;
  --popover: #FFFFFF;               /* surface-raised */
  --popover-foreground: #18211C;
  --primary: #2C6248;
  --primary-foreground: #FFFFFF;
  --secondary: #FFFFFF;             /* secondary button = outline style, see §6.1 */
  --secondary-foreground: #18211C;
  --muted: #F2F4EF;                 /* sunken */
  --muted-foreground: #5E6A63;      /* text-muted */
  --accent: #F1F6F3;                /* primary-50: hover/selected items */
  --accent-foreground: #1C3F30;     /* primary-800 */
  --destructive: #B83A2A;
  --destructive-foreground: #FFFFFF;
  --border: #E2E6E0;
  --input: #C9D0C8;                 /* border-strong */
  --ring: #2C6248;

  /* custom: surfaces & text */
  --surface: #FFFFFF;
  --surface-raised: #FFFFFF;
  --sunken: #F2F4EF;
  --border-strong: #C9D0C8;
  --text-secondary: #47534C;
  --text-faint: #8A948E;

  /* custom: primary states */
  --primary-hover: #234F3B;
  --primary-pressed: #1C3F30;
  --primary-subtle: #F1F6F3;
  --primary-muted: #DFEBE4;
  --primary-ink: #1C3F30;
  --destructive-hover: #9A2E21;
  --destructive-pressed: #7F2519;

  /* custom: semantic */
  --success: #23784A;  --success-subtle: #E8F3EC;  --success-ink: #1D5A3A;
  --warning: #9A5B00;  --warning-subtle: #FDF3E1;  --warning-ink: #7A4700;
  --error:   #B83A2A;  --error-subtle:   #FBECE9;  --error-ink:   #9A2E21;
  --info:    #2B5F8A;  --info-subtle:    #E8F0F7;  --info-ink:    #224E73;

  /* custom: participants */
  --p-blue: #2F67CF;  --p-orange: #B54C15;  --p-plum: #A13A85;  --p-teal: #0F7A75;
  --p-ochre: #8F6400; --p-rose: #C23350;    --p-indigo: #5B4FC4; --p-olive: #5A7316;
  --p-foreground: #FFFFFF;

  /* custom: days */
  --day-1: #2C6248; --day-2: #A6402A; --day-3: #2E4A7D; --day-4: #7D5A00; --day-5: #56636F;
  --day-foreground: #FFFFFF;

  /* custom: map */
  --map-land: #EEF1EA; --map-forest: #E1E8DC; --map-water: #C5D7E0; --map-road: #FFFFFF;

  /* elevation */
  --elevation-xs: 0 1px 2px rgb(24 33 28 / 0.06), 0 0 0 1px rgb(24 33 28 / 0.06);
  --elevation-md: 0 4px 12px -2px rgb(24 33 28 / 0.10), 0 0 0 1px rgb(24 33 28 / 0.06);
  --elevation-lg: 0 20px 48px -12px rgb(24 33 28 / 0.24), 0 0 0 1px rgb(24 33 28 / 0.06);
  --scrim: rgb(21 47 36 / 0.42);
}

.dark {
  --background: #0E1411;
  --foreground: #E7ECE8;
  --card: #151C18;
  --card-foreground: #E7ECE8;
  --popover: #1C2520;
  --popover-foreground: #E7ECE8;
  --primary: #6BB58E;
  --primary-foreground: #0E1411;
  --secondary: #151C18;
  --secondary-foreground: #E7ECE8;
  --muted: #111814;                 /* export */
  --muted-foreground: #93A099;
  --accent: #16271E;                /* export */
  --accent-foreground: #BFD6C8;     /* export */
  --destructive: #EE7A68;
  --destructive-foreground: #0E1411;
  --border: #2A3530;
  --input: #3A4740;                 /* export */
  --ring: #6BB58E;

  --surface: #151C18;
  --surface-raised: #1C2520;
  --sunken: #111814;
  --border-strong: #3A4740;
  --text-secondary: #B4BFB8;
  --text-faint: #6B7871;

  --primary-hover: #85C4A2;         /* export */
  --primary-pressed: #9FD1B5;       /* export */
  --primary-subtle: #16271E;        /* export */
  --primary-muted: #1E3A2C;         /* export */
  --primary-ink: #BFD6C8;           /* export */
  --destructive-hover: #F5A496;     /* export */
  --destructive-pressed: #F5A496;   /* export; not designed, see §11 */

  --success: #5DBA86;  --success-subtle: #14271C;  --success-ink: #8FD3AC;
  --warning: #E0A345;  --warning-subtle: #2A2010;  --warning-ink: #F0C27A;
  --error:   #EE7A68;  --error-subtle:   #2E1714;  --error-ink:   #F5A496;
  --info:    #72A7D6;  --info-subtle:    #13212D;  --info-ink:    #A3C6E6;

  --p-blue: #6F9BEA;  --p-orange: #E3834F;  --p-plum: #D27BBB;  --p-teal: #4FB3AC;
  --p-ochre: #D1A23A; --p-rose: #EC7088;    --p-indigo: #9A90F0; --p-olive: #9DB850;
  --p-foreground: #0E1411;

  --day-1: #5FAE85; --day-2: #E07A60; --day-3: #7E9BD0; --day-4: #D1A23A; --day-5: #9AA8B4;
  --day-foreground: #0E1411;

  --map-land: #18201B; --map-forest: #1D2820; --map-water: #24384A; --map-road: #2F3A34;

  --elevation-xs: 0 0 0 1px rgb(255 255 255 / 0.06);
  --elevation-md: 0 8px 20px -4px rgb(0 0 0 / 0.50), 0 0 0 1px rgb(255 255 255 / 0.07);
  --elevation-lg: 0 24px 56px -12px rgb(0 0 0 / 0.65), 0 0 0 1px rgb(255 255 255 / 0.08);
  --scrim: rgb(0 0 0 / 0.60);
}
```

### 2.12 Tailwind colour mapping

The project uses Tailwind 4.3, so the mapping lives in CSS (`@theme inline`) in the same `globals.css`:

```css
@theme inline {
  --color-*: initial;               /* remove the default palette: only system colours exist */
  --color-white: #FFFFFF;
  --color-black: #000000;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-hover: var(--primary-hover);
  --color-primary-pressed: var(--primary-pressed);
  --color-primary-subtle: var(--primary-subtle);
  --color-primary-muted: var(--primary-muted);
  --color-primary-ink: var(--primary-ink);
  --color-primary-50: #F1F6F3;  --color-primary-100: #DFEBE4; --color-primary-200: #BFD6C8;
  --color-primary-300: #94BAA5; --color-primary-400: #5F957A; --color-primary-500: #3E795C;
  --color-primary-600: #2C6248; --color-primary-700: #234F3B; --color-primary-800: #1C3F30;
  --color-primary-900: #152F24;
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-destructive-hover: var(--destructive-hover);
  --color-destructive-pressed: var(--destructive-pressed);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-sunken: var(--sunken);
  --color-fg: var(--foreground);
  --color-fg-secondary: var(--text-secondary);
  --color-fg-muted: var(--muted-foreground);
  --color-fg-faint: var(--text-faint);

  --color-success: var(--success); --color-success-subtle: var(--success-subtle); --color-success-ink: var(--success-ink);
  --color-warning: var(--warning); --color-warning-subtle: var(--warning-subtle); --color-warning-ink: var(--warning-ink);
  --color-error: var(--error);     --color-error-subtle: var(--error-subtle);     --color-error-ink: var(--error-ink);
  --color-info: var(--info);       --color-info-subtle: var(--info-subtle);       --color-info-ink: var(--info-ink);

  --color-p-blue: var(--p-blue);   --color-p-orange: var(--p-orange); --color-p-plum: var(--p-plum);
  --color-p-teal: var(--p-teal);   --color-p-ochre: var(--p-ochre);   --color-p-rose: var(--p-rose);
  --color-p-indigo: var(--p-indigo); --color-p-olive: var(--p-olive); --color-p-foreground: var(--p-foreground);

  --color-day-1: var(--day-1); --color-day-2: var(--day-2); --color-day-3: var(--day-3);
  --color-day-4: var(--day-4); --color-day-5: var(--day-5); --color-day-foreground: var(--day-foreground);

  --color-map-land: var(--map-land); --color-map-forest: var(--map-forest);
  --color-map-water: var(--map-water); --color-map-road: var(--map-road);

  --color-scrim: var(--scrim);
  --shadow-xs: var(--elevation-xs);
  --shadow-md: var(--elevation-md);
  --shadow-lg: var(--elevation-lg);
}
```

Equivalent `theme.extend.colors`. Only for a JS config loaded with `@config` (Tailwind 3-style); not needed on 4.3:

```ts
// tailwind.config.ts (only if loaded via @config)
colors: {
  background: "var(--background)", foreground: "var(--foreground)",
  card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
  popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
  primary: {
    DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)",
    hover: "var(--primary-hover)", pressed: "var(--primary-pressed)",
    subtle: "var(--primary-subtle)", muted: "var(--primary-muted)", ink: "var(--primary-ink)",
    50: "#F1F6F3", 100: "#DFEBE4", 200: "#BFD6C8", 300: "#94BAA5", 400: "#5F957A",
    500: "#3E795C", 600: "#2C6248", 700: "#234F3B", 800: "#1C3F30", 900: "#152F24",
  },
  secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
  muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
  accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
  destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)",
                 hover: "var(--destructive-hover)", pressed: "var(--destructive-pressed)" },
  border: { DEFAULT: "var(--border)", strong: "var(--border-strong)" },
  input: "var(--input)", ring: "var(--ring)",
  surface: { DEFAULT: "var(--surface)", raised: "var(--surface-raised)" },
  sunken: "var(--sunken)",
  fg: { DEFAULT: "var(--foreground)", secondary: "var(--text-secondary)",
        muted: "var(--muted-foreground)", faint: "var(--text-faint)" },
  success: { DEFAULT: "var(--success)", subtle: "var(--success-subtle)", ink: "var(--success-ink)" },
  warning: { DEFAULT: "var(--warning)", subtle: "var(--warning-subtle)", ink: "var(--warning-ink)" },
  error:   { DEFAULT: "var(--error)",   subtle: "var(--error-subtle)",   ink: "var(--error-ink)" },
  info:    { DEFAULT: "var(--info)",    subtle: "var(--info-subtle)",    ink: "var(--info-ink)" },
  p: { blue: "var(--p-blue)", orange: "var(--p-orange)", plum: "var(--p-plum)", teal: "var(--p-teal)",
       ochre: "var(--p-ochre)", rose: "var(--p-rose)", indigo: "var(--p-indigo)", olive: "var(--p-olive)",
       foreground: "var(--p-foreground)" },
  day: { 1: "var(--day-1)", 2: "var(--day-2)", 3: "var(--day-3)", 4: "var(--day-4)", 5: "var(--day-5)",
         foreground: "var(--day-foreground)" },
  map: { land: "var(--map-land)", forest: "var(--map-forest)", water: "var(--map-water)", road: "var(--map-road)" },
  scrim: "var(--scrim)",
}
```

---

## 3. Typography

### 3.1 Fonts

| Family | Role | Weights used in the screens | Cyrillic |
|---|---|---|---|
| Manrope | Headings (Display–H4), wordmark, card/poll titles | 700 | Yes (`cyrillic`, `cyrillic-ext`) |
| Inter | All UI and body text | 400, 500, 600, 700 (700: avatar initials only) | Yes (`cyrillic`, `cyrillic-ext`) |
| JetBrains Mono | Amounts, invite link/code, token names, step numbers on landing | 500 (400 on DS boards only) | Yes (`cyrillic`) |

The DS board text says "Manrope · 600 / 700"; no screen uses Manrope 600. Ukrainian-specific glyphs (Ґ ґ Є є І і Ї ї ʼ) are shown on `02 · Типографіка`.

```ts
// app/fonts.ts — self-hosted variable fonts (files in app/fonts/, copied from the design package)
import localFont from "next/font/local";

export const inter = localFont({
  src: [
    { path: "./fonts/Inter/Inter-VariableFont_opsz,wght.ttf", style: "normal" },
    { path: "./fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf", style: "italic" },
  ],
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export const manrope = localFont({
  src: "./fonts/Manrope/Manrope-VariableFont_wght.ttf",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});

export const jetbrainsMono = localFont({
  src: "./fonts/JetBrains_Mono/JetBrainsMono-VariableFont_wght.ttf",
  weight: "100 800",
  variable: "--font-jetbrains-mono",
  display: "swap",
});
```

```tsx
// app/layout.tsx
<html lang="uk" className={`${inter.variable} ${manrope.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
```

```css
@theme inline {
  --font-display: var(--font-manrope), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, monospace;
}
```

### 3.2 Type scale

| Role | Family | Size | Line height | Weight | Letter spacing | Tailwind |
|---|---|---|---|---|---|---|
| Display | Manrope | 56 | 64 | 700 | −0.025em | `font-display text-display` |
| H1 | Manrope | 40 | 48 | 700 | −0.02em | `font-display text-h1` |
| H2 | Manrope | 30 | 38 | 700 | −0.02em | `font-display text-h2` |
| H3 | Manrope | 22 | 30 | 700 | −0.015em | `font-display text-h3` |
| H4 | Manrope | 17 | 24 | 700 | −0.01em | `font-display text-h4` |
| Body L | Inter | 16 | 26 | 400 | 0 | `text-body-lg` |
| Body | Inter | 14 | 22 | 400 | 0 | `text-body` |
| Small | Inter | 13 | 20 | 400 | 0 | `text-small` |
| Caption | Inter | 12 | 16 | 500 | +0.01em | `text-caption` |
| Label | Inter | 12 | 16 | 600 | +0.06em, uppercase | `text-label uppercase` (or `label` utility) |
| Mono / amounts | JetBrains Mono | 14 | 20 | 500 | 0, `tabular-nums` | `font-mono text-amount tabular-nums` |
| Mono / total | JetBrains Mono | 40 | 48 | 500 | −0.02em | `font-mono text-amount-lg tabular-nums` |

```css
@theme {
  --text-display: 56px; --text-display--line-height: 64px; --text-display--letter-spacing: -0.025em; --text-display--font-weight: 700;
  --text-h1: 40px; --text-h1--line-height: 48px; --text-h1--letter-spacing: -0.02em;  --text-h1--font-weight: 700;
  --text-h2: 30px; --text-h2--line-height: 38px; --text-h2--letter-spacing: -0.02em;  --text-h2--font-weight: 700;
  --text-h3: 22px; --text-h3--line-height: 30px; --text-h3--letter-spacing: -0.015em; --text-h3--font-weight: 700;
  --text-h4: 17px; --text-h4--line-height: 24px; --text-h4--letter-spacing: -0.01em;  --text-h4--font-weight: 700;
  --text-body-lg: 16px; --text-body-lg--line-height: 26px;
  --text-body: 14px;    --text-body--line-height: 22px;
  --text-small: 13px;   --text-small--line-height: 20px;
  --text-caption: 12px; --text-caption--line-height: 16px; --text-caption--letter-spacing: 0.01em; --text-caption--font-weight: 500;
  --text-label: 12px;   --text-label--line-height: 16px;   --text-label--letter-spacing: 0.06em;  --text-label--font-weight: 600;
  --text-amount: 14px;  --text-amount--line-height: 20px;  --text-amount--font-weight: 500;
  --text-amount-lg: 40px; --text-amount-lg--line-height: 48px; --text-amount-lg--letter-spacing: -0.02em; --text-amount-lg--font-weight: 500;
}
```

Off-scale sizes used in screens (implement as drawn; see §11):

| Where | Spec |
|---|---|
| Landing hero H1 | Manrope 700, `clamp(40px, 5vw, 60px)`, line-height 1.08, −0.03em |
| Landing section H2 | Manrope 700, `clamp(30px, 3vw, 40px)`, line-height 1.2, −0.02em |
| Landing hero subtitle | Inter 400, 18/28 |
| Landing step / module text | Inter 400, 15/24 |
| Trip card title | Manrope 700, 18/24, −0.01em |
| Workspace trip title, mobile map header title | Manrope 700, 16, −0.01em |
| Day header title (workspace) | Manrope 700, 15 |
| Poll title, mobile title | Manrope 700, 17/24 (= H4 size), −0.01em |
| Date picker month | Manrope 700, 15 |
| Stop title (mobile) | Inter 600, 15 |
| Cursor label, editing tag, trip-card role badge | Inter 600, 11 |
| Bottom-nav label, mobile weekday | Inter 500/600, 11 |
| Avatar initials | Inter 700, 8–14 depending on avatar size (§6.5) |
| Comment body | Inter 400, 14/21 |
| Radio-card description | Inter 400, 12/17 |
| Map attribution | Inter 400, 10 |

### 3.3 Numbers, currency, dates

| Rule | Spec | Example |
|---|---|---|
| Figures | `font-variant-numeric: tabular-nums` on all amounts, times, dates in lists and tables | `08:00`, `14–18 липня` |
| Amount font | JetBrains Mono 500 | `7 200 ₴` |
| Currency | UAH, sign `₴` after the number, separated by a space | `2 860 ₴` |
| Thousands separator | Narrow space per DS board ("вузький пробіл", U+202F); see §11 | `23 120 ₴` |
| Negative / positive | True minus `−` (U+2212) and `+`, always shown on balances | `−780 ₴`, `+4 280 ₴` |
| Per-person share | `{amount} ₴` (table) or `{amount} / ос.` (expense row) | `1 800 / ос.` |
| Range dates (uk) | `D–D місяця` (genitive) | `14–18 липня` |
| Day dates (uk) | `Дд, D місяця` (2-letter weekday) | `Ср, 15 липня` |
| Short dates (uk) | `D міс.` / `D–D міс. YYYY` | `14 лип`, `8–11 серп. 2025` |
| Range dates (en) | `Mon D–D` | `Jul 14–18` |
| Day dates (en) | `Ddd, Mon D` | `Wed, Jul 15` |
| Time | 24-hour, `HH:MM` in both languages | `06:30`, `19:42` |
| Expiry (uk) | `До {weekday}, D місяця, HH:MM` | `До неділі, 8 листопада, 23:59` |
| Relative time (uk) | `5 хв тому`, `2 дні тому`, `вчора`, then `HH:MM` for today | — |

### 3.4 Ukrainian text length

From the DS board: "Ukrainian strings run 15–25% longer than English. Buttons and tabs are sized for the Ukrainian copy first, never truncated mid-word."

| Element | Rule as designed |
|---|---|
| Buttons | Width hugs content (`padding-inline` from §6.1); no fixed widths; never truncate; never wrap in desktop layouts |
| Tabs / workspace nav | Hug content; the tab row may wrap with the header (`flex-wrap`) |
| Badges | Hug content; single line |
| Email in member list | Only element that truncates: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
| Headings | `text-wrap: balance` |
| Body paragraphs | `text-wrap: pretty` |
| Minimum widths | — (not defined, see §11) |

---

## 4. Layout foundations

### 4.1 Spacing (4 px base; Tailwind 4 `--spacing: 0.25rem`)

| Token | px | Tailwind step | Typical use |
|---|---|---|---|
| `space-0.5` | 2 | `0.5` | Segmented-control item gap, tick marks |
| `space-1` | 4 | `1` | Icon-to-text in tight chips, inner gaps |
| `space-2` | 8 | `2` | Gap between stops, button icon gap, avatar stack row gap |
| `space-3` | 12 | `3` | Stop card padding, row padding (vertical) |
| `space-4` | 16 | `4` | Card padding, row padding (horizontal), panel padding |
| `space-5` | 20 | `5` | Panel padding (itinerary list), modal body |
| `space-6` | 24 | `6` | Grid gutter, modal header padding, card grid gap |
| `space-8` | 32 | `8` | Section gap in app pages, chat column padding |
| `space-12` | 48 | `12` | Page top padding (My trips), big gaps |
| `space-16` | 64 | `16` | Landing hero column gap |
| `space-20` | 80 | `20` | DS board padding, page bottom padding |

Rule from the board: inside components 4/8/12; between groups 16/24; between sections 48/64/80. Off-scale values used in screens: 6, 10, 14, 18, 26, 28, 40, 56, 72, 96 (see §11).

### 4.2 Border radius

| Token | px | Tailwind | Used by |
|---|---|---|---|
| `none` | 0 | `rounded-none` | Tables |
| `sm` | 6 | `rounded-sm` | Badges, chips, day number squares 22–24 px, icon buttons 32 px, select items, segmented items, stop number |
| `md` | 8 | `rounded-md` | Buttons, inputs, select trigger, note well, nav items, poll options, avatar-less thumbnails |
| `lg` | 12 | `rounded-lg` | Cards, itinerary stops, tables, trip cards, popover calendar, composer, comment card |
| `xl` | 16 | `rounded-xl` | Modals, DS panels, landing visual tiles, mobile bottom sheet, empty-state page panel |
| `full` | 9999 | `rounded-full` | Avatars, presence dots, count badges, FAB, mobile filter chips, live chip |

Off-scale radii in use: 2 and 3 (swatches), 4 (cursor labels, editing tag, mention), 7 (day squares 26–28 px, map pins 26 px), 9 (landing logo tile), 10 (lg button, landing CTA, select menu, toast, radio cards, zoom control, mobile icon buttons, mobile day chips, settlement highlight), 14 (mobile map header card), 20 (landing final-CTA card). See §11.

### 4.3 Elevation

Everything not listed here uses a 1 px `border` and no shadow.

| Token | Light | Dark (export) | Used on |
|---|---|---|---|
| `shadow-xs` | `0 1px 2px rgb(24 33 28 / .06), 0 0 0 1px rgb(24 33 28 / .06)` | `0 0 0 1px rgb(255 255 255 / .06)` | Trip card hover |
| `shadow-md` | `0 4px 12px -2px rgb(24 33 28 / .10), 0 0 0 1px rgb(24 33 28 / .06)` | `0 8px 20px -4px rgb(0 0 0 / .50), 0 0 0 1px rgb(255 255 255 / .07)` | Select menu, date-picker popover, toast |
| `shadow-lg` | `0 20px 48px -12px rgb(24 33 28 / .24), 0 0 0 1px rgb(24 33 28 / .06)` | `0 24px 56px -12px rgb(0 0 0 / .65), 0 0 0 1px rgb(255 255 255 / .08)` | Modal, stop while dragging |

Shadows in screens that differ from the tokens (see §11):

| Where | Value |
|---|---|
| Trip card (hovered example) | `0 1px 2px rgba(24,33,28,.06), 0 0 0 1px rgba(24,33,28,.04)` |
| Invite modal | `0 20px 48px -12px rgba(24,33,28,.32), 0 0 0 1px rgba(24,33,28,.06)` |
| Toast | `0 4px 12px -2px rgba(24,33,28,.20)` |
| Landing product preview | `0 24px 64px -24px rgba(24,33,28,.28), 0 0 0 1px rgba(24,33,28,.07)` |
| Segmented active item | `0 1px 2px rgba(24,33,28,.08)` |
| Map overlay controls (legend chips, zoom) | `0 1px 2px rgba(24,33,28,.06)` |
| Map pin | `0 0 0 2px #FFF, 0 2px 6px rgba(24,33,28,.2)` |
| Mobile FAB | `0 8px 20px -6px rgba(21,47,36,.45)` |
| Mobile bottom sheet | `0 -4px 24px -6px rgba(24,33,28,.18), 0 0 0 1px rgba(24,33,28,.06)` |
| Mobile map header card | `0 4px 12px -2px rgba(24,33,28,.12), 0 0 0 1px rgba(24,33,28,.06)` |

Modal scrim: `rgba(21,47,36,0.42)` light, `rgb(0 0 0 / .60)` dark (export).

### 4.4 Borders

| Style | Spec | Used for |
|---|---|---|
| Default | 1px solid `border` | Dividers, cards, rows, panels |
| Strong | 1px solid `border-strong` | Inputs, select, textarea, secondary button |
| Dashed | 1px dashed `border-strong` | Empty states, Глядач badge |
| Drop zone | 1px dashed `primary-400`, bg `primary-50` | Drop indicator while dragging |
| Selected | 1px solid `primary-600` (+ 3px `primary-100` halo) | Selected radio card, focused input, own poll option, active day chip |
| Participant | 1px solid participant colour + `0 0 0 3px` colour/14% | Stop selected or edited by another user |
| Accent rule | 2px solid `primary-600` (active) / `border` (inactive), top | Landing "how it works" steps |
| Active tab | `box-shadow: inset 0 -2px 0 primary-600` | Underline tabs |

### 4.5 Grid, breakpoints, widths

| | Desktop | Mobile |
|---|---|---|
| Columns | 12 | 4 |
| Gutter | 24 | 16 (board graphic draws 8) |
| Margin | 80 at 1440 | 16 |
| Max content width | 1280 (`max-w-content`) | — |
| Page side padding (screens) | `clamp(16px, 4vw, 40px)` inside the 1280 container | 16 |

| Prefix | Min width | Behaviour from the board |
|---|---|---|
| `sm` | 640 | — |
| `md` | 768 | Bottom navigation below `md` |
| `lg` | 1024 | Side panel (itinerary list + map) from `lg` |
| `xl` | 1280 | — |
| `2xl` | 1440 | Design width for desktop mockups |

Fixed layout sizes in screens:

| Region | Size |
|---|---|
| Workspace top bar | min-height 56 |
| App header (My trips) | height 60 |
| Itinerary list panel | `flex: 1 1 480px`, max-width 560 |
| Map panel | `flex: 999 1 560px` |
| Discussion threads nav | `flex: 0 1 240px` |
| Discussion chat column | `flex: 999 1 480px` |
| Discussion comment aside | `flex: 1 1 360px`, max-width 400 |
| Budget expenses column | `flex: 999 1 600px` |
| Budget aside | `flex: 1 1 360px`, max-width 420 |
| Invite modal | width `min(560px, 100% − 32px)`, top offset 72 |
| Mobile frame | 390 × 844; top inset 52 (system status bar area, not drawn); bottom nav 6/8/26 padding |

### 4.6 Z-index

Not defined numerically (see §11). Stacking order as drawn, bottom to top:

1. Page content
2. Map overlays (labels, pins, legend, zoom, attribution); presence cursors and name labels above the stop list
3. Mobile FAB, mobile bottom sheet
4. Mobile bottom navigation
5. Popovers / menus (select, date picker)
6. Modal scrim, then modal
7. Toast

---

## 5. Iconography

| Property | Value |
|---|---|
| Set | Lucide (`lucide-react`) |
| Stroke | 1.5 px (`strokeWidth={1.5}`), round caps and joins |
| Sizes | 16 (inline in desktop UI), 20 (mobile, bottom nav, modal close, poll button, empty state), 24 (DS board) |
| Default colour | `text-secondary` (`currentColor`) |
| Active | `primary-600` |
| Destructive | `error` |
| Decorative / disabled | `text-faint` (drag grip) |
| On primary | white / `primary-foreground` |
| Exception | Logo mark: `route` icon, white, stroke 1.75, 16–20 px on a `primary-600` tile |
| Rules | No icons beside headings. Icon-only buttons need `aria-label` (+ tooltip per board). Decorative icons `aria-hidden="true"` |

Icons per module (Lucide names):

| Module | Icons |
|---|---|
| Brand / global | `route` (logo, Маршрут nav), `user-plus` (Запросити), `arrow-right` (CTA, settlement), `plus` |
| My trips | `plus`, `calendar`, `link` (empty state "У мене є посилання") |
| Itinerary | `grip-vertical`, `plus`, `chevron-down`, `chevron-right`, `file-text` (note), `message-circle` (comments), `mountain` (difficulty), `minus` (zoom out), `arrow-right` rotated −135° (off-map indicator) |
| Map (mobile) | `chevron-left`, `layers`, `send` ("Прокласти"), `message-circle` |
| Budget | `plus`, `arrow-right`, `wallet` (nav), `banknote` (empty state) |
| Discussion | `message-circle`, `chart-column` (create poll), `send`, `x`, `chevron-right`, `info`, `check` |
| Invite | `link`, `copy`, `clock`, `chevron-down`, `x` |
| Components | `check` (select item), `chevron-left` / `chevron-right` (calendar), `circle-check` (toast), `ellipsis` (more), `copy`, `image` (photo placeholder caption) |
| Mobile nav | `route`, `map`, `wallet`, `message-circle` |
| Board only (not on any screen) | `search`, `globe`, `calendar` |

---

## 6. Components

File locations: primitives in `components/ui/*` (shadcn), domain components in `components/trip/*`.

### 6.1 Button: shadcn `button`

| Variant (design) | shadcn variant | Default | Hover | Pressed (active) | Focus-visible | Disabled |
|---|---|---|---|---|---|---|
| Primary | `default` | bg `primary-600`, text white | bg `primary-700` | bg `primary-800` | outline 2px `primary-600`, offset 2px | bg `#E2E6E0`, text `#8A948E` |
| Secondary | `outline` | bg white, 1px `border-strong`, text `text` | bg `sunken` #F2F4EF | bg `border` #E2E6E0 | outline 2px `primary-600`, offset 2 | bg white, border `#E2E6E0`, text `#8A948E` |
| Ghost | `ghost` | transparent, text `primary-600` | bg `primary-50`, text `primary-700` | bg `primary-100`, text `primary-800` | outline 2px `primary-600`, offset 2 | text `#8A948E` |
| Destructive | `destructive` | bg `error` #B83A2A, text white | bg #9A2E21 | bg #7F2519 | outline 2px `#B83A2A`, offset 2 | bg `#E2E6E0`, text `#8A948E` |
| Destructive text | custom (`link`-like) | transparent, text `error-ink` #9A2E21, 13/600, h40, px 4 | — | — | — | — |
| Loading | — | — | — | — | — | — |

All buttons: Inter 600, radius `md` (8), icon 16 with gap 8, `display: flex; align-items: center`.

| Size | Height | Padding-x | Font | Radius | Used |
|---|---|---|---|---|---|
| `sm` | 32 | 12 | 13/600 | 8 | Itinerary "+ Зупинка" (secondary), toast action (h32 px10) |
| `default` (md) | 40 | 16 | 14/600 | 8 | Standard |
| `lg` | 48 | 20 | 15/600 | 10 (off-scale) | Mobile |
| Top-bar | 36 | 14 | 14/600 | 8 | "Запросити" |
| Inline | 36 | 10–14 | 13/600 | 8 | "Додати до дня 2" (ghost), "Позначити як сплачено", "Надіслати", thread actions |
| Empty-state | 44 | 18 | 14/600 | 8 | My trips empty state |
| Landing CTA | 52 | 24 | 16/600 | 10 (off-scale) | "Увійти з Google" + `arrow-right` |
| Icon | 40 × 40 | — | — | 8 | Copy, more, send, poll, zoom |
| Icon (small) | 32 × 32 | — | — | 6 | Collapse day, calendar nav, close thread |
| Icon (mobile) | 44 × 44 | — | — | 10 | Mobile header |

Mobile FAB (custom): h48, padding 0 18 0 14, radius full, primary, 15/600, icon 20, gap 8, shadow §4.3, position right 16 / bottom 104.

### 6.2 Input: shadcn `input` + `label`

| Part | Spec |
|---|---|
| Label | 13/500 `text`, gap 6 to field |
| Field | h40, padding-x 12, 1px `border-strong`, radius 8, bg white, Inter 14/400 `text` |
| Amount field | Same, JetBrains Mono 14/500 |
| Hint | 12/400 `text-muted` |

| State | Spec |
|---|---|
| Default | as above |
| Hover | — |
| Focus-visible | border `primary-600` + `box-shadow: 0 0 0 3px primary-100`, no outline |
| Error | border `error` #B83A2A; message 12/400 `error-ink` #9A2E21 below ("Перевірте адресу — бракує домену") |
| Disabled | bg `sunken`, border `border`, text `text-muted`, label `text-muted` |
| Readonly (invite link) | h44, bg `sunken`, border `border-strong`, leading `link` icon 16 `text-muted`, JetBrains Mono 14/500 |

Textarea (`textarea`): padding 10/12, 1px `border-strong`, radius 8, 14/400, `rows=2`, `resize: none`.

Chat composer (custom): container 1px `border-strong`, radius 12, padding 6 6 6 14, gap 8; borderless input h36 14/400; icon button 40 (poll); send button 40 × 40 primary radius 8. Visually hidden label "Повідомлення".

### 6.3 Select: shadcn `select`

| Part | Spec |
|---|---|
| Trigger | Same box as input (h40, px12, radius 8); optional leading avatar 20; trailing `chevron-down` 16; open/focused: border `primary-600` + 3px `primary-100` |
| Menu | bg white, radius 10 (off-scale), padding 4, `shadow-md` |
| Item | h36, padding-x 8, radius 6, gap 8, 14/400; avatar 20 (9/700 initials) |
| Item hover / selected | bg `primary-50`; selected shows trailing `check` 16 `primary-600` |
| Disabled item | — |

Member role select in invite modal: ghost trigger h36, padding 0 8 0 12, 13/500, `chevron-down` 16 `text-muted`; implemented with shadcn `dropdown-menu` or `select`.

### 6.4 Date picker: shadcn `popover` + `calendar` (range mode)

| Part | Spec |
|---|---|
| Trigger | h40 input box, leading `calendar` 16 `text-muted`, value "14 липня — 18 липня 2026" |
| Popover | bg white, radius 12, padding 16, gap 12, `shadow-md` |
| Header | Month "Липень 2026" Manrope 15/700; prev/next icon buttons 32 × 32 radius 6 (`chevron-left`/`chevron-right`) |
| Week | Starts Monday: Пн Вт Ср Чт Пт Сб Нд; weekday row h28, 12/400 `text-muted` |
| Day cell | Row h36; number box 36 × 36 radius 8; 13/400, `tabular-nums`; row gap 2 |
| Outside month | text `text-faint` #8A948E |
| In range | band bg `primary-100`, text `primary-800`; band radius 8 0 0 8 at start, 0 8 8 0 at end |
| Range start / end | box bg `primary-600`, text white, 600 |
| Today, hover, disabled, focus | — |

### 6.5 Avatar: shadcn `avatar` (fallback = initials)

Initials: 2 letters (first + last name), Inter 700, white on participant colour (dark: `#0E1411` on the dark participant colour). No photos are designed.

| Size | Initials font | Used |
|---|---|---|
| 16 | 8 | Expense-row payer (DS) |
| 20 | 8–9 | Select items, poll voters |
| 22 | 9 | Budget table payer |
| 24 | 10 | DS sample |
| 26 | 10 | Trip card, mobile header, landing preview |
| 28 | 10 | Settlement/balance rows, comment thread |
| 30 | 11 | Workspace top bar |
| 32 | 12 | Chat messages, avatar stack (DS) |
| 36 | 13 | Profile button, invite member list |
| 40 | 14 | DS sample |

### 6.6 Avatar stack + presence: custom

| Part | Spec |
|---|---|
| Overlap | −8 px (32 px avatars, DS), −6 px (26–30 px, screens), −4 px (20 px poll voters) |
| Separator ring | `box-shadow: 0 0 0 2px <background colour>` |
| Overflow | "+N", bg `sunken`, text `text-secondary`, 600 |
| Online dot | 10 px (12 px on 40), `success` #23784A, 2px border in background colour; position right −1/−2, bottom −1/−2 |
| Idle | 12 px dot, white fill, `inset 0 0 0 2px warning` |
| Offline | Avatar at opacity 0.55 (DS) / 0.5 (top bar); no dot. Fails contrast (§2.9, §11) |
| Accessible name | Group has `role="img"` + `aria-label` listing members and status, e.g. "Учасники: Оксана (ви), Тарас і Марта онлайн, Андрій офлайн" |

### 6.7 Role badge: shadcn `badge` (custom variants)

| Role | Bg | Text | Border | Weight |
|---|---|---|---|---|
| Власник (owner) | `primary-100` | `primary-800` | none | 600 |
| Редактор (editor) | `sunken` | `text` | 1px `border` | 600 |
| Глядач (viewer) | transparent | `text-secondary` | 1px dashed `border-strong` | 500 (600 on trip card) |

Sizes: h24, padding-x 8, radius 6, 12 px (DS, invite); h22, padding-x 7, 11 px (trip card).

### 6.8 Tabs and navigation

| Type | Primitive | Spec |
|---|---|---|
| Underline tabs | shadcn `tabs` | List: gap 4, bottom 1px `border`. Trigger h40, padding-x 12, 14 px; active 600 `text` + `inset 0 -2px 0 primary-600`; inactive 500 `text-muted`; count suffix 500 `text-muted` ("Заплановані 3") |
| Count badge | custom | min-width 18, h18, padding-x 5, radius full, bg `primary-600`, white 11/600 |
| Workspace nav (routes) | custom `<nav>` of links | Item h36, padding-x 12, radius 8, 14 px; active bg `primary-50`, text `primary-800`, 600, `aria-current="page"`; inactive `text-secondary` 500 |
| Segmented control | shadcn `toggle-group` | Track bg `sunken`, padding 3, gap 2, radius 8. Item h30 (DS) / h28 (top bars), padding-x 12 / 10 / 8, radius 6, 13 / 12 px; on: bg white, `shadow 0 1px 2px rgba(24,33,28,.08)`, 600 `text`; off: transparent, 500 `text-muted`; `aria-pressed`. Used for УКР / EN |
| Day chips (desktop list) | custom | 5 equal-width links, h40, radius 8, 1px `border`; 12/600 tabular; 8 × 8 swatch radius 2 in day colour; active bg `primary-50` + border `primary-600` |
| Day chips (mobile) | custom `role="tablist"` | flex 1, h52, radius 10, 1px border; weekday 11 `text-muted`; date 15/700 + 6 px swatch; active bg `primary-50` + border `primary-600` |

### 6.9 Trip card: shadcn `card` (custom content), whole card is a link

| Part | Spec |
|---|---|
| Container | bg white, 1px `border`, radius 12, overflow hidden; hover: shadow (§4.3) |
| Cover | h184, photo (placeholder tone + caption chip "[ФОТО] …" 11/500 `text-secondary` on white 82%, padding 4/8, radius 6, bottom-left 12) |
| Live chip | top-left 12; bg white, radius full, padding 4 8 4 6, 12/500 `text`; 8 px `success` dot, gap 6. "Тарас і Марта зараз тут" |
| Body | padding 16, gap 14 |
| Title row | Manrope 18/24 700 + role badge (h22) at right |
| Where | 13/400 `text-secondary` ("Яремче · Говерла · Ворохта · Львів") |
| Footer | dates with `calendar` 16, 13/400 `text-secondary` tabular; avatar stack 26 (−6) at right |
| Grid | `repeat(auto-fill, minmax(min(360px, 100%), 1fr))`, gap 24 |
| Focus-visible | global focus outline |

Past-trip row (custom, inside one bordered list radius 12): grid `48px 1fr auto auto`, gap 16, padding 12/16, divider `border-top` between rows; thumb 48 × 36 radius 6 (tone); title 14/600; where 12 `text-muted`; dates 13 `text-secondary` tabular; total JetBrains Mono 13 `text-secondary`.

### 6.10 Day header: custom (shadcn `collapsible` trigger)

| Part | Spec |
|---|---|
| Number | 26 × 26 radius 7, day colour, white 12/700 (28 × 28 / 13 px on DS board and mobile) |
| Title | Manrope 700, 15 (workspace), 17 (DS board), 20/26 (mobile) |
| Meta | 12/400 `text-muted`: "Ср, 15 липня · 4 зупинки · +22°, без опадів" |
| Toggle | 32 × 32 icon button radius 6; `chevron-down` (expanded) / `chevron-right` (collapsed); `aria-label="Згорнути день 2"` / "Розгорнути день 1" |
| Layout | gap 12; padding 12–16 top, 10 bottom; collapsed days separated by 1px `border` |

### 6.11 Itinerary stop card: custom (`components/trip/stop-card.tsx`)

Anatomy (left to right): drag grip (`grip-vertical` 16, `text-faint`, top margin 3) · number square 22 × 22 radius 6, day colour, white 11/700 · content.

| Part | Spec |
|---|---|
| Container | `<li>`, 1px `border`, radius 12, padding 12, gap 10, bg white |
| Title row | Title 14/600 `text`; time 13 `text-secondary` tabular, right-aligned |
| Meta | 12/400 `text-muted`: "Від Заросляка · 2061 м · 6–7 год" |
| Note well | bg `sunken`, radius 8, padding 8/10, 13/20 `text`, leading `file-text` 16 `text-muted` |
| Footer meta | 12 `text-secondary`, gap 14; icon 16 + text: `message-circle` "4 коментарі", `mountain` "Складність: середня" |
| List | `<ol>`, gap 8 |
| Add to day | Ghost button h36, padding-x 10, 13/600, `plus` icon: "Додати до дня 2" |

| State | Spec |
|---|---|
| Default | as above |
| Hover | — |
| Focus-visible | global focus outline |
| Selected by another user | border 1px participant colour + `0 0 0 3px` participant colour at 14%; that user's cursor shown on the card (Марта on "Озеро Молодості") |
| Edited by another user | Same ring + tag at top −10, right 12: bg participant colour, white 11/600, padding 2/6, radius 4, text "{Name} редагує"; text caret 2 × 16 px in participant colour at the edit position; that user's cursor + name label (Тарас on "Сходження на Говерлу") |
| Dragging | `shadow-lg`, `transform: rotate(-1.2deg)` (landing preview: `rotate(-1.5deg) translateX(14px)`), grip colour `text-secondary`, no border |
| Drop indicator | h8 (landing h6), 1px dashed `primary-400`, bg `primary-50`, radius 8 (6) |
| Disabled (viewer role) | — |
| Mobile | padding 14, gap 12, number 24 × 24 / 12 px, title 15/600, time 14, meta 13, note 13/19, no grip |

Live cursor (custom, `components/trip/presence-cursor.tsx`):

```html
<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M2 1.5 13 7l-4.6 1.4L6.3 13Z" fill="{participant}" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round"/>
</svg>
<!-- name label: margin-top 12px from the arrow tip row; bg participant; white 11/600; padding 2px 6px; radius 4px -->
```

`pointer-events: none`. Label text = first name ("Тарас", "Марта").

### 6.12 Numbered map pin: custom

| Part | Spec |
|---|---|
| Shape | Rounded square, never a circle |
| Desktop | 26 × 26 radius 7, day colour, white 12/700, centred on the coordinate (`translate(-50%,-50%)`), `box-shadow: 0 0 0 2px #FFF, 0 2px 6px rgba(24,33,28,.2)` |
| Selected / being edited by a participant | Add `0 0 0 5px {participant}` after the white ring (a 3 px coloured ring outside the white ring) |
| Mobile, focused stop | 34 × 34 radius 8, 15/700, ring as above; name label next to it |
| Other days (mobile) | 22 × 22 radius 6, 11/700, opacity 0.45 |
| Label | Number = stop order within its day |
| Legend chips (desktop) | h32, padding-x 10, radius 8, 1px `border`, bg white, 12/500; swatch 10 × 10 radius 3; off: swatch opacity 0.35, text `text-muted`; `aria-pressed` |
| Filter chips (mobile) | h36, padding-x 12, radius full, 13/600; "Усі", "Д1"…; on: bg `primary-600`, text white; off: bg white, border `border` |
| Off-map indicator | chip h32 "Львів · дні 4–5 · 250 км" with `arrow-right` rotated −135° |
| Zoom | 40 × 40 stacked buttons, radius 10, 1px border, `plus` / `minus` |
| Attribution | 10 px `text-muted` on white 80%, radius 4: "Дані мапи: OpenStreetMap" |

### 6.13 Expense row: shadcn `table` (budget screen) / custom row (DS board)

Budget table:

| Column | Header | Cell |
|---|---|---|
| Витрата | 12/500 `text-muted`, padding 12/16, bottom 1px `border` | Title 14/600 + category 12 `text-muted` |
| Платив | same | Avatar 22 + first name 13 |
| Дата | same | 13 `text-secondary` tabular, nowrap ("14 лип") |
| З кожного | right-aligned | JetBrains Mono 13 `text-muted` ("820 ₴") |
| Сума | right-aligned | JetBrains Mono 14/500 ("3 280 ₴") |

Rows: padding 12/16, bottom 1px `sunken` (#F2F4EF). Selected/hover row bg `primary-50`. Table container: bg white, 1px `border`, radius 12, `overflow-x: auto`, table min-width 620.

DS-board row: grid `1fr auto`, gap 4/16, padding 14/16; title 14/600; amount Mono 14/500; meta 12 `text-muted` with 16 px avatar ("Тарас · 14 липня · порівну на 4"); per-person Mono 12 `text-muted` ("1 800 / ос."); hover/selected bg `primary-50`.

Category bar: h8 radius full, segments gap 2, flex-grow proportional to amount; colours `primary-600`, `primary-400`, `primary-300`, `primary-200`; legend 12 `text-secondary` with 8 × 8 swatch radius 2, value Mono in `text`.

Total block: Label "Усього витрачено" · JetBrains Mono 40/48 500 −0.02em "23 120 ₴" · 13 `text-secondary` "5 780 ₴ на людину · 8 витрат · ділимо порівну на 4".

### 6.14 Balance row and settlement row: custom

Settlement card ("Хто кому переказує"): bg white, 1px `border`, radius 12. Header padding 16/16/12: H4-sized Manrope 17/24 700 + 13 `text-muted` "3 перекази закривають усі борги".

| Row | Spec |
|---|---|
| Default | padding 12/16, gap 10, top 1px `border`; avatar 28 → `arrow-right` 16 `text-muted` → avatar 28; text 14 "Андрій → Тарас"; amount Mono 15/500 right |
| Current user owes | margin 0 8 8; padding 12; radius 10; bg `primary-50`; border 1px `primary-200`; gap 12; subtitle 12 `text-secondary` "Monobank · картка в профілі Тараса"; amount Mono 16/500; full-width primary button h36 13/600 "Позначити як сплачено" |
| Settled | — |

Balance row: grid `28px 1fr 96px`, gap 10, padding 10/0, bottom 1px `border`.

| Part | Spec |
|---|---|
| Name line | name 13/600; "заплатив / заплатила {amount}" Mono 12 `text-muted` |
| Bar | track h6 `sunken` radius full; centre tick 1px `border-strong` (extends 3 px above/below); fill from centre: positive right in `success`, negative left in `error`; width = abs(balance) / max(abs) × 50% |
| Amount | Mono 14/500, right; positive `success-ink` with "+", negative `error-ink` with "−" |
| Footnote | 12/18 `text-muted` |

### 6.15 Poll card with live vote counts: custom

| Part | Spec |
|---|---|
| Container | 1px `border`, radius 12, padding 16, gap 12, bg white |
| Header | Title Manrope 17/24 700; meta 12 `text-muted` "17–18 липня · 1 ніч · один голос"; live badge right: bg `success-subtle`, text `success-ink` 12/500, padding 3/8, radius full, 6 px `success` dot, "Наживо" |
| Option | `<button aria-pressed>`, min-h48, padding-x 12, radius 8, 1px border, gap 10; background fill bar absolutely positioned, width = vote share % |
| Option (not chosen) | border `border`, fill `sunken`, radio ring 18 px 1.5px `border-strong`, label 14/500 |
| Option (own vote) | border `primary-600`, fill `primary-100`, radio ring `primary-600` + 8 px dot, label 14/600 |
| Option content | label + meta 12 `text-muted` ("2 400 ₴ за ніч · біля Арсеналу"); voter avatars 20 (−4); count 14/600 tabular, width 20, right |
| Footer | 12 `text-muted`: "3 з 4 проголосували · Андрій ще ні" ··· "Закриється у пт, 10 липня" |
| DS variant | option h40, `check` icon instead of radio, title Manrope 16/700, count right |
| Hover, focus, closed state, vote change | — / global focus / — / — |

### 6.16 Chat message: custom

| Type | Spec |
|---|---|
| Other user | avatar 32, gap 12; name 14/600 + time 12 `text-muted` (gap 8, baseline); body 14/22, max-width 560 |
| Own | right-aligned; meta 12 `text-muted` "Ви · 18:05"; bubble bg `primary-100`, text `primary-900`, radius 12 12 4 12, padding 10/14, max-width 520 |
| Poll message | Author row "створила опитування · 18:06", then poll card (max-width 520) |
| System line | centred 12 `text-muted`: "Тарас проголосував за «Готель біля Опери» · 18:31" |
| Mention | inline link, `primary-600`, 500, bg `primary-50`, padding 1/4, radius 4: "@Тарас" |
| Day separator | 12 `text-muted` with 1 px `border` lines on both sides, gap 12: "Сьогодні" |
| Typing indicator | three 5 px dots in the participant colour, opacity 1 / 0.6 / 0.3, gap 3 + 12 `text-muted` "Тарас пише…" |
| Stream | padding 20/32, gap 18 |

### 6.17 Stop comment thread: custom aside

| Part | Spec |
|---|---|
| Container | aside, bg `canvas`, left 1px `border` |
| Header | padding 16/20, bottom 1px `border`, gap 12; Label "Коментарі до зупинки" + close icon button 32 (`x`) |
| Stop link | card link: padding 12, 1px `border`, radius 12, bg white, gap 10; number square 22; title 14/600; meta 12 `text-muted` "День 2 · Ср, 15 липня · 08:00"; trailing `chevron-right` 16 |
| Comments | padding 16/20, gap 16; avatar 28, gap 10; name 13/600 + time 12 `text-muted`; body 14/21 |
| Live info banner | bg `info-subtle`, text `info-ink` 13/19, padding 10/12, radius 8, `info` icon 16: "Тарас змінює час цієї зупинки просто зараз" |
| Reply | padding 12/20/20, top 1px `border`, gap 10; label 13/500 "Відповісти"; textarea; actions: ghost h36 `check` "Позначити вирішеним" + primary h36 "Надіслати" |
| Thread list (left nav) | width 240, padding 16/12, gap 4; "Загальний чат" active (bg `primary-50`, `primary-800`, 600, h40, radius 8); Label "Коментарі до зупинок"; items min-h40, padding 8/10, radius 8, 13 px, number square 18 radius 5 10/700, count 12/600 (active `primary-600`, else `text-muted`); active item bg white |

### 6.18 Invite modal: shadcn `dialog` + `radio-group` + `select` + `dropdown-menu`

| Part | Spec |
|---|---|
| Overlay | scrim `rgba(21,47,36,.42)` over the workspace |
| Dialog | width `min(560px, 100% − 32px)`, margin-top 72, bg white, radius 16, shadow (§4.3 modal), `role="dialog" aria-modal="true" aria-labelledby` |
| Header | padding 24/24/0, gap 16; title Manrope 22/30 700 −0.015em "Запросити до «Карпати + Львів»"; subtitle 14/20 `text-secondary`; close 40 × 40 (`x` 20), margin −8 −8 0 0 |
| Body | padding 20/24, gap 20 |
| Link row | label 13/500; readonly input (§6.2) + primary h44 "Копіювати" (`copy`) |
| Role | `<fieldset>` + legend 13/500 "Роль для тих, хто приєднається"; 2-column grid gap 8 of radio cards: padding 12, radius 10, gap 10, native radio 16 (accent `primary-600`); title 14/600; description 12/17 `text-secondary`. Selected: border `primary-600` + 3px `primary-100`. Options: Редактор / Глядач |
| Expiry | label 13/500 "Посилання діє"; select trigger h40 with `clock` 16: "7 днів"; hint 13 `text-muted` "До неділі, 8 листопада, 23:59" |
| Members header | padding 16/24/8, top 1px `border`; Label "Учасники · 4" |
| Member row | `<li>` padding 8/12, radius 8, gap 12; avatar 36 + online dot; name 14/600 (+ " · ви" 400 `text-muted`); email 12 `text-muted`, truncated; right: owner badge or role dropdown (ghost h36) |
| Footer | padding 16/24, top 1px `border`, bg `canvas`, radius 0 0 16 16; left destructive text button "Скинути посилання"; right secondary h40 px18 "Готово" |
| Expiry options | — (only "7 днів" is shown) |

### 6.19 Toast: shadcn `sonner`

| Part | Spec |
|---|---|
| Container | bg `text` #18211C, text white, radius 10, padding 12/12/12/16, gap 12, shadow `0 4px 12px -2px rgba(24,33,28,.20)` |
| Icon | `circle-check` 16 `primary-300` |
| Message | 14/400: "Посилання скопійовано" |
| Action | ghost h32, padding-x 10, radius 6, 13/600, text `primary-200`: "Скасувати" |
| Variants (error, info), position, duration, dark mode | — |

### 6.20 Empty state: custom

| Variant | Spec |
|---|---|
| Inline (DS: budget) | 1px dashed `border-strong`, radius 12, padding 24, gap 10, left-aligned; icon 20 `text-muted` (`banknote`); title Manrope 16/700 "Витрат поки немає"; text 13/20 `text-secondary`; secondary button h36 px14 13/600 "Додати витрату" |
| Page (My trips) | 1px dashed `border-strong`, radius 16, padding 56; grid `auto-fit minmax(min(420px,100%),1fr)` gap 48; H2 30/38 "Поки що жодної поїздки"; Body L `text-secondary`; buttons h44: primary "Нова поїздка" (`plus`) + secondary "У мене є посилання" (`link`); right: decorative skeleton of 3 stop rows (number squares `primary-100`/`primary-700`, bars 10 px `border` colour, opacity 1 / 0.7 / 0.45), `aria-hidden` |

### 6.21 Mobile bottom navigation: custom `<nav aria-label="Розділи поїздки">`

| Part | Spec |
|---|---|
| Container | grid 4 equal columns, bg white, top 1px `border`, padding 6/8/26 (bottom includes home-indicator space) |
| Item | `<a>`, h56, column, centred, gap 4; icon 20; label 11 px |
| Active | `primary-600`, label 600, `aria-current="page"` |
| Inactive | `text-muted`, label 500 |
| Badge | min-width 16, h16, padding-x 4, radius full, `primary-600`, white 10/700; top 6, left `calc(50% + 6px)` |
| Items | Маршрут (`route`), Карта (`map`), Бюджет (`wallet`), Чат (`message-circle`) |
| DS variant | Inside a bordered radius-12 container with padding 4; board note: touch target 56 × 88 |

### 6.22 Other components visible in the screens

| Component | Spec |
|---|---|
| Workspace top bar | min-h56, padding 8/16, bg white, bottom 1px `border`, wrap with gap 12/20. Logo tile 32 radius 8 (`route` icon 16, stroke 1.75) linking to My trips · title Manrope 16/700 + dates 12 `text-muted` · workspace nav (margin-left 12) · spacer · presence stack (30) · Запросити (h36) · УКР/EN segmented |
| App header (My trips) | h60, bg white, bottom border; logo tile 28 radius 8 + wordmark Manrope 16/700; right: УКР/EN + profile avatar button 36 |
| Mobile header | padding 52/8/8 (top = status-bar area), bg white; back 44 (`chevron-left`); title Manrope 17/700 + 12 `text-muted` "14–18 липня · Тарас і Марта тут"; avatars 26; invite icon button 44 `primary-600` |
| Mobile bottom sheet | margin-x 12, bottom 88; bg white, radius 16, padding 8/16/16, gap 12; handle 36 × 4 radius full `border-strong`; stop number 28; title Manrope 17/700; meta 13; presence line 12/500 in participant colour with 6 px dot; two buttons h44 radius 10 (secondary "4 коментарі", primary "Прокласти") |
| Mobile map header card | top 52, margin-x 12; bg white, radius 14, padding 4, gap 4; back 44; title Manrope 16/700 + 12 `text-muted` "День 2 · Ср, 15 липня"; layers icon button 44 |
| Banner (semantic) | DS: padding 12/14, radius 10, 14/500 in `*-ink` on `*-subtle`, 8 px dot in the base colour |
| Photo placeholder | Tone fill + caption chip (§6.9). Landing final CTA uses `#D9E0D6`, min-h360, `image` icon |
| Info/off-map chip | see §6.12 |

---

## 7. Screens

### 7.0 Screenshot index

File names in `docs/design/` (see §11: confirm against the actual files):

| Screen | Board | Screenshot |
|---|---|---|
| Landing | Лендинг | `01-landing-desktop.png` |
| My trips | Мої поїздки | `02-my-trips-desktop.png` |
| My trips, empty | Мої поїздки — порожній стан | `02b-my-trips-empty-desktop.png` |
| Itinerary | Поїздка — маршрут | `03-itinerary-desktop.png` |
| Budget | Поїздка — бюджет | `04-budget-desktop.png` |
| Discussion | Поїздка — обговорення | `05-discussion-desktop.png` |
| Invite modal | Запрошення | `06-invite-modal-desktop.png` |
| Mobile itinerary | Mobile · Маршрут | `07-itinerary-mobile.png` |
| Mobile map | Mobile · Карта | `08-map-mobile.png` |

### 7.1 Landing (see `01-landing-desktop.png`)

| Region | Layout |
|---|---|
| Header | max-w 1280, padding 20 / `clamp(16px,4vw,40px)`; logo tile 32 radius 9 + wordmark Manrope 18/700; nav links 14/500 `text-secondary` padding 10/12 ("Як це працює", "Можливості"); УКР/EN; secondary "Увійти" h40 |
| Hero | padding 72 top / 96 bottom; grid `auto-fit minmax(min(480px,100%),1fr)` gap 64. Left (max-w 540, gap 28): eyebrow Label in `primary-600` "Для поїздок з друзями"; H1 "Плануйте подорож разом, а не в п’яти різних чатах."; subtitle "Маршрут по днях, мапа, спільні витрати й голосування. Кожен бачить зміни тієї ж секунди — і посилання на житло більше не губиться в листуванні."; CTA "Увійти з Google" + note 14/20 `text-muted` "Безкоштовно. До поїздки — лише за запрошенням." Right: product preview (radius 16) with top bar (trip title, 4 avatars), Day 2 stops (Тарас editing "Сходження на Говерлу"), map with pins and Марта's cursor |
| How it works | full-width band bg white, top 1px `border`; padding 96; H2 "Три кроки до плану, з яким згодні всі"; `<ol>` 3 columns `auto-fit minmax(min(280px,100%),1fr)` gap 40; each: top rule 2px, Mono 14/500 number 01–03, H3, 15/24 text |
| Modules | padding 96; header row: H2 "Усе, що зазвичай розкидано між таблицею, нотатками й чатом" + 15/24 text (max-w 380); 2 × 2 grid `auto-fit minmax(min(520px,100%),1fr)` gap 48/40; each: visual tile h300 bg `sunken` radius 16 padding 32 + H3 + 15/24 text (max-w 460). Order: Маршрут, Карта, Бюджет, Обговорення |
| Final CTA | card bg white, 1px border, radius 20; grid `auto-fit minmax(min(480px,100%),1fr)`; left photo placeholder "[ФОТО] Чорногірський хребет на світанку, туман у долинах, 3:2"; right padding `clamp(32px,5vw,64px)`: H2 "Наступна поїздка починається з одного посилання.", 16/26 text, CTA "Увійти з Google" |
| Footer | top 1px border; padding 28; 13 `text-muted`: "© 2026 TripTogether"; links "Конфіденційність", "Умови", "Зворотний зв’язок"; УКР/EN |

Focal point: hero headline + green CTA; the product preview is the only visual. Responsive: grids collapse to one column via `auto-fit`; header nav wraps. Only one primary action (sign in), repeated twice.

Copy for steps and modules:

| # | Title | Text |
|---|---|---|
| 01 | Створіть поїздку | Назва, напрямок і дати. Дні маршруту з’являться самі — від першого до останнього. |
| 02 | Надішліть посилання друзям | Вони входять через Google, а ви вирішуєте, хто редагує, а хто лише дивиться. |
| 03 | Плануйте одночасно | Додавайте зупинки, голосуйте за житло, записуйте витрати. Видно, хто що зараз змінює. |
| Маршрут | | Дні й зупинки, які можна перетягувати. Нотатки, час, посилання на квитки — поруч із місцем, до якого вони стосуються. |
| Карта | | Кожен день — свій колір, кожна зупинка — номер. Одразу видно, де маршрут петляє і де варто поміняти порядок. |
| Бюджет | | Записуйте, хто за що платив. Наприкінці — найкоротший список переказів, щоб розрахуватися за хвилину. |
| Обговорення | | Чат поїздки з опитуваннями, а коментарі — прямо до зупинок. Суперечка про час виходу не загубиться серед мемів. |

### 7.2 My trips (see `02-my-trips-desktop.png`, `02b-my-trips-empty-desktop.png`)

| Region | Layout |
|---|---|
| App header | §6.22 |
| Main | max-w 1280, padding 48 / 80 bottom, gap 32 |
| Title row | H1 "Мої поїздки" + 14 `text-muted` "3 заплановані · 5 минулих"; primary "Нова поїздка" (`plus`) right |
| Tabs | Underline: "Заплановані 3" (active) / "Минулі 5" |
| Grid | 3 trip cards (§6.9) |
| Past | Label "Минулі" + list of 3 past-trip rows |
| Empty | H1 + page empty state (§6.20); profile avatar АК |

Focal point: the first trip card (live chip, owner). Responsive: card grid auto-fills down to 1 column; title row wraps.

### 7.3 Trip workspace: itinerary (see `03-itinerary-desktop.png`)

| Region | Layout |
|---|---|
| Top bar | §6.22; "Маршрут" active; Запросити is **primary** here |
| Body | full height (`100vh`, min 860), `flex-wrap` |
| Left: day list | bg white, right border, scrolls. Toolbar (padding 16/20/12, bottom border): 13 `text-muted` "17 зупинок · оновлено щойно" + secondary sm "+ Зупинка"; day chips Д1·14 … Д5·18 (Д2 active). Days (padding 8/20/24): Д1 collapsed; Д2 expanded (4 stops + "Додати до дня 2"); Д3 expanded (3 stops); Д4, Д5 collapsed |
| Right: map | bg `map-land`; SVG base map; place labels (13/600): Яремче, Ворохта, Буковель; "Говерла · 2061", "Заросляк" (12), "р. Прут" (11 italic `info`); pins for days 1–3; dashed routes per day; legend chips top-left (Д1–Д3 on, Д4–Д5 off); off-map chip "Львів · дні 4–5 · 250 км"; zoom top-right; attribution bottom-right |
| Presence | Тарас (orange) editing stop 2 of Day 2 (tag, caret, cursor); Марта (plum) has stop 2 of Day 3 selected (cursor); matching pins have participant rings |

Focal point: the live-edited stop (orange ring) and its pin. Responsive: list (480 basis) and map (560 basis) wrap; below `md` replaced by the mobile views (§7.7). Behaviour between `md` and `lg`: —.

### 7.4 Budget (see `04-budget-desktop.png`)

| Region | Layout |
|---|---|
| Top bar | "Бюджет" active; Запросити **secondary** |
| Main | max-w 1280, padding 32 / 48 bottom, `flex-wrap` gap 32 |
| Left (expenses) | Total block + primary "Додати витрату"; category bar + legend; expense table (8 rows; row 6 "Чани в Яремче" shown selected) |
| Right (aside) | Settlement card (current user's row highlighted) → Balances (4 rows) + footnote |

Focal point: the total and the "you owe" settlement row with its button. Responsive: aside wraps below the table; the table scrolls horizontally (min-width 620).

### 7.5 Discussion (see `05-discussion-desktop.png`)

| Region | Layout |
|---|---|
| Top bar | "Обговорення" active (no count badge); Запросити **secondary** |
| Left nav | Threads (§6.17), "Загальний чат" active, "Сходження на Говерлу" highlighted |
| Centre | Chat stream (§6.16) with the embedded poll; typing indicator; composer |
| Right | Stop comment thread for "Сходження на Говерлу" |

Focal point: the poll card in the stream. Responsive: the three columns wrap; mobile chat: —.

### 7.6 Invite modal (see `06-invite-modal-desktop.png`)

Dialog (§6.18) centred over a dimmed, simplified workspace. Focal point: the link field + "Копіювати". Responsive: width shrinks to `100% − 32px`; role cards stay 2 columns; expiry row wraps.

### 7.7 Mobile 390 px (see `07-itinerary-mobile.png`, `08-map-mobile.png`)

| View | Layout |
|---|---|
| Маршрут | Mobile header → day chips (Ср 15 active) → day header (Говерла, 28 px number, title 20/26) → 4 stop cards (stop 2 edited by Тарас, with note and comments) → FAB "Зупинка" → bottom nav (Маршрут active, Чат badge 3). No cursors on touch; the "Тарас редагує" tag + ring carry presence |
| Карта | Full-bleed map (vertically compressed geography) → floating header card + filter chips (Д2 active) → pins (Day 2 full, Day 3 dimmed; selected pin 34 px with orange ring + "Тарас" label) → bottom sheet for the selected stop → bottom nav (Карта active) |

Focal points: the edited stop (Маршрут); the selected pin + bottom sheet (Карта). No fake status bar or keyboard is drawn.

### 7.8 Seed data (from the mockups)

**Trip**

| Field | Value |
|---|---|
| Title | Карпати + Львів |
| Dates | 2026-07-14 – 2026-07-18 (5 днів) |
| Where | Яремче · Говерла · Ворохта · Львів |
| Invite link | `triptogether.app/j/k7Q-2mXa`, role Редактор, expires 7 днів |

**Participants**

| Name | Initials | Colour | Role | Email | Presence |
|---|---|---|---|---|---|
| Оксана Мельник (current user) | ОМ | `p-blue` | Власник | oksana.melnyk@gmail.com | online |
| Тарас Бойко | ТБ | `p-orange` | Редактор | taras.boiko@gmail.com | online, editing |
| Марта Левицька | МЛ | `p-plum` | Редактор | marta.levytska@gmail.com | online |
| Андрій Ковальчук | АК | `p-teal` | Глядач | andrii.kovalchuk@gmail.com | offline |

**Days and stops**

| Day | Date | Title | Stops (time · title · meta) |
|---|---|---|---|
| 1 (`day-1`) | Вт, 14 липня | Дорога в Яремче | 4 stops; names not shown (§11) |
| 2 (`day-2`) | Ср, 15 липня | Говерла | 06:30 Трансфер до Заросляка · від садиби «Смерекова хата» · 40 хв · 1 600 ₴ — 08:00 Сходження на Говерлу · маршрут від Заросляка · 2061 м · 6–7 год · note "Дощовики, термос, по 1,5 л води. Нагорі +8° і вітер, назад — до 15:00" · 4 коментарі · Складність: середня — 15:00 Обід у колибі біля Заросляка · банош, бринза, чай із чорницею — 19:00 Чани в Яремче · бронь на 4 · 2 400 ₴ · платила Марта |
| 3 (`day-3`) | Чт, 16 липня | Ворохта й Буковель | 10:00 Віадук у Ворохті — 13:00 Озеро Молодості, Буковель · підйомник R1 · 450 ₴ / ос. — 17:00 Автобус Яремче → Львів |
| 4 (`day-4`) | Пт, 17 липня | Львів: центр | Площа Ринок, Високий Замок, Опера (times not shown) |
| 5 (`day-5`) | Сб, 18 липня | Львів → Київ | Потяг о 16:24 |

Weather line Day 2: "+22°, без опадів". Total: "17 зупинок".

**Expenses (split equally between 4)**

| Title | Category | Paid by | Date | Each | Amount |
|---|---|---|---|---|---|
| Квитки Інтерсіті Київ → Франківськ ×4 | Транспорт | Оксана | 14 лип | 820 ₴ | 3 280 ₴ |
| Садиба «Смерекова хата», 2 ночі | Житло | Тарас | 14 лип | 1 800 ₴ | 7 200 ₴ |
| Продукти та спорядження на похід | Їжа | Марта | 14 лип | 535 ₴ | 2 140 ₴ |
| Вечеря в «Гуцульщині» | Їжа | Тарас | 14 лип | 715 ₴ | 2 860 ₴ |
| Трансфер до Заросляка | Транспорт | Андрій | 15 лип | 400 ₴ | 1 600 ₴ |
| Чани в Яремче | Дозвілля | Марта | 15 лип | 600 ₴ | 2 400 ₴ |
| Автобус Яремче → Львів | Транспорт | Оксана | 16 лип | 430 ₴ | 1 720 ₴ |
| Квитки в Оперу ×4 | Дозвілля | Андрій | 17 лип | 480 ₴ | 1 920 ₴ |
| **Total** | | | | **5 780 ₴** | **23 120 ₴** |

By category: Житло 7 200 · Транспорт 6 600 · Їжа 5 000 · Дозвілля 4 320.

| Person | Paid | Balance |
|---|---|---|
| Оксана | 5 000 ₴ | −780 ₴ |
| Тарас | 10 060 ₴ | +4 280 ₴ |
| Марта | 4 540 ₴ | −1 240 ₴ |
| Андрій | 3 520 ₴ | −2 260 ₴ |

Settlement: Оксана → Тарас 780 ₴ (Monobank) · Андрій → Тарас 2 260 ₴ · Марта → Тарас 1 240 ₴.

**Poll**: "Де ночуємо у Львові?", 17–18 липня, 1 ніч, один голос, closes Пт, 10 липня.

| Option | Meta | Votes |
|---|---|---|
| Апартаменти на Підвальній | 2 400 ₴ за ніч · біля Арсеналу | 2 (Оксана, Марта) |
| Готель біля Опери | 3 100 ₴ · сніданок включено | 1 (Тарас) |
| Хостел на Вірменській | 1 600 ₴ · приватна кімната на 4 | 0 |

**Chat (Сьогодні)**

| Time | Author | Text |
|---|---|---|
| 18:02 | Тарас | Вніс у бюджет садибу в Яремчі — 7 200 за дві ночі, сніданки включені. |
| 18:05 | Оксана (own) | Дякую! А для Львова давайте проголосуємо — у мене вже 12 вкладок із житлом. |
| 18:06 | Оксана | (poll) |
| 18:20 | Марта | Підвальна — п’ять хвилин до Ринку, і там є пральна машина. Після гір саме те. |
| 18:31 | system | Тарас проголосував за «Готель біля Опери» |
| 19:10 | Андрій | Буду ввечері, гляну все разом. @Тарас, трансфер на Говерлу вже можна переносити на 05:45. |

**Comments on "Сходження на Говерлу"**

| When | Author | Text |
|---|---|---|
| 2 дні тому | Андрій | Може, вийти раніше, ніж о 08:00? Після обіду на Чорногорі часто гроза. |
| 2 дні тому | Тарас | Згоден. Трансфер можу перенести на 05:45, водій не проти. |
| вчора | Марта | Тоді сніданок беремо з собою — у садибі дадуть ланчбокси, я вже спитала. |
| 18:40 | Оксана | Добре, ставимо вихід о 06:30. Тарасе, онови, будь ласка, час у маршруті. |

Other threads: Чани в Яремче (2), Озеро Молодості (1), Площа Ринок (3), Опера: що вдягти (0).

**Other trips**

| Title | Where | Dates | Role | Members |
|---|---|---|---|---|
| Одеса на вихідні | Ланжерон · Привоз · Аркадія | 21–23 серпня | Редактор | МЛ, ОМ, ІШ |
| Краків, різдвяний ярмарок | Старе місто · Казімеж · Величка | 11–14 грудня | Глядач | АК, ДП, ОМ, ТБ, +1 |

| Past trip | Where | Dates | Total |
|---|---|---|---|
| Шацькі озера | Світязь · Пісочне | 8–11 серп. 2025 | 14 860 ₴ |
| Чернівці + Хотин | Університет · фортеця | 2–4 трав. 2025 | 9 420 ₴ |
| Дністровський каньйон | Бакота · сплав | 20–22 вер. 2024 | 11 300 ₴ |

Photo captions (placeholders): "Говерла з Заросляка, ранок"; "Узбережжя Ланжерону"; "Ринкова площа взимку"; "Чорногірський хребет на світанку, туман у долинах, 3:2".

---

## 8. Motion and interaction

Durations and easings are not specified in the design (§11). What the design defines:

| Interaction | Defined |
|---|---|
| Drag and drop of stops | Dragged-card look (`shadow-lg`, rotate −1.2°) and drop indicator (§6.11). Animation: — |
| Presence cursors appearing / moving | Visual only (§6.11). Animation: — |
| Vote count change | Fill-bar width = vote share; counts update live ("Наживо"). Animation: — |
| Typing indicator | Three dots at opacity 1 / 0.6 / 0.3 (static in mockup). Animation: — |
| Toast | Visual only. Enter/exit: — |
| Modal | Visual only. Enter/exit: — |
| Reduced motion | `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }` (from the token export) |

---

## 9. Accessibility

| Topic | Rule |
|---|---|
| Focus ring | `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`; always visible from the keyboard. Inputs/select/textarea: no outline, border `ring` + `box-shadow: 0 0 0 3px var(--primary-muted)` |
| Touch targets | ≥ 44 × 44 on mobile: icon buttons 44, buttons h44–48, day chips h52, bottom-nav items h56 |
| Text contrast | AA minimum for all text, including 11–12 px labels (§2.9). `text-faint` never for text |
| Real elements | `<button>`, `<a href>`, `<input>` + `<label>`, `<fieldset>`/`<legend>` for role choice, `<ol>` for stops, `<table>` for expenses; no `div` buttons |
| Icon-only buttons | `aria-label` (e.g. "Закрити", "Наблизити", "Віддалити", "Копіювати", "Шари мапи", "Запросити") + tooltip |
| Decorative SVG | `aria-hidden="true"`; the landing product preview is `role="img"` with `aria-label="Приклад робочого простору поїздки"` |
| Tabs | `role="tablist"`, `role="tab"`, `aria-selected` (My trips filter, mobile day chips); route navigation uses `<nav aria-label>` + `aria-current="page"` (workspace nav, bottom nav) |
| Toggles | Language switch, map legend and filter chips: `aria-pressed` |
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title; close button labelled; focus trap and Esc via shadcn `dialog` |
| Poll | Options are `<button aria-pressed>` as drawn; the count is visible text; the footer states participation in text |
| Drag and drop keyboard | — (§11) |
| Live regions | — (§11) |
| Colour not alone | Cursors always carry a name label; edited stops carry the text tag "{Name} редагує"; avatars carry initials; presence is also stated in text ("Тарас і Марта тут", aria-label on the stack); balances carry +/− signs; days use number + shape (square) while people use circles; the poll's own vote adds a filled radio dot and heavier weight; Day 1 and `primary` share a hex, but day markers always show a number |
| Language | `<html lang="uk">` (switch to `en` with the УКР/EN control) |

---

## 10. Implementation notes for developers

### 10.1 Stack mapping

| Concern | Location / decision |
|---|---|
| Tailwind | v4.3, CSS-first: no `tailwind.config.ts`; theme in `app/globals.css` via `@theme` / `@theme inline` |
| CSS variables | `app/globals.css`: `:root` (light) and `.dark` (§2.11), then `@theme inline` mapping (§2.12), type scale (§3.2), radii, shadows |
| shadcn/ui | `components.json` → `tailwind.css: "app/globals.css"`, `cssVariables: true`, base colour irrelevant (overridden) |
| Dark mode | Class strategy: `.dark` on `<html>`; `@custom-variant dark (&:is(.dark *));`. Use `next-themes` (`attribute="class"`, `defaultTheme="system"`) so the OS preference applies until the user chooses |
| Radii | Set explicitly: `--radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;` (do not derive from `--radius` with calc) |
| Breakpoints | `--breakpoint-2xl: 1440px`; others are Tailwind defaults (640/768/1024/1280) |
| Container | `--container-content: 1280px` → `max-w-content` |
| Default palette | Removed (`--color-*: initial`) so off-system colours fail to compile |
| Border default | Tailwind 4 defaults borders to `currentColor`; set `* { border-color: var(--border); }` in `@layer base` |

### 10.2 File layout

```
app/
  globals.css            # tokens, @theme, base layer
  fonts.ts               # next/font (§3.1)
  layout.tsx
components/
  ui/                    # shadcn primitives: button, input, label, textarea, select, popover, calendar,
                         # avatar, badge, tabs, toggle-group, card, table, collapsible, dialog,
                         # radio-group, dropdown-menu, tooltip, sonner, drawer
  trip/
    top-bar.tsx  workspace-nav.tsx  presence-stack.tsx  presence-cursor.tsx
    day-chips.tsx  day-header.tsx  stop-card.tsx  stop-list.tsx
    trip-map.tsx  map-pin.tsx  map-legend.tsx
    trip-card.tsx  past-trip-row.tsx  role-badge.tsx
    expense-table.tsx  category-bar.tsx  settlement-card.tsx  balance-row.tsx
    poll-card.tsx  chat-message.tsx  chat-composer.tsx  comment-thread.tsx  thread-nav.tsx
    invite-dialog.tsx  empty-state.tsx  bottom-nav.tsx  mobile-header.tsx  bottom-sheet.tsx
  marketing/
    landing-*.tsx
lib/
  format.ts              # Intl currency/date helpers (§3.3)
```

### 10.3 Build order

1. Tokens: `globals.css` (§2.11, §2.12, §3.2, §4), fonts (§3.1), dark mode provider.
2. Primitives in `components/ui` restyled to §6.1–§6.8, §6.18–§6.19: button, input/label/textarea, select, popover + calendar, avatar, badge, tabs, toggle-group, dialog, radio-group, dropdown-menu, tooltip, sonner.
3. Domain components in `components/trip`: presence (stack, cursor), day header, stop card (+ edited/selected/dragging states), map pin + map, trip card, expense table, settlement/balance rows, poll card, chat message + composer, comment thread, invite dialog, empty state, bottom nav, mobile header, bottom sheet.
4. Screens: My trips (+ empty) → Itinerary → Budget → Discussion → Invite modal → mobile Маршрут / Карта → Landing.
5. Seed data from §7.8.

### 10.4 Assets

| Asset | Source / loading |
|---|---|
| Fonts | `next/font/local` with the variable TTFs in `app/fonts/` (§3.1); the files cover Latin and Cyrillic |
| Icons | `lucide-react`, `strokeWidth={1.5}`, sizes 16/20; logo uses `Route` at stroke 1.75 |
| Logo | `primary-600` rounded tile (radius 8; 9 on landing; sizes 28/32) with white `Route` icon + "TripTogether" in Manrope 700 |
| Photos | Placeholders only in the design; real landscape photography to be supplied (§11). Load with `next/image` |
| Map | Placeholder SVG in the design; attribution text references OpenStreetMap. Map library, tile provider and styling: — (§11) |
| Google sign-in | The design shows a green "Увійти з Google" button without the Google mark; use Google's official sign-in button assets/guidelines (§11) |

---

## 11. Gaps and open questions

**Process**
- [ ] Screenshot file names in §7.0 are proposed; confirm against `docs/design/` and rename/remove references for any screen without a screenshot.
- [ ] Day 1 stop names (4 stops) are not shown in any screen; map shows 3 Day 1 pins without labels.
- [ ] Day 4 and Day 5 stop times and the split of the 17 stops are not shown.
- [ ] Real coordinates for places (mock map is schematic and vertically compressed on mobile).

**Colour**
- [ ] All dark values marked **(export)** were derived for the token export, not drawn on a board: confirm.
- [ ] No screen is designed in dark mode; only token swatches and one sample card exist.
- [ ] Dark-mode states not designed: primary pressed, destructive hover/pressed, disabled, toast, scrim, map styling.
- [ ] Input/secondary-button border `#C9D0C8` is 1.57:1 against white (fails WCAG 1.4.11 non-text 3:1): decide whether to darken.
- [ ] Offline avatar at 50–55% opacity makes initials 2.1–2.3:1 (fails): choose another offline treatment.
- [ ] Offline opacity inconsistent: 0.55 (DS) vs 0.5 (top bar).
- [ ] `primary-500` has no documented use.
- [ ] Destructive pressed `#7F2519` is not a named token.
- [ ] Day 1 colour equals `primary-600`: confirm acceptable.
- [ ] Chart colours (`--chart-*` in shadcn) not defined; category bar uses the primary ramp.

**Typography**
- [ ] Off-scale sizes in §3.2 (hero clamp 40–60, 18/28, 15/24, 18/24, 16, 15, 11, 10, 14/21, 12/17): add to the scale or map to the nearest step.
- [ ] DS board says "Manrope · 600 / 700"; screens use only 700.
- [ ] DS board labels Small as `text-sm`; the export uses `text-small`. Pick one.
- [ ] Bottom-nav and cursor labels at 11 px and the attribution at 10 px are below the 12 px Caption floor.
- [ ] Thousands separator: board says narrow space (U+202F); `Intl.NumberFormat('uk-UA')` outputs U+00A0. Pick one.
- [ ] Minimum widths for buttons/tabs/badges and behaviour when Ukrainian copy does not fit (wrap vs. overflow) not defined.
- [ ] English copy exists only for two heading samples; full EN strings are not designed.

**Layout**
- [ ] Off-scale spacing used in screens: 6, 10, 14, 18, 26, 28, 40, 56, 72, 96.
- [ ] Off-scale radii: 2, 3, 4, 7, 9, 10, 14, 20.
- [ ] Off-token shadows listed in §4.3 (modal .32 vs `shadow-lg` .24, toast, trip card hover, landing preview, FAB, bottom sheet, map controls).
- [ ] Grid margin 80 (board) vs. screens' 1280 container + `clamp(16px,4vw,40px)` padding: which governs?
- [ ] Header height 60 (My trips) vs. 56 (workspace).
- [ ] Mobile gutter: board text says 16, board graphic draws 8.
- [ ] Z-index scale not defined.
- [ ] Layout between `md` (768) and `lg` (1024) not designed (tablet).
- [ ] Mobile Budget, Discussion, Invite, My trips and Landing not designed.

**Components**
- [ ] Loading state for buttons, lists, map, and skeletons not designed.
- [ ] Hover states not designed for: inputs, stop card, tabs, nav items, table rows (only one "selected" row shown), member rows, chat messages, map pins.
- [ ] "Запросити" is primary on Itinerary but secondary on Budget/Discussion.
- [ ] Settled settlement state, "mark as paid" confirmation not designed.
- [ ] Poll: closed state, results view, vote-change and multi-vote behaviour not designed.
- [ ] Toast variants (error/info), position, duration not designed.
- [ ] Date picker: today, hover, disabled, single-date mode, keyboard focus not designed.
- [ ] Select: disabled item, search, empty state not designed.
- [ ] Invite: expiry options list, link-reset confirmation, error state ("Посилання протерміноване" banner exists only as a DS sample).
- [ ] Viewer role: which controls are hidden/disabled not designed.
- [ ] Idle presence: when it applies; cursor behaviour when a user leaves.
- [ ] Mobile bottom sheet: expanded state, drag behaviour not designed.
- [ ] Chat: message grouping, edit/delete, read state, attachments not designed.
- [ ] Comment thread: resolved state not designed.
- [ ] Profile menu, sign-out, settings not designed.
- [ ] "New trip" flow (form) not designed.

**Motion & accessibility**
- [ ] Durations and easings for all interactions in §8.
- [ ] Keyboard drag-and-drop (e.g. Space to lift, arrows to move, Enter to drop) and screen-reader announcements.
- [ ] `aria-live` for presence changes, vote counts, toasts, typing indicator.
- [ ] Poll semantics: `aria-pressed` buttons as drawn vs. a radio group.

**Assets**
- [ ] Real photos (trip covers, landing CTA) and their crops/art direction.
- [ ] Trip card cover as one slice per destination (Wikipedia lead image or a first-letter tile; SPEC §2 "Trip card cover"): slice gap, letter tile typography, mobile crop and the "Images from Wikipedia" footer are not drawn.
- [ ] Map library, tiles and style (OpenStreetMap is referenced in the attribution only).
- [ ] Google sign-in button: official asset vs. the drawn green button.
- [ ] Favicon / app icon not designed.
- [ ] Domain `triptogether.app` and invite code format are mock values.
