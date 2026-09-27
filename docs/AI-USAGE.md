# AI Usage Disclosure

## Tools Used

OpenAI Codex was used as a coding assistant during CivicPulse frontend, documentation, CI, and Kubernetes-configuration work completed on 2026-09-26 and 2026-09-27. No AI tool received a production secret, `.env` file, database dump, or citizen complaint data.

## Assisted Areas

| Area | How AI assistance was used | Human verification |
|---|---|---|
| React/Vite foundation | Proposed the TypeScript project structure, scripts, and configuration. | Sami reviewed dependencies and project files before committing. |
| Typed API integration | Helped translate the existing FastAPI schemas and endpoints into TypeScript request/response types. | The backend routes and Pydantic schemas were inspected directly; client validation matches the documented bounds. |
| UI implementation | Assisted with Submit, Dashboard, Statistics, loading, error, and accessibility markup. | Sami reviewed the rendered structure and checked that error states, 409/429 messages, and cache badges are visible. |
| Tests | Helped draft Vitest/Testing Library cases and one backend request-validation test. | Frontend lint, build, and 9 tests passed. The backend suite passed all 24 tests, including the `422` validation contract. |
| Container, CI, and docs | Helped draft Nginx runtime configuration, ADRs, RUNBOOK, Engineering Notes, CI gates, and the release workflow. | Sami compared the work with the committed Docker, Nginx, API, Compose, Kubernetes, and workflow files. GitHub Actions built both images and passed the Compose integration flow. |

## Human Decisions and Changes

- Sami selected the product scope, ownership boundaries, and branch workflow defined in `PROJECT_PLAN.md` and `SAMI_GUIDE.md`.
- The implementation uses the actual backend enum values, validation limits, and status-state machine after source review.
- The frontend intentionally uses a slate/indigo operational UI, structural loading placeholders, and explicit error surfaces rather than decorative gradients or generated imagery.
- A failed lint/build/test cycle was investigated and corrected: ES2020-safe string handling, Vitest config typing, and test cleanup were added before committing the fix.
- The release workflow creates a GitHub draft only after a valid semantic version tag and passing frontend/backend checks. Publishing remains a deliberate human action after deployment review.

## Limitations and Remaining Work

- Docker and Kubernetes tools are not installed on the development machine, so local image and cluster verification could not be performed. GitHub Actions built both images and passed the Compose integration flow; live cluster validation is still required before final submission.
- AI suggestions are implementation input, not an authority. Remaining shared work includes production SHA injection, Kubernetes schema/live-cluster verification, evidence capture, and partner review.
