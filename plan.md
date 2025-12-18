# PSScript Manager – Frame & Design Execution Plan

This plan describes how to shape the product experience, service boundaries, and delivery approach so the application works as intended. It focuses on framing the user experience, API surfaces, data flows, and operational practices. Where possible, concrete examples illustrate the expected behaviors. The target delivery snapshot is **12/18/25**, with a modern, delightful interface and agentic workflows that keep experts productive while being safe by default.

## 1) Objectives & Success Criteria
- Deliver an end-to-end script management experience covering upload, categorization, AI analysis, secure execution, and auditability.
- Maintain predictable performance (P95 page load < 2.5s, API P95 < 400ms for non-AI endpoints) and safety (no arbitrary PowerShell on shared host, encrypted transport, least-privilege data access).
- Provide AI assistance that is explainable (show evidence: findings, severity, remediation) and traceable (persisted analysis, versioned embeddings).
- Support voice/assistant features without blocking core CRUD; fall back to text-only gracefully.
- **Experience bar:** task success rate ≥ 95% on core flows (upload → analyze → execute dry-run), SUS ≥ 82; “time-to-first-value” ≤ 2 minutes for new analysts using sample scripts.
- **Delight bar:** micro-interaction consistency (hover/focus states defined per component), modal/drawer animations < 200ms, and zero layout shifts on route transitions.

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
- **Design tokens (documented in JSON and Storybook):**
  - Colors: `bg/primary=#0B1220`, `surface/card=#121826`, `border/soft=#1F2937`, `text/primary=#E5E7EB`, `text/muted=#9CA3AF`, `accent/brand=#7C3AED`, `accent/info=#38BDF8`, `accent/success=#10B981`, `accent/warn=#FBBF24`, `accent/error=#F43F5E`.
  - Radii: `xs=4px`, `sm=6px`, `md=10px`, `lg=14px` (cards), `pill=999px` (chips, voice button).
  - Shadows: `card=0 12px 30px rgba(0,0,0,0.32)`, `popover=0 18px 38px rgba(0,0,0,0.42)`; reduce for light mode.
  - Grid: `8px` base with `24px` gutters on desktop, `16px` on tablet, `12px` on mobile; max content width `1280px`.
  - Motion: `enter=180ms cubic-bezier(0.2,0.8,0.4,1)`, `exit=140ms cubic-bezier(0.4,0,0.2,1)`, with reduced-motion fallback (opacity-only).
  - Iconography: Lucide 1.5px stroke; duotone option for “empty/blocked” states with accent tint at 15% opacity.
- **Illustration direction:** line-art glyphs with 1.25px stroke and 15% accent fill; avoid mascot art. Use consistent corner radii in illustrations to match components.
- **Accessibility:** minimum 4.5:1 contrast for text; focus-visible styles always on keyboard nav; prefers-reduced-motion respected; provide captions for voice transcripts and tooltips for icons.

### 2.2 Navigation Shell
- **Global layout:** left rail for navigation, top bar for account/status, main content panel, right drawer for contextual insights (AI tips, recent actions, voice transcript).
- **Routes:** `/dashboard`, `/scripts`, `/scripts/:id`, `/analyze`, `/run`, `/search`, `/chat`, `/admin`.
- **State:** React Query caches API calls; Zustand/Context for session + UI state; React Router for routing.
- **Component library usage:** Material UI theming with Tailwind utility classes for precise spacing; use MUI DataGrid Pro for tables with virtualized rows.
- **Navigation polish:**
  - Left rail collapses to icon-only at ≤1280px and auto-pins favorite links; shows active state with a 3px accent bar and subtle glow.
  - Top bar includes environment chip (Dev/Staging/Prod) and presence indicator for AI services (green=healthy, amber=degraded, red=offline).
  - Right drawer doubles as “agent memory”; shows last 5 actions, inline retry for failed calls, and transcription chips for voice.
  - Command palette (`⌘/Ctrl+K`) exposes quick actions (upload, analyze, search, last chat thread) with fuzzy search and shortcuts displayed inline.
- **Navigation copy style:** concise nouns (Dashboard, Library, Analyze, Run, Search, Chat, Admin); avoid gerunds. Include muted helper text on hover (“Analyze new or existing scripts”) for first-time users.
- **Information architecture checkpoints:** keep primary nav ≤ 7 items; move infrequent items (Feature flags, Billing) into Admin subsections; ensure breadcrumbs on detail pages (`Scripts / <name> / v5`).

### 2.3 Key Screens & Behaviors (Detailed + Examples)
- **Dashboard:**
  - Cards for “Recent uploads”, “Pending analyses”, “Recent executions”, “AI chat shortcuts”.
  - Example empty state: “No uploads yet — drop a .ps1 file or try the guided sample script.” CTA buttons: Upload, Analyze sample.
  - Microcopy on cards shows trends: “+3 analyses today vs yesterday”.
  - Quick actions row: “Upload file”, “Analyze latest version”, “Open chat”, “View quarantine” with pill buttons and inline keyboard hints.
- **Script Library (`/scripts`):**
  - Table with column chooser, density toggle, and saved filter presets. Quick filter chips for `Severity:High`, `Tag:network`, `Owner:me`.
  - Bulk actions: tag, move category, quarantine, export findings. Inline row-level severity badges and analysis status chips.
  - Example query: “All PowerShell with severity >= High and tag:network” shows 12 results; list view supports keyboard navigation (j/k) and batch selection (shift-click).
- **Script Detail (`/scripts/:id`):**
  - Tabs: Overview (metadata, tags, versions), AI Analysis (findings, remediation, scores), Execution History (runs, status, logs, outputs), Similar Scripts (vector search results), Activity (audit trail).
  - Code viewer with copy, download, line numbers, and inline diff between versions. Badge for trust level (Verified, Community, Quarantined).
  - Example: Version 5 flagged with High severity; “See remediation →” opens a side panel with steps and “Create Jira ticket” action.
  - Evidence drawer: clicking a finding shows referenced lines with highlight and “Show model notes” tooltip summarizing why the rule fired.
- **Upload Flow:**
  - Drag-and-drop or file picker with validation (file type, max size) and preflight virus scan indicator.
  - Optional metadata (title, category, tags, privacy). Progress bar shows staged → uploaded → queued for analysis.
  - After upload, enqueue analysis automatically; status chip cycles “Analyzing… → Completed” or “Failed (retry)”.
  - Example: User uploads `network.ps1` (2.1 KB), system flags missing TLS validation, severity High; user can click “Auto-fix suggestion”.
  - Guardrail copy: if blocked, show “Upload paused — file type not allowed (only .ps1, .psm1).” Provide “Request exception” link that opens a modal with justification and owner auto-filled.
- **AI Analysis (`/analyze`):**
  - Form with script picker or paste field, analysis depth selector (Quick, Standard, Deep), toggles (security focus, performance focus), and model selector (default safe model).
  - Output panel lists findings with severity badges, remediation text, impacted lines, and references to OWASP/PowerShell best practices.
  - Export as Markdown/PDF and “Share to chat” for team discussion.
  - Example: Deep analysis returns 7 findings; user expands “Hardcode credential detection” to view recommended `Get-Credential` pattern.
  - Explanation pattern: each finding shows “Why it matters” and “How we detected” with the heuristic/model version; include latency + token cost chips for transparency.
- **Execution Console (`/run`):**
  - Request panel (script version, parameters, environment profile, timeout), guard rails (dry-run flag, resource limits), confirmation modal, and live log stream with ANSI color rendering.
  - “Why blocked?” banner for denied runs with policy explanation and override request button.
  - Example: Execution aborted at 38s due to egress policy; user receives log snippet and audit entry link.
  - Run replay: “Re-run with same parameters” pill plus “Share run” link copying a signed permalink; show environment diff if a different profile is selected.
- **Search (`/search`):**
  - Keyword + vector search toggle; results grouped by relevance, with snippets highlighting risky patterns. Filters for severity, tags, owner, model version.
  - Example: Search “remote registry query” returns top 5 scripts with similarity scores; user saves search as preset “Registry hardening”.
  - “Explain this result” inline expander showing which terms or embeddings drove the ranking, and a “Try safer query” suggestion if high-risk patterns are detected.
- **Chat/Voice (`/chat`):**
  - Threaded chat with slash-commands (`/analyze <scriptId>`, `/summarize`, `/find similar`, `/run --whatif <scriptId>`). Tool-call responses show structured cards.
  - Voice UI: record button, waveform, transcription preview, confidence indicator; fallback to text if mic unavailable. “Push-to-talk” shortcut (`space`) and noise-level meter.
  - Example: User says “Analyze the latest `network harden` script for security only”; agent triggers analysis, returns findings with severity chips and “Schedule rerun” CTA.
  - Conversation memory sidebar lists recent artifacts (scripts, runs, findings). Each card has “pin” and “forget” to manage context explicitly; system warns when context exceeds safe token budget.
- **Admin (`/admin`):**
  - User roles, API keys, service health cards (AI service, executor, DB, Redis), audit log viewer, and feature flag toggles.
  - Example: Admin toggles “Allow voice features” off globally; UI surfaces banner in `/chat` explaining the policy.
  - RBAC matrix view with per-role capabilities, export to CSV. Feature flags show rollout % with slider and guardrails copy for high-risk flags.
- **Layout blueprints (high-level component placements):**
  - Dashboards: 3-column card grid on desktop (min card width 320px), collapsing to 2 columns on tablet and 1 on mobile; right drawer overlays instead of docking below 1024px.
  - Tables: sticky header + first column, 56px row height default, 44px in density mode; inline quick actions on hover (view, analyze, run dry-run, quarantine).
  - Detail views: content max width 1080px with side metadata rail (280px) that collapses to accordion on mobile; tab bar with segment control indicator.
  - Chat/Voice: split pane (chat thread left 65%, context panel right 35% with insights and tools), collapsing to stacked accordions on mobile; floating voice pill anchored bottom-right.
  - Navigation shell: top bar height 64px with 12px padding; left rail 76px collapsed / 240px expanded; right drawer 360px with overlay blur.
  - Modal specs: max width 720px, corner radius 12px, drop shadow 28px blur; desktop uses centered modal, mobile uses full-height sheet with drag handle.

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

### 2.5 Example UI Kits (component-level specs)
- **Buttons:** primary (solid brand, white text), secondary (outline with 1px border, text brand), tertiary (ghost). Loading uses inline spinner replacing left icon; disabled reduces opacity to 50% but keeps contrast.
- **Inputs:** floating labels, inline help text, success/error states with icon. Multi-line text uses 12px padding and 4px caret accent.
- **Chips/pills:** pill radius, subtle glow on hover; used for filters, statuses, and “re-run” shortcuts.
- **Cards:** header with tiny label, title, and action kebab; body supports stacked list items with dividers at 1px/12% opacity.
- **Data visualizations:** sparkline component accepts `trend`, `delta`, `target`; radial gauge accepts `progress`, `thresholds`. Keep tooltip latency < 80ms.
- **Voice pill:** circular button 52px, pulsing ring animation (opacity 0.4→0.8); states: idle, listening, thinking, error (striped).
- **Chat bubbles:** left/right alignment, code blocks with copy button, inline citation chips; streaming placeholder shimmer for in-progress messages.

## 6) Data & Schema Highlights
- **Scripts**: `id`, `title`, `description`, `category`, `tags[]`, `ownerId`, `visibility`, `createdAt`, `quarantined` (bool), `trustLevel` (enum).
- **ScriptVersions**: `id`, `scriptId`, `version`, `storagePath`, `checksum`, `createdAt`.
- **Analyses**: `id`, `scriptVersionId`, `severity`, `findings[] { id, title, severity, description, remediation, evidence[] }`, `summary`, `embeddingId`, `status`, `model`, `latencyMs`.
- **Embeddings**: `id`, `scriptVersionId`, `vector`, `model`, `createdAt`.
- **Executions**: `id`, `scriptVersionId`, `params`, `initiatorId`, `status`, `logsPath`, `runtimeMs`, `blockedReason`, `policySnapshot`.
- **Chats**: `id`, `userId`, `messages[]`, `contextRefs[]`.
- **AuditEvents**: `id`, `actorId`, `action`, `targetType`, `targetId`, `meta`, `createdAt`.
- **FeatureFlags**: `id`, `key`, `description`, `rollout`, `riskLevel`, `createdAt`, `updatedAt`, `ownerId`, `linkedTickets[]`.
- **VoiceTranscripts**: `id`, `userId`, `transcript`, `confidence`, `requestId`, `createdAt`, `hash`.
- **AgentSessions**: `id`, `userId`, `contextRefs[]`, `model`, `latencyMs`, `tokenUsage`, `safetyLevel`, `createdAt`.

## 7) Security & Compliance Guardrails
- Enforce content-length + file-type validation on upload; virus scan hook (e.g., ClamAV container) for enterprise deployments; hash uploads and compare with known-malicious signatures list.
- Secrets management via environment variables and optional Docker secrets; never log secrets.
- HTTPS everywhere (Nginx terminating TLS); HSTS in production.
- RBAC checks on every mutation; audit log for admin and execution actions; alert on privilege escalation attempts.
- Escalation flow: on high-severity finding, mark script as “Quarantined” and block execution until override by admin; auto-notify security channel with evidence and remediation summary.
- **Agent safety:** apply input/output filtering (prompt injection defense, file path allowlist), require explicit user consent for mutations, and block any tool calls requesting arbitrary network access.
- **Voice privacy:** store transcript hashes, not raw audio; redact PII in transcripts; enforce per-tenant voice provider keys.
- **Rate limits:** per-IP and per-user for uploads, analysis, and execution; progressive backoff and “cooldown” banners in UI with retry timing.

## 8) Delivery Roadmap (Example)
- **Milestone 0 (Week 0.5):** repo setup check, lint/test baselines, Docker dev up.
- **Milestone 1 (Week 2):** script upload + listing + detail (no AI), auth + roles, Postgres schema migrations, basic executor stub.
- **Milestone 2 (Week 4):** AI analysis pipeline + embeddings + search; frontend views for findings and similar scripts.
- **Milestone 3 (Week 6):** execution console with streaming logs, block/allow rules, audit trail.
- **Milestone 4 (Week 7):** chat/voice integration, admin dashboards, observability (traces + metrics + structured logs).
- **Milestone 5 (Week 8):** hardening (rate limits, vulnerability scan), performance tuning, release checklist.
- **Milestone 6 (Week 10):** UX polish sweep (microcopy QA, empty/error states, accessibility fixes), full Storybook for UI kit, agent safety red-team tests.
- **Milestone 7 (Week 12):** scalability tests (k6 targets: 500 VU sustained, executor concurrency 50), DR rehearsal, release candidate with playbook.

## 9) Example Flows (Expanded)
- **Upload & Auto-Analyze:** user uploads `network.ps1` → backend saves metadata + version → enqueues AI analysis → AI writes findings (e.g., “Uses `Invoke-WebRequest` without TLS validation”, severity High) → frontend badge updates to Completed.
- **Vector Search:** user enters “remote registry query” → AI service performs pgvector search → returns top 5 scripts with similarity score and snippet → user opens one and compares findings side-by-side.
- **Guarded Execution:** analyst selects script version 3, sets `-WhatIf` parameter, and 60s timeout → backend requests signed execution → executor streams logs → run exceeds egress policy → execution aborted, status `Blocked`, audit event recorded.
- **Chat Command:** user types `/analyze latest network harden` → chat agent fetches latest version, triggers analysis with security focus → returns summary + remediation steps → user clicks “Create ticket” to export findings.
- **Voice Assist (hands-free triage):** user presses push-to-talk, says “Find scripts with hardcoded credentials and quarantine them” → transcription confirms → agent searches vector index, flags 2 scripts with confidence scores, proposes quarantine → user says “approve” → backend sets `quarantined=true`, logs audit entries, sends Slack notification.
- **Guided Fix-It:** on a High severity finding, UI shows “Apply safe template” → user previews patch diff → agent posts patch to new ScriptVersion → analysis reruns automatically → status transitions to Medium with updated evidence.
- **Admin Override:** admin receives alert for blocked execution → opens `/admin` health card showing executor rate limits → reviews policy snapshot, approves one-time run with elevated timeout → audit captures decision + justification text.

## 9.1 Agentic Workflow Storyboards (with UI + system expectations)
- **Voice-first triage (mobile):**
  - UI: floating pill shows listening state (pulsing accent ring) and transcript chips; bottom sheet summarizes detected intent ("Find scripts with hardcoded creds") with two action cards (Search, Quarantine request) and confidence badge.
  - Agent steps: STT → intent classification → safety filter (block execution intents) → vector search tool → summarize results with evidence → ask for explicit approval before mutations. On low confidence (<0.65) switch to text confirmation.
  - Completion proof: audit entry contains transcript hash, chosen actions, and denial/approval flags.
- **Guided remediation lane (desktop):**
  - UI: findings list includes “Apply fix” CTA; clicking opens side-by-side diff (current vs suggested patch) with toggle for auto-formatting. Severity badge animates to new level after re-analysis.
  - Agent steps: pull latest version → generate patch constrained by guardrails (no new network calls, no process start) → propose patch → create new ScriptVersion via backend → trigger re-analysis → surface new findings delta card.
  - Completion proof: ScriptVersion incremented, analysis refreshed with new `modelVersion`, audit note auto-filled with patch summary.
- **Secure execution with human-in-the-loop:**
  - UI: execution request form shows “policy preview” (detected risks, required approvals) and inline SLA timer; confirmation modal explains egress and CPU cap. During run, log stream displays breadcrumb chips for each stage.
  - Agent steps: validate script trust level + category rules → call policy engine → request approval if elevated; once approved, send signed job to executor with correlation id → stream logs via SSE → auto-generate post-run summary to chat thread.
  - Completion proof: Execution row includes `policySnapshotId`, status, runtime; chat thread pinned with summary and rerun shortcut.
- **Admin override / emergency bypass:**
  - UI: admin sees alert banner with “Request queued: run blocked by egress policy”; modal includes risk statement, requester notes, and justification text area. Requires MFA check and displays countdown until request expires.
  - Agent steps: verify admin role + MFA freshness → fetch policy snapshot → log justification → issue one-time token for executor → notify security channel.
  - Completion proof: audit trail includes `overrideReason`, `expiresAt`, and linked execution id; banner on `/run` shows “Temporarily allowed by <admin name>”.
- **Progressive disclosure for risky actions:**
  - UI: when an AI suggestion involves network or system changes, show a “Risky action” inline badge with collapsible details (reason, expected commands, mitigations).
  - Agent steps: request explicit confirmation with paraphrase (“You’re asking to run X with Y parameters; proceed?”); block if confirmation not provided.
  - Completion proof: audit entry records the paraphrased confirmation and timestamp.
- **Cross-modal handoff (voice ↔ chat ↔ UI):**
  - UI: after voice command completes, show chips “Open in chat”, “View details”, “Undo”. Chat threads include “Record note” to jump to voice capture with context tag.
  - Agent steps: persist contextRef pointing to originating feature; ensure tokens trimmed to safe budget; allow manual context pruning via “forget”.
  - Completion proof: AgentSession includes `contextRefs` and `safetyLevel`, and chat shows “context pinned” indicator.

## 9.2 Beautiful Interface Examples (micro-interaction callouts)
- **Cards:** glassy cards with subtle gradient borders (1px) that animate on hover (border accent shifts, shadow eases in). Each card header uses tiny uppercase label + icon; footers offer tertiary actions (“View in chat”, “Copy link”).
- **Forms:** floating labels, inline validation with friendly copy (“Oops, needs a valid URL”), and “changes saved” checkmark animation after debounce. Disable primary buttons while loading and show inline spinner within label.
- **Tables:** inline filters animate in from top; bulk bar slides up when rows selected. Severity chips use duotone backgrounds; sorting icons animate between states with 120ms rotation.
- **Chat:** AI responses render as cards with badge for tool-call type (Analyze, Search, Execute preview). Inline citations link back to script detail or findings; streaming responses show shimmer placeholder.
- **Voice:** waveform uses brand gradient; recording state dims rest of UI slightly. When transcription confidence is low, banner suggests “Tap to correct” with quick text edit field.
- **Empty states:** minimal illustration (line art) with accent hue, button with outline style, and “Try a sample” pill that triggers demo actions.
- **Notifications:** toasts stack with slight offset; critical alerts use modal with dual buttons (Dismiss, Go to issue) and a text snippet of the risk.
- **Delight cues:** anchor subtle sound cues (optional, muted by default) for upload complete and analysis ready; haptic patterns on mobile for “approval required”.
- **Performance feedback:** skeleton loaders for tables and cards with 12px radius; reduce shimmer for prefers-reduced-motion; latency badge near actions when >600ms.

## 10) Quality & Observability
- **Testing:** unit (Jest/PyTest), integration (Supertest/FastAPI TestClient), contract tests for API envelopes, Playwright smoke for UI, k6 for performance.
- **Metrics:** latency, error rates, queue depth, executor success/failure, AI token usage, vector recall @k. Export via OpenTelemetry; visualize in Grafana.
- **Logging/Tracing:** JSON logs with request id and user id; distributed tracing across backend/AI/executor; log retention policy with PII scrubbing.
- **Release quality gates (12/18/25 bar):**
  - All core routes covered in Playwright (desktop + mobile viewport) with screenshots for visual regression.
  - Storybook visual regression (Chromatic/Playwright) for buttons, cards, tables, chat bubbles, voice pill.
  - k6 targets: P95 latency < 400ms for non-AI APIs; upload/analysis queue depth auto-scales without 429s under 500 VU; executor success ≥ 99% on dry-run.
  - AI safety evals: prompt-injection suite passes; mutation actions require explicit consent; red-team transcripts stored with hash.

## 11) Deployment Notes
- Prefer Docker Compose profiles: `dev`, `test`, `prod`. For prod, enable Nginx reverse proxy, TLS certs, health checks, and autoscaling via server resources.
- Feature flags for AI models, voice providers, and execution policies; default to safest options.
- Blue/green or canary deploys for backend + AI service; run migrations before traffic shift. Frontend served via CDN with immutable asset hashing and stale-while-revalidate caching.
- Chaos toggle in staging: enable controlled failure injection for AI service and executor to validate fallback copy and retry UX.

## 12) Definition of Done Checklist (per feature)
- API contract documented and linted; OpenAPI updated.
- Frontend states covered: loading, success, empty, error, unauthorized.
- Tests pass and include regression coverage for critical paths.
- Observability hooks emit required metrics and traces.
- Security review: input validation, RBAC checks, secrets safe, audit events recorded.
- Rollback plan documented (DB rollback or backward-compatible schema).
- Accessibility checked (keyboard nav, screen reader labels, contrast) and analytics events mapped to adoption KPIs.
- Product analytics events instrumented (e.g., upload started/completed, analysis request, blocked run) with privacy-safe metadata.
- User-facing changelog entry drafted; support runbook linked.

## 13) Working Notes (memory)
- **2024-12-18 update:** Deepened UI polish (design tokens, navigation behaviors, layout blueprints), added agentic storyboards (voice-first triage, guided remediation, secure execution, admin override), and micro-interaction examples to hit the desired 12/18/25 experience bar.
- **2024-12-19 update:** Enhanced IA, component specs, safety guardrails, agentic cross-modal handoffs, and release quality gates. Added schema placeholders for feature flags, voice transcripts, and agent sessions to keep plan actionable.
