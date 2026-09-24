# 🚀 SAMI_GUIDE.md — Frontend & Documentation Blueprint for Codex / Cursor

> **Notice for OpenAI Codex / AI Assistant:**
> You are paired with **Sami**, who is the primary owner for the **Frontend Application**, **Frontend Component Tests**, **ADR 0002**, **ADR 0003**, **RUNBOOK.md**, **AI-USAGE.md**, and **Engineering Notes Q2 & Q3** in the CivicPulse project.
> Read this document and `PROJECT_PLAN.md` thoroughly before outputting any code or executing commands.

---

## 1. Developer Identity & Project Baseline

- **Developer:** Sami (Frontend & Documentation Co-Lead)
- **Partner:** Zubair (Backend, Database, Redis, AI Layer, Infrastructure Co-Lead)
- **Repository URL:** `https://github.com/Zubairilyas1/Civic-Pulse.git`
- **Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Vitest, Nginx, Docker multi-stage.

---

## 2. Git Setup & Branching Strategy

### Initial Setup Commands (Run FIRST)
```bash
# 1. Clone repository (if not cloned)
git clone https://github.com/Zubairilyas1/Civic-Pulse.git
cd Civic-Pulse

# 2. Checkout integration branch and pull latest code from Zubair
git checkout dev
git pull origin dev

# 3. Create your dedicated feature branch off dev
git checkout -b feat/sami/frontend-core
```

### Git Workflow Rules (NON-NEGOTIABLE)
1. **Never commit directly to `main` or `dev`.** All work happens on `feat/sami/*` branches.
2. **Push frequent, atomic conventional commits.** To satisfy Rubric A (`git shortlog -sn`), commit each component or file change separately using proper scope prefixes:
   - `feat(frontend): add complaint submit form with validation`
   - `feat(frontend): implement dashboard table with status transition buttons`
   - `feat(frontend): add stats cards with X-Cache badge`
   - `test(frontend): add vitest component tests for submit form`
   - `docs(adr): add ADR 0002 for frontend runtime configuration`
   - `docs(adr): add ADR 0003 for deploy-by-SHA strategy`
   - `docs(runbook): create operation runbook for deployment and rollback`
   - `docs(notes): answer frontend engineering notes questions 2 and 3`
3. **Open Pull Requests into `dev`:** Once a feature branch is ready, push to GitHub (`git push origin feat/sami/frontend-core`) and create a PR targeting `dev`.

---

## 3. Frontend Architecture & Design Guidelines (Authentic SaaS UI)

### 🎨 Visual & Design Rules (No "AI Slop")
- **Color Palette:** Slate background (`bg-slate-900` for dark or `bg-slate-50` for light), Indigo primary (`indigo-600`), Emerald for `RESOLVED` / `X-Cache: HIT`, Amber for `IN_PROGRESS` / `MEDIUM`, Rose for `CRITICAL` / `X-Cache: MISS`.
- **Banned Clichés:** 
  - ❌ NO glowing purple/neon radial background orbs or dark mode gradients.
  - ❌ NO ubiquitous sparkle emojis (✨) in subheadings.
  - ❌ NO fake 3-card bento grids.
  - ❌ NO pure white blinding backgrounds or harsh rainbow borders.
- **Loading & Skeleton States:** Use structural skeleton pulse loaders (`animate-pulse bg-slate-700/50 rounded`) during API data fetching rather than plain white screens or basic spinners.
- **Error Surfaces:** Display crisp error banners for HTTP 409 Conflict (invalid status transitions) and HTTP 429 Too Many Requests (rate limiting).

### 🖥️ Core Frontend Views to Build (`frontend/src/`)

1. **Submit View (`/submit` or Tab 1):**
   - Complaint form (`title`, `description`, `location`).
   - Client-side input validation matching server rules (title min length, non-empty description).
   - Dynamic AI Triage badge showing category, priority, summary, and `triaged_by` provider upon completion.
2. **Dashboard View (`/dashboard` or Tab 2):**
   - Paginated complaint table with filter controls (category, priority, status).
   - Status transition buttons (`Advance Status`) with confirmation modal/inline trigger.
   - Handles 409 Conflict gracefully if an illegal state transition is attempted.
3. **Stats View (`/stats` or Tab 3):**
   - Aggregate statistics cards (total complaints, open complaints, resolved count).
   - Prominent **Cache Status Badge** rendering `X-Cache: HIT` (Emerald) or `X-Cache: MISS` (Rose) returned by `/api/stats`.

---

## 4. Required Component Tests (`frontend/tests/` or `src/__tests__/`)

Write at least **5 Vitest component tests**:
1. `SubmitForm.test.tsx`: Validates form inputs and submission handler.
2. `DashboardTable.test.tsx`: Renders complaint list and filters correctly.
3. `StatusTransition.test.tsx`: Verifies status update button click triggers API client call.
4. `StatsCards.test.tsx`: Renders aggregate statistics and checks `X-Cache` badge styling.
5. `ErrorBoundary.test.tsx`: Verifies fallback UI renders when an unhandled component error occurs.

---

## 5. Documentation Tasks Assigned to Sami

You are responsible for creating/completing these exact files in `docs/`:

1. **`docs/adr/0002-frontend-runtime-config.md`**  
   - Topic: Runtime configuration strategy using `/config.js` or nginx proxy so Docker containers can be built once and deployed anywhere without environment variable baking.
2. **`docs/adr/0003-deploy-by-sha.md`**  
   - Topic: Deployment tagging strategy using immutable git commit SHAs (`image: ghcr.io/...:sha-abc1234`) instead of mutable `latest` tags.
3. **`docs/RUNBOOK.md`**  
   - Operational guide covering: System deployment, verification health checks, checking logs, handling AI triage outages, and executing K8s rollback (`kubectl rollout undo`).
4. **`docs/AI-USAGE.md`**  
   - Disclosure document logging AI assistance (Codex, Antigravity, GitHub Copilot), specifying which parts were AI-assisted and how human verification was conducted.
5. **`docs/ENGINEERING-NOTES.md` (Questions 2 & 3)**  
   - **Question 2:** Explain frontend runtime configuration & Nginx proxy setup.
   - **Question 3:** Explain component state management, typed API client, and error boundary pattern.

---

## 6. Strict Prohibitions (NEVER DO THESE)

- 🚫 **NEVER stage or commit `.env` files.** (`.env` must remain untracked; only `.env.example` is committed).
- 🚫 **NEVER push directly to `main` or `dev`.** Always use `feat/sami/*` feature branches and Pull Requests.
- 🚫 **NEVER break backend API contracts.** Refer to backend schemas in `backend/app/schemas/` or `PROJECT_PLAN.md`.
- 🚫 **NEVER skip fail/error handling.** Always surface API error messages cleanly to the user.
- 🚫 **NEVER hardcode production API URLs in frontend build code.** Use window runtime config or relative `/api` paths handled by nginx proxy.

---

## 7. Step-by-Step Task Checklist for Sami

- [ ] `git checkout dev && git pull origin dev && git checkout -b feat/sami/frontend-views`
- [ ] Build Submit View, Dashboard View, and Stats View in `frontend/src/`
- [ ] Implement Nginx runtime config strategy in `frontend/nginx.conf` and `frontend/Dockerfile`
- [ ] Write $\ge 5$ Vitest component tests in `frontend/src/__tests__/` and ensure `npm test` passes
- [ ] Create `docs/adr/0002-frontend-runtime-config.md`
- [ ] Create `docs/adr/0003-deploy-by-sha.md`
- [ ] Create `docs/RUNBOOK.md`
- [ ] Create `docs/AI-USAGE.md`
- [ ] Complete Questions 2 and 3 in `docs/ENGINEERING-NOTES.md`
- [ ] Run `python scripts/check_submission.py` to confirm 100% green audit!
