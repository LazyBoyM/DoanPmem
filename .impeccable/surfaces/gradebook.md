# Gradebook surface contract

Target: client/src/pages/Lecturer/Dashboard.jsx, shared admin/grades and lecturer/grades.
Mode: Operate. User approved Sổ học vụ số after saying the dashboard composition was too common. This is a scoped layout/interaction amplification of Academic Focus, preserving its font, palette and shell.

Class directory on left; selected class ledger on right; unobtrusive semester identity, ruled header, three weighted grade fields, server-derived results and persistent action shelf. Names open an accessible side inspection sheet with current student/class grade facts. No invented biographical data.

Desktop table keeps adjacent scores; mobile selects and steps through one student at a time. Edited fields and unsaved student count expose state. Save responses merge one student without discarding other drafts; bulk save uses existing per-student endpoint. Dirty class/semester switches require a discard decision. Lock unavailable until drafts saved; role/access/calculation stay on existing APIs.

One restrained sheet transition on class switch; reduced motion supported. No additional fonts/colors/artwork. Scope excludes other application routes. Code first, user-pinned direction; no direction workshop needed.

## Implemented responsive layout

The desktop directory is 208px wide with a 28px gap. At 1199px and below it narrows to 174px with a 20px gap. The ledger table retains a 750px minimum width inside its own scroll region; column headings stick within that region. The desktop action shelf sticks 12px above the viewport bottom.

At 767px and below, the directory becomes a labeled class selector and the ledger becomes a student reader. The student selector and previous/next controls follow the filtered roster. All three weighted score fields, identity and saved results remain available for the selected student. Score inputs have a 48px minimum height. Export and lock controls move below the course header; a compact fixed bottom shelf carries the unsaved count and bulk-save action. The surface reserves 105px of bottom space, respects the safe-area inset and gives score inputs a 180px scroll margin. This is a local alternative to the global wide-table pattern, not a new application-wide rule.

The read-only inspector opens against the right viewport edge, up to 420px wide and full viewport height, using the shared native dialog and its focus restoration/Escape behavior. The ledger entrance is 280ms; the inspector entrance is 240ms. Both are disabled when reduced motion is requested. Print exposes the ledger table and removes reader/navigation/action controls according to the surface print rules.

## Implemented record and state behavior

Chuyên cần, Giữa kỳ and Cuối kỳ retain weights of 10%, 30% and 60%. Blank values stay null rather than becoming zero. Values outside 0–10 or nonnumeric values are invalid and prevent saving. A changed field uses the incumbent pale petrol treatment; invalid fields use the incumbent danger treatment with an announced validation message. A dirty student's result is replaced by a dash and “Chưa lưu” until the server response supplies recalculated results.

Individual and bulk save use the existing update endpoint. Each successful response merges that student's saved record while preserving other drafts. A partially failed bulk save reports progress and retains unsaved changes. Lock/unlock is unavailable while drafts remain; locked records and records being saved disable score entry. Class or semester changes with drafts require the existing discard confirmation; browser unload receives a dirty-data warning. Search includes names, student codes and class names. Inspection shows saved grade facts and explains any pending local draft.

The sheet distinguishes loading, missing semester, no class, class/student fetch failure, editable and locked states. Fetch failures expose the relevant retry action; an empty roster and no search matches have distinct guidance. The state-clarity correction was resolved with a ship disposition in [finish-review.md](../review/gradebook/finish-review.md). Accepted save/lock writes and actionable resit behavior were not exercised by the finish review; these notes describe implementation, not new end-to-end evidence.
