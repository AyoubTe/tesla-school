# Tesla School

A school management system for Tesla School: students, teachers, classes, courses, timetables, grades,
attendance, announcements and login accounts, with live notifications and email.

- **Frontend:** Angular 22 (standalone components, signals, zoneless), custom design system, light and dark themes
- **Backend:** Spring Boot 4.1 on Java 21

## Run it

### Option A: everything in Docker

```bash
docker compose up --build
```

| What | Where |
|---|---|
| App | http://localhost:4200 |
| Email inbox (Mailpit catches every email the app sends) | http://localhost:8025 |
| API | http://localhost:8080/api |

### Option B: local development

Requirements: Java 21, Maven 3.9+, Node 22.22.3+ or 24.15+ (Angular 22 refuses older versions).

```bash
# 1. Mail catcher (optional but recommended: lets you read welcome / reset / absence emails)
docker run -p 1025:1025 -p 8025:8025 axllent/mailpit

# 2. Backend — uses an H2 file database in backend/data, seeded on first start
cd backend
mvn spring-boot:run

# 3. Frontend — dev server proxies /api and /ws to localhost:8080
cd frontend
npm install
npm start          # http://localhost:4200
```

To use PostgreSQL instead of H2: `mvn spring-boot:run -Dspring-boot.run.profiles=postgres`
(defaults: `jdbc:postgresql://localhost:5432/tesla_school`, user/password `tesla`; override with `DB_URL`, `DB_USER`, `DB_PASSWORD`).

## Demo accounts

Seeded on first start (1 admin, 6 teachers, 4 classes, 32 students, 20 courses, 3 weeks of attendance, graded assessments).
The sign-in page has one-click buttons for these.

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@tesla-school.edu` | `Admin@123` |
| Teacher | `marcus.hale@tesla-school.edu` | `Teacher@123` |
| Student | `amelie.laurent@tesla-school.edu` | `Student@123` |

Every teacher is `firstname.lastname@tesla-school.edu` / `Teacher@123`, every student the same pattern with `Student@123`.
Disable seeding with `SEED_DATA=false`.

## What each role can do

| | Admin | Teacher | Student |
|---|---|---|---|
| Dashboard | School-wide counts, attendance and grade dials, class averages, grade distribution | Today's lessons with roll-call status, own courses | Own average and attendance dials, today's lessons, latest grades |
| Students | Create, edit, delete | View, open profiles | — |
| Teachers / Classes / Courses | Create, edit, delete | View | View own class and courses |
| Timetable | Add/remove lessons (clash detection for class, teacher and room) | Own week, any class or teacher | Own class week |
| Grades | Any gradebook | Gradebook for own courses: post a whole assessment at once, edit/delete scores | Own grades, per-course and weighted overall averages |
| Attendance | Any course | Roll call for own courses | Own record and rate |
| Announcements | To everyone, students, staff or one class; can pin (pinned = also emailed) | To students or one class | Read |
| Accounts | List all logins, enable/disable, reset passwords, add admins | — | — |

## Backend features

**Mail** (`mail/MailService`, templates in `resources/templates/mail`) — HTML emails rendered with Thymeleaf, sent `@Async`
so requests never wait on SMTP and a mail outage is logged instead of failing the operation:

- Welcome email with a temporary password when an admin creates a student, teacher or admin
- Forgot-password link (single use, 30 minutes) and admin-initiated password reset
- New grade posted (to the student)
- Absence or late arrival (to the guardian)
- Pinned announcements (to every recipient)

**WebSockets** (`config/WebSocketConfig`) — STOMP over a native WebSocket at `/ws`. The CONNECT frame carries the same JWT
as REST calls (`config/StompAuthChannelInterceptor`), so the server can push to a specific person:

- `/user/queue/notifications` — personal notifications (persisted, with unread counts)
- `/topic/announcements` — school-wide broadcasts

In the UI the bell shows an amber spark when something arrives, a toast appears, and the sidebar draws an AC waveform while
the live link is up (flat line when it's down).

**Domain events** (`events/`) — services publish `GradesPosted`, `AttendanceTaken`, `AnnouncementPublished`,
`AccountCreated`. `SchoolEventListener` handles them `@TransactionalEventListener` + `@Async`, i.e. only after the data has
committed, creating notifications and sending emails off the request thread.

**Caching** (`spring.cache.*`, Caffeine) — class, course, teacher, timetable and admin-dashboard reads are cached and evicted
precisely on writes (`@CacheEvict`). Course filters run over the cached list. Cache stats: `GET /actuator/caches` (admin).

**Scheduling** (`scheduling/ScheduledJobs`) — weekday 07:30 (Europe/Paris) "you have N lessons today" notification to each
teacher; hourly purge of expired reset tokens.

**Security** — Stateless JWT (HS256) issued at login and validated by Spring's OAuth2 resource server; roles in a `roles`
claim; method-level `@PreAuthorize` plus ownership checks (teachers only grade/roll-call their own courses, students only
read their own records). BCrypt passwords. Errors are RFC 9457 problem details.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | dev value | **Set this in any real deployment** (32+ bytes) |
| `JWT_EXPIRATION_MINUTES` | 720 | Session length |
| `MAIL_HOST` / `MAIL_PORT` | localhost / 1025 | SMTP server |
| `MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_AUTH` / `MAIL_STARTTLS` | empty / false | For a real SMTP provider |
| `MAIL_FROM` | `Tesla School <no-reply@tesla-school.edu>` | Sender |
| `FRONTEND_URL` | http://localhost:4200 | Used in email links |
| `CORS_ORIGINS` | http://localhost:4200 | Comma-separated |
| `SEED_DATA` | true | Seed demo data into an empty database |

## API overview

All under `/api`, JSON, `Authorization: Bearer <token>` except the first three.

```
POST /auth/login · /auth/forgot-password · /auth/reset-password
GET|PUT /auth/me              POST /auth/change-password
GET /dashboard
GET|POST /students            GET|PUT|DELETE /students/{id}     GET /students/me
GET|POST /teachers            GET|PUT|DELETE /teachers/{id}
GET|POST /classes             GET|PUT|DELETE /classes/{id}      GET /classes/{id}/students
GET|POST /courses             GET /courses/mine                 GET|PUT|DELETE /courses/{id}
GET /schedule?classId=|teacherId=   GET /schedule/mine          POST /schedule   DELETE /schedule/{id}
GET /grades/course/{id} · /grades/student/{id}[/summary] · /grades/mine[/summary]
POST /grades · /grades/bulk   PUT|DELETE /grades/{id}
GET /attendance/course/{id}?date=   POST /attendance/roll-call
GET /attendance/student/{id}[/summary] · /attendance/mine[/summary]
GET|POST /announcements       DELETE /announcements/{id}
GET /notifications · /notifications/unread-count   POST /notifications/{id}/read · /notifications/read-all
GET /users   POST /users/admins   PATCH /users/{id}/status   POST /users/{id}/reset-password   (admin)
```

## Project layout

```
backend/src/main/java/edu/tesla/school/
  config/        security, JWT, WebSocket, cache/async/scheduling switches
  auth/ user/    login, password flows, account administration
  student/ teacher/ schoolclass/ course/ grade/ attendance/ announcement/   one package per domain
  notification/  persistence + WebSocket push
  mail/          Thymeleaf HTML emails
  events/        domain events and the after-commit listener
  dashboard/ scheduling/ seed/
frontend/src/app/
  core/          API client, auth, interceptors/guards, realtime (STOMP), UI state
  layout/        app shell, notification bell
  shared/        icons, modal, dial (analog meter), week grid, etc.
  features/      one folder per screen
```
