# Đặc tả tái xây dựng hệ thống quản lý đào tạo đại học — EduPortal

> Phiên bản 1.0 · 22/10/2026 · Đặc tả sản phẩm và kỹ thuật tiếng Việt.

## 0. Mục tiêu và quy ước

EduPortal là hệ thống quản lý đào tạo đại học: danh mục học thuật, chương trình, kỳ, lớp học phần, lịch/phòng, đăng ký, bảng điểm, thi lại, báo cáo và audit. Tài liệu này dựa trên code/schema/tài liệu dự án, đồng thời phân biệt rõ **[ĐÃ CÓ]** với **[ĐỀ XUẤT]**. Các quy định về điểm, GPA, tín chỉ, tiên quyết, rút học phần và thi lại phải được trường phê duyệt, version hóa theo khóa và ngày hiệu lực; không coi code demo là quy chế chính thức.

Nguyên tắc: giữ lịch sử học tập; thao tác nhạy cảm có actor/thời điểm/lý do/before-after; server/database là lớp kiểm tra cuối; enrollment/chỗ/điểm cần transaction, khóa hoặc version và chống gửi lặp; một CTA chính mỗi màn hình; trạng thái UI đầy đủ; UI tiếng Việt rõ và truy cập được.

## 1. Phạm vi và kiểm kê hiện trạng

### 1.1 Phạm vi

Trong phạm vi: tổ chức/khoa, môn/tiên quyết, chương trình, người dùng và hồ sơ, năm học/học kỳ, đợt đăng ký, lớp/lịch/giảng viên/phòng, đăng ký/hủy/chốt, nhập/khóa điểm, thi lại, transcript/tiến độ, báo cáo/export và audit.

Chưa quan sát thấy: học phí, điểm danh, khảo thí/phòng thi, LMS/tài liệu, phúc khảo đầy đủ, bảo lưu, xét tốt nghiệp, SSO/SIS chính thức. Chỉ mở rộng khi có owner và yêu cầu được duyệt.

### 1.2 Hiện trạng [ĐÃ CÓ]

| Khu vực | Hiện trạng đọc từ dự án |
|---|---|
| Frontend | React 19, Vite, Router 7; không gian Admin/Giảng viên/Sinh viên; component table/form/modal/skeleton/empty; tokens.css có density và focus-visible. |
| Backend | Express, JWT, role middleware, kiểm tra giảng viên phụ trách lớp. |
| DB | MySQL tương thích/TiDB, mysql2. README chính nêu 18 bảng; docs cơ sở vật chất có phần cài mới cũ ghi 16. Cần đối soát. |
| Đăng ký | Thêm/hủy lớp có kiểm tra đợt mở, trùng môn, tiên quyết, max tín chỉ, chỗ, lịch; chốt riêng kiểm tra min/max; thay đổi làm mất bản chốt hiện tại. |
| Chương trình | Môn bắt buộc/tự chọn, học kỳ gợi ý, validation trùng môn/tổng tín chỉ/thời lượng. |
| Lịch/phòng | Thứ 2–CN, tiết 1–12, tuần 1–53; kiểm tra giao nhau, phòng, giảng viên, sinh viên và sức chứa. |
| Điểm | Attendance/midterm/final 10/30/60; total hệ 10 làm tròn 1 chữ số, quy đổi hệ 4/chữ trong code; khóa theo lớp. |
| Thi lại | Một yêu cầu/enrollment; hiện yêu cầu tổng <4 và đủ điểm; chọn điểm cuối kỳ cao nhất sau thi lại. |
| Audit | Có UI/API đọc nhật ký, nhưng bảng audit không thấy trong schema tổng hợp đã đọc; phải xác minh nơi lưu thực tế và độ bền. |
| Chưa thấy | Scope quyền theo khoa, SSO/MFA, version policy/program, duyệt/công bố/amendment điểm, OpenAPI và tích hợp chính thức. |

### 1.3 Cần chốt trước khi chuyển đổi

- Quy chế điểm, rounding, GPA, thi lại/học lại/nâng điểm.
- Bản chốt có đóng băng không; hạn hủy/rút, ngoại lệ và cách hủy lớp.
- Logic tiên quyết AND/OR, tương đương/song hành, miễn trừ, ưu tiên chỗ.
- Calendar, timezone, kỳ nghỉ/tuần học; quyền sửa điểm và phúc khảo.
- Số lượng người dùng, tải đỉnh, SLA/RPO/RTO, nguồn dữ liệu, SSO/SIS/LMS, PII/retention.

## 2. Mô hình miền

- **Môn học:** catalog tái sử dụng, tín chỉ, đơn vị, tiên quyết, assessment policy.
- **Chương trình:** version khung đào tạo, tổng tín chỉ, môn/nhóm môn, khóa và ngày hiệu lực.
- **Học kỳ/đợt:** thời gian tổ chức và cửa sổ đăng ký cho một tập đối tượng.
- **Lớp học phần:** lần mở môn trong kỳ, sĩ số, giảng viên, lịch, phòng.
- **Enrollment:** quan hệ học viên-lớp, trạng thái nháp/hiệu lực/rút/hủy.
- **Submission:** snapshot đã chốt; ý nghĩa pháp lý cần trường quyết định.
- **Attempt:** lượt học môn, thi lại và học lại được tách riêng.
- **Grade:** điểm thành phần/kết quả theo policy version.
- **Academic standing:** trạng thái tính theo quy chế và dữ liệu đầy đủ, không suy diễn từ thiếu dữ liệu.

## 3. Vai trò và quyền

Dùng RBAC + ABAC theo đơn vị, chương trình, kỳ, lớp phụ trách, chủ hồ sơ và state. Mặc định từ chối; kiểm tra server ở từng object/field, không dựa vào ẩn nút.

| Quyền | Admin hệ thống | Giáo vụ (đề xuất role riêng) | Giảng viên | Sinh viên |
|---|---|---|---|---|
| Tài khoản/cấu hình | Quản trị; không tự nâng quyền | Không mặc định | Không | Cá nhân |
| Catalog/chương trình | Toàn trường | Theo scope | Đọc cần thiết | Khung của mình |
| Kỳ/đợt/lớp/lịch | Toàn trường | Điều phối scope | Lớp phụ trách/đề nghị đổi | Xem lớp phù hợp |
| Đăng ký | Ngoại lệ có audit | Hỗ trợ có lý do | Xem roster | Thêm/hủy/chốt mình |
| Điểm | Ngoại lệ qua duyệt | Duyệt/khóa policy | Nhập lớp phụ trách | Xem điểm công bố |
| Báo cáo/audit | Scope rộng theo nhiệm vụ | Theo scope | Lớp phụ trách | Tiến độ cá nhân |

Hiện chỉ có ADMIN/LECTURER/STUDENT. Tách giáo vụ/khoa/kiểm toán là đề xuất cần phê duyệt và mapping. Không cho tự đổi role; giữ một admin hoạt động; giảng viên chỉ truy cập lớp được phân công; sinh viên lấy student_id từ server session; export/hồ sơ nhạy cảm có scope và audit; delegation có thời hạn/lý do; thao tác nhạy cảm kiểm tra role/status hiện tại trong transaction.

## 4. Quy trình nghiệp vụ end-to-end

### 4.1 Catalog và chương trình

1. Cấu hình khoa/chương trình.
2. Tạo môn với mã duy nhất, tín chỉ, thời lượng, đơn vị, đánh giá, tiên quyết.
3. Biểu diễn prerequisite AND/OR, song hành, điểm tối thiểu; phát hiện chu trình.
4. Gắn bắt buộc/tự chọn/nhóm lựa chọn, học kỳ gợi ý, tổng tín chỉ.
5. Phê duyệt version mới có hiệu lực; không sửa hồi tố cho người học hiện tại.

Hiện có program/subject/prerequisite/program_subjects; chưa thấy version và logic OR.

### 4.2 Lập kỳ và mở lớp

Tạo kỳ/năm học, tuần/lịch nghỉ → chọn program version và môn → lập lớp/giảng viên/sĩ số → xếp lịch/phòng → validate capacity, phòng, giảng viên, lịch sinh viên → preview/công bố → thay đổi sau khi có enrollment phải thông báo và lưu lý do. Vòng đời lớp dự kiến: DRAFT → OPEN → FULL/CLOSED → IN_PROGRESS → GRADING → COMPLETED; nhánh CANCELLED có workflow riêng.

### 4.3 Mở đăng ký

Cấu hình kỳ, nhóm đối tượng, giờ mở/đóng, min/max tín chỉ, tiên quyết, ưu tiên, hạn rút. Không để các đợt chồng nhau trên cùng đối tượng trừ chủ đích. Checklist lớp/phòng/giảng viên/policy/cutoff/thông báo phải đạt. Đợt đã có giao dịch không xóa vật lý.

### 4.4 Sinh viên đăng ký

1. Chọn kỳ, thấy lớp theo khung, điều kiện, lịch/GV/phòng/chỗ/tín chỉ.
2. Mỗi lớp không khả dụng giải thích nguyên nhân và cách khắc phục.
3. Thêm/bỏ; server kiểm tra trùng môn, tiên quyết, lịch, đối tượng, capacity, tín chỉ, trạng thái học vụ.
4. Chốt chạy validation lần cuối trên dữ liệu mới nhất; lưu snapshot + audit nguyên tử.
5. Lỗi trả theo lớp/trường; không commit một phần nếu policy không cho.
6. Sau chốt mọi sửa đổi tạo version mới; thông báo xác nhận/hạn điều chỉnh.

Hiện add/cancel và submit riêng; mutation xóa submission. Đề xuất tách giỏ nháp khỏi enrollment chính thức; cần chủ nghiệp vụ duyệt semantics.

### 4.5 Hủy lớp/đổi lịch

Hủy có reason/approver/effective time và preview tác động; không xóa enrollment/grade; quyết định chuyển/hoàn tín chỉ theo quy chế. Đổi lịch kiểm tra phòng/GV/sinh viên và gửi thông báo. Ngoại lệ vào queue giáo vụ.

### 4.6 Điểm

Giảng viên nhập nháp; server xác thực đúng policy của lớp; submit để duyệt (nếu trường yêu cầu) → approve → publish → lock. Sau khóa, yêu cầu amendment có lý do và phê duyệt độc lập, lưu trước/sau/version; thông báo sinh viên và thời hạn khiếu nại. Hiện có 10/30/60 và lock; workflow/version là đề xuất. Không coi quy đổi code là quy định phổ quát.

### 4.7 Thi lại/học lại/tiến độ

Tách thi lại, học lại môn trượt, học lại nâng điểm; cấu hình điều kiện, số lần, hạn và cách tính. Lưu từng attempt, snapshot điểm, policy và actor; transcript thể hiện lịch sử. Progress cho biết môn/credits/điều kiện còn thiếu, cảnh báo có giải thích. Hiện code cho một resit/enrollment, tổng <4 đủ ba điểm, chọn final cao nhất; GPA chọn điểm môn cao nhất và credits đạt tính một lần—cần xác nhận quy chế.

### 4.8 Báo cáo

Báo cáo registration/capacity/chưa chốt; điểm thiếu/chờ duyệt/khóa; tiến độ theo chương trình/khóa. Export theo filter, có timestamp/timezone/scope, giới hạn hàng, audit, formula injection protection. Số liệu đối soát về bản ghi gốc và ghi rõ thời điểm snapshot.

## 5. State transitions

- **Học kỳ:** `DRAFT → PLANNED → REGISTRATION_OPEN → TEACHING → GRADING → COMPLETED → ARCHIVED`; mỗi chuyển có quyền/time/actor/reason; không xóa kỳ có dữ liệu.
- **Lớp:** `DRAFT → OPEN → FULL/CLOSED → IN_PROGRESS → GRADING → COMPLETED`; nhánh `CANCELLED`; grade lock tách khỏi lifecycle.
- **Đăng ký:** `DRAFT → ENROLLED/CONFIRMED → WITHDRAWN`; nhánh `CANCELLED_BY_INSTITUTION`, `TRANSFERRED`, `REJECTED`. Lưu version/event và idempotency key.
- **Điểm:** `DRAFT → SUBMITTED → APPROVED → PUBLISHED → LOCKED`, nhánh amendment.
- **Resit:** `ELIGIBLE → REQUESTED → SCHEDULED → COMPLETED`, nhánh WITHDRAWN/REJECTED/EXPIRED.

## 6. Mô hình dữ liệu mục tiêu

### 6.1 Nguyên tắc

Khóa ổn định, mã unique theo scope, UTC lưu trữ/Asia-Ho_Chi_Minh hiển thị, DECIMAL cho điểm, FK/CHECK/UNIQUE/index, `created_at/by`, `updated_at/by`, `version`, state và source. Snapshot program/policy để tái dựng lịch sử. Không cascade delete học vụ; tối thiểu PII.

### 6.2 Thực thể đích đề xuất

| Nhóm | Thực thể | Mục đích |
|---|---|---|
| Tổ chức | departments, programs, program_versions, program_subjects, subject_groups | Version khung theo khóa/hiệu lực, nhóm môn. |
| Catalog | subjects, subject_prerequisites, assessment_policies/components | Logic tiên quyết, weights/rounding/grading scale versioned. |
| Identity | users, roles, permissions, user_roles, role_scopes, students, lecturers | Hồ sơ riêng tài khoản, scope. |
| Calendar | academic_years, semesters, calendar_exceptions, registration_periods/targets | Kỳ, lịch nghỉ, đối tượng và policy. |
| Class | course_classes, class_instructors, class_schedules, buildings, rooms, room_features | Lớp, lịch, tài nguyên. |
| Enrollment | registration_drafts, enrollments, enrollment_events, registration_submissions, submission_items, capacity_reservations | Draft, history, snapshot, chỗ cạnh tranh. |
| Grading | gradebooks, grades, grade_components, grade_publications, grade_amendments | Điểm versioned/duyệt/công bố. |
| Attempts | attempts, resit_requests, retake_equivalencies | Học/thi nhiều lượt, chọn kết quả. |
| Platform | audit_events, notifications, outbox_events, imports, integration_runs, idempotency_keys | Audit/integration/notify/replay. |

### 6.3 Mapping từ schema hiện tại

| Bảng | Chuyển đổi |
|---|---|
| users | Giữ ID; role/scope/session/status chuẩn hóa. |
| departments/programs/subjects | Giữ mã; thêm program version và assessment policy. |
| students/lecturers | Giữ ID; scope PII và trạng thái từ nguồn chuẩn. |
| prerequisites | Thêm loại/nhóm logic/version; kiểm tra cycle. |
| semesters/registration_periods | State machine, targets/policy, không xóa lịch sử. |
| classes/schedules/buildings/rooms | Giữ ID; chuẩn hóa nhiều GV nếu cần, schedule và legacy room flag. |
| enrollments/submissions | Event history, snapshot item/version; unique phù hợp lượt học. |
| grades/resit_attempts | FLOAT→DECIMAL, policy/gradebook version, approve/publish/amend. |
| audit_logs | Xác minh DB; audit_events append-only có retention/PII filtering. |

Ràng buộc: unique canonical username/email, student/lecturer/subject/class code, room code theo tòa, subject theo program-version. Index enrollment(student,semester,status), classes(semester,status,subject,lecturer), schedule(room/day/week), grade(enrollment), audit(actor/object/time). `current_students` không là nguồn duy nhất; dùng count có transaction hoặc counter có reconciliation. Chỗ cuối cần row lock/reservation; lịch dùng interval nửa mở; delete restrict/archive.

## 7. API và tích hợp

### 7.1 API contract

REST `/api/v1`, OpenAPI 3, UTF-8, ISO-8601 offset. List server-side `page/page_size/sort/filter/q`, trả `items,total`. Mutation `Idempotency-Key`; update `version`/If-Match. Lỗi gồm `code/message/fields/correlation_id/retryable`; không trả SQL/stack. Owner/scope lấy từ server identity và DB. Validate schema, giới hạn payload/rate.

### 7.2 Endpoint mục tiêu

| Nhóm | Mẫu endpoint | Quyền |
|---|---|---|
| Session | `POST /auth/sessions`, `GET /me`, `DELETE /auth/sessions/current` | Public có rate limit/user |
| Catalog | `/departments`, `/subjects`, `/programs`, `/program-versions/:id/curriculum` | Admin/giáo vụ scope |
| Calendar | `/academic-years`, `/semesters`, `/semesters/:id/transition` | Admin/giáo vụ |
| Classes | `/course-classes`, `/:id/schedule`, `/:id/cancel` | Giáo vụ |
| Periods | `/registration-periods`, `/:id/open|close` | Giáo vụ |
| Student registration | `/me/registration-options`, `/me/registration-draft`, `/me/registration-submissions`, `/me/enrollments/:id/withdraw` | Sinh viên |
| Gradebook | `/course-classes/:id/gradebook`, `/gradebook/drafts`, `/gradebook/submit`, `/gradebook/publish`, `/grade-amendments` | GV phụ trách/duyệt |
| Resit | `/me/resit-requests`, `/resit-requests/:id/result` | Student/GV được giao |
| Progress | `/me/transcript`, `/students/:id/progress` | Self/cán bộ scoped |
| Report/export | `/reports/registration|grading|progress`, `/exports` | Scope + audit |
| Audit/import | `/audit-events`, `/imports` | Auditor/role giới hạn |

### 7.3 Integrations (đề xuất, chưa khẳng định đã có)

SIS/HR import có manifest/checksum/source IDs và lỗi từng dòng; SSO OIDC/SAML nếu có IdP; email/SMS/in-app qua outbox, retry và dedup; LMS roster adapter idempotent, không đẩy điểm nếu chưa có contract; file store có malware scan/signed link/scope. Export lớn chạy job, tải link có hạn, formula injection protection. Mỗi connector có owner/version/timeout/retry/dead-letter/replay/health/reconciliation.

## 8. Validation và trường hợp biên

### 8.1 Validation

Mã trim/Unicode normalize/canonical unique ở DB; start<end và timezone rõ; tín chỉ integer theo policy; điểm finite, range/precision đúng policy, null khác 0, rounding xác định một lần; lịch ngày/tiết/tuần và giao nhau; capacity/room/lecturer/student conflicts; email/phone theo quy định; file mime thật, giới hạn kích thước/dòng, encoding và formula.

### 8.2 Edge cases

| Ca | Hành vi |
|---|---|
| Hai người lấy chỗ cuối | Một thành công; người kia hết chỗ và thấy thay thế. |
| Retry/double-click | Idempotency, không tăng enrollment/counter trùng. |
| Cutoff đúng thời điểm | Đồng hồ server; ranh giới được định nghĩa nhất quán. |
| Đổi lịch song song đăng ký | Lock/version, không commit trên dữ liệu lịch cũ. |
| Hủy lớp đã có điểm | Không xóa; phê duyệt, thông báo, quyết định tín chỉ. |
| Tiên quyết pending | Không coi là đạt; nêu trạng thái/ngoại lệ policy. |
| Môn tương đương/song hành | Cấu hình version, không hardcode IDs. |
| Đổi chương trình | Giữ version tại thời điểm học; transcript không hồi tố. |
| Hủy sau chốt/cutoff | Policy + quyền; ngoại lệ cần reason/approval. |
| Điểm thiếu hoặc 0 | NULL khác 0; draft khác published. |
| Sửa điểm khóa | Amendment độc lập, lưu before/after và thông báo. |
| Thi lại thấp hơn | Theo policy, không tự max nếu chưa quy định. |
| Tài khoản khóa giữa phiên | Request kế tiếp từ chối, kiểm tra status hiện hành. |
| Export/import lỗi | Job/preview, lỗi từng dòng, giới hạn, chống injection. |
| Legacy room | Cờ cần xác minh, không tin capacity ước tính. |
| Ngày nghỉ | Calendar exceptions ngăn buổi học giả. |
| Mã khác case | DB canonical unique, không chỉ frontend. |

Transaction cho registration/capacity/chốt, lịch, open/close, grade lock/publish/amend, hủy lớp, đổi role. Outbox cho thông báo sau commit; DB constraint bảo vệ cuối.

## 9. Security, privacy, audit

- Bỏ secret JWT fallback; secrets từ manager, rotation, access ngắn, refresh opaque hashed/revocable. SSO/MFA theo chính sách; rate limit/backoff; password hash mạnh và reset one-time.
- Cookie HttpOnly/Secure/SameSite khi dùng; CSP/XSS controls; TLS, CORS allowlist, security headers, CSRF nếu cookie, parameterized queries, validation/rate limits.
- RBAC/ABAC từng endpoint/object; kiểm thử IDOR, stale token, role escalation, export leakage.
- Runtime/migration DB credentials tách biệt, least privilege; backup encrypted/restore drill; log không chứa PII/điểm/token. Retention do trường/pháp chế duyệt.
- Audit append-only ghi event, occurred_at, actor, role/scope, action, object, correlation ID, reason, result, policy version, before/after đã lọc. Ghi cùng transaction với mutation; quyền đọc riêng; export audit cũng được ghi nhận.
- UI/API audit hiện có nhưng schema tổng hợp thiếu bảng; xác minh DB thật, không dựa vào mock/in-memory.
- Metrics p95/error/capacity/transaction/outbox; alert không chứa PII; runbook giờ mở đăng ký/nhập điểm, kill switch có audit.

## 10. Hệ thống UI/UX

### 10.1 Art direction

Workbench học vụ cao cấp: chuyên nghiệp, tiết chế, bảng/filter, phân cấp rõ, mật độ cao có nhịp. Desktop-first 1440, tablet 1024, mobile tập trung sinh viên. Sidebar 248px/compact 64px, topbar 56px, lề 24px. Một primary action mỗi vùng. Không hero, gradient rực, glassmorphism, card soup, display font, animation dài.

### 10.2 Tokens

`A/client/src/styles/tokens.css` là nền hiện có; chuẩn hóa alias semantic, kiểm contrast thật trước phát hành, không hardcode trong component.

| Token | Mục tiêu |
|---|---|
| canvas/surface/subtle | `#F6F8FB` / `#FFFFFF` / `#F8FAFC` |
| border/strong | `#DCE3EC` / `#B8C4D3` |
| text primary/secondary/muted | `#172033` / `#46546A` / `#64748B` |
| accent/hover | `#2457A6` / `#1D478A` |
| success/warning/danger/info | `#18794E` / `#9A5B00` / `#B42318` / `#176B87` |
| spacing | 4, 8, 12, 16, 20, 24, 32, 40, 48px |
| radius | 4, 6, 8, 12px; pill chỉ cho badge |
| shadow | shadow 1px nhẹ; modal 0 16px 40px, dùng ít |
| type | System UI/Inter có tiếng Việt; 12,13,14,16,18,22,28px; line-height 1.4–1.55 |
| table | compact 32px/row; comfortable 40px; tabular numeric |

Chữ thường contrast ≥4.5:1; focus ring 2px offset. Target desktop ≥32px, mobile ≥44px. Màu trạng thái luôn kèm nhãn/icon.

### 10.3 Component system

| Component | Yêu cầu |
|---|---|
| Button | primary/secondary/tertiary/danger, sizes, disabled/loading, nhãn. |
| Input/Search | label, helper/error, clear, keyboard; placeholder không thay label. |
| Select/Combobox | tìm kiếm, keyboard, loading/empty/error. |
| Table | sticky header, aria-sort, selection/bulk, density, pagination, row actions không phụ thuộc hover. |
| Modal/Drawer | focus trap/Escape/restore; confirm destructive; lỗi giữ form. |
| Tabs | ARIA/keyboard, state/filter hợp lý. |
| Badge | semantic label + icon. |
| Toast/Alert | success ngắn; error inline có recovery. |
| Skeleton/Empty | đúng kích thước; empty nêu lý do và next action. |
| Density | nhớ preference, không reset filters. |
| Date/time | keyboard, timezone/cutoff rõ. |
| Grade cell | tab order, paste preview, validate, dirty/saved/error. |

Mỗi control có disabled/loading/error; table/list có loading/empty/error; form giữ dữ liệu khi lỗi. Component không tự hardcode domain policy.

### 10.4 Shell/điều hướng

Sidebar nhóm Tổng quan, Đào tạo, Học vụ, Báo cáo, Hệ thống; kỳ/ngữ cảnh rõ. Topbar có đơn vị, kỳ, tìm nhanh, thông báo, profile. Danh sách: title/CTA → filters/chips → bulk bar khi chọn → table → totals/pagination. Drawer cho đọc nhanh; lưu truy vấn cá nhân là cải tiến; không để PII trong URL công khai.

### 10.5 Screen-by-screen

#### A. Đăng nhập

- **Mục tiêu:** vào đúng cổng, không tiết lộ tài khoản có tồn tại hay không.
- **Wireframe:** tên cổng → heading → tài khoản/mật khẩu/hiện ẩn → inline error → đăng nhập → SSO/trợ giúp nếu được duyệt.
- Loading trên button, lockout/recovery, SSO; auto-focus/Enter/autocomplete; tắt demo role switch production.

#### B. Dashboard Admin/Giáo vụ

- **Mục tiêu:** xác định việc cần xử lý trong kỳ.
- **Wireframe:** kỳ + CTA kế hoạch → 3–4 số vận hành có link → queue lớp thiếu lịch/đợt sắp đóng/grade chờ/sinh viên chưa chốt → activity → lối tắt.
- Skeleton từng khu; kỳ trống có setup; lỗi khối có retry; mutation refresh. Chỉ dùng số có query đáng tin; ưu tiên queue hơn KPI trang trí.

#### C. Học kỳ/đợt

Chọn năm/kỳ → state timeline → table → drawer tạo/sửa → tab đợt/đối tượng/limits → preview/audit. Empty có hướng dẫn; kỳ có dữ liệu không xóa; conflict chỉ ra bản ghi; giữ form khi lỗi. CTA theo tab; mở kỳ sau checklist.

#### D. Môn/chương trình

Môn: search code/name, filter khoa → table mã/tên/credits/prereq → drawer. Chương trình: version → tổng tín chỉ → table nhóm bắt buộc/tự chọn → kỳ gợi ý → validation → save/approve. Import preview/lỗi dòng; môn đã dùng không xóa; cycle/version lỗi rõ.

#### E. Danh sách sinh viên/hồ sơ

Filters kỳ/chương trình/khóa/status → bảng mã/tên/lớp/tín chỉ/GPA/cảnh báo → drawer tabs thông tin/progress/transcript/history. Server pagination; dữ liệu thiếu không gán standing; lỗi quyền không tiết lộ hồ sơ; export filter có audit; không xóa hồ sơ có history.

#### F. Lớp học phần

Kỳ → filters môn/khoa/status/GV → table code/course/capacity/GV/lịch/phòng → bulk → drawer Tổng quan/Lịch/Sinh viên/Điểm. Multi-slot editor tuần, conflict preview cụ thể; legacy room warning; hủy lớp cho xem tác động.

#### G. Đăng ký sinh viên

- **Desktop:** kỳ/countdown → selected credits/min-max/submission → filter + class table (course/GV/time/room/seats) → giỏ sticky + mini timetable → Chốt → review modal.
- **Mobile:** compact list, filter bottom-sheet, giỏ/CTA dễ chạm, lịch ngang.
- Lý do unavailable rõ; states chưa mở/no class/concurrent seat loss/success/per-class error/offline. Draft riêng với enrollment nếu policy duyệt.

#### H. Thời khóa biểu

Kỳ/tuần → grid ngày × giờ với course/class/GV/phòng/tòa/tầng → list trên mobile → print/export nếu có quyền. Empty; cập nhật gần đây; timezone và legacy room rõ.

#### I. Nhập điểm

Breadcrumb lớp/kỳ → search/status → table cố định mã/tên, component scores, total preview, save status → sticky bar dirty count/Lưu nháp/Gửi duyệt. Keyboard tab/enter, paste preview, inline validation, version conflict reload, locked readonly. Batch save có feedback; policy weights rõ; không autosave âm thầm.

#### J. Transcript/tiến độ sinh viên

Tóm tắt credits/GPA theo kỳ/tích lũy → progress khung → bảng môn/lượt/điểm/trạng thái/resit-retake → filter/export chính thức. Phân biệt pending với zero, draft với published, result amendment với ngày. Mobile ưu tiên progress.

#### K. Tòa/phòng

Tabs building/room/legacy → filters → table → detail drawer/history. Không xóa tài nguyên đã dùng; capacity conflict rõ; legacy flag; lịch nhiều buổi kiểm tra conflict.

#### L. Tài khoản/quyền/audit

Tài khoản: filter username/role/status/scope → table → drawer quyền/session → khóa/reset có reason. Audit: actor/action/object/time/correlation → event table → detail before/after đã lọc PII. Không hiện password/token/IP quá mức; export lớn thành job.

### 10.6 Trạng thái và microcopy

- Loading: skeleton theo bố cục, giữ dữ liệu/filter khi refresh.
- Empty: “Chưa có lớp học phần cho học kỳ này” + hành động phù hợp quyền.
- Error: nêu nguyên nhân và recovery: “Lớp vừa hết chỗ. Danh sách đã cập nhật; hãy chọn lớp khác.”
- Success cụ thể: “Đã chốt 18 tín chỉ cho học kỳ 1, năm học 2026–2027.”
- Conflict: dữ liệu đã đổi, cho reload/compare; không overwrite âm thầm.

### 10.7 A11y/responsive

WCAG 2.2 AA mục tiêu, contrast kiểm thực, zoom 200%, reflow 320px. Landmark/semantic table, label/helper/error aria, live region, focus trap/restore, keyboard-only đăng ký/nhập điểm. aria-sort, checkbox label, row action không chỉ hover; reduced motion. 1440/1024 desktop/tablet; mobile list/disclosure; tên dài và tiếng Việt cần kiểm tra. Target 32px desktop/44px touch.

## 11. Kiểm thử và nghiệm thu

Đây là kế hoạch đề xuất, chưa phải xác nhận test đã chạy.

1. Unit: grade policy/rounding, prerequisite graph, interval overlap, GPA, eligibility, state transitions.
2. API/service: scope, validation, idempotency, pagination/filter, audit.
3. DB integration: FK/unique/check, transactions/locks, seat race, migration rollback.
4. E2E: kỳ→lớp→đợt→đăng ký/chốt→grade publish→transcript/resit/audit.
5. Concurrency: chỗ cuối, cùng version, cutoff đồng thời.
6. Security: IDOR, escalation, stale token, brute force, SQLi/XSS, CSRF/CORS, CSV injection, export leakage.
7. A11y/visual: keyboard/screen reader/contrast/zoom/reflow 1440/1024/390.
8. Migration: counts/checksums, orphan/duplicate, transcript sample, legacy rooms, rollback drill.
9. Performance p95/SLA, N+1, export nền.
10. UAT ba vai trò với ngoại lệ, ký xác nhận policy.

Acceptance: capacity không oversell; retry không nhân đôi; audit đầy đủ; không IDOR; rule tính server-side; khóa điểm chỉ sửa qua amendment; NULL khác zero, draft khác published; transcript tái tạo theo policy version; export đúng scope/filter; mọi luồng có loading/empty/error/success/conflict; keyboard complete; migration có backup/rehearsal/reconciliation/rollback.

## 12. Rollout

- **GĐ0 Khám phá:** policy register có owner, phê duyệt, ngày hiệu lực; traffic/SLA/RPO/RTO.
- **GĐ1 Nền tảng/dữ liệu:** schema/API/audit/outbox/scope/theme; backup, mapping, staging rehearsal, orphan/duplicate/legacy room check; không seed DB đang có data.
- **GĐ2 Vertical slices:** catalog+kỳ/lớp/lịch → registration/concurrency → gradebook/workflow/transcript → report/import/export/integration.
- **GĐ3 Pilot:** khoa/khóa/kỳ nhỏ, read-only song song hoặc pilot; đối soát count/lịch/enrollment/grade/transcript; feature flags/đào tạo/support. Tránh dual-write không có reconciliation.
- **GĐ4 Cutover:** freeze thông báo, final backup/delta, checksum, cutover, metrics đăng ký/capacity/latency/outbox; rollback theo ngưỡng; giao dịch mới cần forward reconciliation.
- **GĐ5 Ổn định:** qua chu kỳ nghiệp vụ quan trọng, owner xác nhận, archive hệ thống cũ theo retention, update runbook.

Production checklist: policy/roles duyệt; secrets/TLS/MFA theo yêu cầu; restore test; audit/outbox persistent; peak concurrency; không demo credential; CORS/headers/rate/monitor/runbook; import/export/reconcile/rollback; UAT+a11y+support.

## 13. Ưu tiên

- **P0:** chốt/version policy, audit bền, transaction/idempotency capacity, object auth, không cascade, workflow điểm/hủy lớp, migration an toàn.
- **P1:** program version, work queue dashboard, bulk/filter/import, resource schedule, transcript, notification, OpenAPI, pagination/metrics.
- **P2:** SSO/MFA, SIS/LMS, phúc khảo, tài liệu, điểm danh, xét tốt nghiệp, forecasting/mobile theo nhu cầu.

## 14. Quyết định chủ sản phẩm

1. Thang điểm/weights/rounding/GPA/chọn điểm.
2. Phân biệt thi lại, học lại, cải thiện; hạn và số lần.
3. Ý nghĩa của chốt và quyền hủy/rút sau cutoff.
4. Min/max credits, prerequisite/equivalence/co-enrollment/priority.
5. Ba role hay tách giáo vụ/khoa/auditor; scope.
6. Duyệt điểm/amendment/phúc khảo/audit.
7. Calendar/timezone/holiday/week/exams.
8. Source of truth, SSO/SIS/LMS/notification owner/SLA.
9. Retention/anonymization/export theo pháp chế.
10. Scale, availability, performance, RPO/RTO.
11. Phạm vi có học phí/tài liệu/điểm danh/khảo thí/tốt nghiệp không.

## Phụ lục A — Tài liệu dự án đã đối chiếu

- `A/README.md`, `A/docs/Hoan-thien-chuc-nang.md`, `A/docs/Quy-tac-toa-phong-hoc.md`.
- `A/database/tables.sql`, `A/schema.sql`, `A/database/tables/*.sql`.
- `A/server/src/routes/api.js`, controllers và services về auth/registration/grades/academic/facilities.
- `A/client/src/App.jsx`, sidebar, dashboards, registration/grade pages và `A/client/src/styles/tokens.css`.

**Kết thúc.** Mọi mục [ĐỀ XUẤT] cần chủ sản phẩm/quy chế trường phê duyệt trước khi cấu hình thành quy tắc học vụ có hiệu lực.
