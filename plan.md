# PSScript Manager – Frame & Design Execution Plan

This plan describes how to shape the product experience, service boundaries, and delivery approach so the application works as intended. It focuses on framing the user experience, API surfaces, data flows, and operational practices. Where possible, concrete examples illustrate the expected behaviors. The target delivery snapshot is **12/18/25**, with a modern, delightful interface and agentic workflows that keep experts productive while being safe by default.

## 1) Objectives & Success Criteria
- Deliver an end-to-end script management experience covering upload, categorization, AI analysis, secure execution, and auditability.
- Maintain predictable performance (P95 page load < 2.5s, API P95 < 400ms for non-AI endpoints) and safety (no arbitrary PowerShell on shared host, encrypted transport, least-privilege data access).
- Provide AI assistance that is explainable (show evidence: findings, severity, remediation) and traceable (persisted analysis, versioned embeddings).
- Support voice/assistant features without blocking core CRUD; fall back to text-only gracefully.

## 2) Experience Frame (Frontend)
**Tech:** React + TypeScript + Vite, Material UI + Tailwind, React Query, Axios.

### 2.1 Design Language (Modern Look & Feel)
- **Visual system:** soft-dark theme by default (charcoal #111827 background, cards #1F2937, accent indigo #6366F1, success teal #14B8A6, warning amber #F59E0B, danger rose #F43F5E). Light mode is available via toggle and persists per user.
- **Typography:** Inter or Manrope, 14px base, 20px line height, medium/semibold for headings. Consistent letter spacing for code blocks using JetBrains Mono.
- **Spacing & layout:** 8px grid, generous whitespace for focus. Use glassmorphism-style overlays for drawers/modals with subtle blur (6–8px) and 70–80% opacity.
- **Micro-interactions:**
  - Hover states with 4px lift + shadow, focus rings using accent color at 2px thickness.
  - Animated progress indicators for uploads/analysis (indeterminate → determinate as data arrives).
  - Toasts slide-in from top-right, dismiss after 4s with accessible close button.
- **Charts & visualization:** sparkline trends for upload and analysis throughput; radial progress for completion; risk heatmap for findings.

### 2.2 Navigation Shell
- **Global layout:** left rail for navigation, top bar for account/status, main content panel, right drawer for contextual insights (AI tips, recent actions, voice transcript).
- **Routes:** `/dashboard`, `/scripts`, `/scripts/:id`, `/analyze`, `/run`, `/search`, `/chat`, `/admin`.
- **State:** React Query caches API calls; Zustand/Context for session + UI state; React Router for routing.
- **Component library usage:** Material UI theming with Tailwind utility classes for precise spacing; use MUI DataGrid Pro for tables with virtualized rows.

### 2.3 Key Screens & Behaviors (Detailed + Examples)
- **Dashboard:**
  - Cards for “Recent uploads”, “Pending analyses”, “Recent executions”, “AI chat shortcuts”.
  - Example empty state: “No uploads yet — drop a .ps1 file or try the guided sample script.” CTA buttons: Upload, Analyze sample.
  - Microcopy on cards shows trends: “+3 analyses today vs yesterday”.
- **Script Library (`/scripts`):**
  - Table with column chooser, density toggle, and saved filter presets. Quick filter chips for `Severity:High`, `Tag:network`, `Owner:me`.
  - Bulk actions: tag, move category, quarantine, export findings. Inline row-level severity badges and analysis status chips.
  - Example query: “All PowerShell with severity >= High and tag:network” shows 12 results; list view supports keyboard navigation (j/k) and batch selection (shift-click).
- **Script Detail (`/scripts/:id`):**
  - Tabs: Overview (metadata, tags, versions), AI Analysis (findings, remediation, scores), Execution History (runs, status, logs, outputs), Similar Scripts (vector search results), Activity (audit trail).
  - Code viewer with copy, download, line numbers, and inline diff between versions. Badge for trust level (Verified, Community, Quarantined).
  - Example: Version 5 flagged with High severity; “See remediation →” opens a side panel with steps and “Create Jira ticket” action.
- **Upload Flow:**
  - Drag-and-drop or file picker with validation (file type, max size) and preflight virus scan indicator.
  - Optional metadata (title, category, tags, privacy). Progress bar shows staged → uploaded → queued for analysis.
  - After upload, enqueue analysis automatically; status chip cycles “Analyzing… → Completed” or “Failed (retry)”.
  - Example: User uploads `network.ps1` (2.1 KB), system flags missing TLS validation, severity High; user can click “Auto-fix suggestion”.
- **AI Analysis (`/analyze`):**
  - Form with script picker or paste field, analysis depth selector (Quick, Standard, Deep), toggles (security focus, performance focus), and model selector (default safe model).
  - Output panel lists findings with severity badges, remediation text, impacted lines, and references to OWASP/PowerShell best practices.
  - Export as Markdown/PDF and “Share to chat” for team discussion.
  - Example: Deep analysis returns 7 findings; user expands “Hardcode credential detection” to view recommended `Get-Credential` pattern.
- **Execution Console (`/run`):**
  - Request panel (script version, parameters, environment profile, timeout), guard rails (dry-run flag, resource limits), confirmation modal, and live log stream with ANSI color rendering.
  - “Why blocked?” banner for denied runs with policy explanation and override request button.
  - Example: Execution aborted at 38s due to egress policy; user receives log snippet and audit entry link.
- **Search (`/search`):**
  - Keyword + vector search toggle; results grouped by relevance, with snippets highlighting risky patterns. Filters for severity, tags, owner, model version.
  - Example: Search “remote registry query” returns top 5 scripts with similarity scores; user saves search as preset “Registry hardening”.
- **Chat/Voice (`/chat`):**
  - Threaded chat with slash-commands (`/analyze <scriptId>`, `/summarize`, `/find similar`, `/run --whatif <scriptId>`). Tool-call responses show structured cards.
  - Voice UI: record button, waveform, transcription preview, confidence indicator; fallback to text if mic unavailable. “Push-to-talk” shortcut (`space`) and noise-level meter.
  - Example: User says “Analyze the latest `network harden` script for security only”; agent triggers analysis, returns findings with severity chips and “Schedule rerun” CTA.
- **Admin (`/admin`):**
  - User roles, API keys, service health cards (AI service, executor, DB, Redis), audit log viewer, and feature flag toggles.
  - Example: Admin toggles “Allow voice features” off globally; UI surfaces banner in `/chat` explaining the policy.

### 2.4 UX Conventions
- Empty states with guidance and sample actions; include sample scripts to explore.
- Toasts for success, inline errors for validation, retry buttons on network failures.
- Loading skeletons for table and detail views; optimistic updates for metadata edits.
- Accessibility: keyboard navigation, aria labels, high-contrast mode toggle, 4.5:1 contrast minimum.
- Mobile-friendly layouts (cards stack, table becomes list with key badges). Sticky action bar for uploads and runs.

### 2.5 Beautiful Interface Checklist (12/18/25 release bar)
- Harmonized color tokens and elevation scale documented in design tokens JSON.
- Iconography via Tabler or Lucide; consistent stroke width (1.5px) and duotone accents.
- Motion spec: 150–200ms ease-out for entrances, 100ms ease-in for exits; no motion for reduced-motion users.
- Empty/blocked states use gentle illustrations (line art) with copy that offers next steps.
- High-density mode for power users with tighter spacing and condensed font weight.

## 3) Backend Frame (Node/Express, TypeScript)
- **Modules:** auth, users, scripts, analysis, execution, search, chat, admin/health.
- **Auth:** JWT access + refresh, role-based middleware (`admin`, `analyst`, `executor`, `viewer`), rate limiting per route group, CSRF protection for web clients.
- **Data access:** Sequelize models for Users, Scripts, ScriptVersions, Analyses, Executions, Embeddings, Chats, AuditEvents. Use transactions for multi-step updates (e.g., upload → analysis enqueue → status update).
- **API patterns:** REST with `/v1` prefix, consistent envelope `{ data, error }`, idempotent PUT/PATCH, pagination (`page`, `pageSize`), filter query validation with Zod.
- **Background work:** queue (Redis or BullMQ) for analysis and execution tasks; retries with exponential backoff; dead-letter logging; idempotent job keys per script version + job type.
- **Webhooks/internal calls:** signed internal requests to AI service and executor; include correlation ids for tracing; audit payload snapshot for critical actions (quarantine, override, delete).

## 4) AI Service Frame (FastAPI, Python)
- **Responsibilities:** linting-style checks, security/performance best-practice analysis, embedding generation, similarity search, chat orchestration, voice transcription/tts adapters.
- **Pipelines:**
  - **Analysis:** ingest script → classify (type, risk hints) → run rule-based checks → LLM critique → aggregate findings → write `Analyses` + `Embeddings`. Deterministic prompts for security (temperature 0.1), creative for remediation (0.4).
  - **Search:** vector search via pgvector; rerank with LLM if latency budget allows; return matches with similarity score and highlights. Cache top results per query hash for 10 minutes.
  - **Chat:** tool calls to backend (fetch script, run search, trigger analysis); memory stored per user/session in Postgres or Redis. Guard: ban tool calls that request execution without explicit confirmation flag.
- **Quality controls:** prompt templates versioned in repo, deterministic temperature for security checks, max token limits, safety filters (no code execution via prompt). Hallucination guard: return “No evidence” when confidence < threshold; attach evidence references.

## 5) Executor Service Frame (Node, isolated host)
- Run PowerShell via `node-powershell` inside locked-down container/VM with read-only FS, network egress policy, CPU/mem quotas, and per-run timeouts.
- Receive signed requests from backend only; never exposed publicly.
- Stream stdout/stderr back to backend; redact secrets using regex/LLM post-filter; store outputs in `Executions` table with checksum.
- Security: signed requests only; RBAC at backend; secrets via env/secret manager; log redaction for sensitive values. Preflight “static guard” to reject scripts with banned patterns before runtime.

## 6) Data & Schema Highlights
- **Scripts**: `id`, `title`, `description`, `category`, `tags[]`, `ownerId`, `visibility`, `createdAt`, `quarantined` (bool), `trustLevel` (enum).
- **ScriptVersions**: `id`, `scriptId`, `version`, `storagePath`, `checksum`, `createdAt`.
- **Analyses**: `id`, `scriptVersionId`, `severity`, `findings[] { id, title, severity, description, remediation, evidence[] }`, `summary`, `embeddingId`, `status`, `model`, `latencyMs`.
- **Embeddings**: `id`, `scriptVersionId`, `vector`, `model`, `createdAt`.
- **Executions**: `id`, `scriptVersionId`, `params`, `initiatorId`, `status`, `logsPath`, `runtimeMs`, `blockedReason`, `policySnapshot`.
- **Chats**: `id`, `userId`, `messages[]`, `contextRefs[]`.
- **AuditEvents**: `id`, `actorId`, `action`, `targetType`, `targetId`, `meta`, `createdAt`.

## 7) Security & Compliance Guardrails
- Enforce content-length + file-type validation on upload; virus scan hook (e.g., ClamAV container) for enterprise deployments; hash uploads and compare with known-malicious signatures list.
- Secrets management via environment variables and optional Docker secrets; never log secrets.
- HTTPS everywhere (Nginx terminating TLS); HSTS in production.
- RBAC checks on every mutation; audit log for admin and execution actions; alert on privilege escalation attempts.
- Escalation flow: on high-severity finding, mark script as “Quarantined” and block execution until override by admin; auto-notify security channel with evidence and remediation summary.

## 8) Delivery Roadmap (Example)
- **Milestone 0 (Week 0.5):** repo setup check, lint/test baselines, Docker dev up.
- **Milestone 1 (Week 2):** script upload + listing + detail (no AI), auth + roles, Postgres schema migrations, basic executor stub.
- **Milestone 2 (Week 4):** AI analysis pipeline + embeddings + search; frontend views for findings and similar scripts.
- **Milestone 3 (Week 6):** execution console with streaming logs, block/allow rules, audit trail.
- **Milestone 4 (Week 7):** chat/voice integration, admin dashboards, observability (traces + metrics + structured logs).
- **Milestone 5 (Week 8):** hardening (rate limits, vulnerability scan), performance tuning, release checklist.

## 9) Example Flows (Expanded)
- **Upload & Auto-Analyze:** user uploads `network.ps1` → backend saves metadata + version → enqueues AI analysis → AI writes findings (e.g., “Uses `Invoke-WebRequest` without TLS validation”, severity High) → frontend badge updates to Completed.
- **Vector Search:** user enters “remote registry query” → AI service performs pgvector search → returns top 5 scripts with similarity score and snippet → user opens one and compares findings side-by-side.
- **Guarded Execution:** analyst selects script version 3, sets `-WhatIf` parameter, and 60s timeout → backend requests signed execution → executor streams logs → run exceeds egress policy → execution aborted, status `Blocked`, audit event recorded.
- **Chat Command:** user types `/analyze latest network harden` → chat agent fetches latest version, triggers analysis with security focus → returns summary + remediation steps → user clicks “Create ticket” to export findings.
- **Voice Assist (hands-free triage):** user presses push-to-talk, says “Find scripts with hardcoded credentials and quarantine them” → transcription confirms → agent searches vector index, flags 2 scripts with confidence scores, proposes quarantine → user says “approve” → backend sets `quarantined=true`, logs audit entries, sends Slack notification.
- **Guided Fix-It:** on a High severity finding, UI shows “Apply safe template” → user previews patch diff → agent posts patch to new ScriptVersion → analysis reruns automatically → status transitions to Medium with updated evidence.
- **Admin Override:** admin receives alert for blocked execution → opens `/admin` health card showing executor rate limits → reviews policy snapshot, approves one-time run with elevated timeout → audit captures decision + justification text.

## 10) Quality & Observability
- **Testing:** unit (Jest/PyTest), integration (Supertest/FastAPI TestClient), contract tests for API envelopes, Playwright smoke for UI, k6 for performance.
- **Metrics:** latency, error rates, queue depth, executor success/failure, AI token usage, vector recall @k. Export via OpenTelemetry; visualize in Grafana.
- **Logging/Tracing:** JSON logs with request id and user id; distributed tracing across backend/AI/executor; log retention policy with PII scrubbing.

## 11) Deployment Notes
- Prefer Docker Compose profiles: `dev`, `test`, `prod`. For prod, enable Nginx reverse proxy, TLS certs, health checks, and autoscaling via server resources.
- Feature flags for AI models, voice providers, and execution policies; default to safest options.
- Blue/green or canary deploys for backend + AI service; run migrations before traffic shift. Frontend served via CDN with immutable asset hashing and stale-while-revalidate caching.

## 12) Definition of Done Checklist (per feature)
- API contract documented and linted; OpenAPI updated.
- Frontend states covered: loading, success, empty, error, unauthorized.
- Tests pass and include regression coverage for critical paths.
- Observability hooks emit required metrics and traces.
- Security review: input validation, RBAC checks, secrets safe, audit events recorded.
- Rollback plan documented (DB rollback or backward-compatible schema).
