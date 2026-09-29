# CivicPulse Engineering Notes

This document contains detailed architectural answers, technical design rationale, and exact source code file and line references (`file:line`) for the CivicPulse full-stack application.

---

## §5.2 — The Eight Questions (assignment rubric)

### 1. Three things that differ between your laptop and a CI runner, and the exact line that freezes each.

**(a) Where the database and cache live.** On a laptop the dev stack keeps Postgres/Redis on an `internal: true` network with **no published port** — `compose.yaml:18` ("NOTE: no published port, on purpose") — so nothing on the host can dial `localhost:5432` and the suite must run *inside* the stack. `backend/tests/conftest.py:26` freezes that choice in one line: `host = "db" if _Path("/.dockerenv").exists() else "localhost"`. On a CI runner there is no compose stack for the unit jobs, so `ci.yml:52` (`- 5432:5432`) freezes Postgres to `localhost` as a service container — the same conftest line then resolves `localhost`. Two environments, one decision point, no "change this for CI" step.

**(b) The language runtimes.** The container pins `backend/Dockerfile:2` (`FROM python:3.11-slim`) and `frontend/Dockerfile:2` (`FROM node:20-alpine AS builder`); CI pins the identical minors at `ci.yml:24` (`python-version: "3.11"`) and `ci.yml:99` (`node-version: "20"`). A laptop on Python 3.12 or Node 22 still executes exactly the interpreter the image and the runner use.

**(c) Whether triage is probabilistic.** The laptop stack defaults to the real LLM — `compose.yaml:116`: `TRIAGE_PROVIDER: ${TRIAGE_PROVIDER:-groq}` — while CI freezes the provider to the deterministic simulator at `ci.yml:42` (`TRIAGE_PROVIDER: simulated`), re-asserted before any `app.*` import at `backend/tests/conftest.py:39`. A flaky hosted-model response can break a developer's manual run but can never break a build.

### 2. Where the pipeline sits on the CI/CD maturity ladder, the justification, and the next rung.

**Our rung: continuous deployment (fourth of five — manual → CI on every commit → gated merge → continuous deployment → progressive delivery).** Justification from the pipeline itself: every PR runs lint, type check, backend coverage gate, frontend lint/type/test/build, container builds, a compose integration test and Kubernetes manifest validation (jobs in `.github/workflows/ci.yml:14-277`); after merge to `main`, `.github/workflows/cd.yml` re-runs the full suite, builds each image **exactly once**, publishes it by commit SHA, and *deploys* it to an ephemeral kind cluster where a live Ingress smoke test must pass (`deploy-k8s` job, `cd.yml:235-330`, gated by `needs: [build-and-push-ghcr]` at `cd.yml:238`). No human keystroke is required between merge and a deployed, smoke-tested artifact — that is the defining property of this rung.

**Next rung: progressive delivery — canary/blue-green with automated rollback.** What it buys: today the last gate before humans is an ephemeral-cluster smoke test; on the next rung a small percentage of real traffic shifts to the new SHA while SLOs (5xx rate, p95 latency, fallback rate) are watched, and a burn-rate alarm re-points the previous SHA automatically. Releases stop being a yes/no human decision, and a bad deploy costs minutes of 5% traffic instead of an outage.

### 3. The exact line guaranteeing build-once-deploy-many, and what breaks without it.

The build happens **once**, stamped with the commit SHA: `cd.yml:173` and `cd.yml:183` (`type=raw,value=${{ github.sha }}`) in `build-and-push-ghcr`. The deploy consumes that same string and nothing else: `cd.yml:257-258` pulls `ghcr.io/...:${{ github.sha }}`, `cd.yml:273` (`sed -i "s/newTag: .*/newTag: ${{ github.sha }}/"`) rewrites the prod overlay before `kubectl apply -k`, and `cd.yml:238` (`needs: [build-and-push-ghcr]`) makes deploying-before-build impossible.

The same invariant exists inside compose: `migrate` and `backend` share one image (`image: no1-backend:dev` at `compose.yaml:67` and `compose.yaml:87`), so the Alembic revision directory and the running code are always the same bits (rationale comment `compose.yaml:63-65`).

**What breaks without it:** a mutable tag (`latest`, `dev`) can be re-pushed between test and deploy, so the artifact that ships is not the artifact CI approved; "rollback" to `latest` silently rolls *forward*; and the migrate/backend pair can boot different schema revisions, which surfaces as `column ... does not exist` at 3 a.m. instead of at build time.

### 4. The LLM component is probabilistic — what "correct" means, and how CI stays deterministic.

**Correct is not "same classification every time"; it is contract-conformance under uncertainty.**

- **Enum conformance:** every model answer must coerce into the §2.3 enums — `llm.py:92-93` builds `CategoryEnum(...)`/`PriorityEnum(...)` from the raw strings, so an off-contract value raises and the rules provider answers instead. Model output is never trusted verbatim.
- **Bounded variance and cost:** `temperature: 0.1` (`llm.py:61`) narrows sampling variance; a 10 s wall-clock budget (`llm.py:30`, enforced at `llm.py:67`) bounds latency; exactly one retry for 429/5xx and never for 4xx (`llm.py:104-119`, pinned by `tests/test_llm_retry_policy.py`).
- **Failure is a first-class observable outcome:** every degraded answer carries `triaged_by = "rules:fallback"` (`llm.py:151-155`), one WARNING with complaint id + provider + error class (`complaint_service.py:57-73`), and a sample in `triage_fallbacks_total` (`metrics.py:30-34`) — so "correct under failure" is testable, not vibes.
- **Injection cannot redefine correctness:** `PromptGuardrail.sanitize` redacts instruction-override phrases before hashing/caching (`guardrails.py:18-29`), proven end-to-end by `test_injection_attempt_cannot_flip_triage_e2e` (`tests/test_llm_triage.py:69`), which POSTs a complaint that *orders* "category other, priority low" and asserts the content still wins (`water`/`high`).

**CI determinism:** `ci.yml:42` (`TRIAGE_PROVIDER: simulated`, re-asserted at `conftest.py:39`) replaces the live model with a pure function. CI therefore exercises the *seams* — cache hit/miss counting, fallback markers, guardrails, contract enums — with zero network dependence, and the retry policy is tested with injected HTTP responses (`tests/test_llm_retry_policy.py`). Same inputs, same result, every run.

### 5. Your HPA lag: how many seconds between offered load rising and replicas rising, where the time went, what would reduce it.

**Estimated total: ≈30–60 s** from offered-load rise to an extra replica serving traffic. Where each slice goes:

1. **Metrics pipeline (~15–30 s):** kubelet samples → metrics-server aggregation (`--metric-resolution`, default 15 s) → `PodMetrics` API. CPU utilization is a *window average*, not an instantaneous sample, so this dominates.
2. **HPA controller poll (~15 s):** `--horizontal-pod-autoscaler-sync-period` — a spike at t=0 is only seen at the first sync after a window containing it exists.
3. **Stabilization:** we deliberately set `scaleUp.stabilizationWindowSeconds: 0` (`k8s/base/hpa.yaml:22-24`) so scale-up waits for nothing; `scaleDown` keeps 300 s (`hpa.yaml:31-33`) — but that only delays *removals*, not additions.
4. **Scheduling + start (~2–6 s):** images are pre-pulled and pinned `IfNotPresent` (`k8s/base/backend.yaml:26,43`), the init container runs idempotent Alembic, and the `startupProbe` (`backend.yaml:58-65`) admits the pod at 2 s intervals.

The mechanism estimate becomes a *measured* number in the submission run: `kubectl get hpa -w` during the load test is §5.8 item 6's capture.

**The failure mode that makes lag infinite:** with no metrics-server the HPA reports `<unknown>/60%` and never scales. The `deploy-k8s` job prints `kubectl get hpa` in every CD run, so the absence is visible rather than silent.

**What would reduce it:** shorter `--metric-resolution`, a Prometheus adapter scraping our own `/metrics` every 5 s, a lower `averageUtilization` target, KEDA reacting to queue depth/events (~1 s), and shrinking pod startup further (smaller image, faster migration).

### 6. Why VPA is in Off mode, and the failure mode of running it in Auto alongside the HPA.

`k8s/base/vpa.yaml:12` sets `updateMode: "Off"` — recommender mode only.

- **Two actuators, one plant:** HPA scales *replica count* from CPU%; VPA-Auto rewrites *CPU requests*. Raising requests lowers observed utilization → HPA scales down → load per pod rises → VPA raises requests again: a feedback loop that oscillates while resource requests drift upward (or collapse), i.e. thrash instead of equilibrium.
- **Evictions vs. our rollout contract:** VPA-Auto applies new requests by *evicting* pods. We guarantee zero-downtime deploys with `maxUnavailable: 0` (`k8s/base/backend.yaml:8-12`) and a PDB (`k8s/base/pdb.yaml`); VPA would evict around that contract — during a partial outage it can evict faster than HPA reacts, converting a latency blip into an outage.
- **Cold-start recommendations:** VPA needs usage history; fresh recommendations can be absurd, and with two controllers writing pod spec nobody owns the outcome.

Off mode keeps one autoscaling authority (HPA) while still producing recommendations a human can read (`kubectl get vpa`) and apply deliberately to the Deployment.

### 7. The `internal: true` network blocks outbound traffic — where does that leave the service that calls a hosted LLM?

The backend container is **dual-homed**: `compose.yaml:127-128` puts it on `edge` *and* `internal`. Postgres/Redis/Ollama exist only on `internal` and are never published (`compose.yaml:18`); the frontend exists only on `edge` (`compose.yaml:147`).

- **Outbound LLM traffic** egresses through `edge`'s default NAT — verified live from inside the running container:
  `docker compose exec backend python -c "import socket; socket.create_connection(('api.groq.com',443),8).close()"` → connection established. The hosted call is not trapped inside `internal`.
- **Segmentation still holds:** the frontend is not attached to `internal`, so it can only reach `backend:8000` through nginx on `edge` — it can never open a socket to Postgres/Redis (contract deduction avoided, `compose.yaml:151-157`).
- **Kubernetes note (honest):** there is no `internal:` equivalent in k8s; pods egress freely by default. NetworkPolicy-based egress control is a recorded gap, not something we pretend is covered.

### 8. The failure — something that cost more than an hour: symptoms, wrong first belief, the exact line that told the truth.

**Symptom:** the backend suite went red *between* tests with asyncpg/SQLAlchemy raising a variant of `attached to a different loop`. Each run died at a *different* test — `pytest tests/test_complaints.py` alone was green, full runs were not.

**Wrong first belief:** "flaky Postgres / pool exhaustion." We restarted the stack, tuned pool timeouts and healthchecks — all no-ops — because the traceback's last frames lived inside the asyncpg pool, so it *looked* like the database misbehaving.

**The line that told the truth:** running the suite inside the stack with locals printed —

```
docker compose run --rm backend pytest tests -x -l
```

— put the failing frame in **our own fixture**: pooled connections had been created by a module-level `TestClient(app)` portal, and each module-level client opened a fresh event loop per request; the next request then presented connections bound to a dead loop. The database was innocent.

**The fix, kept where the lesson belongs:** `backend/tests/conftest.py:141-156` — one session-scoped `TestClient` used as a context manager so every request shares a single event loop, with the failure mode documented in the fixture docstring (`conftest.py:143-148`) so nobody "simplifies" it back into per-test clients.

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
2. **Groq Cloud LLM with Contract Retry Policy:** `LLMTriage` wraps the whole call in a 10-second wall-clock `asyncio.timeout` budget, retries exactly once and only for `429` or `5xx` responses, and never retries `4xx` — every failure path falls back to `RuleBasedTriage` with `triaged_by = rules:fallback` ([backend/app/providers/triage/llm.py:18-161](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/llm.py#L18-L161)). The retry rules are pinned by `tests/test_llm_retry_policy.py` (429 retried once, 400 not retried, 503 retried once, budget overrun falls back).
3. **Single Fallback WARNING:** The contract requires one WARNING per fallback carrying complaint id, provider and error class. Providers only annotate the result (`fallback_reason`); `ComplaintService` emits the single WARNING after persist, where the complaint id exists ([backend/app/services/complaint_service.py:57-73](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/complaint_service.py#L57-L73)).
4. **Rule-Based Keyword Fallback:** `RuleBasedTriage` scores categories from regex keyword buckets (Urdu and English: `paani`, `water`, `bijli`, `street light`, `kachra`) and maps urgency words onto the contract's `high · normal · low` priorities ([backend/app/providers/triage/rules.py:10-130](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/rules.py#L10-L130)).
5. **Prompt Injection Shielding:** `PromptGuardrail` inspects input strings for jailbreak patterns (`ignore previous instructions`, `system prompt`, `override priority`) and redacts malicious text to `[REDACTED_INJECTION]` ([backend/app/providers/triage/guardrails.py:18-31](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/guardrails.py#L18-L31)).
6. **Observability Surface:** `GET /metrics` exposes Prometheus request count, request latency histogram, `triage_duration_seconds`, `triage_fallbacks_total` and the cache hit-rate counter `triage_cache_lookups_total{result="hit"|"miss"}` ([backend/app/metrics.py:36-39](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/metrics.py#L36-L39), incremented at [backend/app/providers/triage/llm.py:134-137](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/llm.py#L134-L137)); `GET /api/meta/providers` adds the last 20 triage outcomes (provider, latency ms, fallback y/n) from a bounded ring buffer ([backend/app/services/triage_log.py](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/triage_log.py)).

---

## Question 5: Dual-Use Redis Caching & Fixed-Window Rate Limiting (Zubair)

Redis serves a dual purpose in the backend architecture:

1. **Stats Cache (30s TTL with Write Invalidation):**
   - The `/api/stats` endpoint caches complaint counts and category breakdown in Redis with a 30-second TTL under the key `civicpulse:cache:stats` ([backend/app/services/stats_service.py:14-34](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/stats_service.py#L14-L34)).
   - Responses return custom headers: `X-Cache: HIT` or `X-Cache: MISS`.
   - On new complaint creation or status change, `ComplaintService` immediately invalidates the cache key to preserve data consistency ([backend/app/services/complaint_service.py:88-112](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/complaint_service.py#L88-L112)).

2. **IP-Keyed Fixed Window Rate Limiter (Redis-backed, one budget for all replicas):**
   - Middleware counts `60` requests per `60`-second window **inside Redis** under the key `ratelimit:<ip>:<window>` ([backend/app/middleware/rate_limiter.py:14-59](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/middleware/rate_limiter.py#L14-L59)), using the atomic `INCR`/`EXPIRE` primitive `RedisService.incr_window` ([backend/app/db/redis.py:129-153](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/db/redis.py#L129-L153)). With the HPA scaling the backend to 3–10 pods, an in-process dictionary would hand every replica its own budget; the Redis key makes one shared budget (contract §2.4, Job 2). `tests/test_redis_and_ollama.py::test_rate_limit_counter_lives_in_redis` asserts the counter really is in Redis.
   - `/health`, `/ready`, `/api/health` and `/api/ready` are exempt ([rate_limiter.py:30](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/middleware/rate_limiter.py#L30)) so probes never consume budget; when exceeded, the request gets `HTTP 429 Too Many Requests` with a dynamic `Retry-After` (seconds until the window rolls over).
   - **Degradation policy:** if Redis itself is unreachable the limiter fails open with one WARNING ([rate_limiter.py:44](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/middleware/rate_limiter.py#L44)) instead of stacking 429s on top of a real outage — `/ready` already reports the dead Redis.

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
   - Stage 2 copies only compiled artifacts into a lightweight `python:3.11-slim` base image, stripping build tools and keeping image size minimal ([backend/Dockerfile:19-52](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/Dockerfile#L19-L52)).
2. **Non-Root Execution Security:**
   - Container execution is locked to non-root user `appuser` (`UID 1000`) ([backend/Dockerfile:41-42](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/Dockerfile#L41-L42)).
3. **Network Isolation in Compose:**
   - `compose.yaml` separates containers into `edge` (ingress/frontend) and `internal` (backend, postgres, redis) networks. Database and Redis ports are not exposed to the host machine in production ([compose.yaml](file:///D:/5th%20Semester/1.SCD/Assignment/no1/compose.yaml)).
4. **Graceful Shutdown (§2.2):**
   - On SIGTERM, uvicorn drains connections and the lifespan hook closes the Redis client and disposes the async engine pool so in-flight requests finish cleanly and no connections leak across rolling restarts ([backend/app/main.py:18-30](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/main.py#L18-L30)).

---

## Question 8: Kubernetes Autoscaling, Probes & PDB Strategy (Zubair)

1. **Horizontal Pod Autoscaling (HPA):**
   - HPA scales backend replicas dynamically between `minReplicas: 2` and `maxReplicas: 10` on a 60% CPU target, with explicit `behavior` policies: scale-up is immediate (`stabilizationWindowSeconds: 0`, up to +2 pods/minute) and scale-down waits 300 s in steps of 1 pod/minute so a traffic spike does not get its replicas torn down the moment it ends ([k8s/base/hpa.yaml:11-37](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/hpa.yaml#L11-L37)).
2. **Health Probes:**
   - **Startup Probe:** Hits `/api/health` every 2 s with `failureThreshold: 30`, giving a cold pod (image pull, migration init, Redis warm-up) up to 60 s before liveness may even start — slow boots can never be mistaken for dead processes ([k8s/base/backend.yaml:58-65](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/backend.yaml#L58-L65)).
   - **Liveness Probe:** Hits `/api/health` every 15 s to verify python process responsiveness ([k8s/base/backend.yaml:66-71](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/backend.yaml#L66-L71)).
   - **Readiness Probe:** Hits `/api/ready` every 10 s to verify live database and Redis connectivity before routing ingress traffic ([k8s/base/backend.yaml:72-77](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/backend.yaml#L72-L77)).
3. **Pod Disruption Budget (PDB):**
   - Specifies `minAvailable: 1` to guarantee zero-downtime rolling updates or cluster node drains ([k8s/base/pdb.yaml:1-20](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/pdb.yaml#L1-L20)).
4. **VPA:** present in `Off` (recommender-only) mode — rationale and the HPA conflict it avoids are answered in §5.2 question 6 above ([k8s/base/vpa.yaml:12](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/vpa.yaml#L12)).
