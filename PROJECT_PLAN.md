# CivicPulse — Team Project Plan
**Team:** Zubair & Sami  
**Duration:** 2 weeks (14 days)  
**Goal:** Both members learn full stack — frontend, backend, database, cache, AI, Docker, K8s, CI/CD  
**Principle:** Divide by *feature verticals* for parallel work; pair on *infrastructure*; enforce cross-review for learning.

---

## 1. High-Level Division Strategy

| Area | Primary Owner | Secondary (Reviewer + Contributor) | Learning Goal for Secondary |
|------|---------------|-------------------------------------|----------------------------|
| **Backend Core** (routes, services, repositories) | Zubair | Sami | Understand FastAPI layering, state machine, validation |
| **AI Layer** (4 providers, fallback, caching, guardrails) | Zubair | Sami | Learn LLM integration patterns, structured output, resilience |
| **Data Layer** (PostgreSQL, Alembic, seed, indexes) | Zubair | Sami | Learn migrations, schema design, query patterns |
| **Cache Layer** (Redis stats cache + rate limiter) | Zubair | Sami | Learn Redis dual-use, distributed rate limiting |
| **Frontend Core** (React, Vite, TS, nginx) | Sami | Zubair | Learn React 18, typed client, runtime config |
| **Submit View** (form, validation, loading, result display) | Sami | Zubair | Learn client-server contract, error boundaries |
| **Dashboard View** (pagination, filters, status transitions) | Sami | Zubair | Learn server-driven UI, 409 handling |
| **Stats View** (aggregates, X-Cache display) | Sami | Zubair | Learn cache behaviour visualization |
| **Docker & Compose** (both images, networks, volumes) | **PAIR** | — | Both master multi-stage builds, network segmentation |
| **Kubernetes** (manifests, Kustomize, probes, HPA, VPA) | **PAIR** | — | Both master K8s operations, autoscaling, rollouts |
| **CI/CD** (3 workflows, Trivy, kubeconform, GHCR, deploy) | **PAIR** | — | Both master pipeline maturity, gates, rollback |
| **Documentation** (README, 4 ADRs, RUNBOOK, ENGINEERING-NOTES) | **SPLIT** | — | Both write, both review all |

---

## 2. Daily Work Plan (14 Days)

### Week 1: Foundation & Core Features

| Day | Zubair (Primary) | Sami (Primary) | Pair Session (1–2 hrs) | Deliverable Checkpoint |
|-----|------------------|----------------|------------------------|------------------------|
| **1** | Repo init, backend scaffold (FastAPI, 4-layer structure, Pydantic models), `pyproject.toml`, Ruff+MyPy config | Repo init, frontend scaffold (Vite+React+TS), ESLint+TSConfig, nginx.conf, Dockerfile.multi-stage | **Pair:** Repo structure, `.gitignore`, `.env.example`, conventional commits setup, GitHub repo + branch protection | Repo with both scaffolds, lint passing, branch protection screenshot |
| **2** | **Backend:** POST `/api/complaints` route + validation, complaint repository (CRUD), Alembic init + first migration (schema §2.3) | **Frontend:** Submit view — form, client validation mirroring server, API client (typed from OpenAPI), loading state | **Pair:** API contract review (OpenAPI), decide runtime config approach (ADR 0002), compose.yaml skeleton | Complaint create works end-to-end (manual test), migration applied |
| **3** | **Backend:** GET `/api/complaints` (filter, paginate), GET `/api/complaints/{id}`, PATCH `/api/complaints/{id}/status` (state machine table), `/health`, `/ready` | **Frontend:** Dashboard view — paginated table, filters (category/priority/status), status transition buttons, 409 error surface | **Pair:** State machine review, status transition table, error response format | Dashboard loads complaints, status advance works, invalid transition shows 409 |
| **4** | **Backend:** `/api/stats` endpoint (aggregates), `/api/meta/providers` endpoint, structured JSON logging + request_id middleware, SIGTERM handler | **Frontend:** Stats view — aggregate cards, X-Cache header display, cache hit/miss badge | **Pair:** Stats query design, cache invalidation strategy, logging format | Stats endpoint returns aggregates, frontend shows cache status |
| **5** | **AI Layer:** `TriageProvider` protocol, `RuleBasedTriage` (keywords), `SimulatedTriage` (seeded, configurable failure), factory + env selection | **Frontend:** Runtime config implementation (ADR 0002) — `/config.js` at container start OR nginx `/api` proxy | **Pair:** Provider interface design (ADR 0001), triage result schema, fallback flow | All 4 providers selectable via `TRIAGE_PROVIDER`, fallback works |
| **6** | **AI Layer:** `LLMTriage` (Groq) — structured output, 10s timeout, 1 jittered retry (429/5xx), fallback to rules, `triaged_by` recording, content-hash cache (24h), prompt-injection guardrail + test | **Frontend:** Polish Submit view — show category, priority, AI summary, provider name, honest spinner | **Pair:** LLM prompt design, JSON schema enforcement, cache key strategy, PII decision (ADR 0004) | AI triage works with Groq, fallback triggers on error, injection test passes |
| **7** | **AI Layer:** `OllamaTriage` (local model), `triage_latency_ms` recording, `/api/meta/providers` last 20 outcomes, **Cache Layer:** Redis stats cache (30s TTL, X-Cache, invalidate on write), Redis rate limiter (fixed-window, IP-keyed, 429+Retry-After) | **Frontend:** Component tests (≥5) — Submit form, Dashboard filters, Status transition, Stats cache badge, Error boundary | **Pair:** Redis dual-use architecture, rate limiter config, cache hit rate measurement | Rate limiter blocks at limit, stats cache invalidates on POST, latency recorded |

### Week 2: Infrastructure, Hardening & Delivery

| Day | Zubair (Primary) | Sami (Primary) | Pair Session (1–2 hrs) | Deliverable Checkpoint |
|-----|------------------|----------------|------------------------|------------------------|
| **8** | **Docker:** Backend Dockerfile (multi-stage, non-root, HEALTHCHECK, .dockerignore, size report), **Compose:** compose.yaml (dev) — 2 networks (edge, internal), 3 volumes, healthchecks, depends_on: service_healthy | **Docker:** Frontend Dockerfile (multi-stage, nginx, .dockerignore, size report ≤60MB), compose.prod.yaml (image: `${IMAGE_TAG}`, no build:, no published DB/cache ports) | **Pair:** **Full Compose review** — network segmentation test (`frontend ping database` fails), volume justifications, AOF decision, bind mount dev-only | `docker compose up` works, network isolation proven, both images < target size |
| **9** | **K8s:** Base manifests — namespace, backend Deployment (≥2 replicas), PostgreSQL StatefulSet + PVC, Redis Deployment + PVC, ClusterIP Services, ConfigMap, Secret (placeholders) | **K8s:** Base manifests — frontend Deployment (≥2 replicas), Ingress (/, /api), HPA (backend, CPU 60%, min2/max10, behavior), VPA (recommender), PDB (minAvailable:1) | **Pair:** **Full K8s review** — probe design (liveness no DB, readiness with DB), resource requests/limits, HPA/VPA conflict explanation, rolling update config | `kustomize build overlays/dev` valid, kubeconform passes, probes correct |
| **10** | **CI/CD:** ci.yml — lint (ruff+mypy), backend tests (pytest, coverage≥65%, TRIAGE_PROVIDER=simulated), Trivy scan (HIGH/CRITICAL fail), kubeconform | **CI/CD:** ci.yml — frontend tests (vitest, ≥5 tests), build both images (no push), compose integration job (up, /ready, POST+GET, X-Cache MISS→HIT, down -v) | **Pair:** **Full CI review** — needs: gating, permissions: block, Actions pinned @v4, evidence plan for blocked merge | CI passes on PR, Trivy clean, compose integration green |
| **11** | **CI/CD:** cd.yml — needs:test → build+push GHCR (SHA + latest), Syft SBOM, deploy to kind/k3d (overlays/prod + SHA tag), rollout status, smoke test Ingress | **CI/CD:** release.yml (tag v*), cd.yml review, **Documentation:** README (badges, Mermaid arch, quickstart, API table, screenshots), RUNBOOK (deploy, rollback, logs, triage failure) | **Pair:** **Full CD review** — deploy by SHA (ADR 0003), GitHub Secrets (scoped token), least-privilege, rollback demo (kubectl rollout undo + overlay reapply) | CD deploys to kind, smoke test passes, rollback demonstrated |
| **12** | **Hardening:** Backend tests ≥14 (unit+integration, deterministic), seed script idempotent (≥30 Urdu-English complaints), Alembic migrations reviewed, indexes justified in notes | **Hardening:** Frontend polish, accessibility basics, error boundary, **Documentation:** AI-USAGE.md, 4 ADRs (provider interface, runtime config, deploy-by-SHA, PII/governance) | **Pair:** **Engineering Notes** — answer all 8 questions with file:line refs, **Demo video script** (≤5 min, both speak) | All tests pass, seed idempotent, ADRs complete, notes done |
| **13** | **Load Test:** k6 script, run against K8s, capture `kubectl get hpa -w` output, replicas-vs-load chart, measure HPA lag, VPA recommendations → update requests, re-test | **Final Polish:** Cross-review all code, fix deductions (§5.3), `check_submission.py` clean run, screenshot evidence (branch protection, merge conflict, blocked merge, HPA -w, scaling chart) | **Pair:** **Final integration test** — clean clone → quickstart → full flow, video recording | All deductions fixed, check_submission.py passes, video recorded |
| **14** | **Buffer:** Any spillover, viva prep (both explain all parts), final commit push, submission links | **Buffer:** Any spillover, viva prep, final commit push, submission links | **Pair:** **Viva rehearsal** — each explains partner's code, modify live, defend decisions | Submission complete: repo URL, cd.yml run, GHCR images, video, shortlog, HPA chart |

---

## 3. Ownership Matrix (Explicit — For Agent Handoff)

### Zubair — Primary Ownership (Implements + Tests + Documents)
```
backend/
├── app/
│   ├── routes/           # All 10 endpoints
│   ├── services/         # Triage orchestration, state machine, stats
│   ├── repositories/     # All SQL (complaint, stats)
│   └── providers/
│       └── triage/       # base.py, llm.py, ollama.py, rules.py, simulated.py, factory.py
├── alembic/              # All migrations
├── tests/                # ≥14 backend tests (unit + integration)
├── Dockerfile
├── .dockerignore
└── pyproject.toml

k8s/base/
├── backend.yaml
├── postgres.yaml         # StatefulSet + PVC
├── redis.yaml
├── configmap.yaml
├── secret.yaml           # Placeholders only
├── hpa.yaml
├── vpa.yaml
├── pdb.yaml
└── kustomization.yaml

docs/adr/
├── 0001-provider-interface.md
└── 0004-pii-and-data-governance.md

docs/ENGINEERING-NOTES.md  # Questions 1, 4, 5, 6, 7, 8
```

### Sami — Primary Ownership (Implements + Tests + Documents)
```
frontend/
├── src/
│   ├── components/       # SubmitForm, DashboardTable, StatsCards, ErrorBoundary
│   ├── pages/            # Submit, Dashboard, Stats
│   ├── api/              # Typed client (generated/checked from OpenAPI)
│   └── config.js         # Runtime config (served by nginx)
├── tests/                # ≥5 component tests (vitest)
├── Dockerfile
├── .dockerignore
├── nginx.conf
└── package.json

k8s/base/
├── frontend.yaml
├── ingress.yaml
└── kustomization.yaml    # (shared)

docs/adr/
├── 0002-frontend-runtime-config.md
└── 0003-deploy-by-sha.md

docs/
├── README.md
├── RUNBOOK.md
├── AI-USAGE.md
└── ENGINEERING-NOTES.md  # Questions 2, 3
```

### Shared — Pair Implementation (Both Write, Both Review)
```
compose.yaml              # Dev: build:, 2 networks, 3 volumes, healthchecks
compose.prod.yaml         # Prod: image: ${IMAGE_TAG}, no build:, no published ports

k8s/overlays/
├── dev/kustomization.yaml
└── prod/kustomization.yaml

.github/workflows/
├── ci.yml
├── cd.yml
└── release.yml

load/k6-script.js
scripts/check_submission.py

docs/evidence/            # All screenshots
```

---

## 4. Cross-Learning Mechanisms (Mandatory)

| Mechanism | When | How |
|-----------|------|-----|
| **Code Review Gate** | Every PR | Secondary *must* review, ask 2+ questions, approve only after understanding |
| **Pair Programming** | All infra days (8–11) | Both at keyboard, rotate driver/navigator every 30 min |
| **Architecture Walkthrough** | End of Day 7, Day 11, Day 13 | 30 min: primary explains design, secondary asks "why not X?" |
| **Test Writing Swap** | Day 12 | Each writes 1 test for other's code (Zubair writes frontend test, Sami writes backend test) |
| **Viva Rehearsal** | Day 14 | Each explains partner's primary area for 5 min, modifies one thing live |

---

## 5. Git Workflow (Enforced) — Matches Assignment §3.4 & §5.3

### Branch Strategy (Two-Branch Model per Assignment)
- **`main`** — **Production-ready only.** Protected. Only updated via PR from `dev` after full CI/CD passes. This is what `cd.yml` deploys. **No one commits directly to `main`.**
- **`dev`** — **Integration branch.** Default branch. All feature branches merge here via PR. CI runs on every PR to `dev` and push to `dev`.
- **Feature branches** — **Each person works on their own branches:**
  - Zubair: `feat/zubair/*` (e.g., `feat/zubair/backend-core`, `feat/zubair/ai-layer`, `feat/zubair/data-layer`)
  - Sami: `feat/sami/*` (e.g., `feat/sami/frontend-submit`, `feat/sami/frontend-dashboard`, `feat/sami/frontend-stats`)
  - Shared infra: `feat/pair/*` (e.g., `feat/pair/docker-compose`, `feat/pair/k8s-manifests`, `feat/pair/ci-cd`)

### Flow
```
feat/zubair/*  → PR → dev ← PR ← feat/sami/*
feat/pair/*    → PR → dev
                                    ↓
                              CI passes (ci.yml)
                                    ↓
                              PR: dev → main  (only when release-ready)
                                    ↓
                              cd.yml triggers → build → push GHCR → deploy K8s
```

### Rules (Non-Negotiable)
- **No direct push to `dev` or `main`** — all changes via PR
- **PR to `dev`**: Requires CI pass (lint, typecheck, tests, build, Trivy, kubeconform, compose integration) + ≥1 substantive review from partner
- **PR `dev` → `main`**: Only when feature-complete, tested, documented. Triggers `cd.yml` (full test → build+push → deploy → smoke test)
- **Commits:** Conventional prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) — enforced by CI
- **Main Protection:** PR required, CI required, 1 approval, no direct push — **screenshot in `docs/evidence/`**
- **Merge Conflict:** One deliberate conflict on real code — resolve, document in `docs/evidence/conflict-resolution.md`
- **Evidence for Rubric A:** ≥5 merged PRs linked to Issues, each with substantive review comment; ≥35 commits conventional; neither partner <35% by `git shortlog -sn`

---

## 6. Definition of Done (Per Feature)

| Feature | Code | Tests | Docs | Infra | Cross-Review |
|---------|------|-------|------|-------|--------------|
| Backend endpoint | Implemented | Unit + integration | OpenAPI spec | — | Sami approves |
| Frontend view | Implemented | Component test | Screenshot in README | — | Zubair approves |
| AI Provider | Implemented | Fallback + injection test | ADR 0001/0004 | — | Sami approves |
| Docker Image | Multi-stage, non-root | Trivy clean | Size reported | compose.yaml | Both approve |
| K8s Manifest | Applied, probes work | kubeconform | RUNBOOK entry | overlays/ | Both approve |
| CI/CD Job | Green on PR | — | Evidence screenshot | workflows/ | Both approve |

---

## 7. Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| LLM API key quota exhausted | Content-hash cache (24h), rate limiter, Ollama fallback, simulated for CI | Zubair |
| HPA not scaling | Resource requests mandatory, metrics-server installed, load test validates | Both (pair) |
| Frontend can reach DB | `internal: true` network, compose test `frontend ping database` fails | Both (pair) |
| Flaky AI tests | CI pinned to `SimulatedTriage`, provider injection for error cases | Zubair |
| Secret in Git history | `.env` in `.gitignore`, `.env.example` committed, `check_submission.py` scans | Both |
| Viva unprepared | Rehearsal Day 14, each explains partner's code | Both |

---

## 8. Communication Protocol

- **Daily Sync:** 15 min standup (what did I do, what next, blockers)
- **Pair Sessions:** Scheduled 1–2 hrs, calendar blocked, no distractions
- **Async Updates:** GitHub PR comments, Discord/Slack for quick questions
- **Decision Log:** ADRs for all architectural choices (4 minimum)
- **Blocker Escalation:** >2 hrs stuck → call pair session immediately

---

## 9. Submission Checklist (Pre-Submit)

- [ ] `python scripts/check_submission.py` — clean run
- [ ] `git shortlog -sn` — both ≥35% commits, ≥35 total
- [ ] `kubectl get hpa -w` capture + replicas-vs-load chart (3–5 sentences on lag)
- [ ] Demo video ≤5 min, both speaking, covers: clean clone → running, AI triage, fallback, network isolation fail, HPA scaling, rollback
- [ ] `docs/evidence/` — branch protection, merge conflict, blocked merge, HPA -w, scaling chart
- [ ] 4 ADRs committed
- [ ] ENGINEERING-NOTES.md — all 8 questions with file:line refs
- [ ] RUNBOOK.md — deploy, rollback, logs, triage failure
- [ ] AI-USAGE.md — tools, parts shaped, changes made
- [ ] GHCR images with SHA tags visible
- [ ] Successful `cd.yml` run link

---

## 10. Agent Handoff Instructions

> **If an agent receives this plan for Zubair or Sami:**
> 1. Read the **Ownership Matrix (§3)** — it defines primary implementation responsibility
> 2. Read **Daily Work Plan (§2)** — it sequences work with pair checkpoints
> 3. Enforce **Cross-Learning Mechanisms (§4)** — no PR merged without secondary review + questions
> 4. **Pair on all infra** — Docker, K8s, CI/CD are joint work, not divided
> 5. **Both must understand everything** — viva rehearsal is the final gate
> 6. Use **Definition of Done (§6)** — nothing ships without tests, docs, cross-review
> 7. Track **Risks (§7)** — address proactively in pair sessions

---

## 11. Contact & Escalation

- **Zubair:** Backend, AI, Data, Cache — primary decisions
- **Sami:** Frontend, UI/UX, Docs — primary decisions
- **Both:** Infrastructure, Architecture, CI/CD, Final Delivery — joint decisions
- **Disagreement:** Timebox 30 min discussion → if unresolved, escalate to instructor (week 1)

---

**Signed:** _________________ (Zubair) _________________ (Sami)  
**Date:** _________________