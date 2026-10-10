---
version: 1
slug: "client-src-app-jsx"
primary_target: "client/src/App.jsx"
related_targets: ["client/src/index.css","client/src/portalLedger.css","client/src/layouts/MainLayout.jsx","client/src/pages/Login.jsx","client/src/components/RecordWorkspace.jsx","client/src/components/RecordActions.jsx"]
---

# EduPortal global ledger rollout

Mode: Operate. Scope: every current route and state in client/src/App.jsx, including profiles, transcripts, resits, registration, timetables and admin configuration. Preserve all APIs, roles, permissions, business rules and Vietnamese content.

## Direction contract

THESIS: The user selected Academic Focus, approved Sổ học vụ số on Nhập & khóa điểm, then explicitly requested applying it across the whole UI (“áp dụng hết luôn”). Sổ học vụ số is the pinned creative north star within Academic Focus. This supersedes the earlier generic overview composition.

OWN-WORLD: preserve Source Sans 3, graphite text, white ruled sheets, neutral ground and restrained petrol actions from the actual CSS. DESIGN.md owns visual tokens; .impeccable/design.json extends them with motion, metadata and component specimens.

STORY: users locate their role-specific task, choose academic scope, read complete records and perform existing actions. Task indexes and sheets share a vocabulary while each task receives its own composition. API-derived facts remain authoritative; no invented activity or decorative controls.

FIRST VIEWPORT: desktop uses the finished 224px pale navigation rail and 72px page-ground toolbar, with 32px horizontal content gutters. Ledger page headings are 2.25rem; registry/overview/schedule indexes sit beside the record sheet. Overview counts form a quiet record index and results sit beneath the class ledger. Academic directories, transcripts, registration catalog/enrollment plan, weekly calendar/day agenda and cover/entry login retain their task-specific arrangements. On phones, indexes become controls before records, registration uses a class selector, academic tracking uses a student picker and schedules use a day agenda. Detailed tables retain complete fields within contained scroll regions; named administrative row actions remain at the trailing edge.

FORM: this is a user-pinned, code-led extension of the approved gradebook. The old Academic Focus mock is historical exploration, not the finished composition authority. Use [portal-ledger.md](portal-ledger.md), [gradebook.md](gradebook.md), actual CSS and existing source behavior for surface decisions. Protected editors and profiles open on the right with focus handling, reachable close/cancel actions and existing handlers. The native row-action popover labels each action and keeps the original permissions and confirmation paths.

FINISH: the independent [finish review](../review/portal-ledger/finish-review.md) reviewed all 74 required captures and returned ship with no material fixes. [Documentation review](../review/portal-ledger/documentation-review.md) records the authorized system refresh. This visual/source-preservation verdict does not certify accepted save/enroll/lock/resit writes, credential resets or deletes that were not exercised.
