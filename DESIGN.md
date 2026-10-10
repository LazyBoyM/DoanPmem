---
name: EduPortal
description: Sổ học vụ số — academic records in the Academic Focus palette.
colors:
  primary: "#247d8b"
  primary-hover: "#1b616d"
  primary-subtle: "#eaf3f5"
  primary-border: "#c1d8df"
  success: "#28714f"
  success-subtle: "#edf5ef"
  success-border: "#c4dece"
  success-text: "#235d42"
  warning: "#95601b"
  warning-subtle: "#fbf4e7"
  warning-border: "#e5d6b8"
  warning-text: "#805216"
  danger: "#ad3548"
  danger-subtle: "#fbf0f2"
  danger-border: "#e5c5cc"
  danger-text: "#923044"
  page-bg: "#f3f5f6"
  card-bg: "#fff"
  border-color: "#dce2e5"
  text-main: "#292f35"
  text-muted: "#5d6871"
  field-border: "#c8d1d7"
  table-head: "#f8fafb"
  row-divider: "#e8edf0"
typography:
  display:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
    fontSize: "2.625rem"
    fontWeight: 650
    lineHeight: 1.18
    letterSpacing: "-.025em"
  headline:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 650
    lineHeight: 1.18
    letterSpacing: "-.02em"
  title:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-.02em"
  body:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Source Sans 3, Segoe UI, sans-serif"
    fontSize: ".9375rem"
    fontWeight: 600
rounded:
  track: "3px"
  chip: "5px"
  control: "6px"
  table: "8px"
  surface: "12px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.card-bg}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline-primary:
    backgroundColor: "transparent"
    textColor: "#216f7b"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-outline-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.card-bg}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.card-bg}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  field:
    backgroundColor: "{colors.card-bg}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  nav-item:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.control}"
    padding: "10px 11px"
  record-actions:
    backgroundColor: "{colors.card-bg}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.surface}"
    padding: "12px"
    width: "260px"
  status-chip:
    backgroundColor: "{colors.success-subtle}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.chip}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.card-bg}"
    rounded: "{rounded.surface}"
---

# Design System: EduPortal

## Overview

**Creative North Star: "Sổ học vụ số"**

Sổ học vụ số is a quiet digital academic ledger within the user-selected Academic Focus palette. White ruled sheets, graphite task indexes and restrained petrol actions make records and their next action readable across all three roles.

The interface uses one local sans family, tabular figures, explicit labels and compact controls. Thin dividers and pale grounds supply structure; protected editors and profiles open at the right edge. Vietnamese content, complete academic facts and keyboard access remain part of the visual system. Each task receives its own composition, recorded in the surface briefs.

**Key Characteristics:**
- White ruled records and graphite task indexes within Academic Focus.
- Readable tabular numbers, labeled scope and explicit semantic states.
- Flat bordered sheets, compact controls and protected side editors.
- Mobile selectors and agendas, contained detailed records and reduced-motion support.

## Colors

A neutral academic palette uses petrol to clarify actions and state rather than decorate the page. The frontmatter preserves the canonical CSS values from client/src/index.css; client/src/portalLedger.css supplies the finished ledger composition and component overrides.

### Primary

- **Petrol:** primary actions, links, selected filters and linear credit measures. Primary-hover deepens interactive states; primary-subtle and primary-border support selected and informational surfaces.

### Neutral

- **Graphite:** text-main carries headings and records; text-muted carries descriptions and secondary context.
- **Paper:** card-bg carries controls and panels; page-bg separates the surrounding workspace.
- **Structural grey:** border-color separates panels, field-border defines editable fields, and table-head and row-divider distinguish record structure.

### Semantic states

- **Academic green:** success and its subtle, border and text companions communicate completed or successful states.
- **Amber:** warning and its companions identify a pending or cautionary state.
- **Muted red:** danger and its companions identify failures, blocked outcomes and errors.

**The Purposeful Color Rule.** Use petrol for actions and the current choice; use success, warning and danger only to communicate a labeled state.

## Typography

The local variable Source Sans 3 font is shared by headings, records and controls, with Segoe UI and sans-serif fallbacks. It supports Vietnamese and loads with font-display: swap. The frontmatter defines the observed roles; there is no invented modular ratio.

- **Display:** the login introduction; its desktop role contracts at the tablet and phone breakpoints.
- **Headline:** ledger page headings; contracts to 2rem at 1199px and 1.875rem at 767px. Base headings outside this pattern retain their existing roles.
- **Title:** section headings and dialog titles; smaller subheadings use the existing intermediate sizes (1.25rem and 1.125rem).
- **Body:** regular explanatory text, with paragraphs capped (72ch).
- **Label:** form and control text; secondary annotations use the smaller observed sizes (.875rem, .8125rem and .75rem).

**The Comparable Numbers Rule.** Use tabular numerals for grades, credits and summary metrics so adjacent values remain easy to compare.

## Layout

Desktop navigation occupies a fixed pale white rail (224px). The sticky toolbar has a minimum height (72px), shares the page ground and retains its divider. The work area is bounded (1680px) with desktop horizontal gutters (32px). Gutters reduce to 24px at 1199px and 16px at 767px; the phone toolbar contracts to 64px.

Task indexes sit beside white record sheets with a common gap (28px), reducing to 20px at 1199px. Their widths follow the task, rather than a single global template. At 767px, indexes become controls before the sheet; registration and academic directories use labeled selectors, and weekly schedules become a day agenda. Grade entry has its own student reader and action shelf. Exact surface compositions belong in [portal-ledger.md](.impeccable/surfaces/portal-ledger.md) and [gradebook.md](.impeccable/surfaces/gradebook.md).

Below 991px, navigation becomes an off-canvas drawer (270px), and the main area loses its left offset. The drawer traps keyboard focus, makes the background inert, closes on Escape and restores focus. Phone actions retain a minimum height (40px).

Detailed records scroll inside their own containers without losing columns. Final admin sheets retain a minimum table width (960px), with the student directory at 1080px; transcripts retain 920px and the weekly calendar 840px. Admin row actions stay at the trailing edge in a 110px sticky column. Empty spanning rows release the table minimum width and header. Print removes navigation and controls, restores the calendar and exposes records.

## Elevation & Depth

Ordinary surfaces have no shadows. White cards, pale header bands and hairline borders provide structure. Dialogs use the existing modal shadow (0 24px 64px #17252f24) and dimmed backdrop; transient feedback uses a lighter floating shadow (0 10px 32px #17252f1a). Field focus uses a restrained ring (0 0 0 3px #247d8b16), alongside the global visible outline.

**The Flat Surface Rule.** Ordinary cards remain shadowless. Reserve elevation for modal dialogs and transient feedback.

## Shapes

Controls and navigation use modest corners; sheets and ordinary dialogs use the larger surface corner. Full-height side editors and profile sheets have square viewport edges. Tables have a middle-radius enclosing frame; nested record tables remain square inside cards. Status chips have compact, gently rounded corners. Circular shapes are reserved for identity initials and small status dots. Borders are thin and structural (1px), with no ornamental framing.

## Components

### Buttons

Compact, labeled actions share the control corner and label weight. Primary, outline-primary, outline-secondary, success and danger variants retain their Bootstrap behavior with the extracted palette. Small buttons reduce desktop padding (6px 11px) and height (36px); phone actions return to the standard minimum height. Color and border transitions are short (160ms); disabled controls use lower opacity (.65) and a not-allowed cursor. Keyboard focus uses a visible petrol outline (2px, offset 3px).

### Inputs / Fields

White fields use a structural grey border and control corner. Place labels above their fields. Focus changes the border to petrol and adds the restrained ring. Disabled fields use a pale grey ground. Search fields keep a visible focus-within outline; semester selection remains explicitly labeled. Login fields have a larger touch height (48px).

### Navigation

Muted links receive a pale grey hover background. The current route uses white with an inset primary-border outline, a deep petrol label and stronger weight (650). Task-index selections use primary-subtle. Section labels and identity details remain quieter than navigation choices. Mobile navigation is a real drawer with a close button and focus management.

### Chips

Status chips use a semantic pale ground and corresponding dark text. Keep the status word visible; a dot alone is insufficient. These are output labels, not buttons. Interactive transcript filters instead use the control corner, a selected petrol ground and aria-pressed.

### Cards / Containers

White, border-only record sheets use the surface corner. Sheet headers separate title and actions with a divider and wrapping layout (22px 24px desktop, 18px phone). Record-table headers use table-head; table rows have tabular figures, quiet dividers and a pale hover treatment. Records keep complete values and visible named actions. Administrative rows expose a “Thao tác” trigger in the sticky final column; its native automatic popover lists existing actions as labeled buttons (44px minimum height), focuses the first available action and closes when an action is chosen. Preserve existing handlers, permissions and confirmation flows.

### Academic measures and scope

Credit and distribution measures are linear, restrained tracks (6–7px) with petrol fill. A label, value and explanatory context sit beside each measure. The shared academic scope selector provides visible context for the records it governs. Progress bars expose their accessible name and numeric range.

### Dialogs and feedback

Native modal dialogs constrain their width (840px maximum) and viewport height, restore prior focus, and permit Escape dismissal. Protected record editors open as full-height right sheets (up to 760px); profile sheets reach up to 1080px. Sticky editor headers and footers keep close/cancel/save reachable; fields reserve a 120px scroll margin. Their entrance lasts 220ms with cubic-bezier(.16,1,.3,1), and is disabled under reduced motion. Error and success feedback remains visible inside an active dialog. Loading placeholders announce their purpose without fabricated data; empty states explain a useful next step. Respect prefers-reduced-motion by disabling animation and transitions, including the subtle loading breathe (1.6s).

## Do's and Don'ts

### Do:

- Do use the shared local font and tabular figures for academic numbers.
- Do pair semantic color with a visible status label.
- Do retain labeled fields, visible keyboard focus and mobile action heights of at least 40px.
- Do contain wide tables in horizontal scroll regions and retain complete record values.

### Don't:

- Don't replace the Academic Focus palette with decorative gradients or unrelated accents.
- Don't add shadows to ordinary cards or turn records into ornamental hero panels.
- Don't encode academic status solely through color.
- Don't conceal record columns to make the page fit a small screen.
- Don't impose one overview or card composition on every academic task.
