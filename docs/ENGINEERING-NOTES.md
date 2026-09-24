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
- **Routes Layer:** [backend/app/routes/complaints.py:18-77](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/routes/complaints.py#L18-L77) handles HTTP POST `/api/complaints`, GET `/api/complaints`, GET `/api/complaints/{id}`, and PATCH `/api/complaints/{id}/status`.
- **Service Layer:** [backend/app/services/complaint_service.py:27-68](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/complaint_service.py#L27-L68) orchestrates AI triage execution, invokes `ComplaintStateMachine`, and triggers Redis stats cache invalidation.
- **Repository Layer:** [backend/app/repositories/complaint_repository.py:25-58](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/repositories/complaint_repository.py#L25-L58) executes database inserts and select queries using SQLAlchemy async session.
- **Schema Layer:** [backend/app/schemas/complaint.py:10-40](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/schemas/complaint.py#L10-L40) defines request/response contracts (`ComplaintCreate`, `ComplaintResponse`, `StatusEnum`, `CategoryEnum`, `PriorityEnum`).

---

## Question 2: Frontend Runtime Configuration & Nginx Strategy (Sami)

*Assigned to Sami — [Docs placeholder]*

---

## Question 3: Component State Management & Error Boundaries (Sami)

*Assigned to Sami — [Docs placeholder]*

---

## Question 4: AI Triage Resilience, Provider Fallback & Guardrails (Zubair)

The AI layer is built on the Strategy Pattern with explicit multi-tier fallback to ensure zero runtime failures:

1. **Provider Strategy & Factory:** `TriageFactory.get_provider()` dynamically selects the triage provider specified by the `TRIAGE_PROVIDER` environment variable ([backend/app/providers/triage/factory.py:12-26](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/factory.py#L12-L26)).
2. **Groq Cloud LLM with Fallback:** `LLMTriage` uses `llama-3.3-70b-versatile` with a 10-second request timeout and automatic retries. If the Groq API returns 429 Rate Limit or 5xx Server Error, `LLMTriage` falls back to `RuleBasedTriage` ([backend/app/providers/triage/llm.py:30-90](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/llm.py#L30-L90)).
3. **Rule-Based Keyword Fallback:** `RuleBasedTriage` scans complaint title and description using regex matching across Urdu and English keywords (`paani`, `water`, `electricity`, `bijli`, `road`, `kachra`) ([backend/app/providers/triage/rules.py:10-70](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/rules.py#L10-L70)).
4. **Prompt Injection Shielding:** `PromptGuardrail` inspects input strings for jailbreak patterns (`ignore previous instructions`, `system prompt`, `override priority`) and redacts malicious text to `[REDACTED_INJECTION]` ([backend/app/providers/triage/guardrails.py:18-31](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/providers/triage/guardrails.py#L18-L31)).

---

## Question 5: Dual-Use Redis Caching & Fixed-Window Rate Limiting (Zubair)

Redis serves a dual purpose in the backend architecture:

1. **Stats Cache (30s TTL with Write Invalidation):**
   - The `/api/stats` endpoint caches complaint counts and category breakdown in Redis with a 30-second TTL ([backend/app/services/stats_service.py:15-50](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/stats_service.py#L15-L50)).
   - Responses return custom headers: `X-Cache: HIT` or `X-Cache: MISS`.
   - On new complaint creation or status change, `ComplaintService` immediately invalidates the cache key (`stats:overview`) to preserve data consistency ([backend/app/services/complaint_service.py:43](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/services/complaint_service.py#L43)).

2. **IP-Keyed Fixed Window Rate Limiter:**
   - Middleware tracks client IP addresses in Redis (`rate_limit:<ip>:<window_timestamp>`) with a 60-second window limit (60 requests/min).
   - If exceeded, the server rejects the request with `HTTP 429 Too Many Requests` and sets the `Retry-After: 60` response header ([backend/app/middleware/rate_limiter.py:15-60](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/middleware/rate_limiter.py#L15-L60)).

---

## Question 6: Database Schema, Indexing & Migration Strategy (Zubair)

1. **Alembic Migration Tracking:**
   - The initial database schema is generated via Alembic migration script `20260924_0001_initial_complaints_table.py` ([backend/alembic/versions/20260924_0001_initial_complaints_table.py:15-65](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/alembic/versions/20260924_0001_initial_complaints_table.py#L15-L65)).
2. **Indexing Strategy for Performance:**
   - B-tree indexes are placed on high-cardinality query columns: `ix_complaints_status`, `ix_complaints_category`, and `ix_complaints_created_at`.
   - These indexes eliminate full-table scans during filtered queries on `/api/complaints?category=...&status=...` ([backend/app/repositories/complaint_repository.py:78-85](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/repositories/complaint_repository.py#L78-L85)).
3. **Async Session Management:**
   - SQLAlchemy `AsyncSession` is instantiated in `app/db/session.py` with automatic rollback on unhandled exceptions ([backend/app/db/session.py:10-35](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/app/db/session.py#L10-L35)).

---

## Question 7: Docker Multi-Stage Build & Container Security (Zubair)

The backend container configuration prioritizes minimal image footprint and strict security principles:

1. **Multi-Stage Build (`builder` -> `runner`):**
   - Stage 1 compiles dependencies into `/install` using `build-essential` and `libpq-dev` ([backend/Dockerfile:1-16](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/Dockerfile#L1-L16)).
   - Stage 2 copies only compiled artifacts into a lightweight `python:3.11-slim` base image, stripping build tools and keeping image size minimal ([backend/Dockerfile:19-39](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/Dockerfile#L19-L39)).
2. **Non-Root Execution Security:**
   - Container execution is locked to non-root user `appuser` (`UID 1000`) ([backend/Dockerfile:41-42](file:///D:/5th%20Semester/1.SCD/Assignment/no1/backend/Dockerfile#L41-L42)).
3. **Network Isolation in Compose:**
   - `compose.yaml` separates containers into `edge` (ingress/frontend) and `internal` (backend, postgres, redis) networks. Database and Redis ports are not exposed to the host machine in production ([compose.yaml:12-58](file:///D:/5th%20Semester/1.SCD/Assignment/no1/compose.yaml#L12-L58)).

---

## Question 8: Kubernetes Autoscaling, Probes & PDB Strategy (Zubair)

1. **Horizontal Pod Autoscaling (HPA):**
   - HPA scales backend replicas dynamically between `minReplicas: 2` and `maxReplicas: 10` based on a 60% CPU utilization threshold ([k8s/base/hpa.yaml:1-35](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/hpa.yaml#L1-L35)).
2. **Health Probes:**
   - **Liveness Probe:** Hits `/api/health` every 10s to verify python process responsiveness ([k8s/base/backend.yaml:45-50](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/backend.yaml#L45-L50)).
   - **Readiness Probe:** Hits `/api/ready` every 5s to verify active database and Redis connectivity before routing ingress traffic ([k8s/base/backend.yaml:51-56](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/backend.yaml#L51-L56)).
3. **Pod Disruption Budget (PDB):**
   - Specifies `minAvailable: 1` to guarantee zero-downtime rolling updates or cluster node drains ([k8s/base/pdb.yaml:1-20](file:///D:/5th%20Semester/1.SCD/Assignment/no1/k8s/base/pdb.yaml#L1-L20)).
