# AI Usage Disclosure

## Tools Used

OpenAI Codex was used as a coding assistant during the CivicPulse frontend and documentation work completed on 2026-09-26. No AI tool was given a production secret, `.env` file, database dump, or citizen complaint data.

## Assisted Areas

| Area | How AI assistance was used | Human verification |
|---|---|---|
| React/Vite foundation | Proposed the TypeScript project structure, scripts, and configuration. | Sami reviewed dependencies and project files before committing. |
| Typed API integration | Helped translate the existing FastAPI schemas and endpoints into TypeScript request/response types. | The backend route and Pydantic schema files were inspected directly; client validation matches the documented bounds. |
| UI implementation | Assisted with Submit, Dashboard, Statistics, loading, error, and accessibility markup. | Sami reviewed the rendered structure and checked that error states, 409/429 messages, and cache badges are visible. |
| Tests | Helped draft Vitest/Testing Library cases. | `npm run lint`, `npm run build`, and `npm test` were executed successfully: 5 test files and 8 assertions passed. |
| Container/docs | Helped draft the Nginx runtime configuration, ADRs, RUNBOOK, and Engineering Notes. | Sami compared them with the committed Docker, Nginx, API, Compose, and Kubernetes files. |

## Human Decisions and Changes

- Sami selected the product scope, ownership boundaries, and branch workflow defined in `PROJECT_PLAN.md` and `SAMI_GUIDE.md`.
- The implementation uses the actual backend enum values, validation limits, and status-state machine after source review.
- The frontend intentionally uses a slate/indigo operational UI, structural loading placeholders, and explicit error surfaces rather than decorative gradients or generated imagery.
- A failed lint/build/test cycle was investigated and corrected: ES2020-safe string handling, Vitest config typing, and test cleanup were added before committing the fix.
- Docker is not installed on the development machine, so the frontend image was not built locally. The Dockerfile configuration is included for CI/Compose verification.

## Limitations

AI suggestions are treated as implementation input, not an authority. Remaining shared work—CI/CD frontend jobs, release workflow, production SHA injection, Compose/Kubernetes verification, and partner review—must be completed and reviewed by both team members.
