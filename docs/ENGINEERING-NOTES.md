# CivicPulse Engineering Notes

This document contains detailed architectural answers, technical design rationale, and exact source code file and line references (`file:line`) for the CivicPulse full-stack application.

---

## Question 1: System Overview & 4-Layer Backend Architecture (Zubair)

The backend follows a strict 4-layer architecture isolating HTTP interface concerns from business logic, data persistence, and interface schemas:

```
[ HTTP Request ]
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. API Route Layer (app/routes/)                             │
│    - Endpoints, status codes, query validation               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Service Layer (app/services/)                             │
│    - Business logic, State machine, AI Triage triggering    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Repository Layer (app/repositories/)                     │
│    - Async SQLAlchemy ORM queries, aggregate computations  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Schema Layer (app/schemas/)                              │
│    - Pydantic models, JSON serialization, Enum contracts   │
└─────────────────────────────────────────────────────────────┘
```

### Key File & Line References:
- **Routes Layer:** [backend/app/routes/complaints.py:17-96](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/routes/complaints.py#L17-L96) handles HTTP POST `/api/complaints`, GET `/api/complaints`, GET `/api/complaints/{id}`, and PATCH `/api/complaints/{id}/status`. No route opens a database session directly — every handler receives one from the `get_db_session` dependency.
- **Service Layer:** [backend/app/services/complaint_service.py:25-141](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/complaint_service.py#L25-L141) orchestrates AI triage execution (with wall-clock latency measurement), invokes `ComplaintStateMachine`, emits the contract's single fallback WARNING, and triggers Redis stats cache invalidation.
- **Repository Layer:** [backend/app/repositories/complaint_repository.py:19-174](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/repositories/complaint_repository.py#L19-L174) executes database inserts and select queries using SQLAlchemy async session; malformed UUIDs are converted to "not found" instead of database errors.
- **Schema Layer:** [backend/app/schemas/complaint.py:8-106](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/schemas/complaint.py#L8-L106) defines request/response contracts (`ComplaintCreate`, `ComplaintResponse`, `StatusEnum`, `CategoryEnum`, `PriorityEnum`) with the contract's lowercase enum values.

---

## Question 2: Frontend Runtime Configuration & Nginx Strategy (Sami)

The frontend deliberately separates build-time JavaScript from deployment-time API configuration:

1. **Runtime configuration contract:** `frontend/index.html:12` loads `/config.js` before the Vite module. `frontend/src/api/config.ts:3-14` reads `window.__CIVICPULSE_CONFIG__.API_BASE_URL` and safely defaults to the relative `/api` path. The typed client composes every request from this value (`frontend/src/api/client.ts:35-37`), so individual components never contain a backend host.
2. **One image for every environment:** Vite development serves `frontend/public/config.js`; the production image contains `frontend/public/config.template.js`. At container startup, `frontend/docker-entrypoint.d/40-generate-runtime-config.sh:1-7` substitutes `API_BASE_URL` to create the delivered `config.js`. This means Docker/Kubernetes can change the API base URL without rebuilding the React bundle.
3. **Nginx same-origin proxy:** In Compose, `frontend/nginx.conf:19-26` proxies `/api/` to the internal `backend:8000` service. In Kubernetes, the Ingress routes `/api` to the backend Service. The browser only sees `/api`; it never receives PostgreSQL, Redis, or Docker service addresses. `frontend/nginx.conf:8-11` marks `config.js` as `no-store`, so a redeploy cannot leave a browser with stale runtime configuration.

This approach avoids hard-coding production URLs and keeps public runtime configuration separate from secrets. `config.js` may contain a public API path; it must never contain API keys, database passwords, or private provider credentials.

---

## Question 3: Component State Management & Error Boundaries (Sami)

The frontend uses focused React state rather than a global store because each page owns a small, independent slice of server interaction:

1. **Local component state:** `frontend/src/components/SubmitForm.tsx:39-130` owns form values, validation errors, submit progress, API error, and the resulting triage object. It normalizes input and validates the same length boundaries enforced by the backend before calling the API. `frontend/src/pages/DashboardPage.tsx:22-95` owns filters, page/page_size, fetched complaints, total count, and loading/error state. `frontend/src/pages/StatsPage.tsx:7-47` independently fetches aggregate data and records the `X-Cache` header.
2. **Typed API boundary:** Contract enums and response shapes live in `frontend/src/api/types.ts:2-78`; requests and HTTP error translation live in `frontend/src/api/client.ts:12-131`. Components call `civicPulseApi` rather than raw `fetch`, which keeps route strings, query serialization, and 409/429 handling consistent and makes the API calls easy to mock in Vitest.
3. **State-transition safety:** `frontend/src/api/status.ts:3-10` exposes only the contract's forward lifecycle (`open → in_progress → resolved`). The Dashboard asks for confirmation before invoking the PATCH request (`frontend/src/pages/DashboardPage.tsx:78-95`) and renders the backend's conflict message if the server rejects a stale or invalid transition.
4. **Failure containment:** `frontend/src/components/ErrorBoundary.tsx:11-48` catches unhandled render errors outside the route tree and presents a recovery action. Request failures remain page-level alerts, while the error boundary is reserved for unexpected component failures. It is mounted above the router in `frontend/src/main.tsx:8-14`.

The component suite verifies form validation/submission, dashboard rendering, confirmed transitions, cache badge styling, and the error-boundary fallback in `frontend/tests/`.

---

## Question 4: AI Triage Resilience, Provider Fallback & Guardrails (Zubair)

The AI layer is built on the Strategy Pattern with explicit multi-tier fallback to ensure zero runtime failures:

1. **Provider Strategy & Factory:** `TriageFactory.get_provider()` dynamically selects the triage provider specified by the `TRIAGE_PROVIDER` environment variable ([backend/app/providers/triage/factory.py:13-25](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/factory.py#L13-L25)).
2. **Groq Cloud LLM with Contract Retry Policy:** `LLMTriage` wraps the whole call in a 10-second wall-clock `asyncio.timeout` budget, retries exactly once and only for `429` or `5xx` responses, and never retries `4xx` — every failure path falls back to `RuleBasedTriage` with `triaged_by = rules:fallback` ([backend/app/providers/triage/llm.py:18-153](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/llm.py#L18-L153)). The retry rules are pinned by `tests/test_llm_retry_policy.py` (429 retried once, 400 not retried, 503 retried once, budget overrun falls back).
3. **Single Fallback WARNING:** The contract requires one WARNING per fallback carrying complaint id, provider and error class. Providers only annotate the result (`fallback_reason`); `ComplaintService` emits the single WARNING after persist, where the complaint id exists ([backend/app/services/complaint_service.py:57-73](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/complaint_service.py#L57-L73)).
4. **Rule-Based Keyword Fallback:** `RuleBasedTriage` scores categories from regex keyword buckets (Urdu and English: `paani`, `water`, `bijli`, `street light`, `kachra`) and maps urgency words onto the contract's `high · normal · low` priorities ([backend/app/providers/triage/rules.py:10-130](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/rules.py#L10-L130)).
5. **Prompt Injection Shielding:** `PromptGuardrail` inspects input strings for jailbreak patterns (`ignore previous instructions`, `system prompt`, `override priority`) and redacts malicious text to `[REDACTED_INJECTION]` ([backend/app/providers/triage/guardrails.py:18-31](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/guardrails.py#L18-L31)).
6. **Observability Surface:** `GET /metrics` exposes Prometheus request count, request latency histogram, `triage_duration_seconds` and `triage_fallbacks_total` ([backend/app/metrics.py](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/metrics.py), [backend/app/routes/metrics.py](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/routes/metrics.py)); `GET /api/meta/providers` adds the last 20 triage outcomes (provider, latency ms, fallback y/n) from a bounded ring buffer ([backend/app/services/triage_log.py](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/triage_log.py)).

---

## Question 5: Dual-Use Redis Caching & Fixed-Window Rate Limiting (Zubair)

Redis serves a dual purpose in the backend architecture:

1. **Stats Cache (30s TTL with Write Invalidation):**
   - The `/api/stats` endpoint caches complaint counts and category breakdown in Redis with a 30-second TTL under the key `civicpulse:cache:stats` ([backend/app/services/stats_service.py:14-34](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/stats_service.py#L14-L34)).
   - Responses return custom headers: `X-Cache: HIT` or `X-Cache: MISS`.
   - On new complaint creation or status change, `ComplaintService` immediately invalidates the cache key to preserve data consistency ([backend/app/services/complaint_service.py:88-112](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/complaint_service.py#L88-L112)).

2. **IP-Keyed Fixed Window Rate Limiter:**
   - Middleware keeps an in-memory per-IP sliding window of request timestamps (`60` requests per `60`s window), with `/health`, `/ready`, `/api/health` and `/api/ready` exempt so probes never consume budget ([backend/app/middleware/rate_limiter.py:9-45](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/middleware/rate_limiter.py#L9-L45)).
   - If exceeded, the server rejects the request with `HTTP 429 Too Many Requests` and sets a dynamic `Retry-After` header (seconds until the oldest request leaves the window).

---

## Question 6: Database Schema, Indexing & Migration Strategy (Zubair)

1. **Alembic Migration Tracking:**
   - `20260924_0001_initial_complaints_table.py` creates the base table, `20260929_0002_contract_enum_values.py` switches storage to the contract's lowercase enum values (via `values_callable` so SQLAlchemy binds values, not names), and `20260929_0003_contract_schema_conformance.py` enforces §2.3 end-to-end in the database: UUID `id` with server default, `text` CHECK (`10–2000` chars), `location` CHECK (`3–200`), `timestamptz` UTC, `ai_summary varchar(140)` single-line CHECK, integer `triage_latency_ms`, and `reporter_contact varchar(200)` ([backend/alembic/versions/](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/alembic/versions)).
2. **Indexing Strategy for Performance:**
   - B-tree indexes cover the API's filter and sort paths: `idx_status_priority` (composite — every list query can seek on `status` then order/compare by `priority` without a sort, which is why it exists rather than two single-column indexes), `idx_status_created_at` (supports the default `created_at DESC` ordering under a status filter), `idx_category_priority`, plus single-column indexes on `status`, `category`, `priority` and `created_at`.
   - These indexes eliminate full-table scans during filtered queries on `/api/complaints?category=...&status=...` ([backend/app/repositories/complaint_repository.py:128-168](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/repositories/complaint_repository.py#L128-L168)).
3. **Async Session Management:**
   - SQLAlchemy `AsyncSession` is instantiated in `app/db/session.py` with automatic rollback on unhandled exceptions ([backend/app/db/session.py:8-31](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/db/session.py#L8-L31)).

---

## Question 7: Docker Multi-Stage Build & Container Security (Zubair)

The backend container configuration prioritizes minimal image footprint and strict security principles:

1. **Multi-Stage Build (`builder` -> `runner`):**
   - Stage 1 compiles dependencies into `/install` using `build-essential` and `libpq-dev` ([backend/Dockerfile:1-17](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/Dockerfile#L1-L17)).
   - Stage 2 copies only compiled artifacts into a lightweight `python:3.11-slim` base image, stripping build tools and keeping image size minimal ([backend/Dockerfile:19-50](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/Dockerfile#L19-L50)).
2. **Non-Root Execution Security:**
   - Container execution is locked to non-root user `appuser` (`UID 1000`) ([backend/Dockerfile:41-42](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/Dockerfile#L41-L42)).
3. **Network Isolation in Compose:**
   - `compose.yaml` separates containers into `edge` (ingress/frontend) and `internal` (backend, postgres, redis) networks. Database and Redis ports are not exposed to the host machine in production ([compose.yaml](file:///D:/5th%20Semester/1.SCD/Assignment/no1/compose.yaml)).
4. **Graceful Shutdown (§2.2):**
   - On SIGTERM, uvicorn drains connections and the lifespan hook closes the Redis client and disposes the async engine pool so in-flight requests finish cleanly and no connections leak across rolling restarts ([backend/app/main.py:18-30](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/main.py#L18-L30)).

---

## Question 8: Kubernetes Autoscaling, Probes & PDB Strategy (Zubair)

1. **Horizontal Pod Autoscaling (HPA):**
   - HPA scales backend replicas dynamically between `minReplicas: 2` and `maxReplicas: 10` based on a 60% CPU utilization threshold ([k8s/base/hpa.yaml:1-35](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/hpa.yaml#L1-L35)).
2. **Health Probes:**
   - **Liveness Probe:** Hits `/api/health` every 10s to verify python process responsiveness ([k8s/base/backend.yaml:58-62](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/backend.yaml#L58-L62)).
   - **Readiness Probe:** Hits `/api/ready` every 5s to verify active database and Redis connectivity before routing ingress traffic ([k8s/base/backend.yaml:64-68](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/backend.yaml#L64-L68)).
3. **Pod Disruption Budget (PDB):**
   - Specifies `minAvailable: 1` to guarantee zero-downtime rolling updates or cluster node drains ([k8s/base/pdb.yaml:1-20](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/pdb.yaml#L1-L20)).
